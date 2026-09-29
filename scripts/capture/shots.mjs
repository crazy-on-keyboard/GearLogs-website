// The shot list: every app picture the website shows. One entry = one picture per language, taken by ./capture.mjs.
// Each `run` drives the app by its own labels (never a remembered click position) and leaves the screen to be pictured;
// a screen is named by the app's dictionary key (`app.nav('tab_approvals')`), so the same shot works in English and Hebrew.
// `target` (a CSS selector) pictures one element instead of the whole window, and `clip` a rectangle the shot measures itself
// (from one element's top to another's bottom); `marks` lists what a guide step points at (their boxes land in the manifest, and
// the site outlines them — they follow the app on every re-capture). Add a shot here (a guide's screens go in ./guides/), run
// `npm run capture`, and the site's picture is the app as it is today. Shared helpers and the demo's names: ./helpers.mjs.
// PRIVACY: the demo accounts are real sign-ins — a picture never shows a member's address. `hide` names what is made invisible
// for the picture (the member rows behind a window); the capture refuses any picture that would still show an address.
// Never pictured (the council's law): weapons — the Army demo's Weapons Vault tab stays out of every shot.

/** @typedef {'start' | 'end' | 'corner' | 'above' | 'below'} Side where a mark's number sits (scripts/lib/shots.mjs → badgeAt) */
/** @typedef {{ id: string, alt: { en: string, he: string }, theme?: 'office' | 'light' | 'dark' | 'army' | 'medical', target?: string, settle?: number,
 *    run: (app: any, lang: string) => Promise<void>, after?: (app: any, lang: string) => Promise<void>,
 *    clip?: (app: any) => Promise<{ x: number, y: number, width: number, height: number }>,
 *    marks?: (app: any, lang: string) => Promise<Array<any | any[] | { at: any | any[], badge: Side } | { around: any[], badge?: Side }>>,
 *    badge?: Side,
 *    hide?: (app: any, lang: string) => Promise<any[]> }} Shot */

import { NAMES, around, control, dashboardCard, escapeRe, labelled, onScreen, openCard, openLogistics, openMyGear, openWaiting, closeCard, slotted, toTop } from './helpers.mjs';
import HANDOUT_SHOTS from './guides/handout.mjs';
import KIT_SHOTS from './guides/kits.mjs';
import WRITEOFF_SHOTS from './guides/writeoffs.mjs';
import DASHBOARD_SHOTS from './guides/dashboard.mjs';
import ACCESS_SHOTS from './guides/access.mjs';
import HISTORY_SHOTS from './guides/history.mjs';
import REGISTRY_SHOTS from './guides/registry.mjs';
import DATAOPS_SHOTS from './guides/dataops.mjs';
import BOARD_SHOTS from './guides/board.mjs';
import SEARCH_SHOTS from './guides/search.mjs';
import DISPLAY_SHOTS from './guides/display.mjs';
import CAPACITY_SHOTS from './guides/capacity.mjs';
import IMPORT_SHOTS from './guides/import.mjs';

/** @type {Shot[]} */
export default [
  {
    id: 'board',
    alt: { en: 'The Logistics board: every item with its stock, who holds it and its storage limit', he: 'לוח הלוגיסטיקה: כל פריט עם המלאי, מי מחזיק בו ומגבלת האחסון' },
    run: async (app) => { await openLogistics(app); },
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
    // the Approvals guide's step 5: the filter that lists who cannot receive a code, and the No code mark on each of them
    marks: async (app) => [
      // the filter's own words with its count ("Cannot receive a code · 16"); the (i) beside it names the same idea, never a count
      app.page.getByRole('button', { name: new RegExp(`${escapeRe((await app.t('apr_filter_no_code')).split(' · ')[0])} · \\d+`) }).first(),
      // the number on the mark's far side: its near side holds the person's code
      { at: await onScreen(app, app.page.getByText(await app.t('apr_no_code'), { exact: true })), badge: 'end' },
    ],
  },
  {
    id: 'approvals',
    alt: { en: 'Approvals: every receipt by state — waiting, signed, disputed, confirmed on behalf, cancelled, expired', he: 'אישורים: כל אישור מסירה לפי מצב — ממתין, נחתם, בערעור, אושר בשם האדם, בוטל, פג תוקף' },
    run: openWaiting,
    // the Approvals guide's step 1: the screen in the side menu, and the rail that counts every state
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_approvals'))}`, 'i') }).first(),
      app.page.getByRole('listbox', { name: await app.t('apr_rail'), exact: true }).first(),
    ],
  },
  {
    id: 'dashboard',
    alt: { en: 'The dashboard: stock, hand-outs, receipts and kits at a glance', he: 'לוח המחוונים: מלאי, מסירות, קבלות וערכות במבט אחד' },
    run: async (app) => { await app.nav('tab_analytics'); },
    settle: 1500,
    // the dashboard guide's step 1: the screen in the side menu, then the band's controls in reading order
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_analytics'))}`, 'i') }).first(),
      app.page.getByRole('radiogroup', { name: await app.t('tf_range'), exact: true }).first(),
      app.page.getByRole('button', { name: await app.t('an_edit_layout'), exact: true }).first(),
      app.page.getByRole('button', { name: await app.t('add_widget'), exact: true }).first(),
    ],
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
    // the Approvals guide's step 2: the receipt picked in the list, its lines, its timeline and its notes
    marks: async (app) => [
      app.page.getByRole('option', { name: /HO-005/ }).first(),
      app.page.getByRole('region', { name: await app.t('apr_lines_title'), exact: true }).first(),
      app.page.getByRole('region', { name: await app.t('apr_timeline_title'), exact: true }).first(),
      app.page.getByRole('heading', { name: await app.t('apr_words_title'), exact: true }).first().locator('xpath=..'),
    ],
  },
  {
    // the Approvals guide's step 3: a receipt still waiting, open, with the three acts under it (nothing is pressed)
    id: 'approvals-open',
    alt: { en: 'An open receipt waiting for its signature, with the three actions under it: confirm on behalf, cancel the receipt, resend the reminder', he: 'אישור מסירה פתוח שממתין לחתימה, ומתחתיו שלוש הפעולות: אישור בשם האדם, ביטול אישור המסירה ושליחת תזכורת מחדש' },
    run: async (app) => {
      await openWaiting(app);
      await app.page.getByRole('option', { name: /HO-\d+/ }).first().click();
      await app.idle(1200);
    },
    // the three acts in the screen's reading order (Confirm · Resend · Cancel) — the guide's list numbers them the same way
    marks: async (app) => Promise.all(['apr_act_on_behalf', 'apr_act_resend', 'apr_act_cancel'].map(async (key) =>
      app.page.getByRole('button', { name: new RegExp(escapeRe(await app.t(key))) }).first())),
  },
  {
    id: 'item-card',
    alt: { en: 'An item opened on the board: its serial-numbered units, who holds each one, its condition and its history', he: 'פריט פתוח בלוח: היחידות עם מספר סידורי, מי מחזיק בכל אחת, המצב וההיסטוריה' },
    run: async (app, lang) => {
      await openLogistics(app);
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
    // the Approvals guide's step 4: the receipt's mark on the person's card, then on the kit's row inside it
    marks: async (app, lang) => {
      const card = app.page.locator('.card-base').filter({ has: await control(app, 'tooltip_edit', NAMES.person[lang]) }).first();
      const receipts = card.getByRole('button', { name: new RegExp(`${escapeRe(await app.t('apr_mark_open'))}$`) });
      return [receipts.nth(0), receipts.nth(1)];
    },
  },
  {
    id: 'handout-window',
    alt: { en: 'Handing an item to several people at once: pick the people, set how many each gets, see the stock after', he: 'ניפוק פריט לכמה אנשים בבת אחת: בוחרים אנשים, קובעים כמה כל אחד מקבל ורואים את המלאי אחרי' },
    run: async (app, lang) => {
      await openLogistics(app);
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
    // the hand-out guide's step 3: the ticked group, a row's own quantity, the After column with what is left, the act
    marks: async (app, lang) => {
      const dialog = app.page.getByRole('dialog').last();
      return [
        dialog.getByRole('checkbox', { name: new RegExp(escapeRe(NAMES.team[lang])) }).first(),
        dialog.getByRole('group', { name: new RegExp(`^${escapeRe(await app.t('handout_col_qty'))} · `) }).first(),
        [dialog.getByRole('columnheader', { name: await app.t('handout_col_after'), exact: true }).first(),
          dialog.getByText(slotted(await app.t('handout_left'))).first()],
        app.page.getByRole('button', { name: slotted(await app.t('handout_submit')) }).first(),
      ];
    },
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
    // the Approvals guide's step 6: the four cards of the Approvals source, in the order the guide names them
    marks: async (app) => Promise.all(['preset_apr_state', 'preset_apr_waiting', 'preset_apr_confirm', 'preset_apr_flow'].map((key) => dashboardCard(app, key))),
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
    // the storage-capacity guide's step 4: the two cards that follow capacity, in reading order
    marks: async (app) => [
      await dashboardCard(app, 'w_title_storage_fill'),
      await dashboardCard(app, 'w_cap_over'),
    ],
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
    // the reports guide's step 4: the export buttons, the filters the export follows (ONE number), the count at the foot
    marks: async (app) => [
      app.page.getByRole('button', { name: `${await app.t('rpt_export_as')} CSV`, exact: true }).first().locator('xpath=..'),
      around([labelled(app.page.getByRole('textbox', { name: await app.t('logs_filter_search'), exact: true }).first()),
        labelled(app.page.getByRole('combobox', { name: await app.t('logs_filter_user'), exact: true }).first()),
        labelled(app.page.getByRole('combobox', { name: await app.t('logs_filter_action'), exact: true }).first())]),
      app.page.getByText(slotted(await app.t('logs_footer'))).first(),
    ],
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
  // the guides' own screens, one file per guide area
  ...HANDOUT_SHOTS,
  ...KIT_SHOTS,
  ...WRITEOFF_SHOTS,
  ...DASHBOARD_SHOTS,
  ...ACCESS_SHOTS,
  ...HISTORY_SHOTS,
  ...REGISTRY_SHOTS,
  ...DATAOPS_SHOTS,
  ...BOARD_SHOTS,
  ...SEARCH_SHOTS,
  ...DISPLAY_SHOTS,
  ...CAPACITY_SHOTS,
  ...IMPORT_SHOTS,
];
