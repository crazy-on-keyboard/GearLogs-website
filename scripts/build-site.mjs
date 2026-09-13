#!/usr/bin/env node
// GearLogs marketing site generator. Renders every page in English and Hebrew from ONE
// chrome source (src/chrome.mjs) + per-language head metadata (src/meta/*.json), body
// fragments (src/bodies/<slug>.<lang>.html) and JSON-LD (src/bodies/<slug>.jsonld.<lang>.json),
// writing English to dist/ and Hebrew to dist/he/. Then it copies the static assets from
// public/ and writes sitemap.xml with reciprocal hreflang alternates.
//
//   node scripts/build-site.mjs            full build (fails if any page lacks Hebrew)
//   node scripts/build-site.mjs --en-only  English only (for verifying EN output pre-translation)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { PAGES } from '../src/pages.mjs';
import { LANGS, SITE_ORIGIN } from '../src/i18n.mjs';
import { renderPage, canonicalUrl } from '../src/chrome.mjs';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
const EN_ONLY = process.argv.includes('--en-only');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
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

const langs = EN_ONLY ? ['en'] : LANGS;
let written = 0;
for (const page of PAGES) {
  for (const lang of langs) {
    const p = { ...page, head: { en: meta.en[page.slug], he: meta.he[page.slug] } };
    p.jsonld = { en: loadJsonld(p, 'en'), he: loadJsonld(p, 'he') };
    const body = readFileSync(bodyPath(page.slug, lang), 'utf8');
    const html = renderPage(p, lang, body);
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
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  entries.join('\n') + '\n</urlset>\n';
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

console.log(`build-site: OK — ${written} page(s)${EN_ONLY ? ' (EN only)' : ' in EN + HE'}, sitemap with ${entries.length} URL(s)`);
