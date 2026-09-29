// The notifications guide's screens: 4.18 (choose what you are told about). Nothing is saved by a recipe: Settings › Notifications is
// opened through the side menu and the Settings list; no switch, hour list, segmented choice, "Use it" or "Use workspace defaults" is
// pressed, focused or hovered (each SAVES ON THE CLICK — the member's own row or the workspace's); the bell only opens (a read) and
// closes by Escape — no row in it is clicked (a click marks it read) and Mark all read is never pressed; its sign-in notices leave the
// picture (they name a real network address).
import { around, escape, escapeRe, slotted, toTop } from '../helpers.mjs';
import { notifyRow, openSettings, rowCells, settingsCard, settingsList, titleRow } from './security.mjs';

/** A section's grey band inside a card (its name starts the heading; an (i) may follow). */
const band = async (app, card, key) => card.getByRole('heading', { level: 4, name: new RegExp(`^${escapeRe(await app.t(key))}`) }).first();
/** One matrix row — its name, its (i) and its two columns — found by the row's own words. */
const matrixRow = async (app, card, key) => card.getByText(await app.t(key), { exact: true }).first()
  .locator('xpath=ancestor::div[contains(@class,"grid-cols-[1fr_88px_88px]")][1]');
/** A Delivery times row: its name and its control (the row's own grid — never the hint under it, so two rows stay apart). */
const timeRow = (control) => control.locator('xpath=ancestor::div[contains(@class,"grid-cols-[1fr_auto]")][1]');
/** The e-mail allowance card (administrators): the app's own test hook — the card has no name a role can find. */
const allowanceCard = (app) => app.page.getByTestId('allowance-card');
/** The day the month's meter resets on: out of every picture (the site carries no dates). */
const hideReset = async (app) => [allowanceCard(app).getByText(slotted(await app.t('mail_meter_resets')))];
/** The bell in the header: its name starts with the bell's label and goes on with the unread count. */
const bell = async (app) => app.page.locator('header').first().getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('ntf_bell_label'))}`) }).first();
/** The bell's open panel. */
const bellPanel = async (app) => app.page.getByRole('dialog', { name: await app.t('ntf_bell_label'), exact: true });

/** Settings › Notifications, My notifications drawn. */
async function openNotifications(app) {
  await openSettings(app, 'set_tab_notifications');
  const card = await settingsCard(app, 'ntf_my_title');
  await card.waitFor();
  await app.idle(800);
  return card;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the page at its top (the allowance card leads it for an administrator)
    id: 'notifications-open',
    alt: { en: 'Settings on Notifications: Settings in the side menu, Notifications in the Settings list, the e-mail allowance and My notifications', he: 'הגדרות בכרטיסייה התראות: הגדרות בתפריט הצדדי, התראות ברשימת ההגדרות, מכסת האימיילים וההתראות שלי' },
    hide: hideReset,
    run: async (app) => {
      const card = await openNotifications(app);
      await toTop(allowanceCard(app).or(card).first());
      await app.idle(400);
    },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_notifications'), exact: true }),
      allowanceCard(app),
      await titleRow(app, 'ntf_my_title'),
    ],
  },
  {
    // step 2: My notifications scrolled to its Gear band (every switch pictured as it stands)
    id: 'notifications-rows',
    alt: { en: 'My notifications, the Gear section: the In-app and Email columns, a row with its two switches, the administrators\' rows and an always-on row', he: 'ההתראות שלי, אזור הציוד: העמודות באפליקציה ואימייל, שורה עם שני המתגים שלה, השורות של מנהלי המערכת ושורה שתמיד פעילה' },
    badge: 'start',
    run: async (app) => {
      const card = await openNotifications(app);
      await toTop(await band(app, card, 'ntf_group_gear'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'ntf_my_title');
      return [
        // the band with the IN-APP / EMAIL names at its end
        await band(app, card, 'ntf_group_gear'),
        await matrixRow(app, card, 'ntf_row_gear_assigned'),
        // the two administrators' rows stand together: ONE outline
        around([await matrixRow(app, card, 'ntf_row_stock_over_capacity'), await matrixRow(app, card, 'ntf_row_stock_low')]),
        // an essential row: 'Always on' in both columns, no switch
        // (its three cells in one outline: the rows of this list stand a hair apart; their contents stand clear)
        around(rowCells(await notifyRow(app, 'ntf_row_security_changes'))),
      ];
    },
  },
  {
    // step 3: My notifications scrolled to its Delivery times band (the hour list and the segmented choice are never opened or pressed)
    id: 'notifications-delivery',
    alt: { en: 'My notifications, Delivery times: Digest at, Quiet hours and the daily digest row', he: 'ההתראות שלי, מועדי המשלוח: התקציר בשעה, שעות שקט ושורת התקציר היומי' },
    badge: 'start',
    run: async (app) => {
      const card = await openNotifications(app);
      await toTop(await band(app, card, 'ntf_delivery'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'ntf_my_title');
      return [
        timeRow(card.getByRole('combobox', { name: await app.t('ntf_digest_at'), exact: true })),
        timeRow(card.getByRole('radiogroup', { name: await app.t('ntf_quiet'), exact: true })),
        await matrixRow(app, card, 'ntf_row_digest_daily'),
      ];
    },
  },
  {
    // step 4: the Workspace default card at the top of the pane (every control on it saves on a click: none is pressed; 'Use it' is never clicked)
    id: 'notifications-workspace-times',
    alt: { en: 'Workspace default, Delivery times: the time zone, the morning hour and the quiet hours for the whole workspace', he: 'ברירת המחדל של סביבת העבודה, מועדי המשלוח: אזור הזמן, שעת הבוקר ושעות השקט של כל סביבת העבודה' },
    badge: 'start',
    run: async (app) => {
      await openNotifications(app);
      await toTop(await settingsCard(app, 'ntf_ws_title'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'ntf_ws_title');
      return [
        await titleRow(app, 'ntf_ws_title'),
        timeRow(card.getByRole('combobox', { name: await app.t('ntf_tz'), exact: true })),
        timeRow(card.getByRole('combobox', { name: await app.t('ntf_morning'), exact: true })),
        timeRow(card.getByRole('switch', { name: await app.t('ntf_quiet'), exact: true })),
      ];
    },
  },
  {
    // step 5: the Workspace default card scrolled to Morning mail to your people (every switch on it saves on a click: none is pressed)
    id: 'notifications-workspace-rows',
    alt: { en: 'Workspace default: the morning mail to your people, the daily digest and a gear row, for every member who has not chosen', he: 'ברירת המחדל של סביבת העבודה: אימייל הבוקר לאנשים שלכם, התקציר היומי ושורת ציוד, לכל חבר צוות שלא בחר בעצמו' },
    badge: 'start',
    run: async (app) => {
      await openNotifications(app);
      const card = await settingsCard(app, 'ntf_ws_title');
      await toTop(await band(app, card, 'ntf_staff_nudge'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'ntf_ws_title');
      // the nudge's band and its one switch (on the EMAIL column) stand together: ONE outline
      const nudgeRow = card.getByRole('switch', { name: await app.t('ntf_staff_nudge'), exact: true })
        .locator('xpath=ancestor::div[contains(@class,"grid-cols-[1fr_88px_88px]")][1]');
      return [
        around([await band(app, card, 'ntf_staff_nudge'), nudgeRow]),
        await matrixRow(app, card, 'ntf_row_digest_daily'),
        await matrixRow(app, card, 'ntf_row_gear_assigned'),
      ];
    },
  },
  {
    // step 6: the bell's panel open over Settings › Notifications (opening it only reads; no row in it is clicked)
    id: 'notifications-bell',
    alt: { en: 'The bell open over Settings: its count, Mark all read, a notice and See all in Support', he: 'הפעמון פתוח מעל ההגדרות: הספירה, סימון הכול כנקרא, התראה ולכל ההתראות בתמיכה' },
    hide: hideReset,
    // PRIVACY: a sign-in notice names the hour and the network address its member signed in from (the demo accounts are
    // real sign-ins): every such row leaves the picture, and the panel shows the demo's stock notices
    leaveOut: async (app) => [(await bellPanel(app)).locator('li').filter({ hasText: await app.t('ntf_kind_security_new_signin') })],
    settle: 1000,
    run: async (app) => {
      // the page behind the panel stands at its top, whatever the shot before left scrolled
      const card = await openNotifications(app);
      await toTop(allowanceCard(app).or(card).first());
      await (await bell(app)).click();
      await (await bellPanel(app)).waitFor();
      await app.idle(1000);
    },
    marks: async (app) => {
      const panel = await bellPanel(app);
      return [
        await bell(app),
        panel.getByRole('button', { name: new RegExp(escapeRe(await app.t('ntf_mark_all_read'))) }).first(),
        // ONE notice (the first row): the whole list would sit too close to See all
        panel.locator('li').filter({ hasNotText: await app.t('ntf_kind_security_new_signin') }).first(),
        panel.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('ntf_see_all'))}`) }).first(),
      ];
    },
    // nothing is marked read: the panel closes by Escape
    after: async (app) => { await escape(app); },
  },
];
