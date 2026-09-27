// Chrome renderers for the GearLogs marketing site: the <head>, header, footer, the
// language toggle and the hreflang/canonical wiring — ONE source, rendered per language.
// Stage 2 (2026-09-27): the approved Home Mock's chrome — the header floats transparent over the
// page's first photo band, the Help menu opens on click, the footer is an ink band.
//
// A "page" is described in src/pages.mjs. This module turns a page + a language into HTML.

import { CHROME, NAV_ITEMS, FOOTER_COLUMNS, SITE_ORIGIN, APP_URL, dirOf, prefixOf, t } from './i18n.mjs';

/** Absolute canonical URL for a page in a language. Home is the bare origin (EN) / origin+/he/ (HE). */
export function canonicalUrl(page, lang) {
  const pre = prefixOf(lang);
  if (page.path === '/') return lang === 'he' ? `${SITE_ORIGIN}/he/` : SITE_ORIGIN;
  return `${SITE_ORIGIN}${pre}${page.path}`;
}

/** Turn a source href (no language prefix) into the right href for this language + page. */
export function localizeHref(href, lang, isHome) {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href; // external / already an anchor
  const pre = prefixOf(lang);
  if (href === '/') return lang === 'he' ? '/he/' : '/';
  if (href.startsWith('/#')) {
    const anchor = href.slice(1); // "#capabilities"
    if (isHome) return anchor;
    return `${lang === 'he' ? '/he/' : '/'}${anchor}`;
  }
  return `${pre}${href}`;
}

// Asset / non-page roots that must NEVER be language-prefixed when rewriting body links.
const ASSET_PREFIXES = ['/img/', '/styles/', '/js/', '/favicon', '/.well-known/', '/api/'];

/** Rewrite root-relative page links inside a Hebrew body fragment to the /he tree. */
export function localizeBodyLinks(html, lang) {
  if (lang !== 'he') return html;
  return html.replace(/href="(\/[^"]*)"/g, (m, p) => {
    if (p.startsWith('/he/') || p === '/he') return m;
    if (ASSET_PREFIXES.some((a) => p.startsWith(a))) return m;
    if (p === '/') return 'href="/he/"';
    if (p.startsWith('/#')) return `href="/he/${p.slice(1)}"`;
    return `href="/he${p}"`;
  });
}

/** hreflang + x-default alternates for an indexable bilingual page. */
function alternates(page) {
  const en = page.path === '/' ? SITE_ORIGIN : `${SITE_ORIGIN}${page.path}`;
  const he = page.path === '/' ? `${SITE_ORIGIN}/he/` : `${SITE_ORIGIN}/he${page.path}`;
  return [
    `  <link rel="alternate" hreflang="en" href="${en}">`,
    `  <link rel="alternate" hreflang="he" href="${he}">`,
    `  <link rel="alternate" hreflang="x-default" href="${en}">`,
  ].join('\n');
}

const OG_IMAGE_BLOCK = [
  '  <meta property="og:image" content="https://gearlogs.com/img/og-card.png">',
  '  <meta property="og:image:width" content="1200">',
  '  <meta property="og:image:height" content="630">',
  '  <meta property="og:image:alt" content="GearLogs — Know what you have. Know who has it.">',
].join('\n');

/** The font files every page of a language paints its first screen with, fetched before the stylesheet asks for them (the
 *  rest load on demand through unicode-range). Two at most, so they never compete with the stylesheet. Measured 2026-09-27
 *  (CPU ×4, fast 4G): /he/faq still shifts 0.058 — below 0.1, "good" — when the Latin face lands, because a Hebrew line takes
 *  its spaces from it; preloading every Hebrew weight did not change that (listed: size-adjusted fallback faces). */
const PRELOAD_FONTS = {
  en: ['ibm-plex-sans-latin-wght-normal.woff2'],
  he: ['ibm-plex-sans-hebrew-hebrew-400-normal.woff2', 'ibm-plex-sans-latin-wght-normal.woff2'],
};

/** Render the full <head> for a page in a language. Driven entirely by page.opts (no inference). */
export function renderHead(page, lang) {
  const m = page.head[lang];
  const o = page.opts || {};
  const L = [];
  L.push('<head>');
  L.push('  <meta charset="UTF-8">');
  L.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  L.push(`  <title>${m.title}</title>`);
  if (o.robots) L.push(`  <meta name="robots" content="${o.robots}">`);
  if (m.description) L.push(`  <meta name="description" content="${m.description}">`);
  if (m.ogTitle) L.push(`  <meta property="og:title" content="${m.ogTitle}">`);
  if (m.ogDescription) L.push(`  <meta property="og:description" content="${m.ogDescription}">`);
  if (m.ogTitle || m.ogDescription) L.push(`  <meta property="og:type" content="${o.ogType || 'website'}">`);
  if (o.canonical !== false) L.push(`  <meta property="og:url" content="${canonicalUrl(page, lang)}">`);
  if (o.twitterCard) L.push(`  <meta name="twitter:card" content="${o.twitterCard}">`);
  if (m.twitterTitle) L.push(`  <meta name="twitter:title" content="${m.twitterTitle}">`);
  if (m.twitterDescription) L.push(`  <meta name="twitter:description" content="${m.twitterDescription}">`);
  if (o.canonical !== false) L.push(`  <link rel="canonical" href="${canonicalUrl(page, lang)}">`);
  if (page.bilingual && o.canonical !== false) L.push(alternates(page));
  if (o.ogImage) L.push(OG_IMAGE_BLOCK);
  L.push('  <link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  for (const font of PRELOAD_FONTS[lang]) L.push(`  <link rel="preload" href="/fonts/${font}" as="font" type="font/woff2" crossorigin>`);
  L.push('  <link rel="stylesheet" href="/styles/main.css">');
  if (o.extraHead) L.push(o.extraHead);
  if (o.jsonld && page.jsonld?.[lang]) {
    L.push('  <script type="application/ld+json">');
    L.push(page.jsonld[lang]);
    L.push('  </script>');
  }
  L.push('</head>');
  return L.join('\n');
}

/** The URL of this page in the other language ('' → EN root, '/he' → HE). */
function counterpartHref(page, lang) {
  const other = lang === 'he' ? 'en' : 'he';
  return other === 'he'
    ? (page.path === '/' ? '/he/' : `/he${page.path}`)
    : (page.path === '/' ? '/' : page.path);
}

/** The header language toggle — a link to the counterpart page in the other language (none on a page without one). */
function langToggle(page, lang) {
  if (!page.bilingual || !page.sitemap) return '';
  const other = lang === 'he' ? 'en' : 'he';
  return `<a class="lang-toggle" href="${counterpartHref(page, lang)}" hreflang="${other}" lang="${other}" aria-label="${t(lang, 'lang_switch_aria')}">${t(lang, 'lang_switch_to')}</a>`;
}

/** aria-current for a nav target: "page" on the page itself, "true" on a page inside its section (a Field Note under Field Notes). */
function currentOf(page, href) {
  if (page.path === href) return ' aria-current="page"';
  if (page.activeNav === href) return ' aria-current="true"';
  return '';
}

/** The bar's links: plain items, and the Help menu (a <details> disclosure — it opens on click, never on hover alone). */
function navLinks(page, lang) {
  const isHome = page.path === '/';
  const link = (item, indent) => `${indent}<a href="${localizeHref(item.href, lang, isHome)}"${currentOf(page, item.href)}>${t(lang, item.key)}</a>`;
  return NAV_ITEMS.map((item) => {
    if (!item.menu) return link(item, '          ');
    const current = item.menu.some((m) => currentOf(page, m.href)) ? ' is-current' : '';
    return (
      `          <details class="nav-menu${current}">\n` +
      `            <summary>${t(lang, item.key)}</summary>\n` +
      `            <div class="nav-menu-list">\n` +
      item.menu.map((m) => link(m, '              ')).join('\n') + '\n' +
      `            </div>\n` +
      `          </details>`
    );
  }).join('\n');
}

/** The wordmark: GEAR + LOGS in the brand red, always left-to-right. */
function logo(lang) {
  const homeHref = lang === 'he' ? '/he/' : '/';
  return `<a href="${homeHref}" class="logo" aria-label="${t(lang, 'logo_aria')}">GEAR<span>LOGS</span></a>`;
}

/**
 * Render the header. Variants by page.chrome: 'full' (the bar + the Help menu), 'stripped' (Home only), 'minimal'
 * (Home + Pricing). It floats over the page's photo band; a page that opens without one gets it on a plain ink ground.
 */
export function renderHeader(page, lang) {
  const homeHref = lang === 'he' ? '/he/' : '/';
  let nav;
  if (page.chrome === 'stripped') {
    nav = `          <a href="${homeHref}">${t(lang, 'nav_home')}</a>`;
  } else if (page.chrome === 'minimal') {
    nav = `          <a href="${homeHref}">${t(lang, 'nav_home')}</a>\n          <a href="${localizeHref('/pricing', lang, false)}">${t(lang, 'nav_pricing')}</a>`;
  } else {
    nav = navLinks(page, lang);
  }
  const request = localizeHref('/contact?reason=access&amp;from=header', lang, false);
  const right = [
    langToggle(page, lang),
    `<a class="signin" href="${APP_URL}">${t(lang, 'nav_signin')}</a>`,
    `<a class="btn btn-go btn-sm" href="${request}">${t(lang, 'nav_request')}</a>`,
  ].filter(Boolean).join('\n          ');
  return (
    `    <header class="site-header${page.opensWithBand ? '' : ' is-solid'}">\n` +
    `      <div class="wrap bar">\n` +
    `        ${logo(lang)}\n` +
    `        <nav class="nav-links" aria-label="${t(lang, 'nav_aria')}">\n${nav}\n        </nav>\n` +
    `        <div class="navr">\n          ${right}\n        </div>\n` +
    `      </div>\n` +
    `    </header>`
  );
}

/** Render the footer. Variants by page.footer: 'full' (the brand + the link columns), 'minimal' (the bottom row and the legal links). */
export function renderFooter(page, lang) {
  const c = (href) => localizeHref(href, lang, page.path === '/');
  // The footer keeps its own language switch (the Director's ask), beside the facts line.
  const other = lang === 'he' ? 'en' : 'he';
  const footerLang = page.bilingual && page.sitemap
    ? `\n          <a class="footer-lang" href="${counterpartHref(page, lang)}" hreflang="${other}" lang="${other}" aria-label="${t(lang, 'lang_switch_aria')}">${t(lang, 'lang_switch_to')}</a>`
    : '';
  const legal = page.footer === 'minimal'
    ? `\n          <span class="foot-legal">${[['footer_terms', '/terms'], ['footer_privacy', '/privacy'], ['footer_refunds', '/refunds']].map(([k, h]) => `<a href="${c(h)}">${t(lang, k)}</a>`).join('')}</span>`
    : '';
  const row =
    `        <div class="foot-row">\n` +
    `          <span>${t(lang, 'footer_made')} &middot; <a href="https://raqiom.com" target="_blank" rel="noopener">raqiom.com</a></span>\n` +
    `          <span class="foot-end">${legal}\n          <span>${t(lang, 'footer_facts')}</span>${footerLang}\n          </span>\n` +
    `        </div>`;

  if (page.footer === 'minimal') {
    return `    <footer class="site-footer is-minimal">\n      <div class="wrap">\n${row}\n      </div>\n    </footer>`;
  }
  const columns = FOOTER_COLUMNS.map((col) =>
    `          <div>\n` +
    `            <h2 class="foot-h">${t(lang, col.key)}</h2>\n` +
    `            <ul class="foot-list">\n` +
    col.links.map(([key, href]) => `              <li><a href="${c(href)}">${t(lang, key)}</a></li>`).join('\n') + '\n' +
    `            </ul>\n` +
    `          </div>`,
  ).join('\n');
  return (
    `    <footer class="site-footer">\n` +
    `      <div class="wrap">\n` +
    `        <div class="foot-cols">\n` +
    `          <div>\n            ${logo(lang)}\n            <p class="foot-tag">${t(lang, 'footer_tagline')}</p>\n          </div>\n` +
    `${columns}\n` +
    `        </div>\n` +
    `${row}\n` +
    `      </div>\n` +
    `    </footer>`
  );
}

/** The "view in Hebrew" banner mount (EN indexable pages only; lang-banner.js reveals it). */
export function renderBanner(page, lang) {
  if (lang !== 'en' || !page.bilingual || !page.sitemap) return '';
  const heHref = page.path === '/' ? '/he/' : `/he${page.path}`;
  return (
    `    <div class="lang-nudge" id="lang-nudge" data-he-url="${heHref}" hidden>\n` +
    `      <span class="lang-nudge-msg">${CHROME.en.banner_msg}</span>\n` +
    `      <a class="lang-nudge-cta" href="${heHref}" hreflang="he" lang="he">${CHROME.en.banner_cta}</a>\n` +
    `      <button type="button" class="lang-nudge-x" id="lang-nudge-x" aria-label="${CHROME.en.banner_dismiss_aria}">&times;</button>\n` +
    `    </div>`
  );
}

/** Assemble a full HTML document for a page in a language. `page.opensWithBand` is set by the build (scripts/lib/band.mjs). */
export function renderPage(page, lang, body) {
  const localizedBody = localizeBodyLinks(body, lang);
  const banner = renderBanner(page, lang); // '' when not applicable

  // The nudge needs one small script, the Help menu another; the language toggle is a plain link and needs none.
  const scriptList = [...(page.scripts || [])];
  if (page.chrome === 'full') scriptList.push('/js/menu.js');
  if (banner) scriptList.push('/js/lang-banner.js');
  const scripts = scriptList.map((s) => {
    if (typeof s === 'string') return `  <script src="${s}" defer></script>`;
    return `  <script src="${s.src}" ${s.attrs}></script>`; // { src, attrs }
  }).join('\n');

  return (
    `<!DOCTYPE html>\n` +
    `<html lang="${t(lang, 'html_lang')}" dir="${dirOf(lang)}">\n` +
    `${renderHead(page, lang)}\n` +
    `<body>\n` +
    `  <a class="skip" href="#main">${t(lang, 'skip_link')}</a>\n` +
    (banner ? `${banner}\n` : '') +
    `  <div class="page">\n` +
    `${renderHeader(page, lang)}\n` +
    `    <main id="main">\n${localizedBody.replace(/\s+$/, '')}\n    </main>\n` +
    `${renderFooter(page, lang)}\n` +
    `  </div>\n` +
    (scripts ? `${scripts}\n` : '') +
    `</body>\n` +
    `</html>\n`
  );
}
