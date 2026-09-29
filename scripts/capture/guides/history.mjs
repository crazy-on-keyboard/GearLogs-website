// The history guide's screens: 4.6 (read the history of a person, a group, a kit or an archived item). Nothing is changed: a
// tab or an area is picked, one log window opens (reading only — its Load buttons are never pressed) and closes by Escape.
import { NAMES, control, escape, escapeRe, openKits, leaveKits, side, toTop } from '../helpers.mjs';

/** Personnel on the head's tab, picked by its own label (the board opens on whichever tab comes first). */
async function openPeople(app, lang) {
  await app.nav('tab_personnel');
  await app.page.getByRole('button', { name: NAMES.peopleTab[lang], exact: true }).first().click();
  await app.idle(800);
}

/** The log window: the dialog that holds its own "Load 30 more" (its name is the person's label, so it is found by its button). */
const logWindow = async (app) => app.page.getByRole('dialog').filter({ has: app.page.getByRole('button', { name: await app.t('log_load_more'), exact: true }) }).last();

/** The head's log window, open and loaded (the spinner gives way to the table: wait for the first body row). */
async function openPersonLog(app, lang) {
  await openPeople(app, lang);
  await (await control(app, 'view_activity', NAMES.person[lang])).click();
  const dialog = await logWindow(app);
  await dialog.getByRole('row').nth(1).waitFor({ timeout: 15_000 });
  await app.idle(600);
  return dialog;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the Personnel board with the three history plates in the picture (nothing opened)
    id: 'history-buttons',
    alt: { en: 'The Personnel board with its three history buttons: the tab\'s, the group\'s and the person\'s', he: 'לוח כוח האדם עם שלושת כפתורי ההיסטוריה: של הכרטיסייה, של הקבוצה ושל האדם' },
    run: async (app, lang) => {
      await openPeople(app, lang);
      // the group's header at the top of the board's pane; the tab strip sits above the pane and stays on screen
      await toTop(await control(app, 'view_activity', NAMES.team[lang]));
      await app.idle(400);
    },
    marks: async (app, lang) => [
      // the active tab's own plate: exact, so a group whose name ends in the tab's word never matches (its number under it:
      // the tab's name stands at its start, the tab's Edit at its end)
      side('below', app.page.getByRole('button', { name: `${await app.t('view_activity')} — ${NAMES.peopleTab[lang]}`, exact: true }).first()),
      side('start', await control(app, 'view_activity', NAMES.team[lang])),
      // the person's plate (the card stays folded, so the first match is the header's)
      side('start', await control(app, 'view_activity', NAMES.person[lang])),
    ],
  },
  {
    // step 2: the head's log window — its title, the column heads and the newest entry
    id: 'history-person',
    alt: { en: 'A person\'s activity log: when, who did it, the type and the action, newest first', he: 'יומן הפעילות של אדם: מתי, מי ביצע, הסוג והפעולה, מהחדש לישן' },
    badge: 'start',
    run: async (app, lang) => { await openPersonLog(app, lang); },
    marks: async (app) => {
      const dialog = await logWindow(app);
      return [
        // the title with the line under it (Activity Log)
        dialog.getByRole('heading').first().locator('xpath=..'),
        dialog.getByRole('row').first(),
        dialog.getByRole('row').nth(1),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 3: the same window, its shelf — the window line, the two Load buttons (never pressed) and Close
    id: 'history-window',
    alt: { en: 'The foot of the activity log: the period shown, Load 30 more, Load all, and Close', he: 'תחתית יומן הפעילות: התקופה המוצגת, טעינת 30 נוספים, טעינת הכול וסגירה' },
    // under the shelf: over it stands the log's last entry
    badge: 'below',
    run: async (app, lang) => { await openPersonLog(app, lang); },
    marks: async (app) => {
      const dialog = await logWindow(app);
      return [
        // the window line at the shelf's start: "Last 30 days · 12"
        dialog.getByText(new RegExp(`^${escapeRe(await app.t('log_showing_last'))} \\d+ ${escapeRe(await app.t('log_days'))} · `)).first(),
        dialog.getByRole('button', { name: await app.t('log_load_more'), exact: true }),
        dialog.getByRole('button', { name: await app.t('log_load_all'), exact: true }),
        // the shelf's Close (the title bar's × is named "Close — <title>", so exact never matches it)
        dialog.getByRole('button', { name: await app.t('close'), exact: true }),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 4: the Kits area with the held kit's history plate in view (the area switch is put back after)
    id: 'history-kit',
    alt: { en: 'The Kits area in Logistics, with a kit\'s own history button', he: 'אזור הערכות בלוגיסטיקה, עם כפתור ההיסטוריה של ערכה' },
    run: async (app, lang) => {
      await openKits(app);
      await (await control(app, 'view_activity', NAMES.heldKit[lang])).scrollIntoViewIfNeeded();
      await app.idle(400);
    },
    marks: async (app, lang) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_logistics'))}`, 'i') }).first(),
      side('corner', app.page.getByRole('radio', { name: await app.t('area_kits'), exact: true }).first()),
      side('corner', await control(app, 'view_activity', NAMES.heldKit[lang])),
    ],
    after: async (app) => leaveKits(app),
  },
  {
    // step 5: the Archive on its Equipment Archives tab (a tab picked, nothing opened)
    id: 'history-archive',
    alt: { en: 'The Archive: Personnel Archives, Equipment Archives, and a row\'s History button', he: 'הארכיון: ארכיון כוח אדם, ארכיון ציוד, וכפתור ההיסטוריה של שורה' },
    run: async (app) => {
      await app.nav('tab_archive');
      // the Archive opens on Personnel Archives: the Equipment Archives tab is picked by its own label
      await app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('arch_tab_equipment'))}`) }).first().click();
      await app.idle(800);
    },
    marks: async (app) => [
      app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('arch_tab_personnel'))}`) }).first(),
      app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('arch_tab_equipment'))}`) }).first(),
      // the first row's History: "History — <code> · <item>"
      side('corner', app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('arch_history'))} — `) }).first()),
    ],
  },
];
