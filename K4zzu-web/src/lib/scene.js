import { pointer } from './pointer.js';

// Las escenas se dibujan en una rejilla fija de 960 px de alto con celdas de 7 px de ancho.
export const SCENE_H = 960;

/** Ancho interno del canvas para que la rejilla ASCII cubra el aspecto del elemento. */
export function sceneWidth(width, height) {
  const cols = Math.ceil((SCENE_H * (width / Math.max(1, height))) / 7 / 2) * 2;
  return Math.max(60, Math.min(400, cols)) * 7 + 2;
}

/** ¿El rectángulo está (al menos en parte) dentro del viewport? */
export function inViewport(rect) {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.height >= 10;
}

/**
 * Traduce la posición del puntero a coordenadas de escena (object-fit: cover) y
 * suaviza la "presencia" del puntero (m.a), que los renderers usan para el efecto de salpicadura.
 * Devuelve el nuevo valor de `seenDown` (pulsación vista por última vez).
 */
export function updateSceneMouse(m, rect, W, seenDown, isActive) {
  const sc = Math.max(rect.width / W, rect.height / SCENE_H);
  const cx = (pointer.x - rect.left - (rect.width - W * sc) / 2) / sc;
  const cy = (pointer.y - rect.top - (rect.height - SCENE_H * sc) / 2) / sc;
  m.x = (cx / W - 0.5) * (W / SCENE_H);
  m.y = cy / SCENE_H - 0.5;
  if (pointer.downSeq !== seenDown) m.a = 2; // pulsación: onda expansiva más grande
  m.a += ((pointer.inside && isActive ? 1 : 0) - m.a) * 0.12;
  return pointer.downSeq;
}

/** Limita una tarea a `fps` fotogramas por segundo dentro de un bucle rAF más rápido. */
export function frameGate(fps = 30) {
  const interval = 1000 / fps;
  let last = 0;
  let acc = 0;
  return (now) => {
    acc += Math.min(100, now - (last || now));
    last = now;
    if (acc < interval) return false;
    acc %= interval;
    return true;
  };
}

/** Interpolación suave tipo smoothstep entre 0 y 1. */
export const smooth = (k) => k * k * (3 - 2 * k);
