// The two-factor guide's screens: 4.15 (turn on two-factor sign-in). Nothing is saved and NO SECRET IS EVER PICTURED: Settings ›
// Security and Settings › Notifications open through the side menu and the Settings list. Set up my two-factor, Verify my
// two-factor and New recovery codes are NEVER pressed (the first starts a real enrolment that shows a QR code and a key; the
// last issues new codes on the click); Turn on is never pressed; no switch on Notifications is touched; the one (i) opened
// closes by Escape. The setup window, the recovery codes and the sign-in code screen are told in words on the page.
import { around, escape, escapeRe, side, toTop } from '../helpers.mjs';
import { notifyBand, notifyRow, openSettings, rowCells, settingsCard, settingsList, twoFactorButton } from './security.mjs';

/** A Security card's title (a heading of its own; the (i) and the status pill are its neighbours). */
const cardTitle = async (app, key) => app.page.getByRole('heading', { level: 3, name: await app.t(key), exact: true }).first();
/** The first of several app words that stands in `scope` (a status or an act that depends on the member's state). */
async function oneOf(app, scope, role, keys) {
  let found = null;
  for (const key of keys) {
    const word = await app.t(key);
    const here = role ? scope.getByRole(role, { name: word, exact: true }) : scope.getByText(word, { exact: true });
    found = found ? found.or(here) : here;
  }
  return found.first();
}
/** Your two-factor: its status pill. */
const ownStatus = async (app, card) => oneOf(app, card, null, ['sec_your_none', 'sec_your_has', 'sec_your_on']);
/** The (i) of Your two-factor: its name is "Help: <title>". */
const ownHelp = async (app, card) => card.getByRole('button', { name: (await app.t('info_aria_help')).replace('{0}', await app.t('sec_your_title')), exact: true });
/** The (i)'s open panel, named by the card's title. */
const helpPanel = async (app) => app.page.getByRole('dialog', { name: await app.t('sec_your_title'), exact: true });
/** The always-on row of My notifications. */
const changesRow = (app) => notifyRow(app, 'ntf_row_security_changes');

/** Settings › Security with Your two-factor at the top of the pane (the card reads its status first: wait for its button). */
async function openTwoFactor(app) {
  await openSettings(app, 'set_tab_security');
  await (await twoFactorButton(app)).waitFor();
  const card = await settingsCard(app, 'sec_your_title');
  await toTop(card);
  await app.idle(600);
  return card;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Settings on Security, Your two-factor at the top of the pane, Workspace two-factor under it
    id: 'twofactor-open',
    alt: { en: 'Settings on Security: Settings in the side menu, Security in the Settings list, the Your two-factor card and the Workspace two-factor card', he: 'הגדרות על אבטחה: הגדרות בתפריט הצדדי, אבטחה ברשימת ההגדרות, הכרטיס האימות הדו-שלבי שלך והכרטיס אימות דו-שלבי לסביבת העבודה' },
    run: async (app) => { await openTwoFactor(app); },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_security'), exact: true }),
      await settingsCard(app, 'sec_your_title'),
      await settingsCard(app, 'sec_workspace_title'),
    ],
  },
  {
    // step 2: the same screen; the card's status and its one act (pictured as they stand — the act is never pressed)
    id: 'twofactor-your',
    alt: { en: 'Your two-factor: its status and the button for the next move', he: 'האימות הדו-שלבי שלך: המצב שלו והכפתור לצעד הבא' },
    badge: 'start',
    run: async (app) => { await openTwoFactor(app); },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_your_title');
      return [
        // the title, its (i), the status and the line under them stand together: ONE outline
        around([await cardTitle(app, 'sec_your_title'), await ownStatus(app, card), card.getByText(await app.t('sec_your_desc'), { exact: true })]),
        await twoFactorButton(app),
      ];
    },
  },
  {
    // step 3: the (i) of Your two-factor, open (an (i) keeps its own state and saves nothing)
    id: 'twofactor-info',
    alt: { en: 'The (i) of Your two-factor, open: what the card does, and recovery codes as the way back in', he: 'סמל ה-(i) של האימות הדו-שלבי שלך, פתוח: מה הכרטיס עושה, וקודי השחזור כדרך חזרה' },
    settle: 1000,
    run: async (app) => {
      const card = await openTwoFactor(app);
      await (await ownHelp(app, card)).click();
      await (await helpPanel(app)).waitFor();
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_your_title');
      return [
        side('above', await ownHelp(app, card)),
        await helpPanel(app),
      ];
    },
    after: async (app) => { await escape(app); },
  },
  {
    // step 4: the same screen; Workspace two-factor (Turn on is never pressed)
    id: 'twofactor-workspace',
    alt: { en: 'Workspace two-factor: its state, and Turn on greyed with the reason under it', he: 'אימות דו-שלבי לסביבת העבודה: המצב שלו, והכפתור הפעל באפור עם הסיבה מתחתיו' },
    badge: 'start',
    run: async (app) => { await openTwoFactor(app); },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_workspace_title');
      return [
        // the title, its (i), the state and the line under them stand together: ONE outline
        around([await cardTitle(app, 'sec_workspace_title'), await oneOf(app, card, null, ['sec_status_off', 'sec_status_on']), card.getByText(await app.t('sec_workspace_desc'), { exact: true })]),
        // the button and the reason under it: ONE outline — the reason stands only while your own two-factor is not verified
        around([await oneOf(app, card, 'button', ['sec_turn_on', 'sec_turn_off']), card.getByText(await app.t('sec_need_own_first'), { exact: true })]),
      ];
    },
  },
  {
    // step 5: Settings on Notifications, the Security band at the top of the pane (no switch is touched: each SAVES ON THE CLICK)
    id: 'twofactor-notices',
    alt: { en: 'Settings on Notifications: Notifications in the Settings list, the Security band with its In-app and Email columns, and the changes that are always on in both', he: 'הגדרות על התראות: התראות ברשימת ההגדרות, פס האבטחה עם העמודות באפליקציה ואימייל, והשינויים שתמיד פעילים בשתיהן' },
    badge: 'start',
    run: async (app) => {
      await openSettings(app, 'set_tab_notifications');
      await (await changesRow(app)).waitFor();
      await toTop(await notifyBand(app));
      await app.idle(600);
    },
    marks: async (app) => [
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_notifications'), exact: true }),
      await notifyBand(app),
      // the row's three cells in one outline (the rows of this list stand a hair apart; their contents stand clear)
      around(rowCells(await changesRow(app))),
    ],
  },
];
