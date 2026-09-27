// The inner-page photo band (Stage 2, the Director's pick F3 · C): a body opens with
//   <gl-band photo="faq"> … the kicker, the <h1 class="band-title">, the lede … </gl-band>
// and the build expands it here into the ONE band markup — the photo (every width from public/img/photos/manifest.json,
// with its size, so nothing shifts while it loads), the veil (CSS) and the content column. Pure module: no file access.
// The build refuses a band that is not the first thing in the body, a second band, an unknown photo, or a band without
// exactly one title.

const BAND = /<gl-band\s+photo="([a-z-]+)"(?:\s+variant="(article)")?\s*>([\s\S]*?)<\/gl-band>/g;

/**
 * Expand the body's <gl-band>. Returns the body with the band's markup in place and whether it opens with a band.
 * @param {string} body the page body
 * @param {Record<string, { files: Array<{ file: string, width: number, height: number }> }>} photos the photo manifest
 * @param {string} where the page, for error messages
 */
export function expandBand(body, photos, where) {
  const found = [...body.matchAll(BAND)];
  if (found.length === 0) {
    if (/<gl-band\b/.test(body)) throw new Error(`band: ${where} has a <gl-band> the build cannot read (photo="…" first, then variant="article")`);
    return { html: body, opensWithBand: false };
  }
  if (found.length > 1) throw new Error(`band: ${where} has ${found.length} bands — a page opens with ONE`);
  const [whole, photo, variant, inner] = found[0];
  if (body.slice(0, found[0].index).trim() !== '') throw new Error(`band: ${where} — the band must be the first thing in the body`);
  const entry = photos[`${photo}-band`];
  if (!entry) throw new Error(`band: ${where} names the photo "${photo}", which is not in public/img/photos/manifest.json (run npm run photos)`);
  const titles = inner.match(/<h1 class="band-title">/g) ?? [];
  if (titles.length !== 1) throw new Error(`band: ${where} — a band holds exactly one <h1 class="band-title"> (found ${titles.length})`);

  const files = [...entry.files].sort((a, b) => a.width - b.width);
  const base = files[0];
  const srcset = files.map((f) => `/img/photos/${f.file} ${f.width}w`).join(', ');
  const html =
    `    <section class="band${variant ? ` band--${variant}` : ''}">\n` +
    `      <img class="band-photo" src="/img/photos/${base.file}" srcset="${srcset}" sizes="100vw" width="${base.width}" height="${base.height}" alt="" fetchpriority="high" decoding="async">\n` +
    `      <div class="wrap band-in">\n` +
    inner.replace(/^\n+|\s+$/g, '') + '\n' +
    `      </div>\n` +
    `    </section>`;
  return { html: body.replace(whole, () => html), opensWithBand: true };
}
