// GearLogs 404 — Cloudflare serves the single /404.html for every miss, so this one page
// self-localises: if the attempted URL is under /he/, show the Hebrew message, flip to RTL,
// point the logo at the Hebrew home, and translate the copyright. External file (the site CSP
// forbids inline scripts). No JS => the English message stays. Chrome is deliberately minimal
// (logo + message + copyright) so an error page needs no full nav/footer localisation.
(function () {
  if (!/^\/he(\/|$)/.test(location.pathname)) return;
  document.documentElement.lang = 'he';
  document.documentElement.dir = 'rtl';
  var en = document.getElementById('nf-en');
  var he = document.getElementById('nf-he');
  if (en) en.hidden = true;
  if (he) he.hidden = false;
  var logo = document.getElementById('nf-logo');
  if (logo) { logo.setAttribute('href', '/he/'); logo.setAttribute('aria-label', 'GearLogs — לדף הבית'); }
  var cr = document.getElementById('nf-copyright');
  if (cr) cr.innerHTML = '&copy; RAQIOM. כל הזכויות שמורות.';
})();
