import { useCallback, useLayoutEffect, useRef } from 'react';
import { createSystemRenderer } from '../lib/renderers/system.js';
import { frameGate, smooth } from '../lib/scene.js';
import { pointer } from '../lib/pointer.js';
import { useAsciiScene } from '../hooks/useAsciiScene.js';
import { useAnimationLoop } from '../hooks/useAnimationLoop.js';
import { useMotion } from '../hooks/useMotion.js';
import { PROJECTS } from '../data/content.js';
import './Projects.css';

// Órbitas de cada proyecto (radio relativo y ángulo inicial) y tamaño relativo del planeta
const ORBITS = [
  { k: 0.58, a: 0.6 },
  { k: 0.72, a: 2.1708 },
  { k: 0.86, a: 3.7416 },
  { k: 1, a: 5.3124 },
];
const PLANET_R = [0.075, 0.12, 0.07, 0.07];
const FOCUS_SCALE = [1, 1, 0.55, 0.85];
// Por debajo de este ancho (px) el canvas se limita a la zona del sistema, con este alto mínimo
const NARROW = 760;
const NARROW_CANVAS_H = 600;
const pad = (i) => String(i + 1).padStart(2, '0');

export default function Projects({ selected, onSelect }) {
  const { paused } = useMotion();
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const spaceRef = useRef(null);
  const backRef = useRef(null);
  const planetRefs = useRef([]);
  const gate = useRef(frameGate(30));

  // Estado de simulación mutable (no provoca renders)
  const sim = useRef(null);
  if (!sim.current) {
    sim.current = {
      orbits: ORBITS.map((o) => ({ ...o, px: 0, py: 0, pr: 0 })),
      sys: { x: 0, y: 0, sr: 0.08, tilt: -0.21, orbits: [], bodies: [], sel: 0, fk: 0, focus: 0, fr: 0.2, burst: 0 },
      focusOn: false,
      focusIdx: 0,
      fk: 0,
      lastT: 0,
    };
  }
  const selectedRef = useRef(selected);
  useLayoutEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const scene = useAsciiScene(canvasRef, { create: createSystemRenderer, extra: { system: sim.current.sys } });

  const pausedRef = useRef(paused);
  useLayoutEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // La "explosión" de glifos necesita varios fotogramas para recomponerse: sólo con animación activa
  const burst = () => {
    if (!pausedRef.current) sim.current.sys.burst++;
  };

  // Elegir desde las pestañas: si hay un planeta enfocado, cambia el enfoque al nuevo
  const pick = useCallback(
    (i) => {
      onSelect(i);
      const s = sim.current;
      if (s.focusOn && s.focusIdx !== i) {
        s.focusIdx = i;
        burst();
      }
    },
    [onSelect],
  );

  // Pasar el ratón / tocar un planeta: el sistema se dispersa y ese proyecto se forma grande en el centro
  const focus = useCallback(
    (i) => {
      onSelect(i);
      const s = sim.current;
      if (!(s.focusOn && s.focusIdx === i)) {
        s.focusOn = true;
        s.focusIdx = i;
        burst();
      }
    },
    [onSelect],
  );

  const unfocus = useCallback(() => {
    const s = sim.current;
    if (s.focusOn) {
      s.focusOn = false;
      burst();
    }
  }, []);

  // Posiciona planetas (DOM) y alimenta al renderer del sistema
  const layout = (now, animate) => {
    const sec = sectionRef.current;
    const sp = spaceRef.current;
    if (!sec || !sp) return;
    const s = sim.current;
    const sy = s.sys;
    const dt = Math.min(0.1, (now - (s.lastT || now)) / 1000);
    s.lastT = now;
    const b = sec.getBoundingClientRect();
    if (b.bottom <= 0 || b.top >= window.innerHeight || b.height < 10) return;

    const q = sp.getBoundingClientRect();
    const cx = q.left - b.left + q.width / 2;
    const cy = q.top - b.top + q.height / 2;
    const R = Math.max(70, Math.min(q.width / 2 - 30, (q.height / 2 - 50) / 0.49, b.height * 0.55));
    const CT = Math.cos(sy.tilt);
    const ST = Math.sin(sy.tilt);

    // En pantallas estrechas la sección es muy alta: si el canvas la cubriera entera, cada carácter
    // sería enorme y el sistema quedaría en 2-3 glifos. Ahí el canvas sólo cubre la zona del sistema.
    let canvasTop = 0;
    let H = b.height;
    // En móvil el sistema es pequeño (lo limita el ancho): planetas algo más grandes para que se lean
    const planetBoost = b.width < NARROW ? 1.5 : 1;
    if (b.width < NARROW) {
      H = Math.min(b.height, Math.max(q.height + 80, NARROW_CANVAS_H));
      canvasTop = Math.max(0, Math.min(b.height - H, cy - H / 2));
    }
    const cv = canvasRef.current;
    if (cv) {
      const top = `${canvasTop.toFixed(0)}px`;
      const height = `${H.toFixed(0)}px`;
      if (cv.style.top !== top) cv.style.top = top;
      if (cv.style.height !== height) cv.style.height = height;
    }
    // Coordenadas del renderer: relativas al centro del canvas, en unidades de su alto
    const toSceneX = (x) => (x - b.width / 2) / H;
    const toSceneY = (y) => (y - canvasTop - H / 2) / H;
    sy.x = toSceneX(cx);
    sy.y = toSceneY(cy);
    sy.sr = (R * 0.12) / H;
    sy.sel = selectedRef.current;

    const planets = planetRefs.current.filter(Boolean);
    const held = animate && planets.some((el) => el.matches(':hover'));

    if (animate) s.fk += Math.max(-dt / 0.8, Math.min(dt / 0.8, (s.focusOn ? 1 : 0) - s.fk));
    else s.fk = s.focusOn ? 1 : 0;
    const fk = s.fk;
    const FRpx = Math.max(56, Math.min(q.width, q.height) * 0.3) * FOCUS_SCALE[s.focusIdx];
    sy.fk = fk;
    sy.focus = s.focusIdx;
    sy.fr = FRpx / H;

    // Salir del área del sistema con el ratón deshace el enfoque
    if (
      s.focusOn && pointer.inside && fk > 0.9 &&
      (pointer.x < q.left || pointer.x > q.right || pointer.y < q.top - 40 || pointer.y > q.bottom + 40)
    ) {
      unfocus();
    }

    const back = backRef.current;
    if (back) {
      const on = fk > 0.6;
      back.style.transform = `translate(${cx.toFixed(1)}px, ${(cy + FRpx + 48).toFixed(1)}px) translate(-50%, 0)`;
      back.style.opacity = on ? 1 : 0;
      back.style.pointerEvents = on ? 'auto' : 'none';
      back.inert = !on;
    }

    s.orbits.forEach((p, i) => {
      if (animate && !held && fk < 0.02) p.a += 0.12 * dt;
      const rx = R * p.k;
      const ry = rx * 0.45;
      const u = rx * Math.cos(p.a);
      const v = ry * Math.sin(p.a);
      p.px = cx + u * CT - v * ST;
      p.py = cy + u * ST + v * CT;
      p.pr = Math.max(11, R * PLANET_R[i] * planetBoost);
      sy.orbits[i] = { rx: rx / H, ry: ry / H };
      sy.bodies[i] = { x: toSceneX(p.px), y: toSceneY(p.py), r: p.pr / H };
    });

    planets.forEach((el) => {
      const i = Number(el.dataset.i);
      const p = s.orbits[i];
      const hit = el.firstElementChild;
      const isFocused = i === s.focusIdx;
      const k = isFocused ? smooth(fk) : 0;
      const d0 = Math.max(36, p.pr * 2.6);
      const d = d0 + (FRpx * 2 - d0) * k;
      const px = p.px + (cx - p.px) * k;
      const py = p.py + (cy - p.py) * k;
      hit.style.inlineSize = hit.style.blockSize = `${d.toFixed(0)}px`;
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, ${(-d / 2).toFixed(1)}px)`;
      el.style.opacity = isFocused ? 1 : (1 - Math.min(1, fk * 4)).toFixed(2);
      el.style.pointerEvents = !isFocused && fk > 0.05 ? 'none' : '';
      el.toggleAttribute('data-selected', i === selectedRef.current);
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

  // En pausa, re-dibujar al cambiar de selección / enfoque
  const repaintIfPaused = () => {
    if (paused) requestAnimationFrame(() => {
      layout(performance.now(), false);
      scene.still();
    });
  };

  const project = PROJECTS[selected];

  return (
    <section ref={sectionRef} id="projects" className="projects" aria-labelledby="projects-title">
      <canvas ref={canvasRef} className="scene-canvas scene-canvas--fill" width="1080" height="960" aria-hidden="true" />

      {/* Capa de planetas posicionados por JS sobre el canvas */}
      <div className="projects__overlay">
        <button
          ref={backRef}
          type="button"
          className="projects__back"
          onClick={() => { unfocus(); repaintIfPaused(); }}
        >
          ← system
        </button>
        {PROJECTS.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => { planetRefs.current[i] = el; }}
            type="button"
            data-i={i}
            className="planet"
            // Atajo visual: las pestañas del panel ofrecen el mismo control con teclado
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => { focus(i); repaintIfPaused(); }}
            onMouseEnter={() => focus(i)}
          >
            <span className="planet__hit" />
            <span className="planet__tag">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="projects__head container">
        <p className="cmd-line"><span className="prompt">$ </span>ls projects/</p>
        <h2 id="projects-title" className="section-title flow-text">Projects</h2>
      </div>

      <div className="projects__body container">
        <div ref={spaceRef} className="projects__space" />
        <div className="projects__panel-wrap">
          <article className="panel" aria-labelledby="project-name">
            <div className="panel__bar">
              <span>k4zzu@blackhole: ~/projects</span>
              <span>{pad(selected)} / {pad(PROJECTS.length - 1)}</span>
            </div>
            <div className="panel__content">
              <p className="panel__cmd"><span className="prompt">$ </span>cat projects/{project.id}.md</p>
              <div className="panel__title-row">
                <h3 id="project-name" className="panel__title">{project.name}</h3>
                <span className="badge">{project.live ? 'deployed' : 'repo only'}</span>
              </div>
              <p className="panel__sub">{project.sub}</p>
              <p className="panel__astro">orbiting as · {project.astro}</p>
              <p className="panel__desc">{project.desc}</p>
              <ul className="panel__stack" aria-label="Tech stack">
                {project.stack.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <div className="panel__links">
                {project.live && (
                  <a className="btn btn--green" href={project.live} target="_blank" rel="noopener noreferrer">
                    live <span aria-hidden="true">↗</span><span className="visually-hidden"> {project.name} (opens in a new tab)</span>
                  </a>
                )}
                <a className="btn btn--purple" href={project.repo} target="_blank" rel="noopener noreferrer">
                  code <span aria-hidden="true">↗</span><span className="visually-hidden"> of {project.name} on GitHub (opens in a new tab)</span>
                </a>
              </div>
            </div>
            <div className="panel__tabs" role="group" aria-label="Choose a project">
              {PROJECTS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className="tab"
                  aria-pressed={i === selected}
                  onClick={() => { pick(i); repaintIfPaused(); }}
                >
                  {pad(i)} {p.name}
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
