// The /contact page (Stage 1, 2026-09-26 — the Director's picks: A · one page with a side panel · R1 chips + the
// Partnership reason · W1 refuse personal and temporary inboxes, with the hello@ way out · Q3 · A the required set ·
// Q5 · A the timing mark; his checks AC-S1-01…06). Built by esbuild to /js/contact.js (the CSP allows no inline script).
//
// Checks run on Send; the e-mail's domain is also checked when the visitor leaves the field; a shown error updates as
// the field is corrected. The server decides everything again and answers per-field CODES, drawn with the same words.
// Nothing a visitor typed is ever written as HTML: every value goes in through textContent.

import {
  FIELD_ORDER, classifyEmail, cleanBody, cleanLine, codePoints, countLinks, fieldCode, fromServer, isFromPage, isReason, validateAll,
  CAPS, type ContactInput, type FieldErrors, type FieldKey, type FromPage, type Reason,
} from './rules';
import { WORDS, type Lang } from './words';

const ENDPOINT = 'https://kfowbpvlejfnntaeljsf.supabase.co/functions/v1/contact-inbound';
const MAILBOX = 'hello@gearlogs.com';
const TOKEN_WAIT_MS = 15_000;
const TOKEN_POLL_MS = 250;

interface TurnstileApi { reset(widget?: string): void }
declare global { interface Window { turnstile?: TurnstileApi } }

const form = document.getElementById('contact-form') as HTMLFormElement | null;
if (form) start(form);

function start(form: HTMLFormElement): void {
  const lang: Lang = document.documentElement.lang === 'he' ? 'he' : 'en';
  const W = WORDS[lang];
  const startedAt = Date.now();
  const params = new URLSearchParams(location.search);
  const qReason = params.get('reason');
  const qFrom = params.get('from');
  const from: FromPage | null = isFromPage(qFrom) ? qFrom : null;

  const byId = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`contact: #${id} is missing from the page`);
    return el as T;
  };
  const INPUT_ID: Record<Exclude<FieldKey, 'reason'>, string> = {
    first_name: 'cf-first-name', last_name: 'cf-last-name', email: 'cf-email', company: 'cf-company',
    job_title: 'cf-job-title', company_website: 'cf-website', message: 'cf-message',
  };
  const inputs = Object.fromEntries(
    Object.entries(INPUT_ID).map(([k, id]) => [k, byId<HTMLInputElement | HTMLTextAreaElement>(id)]),
  ) as Record<Exclude<FieldKey, 'reason'>, HTMLInputElement | HTMLTextAreaElement>;
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="reason"]'));
  const reasonNote = byId<HTMLElement>('cf-reason-note');
  const messageHelp = byId<HTMLElement>('cf-message-help');
  const messageNeed = byId<HTMLElement>('cf-message-need');
  const messageCount = byId<HTMLElement>('cf-message-count');
  const emailInfo = byId<HTMLElement>('cf-email-info');
  const trap = byId<HTMLInputElement>('cf-form-extra');
  const submit = byId<HTMLButtonElement>('contact-submit');
  const status = byId<HTMLElement>('contact-status');
  const received = byId<HTMLElement>('contact-received');
  const panels = Array.from(document.querySelectorAll<HTMLElement>('#contact-panel [data-panel]'));

  let errors: FieldErrors = {};
  let sending = false;
  let userPicked = false;

  // ---- drawing text with isolated values -------------------------------------------------------------------------
  /** A sentence with {x} slots → nodes; each value in its own left-to-right isolate, optionally bold or a link. */
  function sentence(template: string, values: Record<string, Node | string>): DocumentFragment {
    const out = document.createDocumentFragment();
    for (const part of template.split(/(\{[a-z]\})/)) {
      const m = /^\{([a-z])\}$/.exec(part);
      if (!m) { if (part) out.append(part); continue; }
      const v = values[m[1] ?? ''];
      if (v === undefined) out.append(part);
      else if (typeof v === 'string') out.append(isolate(v));
      else out.append(v);
    }
    return out;
  }
  function isolate(text: string, tag: 'bdi' | 'b' = 'bdi'): HTMLElement {
    const bdi = document.createElement('bdi');
    bdi.dir = 'ltr';
    bdi.textContent = text;
    if (tag === 'bdi') return bdi;
    const b = document.createElement('b');
    b.append(bdi);
    return b;
  }
  function mailLink(): HTMLAnchorElement {
    const a = document.createElement('a');
    a.href = `mailto:${MAILBOX}`;
    a.append(isolate(MAILBOX));
    return a;
  }
  const formatCount = (n: number): string => n.toLocaleString('en-US');

  // ---- the reason: chips, the note, the panel, the message's help ------------------------------------------------
  const currentReason = (): Reason | null => {
    const r = radios.find((x) => x.checked)?.value ?? null;
    return isReason(r) ? r : null;
  };
  function drawReason(): void {
    const reason = currentReason();
    // The note keeps its row (empty after the visitor's own pick), so choosing a chip never moves the form below it.
    reasonNote.replaceChildren();
    if (!reason) reasonNote.append(W.noteNone);
    else if (!userPicked && from === 'header') reasonNote.append(sentence(W.noteButton, { p: bold(W.buttonName) }));
    else if (!userPicked && from) reasonNote.append(sentence(W.notePage, { p: bold(W.from[from]) }));
    describeReason();
    const shown = reason ?? 'access';
    for (const p of panels) p.hidden = p.dataset.panel !== shown;
    messageHelp.textContent = W.messageHelp[reason ?? 'none'];
    messageNeed.textContent = reason === 'other' ? W.required : W.optional;
    inputs.message.setAttribute('aria-required', reason === 'other' ? 'true' : 'false');
  }
  /** The reason group is described by its note (why a reason was chosen) and, after a refusal, by its error. */
  function describeReason(): void {
    const set = byId<HTMLElement>('cf-reason-set');
    const ids = [errors.reason ? 'cf-reason-error' : '', reasonNote.textContent ? reasonNote.id : ''].filter(Boolean).join(' ');
    if (ids) set.setAttribute('aria-describedby', ids); else set.removeAttribute('aria-describedby');
  }
  function bold(text: string): HTMLElement {
    const b = document.createElement('b');
    b.textContent = text;
    return b;
  }
  if (isReason(qReason)) {
    const r = radios.find((x) => x.value === qReason);
    if (r) r.checked = true;
  }
  drawReason();
  for (const r of radios) {
    r.addEventListener('change', () => {
      userPicked = true;
      drawReason();
      if (errors.reason) check('reason');
      if (errors.message || cleanLine(inputs.message.value)) check('message');
    });
  }

  // ---- field errors ---------------------------------------------------------------------------------------------
  const readInput = (): ContactInput => ({
    reason: currentReason() ?? '',
    first_name: inputs.first_name.value, last_name: inputs.last_name.value, email: inputs.email.value,
    company: inputs.company.value, job_title: inputs.job_title.value, company_website: inputs.company_website.value,
    message: inputs.message.value,
  });
  const fieldBox = (key: FieldKey): HTMLElement => byId<HTMLElement>(`cf-${key.replace('_', '-')}-field`);
  const errorEl = (key: FieldKey): HTMLElement => byId<HTMLElement>(`cf-${key.replace('_', '-')}-error`);
  const focusTarget = (key: FieldKey): HTMLElement =>
    key === 'reason' ? (radios.find((x) => x.checked) ?? radios[0] ?? form) : inputs[key];

  function errorText(key: FieldKey, code: string): DocumentFragment {
    const template = W.errors[key][code] ?? W.checkField;
    const input = readInput();
    const domain = (() => { const v = classifyEmail(input.email); return 'domain' in v ? v.domain : cleanLine(input.email).split('@').pop() ?? ''; })();
    const message = cleanBody(input.message);
    const n = code === 'long' && key === 'message' ? codePoints(message) - CAPS.message
      : code === 'links' ? countLinks(message) : codePoints(message);
    const out = sentence(template, { d: isolate(domain, 'b'), n: formatCount(n) });
    const addLine = (line: DocumentFragment): void => {
      const span = document.createElement('span');
      span.className = 'contact-way';
      span.append(line);
      out.append(span);
    };
    // A refused personal or temporary inbox always carries the way out (W1: write to hello@ from any address).
    if (key === 'email' && (code === 'personal' || code === 'temporary')) addLine(sentence(W.wayOut, { m: mailLink() }));
    // A mistyped ending refused on Send still offers its one-click fix.
    if (key === 'email' && code === 'not_found') {
      const v = classifyEmail(input.email);
      if (v.k === 'typo') addLine(sentence(W.typo, { s: typoFix(v.suggestion) }));
    }
    return out;
  }
  function draw(key: FieldKey): void {
    const code = errors[key];
    const box = fieldBox(key);
    const el = errorEl(key);
    box.classList.toggle('is-invalid', !!code);
    el.replaceChildren();
    if (code) {
      // One text box beside the icon: the hidden "Error:" for screen readers, then the sentence.
      const text = document.createElement('span');
      text.className = 'contact-error-text';
      const prefix = document.createElement('span');
      prefix.className = 'contact-vh';
      prefix.textContent = W.errorPrefix + ' ';
      text.append(prefix, errorText(key, code));
      el.append(text);
    }
    el.hidden = !code;
    const help = box.querySelector<HTMLElement>('.contact-help');
    if (help) help.hidden = !!code;
    if (key === 'reason') { describeReason(); return; }
    // A text field carries aria-invalid, and is described by its error, or by its help while it has none.
    const target = inputs[key];
    target.setAttribute('aria-invalid', code ? 'true' : 'false');
    const described = code ? el.id : help ? help.id : '';
    if (described) target.setAttribute('aria-describedby', described); else target.removeAttribute('aria-describedby');
  }
  function check(key: FieldKey): void {
    const code = fieldCode(key, readInput());
    if (code) errors[key] = code; else delete errors[key];
    draw(key);
    if (key === 'email') drawTypo(false);
    if (status.dataset.kind === 'count') drawCount();
  }

  // The domain check on leaving the e-mail field (the list checks only — the server asks DNS). A mistyped ending is
  // a hint first ("Did you mean acme.com?"); on Send it is refused.
  function drawTypo(show: boolean): void {
    emailInfo.replaceChildren();
    const v = classifyEmail(inputs.email.value);
    if (!show || v.k !== 'typo' || errors.email) { emailInfo.hidden = true; return; }
    emailInfo.append(sentence(W.typo, { s: typoFix(v.suggestion) }));
    emailInfo.hidden = false;
  }
  /** The "Did you mean …?" button: it rewrites the ending, clears a standing refusal and returns to the field. */
  function typoFix(suggestion: string): HTMLButtonElement {
    const fix = document.createElement('button');
    fix.type = 'button';
    fix.className = 'contact-typo-fix';
    fix.append(isolate(suggestion));
    fix.addEventListener('click', () => {
      const raw = inputs.email.value.trim();
      inputs.email.value = raw.slice(0, raw.lastIndexOf('@') + 1) + suggestion;
      if (errors.email) check('email');
      drawTypo(false);
      inputs.email.focus();
    });
    return fix;
  }
  inputs.email.addEventListener('blur', () => {
    const v = classifyEmail(inputs.email.value);
    if (v.k === 'empty') return;
    if (v.k === 'typo') { if (errors.email) check('email'); drawTypo(true); return; }
    check('email');
  });
  for (const key of FIELD_ORDER) {
    if (key === 'reason') continue;
    inputs[key].addEventListener('input', () => {
      if (errors[key]) check(key);
      if (key === 'first_name' && errors.last_name === 'name_long') check('last_name');
      if (key === 'email') drawTypo(false);
      if (key === 'message') drawMessageCount();
    });
  }
  function drawMessageCount(): void {
    const n = codePoints(cleanBody(inputs.message.value));
    messageCount.textContent = `${formatCount(n)} / ${formatCount(CAPS.message)}`;
    messageCount.classList.toggle('is-over', n > CAPS.message);
  }
  drawMessageCount();

  // ---- the status line beside the button -------------------------------------------------------------------------
  function say(kind: 'count' | 'wait' | 'error' | '', content?: Node | string): void {
    status.replaceChildren();
    status.dataset.kind = kind;
    status.className = 'contact-status' + (kind === 'error' || kind === 'count' ? ' is-error' : '');
    if (content) status.append(content);
    status.hidden = !kind;
  }
  function drawCount(): void {
    const bad = FIELD_ORDER.filter((k) => errors[k]);
    if (!bad.length) { say(''); return; }
    const frag = document.createDocumentFragment();
    frag.append(bad.length === 1 ? W.countOne : sentence(W.countMany, { n: formatCount(bad.length) }), ' · ');
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'contact-status-go';
    go.textContent = W.goFirst;
    go.addEventListener('click', () => { const first = bad[0]; if (first) focusTarget(first).focus(); });
    frag.append(go);
    say('count', frag);
  }
  function showErrors(next: FieldErrors): void {
    errors = next;
    for (const key of FIELD_ORDER) draw(key);
    drawCount();
    const first = FIELD_ORDER.find((k) => errors[k]);
    if (first) focusTarget(first).focus();
  }

  // ---- sending ---------------------------------------------------------------------------------------------------
  const token = (): string => form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? '';
  const resetCheck = (): void => { try { window.turnstile?.reset(); } catch { /* the widget is not mounted yet */ } };
  function busy(on: boolean): void {
    sending = on;
    submit.disabled = on;
    submit.textContent = on ? W.sending : W.send;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }
  /** Resolves with the security check's token, waiting up to 15 s for it to arrive; '' when it never did. */
  function waitForToken(): Promise<string> {
    const now = token();
    if (now) return Promise.resolve(now);
    say('wait', W.waiting);
    return new Promise((resolve) => {
      const began = Date.now();
      const timer = window.setInterval(() => {
        const t = token();
        if (t || Date.now() - began > TOKEN_WAIT_MS) { window.clearInterval(timer); resolve(t); }
      }, TOKEN_POLL_MS);
    });
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (sending) return;
    const input = readInput();
    const found = validateAll(input);
    drawTypo(false);
    if (Object.keys(found).length) { showErrors(found); return; }
    showErrors({});
    busy(true);
    void waitForToken().then((t) => {
      if (!t) { busy(false); say('error', W.stillWaiting); return; }
      return send(input, t);
    });
  });

  async function send(input: ContactInput, turnstileToken: string): Promise<void> {
    const body = {
      reason: input.reason, first_name: input.first_name.trim(), last_name: input.last_name.trim(), email: input.email.trim(),
      company: input.company.trim(), job_title: input.job_title.trim(), company_website: input.company_website.trim(),
      message: input.message.trim(), from: from ?? 'direct', lang, started_at: startedAt, form_extra: trap.value, turnstileToken,
    };
    let answer: { status: number; data: { ok?: unknown; error?: unknown; fields?: unknown } };
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as typeof answer.data;
      answer = { status: res.status, data: data && typeof data === 'object' ? data : {} };
    } catch {
      busy(false);
      say('error', sentence(W.notSent, { m: mailLink() }));
      resetCheck();
      return;
    }
    busy(false);
    if (answer.status === 200 && answer.data.ok === true) { showReceived(input); return; }
    resetCheck(); // the token is single-use: every other answer needs a fresh one
    const code = typeof answer.data.error === 'string' ? answer.data.error : '';
    const fields = fromServer(answer.data.fields);
    if (code === 'invalid' && Object.keys(fields).length) { showErrors(fields); return; }
    if (code === 'turnstile') { say('error', W.checkFailed); return; }
    if (code === 'rate_limited') { say('error', sentence(W.rateLimited, { m: mailLink() })); return; }
    say('error', sentence(W.notSent, { m: mailLink() }));
  }

  // ---- the receipt ----------------------------------------------------------------------------------------------
  function showReceived(input: ContactInput): void {
    const reason = currentReason() ?? 'access';
    byId<HTMLElement>('cr-about').textContent = W.reasons[reason];
    const who = byId<HTMLElement>('cr-from');
    const name = document.createElement('bdi');
    name.textContent = `${cleanLine(input.first_name)} ${cleanLine(input.last_name)}`;
    const org = document.createElement('bdi');
    org.textContent = cleanLine(input.company);
    who.replaceChildren(name, ' · ', org);
    // The receipt shows the address the reply will go to: the checked one the server sends on.
    const verdict = classifyEmail(input.email);
    byId<HTMLElement>('cr-reply').replaceChildren(isolate(verdict.k === 'ok' ? verdict.address : cleanLine(input.email)));
    // The receipt keeps the card's height, so a second click lands on nothing that scrolled up.
    received.style.minHeight = `${form.offsetHeight}px`;
    form.hidden = true;
    received.hidden = false;
    byId<HTMLElement>('cr-stamp').focus();
  }
}
