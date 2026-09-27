#!/usr/bin/env node
// The photo pipeline (Stage 2, 2026-09-27): the AI photo originals in assets/photos/ (never deployed; provenance in
// assets/photos/PROVENANCE.md) become the served WebP files in public/img/photos/, with an index the build reads
// (manifest.json: every file's width and height, so no picture shifts the layout while it loads).
//
//   npm run photos                    every photo
//   npm run photos -- --only=faq-band,hero-band
//
// ONE table below drives every served photo: its source, the shape it is cut to (`ratio` = width / height; none = the whole
// frame), where the cut sits (`x`, `y`: 0 = the left / top of the photo, 1 = the right / bottom), the widths written and the
// quality. The inner-page bands are 3:1 strips (the Director's pick F3 · C) under a heavy veil, so their quality stays modest.
// Uses the Chrome installed on this PC (CHROME to override) and the one shared encoder (scripts/images/encode.mjs).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWebp } from './encode.mjs';

const SRC = join(process.cwd(), 'assets', 'photos');
const OUT = join(process.cwd(), 'public', 'img', 'photos');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const WIDE = [2752, 1536];
const FOUR_THREE = [2400, 1792];
const band = (file, size, y, extra = {}) => ({ file, size, ratio: 3, x: 0.5, y, widths: [1440, 2160, size[0]], quality: 0.72, ...extra });
/** paper.jpg's sign-out sheet carries date-like scribbles: blurred in every served copy (the original stays untouched). */
const PAPER_SOFTEN = [{ x: 440, y: 380, w: 1300, h: 900, px: 7, feather: 70 }];

/** Every served photo: the manifest key → how it is made. */
const PHOTOS = {
  // the inner-page bands (<gl-band photo="…">)
  'product-band': band('product.jpg', WIDE, 0.45),
  'pricing-band': band('pricing.jpg', WIDE, 0.37),
  'help-band': band('help.jpg', WIDE, 0.27),
  'faq-band': band('faq.jpg', WIDE, 0.33),
  'changelog-band': band('changelog.jpg', WIDE, 0.56),
  'contact-band': band('contact.jpg', WIDE, 0.4),
  // the strip stays above the open binder, so the form's date-like pseudo-writing is never served (no dates on the site)
  'legal-band': band('legal.jpg', WIDE, 0.08),
  'paper-band': band('paper.jpg', FOUR_THREE, 0.35, { soften: PAPER_SOFTEN }),
  // the home's hero (<gl-band photo="hero" variant="hero">): the whole frame, the headline over its empty left third
  'hero-band': { file: 'hero.jpg', size: WIDE, ratio: null, x: 0.5, y: 0.5, widths: [1440, 2160, 2752], quality: 0.78 },
  // the home's sector tiles (<gl-photo>): two wide, three tall — each cut keeps its handover in frame
  army: { file: 'army.jpg', size: WIDE, ratio: 1.6, x: 0.5, y: 0.5, widths: [800, 1400], quality: 0.78 },
  hospital: { file: 'hospital.jpg', size: WIDE, ratio: 1.6, x: 0.5, y: 0.5, widths: [800, 1400], quality: 0.78 },
  emergency: { file: 'emergency.jpg', size: WIDE, ratio: 0.8, x: 0.54, y: 0.5, widths: [600, 1000], quality: 0.78 },
  depot: { file: 'depot.jpg', size: WIDE, ratio: 0.8, x: 0.57, y: 0.5, widths: [600, 1000], quality: 0.78 },
  office: { file: 'office.jpg', size: WIDE, ratio: 0.8, x: 0.45, y: 0.5, widths: [600, 1000], quality: 0.78 },
  // the home's section photos: the problem, the repair and consumables pair, the security handover
  paper: { file: 'paper.jpg', size: FOUR_THREE, ratio: null, x: 0.5, y: 0.5, widths: [800, 1400], quality: 0.78, soften: PAPER_SOFTEN },
  repair: { file: 'repair.jpg', size: FOUR_THREE, ratio: null, x: 0.5, y: 0.5, widths: [800, 1400], quality: 0.78 },
  consumables: { file: 'consumables.jpg', size: FOUR_THREE, ratio: null, x: 0.5, y: 0.5, widths: [800, 1400], quality: 0.78 },
  handover: { file: 'handover.jpg', size: FOUR_THREE, ratio: 0.8, x: 0.5, y: 0.5, widths: [600, 1000], quality: 0.78 },
};

/** The source rectangle for a photo's cut. */
function cropOf({ size: [w, h], ratio, x, y }) {
  if (!ratio) return { x: 0, y: 0, w, h };
  if (ratio > w / h) { const ch = Math.round(w / ratio); return { x: 0, y: Math.round((h - ch) * y), w, h: ch }; }
  const cw = Math.round(h * ratio);
  return { x: Math.round((w - cw) * x), y: 0, w: cw, h };
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',')) : null;

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
for (const [key, photo] of Object.entries(PHOTOS)) {
  if (only && !only.has(key)) continue;
  const buffer = readFileSync(join(SRC, photo.file));
  const crop = cropOf(photo);
  const files = [];
  for (const width of photo.widths) {
    const out = await encodeWebp(page, buffer, { mime: 'image/jpeg', quality: photo.quality, width: Math.min(width, crop.w), crop, soften: photo.soften });
    const file = `${key}.${out.width}.webp`;
    writeFileSync(join(OUT, file), out.data);
    files.push({ file, width: out.width, height: out.height, bytes: out.data.length });
    console.log(`photos: ${file}  ${(out.data.length / 1024).toFixed(0)} kB`);
  }
  manifest[key] = { source: photo.file, files };
}
await browser.close();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`photos: manifest written (${Object.keys(manifest).length} entries)`);
