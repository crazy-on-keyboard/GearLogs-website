import { defineConfig, type Plugin, type Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

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

export default defineConfig({
  plugins: [cleanUrls()],
  build: {
    outDir: 'dist',
  },
});
