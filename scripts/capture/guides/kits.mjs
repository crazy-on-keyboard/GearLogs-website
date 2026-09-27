// The kit guides' screens: 4.22 (hand out a kit) and 4.23 (take a kit back). Every shot opens the Kits area (a choice the app
// keeps in this browser only) and puts Equipment back after. Nothing is issued or returned: a search, a tick or a choice in a
// window is the window's own state; no submit is ever pressed and no Enter typed; windows close by their Cancel or Escape.
import { NAMES, boardCard, control, counted, escape, escapeRe, onScreen, openCard, closeCard, openKits, leaveKits, side } from '../helpers.mjs';

/** A kit's card on the Kits board (the board-card shell that holds its own ISSUE button). */
const kitCard = async (app, name) => app.page.locator('.group-card').filter({ has: await control(app, 'kit_issue_btn', name) }).first();

/** One of the app's phrases with its number left open, as a regex source ("{0} people selected" → "\d+ people selected"). */
const phrase = async (app, key) => counted(await app.t(key)).source.slice(1, -1);

/** Issue kit, open on the kit to hand out: the list narrowed by a search and one row ticked (nothing is issued). */
async function openIssue(app, lang, term) {
  await openKits(app);
  await (await control(app, 'kit_issue_btn', NAMES.kit[lang])).click();
  const dialog = await issueDialog(app);
  await dialog.waitFor();
  await dialog.getByRole('textbox', { name: await app.t('kit_issue_search_ph'), exact: true }).fill(term);
  await app.idle(400);
  // a tick's name is its label (the node's name, then its code): found by the start of its name
  await dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(term)}`) }).first().check();
  await app.idle(900);
}
const issueDialog = async (app) => app.page.getByRole('dialog', { name: await app.t('kit_issue_title'), exact: true }).last();
async function closeIssue(app) {
  const cancel = (await issueDialog(app)).getByRole('button', { name: await app.t('cancel'), exact: true }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click(); else await app.page.keyboard.press('Escape');
  await app.idle(400);
  await leaveKits(app);
}

/** Who holds this kit, open on the kit to take back, its rows read. */
async function openKitPeople(app, lang) {
  await openKits(app);
  await (await control(app, 'kit_people_title', NAMES.heldKit[lang])).click();
  const dialog = app.page.getByRole('dialog', { name: await app.t('kit_people_title'), exact: true });
  await dialog.waitFor();
  await returnOnRow(app, lang).then((b) => b.waitFor({ timeout: 15_000 }));
  await app.idle(600);
  return dialog;
}
const returnOnRow = async (app, lang) => app.page.getByRole('dialog', { name: await app.t('kit_people_title'), exact: true })
  .getByRole('button', { name: `${await app.t('kit_return_btn')} — ${NAMES.person[lang]}`, exact: true });

/** Return kit, open on the head's lines of the kit (nothing inside it is pressed here). */
async function openKitReturn(app, lang) {
  await openKitPeople(app, lang);
  await (await returnOnRow(app, lang)).click();
  const dialog = await returnDialog(app);
  await dialog.getByRole('listbox', { name: await app.t('kit_return_lines'), exact: true }).waitFor({ timeout: 15_000 });
  await app.idle(600);
  return dialog;
}
const returnDialog = async (app) => app.page.getByRole('dialog', { name: await app.t('kit_return_title'), exact: true });
/** Escape closes the topmost window only: Return kit, then Who holds this kit; then Equipment again. */
const closeKitWindows = async (app, n) => { await escape(app, n); await leaveKits(app); };

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // 4.22 step 1: the Kits area — the screen in the side menu, the area switch, ISSUE on the kit, the kit's lines
    id: 'kits',
    alt: { en: 'The Kits area of Logistics: every kit with its lines, how many of each per kit, and the ISSUE button on its card', he: 'אזור הערכות בלוגיסטיקה: כל ערכה עם השורות שלה, כמה מכל פריט לערכה, והכפתור ניפוק בכרטיס שלה' },
    run: openKits,
    marks: async (app, lang) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_logistics'))}`, 'i') }).first(),
      side('corner', app.page.getByRole('radio', { name: await app.t('area_kits'), exact: true }).first()),
      side('corner', await control(app, 'kit_issue_btn', NAMES.kit[lang])),
      (await kitCard(app, NAMES.kit[lang])).getByRole('table').first(),
    ],
    after: leaveKits,
  },
  {
    // 4.22 step 2: + KIT (a new kit), LINE (a new line on this kit), and a consumable line's kind (nothing is opened)
    id: 'kits-build',
    alt: { en: 'Building a kit: the + KIT tile, the LINE button on a kit, and the kind of each line — plain, consumable or serialized', he: 'בניית ערכה: האריח + ערכה, הכפתור שורה בערכה, והסוג של כל שורה — רגיל, מתכלה או עם מספר סידורי' },
    run: async (app) => {
      await openKits(app);
      await app.page.getByRole('button', { name: await app.t('btn_new_kit'), exact: true }).first().scrollIntoViewIfNeeded();
      await app.idle(400);
    },
    marks: async (app, lang) => [
      app.page.getByRole('button', { name: await app.t('btn_new_kit'), exact: true }).first(),
      side('corner', await control(app, 'kit_add_line', NAMES.kit[lang])),
      side('end', (await kitCard(app, NAMES.kit[lang])).getByText(await app.t('lbl_consumable'), { exact: true }).first()),
    ],
    after: leaveKits,
  },
  {
    // 4.22 step 3: Issue kit — a group found by a search and ticked (nothing is issued)
    id: 'kit-issue-who',
    alt: { en: 'Issuing a kit: a group found by a search and ticked in the Who receives it pane, with the number of people on the list', he: 'ניפוק ערכה: קבוצה שנמצאה בחיפוש וסומנה בחלונית מי מקבל, עם מספר האנשים ברשימה' },
    run: async (app, lang) => openIssue(app, lang, NAMES.kitTeam[lang]),
    marks: async (app, lang) => {
      const dialog = await issueDialog(app);
      return [
        side('start', dialog.getByText(await app.t('kit_issue_who'), { exact: true }).first().locator('xpath=../..')),
        dialog.getByRole('textbox', { name: await app.t('kit_issue_search_ph'), exact: true }),
        dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(NAMES.kitTeam[lang])}`) }).first().locator('xpath=..'),
        dialog.getByRole('checkbox', { name: new RegExp(escapeRe(NAMES.kitPerson[lang])) }).first().locator('xpath=..'),
      ];
    },
    after: closeIssue,
  },
  {
    // 4.22 step 4: the What will happen pane — the people count, the lines' maths, the notice line, Issue (never pressed)
    id: 'kit-issue-what',
    alt: { en: 'Issuing a kit: the What will happen pane — each line per person, needed and in stock, the notice count and the green Issue button', he: 'ניפוק ערכה: החלונית מה יקרה — כל שורה לאדם, נדרש ובמלאי, מספר ההודעות והכפתור הירוק לניפוק' },
    run: async (app, lang) => openIssue(app, lang, NAMES.kitTeam[lang]),
    marks: async (app) => {
      const dialog = await issueDialog(app);
      const selected = `^(${await phrase(app, 'kit_issue_people_n')}|${escapeRe(await app.t('kit_issue_person_one'))})$`;
      const notices = `^(${await phrase(app, 'kit_issue_notices')}|${escapeRe(await app.t('kit_issue_notice_one'))}|${escapeRe(await app.t('kit_issue_notices_none'))})$`;
      const submit = `^(${await phrase(app, 'kit_issue_submit')}|${escapeRe(await app.t('kit_issue_submit_one'))})$`;
      return [
        side('end', dialog.getByText(new RegExp(selected)).first()),
        dialog.getByRole('table').first(),
        dialog.getByText(new RegExp(notices)).first(),
        app.page.getByRole('button', { name: new RegExp(submit) }).first(),
      ];
    },
    after: closeIssue,
  },
  {
    // 4.22 step 5: the whole tab ticked — the short lines turn red (nothing is issued)
    id: 'kit-issue-short',
    alt: { en: 'Issuing a kit to a whole tab: the lines without enough stock turn red — needed is more than in stock', he: 'ניפוק ערכה לכרטיסייה שלמה: השורות שאין להן מספיק מלאי נצבעות באדום — נדרש גדול ממה שיש במלאי' },
    run: async (app, lang) => openIssue(app, lang, NAMES.kitTab[lang]),
    marks: async (app, lang) => {
      const dialog = await issueDialog(app);
      return [
        dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(NAMES.kitTab[lang])}`) }).first().locator('xpath=..'),
        NAMES.kitShort[lang].map((name) => dialog.getByRole('row').filter({ hasText: name }).first()),
      ];
    },
    after: closeIssue,
  },
  {
    // 4.22 step 6 and 4.23 step 5: the kit's row on the head's card, open — its head, Return, and its lines (nothing pressed)
    id: 'person-card-kit',
    alt: { en: 'A person\'s card with a kit row open: the kit\'s name and code, when it was issued, the lines still out, each line with its state, and Return', he: 'כרטיס אדם עם שורת ערכה פתוחה: שם הערכה והקוד שלה, מתי נופקה, השורות שעדיין בחוץ, כל שורה עם המצב שלה, והכפתור החזרה' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.person[lang]);
      await (await control(app, 'show_details', NAMES.heldKitRow[lang])).click();
      await app.idle(900);
      // the row's actions follow the member's Display setting — a pointer resting on the row shows them either way
      await (await boardCard(app, NAMES.person[lang])).getByRole('table', { name: NAMES.heldKitRow[lang], exact: true }).first().hover();
      await app.idle(300);
    },
    marks: async (app, lang) => {
      const card = await boardCard(app, NAMES.person[lang]);
      return [
        side('start', card.getByText(NAMES.heldKit[lang], { exact: true }).first().locator('xpath=../..')),
        side('corner', await control(app, 'kit_return_btn', NAMES.heldKitRow[lang])),
        side('start', card.getByRole('table', { name: NAMES.heldKitRow[lang], exact: true }).first()),
      ];
    },
    after: async (app, lang) => {
      await (await control(app, 'hide_details', NAMES.heldKitRow[lang])).click().catch(() => {});
      await closeCard(app, NAMES.person[lang]);
    },
  },
  {
    // 4.23 step 1: the Kits area — the switch, the kit's OPEN plate and its people button (nothing is pressed on the card)
    id: 'kits-board',
    alt: { en: 'The Kits area of Logistics: each kit card with its lines, how many people it was issued to and how many lines are still out', he: 'אזור הערכות בלוגיסטיקה: כל כרטיס ערכה עם השורות שלו, לכמה אנשים נופקה וכמה שורות עדיין בחוץ' },
    run: openKits,
    marks: async (app, lang) => {
      const people = await control(app, 'kit_people_title', NAMES.heldKit[lang]);
      return [
        side('corner', app.page.getByRole('radio', { name: await app.t('area_kits'), exact: true }).first()),
        side('corner', people.locator('xpath=..').getByText(counted(await app.t('kit_open_n'))).first()),
        side('corner', people),
      ];
    },
    after: leaveKits,
  },
  {
    // 4.23 step 2: Who holds this kit (nothing is pressed inside it)
    id: 'kit-people',
    alt: { en: 'Who holds this kit: the people tree with a search and counts, and a table of every hand-out with what is still out and what came back', he: 'מי מחזיק בערכה: עץ האנשים עם חיפוש ומונים, וטבלה של כל ניפוק עם מה שעדיין בחוץ ומה שחזר' },
    run: openKitPeople,
    marks: async (app, lang) => {
      const dialog = app.page.getByRole('dialog', { name: await app.t('kit_people_title'), exact: true });
      return [
        dialog.getByRole('textbox', { name: await app.t('kit_issue_search_ph'), exact: true }),
        dialog.getByRole('treeitem', { name: new RegExp(`^${escapeRe(await app.t('kit_people_all'))}`, 'i') }).first(),
        dialog.getByRole('table').getByRole('row').first(),
        side('corner', await returnOnRow(app, lang)),
      ];
    },
    after: async (app) => closeKitWindows(app, 1),
  },
  {
    // 4.23 step 3: Return kit as it opens — every line Returned (its save is never pressed)
    id: 'kit-return',
    alt: { en: 'Return kit: the person\'s lines, each starting as Returned, the consumables that do not come back, and the choice for the selected line', he: 'החזרת ערכה: השורות של האדם, כל אחת מתחילה כהוחזר, המתכלים שלא חוזרים, והבחירה לשורה שנבחרה' },
    run: openKitReturn,
    marks: async (app) => {
      const dialog = await returnDialog(app);
      return [
        side('start', await onScreen(app, dialog.getByRole('listbox', { name: await app.t('kit_return_lines'), exact: true }).getByRole('option'))),
        side('start', dialog.getByRole('radiogroup', { name: new RegExp(`^${escapeRe(await app.t('kit_return_col_what'))} · `) })),
        await onScreen(app, dialog.getByText(await app.t('kit_state_consumed'), { exact: true })),
        dialog.getByRole('button', { name: counted(await app.t('kit_return_submit')) }),
      ];
    },
    after: async (app) => closeKitWindows(app, 2),
  },
  {
    // 4.23 step 4: one line marked Lost in the form — on screen only; the save is never pressed and the choice is dropped on close
    id: 'kit-return-lost',
    alt: { en: 'Return kit with one line marked Lost: the reason, the date of the loss and a note, and the button that now names the write-off', he: 'החזרת ערכה עם שורה אחת שסומנה אבד: הסיבה, תאריך האובדן והערה, והכפתור שמציין עכשיו את הגריעה' },
    run: async (app, lang) => {
      const dialog = await openKitReturn(app, lang);
      await dialog.getByRole('option', { name: new RegExp(escapeRe(NAMES.kitLost[lang])) }).first().click();
      await app.idle(300);
      // Lost among the four choices of THAT line (the reason picker below has its own "Lost")
      await dialog.getByRole('radiogroup', { name: new RegExp(`^${escapeRe(await app.t('kit_return_col_what'))} · .*${escapeRe(NAMES.kitLost[lang])}`) })
        .getByRole('radio', { name: await app.t('kit_return_choice_lost'), exact: true }).click();
      await app.idle(500);
    },
    marks: async (app) => {
      const dialog = await returnDialog(app);
      return [
        side('start', dialog.getByRole('radiogroup', { name: new RegExp(`^${escapeRe(await app.t('kit_return_col_what'))} · `) })),
        side('start', dialog.getByRole('radiogroup', { name: new RegExp(`^${escapeRe(await app.t('kit_return_reason'))} · `) })),
        side('start', dialog.getByLabel(await app.t('kit_return_loss_date'), { exact: true })),
        dialog.getByRole('button', { name: counted(await app.t('kit_return_submit_mixed')) }),
      ];
    },
    after: async (app) => closeKitWindows(app, 2),
  },
];
