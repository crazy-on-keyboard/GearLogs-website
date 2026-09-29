#!/usr/bin/env node
// The guides index's card pictures (WEB-2 · INDEX): every guide's first screen, cut close around the main thing its first
// step points at (the rule lives in scripts/lib/guide-cards.mjs, beside the card it serves), in both languages and two widths.
//
//   npm run cards                          every guide named on the index
//   npm run cards -- --only=set-up-board,dashboard
//
// Reads the index bodies for the guides they name, each guide's page for its first screen, and the full 2x app pictures in
// public/img/app/ (written by `npm run capture`); writes public/img/app/cards/<slug>.<lang>.<width>.webp and an index of
// what each card was cut from (manifest.json: the screen, its md5 and the window), so the build can refuse a card that is
// older than its screen. Run it after every capture that re-takes a guide's first screen — the build says when.
// Uses the Chrome installed on this PC (CHROME to override) and the one shared encoder (scripts/images/encode.mjs).
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWebp } from './encode.mjs';
import { CARD_FOCUS, CARD_WIDTHS, cardKey, cardWindow, guideFacts } from '../lib/guide-cards.mjs';
import { webpSize } from '../lib/shots.mjs';

const ROOT = process.cwd();
const BODIES = join(ROOT, 'src', 'bodies');
const APP = join(ROOT, 'public', 'img', 'app');
const OUT = join(APP, 'cards');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LANGS = ['en', 'he'];
/** The 2x file stays light (the page shows thirty of them); the small one is drawn at its own size. */
const QUALITY = { [CARD_WIDTHS[0]]: 0.8, [CARD_WIDTHS[1]]: 0.72 };

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',')) : null;

/** Every guide the index names in a language → its first screen (from its page, or from the tag while the page waits). */
function guidesOf(lang) {
  const index = readFileSync(join(BODIES, `guides.${lang}.html`), 'utf8');
  const named = new Map();
  for (const [, slug, attrs] of index.matchAll(/<gl-guide\s+slug="([a-z0-9-]+)"([^>]*)>/g)) {
    const page = join(BODIES, 'guides', `${slug}.${lang}.html`);
    const shot = existsSync(page) ? guideFacts(readFileSync(page, 'utf8'), `${lang}:guides/${slug}`).shot : attrs.match(/\sshot="([a-z0-9-]+)"/)?.[1];
    if (!shot) throw new Error(`cards: ${lang}:guides names "${slug}", which has no page and no shot of its own`);
    named.set(slug, shot);
  }
  return named;
}

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const shots = JSON.parse(readFileSync(join(APP, 'manifest.json'), 'utf8')).shots;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
let written = 0;
for (const lang of LANGS) {
  for (const [slug, id] of guidesOf(lang)) {
    if (only && !only.has(slug)) continue;
    const shot = shots.find((s) => s.id === id && s.lang === lang);
    if (!shot) throw new Error(`cards: "${slug}" opens with "${id}", which has no ${lang} picture (run npm run capture)`);
    const buffer = readFileSync(join(APP, shot.file));
    const window = cardWindow(shot, CARD_FOCUS[slug]);
    // the window is measured in the app's own pixels; the picture holds twice as many (a 2x capture)
    const k = webpSize(buffer).width / (shot.frame?.w ?? 1440);
    const crop = { x: Math.round(window.x * k), y: Math.round(window.y * k), w: Math.round(window.w * k), h: Math.round(window.h * k) };
    const files = [];
    for (const width of CARD_WIDTHS) {
      const out = await encodeWebp(page, buffer, { mime: 'image/webp', quality: QUALITY[width], width, crop });
      const file = `${cardKey(slug, lang)}.${width}.webp`;
      writeFileSync(join(OUT, file), out.data);
      files.push({ file, width: out.width, height: out.height, bytes: out.data.length });
    }
    manifest[cardKey(slug, lang)] = { shot: id, source: { file: shot.file, md5: createHash('md5').update(buffer).digest('hex') }, window, files };
    written++;
    console.log(`cards: ${cardKey(slug, lang)}  ${id}  ${window.w}×${window.h} at ${window.x},${window.y}  ${files.map((f) => `${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`);
  }
}
await browser.close();

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log(`cards: ${written} card(s) written, the index holds ${Object.keys(sorted).length}`);
