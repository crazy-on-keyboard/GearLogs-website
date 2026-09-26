// Structural registry of every bilingual page. This file is STRUCTURE only:
//   - head text (title/description/OG/Twitter) lives in src/meta/{en,he}.json
//   - body HTML lives in src/bodies/<slug>.<lang>.html
//   - JSON-LD lives in src/bodies/<slug>.jsonld.<lang>.json
// The build (scripts/build-site.mjs) merges these by slug.
//
// EN-only / static pages (pay, 404, assets) are handled by the build directly, not here.

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

const article = (name) => ({
  slug: `notes/${name}`,
  path: `/notes/${name}`,
  chrome: 'full',
  footer: 'full',
  activeNav: '/notes',
  bilingual: true,
  sitemap: { changefreq: 'monthly', priority: '0.6' },
  scripts: ['/js/anim.js'],
  opts: { ogType: 'article', twitterCard: 'summary', ogImage: false, jsonld: true },
});

export const PAGES = [
  {
    slug: 'index', path: '/', chrome: 'full', footer: 'full', activeNav: null, bilingual: true,
    sitemap: { changefreq: 'weekly', priority: '1.0' },
    scripts: ['/js/anim.js', '/js/activity.js'],
    opts: { ogType: 'website', twitterCard: 'summary_large_image', ogImage: true, jsonld: false, logoPriority: true },
  },
  {
    slug: 'pricing', path: '/pricing', chrome: 'full', footer: 'full', activeNav: '/pricing', bilingual: true,
    sitemap: { changefreq: 'monthly', priority: '0.8' }, scripts: ['/js/anim.js', '/js/pricing.js'],
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
    sitemap: { changefreq: 'weekly', priority: '0.7' }, scripts: ['/js/anim.js'],
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
];
