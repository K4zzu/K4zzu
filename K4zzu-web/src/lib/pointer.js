// Estado global del puntero compartido por todas las escenas ASCII.
// Se guarda fuera de React a propósito: se lee en cada frame y no debe provocar renders.
export const pointer = {
  x: 0,
  y: 0,
  inside: false,
  /** Se incrementa con cada pulsación; cada escena compara con el último valor que vio. */
  downSeq: 0,
};

/** Instala los listeners una sola vez. Devuelve la función de limpieza. */
export function trackPointer({ onMove, onLeave } = {}) {
  const move = (e) => {
    pointer.inside = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    onMove?.(e);
  };
  const down = () => {
    pointer.downSeq++;
  };
  const leave = () => {
    pointer.inside = false;
    onLeave?.();
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', down, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerdown', down);
    document.documentElement.removeEventListener('pointerleave', leave);
  };
}
