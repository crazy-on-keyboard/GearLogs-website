// The sign-in guide's screens: 4.9 (look after your own sign-in). Nothing is written by a recipe: Settings › Security and
// Settings › Notifications are opened through the side menu and the Settings list; NO password box is typed into (Change
// password stays greyed and is never pressed); Set up my two-factor, Verify my two-factor and New recovery codes are never
// pressed (each starts an enrolment or issues codes — a picture never shows a QR code, a setup key or a recovery code); no
// notification switch is touched (each SAVES ON THE CLICK). No window is opened.
import { around, escapeRe, toTop } from '../helpers.mjs';

/** The Settings list (the rail inside Settings carries the screen's name). */
export const settingsList = async (app) => app.page.getByRole('navigation', { name: await app.t('tab_settings'), exact: true });
/** A Settings card by its title: the rounded card that holds its level-3 heading. */
export const settingsCard = async (app, key) => app.page.getByRole('heading', { level: 3, name: await app.t(key), exact: true }).first()
  .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
/** A card's title row: the heading, its (i) and, on Your two-factor, the status pill (they stand together: one thing). */
export const titleRow = async (app, key) => app.page.getByRole('heading', { level: 3, name: await app.t(key), exact: true }).first().locator('xpath=..');
/** Settings from the side menu, then one entry of the Settings list (never trust the list's last choice). */
export async function openSettings(app, key) {
  await app.nav('tab_settings');
  await (await settingsList(app)).getByRole('button', { name: await app.t(key), exact: true }).click();
  await app.idle(600);
}

/** A password box by its label (a password field has no textbox role; the capture adds the label to the outline). */
const passwordBox = async (app, card, key) => card.getByLabel(await app.t(key), { exact: true });
/** Your two-factor's one button: its words follow the status (set up · verify · new recovery codes). Never pressed. */
export const twoFactorButton = async (app) => {
  const words = await Promise.all(['sec_setup_btn', 'sec_verify_btn', 'sec_regen_btn'].map((k) => app.t(k)));
  return (await settingsCard(app, 'sec_your_title')).getByRole('button', { name: new RegExp(`^(${words.map(escapeRe).join('|')})$`) }).first();
};
/** Settings › Notifications: the Security band of My notifications (the first of the two; the second is the workspace default's). */
export const notifyBand = async (app, key = 'ntf_group_security') => app.page.getByRole('heading', { level: 4, name: new RegExp(`^${escapeRe(await app.t(key))}`) }).first();
/** A notification row (label · in-app · email) by its label: the row's own grid. */
export const notifyRow = async (app, key) => app.page.getByText(await app.t(key), { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"grid-cols")][1]');
/** A row's three cells (the label with its (i), the in-app cell, the email cell): the row's content without its padding. */
export const rowCells = (row) => [0, 1, 2].map((i) => row.locator('xpath=./div').nth(i));

/** Settings › Security, the pane at its top. The two-factor card reads its status first: wait for its button, so the pill
 *  says where the account stands. */
export async function openSecurity(app) {
  await openSettings(app, 'set_tab_security');
  await (await twoFactorButton(app)).waitFor();
  await app.idle(600);
  const card = await settingsCard(app, 'pw_change_title');
  await toTop(card);
  await app.idle(400);
  return card;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Settings on Security, the pane at its top (nothing on it is pressed or typed into)
    id: 'security-open',
    alt: { en: 'Settings on Security: Settings in the side menu, Security in the Settings list, and the Change password and Your two-factor cards', he: 'הגדרות על אבטחה: הגדרות בתפריט הצדדי, אבטחה ברשימת ההגדרות, והכרטיסים שינוי סיסמה והאימות הדו-שלבי שלך' },
    run: async (app) => { await openSecurity(app); },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_security'), exact: true }),
      await titleRow(app, 'pw_change_title'),
      await titleRow(app, 'sec_your_title'),
    ],
  },
  {
    // step 2: the same screen, the Change password card's three boxes and its rules (every box empty: nothing is typed)
    id: 'security-password-fields',
    alt: { en: 'Change password: the current password, the new password and its confirmation, and the three rules', he: 'שינוי סיסמה: הסיסמה הנוכחית, הסיסמה החדשה ואישורה, ושלושת הכללים' },
    badge: 'start',
    run: async (app) => { await openSecurity(app); },
    marks: async (app) => {
      const card = await settingsCard(app, 'pw_change_title');
      return [
        await passwordBox(app, card, 'pw_current_label'),
        around([(await passwordBox(app, card, 'pw_new_label')).locator('xpath=ancestor::*[label][1]'), (await passwordBox(app, card, 'pw_confirm_label')).locator('xpath=ancestor::*[label][1]')]),
        // the three rules: the list that holds the first one
        card.getByText(await app.t('pw_rule_len'), { exact: true }).locator('xpath=ancestor::ul[1]'),
      ];
    },
  },
  {
    // step 3: the same card, what the click does (told twice) and the button, pictured greyed (nothing is typed or pressed)
    id: 'security-password-save',
    alt: { en: 'Change password: the promise that every device is signed out, the warning above the button, and Change password', he: 'שינוי סיסמה: ההבטחה שכל המכשירים מנותקים, האזהרה מעל הכפתור, וכפתור שנו סיסמה' },
    badge: 'start',
    run: async (app) => { await openSecurity(app); },
    marks: async (app) => {
      const card = await settingsCard(app, 'pw_change_title');
      return [
        // the card's line under its title (the description and the promise in one paragraph)
        card.locator('p').filter({ hasText: await app.t('pw_change_promise') }).first(),
        card.getByText(await app.t('pw_change_forewarn'), { exact: true }),
        // the button (in English it shares its words with the card's title: the role tells them apart)
        card.getByRole('button', { name: await app.t('pw_change_btn'), exact: true }),
      ];
    },
  },
  {
    // step 4: Your two-factor at the top of the pane (its button is never pressed)
    id: 'security-two-factor',
    alt: { en: 'Your two-factor: the status beside the title, what two-factor is, and the button for the next move', he: 'האימות הדו-שלבי שלך: המצב ליד הכותרת, מה זה אימות דו-שלבי, והכפתור לצעד הבא' },
    badge: 'start',
    run: async (app) => {
      await openSecurity(app);
      await toTop(await settingsCard(app, 'sec_your_title'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await settingsCard(app, 'sec_your_title');
      return [
        await titleRow(app, 'sec_your_title'),
        card.getByText(await app.t('sec_your_desc'), { exact: true }),
        await twoFactorButton(app),
      ];
    },
  },
  {
    // step 5: Settings › Notifications, My notifications' Security band at the top of the pane (no switch is pressed or focused)
    id: 'security-notices',
    alt: { en: 'My notifications, the Security section: New sign-in to my account with its two switches, and the password, two-factor and recovery changes that are always on', he: 'ההתראות שלי, קטע האבטחה: כניסה חדשה לחשבון שלי עם שני המתגים, ושינויי הסיסמה, האימות הדו-שלבי וקודי השחזור שתמיד פעילים' },
    badge: 'start',
    run: async (app) => {
      await openSettings(app, 'set_tab_notifications');
      const band = await notifyBand(app);
      await band.waitFor();
      await app.idle(800);
      await toTop(band);
      await app.idle(400);
    },
    marks: async (app) => [
      await notifyBand(app),
      // each row's three cells in one outline (the rows' own boxes touch; their contents stand apart)
      around(rowCells(await notifyRow(app, 'ntf_row_security_new_signin'))),
      around(rowCells(await notifyRow(app, 'ntf_row_security_changes'))),
    ],
  },
];
