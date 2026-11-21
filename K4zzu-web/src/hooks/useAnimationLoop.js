import { useEffect, useLayoutEffect, useRef } from 'react';

const supportsContentVisibility = () =>
  typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style;

/**
 * Ejecuta `step(now)` en cada requestAnimationFrame mientras el elemento esté cerca del viewport
 * y la animación no esté en pausa.
 *
 * - Si el elemento usa `content-visibility: auto`, se pausa/reanuda con
 *   `contentvisibilityautostatechange` (ligado al ciclo de render del navegador).
 * - Si no (o el navegador no lo soporta), usa IntersectionObserver con margen de 200 px.
 * - En pausa llama a `still()` una vez para dejar dibujado un fotograma estático.
 */
export function useAnimationLoop(targetRef, { step, still, paused }) {
  const stepRef = useRef(step);
  const stillRef = useRef(still);
  useLayoutEffect(() => {
    stepRef.current = step;
    stillRef.current = still;
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    if (paused) {
      // Esperar a que el layout esté listo para medir el canvas.
      const id = requestAnimationFrame(() => stillRef.current?.());
      const onResize = () => stillRef.current?.();
      window.addEventListener('resize', onResize);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener('resize', onResize);
      };
    }

    let raf = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      stepRef.current(now);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const usesCV =
      supportsContentVisibility() && getComputedStyle(el).contentVisibility === 'auto';
    let cleanup;
    if (usesCV) {
      // El evento no burbujea en todos los navegadores: se escucha en el propio elemento.
      const onState = (e) => (e.skipped ? stop() : start());
      el.addEventListener('contentvisibilityautostatechange', onState);
      cleanup = () => el.removeEventListener('contentvisibilityautostatechange', onState);
      start();
    } else {
      const io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { rootMargin: '200px' },
      );
      io.observe(el);
      cleanup = () => io.disconnect();
    }

    return () => {
      stop();
      cleanup();
    };
  }, [targetRef, paused]);
}
