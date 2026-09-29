// The dashboard guide's screens: 4.4 (build your dashboard, and arrange it). Nothing is created, saved or removed: the Widget
// Builder opens on its gallery (it resets on every open), a tile or a radio inside it is the window's own state, Create Widget is
// never pressed, and the builder closes by Escape. Edit Layout is a screen mode only; Done puts it back.
// (Step 1 is the site's own `dashboard` shot in ../shots.mjs, with its outlines.)
import { around, dashboardCard, escape, escapeRe, labelled, side, toTop } from '../helpers.mjs';

/** The Widget Builder, found by its title. */
const builder = async (app) => app.page.getByRole('dialog', { name: await app.t('widget_builder'), exact: true });

/** ANALYTICS, then Add Widget: the builder opens on Ready-made widgets. */
async function openBuilder(app) {
  await app.nav('tab_analytics');
  await app.page.getByRole('button', { name: await app.t('add_widget'), exact: true }).first().click();
  const dialog = await builder(app);
  await dialog.waitFor();
  await app.idle(600);
  return dialog;
}

/** Build your own on the activity log: the gallery's own act, then the Activity Logs tile (a radio), then Next. */
async function buildOwnOnLogs(app) {
  const dialog = await openBuilder(app);
  await dialog.getByRole('button', { name: await app.t('wiz_build_own'), exact: true }).click();
  // a source tile's name is its label, then its description: found by the start of its name
  await dialog.getByRole('radio', { name: new RegExp(`^${escapeRe(await app.t('wiz_source_logs'))}`) }).click();
  await dialog.getByRole('button', { name: await app.t('wiz_btn_next'), exact: true }).click();
  await dialog.getByRole('combobox', { name: await app.t('wiz_group_by'), exact: true }).waitFor();
  return dialog;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 2: the builder open on its gallery, untouched
    id: 'dashboard-gallery',
    alt: { en: 'The Widget Builder\'s ready-made widgets: filter by source, pick one, or build your own', he: 'הווידג׳טים המוכנים בבונה הווידג׳טים: מסננים לפי מקור, בוחרים אחד או בונים לבד' },
    badge: 'start',
    run: async (app) => { await openBuilder(app); },
    marks: async (app) => {
      const dialog = await builder(app);
      return [
        // the gallery's source filter (a radiogroup with no name of its own): found by its first radio, All
        dialog.getByRole('radio', { name: await app.t('wiz_all_sources'), exact: true }).locator('xpath=..'),
        // the tile grid carries the gallery's name
        dialog.locator(`[aria-label="${await app.t('wiz_gallery')}"]`),
        side('end', dialog.getByRole('button', { name: await app.t('wiz_build_own'), exact: true })),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 3: a ready-made widget picked (Stock by Location), the builder on Finish, nothing typed
    id: 'dashboard-finish',
    alt: { en: 'Finishing a ready-made widget: its live preview, the title, the size on the dashboard and who sees it', he: 'סיום של וידג׳ט מוכן: התצוגה המקדימה החיה, הכותרת, הגודל בלוח הבקרה ומי רואה אותו' },
    badge: 'start',
    run: async (app) => {
      const dialog = await openBuilder(app);
      // a gallery tile's name is its title, then its source's name: found by the start of its name
      await dialog.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('w_title_stock_by_location'))}`) }).first().click();
      await dialog.getByRole('textbox', { name: await app.t('wiz_widget_title'), exact: true }).waitFor();
      await dialog.getByRole('radiogroup', { name: await app.t('wiz_audience'), exact: true }).scrollIntoViewIfNeeded();
      await app.idle(900);
    },
    marks: async (app) => {
      const dialog = await builder(app);
      return [
        labelled(dialog.getByRole('textbox', { name: await app.t('wiz_widget_title'), exact: true })),
        // the size block: its label and the grid under it
        dialog.getByRole('grid', { name: await app.t('wiz_size'), exact: true }).locator('xpath=../..'),
        // the row: the label at its start, the three choices at its end
        dialog.getByRole('radiogroup', { name: await app.t('wiz_audience'), exact: true }).locator('xpath=..'),
        side('end', dialog.getByRole('button', { name: await app.t('wiz_btn_create'), exact: true })),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 4: Build your own on the activity log, the Question step open, both questions left at None
    id: 'dashboard-question',
    alt: { en: 'Building your own widget on the activity log: the live preview, the four steps and the question — filter by, group by', he: 'בניית וידג׳ט משלכם על יומני הפעילות: התצוגה המקדימה החיה, ארבעת השלבים והשאלה — סינון לפי, קיבוץ לפי' },
    badge: 'start',
    run: async (app) => { await buildOwnOnLogs(app); await app.idle(900); },
    marks: async (app) => {
      const dialog = await builder(app);
      return [
        // the preview block: its small label and the widget frame under it
        dialog.getByText(await app.t('wiz_preview'), { exact: true }).first().locator('xpath=..'),
        // the ONE step header: the row that holds the four step buttons (a chip's name is its number, then its label)
        dialog.getByRole('button', { name: new RegExp(`${escapeRe(await app.t('wiz_step_source'))}$`) }).first().locator('xpath=..'),
        labelled(dialog.getByRole('combobox', { name: await app.t('wiz_filter_by'), exact: true })),
        labelled(dialog.getByRole('combobox', { name: await app.t('wiz_group_by'), exact: true })),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 5: the Visual step on the activity log — Trend Line chosen, Own period on (its slider at 30 days), nothing saved
    id: 'dashboard-visual',
    alt: { en: 'Choosing a visual: only the charts this source can show, the widget\'s own period and how time is grouped', he: 'בחירת תצוגה: רק התרשימים שהמקור הזה יודע להציג, התקופה של הווידג׳ט וקיבוץ הזמן' },
    badge: 'start',
    run: async (app) => {
      const dialog = await buildOwnOnLogs(app);
      await dialog.getByRole('button', { name: await app.t('wiz_btn_next'), exact: true }).click();
      await dialog.getByRole('radio', { name: new RegExp(`^${escapeRe(await app.t('wiz_vis_trend'))}`) }).click();
      await dialog.getByRole('radio', { name: await app.t('wiz_period_own'), exact: true }).click();
      await dialog.getByRole('slider', { name: await app.t('wiz_look_back'), exact: true }).waitFor();
      // the body is taller than the window here: scrolled to its end, so the period rows under the visuals are whole
      await dialog.getByText(await app.t('wiz_bucket'), { exact: true }).first().locator('xpath=..').evaluate((el) => el.scrollIntoView({ block: 'end' }));
      await app.idle(900);
    },
    marks: async (app) => {
      const dialog = await builder(app);
      return [
        dialog.getByRole('radiogroup', { name: await app.t('wiz_step_visual'), exact: true }),
        dialog.getByText(await app.t('wiz_period'), { exact: true }).first().locator('xpath=..'),
        // the slider's own block: its label and readout, the track and its stops
        dialog.getByText(await app.t('wiz_look_back'), { exact: true }).first().locator('xpath=../..'),
        dialog.getByText(await app.t('wiz_bucket'), { exact: true }).first().locator('xpath=..'),
      ];
    },
    after: async (app) => escape(app),
  },
  {
    // step 6: the dashboard's top in arranging mode (a screen mode only — nothing on a widget is pressed)
    id: 'dashboard-arrange',
    alt: { en: 'Arranging the dashboard: each widget\'s move arrows, size, edit and remove, and Done on the band', he: 'סידור לוח הבקרה: לכל וידג׳ט חצי הזזה, גודל, עריכה והסרה, והכפתור סיום ברצועה' },
    badge: 'corner',
    run: async (app) => {
      await app.nav('tab_analytics');
      await app.idle(800);
      // an earlier dashboard shot may leave the grid scrolled: the first row back to the top of its pane
      await toTop(await dashboardCard(app, 'w_title_personnel'));
      await app.page.getByRole('button', { name: await app.t('an_edit_layout'), exact: true }).first().click();
      await app.idle(700);
    },
    // the Registry snapshot widget: in the first column (arranging makes the grid wider than the window, so the last column
    // runs off the pane), and third in order, so both move arrows are live
    marks: async (app) => {
      const card = await dashboardCard(app, 'preset_reg_snapshot');
      const title = await app.t('preset_reg_snapshot');
      return [
        app.page.getByRole('button', { name: await app.t('brd_edit_layout_done'), exact: true }).first(),
        around([card.getByRole('button', { name: await app.t('move_left'), exact: true }), card.getByRole('button', { name: await app.t('move_right'), exact: true })], 'above'),
        side('above', card.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('wiz_size'))}: `) })),
        around([card.getByRole('button', { name: `${await app.t('edit')} — ${title}`, exact: true }), card.getByRole('button', { name: `${await app.t('remove')} — ${title}`, exact: true })], 'above'),
      ];
    },
    // Done ends the mode (found by its label right before the click)
    after: async (app) => {
      await app.page.getByRole('button', { name: await app.t('brd_edit_layout_done'), exact: true }).first().click();
      await app.idle(400);
    },
  },
];
