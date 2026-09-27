#!/usr/bin/env node
// The photo pipeline (Stage 2, 2026-09-27): the AI photo originals in assets/photos/ (never deployed; provenance in
// assets/photos/PROVENANCE.md) become the served WebP files in public/img/photos/, with an index the build reads
// (manifest.json: every file's width and height, so no picture shifts the layout while it loads).
//
//   npm run photos                    every photo
//   npm run photos -- --only=faq,legal
//
// The inner-page photo band (the Director's pick F3 · C) shows a wide strip of its photo, so each one is cut to a 3:1
// strip around its subject (`y`: where the strip sits, 0 = the top of the photo, 1 = the bottom) and written in three
// widths. The band's veil darkens most of the strip, so the quality can stay modest. Uses the Chrome installed on this
// PC (CHROME to override) and the one shared encoder (scripts/images/encode.mjs).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWebp } from './encode.mjs';

const SRC = join(process.cwd(), 'assets', 'photos');
const OUT = join(process.cwd(), 'public', 'img', 'photos');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** The photo bands: the source file, its pixel size and where the 3:1 strip sits. */
const BANDS = {
  product: { file: 'product.jpg', size: [2752, 1536], y: 0.45 },
  pricing: { file: 'pricing.jpg', size: [2752, 1536], y: 0.37 },
  help: { file: 'help.jpg', size: [2752, 1536], y: 0.27 },
  faq: { file: 'faq.jpg', size: [2752, 1536], y: 0.33 },
  changelog: { file: 'changelog.jpg', size: [2752, 1536], y: 0.56 },
  contact: { file: 'contact.jpg', size: [2752, 1536], y: 0.4 },
  // the strip stays above the open binder, so the form's date-like pseudo-writing is never served (no dates on the site)
  legal: { file: 'legal.jpg', size: [2752, 1536], y: 0.08 },
  // the sign-out sheet's scribbles look like dates, so they are blurred in the served copy (the original stays untouched)
  paper: { file: 'paper.jpg', size: [2400, 1792], y: 0.35, soften: [{ x: 440, y: 380, w: 1300, h: 900, px: 7, feather: 70 }] },
};
const BAND_RATIO = 3;
const BAND_WIDTHS = [1440, 2160];
const QUALITY = 0.72;

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',')) : null;

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
for (const [name, band] of Object.entries(BANDS)) {
  if (only && !only.has(name)) continue;
  const buffer = readFileSync(join(SRC, band.file));
  const [w, h] = band.size;
  const cropH = Math.round(w / BAND_RATIO);
  const crop = { x: 0, y: Math.round((h - cropH) * band.y), w, h: cropH };
  const files = [];
  for (const width of [...BAND_WIDTHS, w]) {
    const out = await encodeWebp(page, buffer, { mime: 'image/jpeg', quality: QUALITY, width, crop, soften: band.soften });
    const file = `${name}-band.${out.width}.webp`;
    writeFileSync(join(OUT, file), out.data);
    files.push({ file, width: out.width, height: out.height, bytes: out.data.length });
    console.log(`photos: ${file}  ${(out.data.length / 1024).toFixed(0)} kB`);
  }
  manifest[`${name}-band`] = { source: band.file, files };
}
await browser.close();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`photos: manifest written (${Object.keys(manifest).length} entries)`);
