// The support guide's screens: 4.16 (get support inside the app). Nothing is written by a recipe: Support is opened through the
// side menu; its peer tabs, its status tabs and the type choice inside New request are choices held on the screen only (never
// saved); no request row is ever clicked (opening a conversation marks its replies read) and the demo workspaces hold none; the
// New request window is closed by Escape; one word is typed into Subject (it only fills the suggestions, a search of what the page
// already holds); Details is never typed into, so Send request stays greyed and is never pressed.
import { NAMES, escape, escapeRe, side, slotted } from '../helpers.mjs';

/** A tab by the start of its name (a status tab may carry its count after the word). */
const tab = async (app, key) => app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t(key))}`) }).first();
/** The New request window (its heading names it; the (i) after the title follows the name). */
const newRequestDialog = async (app) => app.page.getByRole('dialog', { name: new RegExp(`^${escapeRe(await app.t('sup_dlg_title'))}`) });
/** The two panes side by side: Requests (first) and Conversation (second), in reading order in both languages. */
const panes = (app) => app.page.locator('xpath=//div[contains(@class,"grid-cols-[minmax(18rem")]/div');
/** A required field of the window by the START of its name (its label carries a star). */
const field = async (app, dialog, key) => dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t(key))}`) });

/** Support on Conversations, the Open list (the screen keeps its tabs in its own state: a shot never trusts them). */
async function openSupport(app) {
  await app.nav('tab_support');
  await (await tab(app, 'sup_tab_conversations')).click();
  await (await tab(app, 'sup_status_open')).click();
  await panes(app).first().waitFor();
  await app.idle(800);
}
/** Support with the New request window open (nothing in it typed yet). */
async function openNewRequest(app) {
  await openSupport(app);
  await app.page.getByRole('button', { name: await app.t('sup_new_request'), exact: true }).click();
  const dialog = await newRequestDialog(app);
  await dialog.waitFor();
  await app.idle(600);
  return dialog;
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Support on Conversations
    id: 'support-open',
    alt: { en: 'Support open on Conversations: Support in the side menu, the Conversations and Notifications tabs, New request, and the My requests and Workspace choice', he: 'תמיכה בכרטיסייה פניות: תמיכה בתפריט הצדדי, הכרטיסיות פניות והתראות, פנייה חדשה, והבחירה בין הפניות שלי לסביבת העבודה' },
    run: openSupport,
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_support'))}`, 'i') }).first(),
      // the peer tabs Conversations | Notifications: their tab list, one outline
      (await tab(app, 'sup_tab_conversations')).locator('xpath=..'),
      app.page.getByRole('button', { name: await app.t('sup_new_request'), exact: true }),
      // My requests | Workspace with its (i): the choice's own row
      side('end', app.page.getByRole('radio', { name: await app.t('sup_scope_mine'), exact: true }).locator('xpath=ancestor::div[@role="radiogroup"][1]/..')),
    ],
  },
  {
    // step 2: New request with Problem chosen (a choice held by the window only: it adds the item picker)
    id: 'support-new-request',
    alt: { en: 'New request with Problem chosen: the four types, Subject, Details and the item picker', he: 'פנייה חדשה עם בעיה נבחרת: ארבעת הסוגים, נושא, פירוט ובורר הפריט' },
    badge: 'start',
    run: async (app) => {
      const dialog = await openNewRequest(app);
      await dialog.getByRole('radio', { name: await app.t('sup_type_problem'), exact: true }).click();
      await app.idle(400);
    },
    marks: async (app) => {
      const dialog = await newRequestDialog(app);
      return [
        // the type block: its label is a span, so the choice's parent holds label and choices
        dialog.getByRole('radiogroup', { name: await app.t('sup_dlg_type_label'), exact: true }).locator('xpath=..'),
        await field(app, dialog, 'sup_dlg_subject'),
        await field(app, dialog, 'sup_dlg_details'),
        // the item picker's block: its label and the picker
        dialog.getByText(await app.t('sup_dlg_item'), { exact: true }).locator('xpath=..'),
      ];
    },
    // nothing is sent: the window closes by Escape (its close resets the form)
    after: async (app) => { await escape(app); },
  },
  {
    // step 3: the same window with a subject typed (Details stays empty, so Send request stays greyed)
    id: 'support-new-request-send',
    alt: { en: 'New request with a subject typed: the suggestions, Attachments, the reason Send request is greyed, and Send request', he: 'פנייה חדשה עם נושא מוקלד: ההצעות, קבצים מצורפים, הסיבה שהכפתור שליחת הפנייה מעומעם, והכפתור שליחת הפנייה' },
    badge: 'start',
    run: async (app, lang) => {
      const dialog = await openNewRequest(app);
      const subject = await field(app, dialog, 'sup_dlg_subject');
      await subject.fill(NAMES.serialItem[lang]);
      // no focus ring in the picture (the field saves nothing on leaving it)
      await subject.evaluate((el) => el.blur());
      await app.idle(800);
    },
    marks: async (app) => {
      const dialog = await newRequestDialog(app);
      return [
        // the dashed strip under Subject: its title, What's new and the matches
        dialog.getByText(await app.t('sup_dlg_suggest_title'), { exact: true }).locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]'),
        // Attachments: its label (a span) and the sentence under it
        dialog.getByText(await app.t('sup_dlg_attach'), { exact: true }).locator('xpath=..'),
        // the reason at the start of the footer: with a subject typed and Details empty, the sentence names the floor (S6 re-worded it with the count)
        dialog.getByText(slotted(await app.t('sup_dlg_send_why_details_short')), { exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('sup_dlg_send'), exact: true })),
      ];
    },
    // nothing is sent: the window closes by Escape and forgets the typed subject
    after: async (app) => { await escape(app); },
  },
  {
    // step 4: the screen as it stands (no request row is clicked: opening one marks its replies read)
    id: 'support-follow',
    alt: { en: 'Support, Conversations: the status tabs, the email line, the Requests list and the Conversation pane', he: 'תמיכה, פניות: כרטיסיות המצב, שורת האימייל, רשימת הפניות וחלונית השיחה' },
    run: openSupport,
    marks: async (app) => [
      // the status tabs at the end of the toolbar: their tab list, one outline
      (await tab(app, 'sup_status_open')).locator('xpath=..'),
      // the email line under the toolbar (the words and the site's own public mailbox)
      app.page.locator('p').filter({ hasText: await app.t('sup_email_door') }).first(),
      // each pane by its title (the panes stand side by side and fill the screen: a number beside a whole pane would
      // lie over the other one)
      side('start', panes(app).nth(0).getByText(await app.t('sup_pane_requests'), { exact: true }).first().locator('xpath=..')),
      side('end', panes(app).nth(1).getByText(await app.t('sup_pane_thread'), { exact: true }).first().locator('xpath=..')),
    ],
  },
];
