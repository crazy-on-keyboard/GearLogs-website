// The dialogs guide's screens: 4.20 (work with any dialog). Nothing is written by a recipe: a person's Edit Person form is
// opened and closed by Escape; its Save is never pressed; its red Archive only OPENS the question (the person holds gear, so the
// question's own Archive is greyed and is never pressed); one space is typed at the end of Notes to make the form "edited" (a
// field of the form's own state — it saves only through Save) and the question "Discard your changes?" is pictured. NO button of a
// question is ever pressed: an edited form is left by loading the app again, which drops what was typed.
import { NAMES, around, control, escape, escapeRe, openLogistics, personalFields, side } from '../helpers.mjs';

const editPerson = async (app) => app.page.getByRole('dialog', { name: await app.t('edit_person'), exact: true });
const archiveAsk = async (app) => app.page.getByRole('dialog', { name: await app.t('confirm_archive_title'), exact: true });
const discardAsk = async (app) => app.page.getByRole('dialog', { name: await app.t('discard_title'), exact: true });
/** The form's phone and ID number: their values stay out of every picture of it (also behind a question). */
const blankPersonal = async (app) => [personalFields(await editPerson(app))];

/** Personnel on the tab that holds the head's group, the head's Edit Person form open and untouched. */
async function openForm(app, lang) {
  await app.nav('tab_personnel');
  await app.page.getByRole('button', { name: NAMES.peopleTab[lang], exact: true }).first().click();
  await app.idle(600);
  await (await control(app, 'tooltip_edit', NAMES.person[lang])).click();
  const form = await editPerson(app);
  await form.waitFor();
  await app.idle(800);
  return form;
}
/** Leave whatever windows stand open without pressing any of their buttons: Escape for each; should a form read as edited
 *  (the question appears), the app is loaded again — nothing typed survives, nothing is saved. */
async function leave(app, times = 1) {
  await escape(app, times);
  if (await (await discardAsk(app)).isVisible().catch(() => false)) await app.backToApp();
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the Edit Person form, untouched — the three parts of a dialog
    id: 'dialogs-parts',
    alt: { en: 'The Edit Person dialog: the title with its (i), the close button, Archive at the start of the shelf, Cancel and Save at its end', he: 'החלון עריכת אדם: הכותרת עם ה-(i), כפתור הסגירה, העבר לארכיון בתחילת שורת הכפתורים, ביטול ושמור בסופה' },
    blank: blankPersonal,
    run: async (app, lang) => { await openForm(app, lang); },
    marks: async (app) => {
      const dialog = await editPerson(app);
      return [
        // the title with its (i) (the heading's name starts with the title; the (i) follows)
        dialog.getByRole('heading', { level: 2, name: new RegExp(`^${escapeRe(await app.t('edit_person'))}`) }),
        dialog.getByRole('button', { name: `${await app.t('close')} — ${await app.t('edit_person')}`, exact: true }),
        // Archive in red text with its (i): the pair's own row
        dialog.getByRole('button', { name: await app.t('archive'), exact: true }).locator('xpath=..'),
        // Cancel and Save stand together at the shelf's end: ONE outline
        around([
          dialog.getByRole('button', { name: await app.t('cancel'), exact: true }),
          dialog.getByRole('button', { name: await app.t('save'), exact: true }),
        ], 'end'),
      ];
    },
    after: async (app) => { await leave(app); },
  },
  {
    // step 2: an item's read-only window, opened from the header's search (a word typed into a search box fills a list only)
    id: 'dialogs-readonly',
    alt: { en: 'An item\'s window opened from the search: its name, the close button and a lone Close on the shelf', he: 'חלון של פריט שנפתח מהחיפוש: השם שלו, כפתור הסגירה, וכפתור סגור יחיד בשורת הכפתורים' },
    run: async (app, lang) => {
      await openLogistics(app);
      await app.page.getByRole('button', { name: NAMES.homeTab[lang], exact: true }).first().click();
      await app.idle(600);
      // the header's search box has no name of its own: found by its placeholder
      const box = app.page.getByPlaceholder(await app.t('search_ph'), { exact: true }).first();
      await box.fill(NAMES.returnItem[lang]);
      const results = box.locator('xpath=../following-sibling::div[1]');
      await results.waitFor();
      await app.idle(700);
      await results.getByRole('button', { name: new RegExp(`^${escapeRe(NAMES.returnItem[lang])}`) }).first().click();
      await app.page.getByRole('dialog', { name: NAMES.returnItem[lang], exact: true }).waitFor();
      await app.idle(600);
    },
    marks: async (app, lang) => {
      const dialog = app.page.getByRole('dialog', { name: NAMES.returnItem[lang], exact: true });
      return [
        dialog.getByRole('heading', { level: 2, name: NAMES.returnItem[lang], exact: true }),
        dialog.getByRole('button', { name: `${await app.t('close')} — ${NAMES.returnItem[lang]}`, exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('close'), exact: true })),
      ];
    },
    // Escape closes the window; the header's box is emptied (the word would go on filtering the board)
    after: async (app) => {
      await escape(app);
      await app.page.getByPlaceholder(await app.t('search_ph'), { exact: true }).first().fill('');
      await app.idle(300);
    },
  },
  {
    // step 3: the same form — an optional field, a required field, a field with its (i) (nothing is typed)
    id: 'dialogs-fields',
    alt: { en: 'The Edit Person form: an optional field, a required field with its red star, and an (i) beside a field', he: 'הטופס עריכת אדם: שדה רשות, שדה חובה עם כוכבית אדומה, ו-(i) ליד שדה' },
    badge: 'start',
    blank: blankPersonal,
    run: async (app, lang) => { await openForm(app, lang); },
    marks: async (app) => {
      const dialog = await editPerson(app);
      // a field WITH its label: the block that holds the label (the label also carries "(Optional)" or the red star)
      const block = async (key) => dialog.locator('label').filter({ hasText: await app.t(key) }).first().locator('xpath=..');
      return [
        await block('rank_title'),
        await block('lbl_first_name'),
        // the Department Head row: the checkbox, its words and its (i) (the row's own tinted box)
        dialog.getByText(await app.t('dept_head_label'), { exact: true }).locator('xpath=ancestor::div[contains(@class,"p-3")][1]'),
      ];
    },
    after: async (app) => { await leave(app); },
  },
  {
    // step 4: the form's red Archive only OPENS the question; the person holds gear, so the question's Archive is greyed
    id: 'dialogs-refused',
    alt: { en: 'Archive this? over the form: the question, the reason in red, Cancel, and Archive greyed', he: 'השאלה להעביר לארכיון? מעל הטופס: השאלה, הסיבה באדום, ביטול, והכפתור העבר לארכיון מעומעם' },
    blank: blankPersonal,
    run: async (app, lang) => {
      const form = await openForm(app, lang);
      await form.getByRole('button', { name: await app.t('archive'), exact: true }).click();
      const ask = await archiveAsk(app);
      await ask.waitFor();
      // the law of this picture: the question's own Archive cannot be pressed — a demo where it could is refused here
      if (await ask.getByRole('button', { name: await app.t('archive'), exact: true }).isEnabled()) {
        await app.backToApp();
        throw new Error('dialogs-refused: the question\'s Archive is live (the demo person holds no gear) — the picture is not taken');
      }
      await app.idle(800);
    },
    marks: async (app) => {
      const ask = await archiveAsk(app);
      return [
        ask.getByRole('heading', { level: 2, name: await app.t('confirm_archive_title'), exact: true }),
        // the one notice strip at the top of the body
        ask.getByRole('alert'),
        ask.getByRole('button', { name: await app.t('cancel'), exact: true }),
        side('end', ask.getByRole('button', { name: await app.t('archive'), exact: true })),
      ];
    },
    // Escape closes the topmost window only: first the question, then the untouched form
    after: async (app) => { await leave(app, 2); },
  },
  {
    // step 5: one space at the end of Notes makes the form edited; Escape then asks first
    id: 'dialogs-discard',
    alt: { en: 'Discard your changes? over an edited form: the question, the line under it, Cancel and Discard', he: 'השאלה לבטל את השינויים? מעל טופס שנערך: השאלה, השורה שמתחתיה, ביטול ולבטל שינויים' },
    blank: blankPersonal,
    run: async (app, lang) => {
      const form = await openForm(app, lang);
      const notes = form.getByLabel(await app.t('lbl_notes'), { exact: true });
      await notes.click();
      await notes.press('End');
      await notes.pressSequentially(' ');
      await app.idle(300);
      await app.page.keyboard.press('Escape');
      await (await discardAsk(app)).waitFor();
      await app.idle(800);
    },
    marks: async (app) => {
      const ask = await discardAsk(app);
      return [
        ask.getByRole('heading', { level: 2, name: await app.t('discard_title'), exact: true }),
        ask.getByText(await app.t('discard_msg'), { exact: true }),
        ask.getByRole('button', { name: await app.t('cancel'), exact: true }),
        side('end', ask.getByRole('button', { name: await app.t('discard_btn'), exact: true })),
      ];
    },
    // no button of the question is pressed: the app is loaded again, and the typed space is gone with the form
    after: async (app) => { await app.backToApp(); },
  },
];
