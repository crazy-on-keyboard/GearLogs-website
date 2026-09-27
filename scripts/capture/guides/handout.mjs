// The hand-out guides' screens: 4.2 (hand out gear, and take it back) and 4.3 (sign out gear for a team). Every shot opens a
// window and leaves it untouched: no confirm is ever pressed, no Enter is ever typed, and each window closes by Escape or its
// own Cancel — found by its label right before the click. Ticking a line in a window is the window's own state, never saved.
import { NAMES, boardCard, control, escape, escapeRe, openCard, closeCard, side, slotted } from '../helpers.mjs';

/** The small Assign card an item or a person opens ("Assign Item — <name>", or "Assign Unit — <name>" on a serial item). */
const assignCard = async (app, key = 'assign_item') => app.page.getByRole('dialog', { name: new RegExp(`^${escapeRe(await app.t(key))} — `) }).first();

/** The team head's batch window, opened from the head's own card with one whole group ticked (nothing is issued). */
async function openBatch(app, lang) {
  await app.nav('tab_personnel');
  await (await control(app, 'sign_out_batch', NAMES.person[lang])).click();
  const dialog = await batchDialog(app);
  await dialog.waitFor();
  // a group's label starts with its name (an item's label starts with its code), so the anchor never picks an item
  await dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(NAMES.batchGroup[lang])}`) }).first().check();
  await app.idle(900);
}
const batchDialog = async (app) => app.page.getByRole('dialog', { name: await app.t('sign_out_batch'), exact: true }).first();

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // 4.2 step 1: the small Assign card on an item, open, nothing typed and nothing pressed
    id: 'assign-item',
    alt: { en: 'Assign Item opened on the Hand Truck card: pick the person, set the quantity, press OK', he: 'שייך ציוד פתוח בכרטיס של עגלת יד: בוחרים אדם, קובעים כמות ולוחצים על אישור' },
    run: async (app, lang) => {
      await app.nav('tab_logistics');
      await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
      await app.idle(500);
      await (await control(app, 'assign_item', NAMES.plainItem[lang])).click();
      await (await assignCard(app)).waitFor();
      await app.idle(500);
    },
    marks: async (app, lang) => {
      const card = await assignCard(app);
      return [
        side('corner', await control(app, 'assign_item', NAMES.plainItem[lang])),
        card.getByRole('combobox', { name: await app.t('assign_item'), exact: true }),
        card.getByRole('group', { name: await app.t('quantity'), exact: true }),
        card.getByRole('button', { name: await app.t('ok'), exact: true }),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // 4.2 step 2: the same card on a person's card, open, nothing picked and nothing pressed
    id: 'assign-person',
    alt: { en: 'Assign Item opened on a person\'s card on the Personnel board: pick the item, set the quantity, press OK', he: 'שייך ציוד פתוח בכרטיס של אדם בלוח כוח האדם: בוחרים פריט, קובעים כמות ולוחצים על אישור' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await (await control(app, 'assign_item', NAMES.person[lang])).click();
      await (await assignCard(app)).waitFor();
      await app.idle(500);
    },
    marks: async (app, lang) => {
      const card = await assignCard(app);
      return [
        side('corner', await control(app, 'assign_item', NAMES.person[lang])),
        card.getByRole('combobox', { name: await app.t('assign_item'), exact: true }),
        card.getByRole('group', { name: await app.t('quantity'), exact: true }),
        card.getByRole('button', { name: await app.t('ok'), exact: true }),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // 4.2 step 4: a serial-numbered item's card (Assign Unit), open, nothing picked (its Assign stays disabled)
    id: 'assign-unit',
    alt: { en: 'Assign Unit opened on the Barcode Scanner card: pick the unit and the person, then assign, or open the window for more people', he: 'שיוך יחידה פתוח בכרטיס של סורק ברקוד: בוחרים יחידה ואדם ומשייכים, או פותחים את החלון לעוד אנשים' },
    run: async (app, lang) => {
      await app.nav('tab_logistics');
      await app.page.getByRole('button', { name: NAMES.serialTab[lang], exact: true }).first().click();
      await app.idle(800);
      await (await control(app, 'assign_item', NAMES.serialItem[lang])).click();
      await (await assignCard(app, 'assign_unit')).waitFor();
      await app.idle(500);
    },
    marks: async (app) => {
      const card = await assignCard(app, 'assign_unit');
      return [
        card.getByRole('combobox', { name: await app.t('reg_pick_unit'), exact: true }),
        card.getByRole('combobox', { name: await app.t('assign_unit'), exact: true }),
        card.getByRole('button', { name: await app.t('handout_more_people'), exact: true }),
        card.getByRole('button', { name: await app.t('reg_assign_action'), exact: true }),
      ];
    },
    // the board goes back to its first tab, as 'item-card' leaves it
    after: async (app, lang) => {
      await escape(app);
      await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
      await app.idle(500);
    },
  },
  {
    // 4.2 step 5: a person's card open, the count of what they hold and Return on a held item (nothing is pressed)
    id: 'person-card-return',
    alt: { en: 'A person opened on the Personnel board: the count of everything they hold, and a Return button on each held item', he: 'אדם פתוח בלוח כוח האדם: ספירת כל מה שבידיו, וכפתור החזר בכל פריט שבידיו' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.returnPerson[lang]);
      await (await control(app, 'return_item', NAMES.returnItem[lang])).scrollIntoViewIfNeeded();
      await app.idle(300);
    },
    marks: async (app, lang) => [
      (await boardCard(app, NAMES.returnPerson[lang])).getByText(new RegExp(`^${escapeRe(`${await app.t('assigned_items')} (`)}`)).first(),
      await control(app, 'return_item', NAMES.returnItem[lang]),
    ],
    after: async (app, lang) => closeCard(app, NAMES.returnPerson[lang]),
  },
  {
    // 4.2 step 6: the return dialog open for a held quantity item (Confirm Return is never pressed)
    id: 'return-dialog',
    alt: { en: 'Returning two cargo nets: the quantity to return, the ALL button and Confirm Return', he: 'החזרה של שתי רשתות מטען: הכמות להחזרה, הכפתור הכל ואשר החזרה' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.returnPerson[lang]);
      await (await control(app, 'return_item', NAMES.returnItem[lang])).click();
      await app.page.getByRole('dialog', { name: await app.t('return_modal_title'), exact: true }).waitFor();
      await app.idle(500);
    },
    marks: async (app) => {
      const dialog = app.page.getByRole('dialog', { name: await app.t('return_modal_title'), exact: true });
      return [
        dialog.getByText(new RegExp(`^${escapeRe((await app.t('returning_msg')).split('{0}')[0])}`)).first(),
        dialog.getByRole('group', { name: await app.t('qty_to_return'), exact: true }),
        dialog.getByRole('button', { name: await app.t('all_caps'), exact: true }),
        dialog.getByRole('button', { name: await app.t('confirm_return'), exact: true }),
      ];
    },
    // nothing comes back: the dialog's own Cancel, then the card folds
    after: async (app, lang) => {
      await app.page.getByRole('dialog', { name: await app.t('return_modal_title'), exact: true })
        .getByRole('button', { name: await app.t('cancel'), exact: true }).click();
      await app.idle(300);
      await closeCard(app, NAMES.returnPerson[lang]);
    },
  },
  {
    // 4.3 step 1: the head's own Edit Person window with the Department Head tick in view (no field is touched, nothing saved)
    id: 'person-form-head',
    alt: { en: 'Editing a person: the Department Head tick that gives their card the Issue Batch button', he: 'עריכת אדם: הסימון ראש מחלקה שמוסיף לכרטיס את הכפתור הנפקה מרוכזת' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await (await control(app, 'tooltip_edit', NAMES.person[lang])).click();
      const dialog = app.page.getByRole('dialog', { name: await app.t('edit_person'), exact: true }).first();
      await dialog.waitFor();
      await dialog.getByRole('checkbox', { name: await app.t('dept_head_label'), exact: true }).first().scrollIntoViewIfNeeded();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = app.page.getByRole('dialog', { name: await app.t('edit_person'), exact: true }).first();
      return [
        // the tick, its label and its (i)
        dialog.getByRole('checkbox', { name: await app.t('dept_head_label'), exact: true }).first().locator('xpath=../..'),
        app.page.getByRole('button', { name: await app.t('save'), exact: true }).last(),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // 4.3 step 2: the Personnel board as it opens — the head's card in gold, with Issue Batch (nothing is opened)
    id: 'personnel-head',
    alt: { en: 'The Personnel board: a department head\'s card in gold, with its Issue Batch button', he: 'לוח כוח האדם: הכרטיס של ראש מחלקה בזהב, עם הכפתור הנפקה מרוכזת' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await (await control(app, 'sign_out_batch', NAMES.person[lang])).waitFor();
    },
    marks: async (app, lang) => [
      side('end', (await boardCard(app, NAMES.person[lang])).getByText(new RegExp(`${escapeRe(NAMES.person[lang])}$`)).first()),
      side('corner', await control(app, 'sign_out_batch', NAMES.person[lang])),
    ],
  },
  {
    // 4.3 step 3: the batch window, one group ticked — the head, the search, the tick, the rows (nothing is issued)
    id: 'batch-pick',
    alt: { en: 'The team head\'s batch: the head held as custodian, the items tree with one group ticked, and a row for every item', he: 'האצווה של ראש הצוות: ראש המחלקה כאחראי, עץ הפריטים עם קבוצה אחת מסומנת, ושורה לכל פריט' },
    run: openBatch,
    // (the tick scrolls the tree to the group, so the search box above it is out of the picture — the step's text names it)
    marks: async (app, lang) => {
      const dialog = await batchDialog(app);
      return [
        dialog.getByText(await app.t('batch_custodian')).first().locator('xpath=..'),
        dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(NAMES.batchGroup[lang])}`) }).first().locator('xpath=..'),
        dialog.getByRole('table').first(),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // 4.3 step 4: the same window, the quantity tools (nothing is typed or pressed)
    id: 'batch-qty',
    alt: { en: 'The batch\'s rows: a typed quantity per item, All in stock for one row or every row, and the running total', he: 'שורות האצווה: כמות מוקלדת לכל פריט, הכול במלאי לשורה אחת או לכל השורות, והסיכום המתעדכן' },
    run: openBatch,
    marks: async (app) => {
      const dialog = await batchDialog(app);
      return [
        dialog.getByRole('button', { name: await app.t('handout_batch_all_rows'), exact: true }).first(),
        dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t('handout_col_qty'))} · `) }).first(),
        side('end', dialog.getByRole('button', { name: await app.t('handout_batch_all'), exact: true }).first()),
        dialog.getByRole('row').filter({ has: app.page.getByRole('cell', { name: await app.t('handout_total'), exact: true }) }).first(),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // 4.3 step 5: the same window, the notice line and the Issue button (the button is NEVER pressed)
    id: 'batch-issue',
    alt: { en: 'The batch ready to issue: who gets the notice, and the one button that issues every row', he: 'האצווה מוכנה להנפקה: מי מקבל את ההודעה, והכפתור האחד שמנפיק את כל השורות' },
    run: openBatch,
    marks: async (app, lang) => {
      const dialog = await batchDialog(app);
      // the head's notice line — one of two sentences, whichever the demo head's login state gives
      const said = await Promise.all(['handout_items_notice_one', 'handout_items_notice_none'].map(async (k) => escapeRe((await app.t(k)).replace('{0}', NAMES.person[lang]))));
      return [
        dialog.getByText(new RegExp(`^(${said.join('|')})$`)).first(),
        app.page.getByRole('button', { name: slotted(await app.t('handout_batch_submit')) }).first(),
      ];
    },
    after: async (app) => escape(app),
  },
];
