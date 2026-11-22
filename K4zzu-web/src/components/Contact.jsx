import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlanetRenderer } from '../lib/renderers/planet.js';
import { frameGate } from '../lib/scene.js';
import { pointer } from '../lib/pointer.js';
import { useAsciiScene } from '../hooks/useAsciiScene.js';
import { useAnimationLoop } from '../hooks/useAnimationLoop.js';
import { useMotion } from '../hooks/useMotion.js';
import { PROFILE, SOCIAL } from '../data/content.js';
import Terminal from './Terminal.jsx';
import Clock from './Clock.jsx';
import './Contact.css';

// Los enlaces orbitan en el plano del anillo del planeta (20° de inclinación, como planet.js)
const TILT_COS = 0.9397;
const TILT_SIN = 0.342;
const ORBIT_SPEED = 0.255;
const START_ANGLES = [0.4, 3.5416, 1.9708, 5.1124];
const FLASH_MS = 900;
// Máximo desplazamiento horizontal de la elipse inclinada, en unidades de su radio mayor
const ORBIT_X_EXTENT = Math.hypot(TILT_COS, 0.28 * TILT_SIN);
// Por debajo de este ancho (px) el planeta se coloca encima de la terminal
const NARROW = 760;
const NARROW_CANVAS_H = 440;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sin contexto seguro o permiso denegado: el texto se muestra igualmente en la terminal
    return false;
  }
}

export default function Contact({ onSelectProject }) {
  const { paused } = useMotion();
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const orbitRef = useRef(null);
  const termRef = useRef(null);
  const zoneRef = useRef(null);
  const bodyRefs = useRef([]);
  const runRef = useRef(null);
  const gate = useRef(frameGate(30));
  const sim = useRef(null);
  if (!sim.current) sim.current = { angles: [...START_ANGLES], flash: [0, 0, 0, 0], centre: { x: 0, y: 0, k: 1 }, lastT: 0 };

  const [discordLabel, setDiscordLabel] = useState('Discord');
  const labelTimer = useRef(0);

  const scene = useAsciiScene(canvasRef, { create: createPlanetRenderer, extra: { centre: sim.current.centre } });

  const flash = useCallback((i) => {
    sim.current.flash[i] = performance.now() + FLASH_MS;
  }, []);

  const copyDiscord = useCallback(async () => {
    const ok = await copyText(PROFILE.discord);
    setDiscordLabel(ok ? `${PROFILE.discord} · copied` : PROFILE.discord);
    clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => setDiscordLabel('Discord'), 2200);
    return ok;
  }, []);

  useEffect(() => () => clearTimeout(labelTimer.current), []);

  // Coloca el planeta junto a la terminal y los enlaces en órbita a su alrededor
  const layout = (now, animate) => {
    const o = orbitRef.current;
    const sec = sectionRef.current;
    if (!o || !sec) return;
    const s = sim.current;
    const dt = Math.min(0.1, (now - (s.lastT || now)) / 1000);
    s.lastT = now;
    const vh = window.innerHeight;
    const b = sec.getBoundingClientRect();
    const vis = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) / vh;
    const op = Math.max(0, Math.min(1, (vis - 0.45) / 0.35));
    o.style.opacity = op.toFixed(2);
    o.style.visibility = op < 0.02 ? 'hidden' : 'visible';
    o.style.pointerEvents = op < 0.6 ? 'none' : 'auto';

    const bodies = bodyRefs.current.filter(Boolean);
    const zone = zoneRef.current;
    let fx, fy, pr, rx;
    // Caja del canvas: toda la sección en escritorio; en móvil sólo la zona del planeta,
    // para que los caracteres sean finos y el planeta tenga detalle.
    let canvasTop = 0;
    let H = b.height;
    if (b.width >= NARROW || !zone) {
      // En pantallas anchas el planeta ocupa la franja libre a la derecha de la terminal
      const term = termRef.current;
      const L = term ? Math.max(0, term.getBoundingClientRect().right - b.left) : 0;
      const F = b.width - L;
      fx = (L + F / 2) / b.width;
      fy = 0.5;
      const rx0 = Math.max(60, (F / 2 - 58) / 0.94);
      pr = Math.max(20, Math.min(0.27 * b.height, (F / 2 - 12) / 1.786, rx0 * 0.94 - 24));
      rx = Math.min(pr * 2.2, Math.max(pr * 1.95, rx0));
    } else {
      // En móvil el planeta tiene su propia zona entre el título y la terminal, y la órbita
      // se ajusta para que el enlace más ancho no se salga por los lados.
      const z = zone.getBoundingClientRect();
      fx = 0.5;
      fy = (z.top - b.top + z.height / 2) / b.height;
      const pillHalf = Math.max(0, ...bodies.map((el) => el.offsetWidth)) * 0.54;
      rx = Math.max(60, (b.width / 2 - pillHalf - 8) / ORBIT_X_EXTENT);
      pr = Math.max(20, Math.min(rx / 1.95, z.height * 0.32));
      const zoneCy = fy * b.height;
      H = Math.min(b.height, Math.max(z.height + 120, NARROW_CANVAS_H));
      canvasTop = Math.max(0, Math.min(b.height - H, zoneCy - H / 2));
    }
    const cv = canvasRef.current;
    if (cv) {
      const top = `${canvasTop.toFixed(0)}px`;
      const height = `${H.toFixed(0)}px`;
      if (cv.style.top !== top) cv.style.top = top;
      if (cv.style.height !== height) cv.style.height = height;
    }
    const ry = rx * 0.28;
    // Centro y escala del planeta en coordenadas del canvas (unidades de su alto)
    s.centre.x = ((fx - 0.5) * b.width) / H;
    s.centre.y = (fy * b.height - canvasTop) / H - 0.5;
    s.centre.k = pr / (0.19 * H);
    o.style.left = `${fx * 100}%`;
    o.style.top = `${fy * 100}%`;
    if (op < 0.02) return;

    const held = bodies.some((el) => el.matches(':hover, :focus-visible'));
    bodies.forEach((el, i) => {
      if (animate && !held) s.angles[i] += ORBIT_SPEED * dt;
      const a = s.angles[i];
      const u = rx * Math.cos(a);
      const d = Math.sin(a);
      const v = ry * d;
      const bx = u * TILT_COS - v * TILT_SIN;
      const by = u * TILT_SIN + v * TILT_COS;
      const sc = (0.96 + 0.12 * d) * (now < s.flash[i] ? 1.3 : 1);
      el.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      // Detrás del planeta el enlace se oculta y deja de recibir clics
      const dist = Math.hypot(bx, by);
      const hid = d < 0 ? Math.max(0, Math.min(1, (dist - pr + 10) / 20)) : 1;
      el.style.zIndex = d > 0 ? 2 : 1;
      el.style.opacity = ((0.82 + 0.18 * Math.max(0, d + 0.4)) * hid).toFixed(2);
      el.style.pointerEvents = hid < 0.5 ? 'none' : '';
    });
  };

  useAnimationLoop(sectionRef, {
    paused,
    step: (now) => {
      layout(now, true);
      if (gate.current(now)) {
        scene.frame((rect) => pointer.y >= rect.top && pointer.y <= rect.bottom);
      }
    },
    still: () => {
      layout(performance.now(), false);
      scene.still();
    },
  });

  // En pausa los enlaces no giran, pero su visibilidad sigue al scroll
  useEffect(() => {
    if (!paused) return;
    const onScroll = () => layout(performance.now(), false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [paused]);

  const setBody = (i) => (el) => {
    bodyRefs.current[i] = el;
  };

  return (
    <section ref={sectionRef} id="contact" className="contact" aria-labelledby="contact-title">
      <canvas ref={canvasRef} className="scene-canvas scene-canvas--fill" width="1080" height="960" aria-hidden="true" />

      <ul ref={orbitRef} className="orbit" aria-label="Social profiles">
        {SOCIAL.map((s, i) => (
          <li key={s.id}>
            <a ref={setBody(i)} className="orbit__body" href={s.url} target="_blank" rel="noopener noreferrer me">
              <span className="orbit__dot" aria-hidden="true" />
              {s.label}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <button ref={setBody(3)} type="button" className="orbit__body" onClick={() => runRef.current?.('discord')}>
            <span className="orbit__dot" aria-hidden="true" />
            {discordLabel}
            <span className="visually-hidden"> (copy username)</span>
          </button>
        </li>
      </ul>

      <div className="contact__head container">
        <p className="cmd-line"><span className="prompt">$ </span>ping k4zzu</p>
        <h2 id="contact-title" className="section-title flow-text">Contact me</h2>
      </div>

      <div className="contact__body container">
        {/* Hueco para el planeta en móvil (en escritorio el planeta va a la derecha de la terminal) */}
        <div ref={zoneRef} className="contact__zone" aria-hidden="true" />
        <Terminal
          ref={termRef}
          runRef={runRef}
          onFlash={flash}
          onSelectProject={onSelectProject}
          onCopyDiscord={copyDiscord}
        />
        <footer className="site-footer">
          <span>K4zzu · <Clock /></span>
          <span>Built with ASCII, coffee and gravity</span>
        </footer>
      </div>
    </section>
  );
}
