#!/usr/bin/env node
// IndexNow (SEO-1 · D2 · A, 2026-10-02): after a release, tell Bing, Yandex and the other IndexNow engines WHICH pages changed
// (Google does not take part; Cloudflare's Crawler Hints never fires for this site, whose pages it does not cache). "Changed" is
// read from the dates snapshot: a page whose day in scripts/lib/page-dates.json moved between the previous main and this one
// changed — never the whole site on every deploy. The key is public by design (the engines fetch /<key>.txt to prove the host).
//
//   node scripts/indexnow.mjs --before <sha>          the pages whose date moved since <sha>, pinged once the deploy is live
//   node scripts/indexnow.mjs --before <sha> --dry    list them, ping nothing
//   node scripts/indexnow.mjs --urls /faq,/he/faq     ping these paths (a manual nudge)
//
// A failed ping never fails anything: the engines will read the sitemap's dates anyway. Exit 0 always, the log says what happened.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/pages.mjs';
import { SITE_ORIGIN } from '../src/i18n.mjs';

const KEY = '69ab4b3ec6060fc1700fff51b4c42280';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const HOST = new URL(SITE_ORIGIN).host;
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes('--dry');
const WAIT_MS = Number(process.env.INDEXNOW_WAIT_MS ?? 15 * 60 * 1000);

const urlOf = (page, lang) => (page.path === '/' ? (lang === 'he' ? `${SITE_ORIGIN}/he/` : `${SITE_ORIGIN}/`) : `${SITE_ORIGIN}${lang === 'he' ? '/he' : ''}${page.path}`);

/** The pages whose date moved between the snapshot at <sha> and the one here. */
function changedSince(sha) {
  const now = JSON.parse(readFileSync(join(process.cwd(), 'scripts', 'lib', 'page-dates.json'), 'utf8'));
  let before = {};
  try { before = JSON.parse(execFileSync('git', ['show', `${sha}:scripts/lib/page-dates.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { console.log(`indexnow: no dates snapshot at ${sha} — every dated page counts as changed`); }
  const changed = [];
  for (const page of PAGES.filter((p) => p.sitemap)) {
    for (const lang of page.bilingual ? ['en', 'he'] : ['en']) {
      const day = now[page.slug]?.[lang];
      if (day && before[page.slug]?.[lang] !== day) changed.push({ url: urlOf(page, lang), day });
    }
  }
  return changed;
}

/** Wait until the live sitemap shows the new day for the first changed page (the deploy is live), up to WAIT_MS. */
async function liveCarries(changed) {
  const probe = changed[0];
  const started = Date.now();
  while (Date.now() - started < WAIT_MS) {
    try {
      const xml = await (await fetch(`${SITE_ORIGIN}/sitemap.xml?cb=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } })).text();
      const entry = xml.split('<url>').find((u) => u.includes(`<loc>${probe.url}</loc>`));
      if (entry && entry.includes(`<lastmod>${probe.day}</lastmod>`)) return true;
    } catch (e) { console.log(`indexnow: the live sitemap could not be read (${e.message}) — trying again`); }
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return false;
}

async function ping(urls) {
  const body = { host: HOST, key: KEY, keyLocation: `${SITE_ORIGIN}/${KEY}.txt`, urlList: urls };
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  return res.status;
}

let urls;
const manual = flag('--urls');
if (manual) urls = manual.split(',').map((p) => (p.startsWith('http') ? p : `${SITE_ORIGIN}${p}`));
else {
  const sha = flag('--before');
  if (!sha) { console.log('indexnow: nothing to do — pass --before <sha> or --urls'); process.exit(0); }
  const changed = changedSince(sha);
  if (!changed.length) { console.log('indexnow: no page changed since the previous release — nothing to ping'); process.exit(0); }
  console.log(`indexnow: ${changed.length} changed page(s):\n  ${changed.map((c) => `${c.url} (${c.day})`).join('\n  ')}`);
  if (DRY) process.exit(0);
  if (!(await liveCarries(changed))) { console.log('indexnow: the live sitemap did not show the new date in time — not pinged (the engines read the sitemap anyway)'); process.exit(0); }
  urls = changed.map((c) => c.url);
}
if (DRY) { console.log(`indexnow: would ping ${urls.length} url(s)`); process.exit(0); }
try {
  const status = await ping(urls.slice(0, 10_000));
  console.log(`indexnow: ${status} for ${urls.length} url(s)${status === 200 || status === 202 ? ' — accepted' : ' — NOT accepted (the engines still read the sitemap)'}`);
} catch (e) {
  console.log(`indexnow: the ping failed (${e.message}) — the engines still read the sitemap`);
}
