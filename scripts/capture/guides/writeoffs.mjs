// The write-off guide's screens: 4.7 (write off lost gear, and retire a leaver). Nothing is written off or archived: every
// window opens untouched (one line ticked at most — the window's own state), no confirm is ever pressed, the departing window's
// confirm stays locked because its word is never typed, and each window closes by Escape or its own Cancel.
import { NAMES, boardCard, control, escape, escapeRe, onScreen, openCard, closeCard, side } from '../helpers.mjs';

/** A person's own window, open over the board (found by its title). */
const dialogNamed = async (app, key) => app.page.getByRole('dialog', { name: await app.t(key), exact: true });
/** The row's Write off button: "Write off — <item>" (the footer's "Write off items — …" never matches: the dash follows the word). */
const rowWriteOff = async (app, lang) => (await boardCard(app, NAMES.holder[lang])).getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('writeoff'))} — `) }).first();
/** Close a window, then fold the holder's card. */
const closeAndFold = async (app, lang) => { await escape(app); await closeCard(app, NAMES.holder[lang]); };

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: the holder's card open — Write off on an item's row, Write off items and Archive at its foot (nothing pressed)
    id: 'writeoff-card',
    alt: { en: 'A person opened on the Personnel board: the Write off button on an item\'s row, and Write off items and Archive at the foot of the card', he: 'אדם פתוח בלוח כוח האדם: הכפתור רישום אובדן בשורת פריט, ובתחתית הכרטיס רישום פריטים כאובדן והעבר לארכיון' },
    run: async (app, lang) => { await app.nav('tab_personnel'); await openCard(app, NAMES.holder[lang]); },
    marks: async (app, lang) => [
      await rowWriteOff(app, lang),
      await control(app, 'wo_batch_title', NAMES.holder[lang]),
      await control(app, 'archive', NAMES.holder[lang]),
    ],
    after: async (app, lang) => closeCard(app, NAMES.holder[lang]),
  },
  {
    // step 2: the single-item window, open and untouched
    id: 'writeoff-item',
    alt: { en: 'Writing off one item: the reason, the quantity, the date it happened and a note', he: 'גריעת פריט אחד: הסיבה, הכמות, תאריך האירוע והערה' },
    badge: 'start',
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.holder[lang]);
      await (await rowWriteOff(app, lang)).click();
      await (await dialogNamed(app, 'writeoff_item_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'writeoff_item_title');
      return [
        dialog.getByRole('radiogroup').first(),
        dialog.getByRole('group', { name: await app.t('writeoff_qty'), exact: true }),
        dialog.getByLabel(await app.t('writeoff_date'), { exact: true }),
        dialog.getByLabel(await app.t('writeoff_note'), { exact: true }),
      ];
    },
    after: closeAndFold,
  },
  {
    // step 3: the several-items window with one line ticked, so its confirm reads "Write off 1"
    id: 'writeoff-batch',
    alt: { en: 'Writing off several of a person\'s items at once: tick the lines, pick one reason, confirm them together', he: 'גריעת כמה מהפריטים של אדם בבת אחת: מסמנים שורות, בוחרים סיבה אחת ומאשרים את כולן יחד' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.holder[lang]);
      await (await control(app, 'wo_batch_title', NAMES.holder[lang])).click();
      const dialog = await dialogNamed(app, 'wo_batch_title');
      await dialog.waitFor();
      await dialog.getByRole('checkbox').first().click();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'wo_batch_title');
      return [
        dialog.getByRole('button', { name: await app.t('wo_batch_all'), exact: true }),
        dialog.getByRole('checkbox').first(),
        side('start', dialog.getByRole('radiogroup').first()),
        dialog.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('wo_batch_confirm')).replace('\\{0\\}', '\\d+')}$`) }),
      ];
    },
    after: closeAndFold,
  },
  {
    // step 4: the departing window — its confirm stays locked until the word is typed, and nothing is typed
    id: 'writeoff-depart',
    alt: { en: 'Retiring a person who left with gear: everything they hold, one reason for all, and the word to type before it archives them', he: 'העברה לארכיון של אדם שעזב עם ציוד: כל מה שבידיו, סיבה אחת לכולם והמילה שמקלידים לפני ההעברה' },
    run: async (app, lang) => {
      await app.nav('tab_personnel');
      await openCard(app, NAMES.holder[lang]);
      await (await control(app, 'archive', NAMES.holder[lang])).click();
      await (await dialogNamed(app, 'depart_title')).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const dialog = await dialogNamed(app, 'depart_title');
      return [
        side('start', dialog.getByText(new RegExp(`^${escapeRe(await app.t('depart_holdings'))}`)).first().locator('xpath=..')),
        side('start', dialog.getByRole('radiogroup').first()),
        side('start', dialog.getByRole('textbox', { name: new RegExp(escapeRe(`"${await app.t('confirm_word_archive')}"`)) })),
        dialog.getByRole('button', { name: await app.t('depart_confirm'), exact: true }),
      ];
    },
    // the window's own Cancel, found by its label right before the click; the card folds after
    after: async (app, lang) => {
      await (await dialogNamed(app, 'depart_title')).getByRole('button', { name: await app.t('cancel'), exact: true }).click();
      await app.idle(400);
      await closeCard(app, NAMES.holder[lang]);
    },
  },
  {
    // step 5: the Archive's Write-offs tab (the Archive opens on Personnel Archives, so the tab is picked)
    id: 'archive-writeoffs',
    alt: { en: 'The Archive\'s write-offs: every loss with its reason, who reported it and whether it was recovered', he: 'האובדנים בארכיון: כל אובדן עם הסיבה, מי דיווח ואם שוחזר' },
    run: async (app) => {
      await app.nav('tab_archive');
      await app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('tab_writeoffs'))}`) }).first().click();
      await app.idle(800);
    },
    marks: async (app) => [
      app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('tab_writeoffs'))}`) }).first(),
      side('start', [app.page.getByRole('combobox', { name: await app.t('wo_col_reason'), exact: true }).first(),
        app.page.getByRole('combobox', { name: await app.t('wo_filter_status'), exact: true }).first()]),
      app.page.getByText(await app.t('wo_stat_records'), { exact: true }).first().locator('xpath=../..'),
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('wo_recover'))} — `) }).first(),
    ],
  },
  {
    // step 6: Personnel Archives with its exits and Restore (nothing is pressed)
    id: 'archive-personnel',
    alt: { en: 'The Archive\'s retired people: who they were, when they left, what was written off, and Restore', he: 'אנשים בארכיון: מי הם, מתי עזבו, מה נרשם כאובדן, והכפתור שחזר' },
    run: async (app) => {
      await app.nav('tab_archive');
      await app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('arch_tab_personnel'))}`) }).first().click();
      await app.idle(800);
    },
    marks: async (app) => [
      app.page.getByRole('tab', { name: new RegExp(`^${escapeRe(await app.t('arch_tab_personnel'))}`) }).first(),
      app.page.getByRole('combobox', { name: await app.t('arch_col_onexit'), exact: true }).first(),
      side('start', await onScreen(app, app.page.getByText(await app.t('arch_onexit_clean'), { exact: true }))),
      side('corner', app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('restore'))} — `) }).first()),
    ],
  },
  {
    // step 7: the head's card open — its red loss mark and its Written Off list (nothing is pressed)
    id: 'person-card-losses',
    alt: { en: 'A person\'s card with a loss: the red mark, and the Written Off list — what, how many times, how many still lost', he: 'כרטיס של אדם עם אובדן: הסימון האדום, והרשימה נרשם כאובדן — מה, כמה פעמים וכמה עדיין אבודים' },
    run: async (app, lang) => { await app.nav('tab_personnel'); await openCard(app, NAMES.person[lang]); },
    marks: async (app, lang) => {
      const card = await boardCard(app, NAMES.person[lang]);
      // the loss mark speaks "{0} written off" only while it is on — matched by the words after the count
      const tail = (await app.t('wo_flag_tip')).split('{0}')[1];
      return [
        card.locator(`[aria-label$="${tail}"]`).first(),
        card.getByRole('table', { name: await app.t('wo_written_off'), exact: true }),
      ];
    },
    after: async (app, lang) => closeCard(app, NAMES.person[lang]),
  },
];
