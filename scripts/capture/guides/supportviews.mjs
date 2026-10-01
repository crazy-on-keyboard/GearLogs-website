// The support-views guide's screens: 4.21 (see when support looked in). Nothing is written: Settings › Security opens through
// the side menu and the Settings list; no button on the page is pressed (Change password, the two-factor buttons and Turn on are
// never touched); the card only reads; the one (i) opened closes by Escape; System Logs is pictured as it stands (no filter, date
// or export button is touched).
import { around, escape, escapeRe, side, toTop } from '../helpers.mjs';
import { openSettings, settingsCard, settingsList, titleRow, twoFactorButton } from './security.mjs';

/** The Support views card's list: its empty line or its table (the card reads the database first). */
const viewsList = async (app, card) => card.getByText(await app.t('sec_views_none'), { exact: true }).or(card.getByRole('table')).first();
/** The card's (i): its name is "Help: <title>". */
const viewsHelp = async (app, card) => card.getByRole('button', { name: (await app.t('info_aria_help')).replace('{0}', await app.t('sec_views_title')), exact: true });
/** The (i)'s open panel, named by the card's title. */
const viewsPanel = async (app) => app.page.getByRole('dialog', { name: await app.t('sec_views_title'), exact: true });

/** Settings › Security with the Support views card brought up (the two-factor card reads its status first; the list its rows). */
async function openSupportViews(app) {
  await openSettings(app, 'set_tab_security');
  await (await twoFactorButton(app)).waitFor();
  const card = await settingsCard(app, 'sec_views_title');
  await (await viewsList(app, card)).waitFor();
  await toTop(card);
  await app.idle(600);
  return card;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Settings on Security, the Support views card brought up
    id: 'support-views-open',
    alt: { en: 'Settings on Security: Settings in the side menu, Security in the Settings list, and the Support views card', he: 'הגדרות בכרטיסייה אבטחה: הגדרות בתפריט הצדדי, אבטחה ברשימת ההגדרות, והכרטיס תצוגות תמיכה' },
    run: async (app) => { await openSupportViews(app); },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_security'), exact: true }),
      await settingsCard(app, 'sec_views_title'),
    ],
  },
  {
    // step 2: the same card — the line under its title, and its list
    id: 'support-views-list',
    alt: { en: 'Support views: the title with its (i), and the list of the last 90 days', he: 'תצוגות תמיכה: הכותרת עם סמל ה-(i) שלה, והרשימה של 90 הימים האחרונים' },
    badge: 'start',
    run: async (app) => { await openSupportViews(app); },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_views_title');
      return [
        await titleRow(app, 'sec_views_title'),   // the title and its (i) (the line under the title moved into the (i) in S2)
        await viewsList(app, card),
      ];
    },
  },
  {
    // step 3: the card's (i), open (an (i) keeps its own state and saves nothing)
    id: 'support-views-info',
    alt: { en: 'The (i) of Support views, open: what the card holds, and how a view works', he: 'סמל ה-(i) של תצוגות תמיכה, פתוח: מה הכרטיס מחזיק, ואיך תצוגה עובדת' },
    settle: 1000,
    run: async (app) => {
      const card = await openSupportViews(app);
      await (await viewsHelp(app, card)).click();
      await (await viewsPanel(app)).waitFor();
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_views_title');
      const pop = await viewsPanel(app);
      // a section = the icon beside its label + text: the text's paragraph → its block → the row with the icon
      const section = async (key) => pop.getByText(await app.t(key), { exact: true }).locator('xpath=../..');
      return [
        side('above', await viewsHelp(app, card)),
        // the first section WITH the panel's title over it: ONE outline (a number on the section's own corner would lie
        // over the title's first letters)
        around([pop.getByText(await app.t('sec_views_title'), { exact: true }).first(), await section('info_sec_views_whatis')]),
        side('end', await section('info_sec_views_how')),
      ];
    },
    after: async (app) => { await escape(app); },
  },
  {
    // step 4: System Logs as it stands (the 'logs' shot keeps its own outlines)
    id: 'support-views-logs',
    alt: { en: 'System Logs: System Logs in the side menu, Search Keywords, and the User and Action Type filters', he: 'יומני מערכת: יומני מערכת בתפריט הצדדי, מילות חיפוש, והמסננים משתמש וסוג פעולה' },
    run: async (app) => {
      await app.nav('tab_logs');
      await app.page.getByRole('textbox', { name: await app.t('logs_filter_search'), exact: true }).first().waitFor();
      await app.idle(800);
    },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_logs'))}`, 'i') }).first(),
      side('above', app.page.getByRole('textbox', { name: await app.t('logs_filter_search'), exact: true }).first()),
      // User and Action Type stand together: ONE outline
      around([
        app.page.getByRole('combobox', { name: await app.t('logs_filter_user'), exact: true }).first(),
        app.page.getByRole('combobox', { name: await app.t('logs_filter_action'), exact: true }).first(),
      ], 'above'),
    ],
  },
];
