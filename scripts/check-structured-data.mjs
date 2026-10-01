#!/usr/bin/env node
// Every built page's JSON-LD parses and says what the page shows (SEO-1 · D5 · A, 2026-10-02): the FAQ markup's questions
// and answers ARE the page's items, a guide's breadcrumb ends in the guide's own title, the product's description is the
// page's description, the organisation block stands on every listed page — a hand edit or a parser break fails the check.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/pages.mjs';
import { faqItems, pageTitleOf } from './lib/structured-data.mjs';

const DIST = join(process.cwd(), 'dist');
const fileOf = (page, lang) => join(DIST, lang === 'he' ? 'he' : '', page.path === '/' ? 'index.html' : `${page.path}.html`);
const blocksOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const decodeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");

const problems = [];
let pages = 0, faq = 0, crumbs = 0, apps = 0, parsed = 0;
for (const page of PAGES.filter((p) => p.sitemap)) {
  for (const lang of page.bilingual ? ['en', 'he'] : ['en']) {
    const file = fileOf(page, lang);
    if (!existsSync(file)) { problems.push(`${lang}:${page.slug} was not built`); continue; }
    const html = readFileSync(file, 'utf8');
    const where = `${lang}:${page.slug}`;
    pages++;
    const data = [];
    for (const raw of blocksOf(html)) {
      try { data.push(JSON.parse(raw)); parsed++; } catch (e) { problems.push(`${where}: a JSON-LD block does not parse — ${e.message.slice(0, 80)}`); }
    }
    const types = data.flatMap((d) => (d['@graph'] ? d['@graph'] : [d])).map((d) => d['@type']);
    if (!types.includes('Organization')) problems.push(`${where}: no Organization block`);
    const bodyH1 = pageTitleOf(html);
    if (page.slug === 'faq') {
      const ld = data.find((d) => d['@type'] === 'FAQPage');
      const shown = faqItems(html);
      if (!ld) problems.push(`${where}: no FAQPage block`);
      else {
        faq++;
        const said = ld.mainEntity.map((q) => ({ question: q.name, answer: q.acceptedAnswer?.text }));
        if (said.length !== shown.length) problems.push(`${where}: FAQPage has ${said.length} questions, the page shows ${shown.length}`);
        said.forEach((q, i) => {
          if (!shown[i] || shown[i].question !== q.question || shown[i].answer !== q.answer) problems.push(`${where}: FAQPage item ${i + 1} differs from the page ("${(q.question ?? '').slice(0, 50)}")`);
        });
        if (ld.inLanguage !== lang) problems.push(`${where}: FAQPage says inLanguage ${ld.inLanguage}`);
      }
    } else if (data.some((d) => d['@type'] === 'FAQPage')) problems.push(`${where}: a FAQPage block on a page that is not the FAQ`);
    if (page.slug === 'product') {
      const ld = data.find((d) => d['@type'] === 'SoftwareApplication');
      const description = attr(html, /<meta name="description" content="([^"]*)">/);
      if (!ld) problems.push(`${where}: no SoftwareApplication block`);
      else {
        apps++;
        if (ld.description !== decodeAttr(description ?? '')) problems.push(`${where}: SoftwareApplication's description is not the page's`);
        if (ld.name !== 'GearLogs' || ld.applicationCategory !== 'BusinessApplication' || ld.operatingSystem !== 'Web') problems.push(`${where}: SoftwareApplication's facts drifted`);
        if (ld.offers) problems.push(`${where}: SoftwareApplication carries an offer — prices are Paddle's live amounts, never retyped here`);
      }
    }
    if (page.slug.startsWith('guides/')) {
      const ld = data.find((d) => d['@type'] === 'BreadcrumbList');
      if (!ld) problems.push(`${where}: no BreadcrumbList block`);
      else {
        crumbs++;
        const items = ld.itemListElement ?? [];
        const last = items[items.length - 1];
        if (items.length !== 3 || last?.name !== bodyH1) problems.push(`${where}: the breadcrumb does not end in the page's own title`);
        const guidesH1 = pageTitleOf(readFileSync(fileOf(PAGES.find((p) => p.slug === 'guides'), lang), 'utf8'));
        if (items[1]?.name !== guidesH1) problems.push(`${where}: the breadcrumb's second step is not the guides page's title`);
        const canonical = attr(html, /<link rel="canonical" href="([^"]*)">/);
        if (last?.item !== canonical) problems.push(`${where}: the breadcrumb's last address is not the page's canonical`);
      }
    }
  }
}
const guidePages = PAGES.filter((p) => p.slug.startsWith('guides/')).length * 2;
if (crumbs !== guidePages) problems.push(`${crumbs} breadcrumb blocks for ${guidePages} guide pages`);
if (faq !== 2) problems.push(`${faq} FAQPage blocks (expected the EN and HE FAQ)`);
if (apps !== 2) problems.push(`${apps} SoftwareApplication blocks (expected the EN and HE product page)`);
if (problems.length) {
  console.error(`check-structured-data: ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`check-structured-data: OK — ${pages} pages, ${parsed} JSON-LD blocks parse; FAQPage ×${faq} says the page's ${faqItems(readFileSync(fileOf(PAGES.find((p) => p.slug === 'faq'), 'en'), 'utf8')).length} items, BreadcrumbList ×${crumbs}, SoftwareApplication ×${apps}`);
