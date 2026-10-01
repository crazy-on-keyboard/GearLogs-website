#!/usr/bin/env node
// The site's Hebrew follows the app's word law (WEB-S3b, 2026-10-02 — the Director's picks of S7: one word for one thing, nouns on
// buttons, plural prompts): every current page (the guides, the FAQ, the product and home pages, the pricing page) is read with the
// SAME retired-word list and voice lists the app's own guard holds (`GearLogs/services/i18n/heWords.guard.test.ts`), so a word the
// app has retired cannot stand on a page that describes the app. The changelog and the Field Notes are history and a voice of their
// own: not read for words — but an English page is refused a Hebrew quote mark (״) anywhere.
//
// The lists travel as a SNAPSHOT (`scripts/lib/app-words.json`, written by `--sync` from the app repo beside this one) so the check runs
// where the app repo is absent (CI checks out this repo alone). When the app repo IS present, the snapshot is compared with the guard
// and a stale snapshot fails the check — run `node scripts/check-app-words.mjs --sync` after the app's guard changes.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_REPO = process.env.APP_REPO ?? join(process.cwd(), '..', 'GearLogs');
const GUARD = join(APP_REPO, 'services', 'i18n', 'heWords.guard.test.ts');
const SNAPSHOT = join(process.cwd(), 'scripts', 'lib', 'app-words.json');
const SYNC = process.argv.includes('--sync');

/** The lists as the app's guard spells them: regex sources + laws, the command words, the singular-you source. */
function listsFromGuard(text) {
  const block = text.slice(text.indexOf('const RETIRED'), text.indexOf('];', text.indexOf('const RETIRED')));
  const retired = [...block.matchAll(/^\s*\[\/((?:\\.|[^/\\])+)\/([a-z]*),\s*'((?:\\.|[^'])*)'\]/gm)].map((m) => ({ source: m[1], flags: m[2].replace('g', ''), law: m[3] }));
  const commands = text.match(/const SINGULAR_COMMANDS = '([^']+)'/)[1].split(' ');
  const you = text.match(/const SINGULAR_YOU = \/(.*)\/;/)[1];
  if (retired.length < 10 || commands.length < 20 || !you) throw new Error('check-app-words: could not read the app guard\'s lists — the parser needs a look');
  return { retired, commands, you };
}

let lists;
if (existsSync(GUARD)) {
  const fromGuard = listsFromGuard(readFileSync(GUARD, 'utf8'));
  const serialized = JSON.stringify(fromGuard, null, 2) + '\n';
  if (SYNC) { writeFileSync(SNAPSHOT, serialized); console.log(`check-app-words: snapshot written from the app guard — ${fromGuard.retired.length} retired words, ${fromGuard.commands.length} command words`); process.exit(0); }
  if (!existsSync(SNAPSHOT) || readFileSync(SNAPSHOT, 'utf8') !== serialized) {
    console.error('check-app-words: scripts/lib/app-words.json is not the app guard\'s current lists — run `node scripts/check-app-words.mjs --sync` and commit the snapshot');
    process.exit(1);
  }
  lists = fromGuard;
} else {
  if (SYNC) { console.error(`check-app-words: --sync needs the app repo at ${APP_REPO} (APP_REPO to override)`); process.exit(2); }
  if (!existsSync(SNAPSHOT)) { console.error('check-app-words: neither the app repo nor scripts/lib/app-words.json is here — nothing to check against'); process.exit(2); }
  lists = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
}
const RETIRED = lists.retired.map((r) => [new RegExp(r.source, r.flags), r.law]);
const HEB = '\\u0590-\\u05FF';
const SINGULAR_YOU = new RegExp(lists.you);
const SINGULAR_HEAD = new RegExp('^(?:--\\s*)?(?:' + lists.commands.join('|') + ')(?![' + HEB + '])');
const SINGULAR_INSIDE = new RegExp('(?:[.:!?;—–-]\\s+|\\sאנא\\s+|\\s[ו])(?:' + lists.commands.join('|') + ')(?![' + HEB + '])');

/** A quote of the app on the page: <em>, <q>, a picture's caption or alt, Hebrew quotation marks ״…״, or &ldquo;…&rdquo;. */
const QUOTED = /<em>([^<]*)<\/em>|<q>([^<]*)<\/q>|caption="([^"]*)"|alt="([^"]*)"|״([^״<]{1,200})״|&ldquo;([^<]{1,200}?)&rdquo;/g;
/** The places where קבלה keeps its other senses. */
const ALLOWED_SENSES = [
  /קבלה של האצווה/,            // the day a lot was received (the app's own allowed sense)
  /השאלה(?![֐-׿])/, // "the question"
  /מספר הקבלה או החשבונית/,   // a payment receipt (the refunds page)
];
const bodies = join(process.cwd(), 'src', 'bodies');
const HE_PAGES = [], EN_PAGES = [];
for (const f of readdirSync(bodies)) {
  if (/\.he\.html$/.test(f) && !/^(changelog|notes)\./.test(f)) HE_PAGES.push(join(bodies, f));
  if (/\.en\.html$/.test(f)) EN_PAGES.push(join(bodies, f));
}
for (const f of readdirSync(join(bodies, 'guides'))) {
  if (/\.he\.html$/.test(f)) HE_PAGES.push(join(bodies, 'guides', f));
  if (/\.en\.html$/.test(f)) EN_PAGES.push(join(bodies, 'guides', f));
}
const rel = (file) => file.slice(process.cwd().length + 1).replace(/\\/g, '/');
// A FEMININE button name (the app's nouns: שמירה · הפעלה · הגדרת … · החזרה …) followed by a masculine verb reads wrong; the guides
// introduce the control — "הכפתור <em>…</em> פותח" — so the verb agrees. A label that ends in ה or ת (the noun forms) is treated as
// feminine; an <em> preceded by הכפתור / כפתור / על / את is already a named control or an object.
const FEMININE_LABEL = /(?<!הכפתור |כפתור |הקישור |הכרטיס |הכרטיסייה |החלון |החלונית |בחלונית |המסנן |המתג |המקור |התג |הווידג׳ט |העמודה |הטופס |השורה |הרשימה |הפס |על |את |ב|ל)<em>([֐-׿][^<]{1,40}?[הת](?: \([^)]*\))?)<\/em>\s+(פותח|נשאר|שואל|מוסיף|מציג|קובע|יוצר|מסיר|מנפק|מעביר|שומר|מחזיר|מסמן|לוקח|מוותר|מזיז|נותן|מפעיל|מאפס|מנקה|מביא|מסדר|סוגר|עובד|מתחיל|מוציא|מכניס|מבקש|שולח|מוחק|נפתח|מופיע|מעומעם|אפור|פעיל|מעדכן|רושם|גורע|מחליף|מסתיר|מפרט|ששואל)(?![֐-׿])/;
const hits = [];
for (const file of HE_PAGES) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const fem = line.match(FEMININE_LABEL);
    if (fem) hits.push(`${rel(file)}:${i + 1} — a feminine button name followed by a masculine verb (${fem[1]} ${fem[2]}): introduce it as "הכפתור <em>…</em>" so the verb agrees`);
    for (const m of line.matchAll(QUOTED)) {
      const quote = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6]).replace(/&[a-z]+;/g, ' ');
      if (!/[֐-׿]/.test(quote)) continue;
      if (SINGULAR_YOU.test(quote)) hits.push(`${rel(file)}:${i + 1} — a quoted app word says the singular you (${quote.slice(0, 60)})`);
      if (SINGULAR_HEAD.test(quote.trim()) || SINGULAR_INSIDE.test(quote)) hits.push(`${rel(file)}:${i + 1} — a quoted app word commands one man; the app's label is a noun or a plural (${quote.slice(0, 60)})`);
    }
    for (const [word, law] of RETIRED) {
      if (!word.test(line)) continue;
      if (ALLOWED_SENSES.some((ok) => ok.test(line)) && String(word).includes('קבלה')) continue;
      hits.push(`${rel(file)}:${i + 1} — ${law}`);
    }
  });
}
for (const file of EN_PAGES) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => { if (line.includes('״')) hits.push(`${rel(file)}:${i + 1} — a Hebrew quotation mark (״) on an English page; English quotes are &ldquo;…&rdquo;`); });
}
if (hits.length) {
  console.error(`check-app-words: ${hits.length} place(s) still say a word the app retired, or quote it the wrong way:`);
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log(`check-app-words: OK — ${HE_PAGES.length} Hebrew pages read against the app's ${RETIRED.length} retired words and its voice, ${EN_PAGES.length} English pages free of ״${existsSync(GUARD) ? ' (the snapshot matches the app guard)' : ' (from the snapshot)'}`);
