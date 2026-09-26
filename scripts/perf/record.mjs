#!/usr/bin/env node
// The site's speed record (Stage 2 PR-1, 2026-09-27 — the Director's check S2-07: "speed recorded before and after").
// Loads each page several times in a fresh browser context with the CPU slowed 4× and a fixed "fast 4G" line, and prints
// the median Largest Contentful Paint, Cumulative Layout Shift, First Contentful Paint and time to first byte, with the
// requests and bytes by type. Then, when a dist/ exists, the gzip / brotli size of what a first visit downloads.
//
//   npm run perf                                   the live site (https://gearlogs.com)
//   npm run perf -- --base=http://localhost:4173   the local preview
//
// Uses the Chrome installed on this PC (CHROME to override); nothing here is shipped.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const BASE = (args.base ?? 'https://gearlogs.com').replace(/\/$/, '');
const RUNS = Number(args.runs ?? 5);
const PAGES = (args.pages ?? '/,/he/,/pricing,/contact,/notes/serial-number-tracking').split(',');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
/** "Fast 4G" as Lighthouse's mobile preset uses it, applied to a desktop viewport. */
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function measure(browser, path) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const byType = {};
    let requests = 1, bytes = nav?.transferSize ?? 0;
    for (const e of performance.getEntriesByType('resource')) {
      requests++; bytes += e.transferSize;
      const t = e.initiatorType === 'link' && /\.css/.test(e.name) ? 'css' : e.initiatorType === 'script' ? 'js' : /\.(woff2?|ttf)$/.test(e.name) ? 'font' : /\.(png|jpe?g|webp|avif|svg|gif)/.test(e.name) ? 'image' : e.initiatorType;
      byType[t] = (byType[t] ?? 0) + e.transferSize;
    }
    return { lcp: window.__perf.lcp, cls: window.__perf.cls, fcp, ttfb: nav ? nav.responseStart : 0, requests, bytes, byType };
  });
  await ctx.close();
  return r;
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  console.log(`# Speed record — ${BASE} (${RUNS} runs each; CPU ×4, fast 4G, 1440×900; medians)\n`);
  console.log('| Page | LCP ms | CLS | FCP ms | TTFB ms | Requests | Transferred kB |');
  console.log('|---|---|---|---|---|---|---|');
  for (const path of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, path));
    const m = (k) => median(runs.map((x) => x[k]));
    console.log(`| ${path} | ${Math.round(m('lcp'))} | ${m('cls').toFixed(3)} | ${Math.round(m('fcp'))} | ${Math.round(m('ttfb'))} | ${m('requests')} | ${(m('bytes') / 1024).toFixed(1)} |`);
  }
  await browser.close();

  const dist = join(process.cwd(), 'dist');
  if (!existsSync(dist)) return;
  const kinds = { '.html': 'HTML', '.css': 'CSS', '.js': 'JS', '.woff2': 'Fonts', '.woff': 'Fonts', '.webp': 'Images', '.jpg': 'Images', '.png': 'Images', '.svg': 'Images', '.avif': 'Images' };
  const sum = {};
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  // what the home page itself references (its first visit), plus the page
  const refs = new Set(['/index.html', ...[...home.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map((x) => x[1])]);
  for (const ref of refs) {
    const file = join(dist, ref);
    if (!existsSync(file) || statSync(file).isDirectory()) continue;
    const kind = kinds[extname(file)];
    if (!kind) continue;
    const buf = readFileSync(file);
    const s = (sum[kind] ??= { raw: 0, gz: 0, br: 0 });
    s.raw += buf.length; s.gz += gzipSync(buf).length; s.br += brotliCompressSync(buf).length;
  }
  console.log('\n## The home page\'s first-visit files (from dist/)\n');
  console.log('| Kind | Raw kB | gzip kB | brotli kB |');
  console.log('|---|---|---|---|');
  for (const [k, v] of Object.entries(sum)) console.log(`| ${k} | ${(v.raw / 1024).toFixed(1)} | ${(v.gz / 1024).toFixed(1)} | ${(v.br / 1024).toFixed(1)} |`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
