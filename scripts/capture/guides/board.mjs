// The board guide's screens: 4.1 (build your board from tabs and groups). Nothing is created, renamed, moved or saved: a tab is
// picked, a window opens untouched and closes by its own Cancel, Edit Layout is a screen mode that Done puts back. The controls
// that SAVE ON A CLICK are never pressed: the 30 · 60 · 90 choice, a group's move arrows and width, a tab's Position arrows.
import { NAMES, around, boardCard, escapeRe, openLogistics, side, toTop } from '../helpers.mjs';

/** The Warehouse tab's first group (GR-001, holds the Hand Truck) and its second (GR-002: both arrows live in Edit Layout). */
const GROUP = { en: 'Handling', he: 'שינוע' };
const MIDDLE = { en: 'Packaging', he: 'אריזה' };

/** Logistics on Equipment, then the home tab picked by its own name — a shot never trusts the tab last left open. */
async function openHomeTab(app, lang) {
  await openLogistics(app);
  await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
  await app.idle(600);
}
/** A window by its title. */
const dialogNamed = async (app, key) => app.page.getByRole('dialog', { name: await app.t(key), exact: true });
/** Close a window by its own Cancel, found by its label right before the click. */
async function cancel(app, key) {
  await (await dialogNamed(app, key)).getByRole('button', { name: await app.t('cancel'), exact: true }).click();
  await app.idle(400);
}
/** A group card: the card that holds the group's own history plate ("View activity log — Handling"). */
const groupCard = async (app, name) => app.page.locator('.group-card').filter({ has: app.page.getByRole('button', { name: `${await app.t('view_activity')} — ${name}`, exact: true }) }).first();
/** A name field (a required field's label carries a star, so it is found by the label's START; the capture adds the label). */
const nameField = async (dialog, app, key) => dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t(key))}`) });
/** The colour block: its label is a plain line, so the block is that line's parent. */
const colourBlock = async (dialog, app) => dialog.getByText(await app.t('lbl_color'), { exact: true }).locator('xpath=..');

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the board on its home tab (a tab picked, nothing opened)
    id: 'board-tabs',
    alt: { en: 'The Logistics board on its Warehouse tab: Logistics in the side menu, the open tab with its history and Edit buttons, and + TAB at the end of the row', he: 'לוח הלוגיסטיקה בכרטיסייה מחסן: לוגיסטיקה בתפריט הצדדי, הכרטיסייה הפתוחה עם הכפתורים של יומן הפעילות ועריכה, ו־+ כרטיסייה בסוף השורה' },
    run: openHomeTab,
    marks: async (app, lang) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_logistics'))}`, 'i') }).first(),
      // the open tab's pill: its name with its two plates (history · Edit) inside it
      app.page.locator('[data-dept-tab]').filter({ has: app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }) }).first(),
      side('end', app.page.getByRole('button', { name: await app.t('btn_new_tab'), exact: true }).first()),
    ],
  },
  {
    // step 2: the new-tab window, open and untouched
    id: 'board-tab-new',
    alt: { en: 'The + TAB window: the tab\'s name, its colour and Save', he: 'החלון + כרטיסייה: שם הכרטיסייה, הצבע שלה ושמור' },
    badge: 'start',
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      await app.page.getByRole('button', { name: await app.t('btn_new_tab'), exact: true }).first().click();
      await (await dialogNamed(app, 'btn_new_tab')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'btn_new_tab');
      return [
        await nameField(dialog, app, 'lbl_dept_name'),
        await colourBlock(dialog, app),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'btn_new_tab'),
  },
  {
    // step 3: the new-group window from the dashed box, open and untouched
    id: 'board-group-new',
    alt: { en: 'The + GROUP window: the group\'s name, its colour, its notes and Save', he: 'החלון + קבוצה: שם הקבוצה, הצבע שלה, ההערות ושמור' },
    badge: 'start',
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      // the dashed placeholder is a button named by its word ("+ GROUP")
      await app.page.getByRole('button', { name: await app.t('btn_new_group'), exact: true }).first().click();
      await (await dialogNamed(app, 'btn_new_group')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'btn_new_group');
      return [
        await nameField(dialog, app, 'lbl_group_name'),
        await colourBlock(dialog, app),
        dialog.getByRole('textbox', { name: await app.t('lbl_notes'), exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'btn_new_group'),
  },
  {
    // step 4: the first group's card at the top of the board (nothing opened)
    id: 'board-group-header',
    alt: { en: 'A group card\'s header: its name and code, the history button and the menu, and Add', he: 'הכותרת של כרטיס קבוצה: השם והקוד, כפתור יומן הפעילות והתפריט, והוסף' },
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      await toTop(await groupCard(app, GROUP[lang]));
      await app.idle(400);
    },
    marks: async (app, lang) => {
      const card = await groupCard(app, GROUP[lang]);
      const name = GROUP[lang];
      return [
        // the name column: the name with its (i), and the GR code under it
        card.getByText(/^GR-\d{3,}$/).first().locator('xpath=..'),
        // history and the menu stand together: ONE outline
        around([card.getByRole('button', { name: `${await app.t('view_activity')} — ${name}`, exact: true }),
          card.getByRole('button', { name: `${await app.t('actions')} — ${name}`, exact: true })], 'above'),
        side('end', card.getByRole('button', { name: `${await app.t('add')} — ${name}`, exact: true })),
      ];
    },
  },
  {
    // step 5: the same card, its three tiles and its items (the 30 · 60 · 90 choice is never clicked: it saves on a click)
    id: 'board-group-band',
    alt: { en: 'A Logistics group card: the stock ring, the activity columns, who holds its gear by department, and its items', he: 'כרטיס קבוצה בלוגיסטיקה: טבעת המלאי, עמודות הפעילות, מי מחזיק בציוד לפי מחלקה, והפריטים שלה' },
    settle: 1500,
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      await toTop(await groupCard(app, GROUP[lang]));
      await app.idle(600);
    },
    marks: async (app, lang) => {
      const card = await groupCard(app, GROUP[lang]);
      return [
        // each tile is the box that holds its small caption
        card.getByText(await app.t('chart_stock'), { exact: true }).first().locator('xpath=..'),
        // the activity tile: the 30 · 60 · 90 radiogroup → its caption row → the tile
        card.getByRole('radiogroup', { name: await app.t('gc_activity'), exact: true }).locator('xpath=../..'),
        card.getByText(await app.t('gc_by_dept'), { exact: true }).first().locator('xpath=..'),
        // one item of the group: the Hand Truck's card
        await boardCard(app, NAMES.plainItem[lang]),
      ];
    },
  },
  {
    // step 6: the board in its layout mode (a screen mode only; nothing on a card is pressed)
    id: 'board-arrange',
    alt: { en: 'The board in Edit Layout: Done, and a group\'s move arrows and width', he: 'הלוח במצב ערוך פריסה: סיום, וחצי ההזזה והרוחב של קבוצה' },
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      await toTop(await groupCard(app, GROUP[lang]));
      await app.page.getByRole('button', { name: await app.t('an_edit_layout'), exact: true }).first().click();
      await app.idle(700);
    },
    // the second group of three, so both of its arrows are live
    marks: async (app, lang) => {
      const card = await groupCard(app, MIDDLE[lang]);
      return [
        app.page.getByRole('button', { name: await app.t('brd_edit_layout_done'), exact: true }).first(),
        around([card.getByRole('button', { name: await app.t('move_left'), exact: true }),
          card.getByRole('button', { name: await app.t('move_right'), exact: true })], 'above'),
        // the size button: "Width: 1 across"
        side('above', card.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('width'))}: `) })),
      ];
    },
    // Done ends the mode (found by its label right before the click)
    after: async (app) => {
      await app.page.getByRole('button', { name: await app.t('brd_edit_layout_done'), exact: true }).first().click();
      await app.idle(400);
    },
  },
  {
    // step 7: Edit Tab for the home tab, open and untouched (the Position arrows save on a click: never pressed)
    id: 'board-tab-edit',
    alt: { en: 'Edit Tab: the tab\'s code, its name, its colour and its position in the row', he: 'עריכת כרטיסייה: הקוד של הכרטיסייה, השם, הצבע והמיקום שלה בשורה' },
    badge: 'start',
    run: async (app, lang) => {
      await openHomeTab(app, lang);
      await app.page.getByRole('button', { name: `${await app.t('edit')} — ${NAMES.homeTab[lang]}`, exact: true }).first().click();
      await (await dialogNamed(app, 'edit_tab')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'edit_tab');
      return [
        // "ID Code: TB-001"
        dialog.getByText(new RegExp(`^${escapeRe(await app.t('lbl_ref_code'))}: `)).first(),
        await nameField(dialog, app, 'lbl_dept_name'),
        await colourBlock(dialog, app),
        // the Position block: its label and the two arrows under it
        dialog.getByText(await app.t('lbl_position'), { exact: true }).locator('xpath=..'),
      ];
    },
    after: async (app) => cancel(app, 'edit_tab'),
  },
];
