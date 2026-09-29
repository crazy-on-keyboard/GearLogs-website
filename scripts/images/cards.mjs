#!/usr/bin/env node
// The guides index's pictures (WEB-2 · INDEX): every guide's first screen, cut close around the main thing its first step
// points at (the rule lives in scripts/lib/guide-cards.mjs, beside the markup it serves), in both languages, in the form
// the index asks for — a card on the "Start here" row, a small picture on a subject's row — and two widths each.
//
//   npm run cards                          every guide named on the index (pictures nobody names any more are removed)
//   npm run cards -- --only=set-up-board,dashboard
//
// Reads the index bodies for the guides they name, each guide's page for its first screen, and the full 2x app pictures in
// public/img/app/ (written by `npm run capture`); writes public/img/app/cards/<slug>.<lang>.<form>.<width>.webp and an index
// of what each picture was cut from (manifest.json: the screen, its md5 and the window), so the build can refuse one that
// is older than its screen. Run it after every capture that re-takes a guide's first screen — the build says when.
// Uses the Chrome installed on this PC (CHROME to override) and the one shared encoder (scripts/images/encode.mjs).
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWebp } from './encode.mjs';
import { CARD_FOCUS, FORMS, cardKey, cardWindow, formOf, guideFacts } from '../lib/guide-cards.mjs';
import { webpSize } from '../lib/shots.mjs';

const ROOT = process.cwd();
const BODIES = join(ROOT, 'src', 'bodies');
const APP = join(ROOT, 'public', 'img', 'app');
const OUT = join(APP, 'cards');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LANGS = ['en', 'he'];
/** The 2x file stays light (the page shows thirty of them); the 1x file is drawn at its own size. */
const QUALITY = [0.8, 0.72];

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',')) : null;

/** Every picture the index asks for in a language: the guide, the form, and its first screen (from its page, or from the
 *  tag while the page waits). */
function asked(lang) {
  const index = readFileSync(join(BODIES, `guides.${lang}.html`), 'utf8');
  const named = new Map();
  for (const [, slug, attrs] of index.matchAll(/<gl-guide\s+slug="([a-z0-9-]+)"([^>]*)>/g)) {
    const page = join(BODIES, 'guides', `${slug}.${lang}.html`);
    const shot = existsSync(page) ? guideFacts(readFileSync(page, 'utf8'), `${lang}:guides/${slug}`).shot : attrs.match(/\sshot="([a-z0-9-]+)"/)?.[1];
    if (!shot) throw new Error(`cards: ${lang}:guides names "${slug}", which has no page and no shot of its own`);
    const form = formOf(attrs);
    named.set(cardKey(slug, lang, form), { slug, form, shot });
  }
  return named;
}

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
// a whole run writes the index anew; a run for a few guides keeps the others' entries
const manifest = only && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const shots = JSON.parse(readFileSync(join(APP, 'manifest.json'), 'utf8')).shots;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
let written = 0;
for (const lang of LANGS) {
  for (const [key, { slug, form, shot: id }] of asked(lang)) {
    if (only && !only.has(slug)) continue;
    const shot = shots.find((s) => s.id === id && s.lang === lang);
    if (!shot) throw new Error(`cards: "${slug}" opens with "${id}", which has no ${lang} picture (run npm run capture)`);
    const buffer = readFileSync(join(APP, shot.file));
    const window = cardWindow(shot, form, CARD_FOCUS[slug]);
    // the window is measured in the app's own pixels; the picture holds twice as many (a 2x capture)
    const k = webpSize(buffer).width / (shot.frame?.w ?? 1440);
    const crop = { x: Math.round(window.x * k), y: Math.round(window.y * k), w: Math.round(window.w * k), h: Math.round(window.h * k) };
    const files = [];
    for (const [i, width] of FORMS[form].widths.entries()) {
      const out = await encodeWebp(page, buffer, { mime: 'image/webp', quality: QUALITY[i], width, crop });
      const file = `${key}.${width}.webp`;
      writeFileSync(join(OUT, file), out.data);
      files.push({ file, width: out.width, height: out.height, bytes: out.data.length });
    }
    manifest[key] = { shot: id, source: { file: shot.file, md5: createHash('md5').update(buffer).digest('hex') }, window, files };
    written++;
    console.log(`cards: ${key}  ${id}  ${window.w}×${window.h} at ${window.x},${window.y}  ${files.map((f) => `${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`);
  }
}
await browser.close();

// a picture the index no longer names is never served
const kept = new Set(Object.values(manifest).flatMap((entry) => entry.files.map((f) => f.file)));
const removed = readdirSync(OUT).filter((name) => name.endsWith('.webp') && !kept.has(name));
for (const name of removed) rmSync(join(OUT, name));

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log(`cards: ${written} picture(s) written, ${removed.length} removed, the index holds ${Object.keys(sorted).length}`);
