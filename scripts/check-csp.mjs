#!/usr/bin/env node
// The CSP walk (Stage 2 PR-1, 2026-09-27 — the security gate's SEC-PR1-1): every built page is loaded in Chrome with the
// production policy PINNED inside the browser — each response is served from dist/ by request interception with the headers
// from scripts/lib/headers.mjs — so nothing between the page and Chrome can loosen it (on the Director's PC the AdGuard app
// rewrites every CSP on plain-HTTP loopback traffic and adds 'unsafe-inline'). Two proofs per page:
//   1. zero securitypolicyviolation events on the page's own document;
//   2. a canary: an inline style set at runtime must be BLOCKED (proof the strict policy is really in force) — except /pay,
//      the one page that keeps 'unsafe-inline' for Paddle's overlay, where it must apply.
// On /contact the Turnstile script is allowed to load for real, so a style it would inject into the page is caught too, and on
// /pay Paddle's own files load for real (its two known refusals are named below). Every policy carries upgrade-insecure-requests,
// so Chrome asks for a page's files over https: both schemes are served, and ANY failed request for the site's own files fails
// the walk (the Stage 2 security gate's SEC-PR2-1: before this, every stylesheet, script, font and photo was silently aborted,
// so "0 violations" proved only that the header was applied). Needs Chrome (CHROME to override the path). Run after `npm run build`.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { headersFor } from './lib/headers.mjs';

const DIST = join(process.cwd(), 'dist');
const ORIGIN = 'http://gearlogs.test';   // a reserved name (RFC 6761): nothing leaves this machine for it
const HOST = new URL(ORIGIN).host;
/** /pay's refusals already known and decided: Paddle's stylesheet (the open question SEC-PR1-3) and Paddle's retain script
 *  (ProfitWell — blocked on purpose; it belongs to the shared Paddle account's other product). Anything else on /pay fails. */
const PAY_KNOWN = [/^style-src-elem ← https:\/\/cdn\.paddle\.com\//, /^script-src-elem ← https:\/\/public\.profitwell\.com\//];
const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

if (!existsSync(DIST)) { console.error('check-csp: dist/ not found — run `npm run build` first'); process.exit(2); }
if (!existsSync(CHROME)) { console.error(`check-csp: Chrome not found at ${CHROME} — set CHROME to its path (this check never skips silently)`); process.exit(2); }

const pages = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.html')) pages.push(relative(DIST, p).replace(/\\/g, '/')); } })(DIST);

/** The file Pages serves for a clean path, as the preview's clean-URL rule resolves it. */
function fileFor(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean.slice(1), `${clean.slice(1)}.html`, `${clean.slice(1)}/index.html`];
  for (const c of candidates) { const f = join(DIST, c); if (existsSync(f) && statSync(f).isFile()) return f; }
  return null;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.host === HOST) {
    // the one Pages Function (functions/api/geo.js) answers as it would for a visitor in Israel, so the "view in Hebrew"
    // nudge renders on the English pages and is judged by the policy too
    if (url.pathname === '/api/geo') return route.fulfill({ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify({ country: 'IL' }) });
    const file = fileFor(url.pathname);
    if (!file) return route.fulfill({ status: 404, body: 'not found' });
    const headers = Object.fromEntries(headersFor(url.pathname));
    headers['content-type'] = TYPES[extname(file)] ?? 'application/octet-stream';
    return route.fulfill({ status: 200, headers, body: readFileSync(file) });
  }
  // the contact form's Turnstile loads for real (what it injects into OUR page is judged by our pinned policy); nothing else leaves
  if (url.hostname === 'challenges.cloudflare.com') return route.continue();
  // /pay loads Paddle.js for real, so what Paddle injects into OUR page is judged by the pinned /pay policy
  if (/(^|\.)paddle\.com$/.test(url.hostname)) return route.continue();
  return route.abort();
});
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.effectiveDirective} ← ${e.blockedURI || 'inline'}${e.sourceFile ? ` (${e.sourceFile.split('/').pop()}:${e.lineNumber})` : ''}`));
});
const page = await ctx.newPage();
const problems = [];
let served = 0;
const failed = [];
page.on('requestfinished', async (r) => {
  if (new URL(r.url()).host !== HOST) return;
  served++;
  const status = (await r.response())?.status() ?? 0;
  if (status >= 400) failed.push(`${new URL(r.url()).pathname} (HTTP ${status})`);
});
page.on('requestfailed', (r) => { if (new URL(r.url()).host === HOST) failed.push(`${new URL(r.url()).pathname} (${r.failure()?.errorText})`); });
for (const rel of pages.sort()) {
  const path = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
  await page.goto(ORIGIN + path, { waitUntil: 'load' });
  await page.waitForTimeout(/contact/.test(rel) ? 4000 : 300);
  const violations = (await page.evaluate(() => window.__csp.slice())).filter((v) => !(/^pay(\.html)?$/.test(rel) && PAY_KNOWN.some((k) => k.test(v))));
  if (failed.length) problems.push(`${rel}: ${failed.length} of the site's own file(s) did not load — ${failed.splice(0).join(' · ')}`);
  const canaryApplied = await page.evaluate(() => {
    const el = document.createElement('div');
    el.setAttribute('style', 'width: 123px');
    document.body.appendChild(el);
    const applied = getComputedStyle(el).width === '123px';
    el.remove();
    return applied;
  });
  // the canary's own refusal is the expected one — every other violation is a finding
  const own = violations.filter((v) => !/^style-src-attr ← inline$/.test(v));
  const inlineAllowed = /^pay(\.html)?$/.test(rel);
  if (own.length) problems.push(`${rel}: ${own.length} violation(s) — ${own.join(' · ')}`);
  if (canaryApplied !== inlineAllowed) problems.push(`${rel}: the inline-style canary ${canaryApplied ? 'APPLIED — the strict policy is not in force' : 'was blocked where the page allows it'}`);
}
await browser.close();
if (problems.length) {
  console.error(`check-csp: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
if (served < pages.length * 4) {
  console.error(`check-csp: only ${served} of the site's own files were served across ${pages.length} pages — the walk is not loading the pages' stylesheets, scripts, fonts and photos`);
  process.exit(1);
}
console.log(`check-csp: OK — ${pages.length} pages and ${served} of their own files under the pinned production policy: 0 violations, none failed to load, the canary blocked everywhere but /pay`);
