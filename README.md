# GearLogs Website

The marketing site for GearLogs — inventory and personnel management by RAQIOM — at `gearlogs.com`, in English and native Hebrew (RTL): a generated static site (`scripts/build-site.mjs`, previewed with Vite) deployed by Cloudflare Pages from `main`. The rules live in `CLAUDE.md`.

## Where things live

| You want to know… | Read |
|---|---|
| The rules every change must obey (structure, styles, the CSP, the check) | `CLAUDE.md` |
| What the site still owes the product (features to highlight, FAQ, help pages) and what was published | the app repo's `GEARLOGS_PROJECT_TRACKER.md`, §5 — every customer-visible app PR fills a block there in the same closeout |
| How the app itself is built | the app repo's `docs/ARCHITECTURE.md` |

## Run it

```
npm install
npm run dev      # local preview
npm run check    # types · rule tests · the look laws · build · links · bilingual · the pinned CSP walk
npm run photos   # re-cut the served photos from assets/photos/
npm run capture  # re-take the app screenshots (needs the local app and the signed-in capture windows)
```

Edit copy in the page bodies (`src/bodies/`, every page in English AND Hebrew) and styles in the partials under `src/styles/` (tokens first); inline code of any kind is refused by the build and the CSP. The changelog page lists OUTCOMES with GL-NN ids and no dates; every claim on the public site is checked against the app's own strings before it is published.
