// The guides index (WEB-2 · INDEX — the Director's pick "C · Start here, then rows with a small picture", after he had first
// asked for a card per guide and seen it built; **Start row · A · Keep the row**). The index writes
//   <gl-guide slug="set-up-board" lead></gl-guide>     a CARD on the "Start here" row: the screen, the number, the title,
//                                                      the short text, the steps
//   <gl-guide slug="set-up-board"></gl-guide>          a ROW in its subject: a small picture, the number, the title, the steps
// and the build expands both here. Every word is read from the guide's OWN page, so the index can never say something else
// than the page does. A guide whose page is not written yet carries its own words
//   <gl-guide slug="open-my-gear" n="4.24" shot="door-my-gear" steps="5" title="…" lede="…"></gl-guide>
// and stands without a link; the build refuses those words the moment the page exists.
// The pictures are cut by `npm run cards` (scripts/images/cards.mjs) into public/img/app/cards/ with an index of what each
// was cut from; the build refuses a picture that is missing or was cut from an older screen. Pure module: no file access.

const GUIDE = /<gl-guide\s+slug="([a-z0-9-]+)"((?:\s+[a-z]+(?:="[^"<>]*")?)*)\s*><\/gl-guide>/g;
const OWN_WORDS = ['n', 'shot', 'steps', 'title', 'lede'];

/**
 * The two forms a guide takes on the index, each with its picture's shape, the two widths served (the second for 2x screens),
 * the least of the screen's width its picture shows (measured on the boards he picked from: closer, a lone button fills the
 * picture) and the `sizes` the browser chooses by. Three cards stand to a row inside the 1240 px wrap.
 */
export const FORMS = {
  card: { ratio: 16 / 10, widths: [400, 800], least: 480, sizes: '(min-width: 1304px) 400px, 31vw' },
  row: { ratio: 4 / 3, widths: [132, 264], least: 264, sizes: '132px' },
};
/** The form a tag asks for. */
export const formOf = (attrs) => (/\slead(?=[\s>]|$)/.test(attrs) ? 'card' : 'row');
/** The air kept around the thing the window is cut around, in the app's pixels (sideways · up and down). */
const AIR = { x: 96, y: 72 };
/** Where the app's pages start beside the side menu, from the screen's reading-side edge (the menu's rail and the page's margin). */
const PAGE_EDGE = 87;

export const CARD_WORDS = {
  en: { steps: (n) => `${n} steps`, waiting: 'Page in the works' },
  he: { steps: (n) => `${n} שלבים`, waiting: 'הדף בהכנה' },
};

/** The name a guide's picture is filed under, per form. */
export const cardKey = (slug, lang, form) => `${slug}.${lang}.${form}`;

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

/**
 * The guides whose largest outline is not their best picture (looked at one by one, in both languages and both forms): the
 * outline to cut around instead, by its number in the step (`mark`; several numbers = one box around them), and a window
 * that starts at the page's own edge, where its title starts (`fromPage`) — a window centred on a thing in the middle of a
 * row cut the page's title mid-word.
 */
export const CARD_FOCUS = {
  // the largest outline is the footer's buttons: the picture showed an empty corner — the dialog's head (its title and its
  // close button, one box around both) says what a dialog is
  dialogs: { mark: [1, 2] },
  // the "cannot receive a code" chip stands in the row under the page's title
  'give-my-gear': { mark: 2, fromPage: true },
  // the largest outline is a row of the members' table, wider than any window: the title and the seats meter open the page
  access: { fromPage: true },
  // the largest outline is a tab in the middle of the row under the page's title (a row's close cut lost the title's start)
  support: { fromPage: true },
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
 * The part of a screen a picture shows, in the app's own pixels: a window of the form's shape cut close around the MAIN
 * thing the guide's first step points at (its largest outline, or the one CARD_FOCUS names; a window around every outline
 * came out as wide as the screen), never narrower than the form's least, always inside the picture. A thing larger than
 * the window is shown from where its reading starts (a table's first columns, not its middle); a screen without outlines
 * shows its top from the reading side.
 * @param {{ id?: string, lang?: string, frame?: { w: number, h: number }, marks?: Array<{ n?: number, x: number, y: number, w: number, h: number }> }} shot
 * @param {'card' | 'row'} form
 * @param {{ mark?: number | number[], fromPage?: boolean }} [focus]
 */
export function cardWindow(shot, form, focus = {}) {
  const { ratio, least } = FORMS[form];
  const { w: frameW, h: frameH } = shot.frame ?? { w: 1440, h: 900 };
  const rtl = shot.lang === 'he';
  const widest = Math.min(frameW, Math.round(frameH * ratio));
  const inside = (v, max) => Math.min(Math.max(0, Math.round(v)), max);
  const marks = shot.marks ?? [];
  const named = [focus.mark ?? []].flat().map((n) => {
    const mark = marks.find((m, i) => (m.n ?? i + 1) === n);
    if (!mark) throw new Error(`guide cards: the picture "${shot.id}" has no outline ${n} to cut around`);
    return mark;
  });
  const main = named.length ? around(named) : [...marks].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (!main) {
    const w = Math.min(widest, Math.round(least * 1.5));
    return { x: rtl ? frameW - w : 0, y: 0, w, h: Math.round(w / ratio) };
  }
  const w = Math.min(widest, Math.max(least, main.w + AIR.x, Math.round((main.h + AIR.y) * ratio)));
  const h = Math.round(w / ratio);
  const from = (start) => (rtl ? frameW - start - w : start);
  const x = focus.fromPage ? from(PAGE_EDGE)
    : main.w + AIR.x > w ? from(rtl ? frameW - main.x - main.w - AIR.x / 2 : main.x - AIR.x / 2)
      : main.x + main.w / 2 - w / 2;
  const y = main.h + AIR.y > h ? main.y - AIR.y / 2 : main.y + main.h / 2 - h / 2;
  return { x: inside(x, frameW - w), y: inside(y, frameH - h), w, h };
}

const sameWindow = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** The words a tag carries (already escaped by their author), refused when the build does not know one. */
const ownWords = (attrs, where, slug) => {
  const words = Object.fromEntries([...attrs.matchAll(/\s+([a-z]+)(?:="([^"<>]*)")?/g)].map((m) => [m[1], m[2] ?? true]));
  const unknown = Object.keys(words).filter((k) => k !== 'lead' && !OWN_WORDS.includes(k));
  if (unknown.length) throw new Error(`guide cards: ${where} — the tag of "${slug}" carries ${unknown.join(', ')}, which the build does not know`);
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
 * }} from the guide's body in this language (null = no page yet) · the app pictures' index · the cut pictures' index · a picture's md5
 * @param {string} where the page, for error messages
 * @returns {{ html: string, waiting: string[] }} the body, and the guides that still wait for their page
 */
export function expandGuideCards(body, lang, { pageOf, shots, cards, stampOf }, where) {
  const W = CARD_WORDS[lang];
  const waiting = new Set();
  const html = body.replace(GUIDE, (_, slug, attrs) => {
    const own = ownWords(attrs, where, slug);
    const form = formOf(attrs);
    const page = pageOf(slug);
    const carried = OWN_WORDS.filter((k) => k in own);
    if (page && carried.length) throw new Error(`guide cards: ${where} — "${slug}" has its page now; the index reads the page, so drop ${carried.join(', ')} from the tag`);
    if (!page && carried.length !== OWN_WORDS.length) throw new Error(`guide cards: ${where} names the guide "${slug}", which has no ${lang} page (a guide that waits for its page carries ${OWN_WORDS.join(', ')})`);
    const facts = page ? guideFacts(page, `${lang}:guides/${slug}`) : { ...own, steps: Number(own.steps) };
    if (!page) waiting.add(slug);

    const shot = shots.shots.find((s) => s.id === facts.shot && s.lang === lang);
    if (!shot) throw new Error(`guide cards: ${where} — the first screen of "${slug}" ("${facts.shot}") has no ${lang} picture (run npm run capture)`);
    const cut = cards[cardKey(slug, lang, form)];
    const stale = !cut ? 'has no picture'
      : cut.shot !== facts.shot ? `was cut from "${cut.shot}", but the guide now opens with "${facts.shot}"`
        : cut.source.md5 !== stampOf(shot.file) ? `was cut from an older picture of "${facts.shot}"`
          : !sameWindow(cut.window, cardWindow(shot, form, CARD_FOCUS[slug])) ? `was cut around other outlines than "${facts.shot}" has now`
            : null;
    if (stale) throw new Error(`guide cards: ${where} — the ${lang} ${form} of "${slug}" ${stale} (run npm run cards)`);

    const [small, large] = [...cut.files].sort((a, b) => a.width - b.width);
    // the "Start here" cards open the page, so they load at once; every row loads as the reader reaches it
    const lazy = form === 'card' ? '' : ' loading="lazy"';
    const img = `<img class="guide-${form}-shot" src="/img/app/cards/${small.file}" srcset="/img/app/cards/${small.file} ${small.width}w, /img/app/cards/${large.file} ${large.width}w" sizes="${FORMS[form].sizes}" width="${small.width}" height="${small.height}" alt=""${lazy} decoding="async">`;
    const steps = page ? W.steps(facts.steps) : W.waiting;
    const inner = form === 'card'
      ? `${img}` +
        `\n            <div class="guide-card-in">` +
        `\n              <p class="cap-ref">${facts.n}</p>` +
        `\n              <h3 class="guide-card-name">${facts.title}</h3>` +
        `\n              <p class="guide-card-lede">${facts.lede}</p>` +
        `\n              <p class="guide-card-steps">${steps}</p>` +
        `\n            </div>\n          `
      : `${img}` +
        `<span class="cap-ref">${facts.n}</span>` +
        `<h3 class="guide-row-name">${facts.title}</h3>` +
        `<span class="guide-row-steps">${steps}</span>` +
        // the arrow says "this opens": a guide that waits for its page has none
        `<span class="guide-row-go" aria-hidden="true">${page ? '&rarr;' : ''}</span>`;
    // a guide of the "Start here" row stands a second time in its subject: THAT row is the one other pages link to
    const id = form === 'card' ? '' : ` id="guide-${facts.n.replace('.', '-')}"`;
    return page
      ? `<a class="guide-${form}"${id} href="/guides/${slug}">${inner}</a>`
      : `<div class="guide-${form}"${id}>${inner}</div>`;
  });
  // a subject's head says how many guides it holds: the number is counted, never trusted
  for (const [group] of html.matchAll(/<section class="guide-group"[\s\S]*?<\/section>/g)) {
    const said = group.match(/<p class="guide-group-count">(\d+)/)?.[1];
    const held = (group.match(/ class="guide-(?:card|row)"/g) ?? []).length;
    if (said && Number(said) !== held) throw new Error(`guide cards: ${where} — a group says it holds ${said} guides and holds ${held}`);
  }
  if (/<gl-guide\b/.test(html)) throw new Error(`guide cards: ${where} has a <gl-guide> the build cannot read (slug="…" first, empty element)`);
  return { html, waiting: [...waiting] };
}

/** A finished page without its guides' cut pictures (the build made them, so they are no stray app pictures). */
export const withoutCardPictures = (html) => html.replace(/<img class="guide-(?:card|row)-shot"[^>]*>/g, '');
