// Shared bilingual "chrome" strings for the GearLogs marketing site — the header nav,
// footer, language toggle and the "view in Hebrew" banner. These are the strings that
// repeat on (almost) every page; page BODY copy lives in src/bodies/<slug>.<lang>.html.
//
// Hebrew is native, not a calque, and follows the app's own glossary (services/i18n in
// the app repo): כניסה לאפליקציה, יכולות, אבטחה, מדריכים, שאלות נפוצות. Hebrew renders RTL.

export const LANGS = ['en', 'he'];
export const DEFAULT_LANG = 'en';

export const SITE_ORIGIN = 'https://gearlogs.com';
export const APP_URL = 'https://app.gearlogs.com';

/** Text direction for a language. */
export const dirOf = (lang) => (lang === 'he' ? 'rtl' : 'ltr');

/** The public URL prefix for a language ('' for English at the root, '/he' for Hebrew). */
export const prefixOf = (lang) => (lang === 'he' ? '/he' : '');

// The eight primary nav items, in order. `key` is the string key; `href` is the target
// WITHOUT a language prefix (the renderer adds /he and turns "/#x" into "#x" on the home page).
export const NAV_ITEMS = [
  { key: 'nav_capabilities', href: '/#capabilities' },
  { key: 'nav_how', href: '/#how-it-works' },
  { key: 'nav_security', href: '/#security' },
  { key: 'nav_pricing', href: '/pricing' },
  { key: 'nav_guides', href: '/guides' },
  { key: 'nav_faq', href: '/faq' },
  { key: 'nav_notes', href: '/notes' },
  { key: 'nav_changelog', href: '/changelog' },
];

export const CHROME = {
  en: {
    html_lang: 'en',
    logo_aria: 'GearLogs home',

    nav_capabilities: 'Capabilities',
    nav_how: 'How It Works',
    nav_security: 'Security',
    nav_pricing: 'Pricing',
    nav_guides: 'Guides',
    nav_faq: 'FAQ',
    nav_notes: 'Field Notes',
    nav_changelog: 'Changelog',
    nav_home: 'Home',
    nav_contact: 'Contact',
    nav_cta: 'Launch App',

    // Language toggle — the link points at the OTHER language's copy of this page.
    lang_switch_to: 'עברית',
    lang_switch_aria: 'צפייה בעמוד זה בעברית / View this page in Hebrew',

    // Footer
    footer_by: 'by',
    footer_tagline: 'Software for the people who run things',
    footer_col_product: 'Product',
    footer_col_resources: 'Resources',
    footer_col_suite: 'RAQIOM Suite',
    footer_col_legal: 'Legal',
    footer_privacy: 'Privacy Policy',
    footer_terms: 'Terms of Service',
    footer_refunds: 'Refund Policy',
    footer_copyright: '&copy; RAQIOM. All rights reserved.',

    // "View in Hebrew" banner (shown to visitors detected as being in Israel, on EN pages)
    banner_msg: 'It looks like you&rsquo;re in Israel &mdash; view this page in Hebrew?',
    banner_cta: 'View in Hebrew',
    banner_dismiss: 'Dismiss',
    banner_dismiss_aria: 'Dismiss this message',
  },
  he: {
    html_lang: 'he',
    logo_aria: 'GearLogs — לדף הבית',

    nav_capabilities: 'יכולות',
    nav_how: 'איך זה עובד',
    nav_security: 'אבטחה',
    nav_pricing: 'תמחור',
    nav_guides: 'מדריכים',
    nav_faq: 'שאלות נפוצות',
    nav_notes: 'רשומות מהשטח',
    nav_changelog: 'יומן שינויים',
    nav_home: 'דף הבית',
    nav_contact: 'צור קשר',
    nav_cta: 'כניסה לאפליקציה',

    lang_switch_to: 'English',
    lang_switch_aria: 'View this page in English / צפייה בעמוד זה באנגלית',

    footer_by: 'מאת',
    footer_tagline: 'תוכנה לאנשים שמנהלים דברים',
    footer_col_product: 'המוצר',
    footer_col_resources: 'משאבים',
    footer_col_suite: 'מגוון RAQIOM',
    footer_col_legal: 'משפטי',
    footer_privacy: 'מדיניות פרטיות',
    footer_terms: 'תנאי שימוש',
    footer_refunds: 'מדיניות החזרים',
    footer_copyright: '&copy; RAQIOM. כל הזכויות שמורות.',

    banner_msg: 'נראה שאתם גולשים מישראל &mdash; לצפות בעמוד בעברית?',
    banner_cta: 'למעבר לעברית',
    banner_dismiss: 'סגירה',
    banner_dismiss_aria: 'סגירת ההודעה',
  },
};

/** Look up a chrome string for a language. */
export const t = (lang, key) => {
  const v = CHROME[lang]?.[key];
  if (v === undefined) throw new Error(`i18n: missing chrome key "${key}" for "${lang}"`);
  return v;
};
