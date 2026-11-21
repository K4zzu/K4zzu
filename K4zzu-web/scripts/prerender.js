// Pre-renderiza la página en ../docs/index.html y genera robots.txt y sitemap.xml.
// Se ejecuta después de `vite build` (cliente) y `vite build --ssr` (servidor).
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Carpeta publicada por GitHub Pages (main → /docs), definida en vite.config.js
const dist = path.join(root, '..', 'docs');
const ssrDir = path.join(root, 'dist-ssr');

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);

const indexPath = path.join(dist, 'index.html');
const template = await readFile(indexPath, 'utf8');
if (!template.includes('<!--app-html-->')) throw new Error('Falta el marcador <!--app-html--> en index.html');
await writeFile(indexPath, template.replace('<!--app-html-->', render()));

// La URL canónica ya fue inyectada en el HTML por vite.config.js: se reutiliza.
const siteUrl = template.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
if (!siteUrl) throw new Error('No se encontró la URL canónica en index.html');
const today = new Date().toISOString().slice(0, 10);

await writeFile(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
);
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`,
);

await rm(ssrDir, { recursive: true, force: true });
console.log(`✓ pre-renderizado docs/index.html · robots.txt · sitemap.xml (${siteUrl})`);
