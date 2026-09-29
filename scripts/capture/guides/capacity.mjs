// The storage-capacity guide's screens: 4.17 (set a storage capacity, and see how much room is left). Nothing is saved: the
// item form opens on its Advanced tab and closes by Escape, untouched — the capacity field is only scrolled into view, never
// clicked or focused, and the switches at the top of that tab (they act at once) are never pressed.
// (Step 4 is the site's own `dashboard-stock` shot in ../shots.mjs, with its outlines.)
import { NAMES, boardCard, control, escape, escapeRe, openLogistics, side } from '../helpers.mjs';

/** Edit Item (or Edit Item (Locked)) — the item form's own title. */
const itemForm = async (app) => app.page.getByRole('dialog', { name: new RegExp(`^${escapeRe(await app.t('edit_item'))}`) });
/** The capacity field (its label carries an (i), so it is found by the label's START; the capacity adds the label itself). */
const capacityField = async (dialog, app) => dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t('lbl_capacity'))}`) });
/** Data Ops' own rail. */
const rail = async (app) => app.page.getByRole('navigation', { name: await app.t('tab_data'), exact: true });

/** An item's form on its Advanced tab, the capacity field in view (a scroll only). */
async function openAdvanced(app, lang, item) {
  await openLogistics(app);
  await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
  await app.idle(600);
  await (await control(app, 'tooltip_edit', item)).click();
  const dialog = await itemForm(app);
  await dialog.waitFor();
  await dialog.getByRole('tab', { name: await app.t('advanced'), exact: true }).click();
  await (await capacityField(dialog, app)).scrollIntoViewIfNeeded();
  await app.idle(600);
  return dialog;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the plain item's form, Advanced tab — its capacity, the preview and Save (nothing touched)
    id: 'capacity-form',
    alt: { en: 'An item\'s Edit Item window on its Advanced tab: the storage capacity, the meter\'s preview with what is held and the headroom, and Save', he: 'חלון עריכת פריט בכרטיסייה מתקדם: קיבולת האחסון, התצוגה המקדימה של המד עם הכמות המוחזקת והמרווח, ושמור' },
    badge: 'start',
    run: async (app, lang) => { await openAdvanced(app, lang, NAMES.plainItem[lang]); },
    marks: async (app) => {
      const dialog = await itemForm(app);
      return [
        side('above', dialog.getByRole('tab', { name: await app.t('advanced'), exact: true })),
        await capacityField(dialog, app),
        // the preview: the meter and the Held / Headroom lines beside it
        side('end', dialog.getByTestId('stock-meter').first().locator('xpath=..')),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    // nothing changed in the form, so Escape closes it without the discard question
    after: async (app) => escape(app),
  },
  {
    // step 2: the serial item's card on the board (nothing on it is pressed)
    id: 'capacity-meter',
    alt: { en: 'An item\'s card on the Logistics board: its STOCK badge, its storage meter and its IN USE badge', he: 'כרטיס של פריט בלוח הלוגיסטיקה: תג המלאי, מד האחסון ותג בשימוש' },
    run: async (app, lang) => {
      await openLogistics(app);
      await app.page.getByRole('button', { name: NAMES.serialTab[lang], exact: true }).first().click();
      await app.idle(800);
      await (await boardCard(app, NAMES.serialItem[lang])).scrollIntoViewIfNeeded();
      await app.idle(400);
    },
    marks: async (app, lang) => {
      const card = await boardCard(app, NAMES.serialItem[lang]);
      // a badge is the tile around its small label
      const badge = async (key) => card.getByText(await app.t(key), { exact: true }).first().locator('xpath=..');
      return [
        side('above', await badge('badge_stock')),
        side('above', card.getByTestId('stock-meter').first()),
        side('above', await badge('badge_in_use')),
      ];
    },
  },
  {
    // step 3: the item that is over its capacity, the same tab of its form (nothing touched)
    id: 'capacity-over',
    alt: { en: 'An item over its storage capacity: the capacity, the meter red at its top with the capacity line, and how far over it is', he: 'פריט מעל קיבולת האחסון שלו: הקיבולת, המד אדום בראשו עם קו הקיבולת, וגודל החריגה' },
    badge: 'start',
    run: async (app, lang) => { await openAdvanced(app, lang, NAMES.overItem[lang]); },
    marks: async (app) => {
      const dialog = await itemForm(app);
      return [
        await capacityField(dialog, app),
        // the preview as ONE thing: the meter (10 px wide) and the Held / Over by lines beside it — two outlines there would
        // cut through each other
        side('end', dialog.getByTestId('stock-meter').first().locator('xpath=..')),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 5: Data Ops on Overview — the Data Health check that counts the items over their capacity (Review is never pressed)
    id: 'dataops-health',
    alt: { en: 'Data Ops on Overview: the Data Health check for items over their storage capacity, its count and Review', he: 'ניהול נתונים, במסך סקירה: בדיקת תקינות הנתונים לפריטים מעל קיבולת האחסון, המספר שלה ולבדיקה' },
    run: async (app) => {
      await app.nav('tab_data');
      // the rail's Overview pressed every time: a shot never trusts the last view
      await (await rail(app)).getByRole('button', { name: await app.t('dops_tab_overview'), exact: true }).click();
      await app.page.getByText(await app.t('dops_chk_items_over_capacity'), { exact: true }).first().waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      // the check's own words: icon + name + (i); the row's other half holds the count and Review
      const name = app.page.getByText(await app.t('dops_chk_items_over_capacity'), { exact: true }).first().locator('xpath=..');
      return [
        app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_data'))}`, 'i') }).first(),
        side('start', (await rail(app)).getByRole('button', { name: await app.t('dops_tab_overview'), exact: true })),
        name,
        side('end', name.locator('xpath=following-sibling::div[1]')),
      ];
    },
  },
];
