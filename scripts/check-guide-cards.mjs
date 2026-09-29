#!/usr/bin/env node
// Proves the guides index's card rules (scripts/lib/guide-cards.mjs) on planted cases: what the build must refuse (a card
// cut from an older screen, a card asked for where only the row was cut, a guide without a page or words, words carried beside a page, a group that counts wrongly, a tag
// it cannot read) and what it must write (a link for a guide with its page, a plain card for one that waits, the window
// mirrored in Hebrew and always inside the picture). Zero dependencies.
import { cardKey, cardWindow, expandGuideCards, guideFacts } from './lib/guide-cards.mjs';

const PAGE = `<gl-band photo="help" variant="article">
  <p class="band-trail"><a href="/guides">Guides</a><span class="sep">/</span>4.1</p>
  <h1 class="band-title">Build your board</h1>
  <p class="band-lede">Give each department its own tab.</p>
</gl-band>
<ol class="gsteps"><li class="gstep" id="step-1"><gl-shot id="board-tabs" caption="x" marks></gl-shot></li><li class="gstep" id="step-2"></li></ol>`;
const SHOT = { id: 'board-tabs', lang: 'en', file: 'board-tabs.en.webp', frame: { w: 1440, h: 900 }, marks: [{ n: 1, x: 10, y: 64, w: 46, h: 40 }, { n: 2, x: 87, y: 129, w: 145, h: 36 }] };
const files = [{ file: 'a.en.400.webp', width: 400, height: 250 }, { file: 'a.en.800.webp', width: 800, height: 500 }];
const card = (over = {}, form = 'row') => ({ shot: 'board-tabs', source: { file: SHOT.file, md5: 'now' }, window: cardWindow(SHOT, form), files, ...over });
const from = (cards, pages = { 'set-up-board': PAGE }) => ({ pageOf: (slug) => pages[slug] ?? null, shots: { shots: [SHOT] }, cards, stampOf: () => 'now' });
const ROW = cardKey('set-up-board', 'en', 'row');
const expand = (body, cards = { [ROW]: card() }, pages) => expandGuideCards(body, 'en', from(cards, pages), 'en:guides');
const TAG = '<gl-guide slug="set-up-board"></gl-guide>';
const WAITING = '<gl-guide slug="open-my-gear" n="4.24" shot="board-tabs" steps="5" title="Open My Gear" lede="Sign in with a code."></gl-guide>';

const MUST_REFUSE = {
  'a card cut from an older picture': () => expand(TAG, { [ROW]: card({ source: { file: SHOT.file, md5: 'before' } }) }),
  'a card cut from another screen': () => expand(TAG, { [ROW]: card({ shot: 'board' }) }),
  'a card cut around other outlines': () => expand(TAG, { [ROW]: card({ window: { x: 1, y: 0, w: 480, h: 300 } }) }),
  'a guide without a card picture': () => expand(TAG, {}),
  'a guide without a page or words': () => expand('<gl-guide slug="nowhere"></gl-guide>'),
  'a waiting guide that lacks a word': () => expand(WAITING.replace(' steps="5"', ''), { [cardKey('open-my-gear', 'en', 'row')]: card() }),
  'a card asked for where only the row was cut': () => expand(TAG.replace('">', '" lead>')),
  'words carried beside a page': () => expand(TAG.replace('">', '" title="Another title">')),
  'a word the build does not know': () => expand(TAG.replace('">', '" colour="red">')),
  'a tag it cannot read': () => expand('<gl-guide id="set-up-board"></gl-guide>'),
  'a group that counts wrongly': () => expand(`<section class="guide-group"><p class="guide-group-count">2 guides</p>${TAG}</section>`),
  'a page without steps': () => guideFacts(PAGE.replace(/<li class="gstep"/g, '<li'), 'en:guides/x'),
  'a focus on an outline the picture lacks': () => cardWindow(SHOT, 'row', { mark: 7 }),
};

const problems = [];
for (const [what, run] of Object.entries(MUST_REFUSE)) {
  try { run(); problems.push(`NOT REFUSED  ${what}`); } catch { /* refused, as it must be */ }
}

const expect = (what, ok) => { if (!ok) problems.push(`WRONG        ${what}`); };
const written = expand(`<section class="guide-group"><p class="guide-group-count">2 guides</p>${TAG}${WAITING}</section><div>${TAG.replace('">', '" lead>')}</div>`,
  { [ROW]: card(), [cardKey('open-my-gear', 'en', 'row')]: card(), [cardKey('set-up-board', 'en', 'card')]: card({}, 'card') });
expect('a guide with its page is a row that links to it', written.html.includes('<a class="guide-row" id="guide-4-1" href="/guides/set-up-board">'));
expect('its words come from the page', written.html.includes('<h3 class="guide-row-name">Build your board</h3>') && written.html.includes('2 steps'));
expect('a waiting guide is a row without a link or an arrow', written.html.includes('<div class="guide-row" id="guide-4-24">') && written.html.includes('Page in the works') && written.html.includes('<span class="guide-row-go" aria-hidden="true"></span>'));
expect('the waiting guide is named', written.waiting.join() === 'open-my-gear');
expect('the lead card carries no id, the short text, and loads at once', written.html.includes('<a class="guide-card" href="/guides/set-up-board"><img class="guide-card-shot"') && written.html.includes('<p class="guide-card-lede">Give each department its own tab.</p>') && (written.html.match(/loading="lazy"/g) ?? []).length === 2);
expect('a row carries no short text', !written.html.includes('guide-row-lede'));

const en = cardWindow(SHOT, 'card');
const he = cardWindow({ ...SHOT, lang: 'he', marks: SHOT.marks.map((m) => ({ ...m, x: 1440 - m.x - m.w })) }, 'card');
const small = cardWindow(SHOT, 'row');
expect('the picture of a row is cut closer than the picture of a card, each in its own shape', small.w < en.w && Math.abs(small.w / small.h - 4 / 3) < 0.01 && Math.abs(en.w / en.h - 16 / 10) < 0.01);
expect('the window is mirrored in Hebrew', he.x === 1440 - en.x - en.w && he.y === en.y && he.w === en.w);
const edge = cardWindow({ ...SHOT, marks: [{ n: 1, x: 1400, y: 880, w: 30, h: 15 }] }, 'row');
expect('the window stays inside the picture', edge.x + edge.w <= 1440 && edge.y + edge.h <= 900 && edge.x >= 0 && edge.y >= 0);
const short = cardWindow({ ...SHOT, frame: { w: 1440, h: 304 }, marks: [{ n: 1, x: 267, y: 149, w: 968, h: 27 }] }, 'card');
expect('a short picture gives a window no taller than itself, from where the wide thing starts', short.h <= 304 && short.x === 267 - 48);
const bare = cardWindow({ id: 'x', lang: 'he' }, 'card');
expect('a screen without outlines shows its top from the reading side', bare.y === 0 && bare.x + bare.w === 1440);

if (problems.length) {
  console.error(`check-guide-cards: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-guide-cards: OK — ${Object.keys(MUST_REFUSE).length} faults refused, the card and its window written as the rules say`);
