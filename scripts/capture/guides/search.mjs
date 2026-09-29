// The search guide's screens: 4.13 (find anything). Nothing is written: a word typed in the header's search box is the
// screen's own state, a result or Show all only opens a window or a screen, and every shot closes what it opened (Escape)
// and empties the box. Enter is never typed.
import { NAMES, escape, escapeRe, onScreen, openLogistics, side, slotted } from '../helpers.mjs';

/** The words the guide searches for in each workspace: "scanner" / "סורק" finds items, units and lots; "Vantix" finds items
 *  only, by their manufacturer (more than five in both, so the group ends in Show all). */
const TERMS = { find: { en: 'scanner', he: 'סורק' }, maker: { en: 'Vantix', he: 'Vantix' } };
/** The header's search box (it has no name of its own: found by its placeholder). */
const searchBox = async (app) => app.page.getByPlaceholder(await app.t('search_ph'), { exact: true }).first();
/** The results panel: the box row's next sibling. */
const results = async (app) => (await searchBox(app)).locator('xpath=../following-sibling::div[1]');
/** A results group's heading ("Items", "Units"…); its parent is the whole group. */
const group = async (app, key) => (await results(app)).getByText(await app.t(key), { exact: true }).first();

/** Logistics on its item board (a tab picked when given), a word typed, the results open. */
async function typeIn(app, lang, term, tab) {
  await openLogistics(app);
  if (tab) { await app.page.getByRole('button', { name: tab, exact: true }).first().click(); await app.idle(600); }
  await (await searchBox(app)).fill(term);
  await (await results(app)).waitFor();
  await app.idle(700);
}
/** Close what is open (the results, or a window over them) and empty the box. */
async function clearSearch(app) {
  await escape(app);
  await (await searchBox(app)).fill('');
  await app.idle(300);
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: a word typed over the Fleet tab, the results open (nothing pressed)
    id: 'search-results',
    alt: { en: 'The search box with a word typed: the results grouped by type, the best match first', he: 'תיבת החיפוש עם מילה שהוקלדה: התוצאות מקובצות לפי סוג, ההתאמה הטובה ביותר ראשונה' },
    run: async (app, lang) => typeIn(app, lang, TERMS.find[lang], NAMES.serialTab[lang]),
    marks: async (app) => {
      const items = await group(app, 'hdr_sec_items');
      return [
        (await searchBox(app)).locator('xpath=..'),
        side('end', items),
        // the first row under Items: best first, the typed letters highlighted
        items.locator('xpath=following-sibling::button[1]'),
        side('end', await group(app, 'hdr_sec_units')),
      ];
    },
    after: clearSearch,
  },
  {
    // step 2: an item found by its name and its result clicked — the item's read-only window opens over the board
    id: 'search-open',
    alt: { en: 'An item opened from the search: its stock, location, group and status, and who holds it', he: 'פריט שנפתח מהחיפוש: המלאי, המיקום, הקבוצה והסטטוס שלו, ומי מחזיק בו' },
    badge: 'start',
    run: async (app, lang) => {
      await typeIn(app, lang, NAMES.returnItem[lang], NAMES.homeTab[lang]);
      // a result row's name starts with the item's name
      await (await results(app)).getByRole('button', { name: new RegExp(`^${escapeRe(NAMES.returnItem[lang])}`) }).first().click();
      await app.page.getByRole('dialog', { name: NAMES.returnItem[lang], exact: true }).waitFor();
      await app.idle(600);
    },
    marks: async (app, lang) => {
      const dialog = app.page.getByRole('dialog', { name: NAMES.returnItem[lang], exact: true });
      return [
        // a fact's label → its cell → the grid of four facts (Stock · Location · Group · Status)
        dialog.getByText(await app.t('stock'), { exact: true }).first().locator('xpath=../..'),
        // the Assigned To heading with the table under it
        dialog.getByRole('heading', { name: await app.t('assigned_to'), exact: true }).locator('xpath=..'),
      ];
    },
    after: clearSearch,
  },
  {
    // step 3: the maker's name typed — every result says where it matched; nothing pressed
    id: 'search-matched',
    alt: { en: 'Results that say where they matched, and Show all at the foot of the group', he: 'תוצאות שמציינות איפה נמצאה ההתאמה, ו״הצגת הכול״ בסוף הקבוצה' },
    run: async (app, lang) => typeIn(app, lang, TERMS.maker[lang]),
    marks: async (app) => {
      const panel = await results(app);
      // the panel scrolls: a line below its edge is in the page but not in sight, so only the lines inside the panel count
      const edge = await panel.boundingBox();
      const inSight = [];
      for (const line of await onScreen(app, panel.getByText(slotted(await app.t('hdr_matched_on'))))) {
        const b = await line.boundingBox();
        if (b && b.y >= edge.y && b.y + b.height <= edge.y + edge.height) inSight.push(line);
      }
      return [
        // every "Matched on …" line in sight as ONE number
        inSight,
        panel.getByRole('button', { name: slotted(await app.t('hdr_show_all_n')) }).first(),
      ];
    },
    after: clearSearch,
  },
  {
    // step 4: the word typed, then the Units group's Show all — the Registry opens with the word in its filter (a screen change only)
    id: 'search-carried',
    alt: { en: 'The Registry opened from Show all, with the searched word in its filter: the matching items and their units', he: 'המרשם שנפתח מ״הצגת הכול״, עם המילה שחיפשתם בתיבת הסינון: הפריטים התואמים והיחידות שלהם' },
    run: async (app, lang) => {
      await typeIn(app, lang, TERMS.find[lang], NAMES.serialTab[lang]);
      const more = (await group(app, 'hdr_sec_units')).locator('xpath=..').getByRole('button', { name: slotted(await app.t('hdr_show_all_n')) });
      await more.scrollIntoViewIfNeeded();
      await more.click();
      await app.page.getByPlaceholder(await app.t('reg_search_ph'), { exact: true }).first().waitFor();
      await app.idle(900);
    },
    marks: async (app) => {
      // a pane title → its title group → the bar → the pane (as in registry.mjs)
      const units = app.page.getByText(new RegExp(`^${escapeRe(await app.t('reg_pane_units'))} · `)).first().locator('xpath=../../..');
      return [
        app.page.getByPlaceholder(await app.t('reg_search_ph'), { exact: true }).first().locator('xpath=..'),
        // the Property Book's first pane (Items), found through the grid the Units pane sits in
        units.locator('xpath=../*[1]'),
        units,
      ];
    },
    // the Registry's filter is that screen's own state; the header's box is emptied
    after: async (app) => { await (await searchBox(app)).fill(''); await app.idle(300); },
  },
];
