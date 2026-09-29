// The Registry guide's screens: 4.8 (track each unit by its serial number). Nothing is registered, moved, sent or saved:
// every window opens untouched (a mode switch at most — the window's own state), no switch is flipped, no confirm is pressed,
// and each window closes by Escape or its own Cancel.
import { NAMES, around, control, escape, escapeRe, labelled, openLogistics, side, slotted } from '../helpers.mjs';

/** A window by its title. */
const dialogNamed = async (app, key) => app.page.getByRole('dialog', { name: await app.t(key), exact: true });
/** The item's row in the Property Book's Items pane (the row button holds the name; its GO sibling only names it in aria-label). */
const itemRow = (app, lang) => app.page.getByRole('button').filter({ hasText: NAMES.serialItem[lang] }).first();
/** The Registry on its Property Book with the serial item picked (All Units opens with it) — a shot never trusts the last view. */
async function openBook(app, lang) {
  await app.nav('tab_registry');
  await app.page.getByRole('tab', { name: await app.t('reg_view_property'), exact: true }).first().click();
  await app.idle(600);
  await itemRow(app, lang).click();
  await app.idle(800);
}
/** A Property Book pane by its title bar ("Lots · EQ-016", "Units · All Units"): title span → title group → bar → the pane. */
const pane = async (app, key) => app.page.getByText(new RegExp(`^${escapeRe(await app.t(key))} · `)).first().locator('xpath=../../..');
/** The first unit in stock: the first row whose Assign button shows ("Assign — UN-018 · LOG-03-009"); its other buttons share that subject. */
async function firstInStock(app) {
  const assign = app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_assign_action'))} — UN-`) }).first();
  await assign.scrollIntoViewIfNeeded();
  const subject = (await assign.getAttribute('aria-label')).split(' — ').slice(1).join(' — ');
  const act = async (key) => app.page.getByRole('button', { name: `${await app.t(key)} — ${subject}`, exact: true }).first();
  return { assign, act };
}
/** Edit Item (or Edit Item (Locked)) — the item form's own title. */
const itemForm = async (app) => app.page.getByRole('dialog', { name: new RegExp(`^${escapeRe(await app.t('edit_item'))}`) });
/** Close a window by its own Cancel, found by its label right before the click. */
async function cancel(app, key) {
  await (await dialogNamed(app, key)).getByRole('button', { name: await app.t('cancel'), exact: true }).click();
  await app.idle(400);
}
/** Register Units, opened from the Units pane's + (it arrives with the item picked). */
async function openRegister(app, lang) {
  await openBook(app, lang);
  await app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_add_units'))} — `) }).first().click();
  const dialog = await dialogNamed(app, 'reg_register_title');
  await dialog.waitFor();
  return dialog;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the plain item's Edit Item, Registry tab — tracking off, the switch untouched
    id: 'registry-track',
    alt: { en: 'An item\'s Edit Item window on its Registry tab: unit tracking is off, and the switch that turns it on', he: 'חלון עריכת פריט בלשונית מרשם: מעקב היחידות כבוי, והמתג שמפעיל אותו' },
    run: async (app, lang) => {
      await openLogistics(app);
      await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
      await app.idle(600);
      await (await control(app, 'tooltip_edit', NAMES.plainItem[lang])).click();
      const dialog = await itemForm(app);
      await dialog.waitFor();
      await dialog.getByRole('tab', { name: await app.t('edit_tab_registry'), exact: true }).click();
      await app.idle(600);
    },
    // the tab, the state line, the switch — in reading order
    marks: async (app) => {
      const dialog = await itemForm(app);
      return [
        // the last of four tabs: its number over it, never on the tab beside it
        side('above', dialog.getByRole('tab', { name: await app.t('edit_tab_registry'), exact: true })),
        // the switch's name with the state line under it
        dialog.getByText(await app.t('reg_track_off'), { exact: true }).locator('xpath=..'),
        dialog.getByRole('switch', { name: await app.t('reg_track_units'), exact: true }),
      ];
    },
    // nothing changed in the form, so Escape closes it without the discard question
    after: async (app) => escape(app),
  },
  {
    // step 2: the Property Book with the serial item picked and All Units open (nothing pressed but selections)
    id: 'registry-book',
    alt: { en: 'The Registry\'s Property Book: the item picked, its lots, and every unit with its serial, status, condition and holder', he: 'ספר הרכוש במרשם: הפריט שנבחר, האצוות שלו, וכל יחידה עם המספר הסידורי, הסטטוס, הכשירות והמחזיק' },
    run: openBook,
    marks: async (app, lang) => [
      app.page.getByRole('tab', { name: await app.t('reg_view_property'), exact: true }).first(),
      itemRow(app, lang),
      await pane(app, 'reg_pane_lots'),
      await pane(app, 'reg_pane_units'),
    ],
  },
  {
    // step 3: Register Units, untouched, on One
    id: 'registry-register',
    alt: { en: 'Registering units: the item and lot, One, Batch or From file, the serial number, and Register unit', he: 'רישום יחידות: הפריט והאצווה, אחת, מרובות או מקובץ, המספר הסידורי, ורשום יחידה' },
    badge: 'start',
    run: async (app, lang) => { await openRegister(app, lang); await app.idle(600); },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_register_title');
      return [
        // ONE outline around both pickers, each with its label (each Select is labelled by its Field)
        around([labelled(dialog.getByRole('combobox', { name: await app.t('reg_product'), exact: true })),
          labelled(dialog.getByRole('combobox', { name: await app.t('reg_lot'), exact: true }))]),
        // the mode switch is the named radiogroup (the Units | Lot switch above it has no name)
        dialog.getByRole('radiogroup', { name: await app.t('reg_register_title'), exact: true }),
        labelled(dialog.getByLabel(await app.t('reg_serial_optional'), { exact: true })),
        side('end', dialog.getByRole('button', { name: await app.t('reg_register_one'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'reg_register_title'),
  },
  {
    // step 4: the same window switched to From file (the window's own mode state); the box stays empty
    id: 'registry-file',
    alt: { en: 'Registering units from a file: paste serials or choose a .csv or .txt file, then preview how it was read', he: 'רישום יחידות מקובץ: מדביקים מספרים סידוריים או בוחרים קובץ csv או txt, ואז רואים איך הוא נקרא' },
    badge: 'start',
    run: async (app, lang) => {
      const dialog = await openRegister(app, lang);
      await dialog.getByRole('radio', { name: await app.t('reg_mode_file'), exact: true }).click();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_register_title');
      return [
        // the last of the three ways in: its number beyond it, never on Batch
        side('end', dialog.getByRole('radio', { name: await app.t('reg_mode_file'), exact: true })),
        // the paste box with its label and the hint under it
        labelled(dialog.getByRole('textbox', { name: await app.t('reg_mode_file'), exact: true })),
        dialog.getByRole('button', { name: await app.t('reg_file_choose'), exact: true }),
        // "Preview 0 rows" — greyed while the box is empty; it only opens the preview, never writes
        side('end', dialog.getByRole('button', { name: slotted(await app.t('reg_preview_btn')) })),
      ];
    },
    after: async (app) => cancel(app, 'reg_register_title'),
  },
  {
    // step 5: Add Lot opened from the Lots pane's + ("Add lot — EQ-016"), untouched
    id: 'registry-lot',
    alt: { en: 'Adding a lot: the supplier\'s lot number, the warranty date, the expiry date, and Save', he: 'הוספת אצווה: מספר האצווה של הספק, תאריך האחריות, תאריך התפוגה, ושמור' },
    badge: 'start',
    run: async (app, lang) => {
      await openBook(app, lang);
      await app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_lot_add'))} — `) }).first().click();
      await (await dialogNamed(app, 'reg_lot_add_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_lot_add_title');
      // each label carries its (i) ("Help: …"), so a field is found by the label's START
      const field = async (key) => dialog.getByLabel(new RegExp(`^${escapeRe(await app.t(key))}`)).first();
      // each field with its label; the two dates stand side by side, so the second carries its number on its far side
      return [
        labelled(await field('reg_lot_code')),
        labelled(await field('reg_lot_warranty')),
        side('end', labelled(await field('reg_lot_expiry'))),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'reg_lot_add_title'),
  },
  {
    // step 6: the Property Book with the first in-stock unit's row brought into view (nothing pressed)
    id: 'registry-unit-actions',
    alt: { en: 'A unit in stock in the Registry, with its row\'s buttons: Assign, Send to repair, Move unit and Write off', he: 'יחידה שבמלאי במרשם, עם הכפתורים בשורה שלה: שייך, שלח לתיקון, העברת יחידה וגריעה' },
    run: async (app, lang) => {
      await openBook(app, lang);
      await firstInStock(app);   // scrolls that row into the Units pane's view
      await app.idle(400);
    },
    // the four acts in the row's reading order; they stand in a row of icons, so no number sits on a neighbour: the first
    // beside the row, the last beyond it, the two in the middle over the row
    marks: async (app) => {
      const { assign, act } = await firstInStock(app);
      return [side('start', assign), side('above', await act('reg_repair_send')), side('above', await act('reg_move')), side('end', await act('reg_writeoff_action'))];
    },
  },
  {
    // step 7: the repair confirm for the first in-stock unit, open and untouched
    id: 'registry-repair',
    alt: { en: 'Sending a unit to repair: the unit, an optional reason, and the confirm', he: 'שליחת יחידה לתיקון: היחידה, סיבה (רשות), וכפתור האישור' },
    badge: 'start',
    run: async (app, lang) => {
      await openBook(app, lang);
      const { act } = await firstInStock(app);
      await (await act('reg_repair_send')).click();
      await (await dialogNamed(app, 'reg_repair_send_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_repair_send_title');
      return [
        dialog.getByText(slotted(await app.t('reg_repair_send_msg'))).first(),
        labelled(dialog.getByLabel(await app.t('reg_repair_reason'), { exact: true })),
        side('end', dialog.getByRole('button', { name: await app.t('reg_repair_send'), exact: true })),
      ];
    },
    // the confirm's own Cancel — the confirm itself is never pressed
    after: async (app) => cancel(app, 'reg_repair_send_title'),
  },
];
