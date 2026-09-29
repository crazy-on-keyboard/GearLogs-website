// The capture's shared helpers: how a shot finds the app's controls (by the app's own labels, never a remembered click
// position), the demo's names in both workspaces, and the small moves many shots share (open a card, open the kits area…).
// The shot lists live in ./shots.mjs (the site's pictures) and ./guides/*.mjs (one file per guide area).

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One of the app's counted phrases as a whole-name pattern: every "{0}" slot matches a number ("Return {0} items"). */
export const counted = (word) => new RegExp(`^${word.split(/\{\d\}/).map(escapeRe).join('\\d+')}$`);

/** The same, with any text in the slot (a name, or a number the app may wrap in bidi marks). */
export const slotted = (word) => new RegExp(`^${word.split(/\{\d\}/).map(escapeRe).join('.+')}$`);

/** My Gear, the staff page (served locally on :4175); its session lives in the same capture window as the demo account's. */
const STAFF = process.env.CAPTURE_STAFF ?? 'http://localhost:4175';

/** Open My Gear in the language of the run (the page keeps its own language switch) and wait for its rail. */
export async function openMyGear(app, lang) {
  if (!app.page.url().startsWith(STAFF)) await app.page.goto(STAFF, { waitUntil: 'load' });
  await app.page.waitForTimeout(1500);
  if (!(await app.page.evaluate(() => document.documentElement.lang || 'en')).startsWith(lang)) {
    await app.page.getByRole('button', { name: lang === 'he' ? 'HE' : 'EN', exact: true }).first().click();
    await app.page.waitForFunction((w) => (document.documentElement.lang || 'en').startsWith(w), lang);
  }
  const rail = (key) => app.t(key).then((w) => app.page.getByRole('option', { name: new RegExp(`^${escapeRe(w)}`, 'i') }).first());
  await (await rail('staff_rail_gear')).waitFor({ timeout: 15_000 });
  return rail;
}

/** The demo's own names in each workspace (the Hebrew Logistics demo is the same workspace in Hebrew words). The holdings a
 *  guide relies on are noted beside each name — a demo reseed that moves them breaks that guide's picture, and the capture says so. */
export const NAMES = {
  serialItem: { en: 'Barcode Scanner', he: 'סורק ברקוד' },
  serialTab: { en: 'Fleet', he: 'צי רכב' },
  homeTab: { en: 'Warehouse', he: 'מחסן' },
  team: { en: 'Warehouse — Days', he: 'מחסן — יום' },
  plainItem: { en: 'Hand Truck', he: 'עגלת יד' },
  // the item that is over its storage capacity (60 held against 57), on the home tab's Racking group
  overItem: { en: 'Shelving Bay', he: 'יחידת מדפים' },
  // a department head (PR-001): holds the Driver Kit (three lines out), one disputed receipt and one write-off
  person: { en: 'Carlos Mendez', he: 'יוסי אברהם' },
  // holds two Cargo Nets loose (not in a kit): the return guide's person
  returnPerson: { en: 'Lea Moreau', he: 'ליאת כהן' },
  returnItem: { en: 'Cargo Net', he: 'רשת מטען' },
  // the batch guide's group: five plain items, none serialized or sensitive
  batchGroup: { en: 'Racking', he: 'מדפים' },
  // holds two plain items and a serial-numbered unit: the write-off guide's person
  holder: { en: 'Joel Adeyemi', he: 'אבי טספאי' },
  // the kit the guides hand out (KT-003), the group of four that receives it, its first person, and the whole tab (31 people)
  kit: { en: 'Cold Store Kit', he: 'ערכת חדר קירור' },
  kitTeam: { en: 'Cold Chain', he: 'שרשרת קירור' },
  kitPerson: { en: 'Piotr Nowak', he: 'גדי שמעוני' },
  kitTab: { en: 'Crew', he: 'צוות קבוע' },
  // the same tab on the Personnel board (the head's group Warehouse — Days sits on it)
  peopleTab: { en: 'Crew', he: 'צוות קבוע' },
  // the Cold Store Kit's lines that are short for the whole tab (4 and 18 in stock)
  kitShort: { en: ['Thermal Suit', 'Cold Gloves (pair)'], he: ['חליפה תרמית', 'כפפות קור (זוג)'] },
  // the kit the guides take back (KT-001), its row on the head's card, and the line marked lost
  heldKit: { en: 'Driver Kit', he: 'ערכת נהג' },
  heldKitRow: { en: 'Driver Kit KT-001', he: 'ערכת נהג KT-001' },
  kitLost: { en: 'Fuel Card', he: 'כרטיס דלק' },
};

/** A mark whose number sits on a chosen side (`start` beside it, `end` on its far side, `corner` above its start corner,
 *  `above` / `below` centred over or under it): for a target whose default side would hide a neighbour the guide names
 *  (a label above a field, the next button in a footer, the next icon in a row). */
export const side = (badge, at) => ({ at, badge });

/** ONE outline around several things that stand together (two arrows, a row of filters), with one number. */
export const around = (places, badge) => ({ around: places, ...(badge ? { badge } : {}) });

/** A field WITH its label (and its hint): the nearest box that holds the label — an outline on the control alone dims its name. */
export const labelled = (control) => control.locator('xpath=ancestor::*[label][1]');

/** A board control by its label "<word> — [role ]<name>" (a person's label carries the role before the name). */
export const control = async (app, key, name) => app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t(key))} — (.+ )?${escapeRe(name)}$`) }).first();

/** A person's (or an item's) board card: the card that holds its own Edit Record button. */
export const boardCard = async (app, name) => app.page.locator('.card-base').filter({ has: await control(app, 'tooltip_edit', name) }).first();

/** A person's form: the fields whose VALUES a picture never shows — the phone and the ID number (the demo's are invented, and
 *  an invented number may still be somebody's; the personal number is the workspace's own and may show). A shot names them
 *  in `blank`. */
export const personalFields = (form) => form.locator('input[id$="phone"], input[id$="id_number"]');

/** Bring an element to the top of its scrolling pane, with a little room above it. */
export const toTop = (locator) => locator.evaluate((el) => {
  el.scrollIntoView({ block: 'start' });
  let p = el.parentElement;
  while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
  p?.scrollBy(0, -28);
});

/** The places of a locator that sit wholly inside the picture (a group mark numbers every one of them). */
export async function onScreen(app, locator) {
  const { width, height } = app.page.viewportSize();
  const inside = [];
  for (const place of await locator.all()) {
    const b = await place.boundingBox();
    if (b && b.x >= 0 && b.y >= 0 && b.x + b.width <= width && b.y + b.height <= height) inside.push(place);
  }
  return inside;
}

/** Approvals with its Waiting list open (the app remembers the last list picked, so a shot never trusts it). */
export async function openWaiting(app) {
  await app.nav('tab_approvals');
  await app.page.getByRole('option', { name: new RegExp(`^${escapeRe(await app.t('apr_tab_waiting'))}`, 'i') }).first().click();
  await app.idle(800);
}

/** A dashboard card by its title (the card is the rounded box that holds the title). */
export const dashboardCard = async (app, key) => app.page.locator('.rounded-xl').filter({ has: app.page.getByRole('heading', { name: await app.t(key), exact: true }) }).first();

/** Open a board card by its own "Show details" button and bring the whole open card into view. */
export async function openCard(app, name) {
  await (await control(app, 'show_details', name)).click();
  await app.idle(900);
  await toTop(await control(app, 'tooltip_edit', name));
  await app.idle(400);
}
export const closeCard = async (app, name) => { await (await control(app, 'hide_details', name)).click().catch(() => {}); await app.idle(300); };

/** Close what a shot opened the way a person would: Escape, once per open window (it closes the topmost only). */
export async function escape(app, times = 1) {
  for (let i = 0; i < times; i++) { await app.page.keyboard.press('Escape'); await app.idle(300); }
}

/** The Logistics area switch (Equipment | Kits): the app remembers it per member in this browser (localStorage, never the
 *  database), so a kit shot opens it and puts Equipment back after — the item-board shots never trust it. */
const area = async (app, key) => app.page.getByRole('radio', { name: await app.t(key), exact: true }).first();
export async function openKits(app) {
  await app.nav('tab_logistics');
  await (await area(app, 'area_kits')).click();
  await app.idle(900);
}
export async function leaveKits(app) {
  await (await area(app, 'area_equipment')).click().catch(() => {});
  await app.idle(400);
}
/** Logistics on its item board (Equipment), whatever this browser last left open — the item shots never trust the switch. */
export async function openLogistics(app) {
  await app.nav('tab_logistics');
  await leaveKits(app);
}
