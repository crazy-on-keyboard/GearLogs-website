#!/usr/bin/env node
// The capture pipeline (CAPTURE-1, 2026-09-26 — the Director's picks "App capture · A · Now, re-run later" and his rule that
// every product picture on the site is the REAL app, updatable "hey I want to update this and this"): one command re-takes
// every screenshot the site uses, in English and Hebrew, from the demo workspace.
//
//   npm run capture                         every shot, both languages
//   npm run capture -- --only=board,approvals --lang=he
//
// What it needs (nothing here ever holds a password):
//   1. the app's local preview:  cd ../GearLogs && npx vite preview --port 4174 --strictPort --host 127.0.0.1
//   2. one capture Chrome PER LANGUAGE — each its own profile and control port, outside every repo, signed in ONCE by the Director
//      as that language's demo account (English: Noa Bar-Lev in TN-076 · Hebrew: נועה בר-לב in TN-077, the Hebrew Logistics demo —
//      his pick "Hebrew data · B"). This script opens each when it is not running; the sessions live in those profiles, never in git.
// The shots themselves live in ./shots.mjs; the pictures land in public/img/app/<id>.<lang>.webp (plus a 1600-px copy, <id>.<lang>.1600.webp)
// with an index (manifest.json).
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import SHOTS from './shots.mjs';
import { encodeWebp } from '../images/encode.mjs';
import { badgeAt } from '../lib/shots.mjs';

const APP = process.env.CAPTURE_APP ?? 'http://localhost:4174';
/** Each language's own window: the two demo accounts cannot share a profile (both sign in to the same local address). */
const WINDOWS = {
  en: { cdp: process.env.CAPTURE_CDP ?? 'http://127.0.0.1:9333', profile: process.env.CAPTURE_PROFILE ?? join(homedir(), '.gearlogs-capture', 'chrome-profile') },
  he: { cdp: process.env.CAPTURE_CDP_HE ?? 'http://127.0.0.1:9334', profile: process.env.CAPTURE_PROFILE_HE ?? join(homedir(), '.gearlogs-capture', 'chrome-profile-he') },
};
const CHROME = process.env.CAPTURE_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
/** The app's own repo: its dictionary names every button a shot presses, in both languages. */
const APP_REPO = process.env.CAPTURE_APP_REPO ?? join(process.cwd(), '..', 'GearLogs');
const OUT = join(process.cwd(), 'public', 'img', 'app');
/** The frame every picture is taken in: a common laptop desktop, sharp on high-density screens. */
const VIEW = { width: 1440, height: 900, deviceScaleFactor: 2 };
const WEBP_QUALITY = 0.9;

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',')) : null;
const langs = (args.lang ?? 'en,he').split(',');
/** The look every picture is taken in unless a shot names its own: the app's default theme, whatever the demo account last picked. */
const BASE_THEME = args.theme ?? process.env.CAPTURE_THEME ?? 'office';

const reachable = async (url) => { try { return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureChrome({ cdp, profile }) {
  if (await reachable(`${cdp}/json/version`)) return;
  const port = new URL(cdp).port;
  spawn(CHROME, [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    '--no-first-run', '--no-default-browser-check', `--window-size=${VIEW.width},${VIEW.height + 80}`, APP], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 30 && !(await reachable(`${cdp}/json/version`)); i++) await sleep(500);
  if (!(await reachable(`${cdp}/json/version`))) throw new Error(`capture: the capture Chrome did not open (${CHROME})`);
}

/** The app's and My Gear's merged dictionaries ({ en, he }), read from their own source — so a shot names a button by its key,
 *  never by one language's words (the app's word wins where both define a key). */
async function appWords() {
  const entry = "import { APP_TRANSLATIONS as A } from './services/i18n/appTables'; import { STAFF_TRANSLATIONS as S } from './services/i18n/staff';"
    + ' export const WORDS = { en: { ...S.en, ...A.en }, he: { ...S.he, ...A.he } };';
  const out = await build({ stdin: { contents: entry, resolveDir: APP_REPO, loader: 'ts' }, bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
  return mod.WORDS;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The only real mailboxes a picture may show: the site's own public ones. Every demo address lives on a reserved test domain. */
const PUBLIC_ADDRESSES = ['hello@gearlogs.com', 'support@gearlogs.com'];

/** Runs in the page: where an e-mail address or a network (IP) address would be READ inside the picture's area (a text or a
 *  field's value; a placeholder is no one's address). A sign-in notice names the network address its member signed in from —
 *  a real person's. Answers the elements' descriptions, never the addresses. */
function addressesShown({ box, open }) {
  const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+|\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b|\b(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}\b/g;
  // the reserved test domains, and the network ranges kept for documentation (RFC 5737, RFC 3849)
  const allowed = (a) => open.includes(a.toLowerCase()) || /\.(example|test|invalid|localhost)$/i.test(a) || /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/.test(a) || /^2001:0?db8:/i.test(a);
  const inPicture = (el) => {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > box.x && r.left < box.x + box.width && r.bottom > box.y && r.top < box.y + box.height;
  };
  const found = [];
  const say = (el) => found.push(`${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}${el.closest('[role="dialog"]') ? ' in a dialog' : ''}`);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const hits = (node.nodeValue.match(ADDRESS) ?? []).filter((a) => !allowed(a));
    if (hits.length && node.parentElement && inPicture(node.parentElement)) say(node.parentElement);
  }
  for (const field of document.querySelectorAll('input, textarea')) {
    const hits = (String(field.value ?? '').match(ADDRESS) ?? []).filter((a) => !allowed(a));
    if (hits.length && inPicture(field)) say(field);
  }
  return found;
}

/** Runs in the page: a thing's box TOGETHER with its own visible label, when the label stands right over it or right beside
 *  it on its line — an outline on the control alone would dim the field's name. The label is the one the control is bound to
 *  (<label for>, aria-labelledby), or the words of its aria-label written just before it (a stepper, a segmented choice).
 *  Anything without such a label keeps its own box. */
function boxWithLabel(el) {
  const r = el.getBoundingClientRect();
  const own = { x: r.x, y: r.y, width: r.width, height: r.height };
  const seen = (node) => node && node !== el && !node.contains(el) && node.checkVisibility({ visibilityProperty: true }) && node.getBoundingClientRect().width > 0;
  let label = [el.labels?.[0], el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null,
    document.getElementById((el.getAttribute('aria-labelledby') ?? '').split(' ')[0])].find(seen);
  const name = (el.getAttribute('aria-label') ?? '').trim();
  if (!label && name && el.matches('input, textarea, select, [role="group"], [role="radiogroup"], [role="grid"], [role="combobox"], [role="slider"], [role="spinbutton"]')) {
    for (let node = el, depth = 0; node && depth < 3 && !label; node = node.parentElement, depth++) {
      for (let before = node.previousElementSibling; before && !label; before = before.previousElementSibling) {
        const words = before.textContent.trim();
        if (words.startsWith(name) && words.length <= name.length + 12 && seen(before)) label = before;
      }
    }
  }
  if (!label) return own;
  const l = label.getBoundingClientRect();
  const over = l.bottom <= r.top + 2 && r.top - l.bottom <= 28 && l.left < r.right && l.right > r.left;
  const beside = l.top < r.bottom && l.bottom > r.top && Math.max(l.left - r.right, r.left - l.right) <= 24;
  if (!(over || beside)) return own;
  const x = Math.min(r.left, l.left);
  const y = Math.min(r.top, l.top);
  return { x, y, width: Math.max(r.right, l.right) - x, height: Math.max(r.bottom, l.bottom) - y };
}

/** Runs in the page: for each place a number could take, how much a reader would lose there — a button, a field, an icon,
 *  a column head, a line of text under it. What stands in the target's OWN window (the same dialog, the same floating panel,
 *  or the page itself) counts four times what lies behind that window. 0 = the place is free. (The mark's own target is
 *  not asked about: a number may touch its own outline.) */
function placesCost({ places }) {
  const { neededAt } = window.captureProbe;
  // the window a thing stands in: a dialog, or a floating panel (only floating things cast a shadow), or the page
  const windowOf = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (node.getAttribute('role') === 'dialog') return node;
      const style = getComputedStyle(node);
      if ((style.position === 'fixed' || style.position === 'absolute') && style.boxShadow !== 'none') return node;
    }
    return document.body;
  };
  return places.map(({ x, y, w, h, own }) => {
    const home = windowOf(document.elementFromPoint(own.x + own.w / 2, own.y + own.h / 2) ?? document.body);
    let cost = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const px = x + 2 + (i * (w - 4)) / 4;
        const py = y + 2 + (j * (h - 4)) / 4;
        if (px >= own.x && px <= own.x + own.w && py >= own.y && py <= own.y + own.h) continue;
        const top = neededAt(px, py);
        if (top) cost += windowOf(top) === home ? 4 : 1;
      }
    }
    return cost;
  });
}

/** Runs in the page, once per picture: what a reader needs at a point — a button, a field, an icon, a column head, a line
 *  of text. Answers the thing itself, or null when the point is free. */
function installProbe() {
  const NEEDED = 'button, a, input, select, textarea, label, svg, img, canvas, th, [role="button"], [role="tab"], [role="radio"], [role="checkbox"],'
    + ' [role="switch"], [role="combobox"], [role="slider"], [role="option"], [role="link"], [role="columnheader"]';
  const textAt = (el, x, y) => {
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  };
  window.captureProbe = {
    neededAt(x, y) {
      const top = document.elementFromPoint(x, y);
      if (!top) return null;
      return top.closest(NEEDED) ?? (textAt(top, x, y) ? top : null);
    },
  };
}

/** Runs in the page: how far each target's outline may stand from it on each side (top · right · bottom · left) before it
 *  would lie over a neighbour a reader needs — the line of text under a title, the next row of a list. The full margin
 *  where the side is free; never less than 2, so the outline stays clear of its own target. */
function roomAround({ boxes, pad }) {
  const { neededAt } = window.captureProbe;
  const LEAST = 2;
  const STEP = 8;
  // a neighbour whose edge only brushes the target (a pixel or two of a tight list) is still a neighbour
  const REACH = 3;
  return boxes.map(({ x, y, w, h }) => {
    const own = document.elementFromPoint(x + w / 2, y + h / 2);
    // a thing that holds the target (its card, its row, its own button) is no neighbour, and neither is one that reaches
    // into it (the (i) between a title and its status stands a little taller than both)
    const reachesIn = (el) => { const r = el.getBoundingClientRect(); return Math.min(r.right, x + w) - Math.max(r.left, x) > REACH && Math.min(r.bottom, y + h) - Math.max(r.top, y) > REACH; };
    const neighbour = (px, py) => { const hit = neededAt(px, py); return Boolean(hit) && !(own && hit.contains(own)) && !reachesIn(hit); };
    const along = (from, length) => {
      const count = Math.max(2, Math.ceil(length / STEP) + 1);
      return Array.from({ length: count }, (_, i) => from + 1 + (i * (length - 2)) / (count - 1));
    };
    const room = (points) => {
      for (let d = 1; d <= pad; d++) if (points(d).some(([px, py]) => neighbour(px, py))) return Math.max(LEAST, d - 1);
      return pad;
    };
    return [
      room((d) => along(x, w).map((px) => [px, y - d])),
      room((d) => along(y, h).map((py) => [x + w + d, py])),
      room((d) => along(x, w).map((px) => [px, y + h + d])),
      room((d) => along(y, h).map((py) => [x - d, py])),
    ];
  });
}

/** The measures the site draws a mark with (scripts/lib/shots.mjs): 6 around the target (less on a side where a neighbour
 *  stands closer — the mark's own `pad`: top · right · bottom · left), a 30 square number. */
const MARK = { pad: 6, number: 30, hair: 3 };
const SIDES = ['corner', 'start', 'end', 'above', 'below'];
const liesOver = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > MARK.hair && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > MARK.hair;

/** Small helpers each shot drives the app with — by the app's own labels, never a remembered position. */
function helpers(page, words) {
  const app = {
    page,
    /** The app's word for `key` in the language on screen now. */
    async t(key) {
      const lang = (await page.evaluate(() => document.documentElement.lang || 'en')).startsWith('he') ? 'he' : 'en';
      const word = words[lang][key];
      if (!word) throw new Error(`capture: the app has no word "${key}" in ${lang}`);
      return word;
    },
    async idle(ms = 600) { await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {}); await sleep(ms); },
    /** Back to the app after a My Gear shot, signed in and ready. */
    async backToApp() {
      await page.goto(APP, { waitUntil: 'load' });
      const settings = new RegExp(`^(${escapeRe(words.en.tab_settings)}|${escapeRe(words.he.tab_settings)})$`, 'i');
      await page.getByRole('button', { name: settings }).first().waitFor({ timeout: 15_000 });
      await app.idle(600);
    },
    /** A sidebar screen by its dictionary key (tab_logistics, tab_approvals, …); a badge after the name is allowed. */
    async nav(key) { await page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t(key))}`, 'i') }).first().click(); await app.idle(); },
    async lang(want) {
      const cur = await page.evaluate(() => document.documentElement.lang || 'en');
      if (cur.startsWith(want)) return;
      await page.getByRole('button', { name: want === 'he' ? /^HE$/ : /^EN$/ }).first().click();
      await page.waitForFunction((w) => (document.documentElement.lang || 'en').startsWith(w), want, { timeout: 10_000 });
      await app.idle();
    },
    /** One of the app's themes by its key (office · light · dark · army · medical), pressed by its own label. */
    async theme(key) {
      // My Gear (the staff page) has no theme switch — a theme is the app's alone
      if (!page.url().startsWith(APP)) return;
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) === key) return;
      await page.getByRole('button', { name: await app.t(`theme_${key}`), exact: true }).first().click();
      await page.waitForFunction((k) => document.documentElement.dataset.theme === k, key, { timeout: 10_000 });
      await app.idle(300);
    },
    /** Hide what should never be in a picture: toasts and the floating rights badge (PermissionFooter's fixed corner button). */
    async tidy() {
      await page.addStyleTag({ content: '[role="status"][aria-live], .toast, [data-toast], .fixed.z-50.bottom-6{display:none!important}' }).catch(() => {});
    },
  };
  return app;
}

/** One language's run in its own window: open it, picture every shot, leave the app as found, close the window. */
async function captureLanguage(lang, words, index) {
  const win = WINDOWS[lang];
  await ensureChrome(win);
  const browser = await chromium.connectOverCDP(win.cdp);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  // the size first, then the pixel density (setting the size alone resets the density to 1)
  await page.setViewportSize({ width: VIEW.width, height: VIEW.height });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.deviceScaleFactor, mobile: false });
  await page.goto(APP, { waitUntil: 'networkidle' });
  // the session restores a moment after the first paint — wait for the app's own sidebar (in either language) before judging
  const settings = new RegExp(`^(${escapeRe(words.en.tab_settings)}|${escapeRe(words.he.tab_settings)})$`, 'i');
  const signedIn = await page.getByRole('button', { name: settings }).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
  if (!signedIn) throw new Error(`capture: the ${lang} capture Chrome is not signed in — the Director signs that language's demo account in once in its window, then run again`);
  const bundle = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => /\/assets\/index-/.test(s))?.split('/').pop() ?? '');
  const app = helpers(page, words);
  // the app remembers its language and theme on this device — the run leaves both as it found them
  const startLang = (await page.evaluate(() => document.documentElement.lang || 'en')).startsWith('he') ? 'he' : 'en';
  const startTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? 'office');
  try {
    await app.lang(lang);
    for (const shot of SHOTS) {
      if (only && !only.has(shot.id)) continue;
      await picture(shot);
    }
    await app.lang(startLang);
    await app.theme(startTheme);
  } catch (failure) {
    // a shot failed: the member's own language and theme are still put back as found (they are saved on the member's
    // account — a run that died midway once left the Hebrew demo on the capture's theme), whatever window the shot left open
    await page.goto(APP, { waitUntil: 'networkidle' }).catch(() => {});
    await app.lang(startLang).catch(() => {});
    await app.theme(startTheme).catch(() => {});
    throw failure;
  } finally {
    // a shot that fails leaves no window behind either: the page and the capture Chrome close whatever happened (the
    // Director's pick "A · Close window between runs"); the demo sign-in stays saved in its own profile on this PC
    await page.close().catch(() => {});
    await (await browser.newBrowserCDPSession()).send('Browser.close').catch(() => {});
  }
  return bundle;

  async function picture(shot) {
    await app.theme(shot.theme ?? BASE_THEME);
    await shot.run(app, lang);
    await app.tidy();
    // what a shot names in `leaveOut` is taken out of the screen for the picture (its place closes up) and put back after it:
    // a row that would show a real person's data where an empty gap would mislead
    const left = [];
    for (const locator of shot.leaveOut ? await shot.leaveOut(app, lang) : []) left.push(...await locator.elementHandles());
    for (const el of left) await el.evaluate((n) => { n.dataset.captureShown = n.style.display; n.style.display = 'none'; });
    await app.idle(shot.settle ?? 800);
    // Chrome's own screenshot honours the 2× density set above (a connected browser's Playwright screenshot does not)
    const box = shot.clip ? await shot.clip(app) : shot.target ? await page.locator(shot.target).first().boundingBox() : null;
    // what a guide step points at: each mark's box in the picture's own CSS pixels, with its number (the site draws the
    // outline over it); an entry that is a list is ONE numbered thing seen in several places (every "No code" mark on screen),
    // and { at, badge: 'end' } puts its number on the side that hides nothing the reader needs
    const marks = [];
    for (const [i, entry] of (shot.marks ? await shot.marks(app, lang) : []).entries()) {
      // (told apart by `badge` / `around`: a list has its own .at, a locator has neither); { around: [...] } is ONE outline
      // drawn around several things that stand together
      const { at, around, badge = shot.badge } = !Array.isArray(entry) && (entry?.badge || entry?.around) ? entry : { at: entry };
      const places = around ?? (Array.isArray(at) ? at : [at]);
      if (places.length === 0) throw new Error(`capture: ${shot.id} (${lang}) — mark ${i + 1} found nothing on the screen`);
      const boxes = [];
      for (const locator of places) {
        if (!(await locator.boundingBox())) throw new Error(`capture: ${shot.id} (${lang}) — mark ${i + 1} is not on the screen`);
        boxes.push(await locator.evaluate(boxWithLabel));
      }
      const one = (list) => {
        const x = Math.min(...list.map((m) => m.x));
        const y = Math.min(...list.map((m) => m.y));
        return { x, y, width: Math.max(...list.map((m) => m.x + m.width)) - x, height: Math.max(...list.map((m) => m.y + m.height)) - y };
      };
      for (const m of around ? [one(boxes)] : boxes) {
        marks.push({ n: i + 1, x: Math.round(m.x - (box?.x ?? 0)), y: Math.round(m.y - (box?.y ?? 0)), w: Math.round(m.width), h: Math.round(m.height), ...(badge ? { badge } : {}) });
      }
    }
    await page.evaluate(installProbe);
    // an outline never lies over a neighbour: each mark keeps the margin its sides have room for
    const rooms = await page.evaluate(roomAround, { boxes: marks.map((m) => ({ x: m.x + (box?.x ?? 0), y: m.y + (box?.y ?? 0), w: m.w, h: m.h })), pad: MARK.pad });
    marks.forEach((m, k) => { if (rooms[k].some((side) => side < MARK.pad)) m.pad = rooms[k]; });
    const frame = { w: Math.round(box?.width ?? VIEW.width), h: Math.round(box?.height ?? VIEW.height) };
    // PRIVACY (the Director's law: a picture never shows a real person's address — the demo accounts are real sign-ins):
    // what a shot names in `hide` is invisible for the picture and put back right after it; then the picture's area is read
    // for any e-mail address outside the reserved test domains and the site's own public mailboxes — one found refuses the shot
    const hidden = [];
    for (const locator of shot.hide ? await shot.hide(app, lang) : []) hidden.push(...await locator.elementHandles());
    for (const el of hidden) await el.evaluate((n) => { n.dataset.captureWas = n.style.visibility; n.style.visibility = 'hidden'; });
    const shown = await page.evaluate(addressesShown, { box: box ?? { x: 0, y: 0, width: VIEW.width, height: VIEW.height }, open: PUBLIC_ADDRESSES });
    // where each number sits: the side its shot named (or the default for its size) when nothing a reader needs lies there —
    // no button, field, icon or text, no other mark's target, no number already placed; otherwise the side that costs least.
    // One number that stands in several places takes the same side in all of them.
    const numbers = [];
    for (const n of [...new Set(marks.map((m) => m.n))]) {
      const places = marks.filter((m) => m.n === n);
      const outline = (m) => { const [t, r, b, l] = m.pad ?? [MARK.pad, MARK.pad, MARK.pad, MARK.pad]; return { x: m.x - l, y: m.y - t, w: m.w + l + r, h: m.h + t + b }; };
      const first = outline(places[0]);
      const wish = [...new Set([places[0].badge, first.w < 3 * MARK.number || first.h <= MARK.number ? 'start' : 'corner', ...SIDES].filter(Boolean))];
      const at = (m, side) => { const [x, y] = badgeAt({ ...outline(m), badge: side }, lang, frame.w, frame.h, MARK.number); return { side, x, y, w: MARK.number, h: MARK.number }; };
      const cost = [];
      for (const side of wish) {
        const spots = places.map((m) => at(m, side));
        const lost = await page.evaluate(placesCost, { places: spots.map((a, k) => ({ ...a, x: a.x + (box?.x ?? 0), y: a.y + (box?.y ?? 0), own: { x: places[k].x + (box?.x ?? 0), y: places[k].y + (box?.y ?? 0), w: places[k].w, h: places[k].h } })) });
        // a number over another mark's target or over a number is the worst place of all
        const clash = spots.filter((a, k) => marks.some((other) => other !== places[k] && liesOver(a, other)) || numbers.some((placed) => liesOver(a, placed))).length;
        cost.push(lost.reduce((sum, c) => sum + c, 0) + 1000 * clash);
      }
      const side = wish[cost.indexOf(Math.min(...cost))];
      for (const m of places) { numbers.push(at(m, side)); m.badge = side; }
    }
    const shotArgs = { format: 'png', ...(box ? { clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 } } : {}) };
    const png = shown.length ? null : Buffer.from((await cdp.send('Page.captureScreenshot', shotArgs)).data, 'base64');
    for (const el of hidden) await el.evaluate((n) => { n.style.visibility = n.dataset.captureWas ?? ''; delete n.dataset.captureWas; });
    for (const el of left) await el.evaluate((n) => { n.style.display = n.dataset.captureShown ?? ''; delete n.dataset.captureShown; }).catch(() => {});
    if (!png) {
      if (shot.after) await shot.after(app, lang).catch(() => {});
      // the address itself is never printed — only where it sits
      throw new Error(`capture: ${shot.id} (${lang}) — the picture would show ${shown.length} e-mail or network address(es) (in: ${shown.join(' · ')}); name the element in the shot's \`hide\` or \`leaveOut\`, or clip it out`);
    }
    const file = `${shot.id}.${lang}.webp`;
    writeFileSync(join(OUT, file), (await encodeWebp(page, png, { quality: WEBP_QUALITY })).data);
    // the smaller copy the site's frames load first (scripts/lib/shots.mjs: 1600w, then the full 2× picture)
    writeFileSync(join(OUT, file.replace(/\.webp$/, '.1600.webp')), (await encodeWebp(page, png, { quality: WEBP_QUALITY, width: 1600 })).data);
    index.set(`${shot.id}.${lang}`, { id: shot.id, lang, file, alt: shot.alt?.[lang] ?? '', theme: shot.theme ?? BASE_THEME, app: bundle, ...(marks.length ? { frame, marks } : {}) });
    console.log(`capture: ${file}`);
    if (shot.after) await shot.after(app, lang);
  }
}

async function main() {
  if (!(await reachable(APP))) throw new Error(`capture: the app preview is not running at ${APP} — start it in the GearLogs repo: npx vite preview --port 4174 --strictPort --host 127.0.0.1`);
  mkdirSync(OUT, { recursive: true });
  const words = await appWords();
  // a partial run (--only / --lang) keeps every other picture's entry in the index
  const manifestFile = join(OUT, 'manifest.json');
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')).shots ?? [] : [];
  const index = new Map(previous.map((e) => [`${e.id}.${e.lang}`, e]));
  const bundles = [];
  // the index the pages read (no dates — the public site never carries one; each entry names the app version it pictures);
  // written even when a shot fails, so the pictures already taken in that run keep their entries
  try {
    for (const lang of langs) bundles.push(await captureLanguage(lang, words, index));
  } finally {
    writeFileSync(manifestFile, JSON.stringify({ view: VIEW, shots: [...index.values()] }, null, 2) + '\n');
  }
  console.log(`capture: OK — ${[...index.values()].filter((e) => langs.includes(e.lang)).length} picture(s) from ${[...new Set(bundles)].join(', ') || 'the app'}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
