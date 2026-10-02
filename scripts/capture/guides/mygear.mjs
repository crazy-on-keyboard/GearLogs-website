// My Gear's screens for the guides 4.24 (open My Gear), 4.25 (its four sections) and 4.26 (sign a receipt). My Gear is the staff
// page (served locally on :4175); its session is the test person's (PR-049) in the same capture window — the Director signs My
// Gear in, in BOTH windows, before a run (nobody else may type its code).
// Nothing is written by a recipe: the rail, the lists and a receipt only READ; no notice row is clicked (a click marks it read);
// "I received these" and "Something is wrong" only change the card's own step (no door is called) and are left by their own
// Back; Confirm and sign, Send the dispute, Send me a code, Sign in, Sign out and Sign out everywhere are NEVER pressed; no
// field is focused or typed into and no line is ticked. The language switch is pressed only to match the run (the device's own
// choice, never the database). The sign-in door is pictured in a FRESH window that knows no sign-in (`fresh`), so the capture
// window's own session is never touched and no request is held back. Every shot goes back to the app after.
import { around, escapeRe, openMyGear, side } from '../helpers.mjs';

const STAFF = process.env.CAPTURE_STAFF ?? 'http://localhost:4175';
/** The test person's own receipt: a real hand-out to PR-049 (three lines, waiting) in both workspaces — demo people get none. */
const RECEIPT = /HO-048/;
/** One of My Gear's counted phrases at the START of a text ("2 items · 2 units"): the slot matches a number. */
const leading = (word) => new RegExp(`^${word.split(/\{\d\}/).map(escapeRe).join('\\d+')}`);
/** A section in the rail by its name (the row's name goes on with its count). */
const railRow = async (app, key) => app.page.getByRole('option', { name: new RegExp(`^${escapeRe(await app.t(key))}`, 'i') }).first();
/** A section's pane: the rail's own bar says "Sections", so the section's name finds the detail pane's bar, and its parent the pane. */
const paneHead = async (app, key) => app.page.locator('main div.h-10').filter({ hasText: await app.t(key) }).first();
const pane = async (app, key) => (await paneHead(app, key)).locator('xpath=..');
/** The receipt list beside the rail (its listbox carries the section's name; the rail's carries "Sections"). */
const receiptList = async (app) => app.page.getByRole('listbox', { name: await app.t('staff_rail_approvals'), exact: true });
/** The open receipt's decision card: the question and the two answers, then the confirm IN PLACE. */
const decisionCard = async (app) => app.page.getByRole('group', { name: await app.t('staff_apr_decision'), exact: true }).first();
/** The dispute form of the open receipt. */
const disputeForm = async (app) => app.page.getByRole('form', { name: await app.t('staff_apr_wrong'), exact: true });

/** A section picked in the rail (the click only picks it; the page then reads that section). */
async function openSection(app, lang, key) {
  const rail = await openMyGear(app, lang);
  await (await rail(key)).click();
  await app.idle(800);
}
/** My Gear on Approvals, whatever the page last showed; answers the receipt's row. */
async function openApprovals(app, lang) {
  await openSection(app, lang, 'staff_rail_approvals');
  const row = (await receiptList(app)).getByRole('option', { name: RECEIPT }).first();
  await row.waitFor({ timeout: 15_000 });
  await app.idle(600);
  return row;
}
/** The receipt open beside the list: its row clicked, its decision card drawn (the lines come from their own door). */
async function openReceipt(app, lang) {
  await (await openApprovals(app, lang)).click();
  await (await decisionCard(app)).waitFor({ timeout: 15_000 });
  await app.idle(900);
}
const backToApp = async (app) => app.backToApp();

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // 4.24 step 1: the door as a person first meets it — a fresh window, every field empty, nothing pressed
    id: 'door-my-gear',
    fresh: true,
    alt: { en: 'The My Gear sign-in: the workspace code, your identity number, the e-mail on your record and Send me a code', he: 'הכניסה ל״הציוד שלי״: קוד סביבת העבודה, מספר הזהות שלכם, האימייל שברשומה שלכם והכפתור שלחו לי קוד' },
    badge: 'start',
    settle: 1200,
    run: async (app, lang) => {
      await app.page.goto(STAFF, { waitUntil: 'load' });
      await app.page.locator('#staff-ws').waitFor({ timeout: 15_000 });
      // the page in the run's language (the switch shows the OTHER language's code; a choice of this window only)
      if (!(await app.page.evaluate(() => document.documentElement.lang || 'en')).startsWith(lang)) {
        await app.page.getByRole('button', { name: lang === 'he' ? 'HE' : 'EN', exact: true }).first().click();
        await app.page.waitForFunction((w) => (document.documentElement.lang || 'en').startsWith(w), lang);
      }
      await app.page.getByLabel(await app.t('staff_ws_label'), { exact: true }).waitFor();
      // the invisible browser check settles: "Checking your browser…" leaves the card
      await app.page.getByText(await app.t('staff_checking'), { exact: true }).waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
      await app.idle(600);
    },
    marks: async (app) => [
      app.page.getByLabel(await app.t('staff_ws_label'), { exact: true }),
      app.page.getByLabel(await app.t('staff_id_label'), { exact: true }),
      app.page.getByLabel(await app.t('staff_email_label'), { exact: true }),
      // the act (its name starts with its words; the arrow is an icon) — pictured, never pressed
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('staff_send'))}`) }).first(),
    ],
  },
  {
    // 4.24 step 2: My Gear on My gear — the sections, the count, the table
    id: 'mygear-home',
    alt: { en: 'My Gear after signing in: the sections with their numbers, the count of what is on your name, and the gear table', he: 'הציוד שלי אחרי הכניסה: המדורים עם המספרים שלהם, הספירה של מה שעל שמכם, וטבלת הציוד' },
    run: async (app, lang) => { await openSection(app, lang, 'staff_rail_gear'); },
    marks: async (app) => {
      const head = await paneHead(app, 'staff_rail_gear');
      return [
        app.page.getByRole('listbox', { name: await app.t('staff_rail_title'), exact: true }).first(),
        // the pane's count ("2 items · 2 units", and the kit lines when any are out)
        head.getByText(leading(await app.t('staff_gear_count_items'))).first(),
        head.locator('xpath=..').locator('table').first(),
      ];
    },
    after: backToApp,
  },
  {
    // 4.24 step 3: Notices (the first notice is outlined, never clicked)
    id: 'mygear-notices',
    alt: { en: 'My Gear on Notices: Notices in the sections with its count of new ones, and a new notice', he: '״הציוד שלי״ במדור הודעות: הודעות במדורים עם מספר החדשות, והודעה חדשה' },
    run: async (app, lang) => {
      await openSection(app, lang, 'staff_rail_notices');
      await (await pane(app, 'staff_rail_notices')).locator('.card-base').first().waitFor({ timeout: 15_000 });
      await app.idle(600);
    },
    marks: async (app) => [
      await railRow(app, 'staff_rail_notices'),
      (await pane(app, 'staff_rail_notices')).locator('.card-base').first(),
    ],
    after: backToApp,
  },
  {
    // 4.24 step 4: History — the When and What columns
    id: 'mygear-history',
    alt: { en: 'My Gear on History: History in the sections with its count, and the When and What columns', he: '״הציוד שלי״ במדור היסטוריה: היסטוריה במדורים עם המספר שלה, והעמודות מתי ומה' },
    run: async (app, lang) => {
      await openSection(app, lang, 'staff_rail_history');
      await (await pane(app, 'staff_rail_history')).locator('tbody tr').first().waitFor({ timeout: 15_000 });
      await app.idle(600);
    },
    marks: async (app) => {
      const table = (await pane(app, 'staff_rail_history')).locator('table').first();
      const last = table.locator('tbody tr').last();
      return [
        await railRow(app, 'staff_rail_history'),
        // a column is ONE outline: its head down to its last cell
        around([table.getByRole('columnheader', { name: await app.t('staff_col_when'), exact: true }), last.locator('td').nth(0)]),
        around([table.getByRole('columnheader', { name: await app.t('staff_col_what'), exact: true }), last.locator('td').nth(1)]),
      ];
    },
    after: backToApp,
  },
  {
    // 4.24 step 5: the top bar (no button on it is pressed)
    id: 'mygear-topbar',
    alt: { en: 'My Gear\'s top bar: your name and code, the language switch and Sign out', he: 'הסרגל העליון של ״הציוד שלי״: השם והקוד שלכם, מתג השפה ויציאה' },
    run: async (app, lang) => {
      await openSection(app, lang, 'staff_rail_gear');
      await app.page.locator('header').first().getByRole('button', { name: await app.t('staff_sign_out'), exact: true }).waitFor();
      await app.idle(400);
    },
    marks: async (app) => {
      const bar = app.page.locator('header').first();
      // the person's code is the bar's one PR pill; their name stands right before it
      const code = bar.getByText(/^PR-\d+$/).first();
      return [
        around([code.locator('xpath=preceding-sibling::span[1]'), code], 'below'),
        side('below', bar.getByRole('button', { name: await app.t('staff_lang_switch'), exact: true })),
        // stage 4 (the Director's Sign-out · A): ONE Sign out — the second button and its key are gone
        side('below', bar.getByRole('button', { name: await app.t('staff_sign_out'), exact: true })),
      ];
    },
    after: backToApp,
  },
  {
    // 4.25 step 4: the four sections, top to bottom
    id: 'mygear-sections',
    alt: { en: 'My Gear, the page your people sign in to: its four sections — My gear, Notices, History and Approvals', he: 'הציוד שלי, הדף שהאנשים שלכם נכנסים אליו: ארבעת המדורים שלו — הציוד שלי, הודעות, היסטוריה ואישורים' },
    run: async (app, lang) => { await openSection(app, lang, 'staff_rail_gear'); },
    marks: async (app) => Promise.all(['staff_rail_gear', 'staff_rail_notices', 'staff_rail_history', 'staff_rail_approvals'].map((key) => railRow(app, key))),
    after: backToApp,
  },
  {
    // 4.26 step 1: Approvals, no receipt picked yet
    id: 'mygear-approvals',
    alt: { en: 'My Gear on Approvals: Approvals in the sections with its count, and one receipt waiting to be signed', he: '״הציוד שלי״ במדור אישורים: אישורים במדורים עם המספר שלו, ואישור מסירה אחד שממתין לחתימה' },
    run: async (app, lang) => { await openApprovals(app, lang); },
    marks: async (app) => [
      await railRow(app, 'staff_rail_approvals'),
      (await receiptList(app)).getByRole('option', { name: RECEIPT }).first(),
    ],
    after: backToApp,
  },
  {
    // 4.26 step 2: the receipt open beside the list, the question with its two answers (neither is pressed)
    id: 'mygear-receipt-read',
    alt: { en: 'A receipt open on My Gear: the facts, the three lines as they were recorded, and the two answers — I received these, or Something is wrong', he: 'אישור מסירה פתוח ב״הציוד שלי״: העובדות, שלוש השורות כפי שנרשמו, ושתי התשובות — קיבלתי אותם, או משהו לא נכון' },
    run: async (app, lang) => { await openReceipt(app, lang); },
    marks: async (app) => {
      const card = await decisionCard(app);
      // the receipt pane: the decision card sits in its body
      const body = card.locator('xpath=../..');
      const by = await app.t('staff_apr_by');
      return [
        // the facts line: the one paragraph that says "recorded by"
        body.locator('p').filter({ hasText: new RegExp(escapeRe(by.split('{0}')[0].trim())) }).first(),
        body.getByRole('table').first(),
        card.getByRole('button', { name: await app.t('staff_apr_sign_issue'), exact: true }),
        side('end', card.getByRole('button', { name: await app.t('staff_apr_wrong'), exact: true })),
      ];
    },
    after: backToApp,
  },
  {
    // 4.26 step 3: the confirm step IN PLACE — "I received these" pressed (the card's own step; nothing is sent)
    id: 'mygear-receipt-confirm',
    alt: { en: 'The confirm step of a receipt on My Gear: the sentence that says the signature cannot be undone, Confirm and sign, and Back', he: 'שלב האישור של אישור מסירה ב״הציוד שלי״: המשפט שאומר שאי אפשר לבטל חתימה, אישור וחתימה, וחזרה' },
    run: async (app, lang) => {
      await openReceipt(app, lang);
      const card = await decisionCard(app);
      await card.getByRole('button', { name: await app.t('staff_apr_sign_issue'), exact: true }).click();
      await card.getByRole('button', { name: await app.t('staff_apr_confirm'), exact: true }).waitFor();
      await app.idle(500);
    },
    marks: async (app) => {
      const card = await decisionCard(app);
      return [
        card.locator('p').first(),
        card.getByRole('button', { name: await app.t('staff_apr_confirm'), exact: true }),
        side('end', card.getByRole('button', { name: await app.t('staff_apr_back'), exact: true })),
      ];
    },
    // nothing is signed: the card's own Back, found by its label right before the click, then back to the app
    after: async (app) => {
      await (await decisionCard(app)).getByRole('button', { name: await app.t('staff_apr_back'), exact: true }).click().catch(() => {});
      await app.idle(300);
      await app.backToApp();
    },
  },
  {
    // 4.26 step 4: the dispute form IN PLACE — "Something is wrong" pressed (a step change only); nothing is ticked or typed
    id: 'mygear-receipt-dispute',
    alt: { en: 'Something is wrong on a My Gear receipt: the five reasons, the lines to tick, the box for your words, and Send the dispute with the line above it', he: 'משהו לא נכון באישור מסירה ב״הציוד שלי״: חמש הסיבות, השורות לסימון, התיבה למילים שלכם, והכפתור שליחת הערעור עם השורה שמעליו' },
    badge: 'start',
    run: async (app, lang) => {
      await openReceipt(app, lang);
      await (await decisionCard(app)).getByRole('button', { name: await app.t('staff_apr_wrong'), exact: true }).click();
      const form = await disputeForm(app);
      await form.waitFor();
      await form.scrollIntoViewIfNeeded();
      await app.idle(500);
    },
    marks: async (app) => {
      const form = await disputeForm(app);
      return [
        form.getByRole('radiogroup', { name: await app.t('staff_apr_what_wrong'), exact: true }),
        // "Which lines?", the ticks and the hint under them: the block that holds the list
        form.getByRole('list', { name: await app.t('staff_apr_which_lines'), exact: true }).locator('xpath=..'),
        form.getByRole('textbox', { name: await app.t('staff_apr_words'), exact: true }),
        // the final sentence and the button under it: ONE outline
        around([form.getByText(await app.t('staff_apr_final_note'), { exact: true }),
          form.getByRole('button', { name: await app.t('staff_apr_send'), exact: true })]),
      ];
    },
    // nothing is sent: the form's own Back, then back to the app
    after: async (app) => {
      await (await disputeForm(app)).getByRole('button', { name: await app.t('staff_apr_back'), exact: true }).click().catch(() => {});
      await app.idle(300);
      await app.backToApp();
    },
  },
  {
    // 4.26 step 5: My gear — the gear already on the person's name while its receipt waits
    id: 'mygear-held',
    alt: { en: 'My Gear on My gear: the items on the person\'s name, already there while their receipt waits for a signature', he: '״הציוד שלי״ במדור הציוד שלי: הפריטים שעל שם האדם, כבר רשומים בזמן שאישור המסירה שלהם ממתין לחתימה' },
    run: async (app, lang) => {
      await openSection(app, lang, 'staff_rail_gear');
      await app.page.getByRole('table').first().waitFor({ timeout: 15_000 });
      await app.idle(600);
    },
    marks: async (app) => [
      await railRow(app, 'staff_rail_gear'),
      app.page.getByRole('table').first(),
    ],
    after: backToApp,
  },
];
