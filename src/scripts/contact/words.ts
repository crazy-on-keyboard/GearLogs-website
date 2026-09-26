// Every sentence the contact form SAYS (the fixed labels live in the page bodies, one per language).
// The wording is the Director's approved form spec (SYNTHESIS §3.5–§3.9, 2026-09-26): calm, specific,
// no "invalid", "sorry" or "please". A {placeholder} is filled with an isolated value by form.ts,
// never by string pasting, so a domain or a count always reads in its own direction.
// The Hebrew is a native draft; every Hebrew sentence starts with a Hebrew word.

import type { FieldKey, FromPage, Reason } from './rules';

export type Lang = 'en' | 'he';

interface Words {
  reasons: Record<Reason, string>;
  from: Record<FromPage, string>;
  noteNone: string;
  notePage: string;
  noteButton: string;
  buttonName: string;
  messageHelp: Record<Reason | 'none', string>;
  optional: string;
  required: string;
  errors: Record<FieldKey, Record<string, string>>;
  wayOut: string;
  checkField: string;
  typo: string;
  send: string;
  sending: string;
  countOne: string;
  countMany: string;
  goFirst: string;
  waiting: string;
  stillWaiting: string;
  checkFailed: string;
  rateLimited: string;
  notSent: string;
  errorPrefix: string;
}

export const WORDS: Record<Lang, Words> = {
  en: {
    reasons: {
      access: 'Request access', purchase: 'Purchasing', product: 'How it works', security: 'Security',
      legal: 'Legal and privacy', partner: 'Partnership or reselling', other: 'Something else',
    },
    from: {
      header: 'the page header', home: 'the home page', pricing: 'the pricing page', guides: 'the guides', faq: 'the FAQ',
      changelog: 'the changelog', notes: 'Field Notes', privacy: 'the Privacy Policy', terms: 'the Terms of Service',
      refunds: 'the Refund Policy', security: 'the security page', product: 'the product page', compare: 'the comparisons',
      about: 'the About page', 'for-organisations': 'Medium and large organisations', 'for-army': 'Army and defence units',
      'for-hospitals': 'Hospitals and clinics', 'for-emergency': 'Emergency and municipal services', 'for-depots': 'Logistics depots',
    },
    noteNone: 'Choose one so we answer the right question.',
    notePage: 'Chosen because you came from {p}. You can change it.',
    noteButton: 'Chosen because you pressed {p}. You can change it.',
    buttonName: 'Request access',
    messageHelp: {
      access: 'What do you issue, and to how many people? A line or two is enough.',
      purchase: 'How many accounts do you expect, and monthly or yearly?',
      product: 'What would you like to understand?',
      security: 'What do you need to know? To report a vulnerability, write to ops@gearlogs.com.',
      legal: 'Which document or request is this about?',
      partner: 'Who do you serve, and where?',
      other: 'Tell us what this is about (at least 20 characters).',
      none: 'A line or two is enough.',
    },
    optional: '(optional)',
    required: '(required)',
    errors: {
      reason: { missing: 'Choose what your message is about.' },
      first_name: {
        empty: 'Enter your first name.',
        chars: 'First name: letters, spaces, apostrophes, periods and hyphens only',
        long: 'First name must be 60 characters or fewer',
        repeat: 'Check your first name: one character repeats five or more times in a row.',
      },
      last_name: {
        empty: 'Enter your last name.',
        chars: 'Last name: letters, spaces, apostrophes, periods and hyphens only',
        long: 'Last name must be 80 characters or fewer',
        repeat: 'Check your last name: one character repeats five or more times in a row.',
        name_long: 'First and last name together must be 120 characters or fewer',
      },
      email: {
        empty: 'Enter your work email.',
        shape: 'Enter an email like name@company.com',
        personal: '{d} is a personal address. Use your work email so we know which organisation you are with.',
        temporary: '{d} is a temporary inbox, so our reply would not reach you later. Use your work email.',
        not_found: 'We could not find mail service for {d}. Check the part after @.',
        own: 'That is a GearLogs address. Enter your own work email.',
        noreply: 'We cannot reply to a no-reply address. Enter one you read.',
      },
      company: {
        empty: 'Enter your organisation’s name.',
        short: 'Organisation needs at least 2 characters',
        long: 'Organisation must be 120 characters or fewer',
        repeat: 'Check the organisation name: one character repeats five or more times in a row.',
        chars: 'Use letters, numbers and ordinary punctuation in the organisation name.',
      },
      job_title: {
        long: 'Job title must be 80 characters or fewer',
        repeat: 'Check the job title: one character repeats five or more times in a row.',
        chars: 'Use letters, numbers and ordinary punctuation in the job title.',
      },
      company_website: {
        shape: 'Enter a web address like acme.com',
        scheme: 'Enter an address that starts with http or https, or just acme.com',
        long: 'The address must be 200 characters or fewer',
      },
      message: {
        short: 'Tell us what this is about in at least 20 characters. You have {n}.',
        long: '{n} characters over the limit — nothing was cut',
        links: 'Up to 3 links in a message. This one has {n}.',
      },
    },
    wayOut: 'No work email? Write to {m} from any address.',
    checkField: 'Check this field.',
    typo: 'Did you mean {s}?',
    send: 'Send request',
    sending: 'Sending…',
    countOne: '1 field needs fixing',
    countMany: '{n} fields need fixing',
    goFirst: 'Go to the first',
    waiting: 'Waiting for the security check…',
    stillWaiting: 'The security check is still running — try again in a moment.',
    checkFailed: 'The security check did not pass. It has restarted — send again.',
    rateLimited: 'Too many requests from this connection. Try again in about 10 minutes, or write to {m}.',
    notSent: 'We could not send this. Everything you typed is still here. Try again in a minute, or write to {m}.',
    errorPrefix: 'Error:',
  },
  he: {
    reasons: {
      access: 'בקשת גישה', purchase: 'רכישה', product: 'איך זה עובד', security: 'אבטחה',
      legal: 'משפטי ופרטיות', partner: 'שיתוף פעולה או הפצה', other: 'משהו אחר',
    },
    from: {
      header: 'ראש העמוד', home: 'דף הבית', pricing: 'תמחור', guides: 'מדריכים', faq: 'שאלות נפוצות',
      changelog: 'יומן שינויים', notes: 'רשומות מהשטח', privacy: 'מדיניות הפרטיות', terms: 'תנאי השימוש',
      refunds: 'מדיניות ההחזרים', security: 'אבטחה', product: 'המוצר', compare: 'השוואות', about: 'אודות',
      'for-organisations': 'ארגונים בינוניים וגדולים', 'for-army': 'יחידות צבא וביטחון', 'for-hospitals': 'בתי חולים ומרפאות',
      'for-emergency': 'שירותי חירום ורשויות מקומיות', 'for-depots': 'מחסנים לוגיסטיים',
    },
    noteNone: 'בחרו נושא, כדי שנענה בדיוק על מה ששאלתם.',
    notePage: 'נבחר לפי העמוד שממנו הגעתם: {p}. אפשר לבחור נושא אחר.',
    noteButton: 'נבחר כי לחצתם על {p}. אפשר לבחור נושא אחר.',
    buttonName: 'בקשת גישה',
    messageHelp: {
      access: 'מה אתם מנפיקים, ולכמה אנשים? שורה או שתיים מספיקות.',
      purchase: 'כמה חשבונות אתם צופים, ובחיוב חודשי או שנתי?',
      product: 'מה תרצו להבין?',
      security: 'מה תרצו לדעת? לדיווח על חולשת אבטחה כתבו אל ops@gearlogs.com.',
      legal: 'באיזה מסמך או בקשה מדובר?',
      partner: 'את מי אתם משרתים, והיכן?',
      other: 'ספרו לנו במה מדובר (לפחות 20 תווים).',
      none: 'שורה או שתיים מספיקות.',
    },
    optional: '(לא חובה)',
    required: '(חובה)',
    errors: {
      reason: { missing: 'בחרו את נושא הפנייה.' },
      first_name: {
        empty: 'הזינו שם פרטי.',
        chars: 'שם פרטי: אותיות, רווחים, גרשיים, נקודות ומקפים בלבד',
        long: 'שם פרטי יכול להכיל עד 60 תווים',
        repeat: 'בדקו את השם הפרטי: אותו תו חוזר חמש פעמים או יותר ברצף.',
      },
      last_name: {
        empty: 'הזינו שם משפחה.',
        chars: 'שם משפחה: אותיות, רווחים, גרשיים, נקודות ומקפים בלבד',
        long: 'שם משפחה יכול להכיל עד 80 תווים',
        repeat: 'בדקו את שם המשפחה: אותו תו חוזר חמש פעמים או יותר ברצף.',
        name_long: 'שם פרטי ושם משפחה יחד יכולים להכיל עד 120 תווים',
      },
      email: {
        empty: 'הזינו אימייל ארגוני.',
        shape: 'הזינו אימייל כמו name@company.com',
        personal: 'כתובת ב־{d} היא כתובת פרטית. השתמשו באימייל הארגוני, כדי שנדע מאיזה ארגון אתם.',
        temporary: 'כתובת ב־{d} היא תיבה זמנית, ולכן התשובה שלנו לא תגיע אליכם בהמשך. השתמשו באימייל הארגוני.',
        not_found: 'לא מצאנו שירות דואר עבור {d}. בדקו את החלק שאחרי ה־@.',
        own: 'זו כתובת של GearLogs. הזינו את האימייל הארגוני שלכם.',
        noreply: 'לא נוכל להשיב לכתובת שאינה מקבלת דואר. הזינו כתובת שאתם קוראים.',
      },
      company: {
        empty: 'הזינו את שם הארגון.',
        short: 'שם הארגון צריך לפחות 2 תווים',
        long: 'שם הארגון יכול להכיל עד 120 תווים',
        repeat: 'בדקו את שם הארגון: אותו תו חוזר חמש פעמים או יותר ברצף.',
        chars: 'השתמשו באותיות, בספרות ובסימני פיסוק רגילים בשם הארגון.',
      },
      job_title: {
        long: 'תפקיד יכול להכיל עד 80 תווים',
        repeat: 'בדקו את התפקיד: אותו תו חוזר חמש פעמים או יותר ברצף.',
        chars: 'השתמשו באותיות, בספרות ובסימני פיסוק רגילים בתפקיד.',
      },
      company_website: {
        shape: 'הזינו כתובת אתר כמו acme.co.il',
        scheme: 'הזינו כתובת שמתחילה ב־http או https, או פשוט acme.co.il',
        long: 'הכתובת יכולה להכיל עד 200 תווים',
      },
      message: {
        short: 'ספרו לנו במה מדובר, לפחות 20 תווים. כתבתם {n}.',
        long: 'חורג ב־{n} תווים — דבר לא נחתך',
        links: 'עד 3 קישורים בהודעה. בהודעה הזו יש {n}.',
      },
    },
    wayOut: 'אין לכם אימייל ארגוני? כתבו אל {m} מכל כתובת.',
    checkField: 'בדקו את השדה הזה.',
    typo: 'אולי התכוונתם ל־{s}?',
    send: 'שליחת הבקשה',
    sending: 'שולח…',
    countOne: 'שדה אחד דורש תיקון',
    countMany: '{n} שדות דורשים תיקון',
    goFirst: 'אל הראשון',
    waiting: 'ממתינים לבדיקת האבטחה…',
    stillWaiting: 'בדיקת האבטחה עדיין רצה — נסו שוב בעוד רגע.',
    checkFailed: 'בדיקת האבטחה לא עברה. היא הופעלה מחדש — שלחו שוב.',
    rateLimited: 'יותר מדי בקשות מהחיבור הזה. נסו שוב בעוד כ־10 דקות, או כתבו אל {m}.',
    notSent: 'לא הצלחנו לשלוח. כל מה שכתבתם נשאר כאן. נסו שוב בעוד דקה, או כתבו אל {m}.',
    errorPrefix: 'שגיאה:',
  },
};
