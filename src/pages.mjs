// Structural registry of every bilingual page. This file is STRUCTURE only:
//   - head text (title/description/OG/Twitter) lives in src/meta/{en,he}.json
//   - body HTML lives in src/bodies/<slug>.<lang>.html
//   - JSON-LD lives in src/bodies/<slug>.jsonld.<lang>.json
// The build (scripts/build-site.mjs) merges these by slug.
//
// Unlisted pages (Stage 2): /pay (English only — Paddle's checkout) and the 404 (both languages: Cloudflare Pages serves
// the nearest 404.html, so /he/404.html answers every missing Hebrew address) carry `sitemap: null` — no sitemap entry,
// no canonical or hreflang, no language switch.

const NOTE_SLUGS = [
  'track-who-has-equipment',
  'equipment-shrinkage',
  'inventory-spreadsheet-limits',
  'chain-of-custody-equipment',
  'serial-number-tracking',
  'equipment-write-offs',
  'equipment-warranty-tracking',
  'software-that-explains-itself',
  'the-button-that-says-no',
  'storage-capacity-held-gear',
  'a-column-is-not-a-question',
];

// Guides with their own page (the Director's ask: guides reworked — steps with space, a real screen per step).
const GUIDE_SLUGS = ['approvals'];
const guide = (name) => ({
  slug: `guides/${name}`,
  path: `/guides/${name}`,
  chrome: 'full',
  footer: 'full',
  activeNav: '/guides',
  bilingual: true,
  sitemap: { changefreq: 'monthly', priority: '0.6' },
  scripts: ['/js/motion.js', '/js/lightbox.js'],
  opts: { ogType: 'article', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
});

const article = (name) => ({
  slug: `notes/${name}`,
  path: `/notes/${name}`,
  chrome: 'full',
  footer: 'full',
  activeNav: '/notes',
  bilingual: true,
  sitemap: { changefreq: 'monthly', priority: '0.6' },
  scripts: [],
  opts: { ogType: 'article', twitterCard: 'summary', ogImage: false, jsonld: true },
});

export const PAGES = [
  {
    slug: 'index', path: '/', chrome: 'full', footer: 'full', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'weekly', priority: '1.0' },
    scripts: ['/js/motion.js', '/js/lightbox.js'],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    // Stage 2 (2026-09-27): how GearLogs works, section by section, every screen a real capture; the old home's capability
    // and security cards live here now, word for word (nothing the site said was lost)
    slug: 'product', path: '/product', chrome: 'full', footer: 'full', activeNav: '/product', bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.9' }, scripts: ['/js/motion.js', '/js/lightbox.js'],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'pricing', path: '/pricing', chrome: 'full', footer: 'full', activeNav: '/pricing', bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.8' }, scripts: ['/js/pricing.js'],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'guides', path: '/guides', chrome: 'full', footer: 'full', activeNav: '/guides', bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.7' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'faq', path: '/faq', chrome: 'full', footer: 'full', activeNav: '/faq', bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.7' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'notes', path: '/notes', chrome: 'full', footer: 'full', activeNav: '/notes', bilingual: true,
    sitemap: { changefreq: 'weekly', priority: '0.7' }, scripts: ['/js/motion.js'],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: true },
  },
  {
    // Stage 1 (2026-09-26): the ONE contact form. The only page that loads Turnstile and posts to the contact
    // function, so the relaxed CSP in public/_headers covers its four paths alone.
    slug: 'contact', path: '/contact', chrome: 'full', footer: 'full', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.6' },
    scripts: ['/js/contact.js', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', attrs: 'async defer' }],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'changelog', path: '/changelog', chrome: 'full', footer: 'full', activeNav: '/changelog', bilingual: true,
    sitemap: { changefreq: 'weekly', priority: '0.6' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'privacy', path: '/privacy', chrome: 'stripped', footer: 'minimal', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.3' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'terms', path: '/terms', chrome: 'stripped', footer: 'minimal', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.3' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: 'refunds', path: '/refunds', chrome: 'stripped', footer: 'minimal', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.3' }, scripts: [],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  ...NOTE_SLUGS.map(article),
  ...GUIDE_SLUGS.map(guide),
  {
    slug: 'pay', path: '/pay', chrome: 'minimal', footer: 'minimal', activeNav: null, bilingual: false, sitemap: null,
    // Paddle.js v2 is the ONLY external script here; it reads ?_ptxn= and opens the overlay checkout itself (headers.mjs PAY_CSP)
    scripts: [{ src: 'https://cdn.paddle.com/paddle/v2/paddle.js', attrs: 'defer' }, '/js/pay.js'],
    opts: { robots: 'noindex, nofollow', canonical: false, twitterCard: 'summary_large_image', ogImage: true, jsonld: false },
  },
  {
    slug: '404', path: '/404', chrome: 'full', footer: 'full', activeNav: null, bilingual: true, sitemap: null, scripts: [],
    opts: { robots: 'noindex', canonical: false, jsonld: false },
  },
];
