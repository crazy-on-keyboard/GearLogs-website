#!/usr/bin/env node
// The capture's privacy guard, proved on planted pages (DEBT-106 + DEBT-102, the bug sweep's stage 8): every gap the security gate
// named is a fixture here — a phone without "+", a bare 8–9-digit run, an e-mail split across elements, a short IPv6, a native
// select's chosen option, text inside an open shadow root and a same-origin iframe, SVG text (refused, never "blanked") — and
// the demo's INVENTED numbers (a zero run, then the person's counter) are SHOWN while any other shape is still blanked. The same
// functions the capture runs in the page (`scripts/capture/guard.mjs`) run here in headless Chrome. Needs Chrome (CHROME to override).
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { PATTERNS, ALLOWED_ADDRESS, addressesShown, blankPersonal, unblank } from './capture/guard.mjs';

const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
if (!existsSync(CHROME)) { console.error(`check-capture-guard: Chrome not found at ${CHROME} — set CHROME to its path (this check never skips silently)`); process.exit(2); }

const WORDS = { idWords: ['ID number', 'מספר זהות', 'Personal number', 'מספר אישי'], allowWords: ['External ID', 'מזהה חיצוני'] };
const BOX = { x: 0, y: 0, width: 1440, height: 900 };
const judge = (page) => page.evaluate(addressesShown, { box: BOX, open: ['hello@gearlogs.com'], patterns: PATTERNS, allowedAddress: ALLOWED_ADDRESS, allowWords: WORDS.allowWords });
const blank = (page) => page.evaluate(blankPersonal, { ...WORDS, patterns: PATTERNS });
const transparent = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => getComputedStyle(el).webkitTextFillColor === 'rgba(0, 0, 0, 0)'), selector);

/** Each case: the page, what `blankPersonal` must blank (a count), what `addressesShown` must still report AFTER the blanking. */
const CASES = [
  { name: 'an invented phone and ID (the demo\'s own) are SHOWN — nothing blanked, nothing refused',
    html: '<p>Phone: +972-54-000-0001</p><p>Phone: +31-20-000-0123</p><span>ID number</span><span>000000042</span><span>Personal number</span><span>E-000-0042</span><input aria-label="ID number" value="000000042"><input aria-label="Phone" value="+44-20-000-0007">',
    blanked: 0, refused: 0 },
  { name: 'a real-looking international phone is blanked, and never refused once blanked',
    html: '<p>Call <b class="t">+972-54-123-4567</b> today</p>', blanked: 1, refused: 0, transparent: 'b.t' },
  { name: 'a phone WITHOUT a plus (054-123-4567 · 03-1234567 · 054 1234567) is caught',
    html: '<p class="a">054-123-4567</p><p class="b">03-1234567</p><p class="c">054 1234567</p><p>a code LOG-03-001 and a date 2026-10-01 are not phones</p>', blanked: 3, refused: 0, transparent: 'p.a, p.b, p.c' },
  { name: 'a bare 8–9-digit run as plain text (an ID outside its field) is blanked; a 13-digit GTIN, a count with separators and a year are not',
    html: '<p class="id">304567891</p><p class="id2">30456789</p><p>GTIN 7290001234563</p><p>12,345,678 items</p><p>2026</p>', blanked: 2, refused: 0, transparent: 'p.id, p.id2' },
  { name: 'an e-mail split across elements is read as one address and refused (nothing can blank it apart)',
    html: '<p><span>dana.levi</span><span>@</span><span>gmail.com</span></p>', blanked: 0, refused: 1 },
  { name: 'digits in neighbouring BLOCK tiles never merge into one number (a dashboard tile beside a tile); inline spans still join',
    html: '<div><div>2026</div><div>09291</div></div><div><span>1234</span><span>5678</span><span>9</span></div><p><span>a.b</span><span>@c.net</span></p>', blanked: 0, refused: 2 },
  { name: 'a reserved test-domain address, a documentation IPv4 and the site\'s own mailbox are allowed',
    html: '<p>noa@meridian-freight.example · 192.0.2.44 · 2001:db8::1 · hello@gearlogs.com</p>', blanked: 0, refused: 0 },
  { name: 'a short IPv6 (::1 · fe80::1 · 2a01:4f8::9) and a real IPv4 are refused',
    html: '<p class="a">::1</p><p class="b">fe80::1</p><p class="c">2a01:4f8::9</p><p class="d">82.166.1.9</p>', blanked: 0, refused: 4 },
  { name: 'a native select\'s chosen option is read and blanked like a field',
    html: '<select aria-label="Contact"><option>+972-54-765-4321</option><option>none</option></select>', blanked: 1, refused: 0, transparent: 'select' },
  { name: 'text in an open shadow root is read',
    html: '<div id="host"></div><script>document.getElementById("host").attachShadow({mode:"open"}).innerHTML="<p>+972-52-999-8888</p>"</script>', blanked: 1, refused: 0 },
  { name: 'text in a same-origin iframe is read',
    html: '<iframe id="f" srcdoc="<p>+972-52-777-6666</p>" style="width:400px;height:100px"></iframe>', blanked: 1, refused: 0, settle: true },
  { name: 'SVG text that carries a phone is REFUSED, never counted as blanked',
    html: '<svg width="300" height="40"><text x="0" y="20">+972-54-555-4444</text></svg>', blanked: 0, refused: 1, note: 'svg' },
  { name: 'a value under the company\'s own External ID column is allowed (the named allowance)',
    html: '<table><thead><tr><th>Name</th><th>External ID</th></tr></thead><tbody><tr><td>Dana</td><td>123456789</td></tr></tbody></table><input aria-label="External ID" value="987654321"><p>External ID: <span>123456789</span></p><p>מזהה חיצוני: <span>123456780</span></p><p>Badge: <span class="x">123456781</span></p>', blanked: 1, refused: 0, transparent: 'span.x' },
  { name: 'an ID field with a real-looking value is blanked; the same field with an invented value is not',
    html: '<input id="a" aria-label="ID number" value="304567891"><input id="b" aria-label="ID number" value="000000007"><span>ID number</span><span class="v">304567892</span>', blanked: 2, refused: 0, transparent: '#a, span.v' },
  { name: 'unblank puts every value back, in the main document and the shadow root',
    html: '<p class="t">+972-54-123-4567</p><div id="host"></div><script>document.getElementById("host").attachShadow({mode:"open"}).innerHTML="<p>+972-52-999-8888</p>"</script>', blanked: 2, refused: 0, unblankCheck: true },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let failures = 0;
const fail = (name, why) => { failures++; console.error(`check-capture-guard: FAIL — ${name}: ${why}`); };
for (const c of CASES) {
  await page.setContent(`<!doctype html><html><body>${c.html}</body></html>`, { waitUntil: 'load' });
  if (c.settle) await page.waitForTimeout(150);
  const blanked = await blank(page);
  const refused = await judge(page);
  if (blanked !== c.blanked) fail(c.name, `blanked ${blanked}, expected ${c.blanked}`);
  if (refused.length !== c.refused) fail(c.name, `refused ${refused.length} (${refused.join(' · ') || 'none'}), expected ${c.refused}`);
  if (c.note && !refused.some((r) => r.includes(c.note))) fail(c.name, `the refusal does not say "${c.note}" (${refused.join(' · ')})`);
  if (c.transparent) {
    const states = await transparent(page, c.transparent);
    if (!states.length || !states.every(Boolean)) fail(c.name, `${c.transparent} is not drawn transparent (${states.join(',')})`);
  }
  if (c.unblankCheck) {
    await page.evaluate(unblank);
    const left = await page.evaluate(() => {
      const roots = [document, ...[...document.querySelectorAll('*')].filter((e) => e.shadowRoot).map((e) => e.shadowRoot)];
      return roots.flatMap((r) => [...r.querySelectorAll('[data-capture-blank]')]).length;
    });
    const still = await transparent(page, 'p.t');
    if (left !== 0 || still.some(Boolean)) fail(c.name, `${left} marks left, transparent: ${still.join(',')}`);
  }
}
// the patterns themselves, as data: the invented shapes and only they
const inv = { phone: new RegExp(PATTERNS.inventedPhone), id: new RegExp(PATTERNS.inventedId), pn: new RegExp(PATTERNS.inventedPersonal) };
for (const [v, ok] of [['+972-54-000-0001', true], ['+31-20-000-9999', true], ['+1-312-000-0042', true], ['+972-54-100-0001', false], ['+972-54-000-001', false], ['054-000-0001', false]]) if (inv.phone.test(v) !== ok) fail('inventedPhone', `${v} → ${!ok}`);
for (const [v, ok] of [['000000001', true], ['000009999', true], ['000010000', false], ['100000001', false], ['00000001', false]]) if (inv.id.test(v) !== ok) fail('inventedId', `${v} → ${!ok}`);
for (const [v, ok] of [['E-000-0001', true], ['0000001', true], ['E-001-0001', false], ['1000001', false]]) if (inv.pn.test(v) !== ok) fail('inventedPersonal', `${v} → ${!ok}`);
await browser.close();
if (failures) { console.error(`check-capture-guard: ${failures} failure(s)`); process.exit(1); }
console.log(`check-capture-guard: OK — ${CASES.length} planted pages judged as expected, the invented shapes pinned`);
