// The ONE image encoder of the site's tooling (Stage 2, 2026-09-27): the capture pipeline and the photo pipeline both turn a
// picture into WebP inside Chrome itself, through a canvas — no image library to install. Optionally it cuts a region out
// first (`crop`, in source pixels), scales it to `width` and blurs named regions (`soften`, in source pixels — used where a
// photo carries date-like pseudo-writing, since the site shows no dates). Every re-encode drops the source's metadata.

/**
 * Encode an image buffer (PNG or JPEG) to WebP in the page's browser.
 * @param {import('playwright-core').Page} page any open page (about:blank is enough)
 * @param {Buffer} buffer the source image
 * @param {{ mime?: string, quality?: number, width?: number, crop?: { x: number, y: number, w: number, h: number }, soften?: Array<{ x: number, y: number, w: number, h: number, px: number, feather: number }> }} [options]
 * @returns {Promise<{ data: Buffer, width: number, height: number }>}
 */
export async function encodeWebp(page, buffer, { mime = 'image/png', quality = 0.9, width, crop, soften = [] } = {}) {
  const out = await page.evaluate(async ({ data, mime, quality, width, crop, soften }) => {
    const img = new Image();
    img.src = `data:${mime};base64,${data}`;
    await img.decode();
    const src = crop ?? { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const w = Math.round(width ?? src.w);
    const h = Math.round((src.h * w) / src.w);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, w, h);
    const k = w / src.w;
    for (const r of soften) {
      // the blurred copy is laid over the region through a feathered mask, so no hard edge shows
      const layer = document.createElement('canvas');
      layer.width = w; layer.height = h;
      const l = layer.getContext('2d');
      l.filter = `blur(${r.px * k}px)`;
      l.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, w, h);
      const mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      const m = mask.getContext('2d');
      const f = r.feather * k;
      m.filter = `blur(${f / 2}px)`;
      m.fillRect((r.x - src.x) * k + f, (r.y - src.y) * k + f, r.w * k - 2 * f, r.h * k - 2 * f);
      l.filter = 'none';
      l.globalCompositeOperation = 'destination-in';
      l.drawImage(mask, 0, 0);
      g.drawImage(layer, 0, 0);
    }
    return { b64: c.toDataURL('image/webp', quality).split(',')[1], w, h };
  }, { data: buffer.toString('base64'), mime, quality, width, crop, soften });
  return { data: Buffer.from(out.b64, 'base64'), width: out.w, height: out.h };
}
