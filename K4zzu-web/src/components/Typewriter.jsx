import { useEffect, useReducer, useRef } from 'react';
import { GREETINGS, PROFILE } from '../data/content.js';
import { useMotion } from '../hooks/useMotion.js';

const TICK_MS = 65;
const START_DELAY_MS = 900;
const initial = () => ({ phase: 'who', w: 0, wait: 0, user: false, lang: 0, g: 0, m: 0, s: 0, hold: 0 });

// Máquina de estados del saludo: whoami → usuario → saludo → nombre → frase → pausa → borrar → siguiente idioma
function advance(t) {
  const L = GREETINGS[t.lang].lines;
  if (t.wait > 0) return { ...t, wait: t.wait - 1 };
  switch (t.phase) {
    case 'who':
      if (t.w < 6) return { ...t, w: t.w + 1 };
      if (!t.user) return { ...t, user: true, wait: 8 };
      return { ...t, phase: 'g' };
    case 'g':
      return t.g < L[0].length ? { ...t, g: t.g + 1 } : { ...t, phase: 'm', wait: 4 };
    case 'm':
      return t.m < L[1].length ? { ...t, m: t.m + 1 } : { ...t, phase: 's', wait: 5 };
    case 's':
      return t.s < L[2].length ? { ...t, s: t.s + 1 } : { ...t, phase: 'hold', hold: 0 };
    case 'hold':
      return t.hold + 1 > 40 ? { ...t, phase: 'del' } : { ...t, hold: t.hold + 1 };
    case 'del':
      if (t.s > 0) return { ...t, s: Math.max(0, t.s - 3) };
      if (t.m > 0) return { ...t, m: Math.max(0, t.m - 2) };
      if (t.g > 0) return { ...t, g: Math.max(0, t.g - 2) };
      return { ...t, lang: (t.lang + 1) % GREETINGS.length, phase: 'g', wait: 5 };
    default:
      return t;
  }
}

/** Estado final estático: todo escrito en inglés, sin cursor parpadeando. */
const settled = () => {
  const L = GREETINGS[0].lines;
  return { phase: 'static', w: 6, wait: 0, user: true, lang: 0, g: L[0].length, m: L[1].length, s: L[2].length, hold: 0 };
};

function cursorLine(t) {
  if (t.phase === 'static') return -1;
  if (t.phase === 'who') return 0;
  if (t.phase === 's' || t.phase === 'hold' || (t.phase === 'del' && t.s > 0)) return 3;
  if (t.phase === 'g' || (t.phase === 'del' && t.m === 0)) return 1;
  return 2;
}

function Caret({ show, className = 'caret' }) {
  return <span className={className}>{show ? '▍' : ''}</span>;
}

/**
 * Texto animado del hero. Es decorativo (aria-hidden): el contenido real para lectores
 * de pantalla y buscadores está en el <h1> oculto visualmente de Hero.
 */
export default function Typewriter() {
  const { paused } = useMotion();
  const [t, dispatch] = useReducer((s, a) => (a === 'tick' ? advance(s) : a === 'settle' ? settled() : initial()), null, initial);
  const started = useRef(false);

  useEffect(() => {
    if (paused) {
      dispatch('settle');
      return;
    }
    if (started.current) dispatch('reset');
    started.current = true;
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => dispatch('tick'), TICK_MS);
    }, START_DELAY_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [paused]);

  const { lang, lines: L } = GREETINGS[t.lang];
  const line = cursorLine(t);
  const blinkOn = t.phase !== 'hold' || Math.floor(t.hold / 7) % 2 === 0;
  const c = (n) => line === n && blinkOn;

  return (
    <div className="hero__type" aria-hidden="true">
      <p className="hero__who">
        <span className="prompt">$ </span>
        {'whoami'.slice(0, t.w)}
        <Caret show={c(0)} />
      </p>
      <a
        className="hero__user"
        href={PROFILE.github}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        data-visible={t.user || undefined}
      >
        <span className="hero__user-name flow-text">{t.user ? PROFILE.handle : ''}</span>
        <span className="hero__user-hint">{t.user ? '↗ click me · GitHub' : ''}</span>
      </a>
      <p className="hero__greet" lang={lang}>
        {L[0].slice(0, t.g)}
        <Caret show={c(1) && t.phase !== 'who'} className="" />
      </p>
      <p className="hero__name" lang={lang}>
        {L[1].slice(0, t.m)}
        <Caret show={c(2)} className="caret caret--mono" />
      </p>
      <p className="hero__tag" lang={lang}>
        {L[2].slice(0, t.s)}
        <Caret show={c(3)} />
      </p>
    </div>
  );
}
