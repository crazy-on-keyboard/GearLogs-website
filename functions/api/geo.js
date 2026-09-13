// Cloudflare Pages Function — the ONLY server code on this site. Returns the visitor's
// 2-letter country (from Cloudflare's edge) so the client "view in Hebrew" nudge can decide
// whether to offer the Hebrew version. Stateless: it never logs the IP or country, sets no
// cookie, and is never cached (so one country's answer can't be served to another).
//
// GET /api/geo -> { "country": "IL" }  (or null when the edge can't determine it)
export function onRequestGet(context) {
  const country = context.request?.cf?.country ?? null;
  return new Response(JSON.stringify({ country }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
