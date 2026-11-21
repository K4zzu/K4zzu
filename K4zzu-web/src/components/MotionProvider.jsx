import { useEffect, useMemo, useState } from 'react';
import { MotionContext } from '../hooks/useMotion.js';

/**
 * Indica si las animaciones continuas deben pausarse.
 * Sigue la preferencia del sistema `prefers-reduced-motion: reduce` (sin control en pantalla).
 * Durante SSR/hidratación siempre empieza en `false` para que el HTML coincida.
 */
export function MotionProvider({ children }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPaused(mq.matches);
    const onChange = (e) => setPaused(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = paused ? 'paused' : 'running';
  }, [paused]);

  const value = useMemo(() => ({ paused }), [paused]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
