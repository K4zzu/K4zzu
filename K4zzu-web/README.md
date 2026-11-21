# K4zzu web — Black Hole

Portfolio de Juan Manuel (K4zzu) hecho con **React 19 + Vite** (JavaScript), a partir del diseño
*Black Hole Animation Demo* de Claude Design. Tres escenas en ASCII animado dibujadas en `<canvas>`:
un agujero negro (hero), un sistema estelar con los proyectos y un planeta con anillos donde orbitan los enlaces de contacto.

## Scripts

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173/K4zzu/
npm run build     # compila a ../docs (lo que publica GitHub Pages) + pre-render + robots.txt + sitemap.xml
npm run preview   # sirve ../docs en http://localhost:4173/K4zzu/
npm run lint
```

## Configuración

No hace falta para publicar en `https://k4zzu.github.io/K4zzu/`. Sólo si cambia la URL, copia `.env.example` a `.env`:

| Variable        | Uso                                                                    |
| --------------- | ---------------------------------------------------------------------- |
| `VITE_SITE_URL` | URL pública final (canonical, Open Graph, JSON-LD, sitemap). Con `/` final. |
| `VITE_BASE`     | Ruta base si se publica en un subdirectorio (p. ej. `/K4zzu-web/`).    |

## Estructura

```
src/
  App.jsx                 composición de secciones
  entry-client.jsx        hidrata el HTML pre-renderizado (o monta en dev)
  entry-server.jsx        renderToString para el pre-render
  data/content.js         proyectos, redes y saludos (editar aquí el contenido)
  components/             Hero, Typewriter, Projects, Contact, Terminal, Clock, CustomCursor, MotionProvider
  hooks/
    useAnimationLoop.js   rAF que se pausa fuera de pantalla (content-visibility / IntersectionObserver)
    useAsciiScene.js      crea/redimensiona un renderer ASCII y avanza fotogramas
    useMotion.js          contexto de pausa de animaciones
  lib/
    renderers/            blackHole.js, planet.js, system.js (portados del diseño)
    pointer.js, scene.js  puntero compartido y utilidades de escena
scripts/prerender.js      inyecta el HTML renderizado en dist/index.html
```

## SEO y accesibilidad

- HTML pre-renderizado: el contenido (h1, proyectos, enlaces) es visible para buscadores sin ejecutar JS.
- Meta description, canonical, Open Graph / Twitter Card con `og-image.png` (1200×630), JSON-LD `ProfilePage` + `Person`, `robots.txt`, `sitemap.xml`, `llms.txt`, manifest.
- Los canvas son decorativos (`aria-hidden`); el texto animado tiene su equivalente real oculto visualmente.
- Botón visible para pausar el movimiento (WCAG 2.2.2); arranca en pausa con `prefers-reduced-motion: reduce`.
- Terminal con `<form>` nativo (seguro con IME), salida en `role="log"`, botones con `aria-pressed`.
- Lighthouse (móvil): Accesibilidad 100 · Buenas prácticas 100 · SEO 100.

## Despliegue (GitHub Pages)

La web se publica en **https://k4zzu.github.io/K4zzu/** desde la carpeta `docs/` de la rama `main`
(en la raíz del repo, junto al README de perfil).

Configuración en GitHub, una sola vez: *Settings → Pages → Deploy from a branch → Branch: `main` · carpeta `/docs` → Save*.

Para publicar cambios:

```bash
cd K4zzu-web
npm run build            # regenera ../docs
cd ..
git add docs K4zzu-web
git commit -m "Update web"
git push                 # GitHub Pages republica solo
```

`docs/.nojekyll` evita que GitHub procese la carpeta con Jekyll.
