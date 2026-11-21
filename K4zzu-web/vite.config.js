import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Publicación en GitHub Pages desde la rama main, carpeta /docs del repo K4zzu/K4zzu:
// la web queda en https://k4zzu.github.io/K4zzu/
// Se puede cambiar con VITE_SITE_URL y VITE_BASE en un archivo .env (ver .env.example).
const DEFAULT_SITE_URL = 'https://k4zzu.github.io/K4zzu/';
const DEFAULT_BASE = '/K4zzu/';
export const OUT_DIR = '../docs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/?$/, '/');

  return {
    base: env.VITE_BASE || DEFAULT_BASE,
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
      outDir: OUT_DIR,
      emptyOutDir: true,
    },
  };
});
