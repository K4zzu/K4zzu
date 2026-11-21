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

export default function Hero() {
  const { paused, toggle } = useMotion();
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const gate = useRef(frameGate(30));
  // El disco termina de abrirse hacia t≈8 s; el fotograma 330 (11 s) muestra la escena completa.
  const scene = useAsciiScene(canvasRef, { create: createBlackHoleRenderer, resetOnResize: false, stillFrame: 330 });

  useAnimationLoop(headerRef, {
    paused,
    step: (now) => {
      if (gate.current(now)) scene.frame((rect) => pointer.y <= rect.bottom);
    },
    still: scene.still,
  });

  return (
    <header ref={headerRef} className="hero" id="top">
      <canvas ref={canvasRef} className="scene-canvas" width="1080" height="960" aria-hidden="true" />

      <nav className="hero__nav" aria-label="Main">
        <a href="#projects">projects</a>
        <a href="#contact">contact</a>
        <button type="button" className="hero__motion" onClick={toggle}>
          {paused ? '▶ play motion' : '❚❚ pause motion'}
        </button>
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
