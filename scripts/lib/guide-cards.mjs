// The guides index's cards (WEB-2 · INDEX — the Director's pick, in his words: "just like what you did here with short text
// underneath. in groups/sections like you offered"). The index writes
//   <gl-guide slug="set-up-board"></gl-guide>          (`lead` on the "Start here" row: the same card, shown first)
// and the build expands it here into the ONE card: the guide's first screen cut close around the main thing its first step
// points at, then its number, title, short text and how many steps it has. Every word is read from the guide's OWN page, so
// the index can never say something else than the page does. A guide whose page is not written yet carries its own words
//   <gl-guide slug="open-my-gear" n="4.24" shot="door-my-gear" steps="5" title="…" lede="…"></gl-guide>
// and stands as a card without a link; the build refuses those words the moment the page exists.
// The pictures are cut by `npm run cards` (scripts/images/cards.mjs) into public/img/app/cards/ with an index of what each
// was cut from; the build refuses a card whose picture is missing or was cut from an older screen. Pure module: no file access.

const GUIDE = /<gl-guide\s+slug="([a-z0-9-]+)"((?:\s+[a-z]+(?:="[^"<>]*")?)*)\s*><\/gl-guide>/g;
const OWN_WORDS = ['n', 'shot', 'steps', 'title', 'lede'];

/** The card's shape and the two widths served (three cards to a row inside the 1240 px wrap; the second is for 2x screens). */
export const CARD_RATIO = 16 / 10;
export const CARD_WIDTHS = [400, 800];
/** A card never shows less than this much of the screen's width (measured on the approved board: closer, a lone button fills the card). */
const LEAST = 480;
/** The air kept around the thing the window is cut around, in the app's pixels (sideways · up and down). */
const AIR = { x: 96, y: 72 };

export const CARD_WORDS = {
  en: { steps: (n) => `${n} steps`, guides: (n) => `${n} guides`, waiting: 'Page in the works' },
  he: { steps: (n) => `${n} שלבים`, guides: (n) => `${n} מדריכים`, waiting: 'הדף בהכנה' },
};

/** The name a card's picture is filed under. */
export const cardKey = (slug, lang) => `${slug}.${lang}`;

/**
 * What a guide's page says about itself: its number, title, short text, how many steps it has and its first screen.
 * @param {string} body the guide's body (src/bodies/guides/<slug>.<lang>.html)
 * @param {string} where the page, for error messages
 */
export function guideFacts(body, where) {
  const one = (pattern, what) => {
    const found = body.match(pattern);
    if (!found) throw new Error(`guide cards: ${where} has no ${what}`);
    return found[1].trim();
  };
  const steps = (body.match(/<li class="gstep"/g) ?? []).length;
  if (!steps) throw new Error(`guide cards: ${where} has no steps`);
  return {
    n: one(/<p class="band-trail">[\s\S]*?<\/span>\s*(\d+\.\d+)\s*<\/p>/, 'number in its trail'),
    title: one(/<h1 class="band-title">([\s\S]*?)<\/h1>/, 'title'),
    lede: one(/<p class="band-lede">([\s\S]*?)<\/p>/, 'short text (band-lede)'),
    shot: one(/<gl-shot\s+id="([a-z0-9-]+)"/, 'screen'),
    steps,
  };
}

/** A screen without outlines shows this much of its top, from where the reading starts. */
const UNMARKED = 720;
/** Where the app's pages start beside the side menu, from the screen's reading-side edge (the menu's rail and the page's margin). */
const PAGE_EDGE = 87;

/**
 * The guides whose largest outline is not their best picture (looked at one by one, in both languages): the outline to cut
 * around instead, by its number in the step (`mark`; several numbers = one box around them), and a window that starts at
 * the page's own edge, where its title starts (`fromPage`) — a window centred on a thing in the middle of a row cut the
 * page's title mid-word.
 */
export const CARD_FOCUS = {
  // the largest outline is the footer's buttons: the card showed an empty corner — the dialog's head (its title and its
  // close button, one box around both) says what a dialog is
  dialogs: { mark: [1, 2] },
  // the "cannot receive a code" chip stands in the row under the page's title
  'give-my-gear': { mark: 2, fromPage: true },
  // the largest outline is a row of the members' table, wider than any window: the title and the seats meter open the page
  access: { fromPage: true },
  // the largest outline is the New contract button beside the table's last columns: the days left are the guide's subject
  'warranty-contracts': { mark: 3 },
};

/** One box around several. */
function around(boxes) {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

/**
 * The part of a screen a card shows, in the app's own pixels: a window of the card's shape cut close around the MAIN thing
 * the guide's first step points at (its largest outline, or the one CARD_FOCUS names; a window around every outline came
 * out as wide as the screen), never narrower than LEAST, always inside the picture. A thing larger than the window is
 * shown from where its reading starts (a table's first columns, not its middle).
 * @param {{ id?: string, lang?: string, frame?: { w: number, h: number }, marks?: Array<{ n?: number, x: number, y: number, w: number, h: number }> }} shot
 * @param {{ mark?: number | number[], fromPage?: boolean }} [focus]
 */
export function cardWindow(shot, focus = {}) {
  const { w: frameW, h: frameH } = shot.frame ?? { w: 1440, h: 900 };
  const rtl = shot.lang === 'he';
  const widest = Math.min(frameW, Math.round(frameH * CARD_RATIO));
  const inside = (v, max) => Math.min(Math.max(0, Math.round(v)), max);
  const marks = shot.marks ?? [];
  const named = [focus.mark ?? []].flat().map((n) => {
    const mark = marks.find((m, i) => (m.n ?? i + 1) === n);
    if (!mark) throw new Error(`guide cards: the picture "${shot.id}" has no outline ${n} to cut its card around`);
    return mark;
  });
  const main = named.length ? around(named) : [...marks].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (!main) {
    const w = Math.min(widest, UNMARKED);
    return { x: rtl ? frameW - w : 0, y: 0, w, h: Math.round(w / CARD_RATIO) };
  }
  const w = Math.min(widest, Math.max(LEAST, main.w + AIR.x, Math.round((main.h + AIR.y) * CARD_RATIO)));
  const h = Math.round(w / CARD_RATIO);
  const from = (start) => (rtl ? frameW - start - w : start);
  const x = focus.fromPage ? from(PAGE_EDGE)
    : main.w + AIR.x > w ? from(rtl ? frameW - main.x - main.w - AIR.x / 2 : main.x - AIR.x / 2)
      : main.x + main.w / 2 - w / 2;
  const y = main.h + AIR.y > h ? main.y - AIR.y / 2 : main.y + main.h / 2 - h / 2;
  return { x: inside(x, frameW - w), y: inside(y, frameH - h), w, h };
}

const sameWindow = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** Text for an HTML attribute or element written by hand in a tag's attribute (already escaped by its author). */
const ownWords = (attrs, where, slug) => {
  const words = Object.fromEntries([...attrs.matchAll(/\s+([a-z]+)(?:="([^"<>]*)")?/g)].map((m) => [m[1], m[2] ?? true]));
  const unknown = Object.keys(words).filter((k) => k !== 'lead' && !OWN_WORDS.includes(k));
  if (unknown.length) throw new Error(`guide cards: ${where} — the card of "${slug}" carries ${unknown.join(', ')}, which the build does not know`);
  return words;
};

/**
 * Expand every <gl-guide> in a body.
 * @param {string} body
 * @param {string} lang 'en' | 'he'
 * @param {{
 *   pageOf: (slug: string) => string | null,
 *   shots: { shots: Array<{ id: string, lang: string, file: string, frame?: object, marks?: object[] }> },
 *   cards: Record<string, { shot: string, source: { file: string, md5: string }, window: object, files: Array<{ file: string, width: number, height: number }> }>,
 *   stampOf: (file: string) => string,
 * }} from the guide's body in this language (null = no page yet) · the app pictures' index · the cards' index · a picture's md5
 * @param {string} where the page, for error messages
 * @returns {{ html: string, waiting: string[] }} the body, and the guides that still wait for their page
 */
export function expandGuideCards(body, lang, { pageOf, shots, cards, stampOf }, where) {
  const W = CARD_WORDS[lang];
  const waiting = [];
  const html = body.replace(GUIDE, (_, slug, attrs) => {
    const own = ownWords(attrs, where, slug);
    const page = pageOf(slug);
    const carried = OWN_WORDS.filter((k) => k in own);
    if (page && carried.length) throw new Error(`guide cards: ${where} — "${slug}" has its page now; its card reads the page, so drop ${carried.join(', ')} from the tag`);
    if (!page && carried.length !== OWN_WORDS.length) throw new Error(`guide cards: ${where} names the guide "${slug}", which has no ${lang} page (a guide that waits for its page carries ${OWN_WORDS.join(', ')})`);
    const facts = page ? guideFacts(page, `${lang}:guides/${slug}`) : { ...own, steps: Number(own.steps) };
    if (!page) waiting.push(slug);

    const shot = shots.shots.find((s) => s.id === facts.shot && s.lang === lang);
    if (!shot) throw new Error(`guide cards: ${where} — the first screen of "${slug}" ("${facts.shot}") has no ${lang} picture (run npm run capture)`);
    const card = cards[cardKey(slug, lang)];
    const stale = !card ? 'has no picture'
      : card.shot !== facts.shot ? `was cut from "${card.shot}", but the guide now opens with "${facts.shot}"`
        : card.source.md5 !== stampOf(shot.file) ? `was cut from an older picture of "${facts.shot}"`
          : !sameWindow(card.window, cardWindow(shot, CARD_FOCUS[slug])) ? `was cut around other outlines than "${facts.shot}" has now`
            : null;
    if (stale) throw new Error(`guide cards: ${where} — the ${lang} card of "${slug}" ${stale} (run npm run cards)`);

    const [small, large] = [...card.files].sort((a, b) => a.width - b.width);
    const lazy = own.lead ? '' : ' loading="lazy"';
    const img = `<img class="guide-card-shot" src="/img/app/cards/${small.file}" srcset="/img/app/cards/${small.file} ${small.width}w, /img/app/cards/${large.file} ${large.width}w" sizes="(min-width: 1304px) 400px, 31vw" width="${small.width}" height="${small.height}" alt=""${lazy} decoding="async">`;
    const words =
      `\n            <div class="guide-card-in">` +
      `\n              <p class="cap-ref">${facts.n}</p>` +
      `\n              <h3 class="guide-card-name">${facts.title}</h3>` +
      `\n              <p class="guide-card-lede">${facts.lede}</p>` +
      `\n              <p class="guide-card-steps">${page ? W.steps(facts.steps) : W.waiting}</p>` +
      `\n            </div>\n          `;
    // the "Start here" row shows a guide a second time: the card in its own group is the one other pages link to
    const id = own.lead ? '' : ` id="guide-${facts.n.replace('.', '-')}"`;
    return page
      ? `<a class="guide-card"${id} href="/guides/${slug}">${img}${words}</a>`
      : `<div class="guide-card"${id}>${img}${words}</div>`;
  });
  // a group's head says how many guides it holds: the number is counted, never trusted
  for (const [group] of html.matchAll(/<section class="guide-group"[\s\S]*?<\/section>/g)) {
    const said = group.match(/<p class="guide-group-count">(\d+)/)?.[1];
    const held = (group.match(/ class="guide-card"/g) ?? []).length;
    if (said && Number(said) !== held) throw new Error(`guide cards: ${where} — a group says it holds ${said} guides and holds ${held}`);
  }
  if (/<gl-guide\b/.test(html)) throw new Error(`guide cards: ${where} has a <gl-guide> the build cannot read (slug="…" first, empty element)`);
  return { html, waiting };
}

/** A finished page without its guide cards' pictures (the build made them, so they are no stray app pictures). */
export const withoutCardPictures = (html) => html.replace(/<img class="guide-card-shot"[^>]*>/g, '');
