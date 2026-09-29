// The reports guide's screens: 4.12 (export a report, and keep a backup). Nothing is exported, downloaded or restored: a rail
// tab is picked, the backup window opens untouched (no password typed) and closes by its own Cancel; no export button is pressed.
// (Step 4 is the site's own `logs` shot in ../shots.mjs, with its outlines.)
import { escapeRe, onScreen, side, toTop } from '../helpers.mjs';

/** Data Ops' own rail. */
const rail = async (app) => app.page.getByRole('navigation', { name: await app.t('tab_data'), exact: true });
/** Data Ops on one of its rail tabs (it always opens on Overview, so the tab is pressed every time). */
async function openDataOps(app, key) {
  await app.nav('tab_data');
  await (await rail(app)).getByRole('button', { name: await app.t(key), exact: true }).click();
}
const backupWindow = async (app) => app.page.getByRole('dialog', { name: await app.t('exp_enc_backup'), exact: true });

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Exports, from the top
    id: 'dataops-exports',
    alt: { en: 'Data Ops on its Exports tab: the reports grouped by area', he: 'ניהול נתונים בכרטיסיית הייצוא: הדוחות מקובצים לפי תחום' },
    run: async (app) => {
      await openDataOps(app, 'exports_tab');
      await app.page.getByRole('heading', { name: await app.t('cat_logistics_rep'), exact: true }).first().waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const areas = await Promise.all(['cat_logistics_rep', 'rpt_cat_personnel', 'rpt_cat_approvals', 'reg_rep_title', 'rpt_cat_archive', 'rpt_cat_activity'].map((k) => app.t(k)));
      return [
        // the side menu's Data Ops (a collapsed rail names it by aria-label, an open one by its text)
        app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_data'))}`, 'i') }).first(),
        side('start', (await rail(app)).getByRole('button', { name: await app.t('exports_tab'), exact: true })),
        // ONE number on every area title that sits wholly in the picture (after the title: its icon stands before it)
        side('end', await onScreen(app, app.page.getByRole('heading', { name: new RegExp(`^(${areas.map(escapeRe).join('|')})$`) }))),
      ];
    },
  },
  {
    // step 2: one report's row — its title and its three formats (none pressed)
    id: 'dataops-report',
    alt: { en: 'One report\'s row: its name and what it holds, then CSV, Excel and Print', he: 'שורה של דוח: השם ומה הוא מכיל, ואז CSV, Excel והדפסה' },
    run: async (app) => {
      await openDataOps(app, 'exports_tab');
      await app.page.getByText(await app.t('rep_inv_audit'), { exact: true }).first().waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const title = app.page.getByText(await app.t('rep_inv_audit'), { exact: true }).first();
      // the row: the title's block (title + description), then its parent row that also holds the three buttons
      const row = title.locator('xpath=../..');
      const as = await app.t('rpt_export_as');
      return [
        title.locator('xpath=..'),
        // three buttons in a row: each number over its own
        side('above', row.getByRole('button', { name: `${as} CSV`, exact: true })),
        side('above', row.getByRole('button', { name: `${as} Excel`, exact: true })),
        side('above', row.getByRole('button', { name: `${as} ${await app.t('rpt_print')}`, exact: true })),
      ];
    },
  },
  {
    // step 3: the Personnel card at the top of the pane, the Approvals card under it
    id: 'dataops-people-reports',
    alt: { en: 'The personnel and approvals reports: the roster, the receipts and the receipt lines', he: 'דוחות כוח האדם והאישורים: רשימת כוח האדם, הקבלות ושורות הקבלות' },
    run: async (app) => {
      await openDataOps(app, 'exports_tab');
      const personnel = app.page.getByRole('heading', { name: await app.t('rpt_cat_personnel'), exact: true }).first();
      await personnel.waitFor();
      await toTop(personnel);
      await app.idle(600);
    },
    // each report's whole row (title block → row), top to bottom
    marks: async (app) => Promise.all(['rpt_roster', 'rpt_receipts', 'rpt_receipt_lines'].map(async (key) =>
      app.page.getByText(await app.t(key), { exact: true }).first().locator('xpath=../..'))),
  },
  {
    // step 5: Maintenance with the backup card at the top of the pane (the cards above it scroll away)
    id: 'dataops-maintenance',
    alt: { en: 'Data Ops on its Maintenance tab: the encrypted backup and the data recovery checklist', he: 'ניהול נתונים בכרטיסיית התחזוקה: הגיבוי המוצפן ורשימת הבדיקה לשחזור נתונים' },
    run: async (app) => {
      await openDataOps(app, 'dops_tab_maintenance');
      const backup = app.page.getByRole('heading', { name: await app.t('exp_enc_backup'), exact: true }).first();
      await backup.waitFor();
      await toTop(backup);
      await app.idle(600);
    },
    marks: async (app) => [
      side('start', (await rail(app)).getByRole('button', { name: await app.t('dops_tab_maintenance'), exact: true })),
      app.page.getByRole('button', { name: await app.t('exp_create_backup'), exact: true }).first(),
      // the whole Data Recovery card (its title, the checklist and its button)
      app.page.locator('.rounded-xl').filter({ has: app.page.getByRole('heading', { name: await app.t('dops_recovery_title'), exact: true }) }).first(),
    ],
  },
  {
    // step 6: the backup window, open and untouched (no password typed, Download never pressed)
    id: 'dataops-backup-window',
    alt: { en: 'The encrypted backup window: the password that locks the file, Cancel, and Download Backup', he: 'חלון הגיבוי המוצפן: הסיסמה שנועלת את הקובץ, ביטול, והורדת גיבוי' },
    badge: 'start',
    run: async (app) => {
      await openDataOps(app, 'dops_tab_maintenance');
      const create = app.page.getByRole('button', { name: await app.t('exp_create_backup'), exact: true }).first();
      await create.waitFor();
      await create.click();
      await (await backupWindow(app)).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await backupWindow(app);
      return [
        // the field's block: its label, the password box and the 8-character hint
        dialog.getByText(await app.t('exp_enc_pw'), { exact: true }).locator('xpath=..'),
        // two buttons side by side: each number on its outer side
        side('start', dialog.getByRole('button', { name: await app.t('cancel'), exact: true })),
        side('end', dialog.getByRole('button', { name: await app.t('exp_download_backup'), exact: true })),
      ];
    },
    // the window's own Cancel, found by its label right before the click
    after: async (app) => {
      await (await backupWindow(app)).getByRole('button', { name: await app.t('cancel'), exact: true }).click();
      await app.idle(400);
    },
  },
];
