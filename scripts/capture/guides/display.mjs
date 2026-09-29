// The display guide's screens: 4.14 (make GearLogs yours). Nothing is saved by a recipe: Settings › Display is opened through
// the side menu and the Settings list; no slider, choice, theme icon or language button is pressed or focused (each SAVES ON THE
// CLICK — theme and language to the member's row, the rest to this browser); the one window opened (Use workspace defaults)
// closes by its own Cancel, never its confirm.
import { around, escapeRe, side, toTop } from '../helpers.mjs';

/** The Settings list (the rail inside Settings carries the screen's name). */
const settingsList = async (app) => app.page.getByRole('navigation', { name: await app.t('tab_settings'), exact: true });
/** A Display card (My Display · Workspace Default) by its title: the rounded card that holds it. */
const displayCard = async (app, key) => app.page.getByRole('heading', { level: 3, name: await app.t(key), exact: true }).first()
  .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
/** A card's title bar (the heading's own row). */
const titleBar = async (app, key) => app.page.getByRole('heading', { level: 3, name: await app.t(key), exact: true }).first().locator('xpath=..');
/** A section's grey band inside a card (its name starts the heading; an (i) may follow inside it). */
const band = async (app, card, key) => card.getByRole('heading', { level: 4, name: new RegExp(`^${escapeRe(await app.t(key))}`) }).first();
/** A slider WITH its label and readout: the label → its row → the slider's block. */
const sliderBlock = async (app, card, key) => card.getByText(await app.t(key), { exact: true }).first().locator('xpath=../..');
/** A segmented choice (a radiogroup named by its section). */
const choices = async (app, card, key) => card.getByRole('radiogroup', { name: await app.t(key), exact: true }).first();
/** The five theme icons (the row that holds the first theme's button). */
const themeRow = async (app, scope) => scope.getByRole('button', { name: await app.t('theme_office'), exact: true }).first().locator('xpath=..');
/** The reset's confirm window, by its title. */
const resetDialog = async (app) => app.page.getByRole('dialog', { name: await app.t('display_reset'), exact: true });

/** Settings from the side menu, then Display in the Settings list (never trust the list's last choice). */
async function openDisplay(app) {
  await app.nav('tab_settings');
  await (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_display'), exact: true }).click();
  const card = await displayCard(app, 'display_my_display');
  await card.waitFor();
  await app.idle(600);
  return card;
}
const openAtTop = async (app) => { await toTop(await openDisplay(app)); await app.idle(400); };

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Settings on Display
    id: 'display-open',
    alt: { en: 'Settings on Display: Settings in the side menu, Display in the Settings list, and the My Display card', he: 'הגדרות על תצוגה: הגדרות בתפריט הצדדי, תצוגה ברשימת ההגדרות, והכרטיס התצוגה שלי' },
    run: openAtTop,
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_display'), exact: true }),
      await titleBar(app, 'display_my_display'),
    ],
  },
  {
    // step 2: the same screen, the first four rows of My Display (pictured as they stand)
    id: 'display-look',
    alt: { en: 'My Display: text size, groups per row, action buttons and the menu', he: 'התצוגה שלי: גודל הטקסט, הקבוצות בשורה, כפתורי הפעולה והתפריט' },
    badge: 'start',
    run: openAtTop,
    marks: async (app) => {
      const card = await displayCard(app, 'display_my_display');
      return [
        await sliderBlock(app, card, 'display_text_size'),
        await sliderBlock(app, card, 'display_groups_per_row'),
        around([await band(app, card, 'display_row_actions'), await choices(app, card, 'display_row_actions')]),
        around([await band(app, card, 'display_sub_menu'), await choices(app, card, 'display_sub_menu')]),
      ];
    },
  },
  {
    // step 3: My Display scrolled to its Theme band
    id: 'display-theme',
    alt: { en: 'My Display: the five theme icons, the language choice, and Use workspace defaults', he: 'התצוגה שלי: חמשת סמלי ערכות הנושא, בחירת השפה, ושימוש בברירות המחדל של סביבת העבודה' },
    badge: 'start',
    run: async (app) => {
      const card = await openDisplay(app);
      await toTop(await band(app, card, 'display_sub_theme'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await displayCard(app, 'display_my_display');
      return [
        around([await band(app, card, 'display_sub_theme'), await themeRow(app, card)]),
        around([await band(app, card, 'display_sub_language'), await choices(app, card, 'display_sub_language')]),
        // the reset — or, with no personal pick, the line that stands in its place
        card.getByRole('button', { name: await app.t('display_reset'), exact: true })
          .or(card.getByText(await app.t('display_using_default'), { exact: true })).first(),
      ];
    },
  },
  {
    // step 4: any screen shows the header; the dashboard is opened by the side menu alone (nothing on it is pressed)
    id: 'display-header',
    alt: { en: 'The app\'s header: the five theme icons, their (i), and the language button', he: 'הכותרת של היישום: חמשת סמלי ערכות הנושא, סמל ה-(i) שלהם, וכפתור השפה' },
    settle: 1500,
    run: async (app) => { await app.nav('tab_analytics'); await app.idle(800); },
    marks: async (app, lang) => {
      const header = app.page.locator('header').first();
      // the (i)'s name is "Help: <its title>"
      const help = (await app.t('info_aria_help')).replace('{0}', await app.t('info_header_theme_title'));
      return [
        side('below', await themeRow(app, header)),
        side('below', header.getByRole('button', { name: help, exact: true }).first()),
        side('below', header.getByRole('button', { name: lang === 'en' ? 'HE' : 'EN', exact: true }).first()),
      ];
    },
  },
  {
    // step 5: the Workspace Default card at the top of the pane (every control on it saves on a click: none is pressed)
    id: 'display-workspace',
    alt: { en: 'Workspace Default: text size and groups per row, action buttons, theme and language for every member', he: 'ברירת המחדל של סביבת העבודה: גודל טקסט וקבוצות בשורה, כפתורי פעולה, ערכת נושא ושפה לכל חברי הצוות' },
    badge: 'start',
    run: async (app) => {
      await openDisplay(app);
      await toTop(await displayCard(app, 'display_tenant_default'));
      await app.idle(400);
    },
    marks: async (app) => {
      const card = await displayCard(app, 'display_tenant_default');
      return [
        await titleBar(app, 'display_tenant_default'),
        around([await sliderBlock(app, card, 'display_text_size'), await sliderBlock(app, card, 'display_groups_per_row')]),
        around([await band(app, card, 'display_row_actions'), await choices(app, card, 'display_row_actions')]),
        around([await band(app, card, 'display_sub_theme'), await themeRow(app, card), await band(app, card, 'display_sub_language'), await choices(app, card, 'display_sub_language')]),
      ];
    },
  },
  {
    // step 6: the reset's confirm window, open (its button only opens it; the confirm is never pressed)
    id: 'display-reset',
    alt: { en: 'Use workspace defaults asks first: what goes back, Cancel, and the confirm', he: 'שימוש בברירות המחדל של סביבת העבודה שואל קודם: מה חוזר, ביטול, וכפתור האישור' },
    badge: 'start',
    run: async (app) => {
      const card = await openDisplay(app);
      const reset = card.getByRole('button', { name: await app.t('display_reset'), exact: true });
      await reset.scrollIntoViewIfNeeded();
      await reset.click();
      await (await resetDialog(app)).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await resetDialog(app);
      return [
        dialog.getByText(await app.t('display_reset_confirm'), { exact: true }),
        dialog.getByRole('button', { name: await app.t('cancel'), exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('display_reset'), exact: true })),
      ];
    },
    // nothing is reset: the window closes by its own Cancel, found by its label right before the click
    after: async (app) => {
      const dialog = await resetDialog(app);
      if (await dialog.isVisible()) { await dialog.getByRole('button', { name: await app.t('cancel'), exact: true }).click(); await app.idle(400); }
    },
  },
];
