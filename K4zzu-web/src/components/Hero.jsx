import { useRef } from 'react';
import { createBlackHoleRenderer } from '../lib/renderers/blackHole.js';
import { frameGate } from '../lib/scene.js';
import { pointer } from '../lib/pointer.js';
import { useAsciiScene } from '../hooks/useAsciiScene.js';
import { useAnimationLoop } from '../hooks/useAnimationLoop.js';
import { useMotion } from '../hooks/useMotion.js';
import { PROFILE } from '../data/content.js';
import Typewriter from './Typewriter.jsx';
import './Hero.css';

// Semiancho del disco de acreción ya abierto, en unidades del alto de la escena (ROUT · zoom final)
const DISC_HALF_WIDTH = 0.76;
// Ancho del disco respecto al de la pantalla cuando hay que encogerlo
const DISC_COVER = 1.3;

export default function Hero() {
  const { paused } = useMotion();
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const gate = useRef(frameGate(30));
  const view = useRef({ scale: 1, compactHud: false });
  // El disco termina de abrirse hacia t≈8 s; el fotograma 330 (11 s) muestra la escena completa.
  const scene = useAsciiScene(canvasRef, {
    create: createBlackHoleRenderer,
    extra: { view: view.current },
    resetOnResize: false,
    stillFrame: 330,
  });

  // En pantallas estrechas el disco (≈1,5 veces el alto de ancho) no cabe: se encoge hasta que
  // ocupa algo más que el ancho disponible (los bordes del disco son tenues y pueden salirse).
  const fitView = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const { width, height } = cv.getBoundingClientRect();
    if (!height) return;
    const v = view.current;
    v.scale = Math.min(1, ((width / height) * 0.5 * DISC_COVER) / DISC_HALF_WIDTH);
    v.compactHud = width < 600;
  };

  useAnimationLoop(headerRef, {
    paused,
    step: (now) => {
      if (!gate.current(now)) return;
      fitView();
      scene.frame((rect) => pointer.y <= rect.bottom);
    },
    still: () => {
      fitView();
      scene.still();
    },
  });

  return (
    <header ref={headerRef} className="hero" id="top">
      <canvas ref={canvasRef} className="scene-canvas" width="1080" height="960" aria-hidden="true" />

      <nav className="hero__nav" aria-label="Main">
        <a href="#projects">projects</a>
        <a href="#contact">contact</a>
      </nav>

      <div className="hero__copy">
        {/* Contenido real e indexable; la versión animada es decorativa */}
        <h1 className="visually-hidden">
          {PROFILE.name} ({PROFILE.handle}) — developer. Software and electronics: automation, security and creative web.
        </h1>
        <Typewriter />
      </div>

      <a className="hero__scroll" href="#projects">
        scroll <span aria-hidden="true">↓</span>
      </a>
    </header>
  );
}
