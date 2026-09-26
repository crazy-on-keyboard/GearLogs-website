// Chrome renderers for the GearLogs marketing site: the <head>, header, footer, the
// language toggle and the hreflang/canonical wiring — ONE source, rendered per language,
// replacing the header/footer that used to be copy-pasted into all 22 pages.
//
// A "page" is described in src/pages.mjs. This module turns a page + a language into HTML.

import { CHROME, NAV_ITEMS, SITE_ORIGIN, APP_URL, dirOf, prefixOf, t } from './i18n.mjs';

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

/** The header language toggle — a link to the counterpart page in the other language. */
function langToggle(page, lang) {
  if (!page.bilingual) return '';
  const other = lang === 'he' ? 'en' : 'he';
  return `<a class="lang-toggle" href="${counterpartHref(page, lang)}" hreflang="${other}" lang="${other}" aria-label="${t(lang, 'lang_switch_aria')}">${t(lang, 'lang_switch_to')}</a>`;
}

function navLinks(page, lang) {
  const isHome = page.path === '/';
  const activeNav = page.activeNav || null; // e.g. '/notes' for a note article; null on the home page
  return NAV_ITEMS.map((item) => {
    const href = localizeHref(item.href, lang, isHome);
    const active = item.href === activeNav ? ' class="active" aria-current="page"' : '';
    return `          <a href="${href}"${active}>${t(lang, item.key)}</a>`;
  }).join('\n');
}

/** Render the header. Variants: 'full' (nav + toggle + CTA), 'stripped' (Home only), 'minimal' (Home + Pricing). */
export function renderHeader(page, lang) {
  const homeHref = lang === 'he' ? '/he/' : '/';
  const toggle = langToggle(page, lang);
  const cta = `<a href="${APP_URL}" class="nav-cta">${t(lang, 'nav_cta')}</a>`;
  const logoImg = page.opts?.logoPriority
    ? '<img class="logo-mark" src="/img/logo-mark.png" alt="" width="42" height="39" fetchpriority="high">'
    : '<img class="logo-mark" src="/img/logo-mark.png" alt="" width="42" height="39">';
  const logo =
    `        <a href="${homeHref}" class="logo" aria-label="${t(lang, 'logo_aria')}">\n` +
    `          ${logoImg}\n` +
    `          <span class="logo-wm">GEAR<span class="lr">LOGS</span></span>\n` +
    `        </a>`;

  let nav;
  if (page.chrome === 'stripped') {
    nav = `        <nav class="nav"><a href="${homeHref}">${t(lang, 'nav_home')}</a></nav>`;
  } else if (page.chrome === 'minimal') {
    nav = `        <nav class="nav"><a href="${homeHref}">${t(lang, 'nav_home')}</a><a href="${localizeHref('/pricing', lang, false)}">${t(lang, 'nav_pricing')}</a></nav>`;
  } else {
    nav = `        <nav class="nav">\n${navLinks(page, lang)}\n        </nav>`;
  }

  const right = [toggle, cta].filter(Boolean).join('\n        ');
  return (
    `    <header class="header">\n` +
    `      <div class="header-inner">\n` +
    `${logo}\n` +
    `${nav}\n` +
    `        ${right}\n` +
    `      </div>\n` +
    `    </header>`
  );
}

/** Render the footer. Variants: 'full' (brand + 4 columns), 'minimal' (copyright only). */
export function renderFooter(page, lang) {
  const c = (href) => localizeHref(href, lang, page.path === '/');
  // A manual language switcher in the footer bar too (the Director's ask), beside the copyright.
  const other = lang === 'he' ? 'en' : 'he';
  const footerLang = page.bilingual
    ? `\n          <a class="footer-lang" href="${counterpartHref(page, lang)}" hreflang="${other}" lang="${other}" aria-label="${t(lang, 'lang_switch_aria')}">${t(lang, 'lang_switch_to')}</a>`
    : '';
  const copyright = `        <div class="footer-bottom">\n          <span>${t(lang, 'footer_copyright')}</span>${footerLang}\n        </div>`;

  if (page.footer === 'minimal') {
    return `    <footer class="footer">\n      <div class="footer-inner">\n${copyright}\n      </div>\n    </footer>`;
  }

  return (
    `    <footer class="footer">\n` +
    `      <div class="footer-inner">\n` +
    `        <div class="footer-brand">\n` +
    `          <div class="footer-logo">GEARLOGS</div>\n` +
    `          <div class="footer-by">${t(lang, 'footer_by')} <a href="https://raqiom.com" target="_blank" rel="noopener">RAQIOM</a></div>\n` +
    `          <div class="footer-tagline">${t(lang, 'footer_tagline')}</div>\n` +
    `        </div>\n` +
    `        <div class="footer-links">\n` +
    `          <div class="footer-col">\n` +
    `            <div class="footer-col-title">${t(lang, 'footer_col_product')}</div>\n` +
    `            <a href="${c('/#capabilities')}">${t(lang, 'nav_capabilities')}</a>\n` +
    `            <a href="${c('/#how-it-works')}">${t(lang, 'nav_how')}</a>\n` +
    `            <a href="${c('/#security')}">${t(lang, 'nav_security')}</a>\n` +
    `            <a href="${c('/pricing')}">${t(lang, 'nav_pricing')}</a>\n` +
    `            <a href="${APP_URL}">${t(lang, 'nav_cta')}</a>\n` +
    `          </div>\n` +
    `          <div class="footer-col">\n` +
    `            <div class="footer-col-title">${t(lang, 'footer_col_resources')}</div>\n` +
    `            <a href="${c('/guides')}">${t(lang, 'nav_guides')}</a>\n` +
    `            <a href="${c('/faq')}">${t(lang, 'nav_faq')}</a>\n` +
    `            <a href="${c('/notes')}">${t(lang, 'nav_notes')}</a>\n` +
    `            <a href="${c('/changelog')}">${t(lang, 'nav_changelog')}</a>\n` +
    `            <a href="${c('/contact')}">${t(lang, 'nav_contact')}</a>\n` +
    `          </div>\n` +
    `          <div class="footer-col">\n` +
    `            <div class="footer-col-title">${t(lang, 'footer_col_suite')}</div>\n` +
    `            <a href="https://pmolikepro.com" target="_blank" rel="noopener">PMOlikePRO</a>\n` +
    `            <a href="https://raqiom.com" target="_blank" rel="noopener">RAQIOM.com</a>\n` +
    `          </div>\n` +
    `          <div class="footer-col">\n` +
    `            <div class="footer-col-title">${t(lang, 'footer_col_legal')}</div>\n` +
    `            <a href="${c('/privacy')}">${t(lang, 'footer_privacy')}</a>\n` +
    `            <a href="${c('/terms')}">${t(lang, 'footer_terms')}</a>\n` +
    `            <a href="${c('/refunds')}">${t(lang, 'footer_refunds')}</a>\n` +
    `            <a href="${c('/#security')}">${t(lang, 'nav_security')}</a>\n` +
    `          </div>\n` +
    `        </div>\n` +
    `${copyright}\n` +
    `      </div>\n` +
    `    </footer>`
  );
}

/** The "view in Hebrew" banner mount (EN indexable pages only; lang-banner.js reveals it). */
export function renderBanner(page, lang) {
  if (lang !== 'en' || !page.bilingual) return '';
  const heHref = page.path === '/' ? '/he/' : `/he${page.path}`;
  return (
    `    <div class="lang-nudge" id="lang-nudge" data-he-url="${heHref}" hidden>\n` +
    `      <span class="lang-nudge-msg">${CHROME.en.banner_msg}</span>\n` +
    `      <a class="lang-nudge-cta" href="${heHref}" hreflang="he" lang="he">${CHROME.en.banner_cta}</a>\n` +
    `      <button type="button" class="lang-nudge-x" id="lang-nudge-x" aria-label="${CHROME.en.banner_dismiss_aria}">&times;</button>\n` +
    `    </div>`
  );
}

/** Assemble a full HTML document for a page in a language. */
export function renderPage(page, lang, body) {
  const localizedBody = localizeBodyLinks(body, lang);
  const banner = renderBanner(page, lang); // '' when not applicable

  // The nudge needs one small script; the toggle is a plain link and needs none.
  const scriptList = [...(page.scripts || [])];
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
    `  <div class="page">\n\n` +
    `    <div class="class-stripe"></div>\n\n` +
    `${renderHeader(page, lang)}\n` +
    (banner ? `\n${banner}\n` : '') +
    `\n${localizedBody}\n\n` +
    `${renderFooter(page, lang)}\n\n` +
    `  </div>\n` +
    (scripts ? `${scripts}\n` : '') +
    `</body>\n` +
    `</html>\n`
  );
}
