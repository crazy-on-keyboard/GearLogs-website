// GearLogs — "view in Hebrew" nudge on the English pages (external file: the site CSP
// forbids inline scripts). It appears only for a visitor who looks Hebrew-reading —
// a Hebrew browser, or (from Cloudflare's edge) a visitor in Israel — and never redirects:
// it offers the Hebrew version and remembers the choice. If /api/geo is unreachable (e.g. a
// local preview, where Functions don't run), it simply falls back to the browser language.
(function () {
  var el = document.getElementById('lang-nudge');
  if (!el) return;

  var KEY = 'gl_lang_nudge';
  try { if (localStorage.getItem(KEY) === 'off') return; } catch (e) { /* private mode */ }

  function remember() { try { localStorage.setItem(KEY, 'off'); } catch (e) { /* ignore */ } }

  function show() {
    el.hidden = false;
    var x = document.getElementById('lang-nudge-x');
    if (x) x.addEventListener('click', function () { el.hidden = true; remember(); });
    var cta = el.querySelector('.lang-nudge-cta');
    if (cta) cta.addEventListener('click', remember); // they're heading to /he — don't nudge again
  }

  // Signal 1 — a Hebrew-preferring browser (covers Hebrew speakers anywhere, and needs no network).
  var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
  var prefersHe = langs.some(function (l) { return /^(he|iw)\b/i.test(l); });
  if (prefersHe) { show(); return; }

  // Signal 2 — the visitor's country, from Cloudflare's edge (same-origin; no CSP change).
  fetch('/api/geo', { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.country === 'IL') show(); })
    .catch(function () { /* geo unavailable — no banner, no error */ });
})();
