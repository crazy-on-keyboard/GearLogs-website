import { defineConfig, type Plugin, type Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
// the plain ES module the build uses too — one source for the headers
import { headersFor } from './scripts/lib/headers.mjs';

// Cloudflare Pages serves every public/*.html page at its clean URL
// (/pricing, /notes/serial-number-tracking) and 308-redirects the .html form.
// Since the site's internal links, canonicals and sitemap use the clean form
// (the SEO fix — Google must never be pointed at a redirecting URL), the local
// dev and preview servers must resolve clean URLs the same way, or every
// internal link 404s locally.
function cleanUrls(): Plugin {
  const middleware =
    (roots: () => string[]): Connect.NextHandleFunction =>
    (req, _res, next) => {
      const url = (req.url ?? '/').split('?')[0];
      if (url !== '/' && !path.extname(url)) {
        const file = url.replace(/\/+$/, '');
        for (const base of roots()) {
          if (fs.existsSync(path.join(base, `${file}.html`))) {
            req.url = `${file}.html`;
            break;
          }
        }
      }
      next();
    };
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use(middleware(() => [path.resolve('public')]));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(() => [path.resolve('dist')]));
    },
  };
}

// The preview answers with the SAME headers Cloudflare Pages will (the policies in scripts/lib/headers.mjs, resolved for the
// request's own path before the clean-URL rewrite): a CSP that breaks a page is seen on :4173, where the Director reviews,
// never first after the deploy (Stage 2 PR-1 — until now the preview applied no policy at all).
function siteHeaders(): Plugin {
  return {
    name: 'site-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0] ?? '/';
        for (const [name, value] of headersFor(pathname) as [string, string][]) res.setHeader(name, value);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [siteHeaders(), cleanUrls()],
  build: {
    outDir: 'dist',
  },
});
