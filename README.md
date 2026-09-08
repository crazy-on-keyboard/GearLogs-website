# GearLogs Website

The marketing site for GearLogs — inventory and personnel management by RAQIOM — at `gearlogs.com`. English only, by this repo's own rule; a multi-page Vite site deployed by Cloudflare Pages from `main`.

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
npm run check    # build + check-links (every internal reference must resolve)
```

Edit copy in the page files and styles in `public/styles/main.css`; inline scripts are refused by the CSP. The changelog page lists OUTCOMES with GL-NN ids and no dates; every claim on the public site is checked against the app's own strings before it is published.
