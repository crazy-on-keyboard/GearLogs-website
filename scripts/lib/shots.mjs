// The product pictures (Stage 2 PR-3 — the Director's rule that every product picture is the REAL app, S2-02): a body writes
//   <gl-shot id="board"></gl-shot>   ·   <gl-shot id="approvals" inset="mygear"></gl-shot>
//   <gl-shot id="approvals-open" caption="What the reader should notice"></gl-shot>   (a guide step's frame)
//   <gl-shot id="approvals-open" caption="…" marks></gl-shot>   (…with the numbered outlines the capture recorded)
// and the build expands it here into the ONE frame markup from public/img/app/manifest.json (written by `npm run capture`):
// the picture in the page's own language, its alt text in that language, two widths with their sizes (no layout shift),
// lazy loading, a link that opens the full-size picture (the lightbox takes it over when scripts run — F2 · A), and the
// caption: "Real screen · sample workspace", or on a guide step what the reader should notice (the reading spec: a caption
// says what changed, never "a screenshot of…"). Pure module: the caller passes the manifest and the picture sizes.
// The build refuses an unknown id, a picture missing in the page's language, and any leftover or malformed <gl-shot>;
// refusing an app picture that did not come from a <gl-shot> is `strayAppImages` below.

const SHOT = /<gl-shot\s+id="([a-z0-9-]+)"(?:\s+inset="([a-z0-9-]+)")?(?:\s+caption="([^"<>]+)")?(?:\s+(marks))?\s*><\/gl-shot>/g;

/**
 * The highlight a guide step draws over its screen (his pick "A · Spotlight + numbers", the outline pulsing): the rest of the
 * picture dims, each thing the step points at gets a GO outline, a square number equal to the step's own list number, and a
 * soft halo that grows outward and fades once (src/styles/frame.css; /js/motion.js starts it when the targets are first in
 * view — "B · One soft pulse"). Drawn from the boxes the capture recorded, in the picture's own pixels, so it follows every
 * re-capture and mirrors in Hebrew by itself. SVG attributes only — no inline style under the site's CSP.
 */
function marksLayer(shot, lang, maskId) {
  const { w, h } = shot.frame;
  // the approved board's measures, in the app's own pixels: 6 around each target, a 30 square number on its start corner
  const PAD = 6;
  const BADGE = 30;
  // one number may stand in several places (every "No code" mark on screen is the step's "2")
  const boxes = shot.marks.map((m, i) => ({ n: m.n ?? i + 1, badge: m.badge, x: m.x - PAD, y: m.y - PAD, w: m.w + 2 * PAD, h: m.h + 2 * PAD }));
  const rect = (b, cls) => `<rect class="${cls}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="none"/>`;
  const holes = boxes.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="#000"/>`).join('');
  const badges = boxes.map((b) => {
    const [x, y] = badgeAt(b, lang, w, h, BADGE);
    return `<rect class="marks-badge" x="${x}" y="${y}" width="${BADGE}" height="${BADGE}" rx="2"/><text class="marks-num" x="${x + BADGE / 2}" y="${y + BADGE / 2}" text-anchor="middle" dominant-baseline="central">${b.n}</text>`;
  }).join('');
  // the mask covers the whole picture (its default region hugs the masked shapes and would cut the pulse off above and below);
  // the outlines and numbers form one group, so the page can tell when the things the step points at are really in view
  return (
    `<svg class="frame-marks" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">` +
    `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fff"/>${holes}</mask></defs>` +
    `<rect class="marks-dim" width="${w}" height="${h}" fill-opacity="0.5" mask="url(#${maskId})"/>` +
    `<g mask="url(#${maskId})">${boxes.map((b) => rect(b, 'marks-pulse')).join('')}</g>` +
    `<g class="marks-zone">${boxes.map((b) => rect(b, 'marks-ring')).join('')}${badges}</g>` +
    `</svg>`
  );
}

/**
 * Where a mark's number sits: a number never hides the thing it points at, and never leaves the picture. A large target
 * (a card, a list, a button row) carries it on its start corner, raised so it only touches the outline (text starts right at
 * that corner); a small one (a chip, an icon, a one-line label) beside it on the start side, or the end side when the start
 * side is the picture's edge — or where the shot says (`badge`: start · end · corner · above · below; the last two centre the
 * number over or under a target that has neighbours on both sides: an icon in a row of icons, a button in a footer).
 */
function badgeAt(b, lang, w, h, size) {
  const GAP = 4;
  const TOUCH = 8;
  const rtl = lang === 'he';
  const startX = rtl ? b.x + b.w + GAP : b.x - GAP - size;
  const endX = rtl ? b.x - GAP - size : b.x + b.w + GAP;
  let side = b.badge ?? (b.w < 3 * size || b.h <= size ? 'start' : 'corner');
  if (side === 'start' && (startX < 0 || startX + size > w)) side = 'end';
  const midY = b.y + b.h / 2 - size / 2;
  const midX = b.x + b.w / 2 - size / 2;
  const aboveY = b.y - GAP - size;
  const belowY = b.y + b.h + GAP;
  if (side === 'above' && aboveY < 0) side = 'below';
  if (side === 'below' && belowY + size > h) side = 'above';
  const [x, y] = side === 'start' ? [startX, midY] : side === 'end' ? [endX, midY]
    : side === 'above' ? [midX, aboveY] : side === 'below' ? [midX, belowY]
      : [(rtl ? b.x + b.w : b.x) - size / 2, b.y - size + TOUCH];
  const clamp = (v, max) => Math.round(Math.min(Math.max(v, 0), max));
  return [clamp(x, w - size), clamp(y, h - size)];
}

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
  let frames = 0;
  const html = body.replace(SHOT, (_, id, insetId, caption, withMarks) => {
    const shot = find(id);
    const W = SHOT_WORDS[lang];
    // the inset opens full size too (the same viewer), so its small picture can be read
    const insetShot = insetId ? find(insetId) : null;
    const inset = insetShot
      ? `\n        <a class="frame-inset" href="/img/app/${insetShot.file}" data-lightbox aria-label="${W.open}: ${attr(insetShot.alt)}">${img(insetShot, 'frame-img')}</a>`
      : '';
    if (withMarks && !shot.marks?.length) throw new Error(`shots: ${where} asks for the marks of "${id}", but its ${lang} picture has none (add \`marks\` to the shot and run npm run capture)`);
    const marks = withMarks ? marksLayer(shot, lang, `marks-${id}-${lang}-${++frames}`) : '';
    return (
      `<figure class="frame${insetId ? ' has-inset' : ''}">\n` +
      `        <a class="frame-open" href="/img/app/${shot.file}" data-lightbox aria-label="${W.open}: ${attr(shot.alt)}">\n` +
      `          <span class="frame-strip" aria-hidden="true"><b>app.gearlogs.com</b></span>\n` +
      `          <span class="frame-shot">${img(shot, 'frame-img')}${marks}</span>\n` +
      `        </a>${inset}\n` +
      `        <figcaption class="frame-cap">${caption ?? W.caption}</figcaption>\n` +
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
