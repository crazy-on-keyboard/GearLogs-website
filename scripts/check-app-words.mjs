#!/usr/bin/env node
// The site's Hebrew follows the app's word law (WEB-S3b, 2026-10-01 — the Director's picks of S7: one word for one thing, nouns on
// buttons, plural prompts): every current page (the guides, the FAQ, the product and home pages, the pricing page) is read with the
// SAME retired-word list the app's own guard holds (`GearLogs/services/i18n/heWords.guard.test.ts`), so a word the app has retired
// cannot stand on a page that describes the app. The changelog and the Field Notes are history and a voice of their own: not read.
// A hit prints file:line and the law; the check fails on any hit. Needs the app repo beside this one (APP_REPO to override).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_REPO = process.env.APP_REPO ?? join(process.cwd(), '..', 'GearLogs');
const guard = readFileSync(join(APP_REPO, 'services', 'i18n', 'heWords.guard.test.ts'), 'utf8');
const block = guard.slice(guard.indexOf('const RETIRED'), guard.indexOf('];', guard.indexOf('const RETIRED')));
// each line `  [/…/, '…'],` → the regex source and its law (the file is the ONE definition; nothing is re-typed here)
const RETIRED = [...block.matchAll(/^\s*\[\/((?:\\.|[^/\\])+)\/([a-z]*),\s*'((?:\\.|[^'])*)'\]/gm)].map((m) => [new RegExp(m[1], m[2].replace('g', '')), m[3]]);
if (RETIRED.length < 10) { console.error(`check-app-words: read only ${RETIRED.length} retired words from the app's guard — the parser needs a look`); process.exit(2); }

/** The places the site quotes the app for its words (a word the app retired may not stand here). */
const ALLOWED_SENSES = [
  /קבלה של האצווה/,            // the day a lot was received (the app's own allowed sense)
  /השאלה(?![֐-׿])/, // "the question"
  /מספר הקבלה או החשבונית/,   // a payment receipt (the refunds page)
];
const PAGES = [];
const bodies = join(process.cwd(), 'src', 'bodies');
for (const f of readdirSync(bodies)) if (/\.he\.html$/.test(f) && !/^(changelog|notes)\./.test(f) && !/^notes[/\\]/.test(f)) PAGES.push(join(bodies, f));
for (const f of readdirSync(join(bodies, 'guides'))) if (/\.he\.html$/.test(f)) PAGES.push(join(bodies, 'guides', f));

// The voice of a QUOTED app word (inside <em>, <q>, a picture's caption or alt): the app's own guard says a label is a noun and a
// sentence commands in the plural — a quote that still says שמור or שלך quotes an app that no longer exists
const youSrc = guard.match(/const SINGULAR_YOU = \/(.*)\/;/)[1];
const SINGULAR_YOU = new RegExp(youSrc);
const commands = guard.match(/const SINGULAR_COMMANDS = '([^']+)'/)[1].split(' ');
const HEB = '\\u0590-\\u05FF';
const SINGULAR_HEAD = new RegExp('^(?:--\\s*)?(?:' + commands.join('|') + ')(?![' + HEB + '])');
const SINGULAR_INSIDE = new RegExp('(?:[.:!?;—–-]\\s+|\\sאנא\\s+|\\s[ו])(?:' + commands.join('|') + ')(?![' + HEB + '])');
const QUOTED = /<em>([^<]*)<\/em>|<q>([^<]*)<\/q>|caption="([^"]*)"|alt="([^"]*)"/g;
const rel = (file) => file.slice(process.cwd().length + 1).replace(/\\/g, '/');
const hits = [];
for (const file of PAGES) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(QUOTED)) {
      const quote = (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/&[a-z]+;/g, ' ');
      if (!/[֐-׿]/.test(quote)) continue;
      if (SINGULAR_YOU.test(quote)) hits.push(`${rel(file)}:${i + 1} — a quoted app word says the singular you (${quote.slice(0, 60)})`);
      if (SINGULAR_HEAD.test(quote.trim()) || SINGULAR_INSIDE.test(quote)) hits.push(`${rel(file)}:${i + 1} — a quoted app word commands one man; the app's label is a noun or a plural (${quote.slice(0, 60)})`);
    }
    for (const [word, law] of RETIRED) {
      if (!word.test(line)) continue;
      if (ALLOWED_SENSES.some((ok) => ok.test(line)) && String(word).includes('קבלה')) continue;
      hits.push(`${file.replace(process.cwd() + '\\', '').replace(/\\/g, '/')}:${i + 1} — ${law}`);
    }
  });
}
if (hits.length) {
  console.error(`check-app-words: ${hits.length} place(s) still say a word the app retired:`);
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log(`check-app-words: OK — ${PAGES.length} Hebrew pages read against the app's ${RETIRED.length} retired words, none found`);
