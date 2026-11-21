# K4zzu web — Black Hole

Portfolio de Juan Manuel (K4zzu) hecho con **React 19 + Vite** (JavaScript), a partir del diseño
*Black Hole Animation Demo* de Claude Design. Tres escenas en ASCII animado dibujadas en `<canvas>`:
un agujero negro (hero), un sistema estelar con los proyectos y un planeta con anillos donde orbitan los enlaces de contacto.

## Scripts

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción + pre-render del HTML + robots.txt + sitemap.xml
npm run preview   # sirve dist/
npm run lint
```

## Configuración

Copia `.env.example` a `.env`:

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

El workflow `.github/workflows/deploy-web.yml` (en la raíz del repo) compila y publica la web en
**https://k4zzu.github.io/K4zzu/** cada vez que se hace push a `main` con cambios en `K4zzu-web/`.
También se puede lanzar a mano desde *Actions → Deploy web to GitHub Pages → Run workflow*.

Requisito, una sola vez: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
