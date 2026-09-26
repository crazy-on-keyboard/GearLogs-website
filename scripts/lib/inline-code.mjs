// "No inline code" (Stage 2 PR-1, 2026-09-27): the site's CSP has no 'unsafe-inline', so an inline style, a <style> block, an
// on…= handler or a javascript: URL in a page would be silently dead in production — the build refuses them instead.
// Each TAG is read with its quoted values respected (a '>' inside a value never ends it); the attribute names are tested
// case-insensitively after any quote, slash or space — a style attribute, an on…= handler quoted or not — and every URL
// attribute's value is entity-decoded before the javascript: test (the security gate's SEC-PR1-2). Text and JSON-LD are never
// scanned, so prose about JavaScript is not refused. Pure module; scripts/check-inline-guard.mjs proves the cases.

const TAG = /<[a-zA-Z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g;
const URL_ATTR = /[\s"'/](?:href|src|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

const decodeEntities = (v) => v
  .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&colon;/gi, ':')
  .replace(/&tab;|&newline;/gi, '');

/** What inline code a page holds (an empty list when none). */
export function inlineCodeIn(html) {
  const found = new Set();
  if (/<style[\s>]/i.test(html)) found.add('a <style> block');
  for (const [tag] of html.matchAll(TAG)) {
    const bare = tag.replace(/"[^"]*"|'[^']*'/g, '""');
    if (/[\s"'/]style\s*=/i.test(bare)) found.add('a style="" attribute');
    if (/[\s"'/]on[a-z]+\s*=/i.test(bare)) found.add('an on…= handler');
    for (const m of tag.matchAll(URL_ATTR)) {
      const value = decodeEntities(m[1] ?? m[2] ?? m[3] ?? '').replace(/[\u0000-\u001f\s]/g, '');
      if (/^javascript:/i.test(value)) found.add('a javascript: URL');
    }
  }
  return [...found];
}
