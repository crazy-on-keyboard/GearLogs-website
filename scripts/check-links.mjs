#!/usr/bin/env node
// Internal link integrity for the built site (HYG-2, 2026-08-21). Zero dependencies.
//
// Walks every HTML file in dist/ plus sitemap.xml, collects each internal href/src/action,
// and checks that the target exists as a file — in the clean-URL form Cloudflare Pages serves
// (`/pricing` → pricing.html, `/notes/x` → notes/x.html or notes/x/index.html). A broken
// internal link, a sitemap URL with no page behind it, or an `.html` link that should be
// clean all fail the build. Run after `npm run build`.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

const DIST = join(process.cwd(), 'dist');
if (!existsSync(DIST)) {
  console.error('check-links: dist/ not found — run `npm run build` first');
  process.exit(2);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const SKIP = /^(https?:|mailto:|tel:|#|data:|javascript:)/i;
const ATTR = /\b(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;
const problems = [];
let checked = 0;

function resolves(target) {
  const clean = target.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  if (clean === '/') return existsSync(join(DIST, 'index.html'));
  const rel = clean.replace(/^\//, '');
  return (
    existsSync(join(DIST, rel)) ||
    existsSync(join(DIST, `${rel}.html`)) ||
    existsSync(join(DIST, rel, 'index.html'))
  );
}

for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  const relFile = relative(DIST, file).split('\\').join('/');
  const here = posix.dirname('/' + relFile);
  for (const m of html.matchAll(ATTR)) {
    const raw = m[1].trim();
    if (!raw || SKIP.test(raw)) continue;
    const abs = raw.startsWith('/') ? raw : posix.normalize(posix.join(here, raw));
    checked++;
    const shown = `${relFile} → ${raw}`;
    if (/\.html([?#]|$)/.test(abs) && !/^\/(404)\.html/.test(abs)) {
      problems.push(`NOT-CLEAN  ${shown} (internal links use the clean URL form)`);
    }
    if (!resolves(abs)) problems.push(`MISSING    ${shown}`);
  }
}

const sitemap = join(DIST, 'sitemap.xml');
if (existsSync(sitemap)) {
  const xml = readFileSync(sitemap, 'utf8');
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const url = new URL(m[1]);
    checked++;
    if (/\.html$/.test(url.pathname)) problems.push(`NOT-CLEAN  sitemap → ${m[1]}`);
    if (!resolves(url.pathname)) problems.push(`MISSING    sitemap → ${m[1]}`);
  }
} else {
  problems.push('MISSING    dist/sitemap.xml');
}

if (problems.length) {
  console.error(`check-links: ${problems.length} problem(s) in ${checked} references\n` + problems.map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log(`check-links: OK — ${checked} internal references resolve, all in clean-URL form`);
