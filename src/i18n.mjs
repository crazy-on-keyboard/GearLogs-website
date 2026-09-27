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

// The header bar (Stage 2, the approved Home Mock; Q15 · A): Product · Who it's for · Security · Pricing · a click-open Help
// menu. `href` is the target WITHOUT a language prefix (the renderer adds /he and turns "/#x" into "#x" on the home page).
// Pages that do not exist yet are never linked (F1 · A): "Who it's for" is the home's sector tiles until Stage 3.
export const NAV_ITEMS = [
  { key: 'nav_product', href: '/product' },
  { key: 'nav_who', href: '/#who' },
  { key: 'nav_security', href: '/#security' },
  { key: 'nav_pricing', href: '/pricing' },
  {
    key: 'nav_help',
    menu: [
      { key: 'nav_guides', href: '/guides' },
      { key: 'nav_faq', href: '/faq' },
      { key: 'nav_notes', href: '/notes' },
      { key: 'nav_changelog', href: '/changelog' },
    ],
  },
];

// The footer's link columns (the mock's, minus links to pages that do not exist yet — F1 · A).
export const FOOTER_COLUMNS = [
  { key: 'footer_col_product', links: [['nav_how', '/product'], ['nav_who', '/#who'], ['nav_security', '/#security'], ['nav_pricing', '/pricing']] },
  { key: 'footer_col_help', links: [['nav_guides', '/guides'], ['nav_faq', '/faq'], ['nav_notes', '/notes'], ['nav_changelog', '/changelog']] },
  { key: 'footer_col_legal', links: [['footer_privacy', '/privacy'], ['footer_terms', '/terms'], ['footer_refunds', '/refunds'], ['nav_contact', '/contact']] },
];

export const CHROME = {
  en: {
    html_lang: 'en',
    logo_aria: 'GearLogs home',
    skip_link: 'Skip to content',
    nav_aria: 'Main',

    nav_product: 'Product',
    nav_who: 'Who it’s for',
    nav_how: 'How it works',
    nav_security: 'Security',
    nav_pricing: 'Pricing',
    nav_help: 'Help',
    nav_guides: 'Guides',
    nav_faq: 'FAQ',
    nav_notes: 'Field Notes',
    nav_changelog: 'Changelog',
    nav_home: 'Home',
    nav_contact: 'Contact',
    nav_signin: 'Sign in',
    nav_request: 'Request access',

    // Language toggle — the link points at the OTHER language's copy of this page.
    lang_switch_to: 'עברית',
    lang_switch_aria: 'צפייה בעמוד זה בעברית / View this page in Hebrew',

    // Footer (the mock's words)
    footer_tagline: 'Custody records for the gear you hand out.',
    footer_col_product: 'Product',
    footer_col_help: 'Help',
    footer_col_legal: 'Legal',
    footer_privacy: 'Privacy Policy',
    footer_terms: 'Terms of Service',
    footer_refunds: 'Refund Policy',
    footer_made: 'GearLogs is made by RAQIOM',
    footer_facts: 'Invite-only &middot; Data in the EU (Frankfurt)',

    // "View in Hebrew" banner (shown to visitors detected as being in Israel, on EN pages)
    banner_msg: 'It looks like you&rsquo;re in Israel &mdash; view this page in Hebrew?',
    banner_cta: 'View in Hebrew',
    banner_dismiss: 'Dismiss',
    banner_dismiss_aria: 'Dismiss this message',
  },
  he: {
    html_lang: 'he',
    logo_aria: 'GearLogs — לדף הבית',
    skip_link: 'דילוג לתוכן',
    nav_aria: 'ראשי',

    nav_product: 'המוצר',
    nav_who: 'למי זה מתאים',
    nav_how: 'איך זה עובד',
    nav_security: 'אבטחה',
    nav_pricing: 'תמחור',
    nav_help: 'עזרה',
    nav_guides: 'מדריכים',
    nav_faq: 'שאלות נפוצות',
    nav_notes: 'רשומות מהשטח',
    nav_changelog: 'יומן שינויים',
    nav_home: 'דף הבית',
    nav_contact: 'צור קשר',
    nav_signin: 'כניסה',
    nav_request: 'בקשת גישה',

    lang_switch_to: 'English',
    lang_switch_aria: 'View this page in English / צפייה בעמוד זה באנגלית',

    footer_tagline: 'רישום החזקה לציוד שאתם מנפיקים.',
    footer_col_product: 'המוצר',
    footer_col_help: 'עזרה',
    footer_col_legal: 'משפטי',
    footer_privacy: 'מדיניות פרטיות',
    footer_terms: 'תנאי שימוש',
    footer_refunds: 'מדיניות החזרים',
    footer_made: 'GearLogs נוצר על ידי RAQIOM',
    footer_facts: 'בהזמנה בלבד &middot; הנתונים באיחוד האירופי (פרנקפורט)',

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
