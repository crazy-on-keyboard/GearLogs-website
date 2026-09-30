#!/usr/bin/env node
// The brand pictures (2026-09-30): the GearLogs mark is the VECTOR from the logo kit (RAQIOM repo, design/brand/logos/ —
// the Director's picks: the vector logos on both product websites and both apps, and on this site the mark beside the
// wordmark in the header). The vectors are served as they are (public/favicon.svg, public/img/logo-mark.svg); this script
// renders the two pictures that must stay raster, inside Chrome through a canvas, like the site's other image tooling:
//
//   public/img/logo-mark.png — the search engines' logo (Organization JSON-LD; they want a raster at least 112 px)
//   public/img/og-card.png   — the link card: its old metallic mark is painted over with the card's own grid paper (the
//                              same 60 px grid, copied from an empty spot ten squares to the right) and the vector mark is
//                              drawn into the same box. Everything else on the card stays as it was. Safe to run again.
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

const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage();
  const out = await page.evaluate(
    async ({ mark, card, box, patch, logoWidth }) => {
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

      return {
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
    },
  );
  writeFileSync(join(PUBLIC, 'img', 'logo-mark.png'), Buffer.from(out.logo, 'base64'));
  writeFileSync(CARD, Buffer.from(out.card, 'base64'));
  console.log(`brand: img/logo-mark.png ${out.logoSize.join('x')} and img/og-card.png written`);
} finally {
  await browser.close();
}
