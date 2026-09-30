// The My Gear access guide's app screens: 4.25 (give your people My Gear). Nothing is written by a recipe: the Personnel board's
// tab and its "Cannot receive a code" filter are the screen's own state; a card only opens and closes by its own chevron; Edit
// Person opens and closes by Escape with nothing typed (Save and Archive are outlined, never pressed). A demo person's phone
// and ID number never show: their values are blanked for the picture (invented numbers, and possibly somebody's).
// (The guide's one My Gear page, the four sections, lives with the other My Gear pictures in mygear.mjs.)
import { NAMES, boardCard, closeCard, control, escape, escapeRe, openCard, personalFields, side, toTop } from '../helpers.mjs';

/** The "Cannot receive a code" filter: its name is its caption, then its words with the count. */
const noCodeFilter = async (app) => app.page.getByRole('button', { name: new RegExp(`${escapeRe((await app.t('apr_filter_no_code')).split(' · ')[0])} · \\d+`) }).first();
/** Personnel on the Crew tab, the filter set as the shot wants it (both are the screen's own state — never saved). */
async function openPeople(app, lang, noCodeOnly = false) {
  await app.nav('tab_personnel');
  await app.page.getByRole('button', { name: NAMES.peopleTab[lang], exact: true }).first().click();
  await app.idle(600);
  const filter = await noCodeFilter(app);
  if (((await filter.getAttribute('aria-pressed')) === 'true') !== noCodeOnly) { await filter.click(); await app.idle(600); }
}
/** The Edit Person window (its name is its title). */
const editWindow = async (app) => app.page.getByRole('dialog', { name: await app.t('edit_person'), exact: true });
/** A person's Edit Person window, open, with a field brought into view (nothing is typed; the form saves only on Save). */
async function openEdit(app, name, fieldKey) {
  await (await control(app, 'tooltip_edit', name)).click();
  const dialog = await editWindow(app);
  await dialog.waitFor();
  await app.idle(600);
  await dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t(fieldKey))}`) }).first().scrollIntoViewIfNeeded();
  await app.idle(300);
  return dialog;
}
/** The open card's contact line: the ID number's cell, and from it the cells before it (phone · e-mail · ID · personal number). */
const idCell = async (app, card) => card.getByText(await app.t('per_id_number'), { exact: true }).first().locator('xpath=..');

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // 4.25 before you start: the workspace's own code on the Personnel band (stage 4 PR 3 — the Director's Code look · A · Code chip + Copy)
    id: 'personnel-ws-code',
    alt: { en: 'The Personnel band: the workspace code with its Copy button and (i) at the end of the band', he: 'סרגל כוח האדם: קוד סביבת העבודה עם כפתור ההעתקה וה-(i) בקצה הסרגל' },
    run: async (app, lang) => { await openPeople(app, lang); },
    marks: async (app) => {
      const slot = app.page.getByTestId('workspace-code');
      return [
        // the caption and the chip are ONE outline; then Copy; then the (i)
        around([slot.locator('span').first(), slot.locator('bdi').first()], 'below'),
        side('below', slot.getByRole('button', { name: /^Copy|העתק/ }).first()),
        side('below', slot.getByRole('button').last()),
      ];
    },
  },
  {
    // step 1: the filter pressed, the head of Cold Chain (no e-mail on record: No code) at the top of the pane
    id: 'people-no-code',
    alt: { en: 'Personnel with the filter pressed: Personnel in the side menu, the Cannot receive a code filter with its count, a No code mark and the card\'s Edit Record button', he: 'כוח אדם עם המסנן לחוץ: כוח אדם בתפריט הצדדי, המסנן לא יכולים לקבל קוד עם המספר שלו, הסימון ללא קוד והכפתור ערוך רשומה בכרטיס' },
    run: async (app, lang) => {
      await openPeople(app, lang, true);
      await toTop(await boardCard(app, NAMES.kitPerson[lang]));
      await app.idle(400);
    },
    marks: async (app, lang) => {
      const card = await boardCard(app, NAMES.kitPerson[lang]);
      return [
        app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_personnel'))}`, 'i') }).first(),
        await noCodeFilter(app),
        side('end', card.getByText(await app.t('apr_no_code'), { exact: true }).first()),
        side('end', await control(app, 'tooltip_edit', NAMES.kitPerson[lang])),
      ];
    },
    // the board shows everyone again (the filter is the screen's own state)
    after: async (app) => {
      const filter = await noCodeFilter(app);
      if ((await filter.getAttribute('aria-pressed').catch(() => null)) === 'true') { await filter.click(); await app.idle(300); }
    },
  },
  {
    // step 2: Edit Person for the same head — both numbers on record, no e-mail (nothing is typed)
    id: 'people-signin-fields',
    alt: { en: 'Edit Person for someone with no email yet: the Email field, the ID number, the personal number and Save', he: 'עריכת אדם למי שעדיין אין לו אימייל: השדה אימייל, מספר הזהות, המספר האישי והכפתור שמור' },
    badge: 'start',
    blank: async (app) => [personalFields(await editWindow(app))],
    run: async (app, lang) => {
      await openPeople(app, lang);
      await openEdit(app, NAMES.kitPerson[lang], 'per_org_identifier');
    },
    marks: async (app) => {
      const dialog = await editWindow(app);
      return [
        dialog.getByRole('textbox', { name: await app.t('email'), exact: true }),
        // the ID number's label carries its (i): matched by its start
        dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t('per_id_number'))}`) }).first(),
        dialog.getByRole('textbox', { name: await app.t('per_org_identifier'), exact: true }),
        side('end', dialog.getByRole('button', { name: await app.t('save'), exact: true })),
      ];
    },
    // nothing was typed: Escape closes the window without asking and without saving
    after: async (app) => { await escape(app); },
  },
  {
    // step 3: a person who can receive a code — the open card's contact line
    id: 'people-signin-details',
    alt: { en: 'A person\'s card opened with Show details: the email on record, no ID number, and the personal number', he: 'כרטיס של אדם שנפתח עם הצג פרטים: האימייל הרשום, בלי מספר זהות, והמספר האישי' },
    // the phone stands first on the contact line: its number stays out of the picture
    blank: async (app, lang) => [(await idCell(app, await boardCard(app, NAMES.returnPerson[lang]))).locator('xpath=preceding-sibling::div[2]')],
    run: async (app, lang) => {
      await openPeople(app, lang);
      await openCard(app, NAMES.returnPerson[lang]);
    },
    marks: async (app, lang) => {
      const id = await idCell(app, await boardCard(app, NAMES.returnPerson[lang]));
      const card = await boardCard(app, NAMES.returnPerson[lang]);
      return [
        // the e-mail: the cell just before the ID number (its envelope and the address — a reserved test domain)
        id.locator('xpath=preceding-sibling::div[1]'),
        id,
        card.getByText(await app.t('per_org_identifier'), { exact: true }).first().locator('xpath=..'),
      ];
    },
    after: async (app, lang) => closeCard(app, NAMES.returnPerson[lang]),
  },
  {
    // step 5: Edit Person for a person with an e-mail on record (and gear in hand, so Archive would be refused)
    id: 'people-signin-access',
    alt: { en: 'Edit Person: the Email field, and Archive at the foot of the window', he: 'עריכת אדם: השדה אימייל, והכפתור העבר לארכיון בתחתית החלון' },
    badge: 'start',
    blank: async (app) => [personalFields(await editWindow(app))],
    run: async (app, lang) => {
      await openPeople(app, lang);
      await openEdit(app, NAMES.returnPerson[lang], 'email');
    },
    marks: async (app) => {
      const dialog = await editWindow(app);
      return [
        dialog.getByRole('textbox', { name: await app.t('email'), exact: true }),
        // Archive and its (i) stand together at the footer's start: ONE outline around their box
        dialog.getByRole('button', { name: await app.t('archive'), exact: true }).locator('xpath=..'),
      ];
    },
    after: async (app) => { await escape(app); },
  },
];
