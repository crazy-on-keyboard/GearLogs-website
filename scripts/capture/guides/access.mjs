// The access guide's screens: 4.5 (give each member a role, and the rights they need). Nothing is saved: a window opens, at
// most one right is ticked or the Role list is opened (the window's own state), no Save is ever pressed, no Enter is typed, and
// every window closes by Escape or its own Cancel.
// PRIVACY: a member's row and a member's own window carry a REAL sign-in address (the demo accounts are real sign-ins). The Users
// screen is pictured above its rows; behind a window the rows are hidden; in your own window the address field is hidden. The
// capture itself refuses any picture that would still show an address.
import { escape, escapeRe } from '../helpers.mjs';

/** The band's title "User Management" (its (i) sits inside the heading, so the name only starts with the title). */
const usersBand = async (app) => app.page.getByRole('heading', { level: 1, name: new RegExp(`^${escapeRe(await app.t('user_mgmt'))}`, 'i') }).first();
/** The member rows (each holds a name and a sign-in address). */
const memberRows = (app) => app.page.getByRole('table').first().locator('tbody');

/** Users from the side menu (the view is lazy-loaded: wait for its band). */
async function openUsers(app) {
  await app.nav('tab_admin');
  await (await usersBand(app)).waitFor();
  await app.page.getByRole('table').first().waitFor();
  await app.idle(600);
}
const userDialog = async (app, key) => app.page.getByRole('dialog', { name: await app.t(key), exact: true });

/** Add User → Create User, open and empty. */
async function openCreate(app) {
  await openUsers(app);
  await app.page.getByRole('button', { name: await app.t('add_user'), exact: true }).first().click();
  const dialog = await userDialog(app, 'create_user');
  await dialog.waitFor();
  await app.idle(600);
  return dialog;
}

/** Close a Users window by its own Cancel, found by its label right before the click (skipped when it is already closed). */
async function cancelDialog(app, key) {
  const dialog = await userDialog(app, key);
  if (await dialog.isVisible()) { await dialog.getByRole('button', { name: await app.t('cancel'), exact: true }).click(); await app.idle(400); }
}

/** The Role field (the shared Field binds its label to the Select's combobox). */
const roleField = async (dialog, app) => dialog.getByRole('combobox', { name: await app.t('role'), exact: true });
/** The rights box ("Personal Permissions"): a scrolling box of its own inside the window. */
const rightsList = async (dialog, app) => dialog.getByText(await app.t('perm_info'), { exact: true }).locator('xpath=..');
/** One right's whole row (the checkbox and its label with "Included in this role" / "Administrators only"). */
const rightRow = async (dialog, app, key) => dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(await app.t(key))}`) }).locator('xpath=..');

/** Every marked thing must sit wholly inside `edge` — a wrapped label or a short window would hide one. */
async function inside(edge, marks, id) {
  for (const m of marks) {
    const b = await m.boundingBox();
    if (!b || b.y < edge.top || b.y + b.height > edge.bottom) throw new Error(`capture: ${id} — a marked thing sits outside its box`);
  }
  return marks;
}

/** Bring a row to the top of the box that scrolls it (no click, no focus). */
const toBoxTop = (locator) => locator.evaluate((el) => {
  let box = el.parentElement;
  while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
  if (box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
});

/** The room an outline takes beyond its target (the build's padding of 6 and its stroke). */
const OUTLINE_ROOM = 8;

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Users, pictured from the band down to the list's column heads — the member rows are never in the picture
    id: 'access-users',
    alt: { en: 'The Users screen: Add User, the seats in use, the name of the company\'s own ID field, and the columns of the member list', he: 'מסך המשתמשים: הוסף משתמש, המקומות בשימוש, השם של שדה המזהה של הארגון ועמודות רשימת המשתמשים' },
    run: openUsers,
    clip: async (app) => {
      const head = await app.page.getByRole('table').first().locator('thead').boundingBox();
      // the whole width of the window, from its top (the app's own header) to the foot of the column heads, and the room
      // their outline needs under them (the design gate, 2026-09-29: the outline ran off the picture's foot)
      return { x: 0, y: 0, width: app.page.viewportSize().width, height: Math.ceil(head.y + head.height) + OUTLINE_ROOM };
    },
    // the strip under the column heads is the first member row's top: the rows are made invisible as well
    hide: async (app) => [memberRows(app)],
    marks: async (app) => [
      app.page.getByRole('button', { name: await app.t('add_user'), exact: true }).first(),
      app.page.getByText(await app.t('current_usage'), { exact: true }).first().locator('xpath=../..'),
      // the label field's whole row — the field is never clicked: leaving it would save it
      app.page.getByRole('textbox', { name: await app.t('ext_id_field_label'), exact: true }).first().locator('xpath=..'),
      app.page.getByRole('table').first().locator('thead'),
    ],
  },
  {
    // step 2: Create User, open and untouched (nothing typed)
    id: 'access-create',
    alt: { en: 'Create User: first and last name, the company\'s own ID, the sign-in email and the first password', he: 'צור משתמש: שם פרטי ושם משפחה, המזהה של הארגון, אימייל הכניסה והסיסמה הראשונה' },
    badge: 'start',
    run: async (app) => { await openCreate(app); },
    hide: async (app) => [memberRows(app)],
    marks: async (app) => {
      const dialog = await userDialog(app, 'create_user');
      return [
        // the input → its Field → the two-name row (First Name · Last Name as one mark)
        dialog.getByRole('textbox', { name: await app.t('first_name'), exact: true }).locator('xpath=../..'),
        // its label is the workspace's own name for the ID (default "External ID") followed by an (i)
        dialog.getByRole('textbox', { name: new RegExp(`^${escapeRe(await app.t('ext_id_default'))}`) }).locator('xpath=..'),
        dialog.getByRole('textbox', { name: await app.t('email'), exact: true }).locator('xpath=..'),
        // a password field has no textbox role: found by its own type (the window holds one)
        dialog.locator('input[type="password"]').locator('xpath=..'),
      ];
    },
    after: async (app) => cancelDialog(app, 'create_user'),
  },
  {
    // step 3: Create User with the Role list open (opening a list picks nothing; the window is never saved)
    id: 'access-roles',
    alt: { en: 'Create User with the Role list open: Administrator, Operator, User, Viewer and Custom', he: 'צור משתמש עם רשימת התפקידים פתוחה: מנהל, מפעיל, משתמש, צופה ומותאם אישית' },
    badge: 'start',
    run: async (app) => {
      const dialog = await openCreate(app);
      await (await roleField(dialog, app)).click();
      await app.page.getByRole('listbox').last().waitFor();
      await app.idle(400);
    },
    hide: async (app) => [memberRows(app)],
    marks: async (app) => {
      const dialog = await userDialog(app, 'create_user');
      return [
        (await roleField(dialog, app)).locator('xpath=..'),
        app.page.getByRole('listbox').last(),
      ];
    },
    // Escape closes the list (the topmost layer); if it closed the window too, the Cancel is skipped
    after: async (app) => { await escape(app); await cancelDialog(app, 'create_user'); },
  },
  {
    // step 4: Create User at its default role (User), one extra right ticked (the window's own state), the rights box scrolled so
    // Assign/Return Assets heads it — Write Off, Confirm on behalf and Manage Users follow in the same box
    id: 'access-rights',
    alt: { en: 'The rights list of a new User: Assign/Return Assets included in the role, Write Off / Report Lost Gear ticked on top, Confirm a hand-over on behalf for administrators and operators only, and Manage Users for administrators only', he: 'רשימת ההרשאות של משתמש חדש: הקצאה והחזרה של ציוד כלולה בתפקיד, גריעה / דיווח על ציוד אבוד מסומנת בנוסף, אישור מסירה בשם אדם למנהלים ומפעילים בלבד, וניהול משתמשים למנהלים בלבד' },
    badge: 'start',
    run: async (app) => {
      const dialog = await openCreate(app);
      await (await rightsList(dialog, app)).scrollIntoViewIfNeeded();
      await dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(await app.t('perm_WRITE_OFF_GEAR'))}`) }).click();
      await toBoxTop(dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(await app.t('perm_ASSIGN_ASSETS'))}`) }));
      await app.idle(400);
    },
    hide: async (app) => [memberRows(app)],
    marks: async (app) => {
      const dialog = await userDialog(app, 'create_user');
      const box = await (await rightsList(dialog, app)).boundingBox();
      // top to bottom as the box lists them; each row must sit wholly inside the scrolling box
      return inside({ top: box.y, bottom: box.y + box.height }, await Promise.all(
        ['perm_ASSIGN_ASSETS', 'perm_WRITE_OFF_GEAR', 'perm_CONFIRM_ON_BEHALF', 'perm_MANAGE_USERS'].map((key) => rightRow(dialog, app, key)),
      ), 'access-rights');
    },
    after: async (app) => cancelDialog(app, 'create_user'),
  },
  {
    // step 5: your own Edit User (the demo account is the workspace's only administrator and its super administrator), its
    // body scrolled so the Role field heads it; the sign-in address field is hidden for the picture
    id: 'access-self',
    alt: { en: 'Editing your own login as the only administrator: the Role field greyed with the reason, the Super Administrator box, and every right included in the role', he: 'עריכת הכניסה שלכם כמנהל היחיד: השדה תפקיד אפור עם הסיבה, התיבה מנהל-על, וכל ההרשאות כלולות בתפקיד' },
    badge: 'start',
    run: async (app) => {
      await openUsers(app);
      // the row's Edit User: "Edit User — <name>" (the only row: the demo account itself)
      await app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('edit_user'))} — `) }).first().click();
      const dialog = await userDialog(app, 'edit_user');
      await dialog.waitFor();
      await app.idle(900);
      await (await roleField(dialog, app)).locator('xpath=..').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await app.idle(400);
    },
    hide: async (app) => {
      const dialog = await userDialog(app, 'edit_user');
      // the read-only address field WITH its label (a label over nothing reads as a fault), by the field's own id
      return [memberRows(app), dialog.locator('#user-email-current').locator('xpath=ancestor::*[label][1]')];
    },
    marks: async (app) => {
      const dialog = await userDialog(app, 'edit_user');
      // the rights box must end above the window's foot (its Cancel)
      const foot = await dialog.getByRole('button', { name: await app.t('cancel'), exact: true }).boundingBox();
      return inside({ top: 0, bottom: foot.y - 4 }, [
        (await roleField(dialog, app)).locator('xpath=..'),
        dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRe(await app.t('role_super_admin'))}`) }).locator('xpath=..'),
        await rightsList(dialog, app),
      ], 'access-self');
    },
    after: async (app) => cancelDialog(app, 'edit_user'),
  },
];
