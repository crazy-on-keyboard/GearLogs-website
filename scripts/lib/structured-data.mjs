// Structured data generated from the page's OWN words (SEO-1 · D5 · A, 2026-10-02 — the Director's pick: match PMOlikePRO).
// Nothing here is typed by hand: the FAQ markup is read from the FAQ page's items, a guide's breadcrumb from its own title,
// the product's description from its metadata — so the markup can never say something the page does not.
// `scripts/check-structured-data.mjs` parses every built page's JSON-LD and compares it with the visible text again.
import { SITE_ORIGIN } from '../../src/i18n.mjs';

/** The named entities the bodies write (the house style's set); `check:ld` refuses a page whose markup still carries one. */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', rsaquo: '\u203a', lsaquo: '\u2039', middot: '\u00b7', times: '\u00d7', minus: '\u2212', rarr: '\u2192', larr: '\u2190', copy: '\u00a9', shy: '' };
/** The visible text of a fragment of HTML: tags dropped, entities decoded, whitespace folded. */
export function visibleText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every question and answer on the FAQ page, as the reader sees them. */
export function faqItems(bodyHtml) {
  return [...bodyHtml.matchAll(/<h2 class="faq-q">([\s\S]*?)<\/h2>\s*<p class="faq-a">([\s\S]*?)<\/p>/g)].map((m) => ({ question: visibleText(m[1]), answer: visibleText(m[2]) }));
}

/** FAQPage: one Question per item, in the page's order. */
export function faqPageLd(bodyHtml, lang) {
  const items = faqItems(bodyHtml);
  if (!items.length) throw new Error(`structured-data: the ${lang} FAQ page has no faq-item blocks`);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: items.map((it) => ({ '@type': 'Question', name: it.question, acceptedAnswer: { '@type': 'Answer', text: it.answer } })),
  };
}

/** The product: what GearLogs is, from the product page's own metadata — no prices (Paddle's live amounts are not retyped). */
export function softwareApplicationLd(head, lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GearLogs',
    url: lang === 'he' ? `${SITE_ORIGIN}/he/product` : `${SITE_ORIGIN}/product`,
    description: head.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: ['en', 'he'],
    publisher: { '@type': 'Organization', name: 'GearLogs', url: `${SITE_ORIGIN}/` },
  };
}

/** A guide's place: Home › Guides › this guide — the names are the pages' own titles. */
export function guideBreadcrumbLd(page, lang, { guidesTitle, guideTitle }) {
  const home = lang === 'he' ? `${SITE_ORIGIN}/he/` : `${SITE_ORIGIN}/`;
  const guides = lang === 'he' ? `${SITE_ORIGIN}/he/guides` : `${SITE_ORIGIN}/guides`;
  const here = lang === 'he' ? `${SITE_ORIGIN}/he${page.path}` : `${SITE_ORIGIN}${page.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GearLogs', item: home },
      { '@type': 'ListItem', position: 2, name: guidesTitle, item: guides },
      { '@type': 'ListItem', position: 3, name: guideTitle, item: here },
    ],
  };
}

/** The page's own <h1> text (every page opens with its band title). */
export function pageTitleOf(bodyHtml) {
  const m = bodyHtml.match(/<h1 class="band-title">([\s\S]*?)<\/h1>/);
  return m ? visibleText(m[1].replace(/<br\s*\/?>/g, ' ')) : null;
}

/** Everything a page gets beyond the organisation block, as JSON strings for the head. */
export function generatedLd(page, lang, { bodyHtml, head, guidesBody }) {
  const blocks = [];
  if (page.slug === 'faq') blocks.push(faqPageLd(bodyHtml, lang));
  if (page.slug === 'product') blocks.push(softwareApplicationLd(head, lang));
  if (page.slug.startsWith('guides/')) {
    const guideTitle = pageTitleOf(bodyHtml);
    const guidesTitle = pageTitleOf(guidesBody);
    if (!guideTitle || !guidesTitle) throw new Error(`structured-data: ${lang}:${page.slug} or the guides page has no band title`);
    blocks.push(guideBreadcrumbLd(page, lang, { guidesTitle, guideTitle }));
  }
  // `<` escaped so no answer can ever close the script element it travels in
  return blocks.map((b) => JSON.stringify(b).replace(/</g, '\\u003c'));
}
