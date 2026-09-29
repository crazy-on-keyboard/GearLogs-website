// The warranty guide's screens: 4.11 (track warranties and service contracts). Nothing is created, attached, detached,
// archived or saved: tabs, rows and a count tile are only selected (the screen's own state), each window opens untouched and
// closes by Escape or its own Cancel, the Expiring filter is cleared after its shot, and the threshold field in Settings (it
// SAVES WHEN IT LOSES FOCUS) is never clicked, focused or hovered. A list's Attach buttons attach on a click: never pressed.
import { NAMES, around, escape, escapeRe, labelled, side, toTop } from '../helpers.mjs';
import { settingsList } from './security.mjs';

/** A window by its title. */
const dialogNamed = async (app, key) => app.page.getByRole('dialog', { name: await app.t(key), exact: true });
/** Close a window by its own Cancel, found by its label right before the click. */
async function cancel(app, key) {
  await (await dialogNamed(app, key)).getByRole('button', { name: await app.t('cancel'), exact: true }).click();
  await app.idle(400);
}
/** The demo's ended contract (Halvard Lift Care; covers UN-001…UN-004) and its first unit not covered. */
const CONTRACT = 'CT-001';
const COVERED = 'UN-004';
const FREE = 'UN-005';
/** The demo's unit the unit windows open on (Barcode Scanner, in stock): covered by a contract, no date of its own. */
const UNIT = 'UN-013 · LOG-03-004';

/** A contract's row in the Contracts table, by its code. */
const contractRow = (app, code) => app.page.getByRole('row').filter({ hasText: code }).first();
/** The Registry on Contracts — a shot never trusts the last view. */
async function openContracts(app) {
  await app.nav('tab_registry');
  await app.page.getByRole('tab', { name: await app.t('reg_view_contracts'), exact: true }).first().click();
  await contractRow(app, CONTRACT).waitFor();
  await app.idle(900);   // the costs arrive after the rows
}
/** The serial item's row in the Property Book's Items pane. */
const itemRow = (app, lang) => app.page.getByRole('button').filter({ hasText: NAMES.serialItem[lang] }).first();
/** The Property Book with the serial item picked (All Units opens with it). */
async function openBook(app, lang) {
  await app.nav('tab_registry');
  await app.page.getByRole('tab', { name: await app.t('reg_view_property'), exact: true }).first().click();
  await app.idle(600);
  await itemRow(app, lang).click();
  await app.idle(800);
}
/** One of the unit's row buttons ("Warranty — UN-013 · LOG-03-004"), scrolled into the Units pane's view. */
async function unitAct(app, key) {
  const button = app.page.getByRole('button', { name: `${await app.t(key)} — ${UNIT}`, exact: true }).first();
  await button.scrollIntoViewIfNeeded();
  return button;
}
/** The contract's Attach gear window (its title carries the contract's code). */
const attachDialog = async (app) => app.page.getByRole('dialog', { name: `${await app.t('reg_ct_attach_title')} · ${CONTRACT}`, exact: true });
/** A unit's row in that window's list, by its code (the row is the box with the hairline under it). */
const pickRow = (dialog, code) => dialog.getByText(code, { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"border-b")][1]');
/** The Expiring filter's clear button. */
const clearExpiring = async (app) => app.page.getByRole('button', { name: `${await app.t('reg_filter_expiring_clear')} — ${await app.t('reg_filter_expiring')}`, exact: true }).first();

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the Registry on Contracts (nothing pressed but the tab)
    id: 'contracts-list',
    alt: { en: 'The Registry on Contracts: the tab, New contract, a contract that has ended, and its row\'s buttons', he: 'המרשם בכרטיסייה חוזים: הכרטיסייה, חוזה חדש, חוזה שהסתיים והכפתורים בשורה שלו' },
    run: openContracts,
    marks: async (app) => {
      const row = contractRow(app, CONTRACT);
      return [
        side('above', app.page.getByRole('tab', { name: await app.t('reg_view_contracts'), exact: true }).first()),
        app.page.getByRole('button', { name: await app.t('reg_ct_new'), exact: true }).first(),
        // "EXPIRED 23d" — the chip under Ends
        row.getByText(new RegExp(`^${escapeRe(await app.t('reg_war_expired'))} \\d+`)),
        // the row's three buttons stand together: ONE outline
        around([
          row.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_ct_attach'))} — `) }),
          row.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_ct_archive'))} — `) }),
        ]),
      ];
    },
  },
  {
    // step 2: New Contract, opened and left untouched
    id: 'contracts-new',
    alt: { en: 'New Contract, untouched: the provider and contract number, the coverage and cost, the three dates, and Save', he: 'חוזה חדש, ריק: הספק ומספר החוזה, הכיסוי והעלות, שלושת התאריכים, ושמור' },
    badge: 'start',
    run: async (app) => {
      await openContracts(app);
      await app.page.getByRole('button', { name: await app.t('reg_ct_new'), exact: true }).first().click();
      await (await dialogNamed(app, 'reg_ct_new_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_ct_new_title');
      // a label may carry the required star or an (i), so a field is found by its label's START
      const field = async (key) => dialog.getByLabel(new RegExp(`^${escapeRe(await app.t(key))}`)).first();
      return [
        around([labelled(await field('reg_ct_provider')), labelled(await field('reg_ct_no'))]),
        around([labelled(await field('reg_ct_coverage')), labelled(await field('reg_ct_cost'))]),
        around([labelled(await field('reg_ct_start')), labelled(await field('reg_ct_end')), labelled(await field('reg_ct_purchase'))]),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'reg_ct_new_title'),
  },
  {
    // step 3: Attach gear for the contract, untouched; the list scrolled so the last covered unit and the first free one
    // both stand inside the list's own box (a scroll only)
    id: 'contracts-attach',
    alt: { en: 'Attach gear for a contract: Units or Lot, the filter, a unit already covered, and the next unit\'s Attach', he: 'צירוף ציוד לחוזה: יחידות או אצווה, הסינון, יחידה שכבר מכוסה, וכפתור צרף של היחידה הבאה' },
    badge: 'start',
    run: async (app) => {
      await openContracts(app);
      await contractRow(app, CONTRACT).getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('reg_ct_attach'))} — `) }).click();
      const dialog = await attachDialog(app);
      await dialog.waitFor();
      await app.idle(600);
      await toTop(dialog.getByText(COVERED, { exact: true }).first());
      await app.idle(400);
    },
    marks: async (app) => {
      const dialog = await attachDialog(app);
      return [
        dialog.getByRole('radiogroup').first(),
        dialog.getByPlaceholder(await app.t('reg_ct_filter_ph'), { exact: true }),
        side('end', pickRow(dialog, COVERED).getByText(await app.t('reg_ct_covered_chip'), { exact: true })),
        side('end', pickRow(dialog, FREE).getByRole('button', { name: await app.t('reg_ct_attach_row'), exact: true })),
      ];
    },
    // nothing attached: Escape closes the window
    after: async (app) => escape(app),
  },
  {
    // step 4: the Coverage window of one unit, opened from its row in the Property Book and left untouched
    id: 'registry-coverage',
    alt: { en: 'Coverage for a unit: the contract that covers it, Detach, and the picker that attaches another contract', he: 'כיסוי ליחידה: החוזה שמכסה אותה, הסרה, והבורר שמצרף חוזה נוסף' },
    badge: 'start',
    run: async (app, lang) => {
      await openBook(app, lang);
      await (await unitAct(app, 'reg_ct_cov_action')).click();
      await (await dialogNamed(app, 'reg_ct_coverage_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_ct_coverage_title');
      const detach = dialog.getByRole('button', { name: await app.t('reg_ct_detach_btn'), exact: true }).first();
      return [
        // the covering contract: its code and its provider stand together
        around([detach.locator('xpath=preceding-sibling::*[2]'), detach.locator('xpath=preceding-sibling::*[1]')]),
        side('end', detach),
        dialog.getByRole('combobox', { name: await app.t('reg_ct_add_to'), exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('reg_ct_attach_row'), exact: true })),
      ];
    },
    // nothing detached or attached: Escape closes the window
    after: async (app) => escape(app),
  },
  {
    // step 5: Unit warranty of the same unit, opened from its row and left untouched
    id: 'registry-warranty',
    alt: { en: 'Unit warranty: the date that applies now and where it comes from, the unit\'s own date, and Save', he: 'אחריות היחידה: התאריך שחל עכשיו ומאיפה הוא מגיע, התאריך של היחידה עצמה, ושמור' },
    badge: 'start',
    run: async (app, lang) => {
      await openBook(app, lang);
      await (await unitAct(app, 'reg_war_action')).click();
      await (await dialogNamed(app, 'reg_unit_war_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'reg_unit_war_title');
      return [
        dialog.getByText(new RegExp(`^${escapeRe(await app.t('reg_war_current'))}:`)).first(),
        labelled(dialog.getByLabel(new RegExp(`^${escapeRe(await app.t('reg_unit_war_label'))}`)).first()),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    after: async (app) => cancel(app, 'reg_unit_war_title'),
  },
  {
    // step 6: the Expiring count pressed (it switches the view to the Ledger and narrows it — the screen's own state)
    id: 'registry-expiring',
    alt: { en: 'The Ledger after a click on Expiring: only the units that need attention, with their warranty chips', he: 'המרשם אחרי לחיצה על תפוגה קרובה: רק היחידות שדורשות תשומת לב, עם תגי האחריות שלהן' },
    run: async (app) => {
      await app.nav('tab_registry');
      await app.page.getByRole('button', { name: await app.t('reg_kpi_expiring_jump'), exact: true }).first().click();
      await app.page.getByRole('columnheader', { name: await app.t('reg_col_warranty'), exact: true }).first().waitFor();
      await app.idle(600);
    },
    marks: async (app) => [
      app.page.getByRole('button', { name: await app.t('reg_kpi_expiring_jump'), exact: true }).first(),
      await clearExpiring(app),
      side('above', app.page.getByRole('columnheader', { name: await app.t('reg_col_warranty'), exact: true }).first()),
    ],
    // the filter lives in the Registry's state while the screen stays open: clear it and put the Property Book back
    after: async (app) => {
      await (await clearExpiring(app)).click().catch(() => {});
      await app.page.getByRole('tab', { name: await app.t('reg_view_property'), exact: true }).first().click();
      await app.idle(400);
    },
  },
  {
    // step 7: Settings on Organization Setup — the threshold field is pictured as it stands
    id: 'settings-threshold',
    alt: { en: 'Settings on Organization Setup: the Registry card with the expiry warning threshold', he: 'הגדרות בכרטיסייה הקמת ארגון: הכרטיס מרשם עם סף התראת התפוגה' },
    run: async (app) => {
      await app.nav('tab_settings');
      await (await settingsList(app)).getByRole('button', { name: await app.t('file_locs'), exact: true }).click();
      const label = app.page.getByText(await app.t('reg_thresh_label'), { exact: true }).first();
      await label.waitFor();
      // brought into view by a scroll only — the field itself is never touched
      await label.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await app.idle(600);
    },
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('file_locs'), exact: true }),
      // the label line → the block around it: the label, the field and "days"
      app.page.getByText(await app.t('reg_thresh_label'), { exact: true }).first().locator('xpath=..'),
    ],
  },
];
