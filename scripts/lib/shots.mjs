// The product pictures (Stage 2 PR-3 — the Director's rule that every product picture is the REAL app, S2-02): a body writes
//   <gl-shot id="board"></gl-shot>   ·   <gl-shot id="approvals" inset="mygear"></gl-shot>
// and the build expands it here into the ONE frame markup from public/img/app/manifest.json (written by `npm run capture`):
// the picture in the page's own language, its alt text in that language, two widths with their sizes (no layout shift),
// lazy loading, a link that opens the full-size picture (the lightbox takes it over when scripts run — F2 · A), and the
// caption "Real screen · sample workspace". Pure module: the caller passes the manifest and the picture sizes.
// The build refuses an unknown id, a picture missing in the page's language, and any leftover or malformed <gl-shot>;
// refusing an app picture that did not come from a <gl-shot> is `strayAppImages` below.

const SHOT = /<gl-shot\s+id="([a-z0-9-]+)"(?:\s+inset="([a-z0-9-]+)")?\s*><\/gl-shot>/g;

/** Text for an HTML attribute (an alt that quotes a label, "Expiring", must not cut the attribute short). */
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The words a frame carries, per language. */
export const SHOT_WORDS = {
  en: { caption: 'Real screen &middot; sample workspace', open: 'Open the full-size picture' },
  he: { caption: 'מסך אמיתי &middot; סביבת עבודה לדוגמה', open: 'פתיחת התמונה בגודל מלא' },
};

/**
 * Expand every <gl-shot> in a body.
 * @param {string} body
 * @param {string} lang 'en' | 'he'
 * @param {{ shots: Array<{ id: string, lang: string, file: string, alt: string }> }} manifest
 * @param {(file: string) => { width: number, height: number }} sizeOf the pixel size of a file under /img/app/
 * @param {string} where the page, for error messages
 */
export function expandShots(body, lang, manifest, sizeOf, where) {
  const find = (id) => {
    const shot = manifest.shots.find((s) => s.id === id && s.lang === lang);
    if (!shot) throw new Error(`shots: ${where} names "${id}", which has no ${lang} picture in public/img/app/manifest.json (run npm run capture)`);
    if (!shot.alt) throw new Error(`shots: ${where} — "${id}" has no ${lang} alt text in the manifest`);
    return shot;
  };
  const img = (shot, cls) => {
    const full = sizeOf(shot.file);
    const small = shot.file.replace(/\.webp$/, '.1600.webp');
    const h = Math.round((full.height * 1600) / full.width);
    return `<img class="${cls}" src="/img/app/${small}" srcset="/img/app/${small} 1600w, /img/app/${shot.file} ${full.width}w" sizes="(min-width: 1240px) 820px, 66vw" width="1600" height="${h}" alt="${attr(shot.alt)}" loading="lazy" decoding="async">`;
  };
  const html = body.replace(SHOT, (_, id, insetId) => {
    const shot = find(id);
    const W = SHOT_WORDS[lang];
    // the inset opens full size too (the same viewer), so its small picture can be read
    const insetShot = insetId ? find(insetId) : null;
    const inset = insetShot
      ? `\n        <a class="frame-inset" href="/img/app/${insetShot.file}" data-lightbox aria-label="${W.open}: ${attr(insetShot.alt)}">${img(insetShot, 'frame-img')}</a>`
      : '';
    return (
      `<figure class="frame${insetId ? ' has-inset' : ''}">\n` +
      `        <a class="frame-open" href="/img/app/${shot.file}" data-lightbox aria-label="${W.open}: ${attr(shot.alt)}">\n` +
      `          <span class="frame-strip" aria-hidden="true"><b>app.gearlogs.com</b></span>\n` +
      `          ${img(shot, 'frame-img')}\n` +
      `        </a>${inset}\n` +
      `        <figcaption class="frame-cap">${W.caption}</figcaption>\n` +
      `      </figure>`
    );
  });
  if (/<gl-shot\b/.test(html)) throw new Error(`shots: ${where} has a <gl-shot> the build cannot read (id="…" first, then inset="…", empty element)`);
  return html;
}

/** Every /img/app/ picture in a finished page that is not inside a frame the build made — the build refuses these. */
export function strayAppImages(html) {
  const outside = html.replace(/<figure class="frame[\s\S]*?<\/figure>/g, '');
  return [...outside.matchAll(/(?:src|srcset|href)="(\/img\/app\/[^"\s,]+)/g)].map((m) => m[1]);
}

/** The pixel size of a WebP file (VP8X, VP8 or VP8L header) — no image library needed. */
export function webpSize(buffer) {
  const kind = buffer.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (kind === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') {
    const b = buffer.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`webpSize: not a WebP file (${kind})`);
}
