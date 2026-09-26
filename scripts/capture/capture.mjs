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
// The shots themselves live in ./shots.mjs; the pictures land in public/img/app/<id>.<lang>.webp with an index (manifest.json).
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import SHOTS from './shots.mjs';

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

/** PNG → WebP inside the browser itself (no image library to install). */
async function toWebp(page, png) {
  const b64 = await page.evaluate(async ({ data, q }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, { data: png.toString('base64'), q: WEBP_QUALITY });
  return Buffer.from(b64, 'base64');
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
  await app.lang(lang);
  for (const shot of SHOTS) {
    if (only && !only.has(shot.id)) continue;
    await app.theme(shot.theme ?? BASE_THEME);
    await shot.run(app, lang);
    await app.tidy();
    await app.idle(shot.settle ?? 800);
    // Chrome's own screenshot honours the 2× density set above (a connected browser's Playwright screenshot does not)
    const box = shot.target ? await page.locator(shot.target).first().boundingBox() : null;
    const shotArgs = { format: 'png', ...(box ? { clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 } } : {}) };
    const png = Buffer.from((await cdp.send('Page.captureScreenshot', shotArgs)).data, 'base64');
    const file = `${shot.id}.${lang}.webp`;
    writeFileSync(join(OUT, file), await toWebp(page, png));
    index.set(`${shot.id}.${lang}`, { id: shot.id, lang, file, alt: shot.alt?.[lang] ?? '', theme: shot.theme ?? BASE_THEME, app: bundle });
    console.log(`capture: ${file}`);
    if (shot.after) await shot.after(app, lang);
  }
  await app.lang(startLang);
  await app.theme(startTheme);
  await page.close();
  // the Director's pick "A · Close window between runs": each capture Chrome closes when its run ends (its local control port
  // with it); the demo sign-in stays saved in its own profile on this PC, so the next run needs nothing from him
  await (await browser.newBrowserCDPSession()).send('Browser.close').catch(() => {});
  return bundle;
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
  for (const lang of langs) bundles.push(await captureLanguage(lang, words, index));
  // the index the pages read (no dates — the public site never carries one; each entry names the app version it pictures)
  writeFileSync(manifestFile, JSON.stringify({ view: VIEW, shots: [...index.values()] }, null, 2) + '\n');
  console.log(`capture: OK — ${[...index.values()].filter((e) => langs.includes(e.lang)).length} picture(s) from ${[...new Set(bundles)].join(', ') || 'the app'}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
