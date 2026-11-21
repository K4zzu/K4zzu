import { useEffect, useRef } from 'react';

/**
 * Cursor tipo terminal: "+" sobre el fondo y "[↗]" sobre enlaces y botones.
 * Sólo se activa con un puntero fino (ratón); en táctil no se muestra.
 * Los campos de texto conservan su cursor nativo (ver global.css).
 */
export default function CustomCursor() {
  const dotRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const root = document.documentElement;
    let enabled = false;

    const onMove = (e) => {
      const dot = dotRef.current;
      if (!dot || e.pointerType !== 'mouse' || !fine.matches) return;
      if (!enabled) {
        enabled = true;
        root.classList.add('k4-cursor');
      }
      const link = e.target instanceof Element && e.target.closest('a, button');
      const text = link ? '[↗]' : '+';
      if (dot.textContent !== text) dot.textContent = text;
      dot.dataset.link = link ? 'true' : 'false';
      dot.style.opacity = 1;
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    };
    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.classList.remove('k4-cursor');
    };
  }, []);

  return <div ref={dotRef} className="cursor-dot" aria-hidden="true" />;
}
