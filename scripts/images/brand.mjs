#!/usr/bin/env node
// The brand pictures (2026-09-30): the GearLogs mark is the VECTOR from the logo kit (RAQIOM repo, design/brand/logos/ —
// the Director's picks: the vector logos on both product websites and both apps, and on this site the mark beside the
// wordmark in the header). The vectors are served as they are (public/favicon.svg, public/img/logo-mark.svg); this script
// renders the two pictures that must stay raster, inside Chrome through a canvas, like the site's other image tooling:
//
//   public/img/logo-mark.png — the search engines' logo (Organization JSON-LD; they want a raster at least 112 px). A live
//                              app workspace also points its app and sign-in logo URLs at this file: changing it changes
//                              that workspace's sidebar and sign-in too.
//   public/img/og-card.png   — the link card: its old metallic mark is painted over with the card's own grid paper (the
//                              same 60 px grid, copied from an empty spot ten squares to the right) and the vector mark is
//                              drawn into the same box. Everything else on the card stays as it was. Safe to run again.
//   public/favicon-48.png, favicon-192.png, apple-touch-icon.png (180, on white) and favicon.ico (the 48 px PNG in an ICO
//                              wrapper) — the search engines' site icon (SEO-1 · AC-902, 2026-10-02: Google's "Favicon in
//                              Search" lists BMP · GIF · ICO · PNG · JPEG · PPM · TIFF, not SVG; Bing asks /favicon.ico first).
//                              Browsers keep the SVG; every raster is the same mark, fitted in a square.
//
//   npm run brand
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MARK = readFileSync(join(PUBLIC, 'img', 'logo-mark.svg')).toString('base64');
const CARD = join(PUBLIC, 'img', 'og-card.png');

/** The mark's box on the card (its ink, measured on the card), and the empty grid it is painted over with. */
const CARD_MARK = { x: 243, y: 98, w: 91, h: 85 };
const CARD_PATCH = { margin: 8, shift: 600 };
const LOGO_WIDTH = 276;
/** The square icons: size → the ground behind the mark (null = transparent). */
const ICONS = { 48: null, 192: null, 180: '#ffffff' };

/** An ICO file holding one PNG image (the ICO container allows PNG data since Vista; every engine and browser reads it). */
function icoAround(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);   // reserved · type 1 = icon · one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); entry.writeUInt8(size === 256 ? 0 : size, 1);   // width · height (0 = 256)
  entry.writeUInt8(0, 2); entry.writeUInt8(0, 3);                                            // palette · reserved
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);                                    // colour planes · bits per pixel
  entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(6 + 16, 12);                     // bytes · offset of the image
  return Buffer.concat([header, entry, png]);
}

const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage();
  const out = await page.evaluate(
    async ({ mark, card, box, patch, logoWidth, iconSizes }) => {
      const load = async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img;
      };
      const svg = await load(`data:image/svg+xml;base64,${mark}`);
      const ratio = svg.naturalWidth / svg.naturalHeight;

      const logo = document.createElement('canvas');
      logo.width = logoWidth;
      logo.height = Math.round(logoWidth / ratio);
      logo.getContext('2d').drawImage(svg, 0, 0, logo.width, logo.height);

      const base = await load(`data:image/png;base64,${card}`);
      const c = document.createElement('canvas');
      c.width = base.naturalWidth;
      c.height = base.naturalHeight;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(base, 0, 0);
      const m = patch.margin;
      const area = { x: box.x - m, y: box.y - m, w: box.w + 2 * m, h: box.h + 2 * m };
      g.drawImage(base, area.x + patch.shift, area.y, area.w, area.h, area.x, area.y, area.w, area.h);
      // the vector, fitted into the old mark's box without stretching, centred in it
      const h = Math.min(box.h, box.w / ratio);
      const w = h * ratio;
      g.drawImage(svg, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);

      // the square icons: the mark fitted inside the square with a 1/12 margin, centred
      const icons = {};
      for (const [size, ground] of Object.entries(iconSizes)) {
        const n = Number(size);
        const ic = document.createElement('canvas');
        ic.width = n; ic.height = n;
        const ig = ic.getContext('2d');
        ig.imageSmoothingQuality = 'high';
        if (ground) { ig.fillStyle = ground; ig.fillRect(0, 0, n, n); }
        const inner = n - 2 * Math.round(n / 12);
        const ih = Math.min(inner, inner / ratio);
        const iw = ih * ratio;
        ig.drawImage(svg, (n - iw) / 2, (n - ih) / 2, iw, ih);
        icons[size] = ic.toDataURL('image/png').split(',')[1];
      }
      return {
        icons,
        logo: logo.toDataURL('image/png').split(',')[1],
        logoSize: [logo.width, logo.height],
        card: c.toDataURL('image/png').split(',')[1],
      };
    },
    {
      mark: MARK,
      card: readFileSync(CARD).toString('base64'),
      box: CARD_MARK,
      patch: CARD_PATCH,
      logoWidth: LOGO_WIDTH,
      iconSizes: ICONS,
    },
  );
  writeFileSync(join(PUBLIC, 'img', 'logo-mark.png'), Buffer.from(out.logo, 'base64'));
  writeFileSync(CARD, Buffer.from(out.card, 'base64'));
  const icon48 = Buffer.from(out.icons[48], 'base64');
  writeFileSync(join(PUBLIC, 'favicon-48.png'), icon48);
  writeFileSync(join(PUBLIC, 'favicon-192.png'), Buffer.from(out.icons[192], 'base64'));
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), Buffer.from(out.icons[180], 'base64'));
  writeFileSync(join(PUBLIC, 'favicon.ico'), icoAround(icon48, 48));
  console.log(`brand: img/logo-mark.png ${out.logoSize.join('x')}, img/og-card.png, favicon-48/192.png, apple-touch-icon.png and favicon.ico written`);
} finally {
  await browser.close();
}
