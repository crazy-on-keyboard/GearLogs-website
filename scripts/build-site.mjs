#!/usr/bin/env node
// GearLogs marketing site generator. Renders every page in English and Hebrew from ONE
// chrome source (src/chrome.mjs) + per-language head metadata (src/meta/*.json), body
// fragments (src/bodies/<slug>.<lang>.html) and JSON-LD (src/bodies/<slug>.jsonld.<lang>.json),
// writing English to dist/ and Hebrew to dist/he/. Then it copies the static assets from
// public/ and writes sitemap.xml with reciprocal hreflang alternates. Stage 2: the stylesheet is bundled from the
// partials in src/styles/, the Plex fonts are copied from node_modules, and each body's photo and picture tags (<gl-band>,
// <gl-photo>, <gl-shot>) become their one markup.
//
//   node scripts/build-site.mjs            full build (fails if any page lacks Hebrew)
//   node scripts/build-site.mjs --en-only  English only (for verifying EN output pre-translation)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { PAGES } from '../src/pages.mjs';
import { LANGS, SITE_ORIGIN } from '../src/i18n.mjs';
import { renderPage, canonicalUrl } from '../src/chrome.mjs';
import { buildSync } from 'esbuild';
import { renderHeaders } from './lib/headers.mjs';
import { inlineCodeIn } from './lib/inline-code.mjs';
import { expandBand, expandPhotos } from './lib/photo-tags.mjs';
import { expandShots, strayAppImages, webpSize } from './lib/shots.mjs';
import { expandGuideCards, withoutCardPictures } from './lib/guide-cards.mjs';

/** Typed script entry (under src/) → the file the pages load (under dist/). */
const SCRIPT_BUNDLES = [
  ['scripts/contact/form.ts', 'js/contact.js'],
  ['scripts/nav/menu.ts', 'js/menu.js'],
  ['scripts/lightbox/lightbox.ts', 'js/lightbox.js'],
  ['scripts/motion/motion.ts', 'js/motion.js'],
];

/** The self-hosted fonts (src/styles/fonts.css names them): package folder → the files served from /fonts/, with each licence. */
const FONT_FILES = {
  '@fontsource-variable/ibm-plex-sans': ['ibm-plex-sans-latin-wght-normal.woff2', 'ibm-plex-sans-latin-ext-wght-normal.woff2'],
  '@fontsource/ibm-plex-sans-hebrew': [300, 400, 500, 600].map((w) => `ibm-plex-sans-hebrew-hebrew-${w}-normal.woff2`),
  '@fontsource/ibm-plex-mono': ['ibm-plex-mono-latin-500-normal.woff2', 'ibm-plex-mono-latin-700-normal.woff2'],
};

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
const EN_ONLY = process.argv.includes('--en-only');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
/** Every served photo's widths and sizes (written by `npm run photos`). */
const photos = readJson(join(PUBLIC, 'img', 'photos', 'manifest.json'));
/** Every app picture, per language, with its alt text (written by `npm run capture`); a picture's size is read from its file. */
const appShots = readJson(join(PUBLIC, 'img', 'app', 'manifest.json'));
const appSizes = new Map();
const appSizeOf = (file) => {
  if (!appSizes.has(file)) appSizes.set(file, webpSize(readFileSync(join(PUBLIC, 'img', 'app', file))));
  return appSizes.get(file);
};
/** The guides index's card pictures and what each was cut from (written by `npm run cards`). */
const guideCards = readJson(join(PUBLIC, 'img', 'app', 'cards', 'manifest.json'));
const appStamps = new Map();
const appStampOf = (file) => {
  if (!appStamps.has(file)) appStamps.set(file, createHash('md5').update(readFileSync(join(PUBLIC, 'img', 'app', file))).digest('hex'));
  return appStamps.get(file);
};
const guidePageOf = (lang) => (slug) => (existsSync(bodyPath(`guides/${slug}`, lang)) ? readFileSync(bodyPath(`guides/${slug}`, lang), 'utf8') : null);
const meta = {
  en: readJson(join(SRC, 'meta', 'en.json')),
  he: existsSync(join(SRC, 'meta', 'he.json')) ? readJson(join(SRC, 'meta', 'he.json')) : {},
};

const bodyPath = (slug, lang) => join(SRC, 'bodies', `${slug}.${lang}.html`);
const jsonldPath = (slug, lang) => join(SRC, 'bodies', `${slug}.jsonld.${lang}.json`);
const outPath = (page, lang) => {
  const rel = page.path === '/' ? '/index.html' : `${page.path}.html`;
  return lang === 'he' ? join(DIST, 'he', rel) : join(DIST, rel);
};

// Force every gearlogs.com page URL in a JSON-LD string onto the /he tree (assets + the bare
// org URL are left alone). Keeps Hebrew structured-data URLs correct no matter what the
// translation produced.
function heJsonldUrls(s) {
  return s.replace(/https:\/\/gearlogs\.com(\/(?!he\/|img\/)[^"#\s]*)/g, 'https://gearlogs.com/he$1');
}
function tagLanguage(node, lang) {
  if (Array.isArray(node)) return node.forEach((n) => tagLanguage(n, lang));
  if (node && typeof node === 'object') {
    if (node['@type'] === 'BlogPosting' || node['@type'] === 'Blog') node.inLanguage = lang;
    for (const v of Object.values(node)) tagLanguage(v, lang);
  }
}

function loadJsonld(page, lang) {
  if (!page.opts?.jsonld) return null;
  const p = jsonldPath(page.slug, lang);
  if (!existsSync(p)) return null;
  if (lang === 'en') return readFileSync(p, 'utf8').trim(); // emit EN verbatim
  const data = readJson(p);
  tagLanguage(data['@graph'] ?? data, 'he');
  return heJsonldUrls(JSON.stringify(data, null, 2));
}

// ---- completeness guard -----------------------------------------------------
function missingArtifacts() {
  const missing = [];
  for (const page of PAGES) {
    if (!meta.en[page.slug]) missing.push(`meta.en["${page.slug}"]`);
    if (!existsSync(bodyPath(page.slug, 'en'))) missing.push(`bodies/${page.slug}.en.html`);
    if (page.opts?.jsonld && !existsSync(jsonldPath(page.slug, 'en'))) missing.push(`bodies/${page.slug}.jsonld.en.json`);
    if (EN_ONLY || !page.bilingual) continue;
    if (!meta.he[page.slug]) missing.push(`meta.he["${page.slug}"]`);
    if (!existsSync(bodyPath(page.slug, 'he'))) missing.push(`bodies/${page.slug}.he.html`);
    if (page.opts?.jsonld && !existsSync(jsonldPath(page.slug, 'he'))) missing.push(`bodies/${page.slug}.jsonld.he.json`);
  }
  return missing;
}

const gaps = missingArtifacts();
if (gaps.length) {
  console.error(`build-site: ${gaps.length} missing artifact(s) — the site would ship half-translated:`);
  for (const g of gaps) console.error(`  MISSING  ${g}`);
  process.exit(1);
}

// ---- generate ---------------------------------------------------------------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
// Static assets first; generated pages overwrite any stale copies.
cpSync(PUBLIC, DIST, { recursive: true });

// The typed browser scripts (Q8 · A): each entry is bundled into one plain file under dist/js/. `npm run check`
// type-checks them with tsc; esbuild only strips the types here.
for (const [entry, out] of SCRIPT_BUNDLES) {
  buildSync({ entryPoints: [join(SRC, entry)], outfile: join(DIST, out), bundle: true, format: 'iife', target: 'es2020', charset: 'utf8', legalComments: 'none', minify: true });
}

// The stylesheet: the partials in src/styles/ bundled into ONE minified /styles/main.css (fonts and images stay absolute URLs).
buildSync({ entryPoints: [join(SRC, 'styles', 'main.css')], outfile: join(DIST, 'styles', 'main.css'), bundle: true, minify: true, charset: 'utf8', legalComments: 'none', external: ['/fonts/*', '/img/*'] });

// The fonts and their licences (SIL OFL 1.1 asks that the licence travel with the files).
mkdirSync(join(DIST, 'fonts'), { recursive: true });
for (const [pkg, files] of Object.entries(FONT_FILES)) {
  const dir = join(ROOT, 'node_modules', ...pkg.split('/'));
  for (const file of files) cpSync(join(dir, 'files', file), join(DIST, 'fonts', file));
  cpSync(join(dir, 'LICENSE'), join(DIST, 'fonts', `LICENSE-${pkg.split('/')[1]}.txt`));
}
const cssText = readFileSync(join(DIST, 'styles', 'main.css'), 'utf8');
const missingFonts = [...cssText.matchAll(/url\("?(\/fonts\/[^")]+)"?\)/g)].map((m) => m[1]).filter((u) => !existsSync(join(DIST, u)));
if (missingFonts.length) {
  console.error(`build-site: the stylesheet names font files the build did not copy —\n  ${missingFonts.join('\n  ')}`);
  process.exit(1);
}

const langs = EN_ONLY ? ['en'] : LANGS;
let written = 0;
/** The guides whose index card still waits for its page (named at the end: none of them may reach the live site). */
const waitingGuides = new Set();
for (const page of PAGES) {
  for (const lang of page.bilingual ? langs : ['en']) {
    const p = { ...page, head: { en: meta.en[page.slug], he: meta.he[page.slug] } };
    p.jsonld = { en: loadJsonld(p, 'en'), he: loadJsonld(p, 'he') };
    const where = `${lang}:${page.slug}`;
    const band = expandBand(readFileSync(bodyPath(page.slug, lang), 'utf8'), photos, where);
    p.opensWithBand = band.opensWithBand;
    // every page opens with its photo band (the Director's pick F3 · C; the home's is its hero)
    if (!band.opensWithBand) {
      console.error(`build-site: ${where} does not open with a <gl-band> — every page opens with its photo band`);
      process.exit(1);
    }
    const cards = expandGuideCards(expandPhotos(band.html, photos, where), lang, { pageOf: guidePageOf(lang), shots: appShots, cards: guideCards, stampOf: appStampOf }, where);
    for (const slug of cards.waiting) waitingGuides.add(slug);
    const body = expandShots(cards.html, lang, appShots, appSizeOf, where);
    const html = renderPage(p, lang, body);
    // S2-02: every app picture on the site is a real capture, in the page's language, placed by a <gl-shot> — nothing else
    const stray = strayAppImages(withoutCardPictures(html));
    if (stray.length) {
      console.error(`build-site: ${where} shows app pictures outside a <gl-shot> frame or a guide card — ${stray.join(', ')}`);
      process.exit(1);
    }
    const wrongLang = [...html.matchAll(/\/img\/app\/(?:cards\/)?[a-z0-9-]+\.(en|he)\./g)].filter((m) => m[1] !== lang);
    if (wrongLang.length) {
      console.error(`build-site: ${where} shows an app picture in the other language — ${wrongLang[0][0]}`);
      process.exit(1);
    }
    const out = outPath(page, lang);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html, 'utf8');
    written++;
  }
}

// ---- sitemap ----------------------------------------------------------------
function sitemapEntry(page, lang) {
  const loc = canonicalUrl(page, lang);
  const en = page.path === '/' ? SITE_ORIGIN : `${SITE_ORIGIN}${page.path}`;
  const he = page.path === '/' ? `${SITE_ORIGIN}/he/` : `${SITE_ORIGIN}/he${page.path}`;
  const alts = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="he" href="${he}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`,
  ].join('\n');
  return (
    `  <url><loc>${loc}</loc>\n${alts}\n` +
    `    <changefreq>${page.sitemap.changefreq}</changefreq><priority>${page.sitemap.priority}</priority></url>`
  );
}
const smPages = PAGES.filter((p) => p.sitemap);
const entries = [];
for (const p of smPages) {
  entries.push(sitemapEntry(p, 'en'));
  if (!EN_ONLY && p.bilingual) entries.push(sitemapEntry(p, 'he'));
}
// ---- the headers: generated from the named policies (scripts/lib/headers.mjs), never hand-copied per path ----------
writeFileSync(join(DIST, '_headers'), renderHeaders(), 'utf8');

// ---- no inline code in any page: the policy has no 'unsafe-inline' (scripts/lib/inline-code.mjs holds the rule) ----------
const inlineProblems = [];
(function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { scan(path); continue; }
    if (!name.endsWith('.html')) continue;
    for (const what of inlineCodeIn(readFileSync(path, 'utf8'))) inlineProblems.push(`${path.slice(DIST.length + 1)}: ${what}`);
  }
})(DIST);
if (inlineProblems.length) {
  console.error(`build-site: inline code refused (the CSP has no 'unsafe-inline') —\n  ${inlineProblems.join('\n  ')}`);
  process.exit(1);
}

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  entries.join('\n') + '\n</urlset>\n';
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

if (waitingGuides.size) console.log(`build-site: NOTE — ${waitingGuides.size} guide card(s) still wait for their page: ${[...waitingGuides].join(', ')}`);
console.log(`build-site: OK — ${written} page(s)${EN_ONLY ? ' (EN only)' : ' in EN + HE'}, sitemap with ${entries.length} URL(s)`);
