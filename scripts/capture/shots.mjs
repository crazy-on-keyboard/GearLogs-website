// The shot list: every app picture the website shows. One entry = one picture per language, taken by ./capture.mjs.
// Each `run` drives the app by its own labels (never a remembered click position) and leaves the screen to be pictured;
// a screen is named by the app's dictionary key (`app.nav('tab_approvals')`), so the same shot works in English and Hebrew.
// `target` (a CSS selector) pictures one element instead of the whole window, and `clip` a rectangle the shot measures itself
// (from one element's top to another's bottom). Add a shot here, run `npm run capture`,
// and the site's picture is the app as it is today.
// Never pictured (the council's law): weapons — the Army demo's Weapons Vault tab stays out of every shot.

/** @typedef {{ id: string, alt: { en: string, he: string }, theme?: 'office' | 'light' | 'dark' | 'army' | 'medical', target?: string, settle?: number,
 *    run: (app: any, lang: string) => Promise<void>, after?: (app: any, lang: string) => Promise<void>,
 *    clip?: (app: any) => Promise<{ x: number, y: number, width: number, height: number }> }} Shot */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** My Gear, the staff page (served locally on :4175); its session lives in the same capture window as the demo account's. */
const STAFF = process.env.CAPTURE_STAFF ?? 'http://localhost:4175';

/** Open My Gear in the language of the run (the page keeps its own language switch) and wait for its rail. */
async function openMyGear(app, lang) {
  if (!app.page.url().startsWith(STAFF)) await app.page.goto(STAFF, { waitUntil: 'load' });
  await app.page.waitForTimeout(1500);
  if (!(await app.page.evaluate(() => document.documentElement.lang || 'en')).startsWith(lang)) {
    await app.page.getByRole('button', { name: lang === 'he' ? 'HE' : 'EN', exact: true }).first().click();
    await app.page.waitForFunction((w) => (document.documentElement.lang || 'en').startsWith(w), lang);
  }
  const rail = (key) => app.t(key).then((w) => app.page.getByRole('option', { name: new RegExp(`^${escapeRe(w)}`, 'i') }).first());
  await (await rail('staff_rail_gear')).waitFor({ timeout: 15_000 });
  return rail;
}

/** The demo's own names in each workspace (the Hebrew Logistics demo is the same workspace in Hebrew words). */
const NAMES = {
  serialItem: { en: 'Barcode Scanner', he: 'סורק ברקוד' },
  serialTab: { en: 'Fleet', he: 'צי רכב' },
  homeTab: { en: 'Warehouse', he: 'מחסן' },
  team: { en: 'Warehouse — Days', he: 'מחסן — יום' },
  plainItem: { en: 'Hand Truck', he: 'עגלת יד' },
  person: { en: 'Carlos Mendez', he: 'יוסי אברהם' },
};

/** A board control by its label "<word> — [role ]<name>" (a person's label carries the role before the name). */
const control = async (app, key, name) => app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t(key))} — (.+ )?${escapeRe(name)}$`) }).first();

/** Bring an element to the top of its scrolling pane, with a little room above it. */
const toTop = (locator) => locator.evaluate((el) => {
  el.scrollIntoView({ block: 'start' });
  let p = el.parentElement;
  while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
  p?.scrollBy(0, -28);
});

/** Open a board card by its own "Show details" button and bring the whole open card into view. */
async function openCard(app, name) {
  await (await control(app, 'show_details', name)).click();
  await app.idle(900);
  await toTop(await control(app, 'tooltip_edit', name));
  await app.idle(400);
}
const closeCard = async (app, name) => { await (await control(app, 'hide_details', name)).click().catch(() => {}); await app.idle(300); };

/** @type {Shot[]} */
export default [
  {
    id: 'board',
    alt: { en: 'The Logistics board: every item with its stock, who holds it and its storage limit', he: 'לוח הלוגיסטיקה: כל פריט עם המלאי, מי מחזיק בו ומגבלת האחסון' },
    run: async (app) => { await app.nav('tab_logistics'); },
  },
  {
    id: 'registry',
    alt: { en: 'The Registry: every serial-numbered unit, its condition and who holds it', he: 'המרשם: כל יחידה עם מספר סידורי, מצבה ומי מחזיק בה' },
    run: async (app) => { await app.nav('tab_registry'); },
  },
  {
    id: 'personnel',
    alt: { en: 'The Personnel board: every person with the gear they hold', he: 'לוח כוח האדם: כל אדם עם הציוד שבידיו' },
    run: async (app) => { await app.nav('tab_personnel'); },
  },
  {
    id: 'approvals',
    alt: { en: 'Approvals: every receipt by state — waiting, signed, disputed, confirmed on behalf, cancelled, expired', he: 'אישורים: כל אישור מסירה לפי מצב — ממתין, נחתם, בערעור, אושר בשם האדם, בוטל, פג תוקף' },
    run: async (app) => { await app.nav('tab_approvals'); },
  },
  {
    id: 'dashboard',
    alt: { en: 'The dashboard: stock, hand-outs, receipts and kits at a glance', he: 'לוח המחוונים: מלאי, מסירות, קבלות וערכות במבט אחד' },
    run: async (app) => { await app.nav('tab_analytics'); },
    settle: 1500,
  },
  {
    id: 'approvals-receipt',
    alt: { en: 'A receipt the person disputed and a manager confirmed on their behalf: the lines named in the dispute, the timeline and both notes', he: 'אישור מסירה שהאדם ערער עליו ומנהל אישר בשמו: השורות שצוינו בערעור, ציר הזמן ושתי ההערות' },
    run: async (app) => {
      await app.nav('tab_approvals');
      const onBehalf = new RegExp(`^(${escapeRe(await app.t('apr_tab_on_behalf'))}|${escapeRe(await app.t('apr_state_on_behalf'))})`, 'i');
      await app.page.getByRole('option', { name: onBehalf }).first().click();
      await app.idle(800);
      // the demo's resolved dispute (the same receipt in both workspaces: Jonas Weber · יונתן ויס)
      await app.page.getByRole('option', { name: /HO-005/ }).first().click();
      await app.idle(1200);
      await app.page.getByRole('button', { name: await app.t('apr_words_read'), exact: true }).first().click();
      await app.idle(1000);
    },
  },
  {
    id: 'item-card',
    alt: { en: 'An item opened on the board: its serial-numbered units, who holds each one, its condition and its history', he: 'פריט פתוח בלוח: היחידות עם מספר סידורי, מי מחזיק בכל אחת, המצב וההיסטוריה' },
    run: async (app, lang) => {
      await app.nav('tab_logistics');
      await app.page.getByRole('button', { name: NAMES.serialTab[lang], exact: true }).first().click();
      await app.idle(800);
      await openCard(app, NAMES.serialItem[lang]);
    },
    after: async (app, lang) => {
      await closeCard(app, NAMES.serialItem[lang]);
      await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
      await app.idle(500);
    },
  },
  {
    id: 'person-card',
    alt: { en: 'A person opened on the Personnel board: everything they hold, their kits and their history', he: 'אדם פתוח בלוח כוח האדם: כל מה שבידיו, הערכות וההיסטוריה' },
    run: async (app, lang) => { await app.nav('tab_personnel'); await openCard(app, NAMES.person[lang]); },
    after: async (app, lang) => closeCard(app, NAMES.person[lang]),
  },
  {
    id: 'handout-window',
    alt: { en: 'Handing an item to several people at once: pick the people, set how many each gets, see the stock after', he: 'ניפוק פריט לכמה אנשים בבת אחת: בוחרים אנשים, קובעים כמה כל אחד מקבל ורואים את המלאי אחרי' },
    run: async (app, lang) => {
      await app.nav('tab_logistics');
      await (await control(app, 'assign_item', NAMES.plainItem[lang])).click();
      await app.idle(600);
      await app.page.getByRole('button', { name: await app.t('handout_more_people'), exact: true }).first().click();
      const dialog = app.page.getByRole('dialog').last();
      await dialog.waitFor();
      // a plausibly filled window: one team ticked, so the plan shows each person's quantity and the stock after (nothing is sent)
      await dialog.getByRole('checkbox', { name: new RegExp(escapeRe(NAMES.team[lang])) }).first().check();
      await app.idle(900);
    },
    // nothing is handed out: the window closes the way a person would close it
    after: async (app) => { await app.page.keyboard.press('Escape'); await app.idle(400); },
  },
  {
    id: 'dashboard-approvals',
    alt: { en: 'The dashboard\'s receipt cards: receipts by state, who is waiting to sign, and how fast people confirm', he: 'כרטיסי הקבלות בלוח המחוונים: קבלות לפי מצב, מי ממתין לחתימה וכמה מהר מאשרים' },
    run: async (app) => {
      await app.nav('tab_analytics');
      await app.idle(800);
      await toTop(app.page.getByText(await app.t('preset_apr_state'), { exact: true }).first());
    },
    settle: 1500,
  },
  {
    // /product "how much is in stock, how full, what to reorder": the demo dashboard's own stock cards (demo/dashboard.ts)
    id: 'dashboard-stock',
    alt: { en: 'The dashboard\'s stock cards: storage fill against capacity, the low-stock list, what is over capacity and how much more fits', he: 'כרטיסי המלאי בלוח המחוונים: מילוי האחסון מול הקיבולת, רשימת המלאי הנמוך, מה מעל הקיבולת וכמה עוד נכנס' },
    run: async (app) => {
      await app.nav('tab_analytics');
      await app.idle(800);
      await toTop(app.page.getByText(await app.t('w_title_storage_fill'), { exact: true }).first());
    },
    settle: 1500,
  },
  {
    // /product "warranty" and "broken": the Registry cards — units in repair and the warranties and contracts about to end
    id: 'dashboard-registry',
    alt: { en: 'The dashboard\'s Registry cards: units that need attention, units by status, units in repair and the warranties and contracts that have ended or are about to', he: 'כרטיסי המרשם בלוח המחוונים: יחידות שדורשות טיפול, יחידות לפי סטטוס, יחידות בתיקון ואחריות וחוזים שהסתיימו או עומדים להסתיים' },
    run: async (app) => {
      await app.nav('tab_analytics');
      await app.idle(800);
      await toTop(app.page.getByText(await app.t('w_title_reg_attention'), { exact: true }).first());
    },
    settle: 1500,
  },
  {
    id: 'logs',
    alt: { en: 'System logs: every action, who did it and when', he: 'יומני המערכת: כל פעולה, מי ביצע אותה ומתי' },
    run: async (app) => { await app.nav('tab_logs'); },
  },
  {
    id: 'mygear',
    alt: { en: 'My Gear, the page each person signs in to: everything they hold, their notices and their history', he: 'הציוד שלי, הדף שכל אדם נכנס אליו: כל מה שבידיו, ההודעות וההיסטוריה' },
    run: async (app, lang) => {
      const rail = await openMyGear(app, lang);
      await (await rail('staff_rail_gear')).click();
      await app.page.waitForTimeout(1000);
    },
  },
  {
    id: 'mygear-sign',
    alt: { en: 'A person reads their receipt on My Gear and signs it, or says what is wrong', he: 'אדם קורא את אישור המסירה שלו ב״הציוד שלי״ וחותם עליו, או מציין מה לא בסדר' },
    run: async (app, lang) => {
      const rail = await openMyGear(app, lang);
      await (await rail('staff_rail_approvals')).click();
      await app.page.waitForTimeout(900);
      // the test person's own receipt (a real hand-out, never demo data — demo people cannot sign in)
      await app.page.getByText('HO-048', { exact: true }).first().click();
      await app.page.waitForTimeout(1200);
    },
    after: async (app) => app.backToApp(),
  },
  {
    // the same receipt, pictured close: the panel from its title down to the question the person answers (the frame's inset)
    id: 'mygear-receipt',
    alt: { en: 'A receipt on My Gear: the items, and the question the person answers — I received these, or something is wrong', he: 'אישור מסירה ב״הציוד שלי״: הפריטים, והשאלה שהאדם עונה עליה — קיבלתי אותם, או שמשהו לא בסדר' },
    run: async (app, lang) => {
      const rail = await openMyGear(app, lang);
      await (await rail('staff_rail_approvals')).click();
      await app.page.waitForTimeout(900);
      await app.page.getByText('HO-048', { exact: true }).first().click();
      await app.page.waitForTimeout(1200);
    },
    clip: async (app) => {
      const card = app.page.getByRole('group', { name: await app.t('staff_apr_decision'), exact: true }).first();
      await card.waitFor();
      return card.evaluate((el) => {
        const pane = el.parentElement.parentElement.getBoundingClientRect(); // the decision card sits in the receipt pane's body
        const c = el.getBoundingClientRect();
        return { x: pane.left, y: pane.top, width: pane.width, height: c.bottom - pane.top + 12 };
      });
    },
    after: async (app) => app.backToApp(),
  },
];
