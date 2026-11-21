import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionContext } from '../hooks/useMotion.js';

const STORAGE_KEY = 'k4zzu:motion';

/**
 * Controla si las animaciones continuas corren.
 * - Respeta `prefers-reduced-motion: reduce` (arranca en pausa).
 * - Ofrece un control visible de pausa (WCAG 2.2.2) cuya elección se recuerda.
 * Durante SSR/hidratación siempre empieza en `false` para que el HTML coincida.
 */
export function MotionProvider({ children }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saved = localStorage.getItem(STORAGE_KEY);
    setPaused(saved ? saved === 'paused' : mq.matches);
    const onChange = (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) setPaused(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = paused ? 'paused' : 'running';
  }, [paused]);

  const toggle = useCallback(() => {
    setPaused((p) => {
      localStorage.setItem(STORAGE_KEY, p ? 'running' : 'paused');
      return !p;
    });
  }, []);

  const value = useMemo(() => ({ paused, toggle }), [paused, toggle]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

