#!/usr/bin/env node
// The day each page last changed (SEO-1 · D7 · A, 2026-10-02): the sitemap's <lastmod> is a REAL date per page and language —
// the newest commit that touched the page's own files (its body, its JSON-LD, the app pictures its body names, its title and
// description in the metadata file) — never the
// build's clock (a date that moves on every deploy teaches Google to ignore the dates). The dates travel as a committed
// snapshot (`scripts/lib/page-dates.json`) so the build needs no git history where it runs (Cloudflare Pages builds main):
//
//   node scripts/page-dates.mjs --sync    rewrite the snapshot from git (run before every PR that changes a page)
//   node scripts/page-dates.mjs           check: every sitemap page has a date, and (where git history is here) no page's
//                                         snapshot date is OLDER than the newest commit of its files — a stale snapshot fails
//
// The check compares DAYS (the sitemap carries a day). On `main` after a squash-merge the commits carry a newer stamp than
// the branch the snapshot was written on, so the staleness half runs on pull requests and locally only (`SKIP_STALE=1`
// in the main-branch CI run); the shape half runs everywhere.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/pages.mjs';

const META = { en: JSON.parse(readFileSync(join(process.cwd(), 'src', 'meta', 'en.json'), 'utf8')), he: JSON.parse(readFileSync(join(process.cwd(), 'src', 'meta', 'he.json'), 'utf8')) };

const ROOT = process.cwd();
const SNAPSHOT = join(ROOT, 'scripts', 'lib', 'page-dates.json');
const SYNC = process.argv.includes('--sync');
const LANGS = ['en', 'he'];

const rel = (p) => p.replace(/\\/g, '/');
/** The files whose change means the page changed, per language. */
function sourcesOf(page, lang) {
  const files = [`src/bodies/${page.slug}.${lang}.html`];
  if (page.opts?.jsonld) files.push(`src/bodies/${page.slug}.jsonld.${lang}.json`);
  const body = join(ROOT, 'src', 'bodies', `${page.slug}.${lang}.html`);
  if (existsSync(body)) {
    for (const m of readFileSync(body, 'utf8').matchAll(/<gl-shot id="([a-z0-9-]+)"/g)) files.push(`public/img/app/${m[1]}.${lang}.webp`);
  }
  return files.filter((f) => existsSync(join(ROOT, f)));
}
const dayOf = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);
const gitLog = (args) => execFileSync('git', ['log', '-1', '--format=%cI', ...args], { cwd: ROOT, encoding: 'utf8' }).trim();
/** The newest commit day among the page's files AND the commit that last changed its title or description in the shared
 *  metadata file (git's pickaxe finds the commit where the current text appeared); UTC days; null without history. */
function newestDay(files, page, lang) {
  const days = files.length ? [dayOf(gitLog(['--', ...files]))] : [];
  const head = META[lang]?.[page.slug];
  for (const text of [head?.title, head?.description].filter(Boolean)) days.push(dayOf(gitLog(['-S', text, '--', `src/meta/${lang}.json`])));
  const known = days.filter(Boolean).sort();
  return known.length ? known[known.length - 1] : null;
}
const hasHistory = () => {
  try { return execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() !== '1'; } catch { return false; }
};

const listed = PAGES.filter((p) => p.sitemap);
if (SYNC) {
  if (!hasHistory()) { console.error('page-dates: --sync needs the git history (a shallow clone has none)'); process.exit(2); }
  const snapshot = {};
  for (const page of listed) {
    snapshot[page.slug] = {};
    for (const lang of page.bilingual ? LANGS : ['en']) {
      const day = newestDay(sourcesOf(page, lang), page, lang);
      if (!day) { console.error(`page-dates: ${lang}:${page.slug} has no committed source yet — commit it first`); process.exit(1); }
      snapshot[page.slug][lang] = day;
    }
  }
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`page-dates: snapshot written — ${listed.length} pages`);
  process.exit(0);
}

if (!existsSync(SNAPSHOT)) { console.error('page-dates: scripts/lib/page-dates.json is missing — run `node scripts/page-dates.mjs --sync`'); process.exit(1); }
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const problems = [];
for (const page of listed) {
  for (const lang of page.bilingual ? LANGS : ['en']) {
    const day = snapshot[page.slug]?.[lang];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { problems.push(`${lang}:${page.slug} has no date`); continue; }
    if (day > today) problems.push(`${lang}:${page.slug} is dated in the future (${day})`);
  }
}
for (const slug of Object.keys(snapshot)) if (!listed.some((p) => p.slug === slug)) problems.push(`${slug} is in the snapshot but not in the sitemap — run --sync`);
const checkStale = !process.env.SKIP_STALE && hasHistory();
if (checkStale) {
  for (const page of listed) {
    for (const lang of page.bilingual ? LANGS : ['en']) {
      const day = newestDay(sourcesOf(page, lang), page, lang);
      const kept = snapshot[page.slug]?.[lang];
      if (day && kept && kept < day) problems.push(`${lang}:${page.slug} changed on ${day} but the snapshot says ${kept} — run --sync`);
    }
  }
}
if (problems.length) {
  console.error(`page-dates: ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`page-dates: OK — ${listed.length} pages dated${checkStale ? ', none older than its files' : ' (staleness not checked here)'}`);
