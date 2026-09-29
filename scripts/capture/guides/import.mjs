// The import guide's screens: 4.19 (bring your lists in from a spreadsheet). Nothing is imported, downloaded or saved: no
// Template button and no drop area is clicked (a download / the computer's file picker); step 3 hands the Logistics card a
// made-up four-row file in memory, which the app only READS into its preview (the write happens on Import alone, never
// pressed); the preview closes by its own Cancel.
import { around, escapeRe, side } from '../helpers.mjs';

/** Data Ops' own rail. */
const rail = async (app) => app.page.getByRole('navigation', { name: await app.t('tab_data'), exact: true });
/** The rail's Import Center (a red count joins its name while rows wait, so it is found by its start). */
const importTab = async (app) => (await rail(app)).getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('import_center_tab'))}`) }).first();
/** Data Ops on Import Center (it always opens on Overview, so the tab is pressed every time). */
async function openImport(app) {
  await app.nav('tab_data');
  await (await importTab(app)).click();
  await app.page.getByText(await app.t('imp_drag_hint'), { exact: true }).first().waitFor();
  await app.idle(600);
}
/** A card's title (its (i) joins the heading's name, so the title is found by its START). */
const zoneTitle = async (app, key) => app.page.getByRole('heading', { name: new RegExp(`^${escapeRe(await app.t(key))}`) }).first();
/** The whole card: title → title block → icon row → header strip → the card. */
const zone = async (app, key) => (await zoneTitle(app, key)).locator('xpath=../../../..');
/** The preview window. */
const preview = async (app) => app.page.getByRole('dialog', { name: await app.t('import_center_title'), exact: true });

/** Step 3's made-up stock file, in each workspace's own words: two new items, the Hand Truck the demo already has (set aside
 *  as a duplicate) and one quantity over 999,999,999 (set aside by a rule). The tab and the groups exist, so nothing would be
 *  created beside the items. The column names stay English: the importer reads English column names. */
const SAMPLE = {
  en: 'name,quantity,location,tab_name,group_name\nBox Cutter,12,Pack Station,Warehouse,Packaging\nPallet Scale,2,Dock 1,Warehouse,Handling\nHand Truck,22,Dock 1,Warehouse,Handling\nVoid Fill (bag),1000000000,Pack Station,Warehouse,Packaging\n',
  he: 'name,quantity,location,tab_name,group_name\nסכין חיתוך,12,עמדת אריזה,מחסן,אריזה\nמשקל משטחים,2,רמפה 1,מחסן,שינוע\nעגלת יד,22,רמפה 1,מחסן,שינוע\nחומר מילוי (שק),1000000000,עמדת אריזה,מחסן,אריזה\n',
};

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Data Ops on Import Center
    id: 'import-center',
    alt: { en: 'Data Ops on its Import Center: the hint above the cards, and the four import cards', he: 'ניהול נתונים במרכז הייבוא: ההנחיה מעל הכרטיסים, וארבעת כרטיסי הייבוא' },
    run: openImport,
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_data'))}`, 'i') }).first(),
      side('start', await importTab(app)),
      // the hint banner (the text's own box → the banner strip)
      app.page.getByText(await app.t('imp_drag_hint'), { exact: true }).first().locator('xpath=..'),
      // ONE number on each of the four cards
      await Promise.all(['imp_zone_logistics', 'imp_zone_people', 'imp_zone_users', 'imp_zone_registry'].map((k) => zone(app, k))),
    ],
  },
  {
    // step 2: the same page, one card pointed at (nothing clicked)
    id: 'import-zone',
    alt: { en: 'The Import Logistics card: its name, the Template button and the area a file is dropped on', he: 'כרטיס ייבוא לוגיסטיקה: השם, כפתור התבנית והאזור שאליו גוררים קובץ' },
    run: openImport,
    marks: async (app) => {
      const card = await zone(app, 'imp_zone_logistics');
      return [
        // the title with its (i) and the line under it
        (await zoneTitle(app, 'imp_zone_logistics')).locator('xpath=..'),
        side('above', card.getByRole('button', { name: await app.t('imp_template'), exact: true })),
        // the drop area: its two lines → the box that holds them
        card.getByText(await app.t('imp_drag_drop'), { exact: true }).locator('xpath=..'),
      ];
    },
  },
  {
    // step 3: the Logistics card handed the made-up file in memory — read only, the preview opens; nothing is pressed inside it
    id: 'import-preview',
    alt: { en: 'The import preview: how the file was read, what will be added, the rows set aside, and Import', he: 'התצוגה המקדימה של הייבוא: איך הקובץ נקרא, מה יתווסף, השורות שנשמרו בצד, וייבא' },
    badge: 'start',
    run: async (app, lang) => {
      await openImport(app);
      // the card's own hidden file field (never its click: that opens the computer's file picker)
      const card = await zone(app, 'imp_zone_logistics');
      await card.locator('input[type="file"]').setInputFiles({ name: 'meridian-stock.csv', mimeType: 'text/csv', buffer: Buffer.from(SAMPLE[lang], 'utf8') });
      await (await preview(app)).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await preview(app);
      return [
        dialog.getByText(await app.t('imp_prev_heading'), { exact: true }),
        // "Will add: 2 inventory items" (the count may carry direction marks, so only the start is matched)
        dialog.getByText(new RegExp(`^${escapeRe(await app.t('imp_prev_to_add'))}: `)).first(),
        // ONE outline around the two set-aside lines: the rule's and the duplicate's
        around([dialog.getByText(await app.t('imp_prev_refused_one'), { exact: true }).locator('xpath=..'),
          dialog.getByText(await app.t('imp_prev_conflicts_one'), { exact: true }).locator('xpath=..')]),
        side('end', dialog.getByRole('button', { name: await app.t('imp_prev_confirm'), exact: true })),
      ];
    },
    // the window's own Cancel, found by its label right before the click — Import is never pressed
    after: async (app) => {
      const dialog = await preview(app);
      if (await dialog.isVisible()) { await dialog.getByRole('button', { name: await app.t('cancel'), exact: true }).click(); await app.idle(400); }
    },
  },
  {
    // step 4: Import Center with its queue box in view (the demo has no rows waiting: All Clear)
    id: 'import-conflicts',
    alt: { en: 'Import Center with nothing waiting: the rail item and the All Clear box under the cards', he: 'מרכז הייבוא כששום דבר לא ממתין: הפריט בסרגל ותיבת ״הכל תקין״ מתחת לכרטיסים' },
    run: async (app) => {
      await openImport(app);
      await app.page.getByText(await app.t('all_clear'), { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: 'end' }));
      await app.idle(400);
    },
    marks: async (app) => [
      side('start', await importTab(app)),
      // "All Clear" → its text block → the box
      app.page.getByText(await app.t('all_clear'), { exact: true }).first().locator('xpath=../..'),
    ],
  },
];
