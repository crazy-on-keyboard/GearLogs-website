# GearLogs website (gearlogs.com) — repo rules for Claude Code (HYG-3, written 2026-09-04)

The website's owed work lives in the app repo's tracker: `GearLogs/GEARLOGS_PROJECT_TRACKER.md` §5 (5.1 changelog queue · 5.2 FAQ · 5.3 Help Center · 5.4 cards · 5.5 Field Notes · 5.7 published register · 5.8 the drafted copy, written at the app PR's closeout and lifted as-is). Publishing = ticking there in the same pass.

## Shape
Vite static site. `index.html` is the only Vite entry (hero · Capabilities `cap-card` grid with `cap-ref` numbers 1.x · How It Works · Security cards 3.x · contact). Everything else lives in `public/` and is copied as-is: `changelog.html`, `faq.html` (`faq-item` blocks: `<h2 class="faq-q">` + `<p class="faq-a">`), `guides.html` (cards 4.1…4.NN), `notes.html` + `notes/*.html` (Field Notes; the template is the newest note), `sitemap.xml`, `styles/main.css` (edit ONLY `public/styles/main.css`), `_headers` (CSP: no inline scripts; JSON-LD is allowed). Header and footer are duplicated in every page — change them everywhere. English only.

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
