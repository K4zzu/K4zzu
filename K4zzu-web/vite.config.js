import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// URL pública del sitio: se usa en canonical, Open Graph, JSON-LD, robots.txt y sitemap.xml.
// Cámbiala con VITE_SITE_URL en un archivo .env (ver .env.example).
const DEFAULT_SITE_URL = 'https://k4zzu.github.io/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/?$/, '/');

  return {
    // Ruta base para el despliegue (p. ej. '/K4zzu-web/' en GitHub Pages de un repo).
    base: env.VITE_BASE || '/',
    plugins: [
      react(),
      {
        name: 'inject-site-url',
        transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
      },
    ],
    define: {
      __SITE_URL__: JSON.stringify(siteUrl),
    },
    build: {
      target: 'es2022',
    },
  };
});
