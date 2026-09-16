# GearLogs website (gearlogs.com) — repo rules for Claude Code (HYG-3, written 2026-09-04)

The website's owed work lives in the app repo's tracker: `GearLogs/GEARLOGS_PROJECT_TRACKER.md` §5 (5.1 changelog queue · 5.2 FAQ · 5.3 Help Center · 5.4 cards · 5.5 Field Notes · 5.7 published register · 5.8 the drafted copy, written at the app PR's closeout and lifted as-is). Publishing = ticking there in the same pass.

## Shape
A generated, **bilingual** static site (EN + native Hebrew, RTL — since web #70, 2026-09-13; every change ships in BOTH languages, the build refuses a page that lacks its Hebrew). `scripts/build-site.mjs` renders every page from ONE chrome source (`src/chrome.mjs`: header, footer, nav, the language switch) + per-language head metadata (`src/meta/{en,he}.json`) + body fragments (`src/bodies/<slug>.<lang>.html` — `index` with the `cap-card` grid and `cap-ref` numbers 1.x / 3.x, `changelog`, `faq` (`faq-item` blocks: `<h2 class="faq-q">` + `<p class="faq-a">`), `guides` (cards 4.1…4.NN), `pricing`, `privacy`, `terms`, `refunds`, `notes` + `notes/<slug>` Field Notes with their JSON-LD `src/bodies/<slug>.jsonld.<lang>.json`), registered in `src/pages.mjs` (structure only: slug, path, chrome, sitemap; `bilingual: true` for every public page; EN-only/static pages such as `pay` and `404` are handled by the build). English is written to `dist/`, Hebrew to `dist/he/` (`<html lang="he" dir="rtl">`, reciprocal `hreflang`, self-referencing canonicals), `sitemap.xml` generated; `public/` is copied as-is (`styles/main.css` — edit ONLY there; `_headers` with the CSP: no inline scripts, JSON-LD allowed; `functions/api/geo.js` the language banner). Never edit `dist/`. The chrome is ONE source — never duplicate header or footer in a body. Hebrew reads as a native product, never a calque; a strict EN↔HE semantic proofread before the gate (the 2026-09-13 lesson: automated Hebrew plateaus, a human copywriter is the finish).

## Check and ship
```
npm run check      # build + link integrity
```
Cloudflare Pages deploys `main`; the GitHub status can stay "pending" after the page is already live — verify with a cache-busted `curl` of the page. Never commit on `main`; `git checkout -b` as its own command; squash-merge when `CLEAN`. A website gate (ui-ux-master on Opus, on a local `vite preview` — port 4173, never the app's 4174) walks every changed page before the PR.

## House style (verified against 57+ entries and 9 notes)
- Changelog: outcomes, never mechanics; `GL-NN` newest first, inserted right after `<div class="changelog">`; NO terminal full stop on a bullet; no dates anywhere on the public site.
- Field Notes voice: the reader is an ops person; useful first, GearLogs only in the last fifth; open on the reader's problem with a concrete scene; short active sentences; British spelling; one pull quote that never repeats the sentence above it; filed by code FN-NNN with a category and a read-time; JSON-LD BlogPosting + BreadcrumbList; the notes page's Blog JSON-LD lists EVERY note.
- Never: "free trial" / "sign up" CTAs (invite-only), emoji, self-praise, "+N more", mobile layouts.
- Every public claim is checked against the app's own strings and limits before it is written; when a control is named on the site, the app's string is the source — change the app first, the site follows.
- Entities as the neighbours use them: `&mdash;` `&ldquo;` `&rdquo;` `&rsquo;`.

## Patching from a shell
Bash heredocs eat backslashes — patch scripts go through a file written with the Write tool; keep each anchor unique and assert it. Files may be CRLF.
