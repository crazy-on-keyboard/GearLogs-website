// The photo tags (Stage 2). Bodies name a photo and the build writes the ONE markup for it from public/img/photos/manifest.json
// (written by `npm run photos`): every width with its size, so nothing shifts while it loads. Pure module: no file access.
//
//   <gl-band photo="faq"> … </gl-band>                 an inner page's photo band (the Director's pick F3 · C)
//   <gl-band photo="hero" variant="hero"> … </gl-band>  the home's hero (the approved Home Mock)
//   <gl-photo name="repair" class="pc-img" sizes="620px"></gl-photo>   a photo inside a section
//
// A band holds the kicker, exactly ONE <h1 class="band-title"> and the lede; the header floats over it. The build refuses a
// band that is not the first thing in the body, a second band, an unknown photo, a band without exactly one title, and any
// photo tag it cannot read. Every photo is decorative (alt=""), never captioned as a customer (S2-03).

const BAND = /<gl-band\s+photo="([a-z-]+)"(?:\s+variant="(article|hero)")?\s*>([\s\S]*?)<\/gl-band>/g;
const PHOTO = /<gl-photo\s+name="([a-z-]+)"\s+class="([a-z- ]+)"\s+sizes="([^"]+)"\s*><\/gl-photo>/g;

/** A photo's files, smallest first, and its srcset. */
function filesOf(photos, key, where) {
  const entry = photos[key];
  if (!entry) throw new Error(`photos: ${where} names the photo "${key}", which is not in public/img/photos/manifest.json (run npm run photos)`);
  const files = [...entry.files].sort((a, b) => a.width - b.width);
  return { base: files[0], srcset: files.map((f) => `/img/photos/${f.file} ${f.width}w`).join(', ') };
}

/**
 * Expand the body's <gl-band>. Returns the body with the band's markup in place and whether it opens with a band.
 * @param {string} body the page body
 * @param {Record<string, { files: Array<{ file: string, width: number, height: number }> }>} photos the photo manifest
 * @param {string} where the page, for error messages
 */
export function expandBand(body, photos, where) {
  const found = [...body.matchAll(BAND)];
  if (found.length === 0) {
    if (/<gl-band\b/.test(body)) throw new Error(`photos: ${where} has a <gl-band> the build cannot read (photo="…" first, then variant="article|hero")`);
    return { html: body, opensWithBand: false };
  }
  if (found.length > 1) throw new Error(`photos: ${where} has ${found.length} bands — a page opens with ONE`);
  const [whole, photo, variant, inner] = found[0];
  if (body.slice(0, found[0].index).trim() !== '') throw new Error(`photos: ${where} — the band must be the first thing in the body`);
  const titles = inner.match(/<h1 class="band-title">/g) ?? [];
  if (titles.length !== 1) throw new Error(`photos: ${where} — a band holds exactly one <h1 class="band-title"> (found ${titles.length})`);

  const { base, srcset } = filesOf(photos, `${photo}-band`, where);
  const html =
    `    <section class="band${variant ? ` band--${variant}` : ''}">\n` +
    `      <img class="band-photo" src="/img/photos/${base.file}" srcset="${srcset}" sizes="100vw" width="${base.width}" height="${base.height}" alt="" fetchpriority="high" decoding="async">\n` +
    `      <div class="wrap band-in">\n` +
    inner.replace(/^\n+|\s+$/g, '') + '\n' +
    `      </div>\n` +
    `    </section>`;
  return { html: body.replace(whole, () => html), opensWithBand: true };
}

/** Expand every <gl-photo> in a body into its lazy, sized <img>. */
export function expandPhotos(body, photos, where) {
  const html = body.replace(PHOTO, (_, name, cls, sizes) => {
    const { base, srcset } = filesOf(photos, name, where);
    return `<img class="${cls}" src="/img/photos/${base.file}" srcset="${srcset}" sizes="${sizes}" width="${base.width}" height="${base.height}" alt="" loading="lazy" decoding="async">`;
  });
  if (/<gl-photo\b/.test(html)) throw new Error(`photos: ${where} has a <gl-photo> the build cannot read (name="…" class="…" sizes="…", empty element)`);
  return html;
}
