#!/usr/bin/env node
// Bilingual integrity guard for the built site (runs after build-site.mjs on dist/).
// Catches the mistakes check-links can't: broken hreflang reciprocity, a Hebrew page that
// forgot dir="rtl" or links back into the English tree, CSP that drifted between the four
// contact-page blocks (or leaked back onto the home page), and invalid JSON-LD. Zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/pages.mjs';
import { SITE_ORIGIN } from '../src/i18n.mjs';

const DIST = join(process.cwd(), 'dist');
const problems = [];
const fail = (m) => problems.push(m);

const enUrl = (p) => (p.path === '/' ? SITE_ORIGIN : `${SITE_ORIGIN}${p.path}`);
const heUrl = (p) => (p.path === '/' ? `${SITE_ORIGIN}/he/` : `${SITE_ORIGIN}/he${p.path}`);
const enFile = (p) => join(DIST, p.path === '/' ? 'index.html' : `${p.path}.html`);
const heFile = (p) => join(DIST, 'he', p.path === '/' ? 'index.html' : `${p.path}.html`);

const has = (html, needle) => html.includes(needle);

for (const p of PAGES.filter((x) => x.bilingual)) {
  for (const [file, label] of [[enFile(p), 'en'], [heFile(p), 'he']]) {
    if (!existsSync(file)) { fail(`MISSING page  ${label}:${p.slug}`); continue; }
    const html = readFileSync(file, 'utf8');

    // hreflang: both sides carry all three alternates, pointing at the same pair.
    for (const [hl, url] of [['en', enUrl(p)], ['he', heUrl(p)], ['x-default', enUrl(p)]]) {
      if (!has(html, `<link rel="alternate" hreflang="${hl}" href="${url}">`)) {
        fail(`HREFLANG   ${label}:${p.slug} missing hreflang="${hl}" -> ${url}`);
      }
    }
    // self-referencing canonical
    const wantCanon = label === 'en' ? enUrl(p) : heUrl(p);
    if (!has(html, `<link rel="canonical" href="${wantCanon}">`)) fail(`CANONICAL  ${label}:${p.slug} not self-referencing (${wantCanon})`);

    if (label === 'he') {
      if (!has(html, '<html lang="he" dir="rtl">')) fail(`DIR        he:${p.slug} not <html lang="he" dir="rtl">`);
      // The Field Notes section name must be the ONE canonical form everywhere.
      for (const banned of ['פתקים מהשטח', 'רשומות שדה', 'רשימות שטח', 'יומן שטח', 'רשומות השדה', 'רשימות מהשטח']) {
        if (has(html, banned)) fail(`FN-NAME    he:${p.slug} uses a non-canonical Field Notes name "${banned}" (must be "רשומות מהשטח")`);
      }
      // Calques the Director rejects (non-words / machine-Hebrew).
      for (const calque of ['אחריותיות', 'סנכרון חי', 'בריאות מערכת', 'כניסה ארגונית']) {
        if (has(html, calque)) fail(`CALQUE     he:${p.slug} contains the banned calque "${calque}"`);
      }
      // No links back into the English tree — except the two language switchers (header + footer),
      // which point at the English counterpart on purpose.
      const stripped = html
        .replace(/<a class="lang-toggle"[\s\S]*?<\/a>/g, '')
        .replace(/<a class="footer-lang"[\s\S]*?<\/a>/g, '');
      const bad = [...stripped.matchAll(/href="(\/(?!he\/|he"|img\/|styles\/|js\/|favicon|\.well-known\/|api\/)[^"]*)"/g)]
        .map((m) => m[1])
        .filter((h) => h === '/' || /^\/(pricing|guides|faq|notes|changelog|privacy|terms|refunds|contact)(\/|#|\?|$)/.test(h));
      for (const h of [...new Set(bad)]) fail(`HE-LINK    he:${p.slug} links into the English tree: ${h}`);
    }

    // JSON-LD, where present, must parse.
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { fail(`JSONLD     ${label}:${p.slug} invalid JSON-LD: ${e.message}`); }
    }
  }
}

// The contact form's relaxed CSP (Turnstile + the contact function) lives on the four /contact paths ONLY, and the four
// blocks must be byte-identical; the home page is back on the strict site-wide policy (Stage 1, 2026-09-26).
const headersFile = join(DIST, '_headers');
if (existsSync(headersFile)) {
  const text = readFileSync(headersFile, 'utf8').replace(/\r\n/g, '\n'); // _headers is CRLF
  const cspFor = (selector) => {
    const re = new RegExp(`(?:^|\\n)${selector.replace(/[/.]/g, '\\$&')}\\n(?:[^\\n]*\\n)*?\\s*Content-Security-Policy:\\s*([^\\n]+)`);
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  const selectors = ['/contact', '/contact.html', '/he/contact', '/he/contact.html'];
  const csps = selectors.map((s) => [s, cspFor(s)]);
  const missing = csps.filter(([, v]) => !v).map(([s]) => s);
  if (missing.length) fail(`CSP        missing Content-Security-Policy block(s) for: ${missing.join(', ')}`);
  const uniq = new Set(csps.filter(([, v]) => v).map(([, v]) => v));
  if (uniq.size > 1) fail(`CSP        the four contact CSP blocks are not identical (${uniq.size} distinct) — EN/HE contact drifted`);
  for (const home of ['/', '/index.html', '/he/', '/he/index.html']) {
    if (cspFor(home)) fail(`CSP        ${home} carries its own CSP block — the home page must stay on the strict site-wide policy`);
  }
} else {
  fail('CSP        dist/_headers not found');
}

if (problems.length) {
  console.error(`check-i18n: ${problems.length} problem(s)\n` + problems.map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log('check-i18n: OK — hreflang reciprocity, canonicals, dir=rtl, HE link integrity, JSON-LD and the four contact CSP blocks all pass');
