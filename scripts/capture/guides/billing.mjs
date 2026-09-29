// The subscription guide's screens: 4.10 (manage your subscription and seats). NOTHING IS BOUGHT and nothing is written:
// Settings › Billing is opened through the side menu and the Settings list; the card's own status read is the only call;
// nothing on the card is pressed except the Subscription (i) (a popover of the page, closed by Escape) and Billing log (a
// read, left by its own Back). Subscribe, the cycle choice, Refresh and the export buttons are never clicked, focused or
// hovered — Subscribe would open the payment provider's checkout.
import { around, escape, escapeRe, side, slotted } from '../helpers.mjs';
import { settingsList } from './security.mjs';

/** The status card: the rounded box that holds the Billing log button. */
const statusCard = async (app) => app.page.getByRole('button', { name: await app.t('blog_open'), exact: true }).first()
  .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
/** The plan box of a workspace with no subscription: the rounded box its "Choose your plan" band opens. */
const planBox = async (app) => app.page.getByRole('heading', { level: 4, name: new RegExp(`^${escapeRe(await app.t('bil_plan_title'))}`) }).first()
  .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
/** The Subscription (i): its name is "Help: <its title>". */
const subscriptionHelp = async (app) => app.page.getByRole('button', { name: (await app.t('info_aria_help')).replace('{0}', await app.t('bil_title')), exact: true }).first();
/** The (i)'s open panel, named by its title. */
const helpPanel = async (app) => app.page.getByRole('dialog', { name: await app.t('bil_title'), exact: true });

/** Settings from the side menu, then System and Billing in the Settings list — System first, so the Billing card mounts fresh on
 *  its card view whatever a browser last left open; the card reads its status before it draws. */
async function openBilling(app) {
  await app.nav('tab_settings');
  const list = await settingsList(app);
  await list.getByRole('button', { name: await app.t('set_tab_system'), exact: true }).click();
  await app.idle(300);
  await list.getByRole('button', { name: await app.t('set_tab_billing'), exact: true }).click();
  await app.page.getByRole('button', { name: await app.t('blog_open'), exact: true }).first().waitFor({ timeout: 15_000 });
  await app.idle(900);
}

/** @type {import('../shots.mjs').Shot[]} */
export default [
  {
    // step 1: Settings on Billing
    id: 'billing-open',
    alt: { en: 'Settings on Billing: Settings in the side menu, Billing in the Settings list, and the status card with the workspace\'s state and its seats in use', he: 'הגדרות על חיובים: הגדרות בתפריט הצדדי, חיובים ברשימת ההגדרות, וכרטיס המצב עם מצב סביבת העבודה והמקומות שבשימוש' },
    run: openBilling,
    marks: async (app) => [
      app.page.getByRole('button', { name: new RegExp(`^${escapeRe(await app.t('tab_settings'))}`, 'i') }).first(),
      (await settingsList(app)).getByRole('button', { name: await app.t('set_tab_billing'), exact: true }),
      await statusCard(app),
    ],
  },
  {
    // step 2: the same screen, the status card's parts in reading order (nothing on it is pressed)
    id: 'billing-status',
    alt: { en: 'The Billing status card: the state, the Billing log and Refresh buttons, the seats in use out of the seats held, and the note that there is no subscription yet', he: 'כרטיס המצב בחיובים: המצב, הכפתורים יומן חיובים ורענון, המקומות בשימוש מתוך המקומות שבידיכם, וההודעה שאין מנוי עדיין' },
    run: openBilling,
    marks: async (app) => {
      const card = await statusCard(app);
      // the state pill: any of the card's state words (the demo runs on a licence)
      const states = await Promise.all(['bil_status_active', 'bil_status_trial', 'bil_status_grant', 'bil_status_license', 'bil_status_free', 'bil_status_past_due', 'bil_status_ended', 'bil_status_readonly'].map((k) => app.t(k)));
      return [
        card.getByText(new RegExp(`^(${states.map(escapeRe).join('|')})$`)).first(),
        around([card.getByRole('button', { name: await app.t('blog_open'), exact: true }), card.getByRole('button', { name: await app.t('bil_refresh'), exact: true })]),
        // "1 of 5 seats in use"
        card.getByText(slotted(await app.t('bil_seats_used'))).first(),
        card.getByText(await app.t('bil_no_sub_title'), { exact: true }).locator('xpath=..'),
      ];
    },
  },
  {
    // step 3: the plan box of a workspace with no subscription, pictured as it stands (the cycle choice and Subscribe are
    // never clicked, focused or hovered)
    id: 'billing-plan',
    alt: { en: 'Choose your plan: Monthly or Yearly with what yearly saves, the plan\'s price with its five included accounts, the sentence about what comes after subscribing, and the Subscribe — pay by card button', he: 'בחירת תוכנית: חודשי או שנתי ומה ששנתי חוסך, מחיר התוכנית עם חמשת החשבונות הכלולים בה, המשפט על מה שבא אחרי ההרשמה, והכפתור הרשמה למנוי — תשלום בכרטיס' },
    badge: 'start',
    run: async (app) => {
      await openBilling(app);
      const box = await planBox(app);
      await box.waitFor();
      // the prices arrive with the status read: wait for the price line, then bring the box into view (a scroll only)
      await box.locator('[data-testid="subscribe-total"]').waitFor({ timeout: 15_000 });
      await box.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await app.idle(400);
    },
    marks: async (app) => {
      const box = await planBox(app);
      const cycle = box.getByRole('radiogroup', { name: await app.t('bil_cycle_title'), exact: true });
      const subscribe = box.getByRole('button', { name: await app.t('bil_subscribe_btn'), exact: true });
      // the price line has no name of its own: the app's own test hook
      const total = box.locator('[data-testid="subscribe-total"]');
      return [
        around([cycle, cycle.locator('xpath=following-sibling::span[1]')]),
        total,
        total.locator('xpath=following-sibling::div[1]'),
        around([subscribe, subscribe.locator('xpath=following-sibling::span[1]')]),
      ];
    },
  },
  {
    // step 4: the demo has no subscription, so its boxes cannot be pictured — the nearest safe screen is the Subscription (i), open
    id: 'billing-after',
    alt: { en: 'The Subscription (i) open over the Billing card: what you can do with a subscription — expansion seats, Priority Operations, e-mail packs, the cycle, payment and cancellation — and how the one plan works', he: 'סמל ה-(i) של מנוי פתוח מעל כרטיס החיובים: מה אפשר לעשות עם מנוי — מקומות הרחבה, תמיכה בעדיפות גבוהה, חבילות אימייל, מחזור חיוב, תשלום וביטול — ואיך התוכנית האחת עובדת' },
    run: async (app) => {
      await openBilling(app);
      await (await subscriptionHelp(app)).click();
      await (await helpPanel(app)).waitFor();
      await app.idle(600);
    },
    marks: async (app) => {
      const pop = await helpPanel(app);
      // a section = the icon beside its label + text: the text's paragraph → its block → the row with the icon
      const section = async (key) => pop.getByText(await app.t(key), { exact: true }).locator('xpath=../..');
      return [
        side('above', await subscriptionHelp(app)),
        await section('info_bil_subscription_cando'),
        await section('info_bil_subscription_how'),
      ];
    },
    // the popover closes the way a person closes it: Escape
    after: async (app) => { await escape(app); },
  },
  {
    // step 5: the billing log (a read of the workspace's own ledger); no filter, date or export button is touched
    id: 'billing-log',
    alt: { en: 'The billing log: Back to Billing, the search, source and date filters, Reset filters with the CSV, Excel and Print buttons, and the log table', he: 'יומן החיובים: חזרה לחיובים, מסנני החיפוש, המקור והתאריכים, איפוס מסננים עם הכפתורים CSV,‏ Excel והדפסה, וטבלת היומן' },
    run: async (app) => {
      await openBilling(app);
      await app.page.getByRole('button', { name: await app.t('blog_open'), exact: true }).first().click();
      await app.page.getByRole('button', { name: await app.t('blog_back'), exact: true }).waitFor();
      await app.idle(800);
    },
    marks: async (app) => {
      const search = app.page.getByRole('textbox', { name: await app.t('logs_filter_search'), exact: true });
      const endDate = app.page.getByRole('button', { name: await app.t('logs_filter_end'), exact: true });
      const csv = app.page.getByRole('button', { name: `${await app.t('rpt_export_as')} CSV`, exact: true });
      const withLabel = (control) => control.locator('xpath=ancestor::*[label][1]');
      return [
        app.page.getByRole('button', { name: await app.t('blog_back'), exact: true }),
        // the filters — the search, Source and the two dates, each with its label — in ONE outline
        around([withLabel(search), app.page.getByText(await app.t('blog_filter_source'), { exact: true }).first().locator('xpath=..'), withLabel(endDate)]),
        // the bar's end slot: Reset filters and the three export buttons
        csv.locator('xpath=ancestor::div[contains(@class,"self-end")][1]'),
        app.page.getByRole('table').first(),
      ];
    },
    // back to the card by its own button, found by its label right before the click
    after: async (app) => {
      const back = app.page.getByRole('button', { name: await app.t('blog_back'), exact: true });
      if (await back.isVisible()) { await back.click(); await app.idle(400); }
    },
  },
];
