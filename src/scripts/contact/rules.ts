// The contact form's rules in the browser — a MIRROR of the server's (GearLogs repo,
// supabase/functions/contact-inbound/rules.ts), so a visitor hears about a mistake at once.
// The server DECIDES: it re-checks everything, holds the full temporary-inbox list and asks
// DNS whether the domain takes mail. Every code here is one the server can answer, so the page
// shows the same sentence whichever side refused. Change a rule there first, then here.
// Pure: no DOM, no words (words.ts owns every sentence) — scripts/check-contact.mjs tests it.

export const REASONS = ['access', 'purchase', 'product', 'security', 'legal', 'partner', 'other'] as const;
export type Reason = (typeof REASONS)[number];

/** Where the visitor pressed the button: the server's closed list, less "direct" (no value = a direct visit). */
export const FROM_PAGES = [
  'header', 'home', 'pricing', 'guides', 'faq', 'changelog', 'notes', 'privacy', 'terms', 'refunds',
  'security', 'product', 'compare', 'about', 'for-organisations', 'for-army', 'for-hospitals', 'for-emergency', 'for-depots',
] as const;
export type FromPage = (typeof FROM_PAGES)[number];

/** Caps in code points, equal to the server's (a longer value is refused with a count, never cut). */
export const CAPS = { first: 60, last: 80, name: 120, email: 254, local: 64, company: 120, job: 80, site: 200, message: 4000 } as const;
export const MESSAGE_MIN_OTHER = 20;
export const MAX_LINKS = 3;

export type FieldKey = 'reason' | 'first_name' | 'last_name' | 'email' | 'company' | 'job_title' | 'company_website' | 'message';
/** The server may also answer `name` (first + last too long together); the page shows it under the last name. */
export type ServerFieldKey = FieldKey | 'name';
export type FieldErrors = Partial<Record<FieldKey, string>>;

// The server's personal-mail list, whole (it is short). A sub-domain matches through its parents.
const PERSONAL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de',
  'yandex.ru', 'yandex.com', 'mail.ru', 'zoho.com', 'zohomail.com', 'tutanota.com', 'tuta.io', 'fastmail.com', 'hey.com', 'mail.com',
  'hotmail.co.uk', 'hotmail.fr', 'outlook.fr', 'yahoo.co.uk', 'yahoo.fr', 'libero.it', 'orange.fr', 'free.fr', 't-online.de',
  'qq.com', '163.com', '126.com', 'naver.com',
  'walla.co.il', 'walla.com', 'bezeqint.net', '013net.net', 'netvision.net.il', '012.net.il', 'zahav.net.il', 'hotmail.co.il', 'outlook.co.il',
]);
// The most common temporary inboxes — every one is in the server's vendored list (checked 2026-09-26), so the page never
// refuses an address the server would take. The server's list has about 9,000 more.
const TEMP_DOMAINS: ReadonlySet<string> = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com', 'grr.la', 'sharklasers.com', '10minutemail.com',
  'temp-mail.org', 'yopmail.com', 'trashmail.com', 'trash-mail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
  'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'fakeinbox.com', 'tempail.com', 'tempr.email', 'discard.email',
  'mailcatch.com', 'tempinbox.com', 'inboxkitten.com', 'mailpoof.com', 'moakt.com', 'tmpmail.org', 'tmpmail.net', 'emailfake.com',
  'fakemail.net', '1secmail.com', '1secmail.org',
]);
/** Government, army and academic domains are always accepted (never net.il — ISP webmail lives there). */
const ALWAYS_SUFFIXES = ['gov.il', 'idf.il', 'muni.il', 'ac.il', 'k12.il', 'org.il', 'gov', 'mil', 'edu'] as const;
const OWN_DOMAINS: ReadonlySet<string> = new Set(['gearlogs.com', 'raqiom.com']);
/** Endings that are no top-level domain at all, each with the ending the visitor almost surely meant. */
const TYPO_ENDINGS: Readonly<Record<string, string>> = { con: 'com', cmo: 'com', ocm: 'com', comm: 'com', vom: 'com', cpm: 'com', coil: 'co.il', cil: 'co.il' };

const NAME_RE = /^[\p{L}\p{M}' .\-׳״"]+$/u;
const ORG_RE = /^[\p{L}\p{M}\p{N} .,'"&()/\-׳״+@#:]+$/u;
const REPEAT_RE = /(.)\1{4,}/u;
const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const NOREPLY_RE = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon)$/;
const LINK_RE = /https?:\/\/|www\./gi;
// Invisible direction marks and zero-width characters: the server removes them before any rule, so the page does too.
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]];
const INVISIBLE_RE = new RegExp('[' + INVISIBLE_RANGES.map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g');

export const codePoints = (s: string): number => Array.from(s).length;
export const cleanLine = (s: string): string => s.normalize('NFC').replace(INVISIBLE_RE, '').trim();
export const countLinks = (s: string): number => (s.match(LINK_RE) ?? []).length;

const matchesDomain = (domain: string, set: ReadonlySet<string>): boolean => {
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) if (set.has(parts.slice(i).join('.'))) return true;
  return false;
};

/** The domain in its ASCII form (the URL parser maps international names), or null when it is not a host. */
export function asciiDomain(domain: string): string | null {
  try {
    const host = new URL('http://' + domain).hostname;
    const labels = host.split('.');
    const tld = labels[labels.length - 1] ?? '';
    if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l)) || !/^[a-z]{2,}$|^xn--/.test(tld)) return null;
    return host;
  } catch {
    return null;
  }
}

export type EmailVerdict =
  | { k: 'empty' | 'shape' }
  | { k: 'noreply' | 'own' | 'personal' | 'temporary'; domain: string }
  | { k: 'typo'; domain: string; suggestion: string }
  | { k: 'ok'; domain: string; always: boolean };

export function classifyEmail(raw: string): EmailVerdict {
  const v = cleanLine(raw);
  if (!v) return { k: 'empty' };
  const at = v.lastIndexOf('@');
  if (at < 1 || at === v.length - 1 || codePoints(v) > CAPS.email) return { k: 'shape' };
  const local = v.slice(0, at);
  const domain = asciiDomain(v.slice(at + 1).toLowerCase());
  if (!domain || local.length > CAPS.local || !LOCAL_RE.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { k: 'shape' };
  if (NOREPLY_RE.test(local.toLowerCase())) return { k: 'noreply', domain };
  if (matchesDomain(domain, OWN_DOMAINS)) return { k: 'own', domain };
  if (ALWAYS_SUFFIXES.some((s) => domain === s || domain.endsWith('.' + s))) return { k: 'ok', domain, always: true };
  if (matchesDomain(domain, PERSONAL_DOMAINS)) return { k: 'personal', domain };
  if (matchesDomain(domain, TEMP_DOMAINS)) return { k: 'temporary', domain };
  const ending = domain.slice(domain.lastIndexOf('.') + 1);
  const meant = TYPO_ENDINGS[ending];
  if (meant) return { k: 'typo', domain, suggestion: domain.slice(0, domain.length - ending.length) + meant };
  return { k: 'ok', domain, always: false };
}

/** The error code for the e-mail field, or null. A typo'd ending is refused on Send as "not found" (it takes no mail). */
export function emailCode(raw: string): string | null {
  const v = classifyEmail(raw);
  if (v.k === 'ok') return null;
  if (v.k === 'typo') return 'not_found';
  return v.k;
}

export interface ContactInput {
  reason: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  job_title: string;
  company_website: string;
  message: string;
}

const personName = (v: string, cap: number): string | null =>
  !v ? 'empty' : codePoints(v) > cap ? 'long' : REPEAT_RE.test(v) ? 'repeat' : !NAME_RE.test(v) ? 'chars' : null;

/** One field's code, or null. `name` (the combined length) is folded into the last name. */
export function fieldCode(key: FieldKey, input: ContactInput): string | null {
  switch (key) {
    case 'reason':
      return (REASONS as readonly string[]).includes(input.reason) ? null : 'missing';
    case 'first_name':
      return personName(cleanLine(input.first_name), CAPS.first);
    case 'last_name': {
      const first = cleanLine(input.first_name), last = cleanLine(input.last_name);
      const own = personName(last, CAPS.last);
      if (own) return own;
      return !personName(first, CAPS.first) && codePoints(first) + 1 + codePoints(last) > CAPS.name ? 'name_long' : null;
    }
    case 'email':
      return emailCode(input.email);
    case 'company': {
      const v = cleanLine(input.company);
      if (!v) return 'empty';
      if (codePoints(v) < 2) return 'short';
      if (codePoints(v) > CAPS.company) return 'long';
      if (REPEAT_RE.test(v)) return 'repeat';
      return ORG_RE.test(v) ? null : 'chars';
    }
    case 'job_title': {
      const v = cleanLine(input.job_title);
      if (!v) return null;
      if (codePoints(v) > CAPS.job) return 'long';
      if (REPEAT_RE.test(v)) return 'repeat';
      return ORG_RE.test(v) ? null : 'chars';
    }
    case 'company_website': {
      const v = cleanLine(input.company_website);
      if (!v) return null;
      if (codePoints(v) > CAPS.site) return 'long';
      if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) return 'scheme';
      return /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(v) ? null : 'shape';
    }
    case 'message': {
      const v = input.message.normalize('NFC').replace(INVISIBLE_RE, '').trim();
      const n = codePoints(v);
      if (n > CAPS.message) return 'long';
      if (countLinks(v) > MAX_LINKS) return 'links';
      return input.reason === 'other' && n < MESSAGE_MIN_OTHER ? 'short' : null;
    }
  }
}

export const FIELD_ORDER: readonly FieldKey[] = ['reason', 'first_name', 'last_name', 'email', 'company', 'job_title', 'company_website', 'message'];

export function validateAll(input: ContactInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELD_ORDER) {
    const code = fieldCode(key, input);
    if (code) errors[key] = code;
  }
  return errors;
}

/** The server's per-field codes mapped onto the page's fields (`name` → the last name's `name_long`). */
export function fromServer(fields: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const [key, code] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof code !== 'string') continue;
    if (key === 'name') out.last_name = 'name_long';
    else if ((FIELD_ORDER as readonly string[]).includes(key)) out[key as FieldKey] = code;
  }
  return out;
}

export const isReason = (v: string | null): v is Reason => v !== null && (REASONS as readonly string[]).includes(v);
export const isFromPage = (v: string | null): v is FromPage => v !== null && (FROM_PAGES as readonly string[]).includes(v);
