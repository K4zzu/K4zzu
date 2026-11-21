import { useMemo, useRef } from 'react';
import { inViewport, sceneWidth, SCENE_H, updateSceneMouse } from '../lib/scene.js';

/**
 * Envuelve uno de los renderers ASCII (agujero negro, planeta, sistema):
 * crea el renderer con el ancho adecuado, lo recrea si cambia el aspecto del canvas,
 * sincroniza el puntero y avanza los fotogramas.
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {object} cfg
 * @param {Function} cfg.create   createXRenderer(canvas, opts)
 * @param {object}   [cfg.extra]  objetos mutables que el renderer lee cada fotograma (system, centre…)
 * @param {boolean}  [cfg.resetOnResize=true] reinicia la animación de entrada al recrear
 * @param {number}   [cfg.stillFrame=150] fotograma usado como imagen estática en pausa
 */
export function useAsciiScene(canvasRef, { create, extra, resetOnResize = true, stillFrame = 150 }) {
  const state = useRef(null);
  if (!state.current) state.current = { r: null, cv: null, W: 0, f: 0, seen: 0, ms: { x: 0, y: 0, a: 0 } };

  // `create`, `extra` y el resto son estables durante la vida del componente.
  return useMemo(() => {
    const st = state.current;

    const ensure = (requireVisible) => {
      const cv = canvasRef.current;
      if (!cv?.isConnected) return null;
      const rect = cv.getBoundingClientRect();
      if (requireVisible ? !inViewport(rect) : rect.height < 10) return null;
      const W = sceneWidth(rect.width, rect.height);
      if (!st.r || st.cv !== cv || st.W !== W) {
        cv.width = W;
        cv.height = SCENE_H;
        st.W = W;
        st.cv = cv;
        if (resetOnResize) st.f = 0;
        const opts = { width: W, trail: 0.4, glow: true, showHud: true, mouse: st.ms, ...extra };
        st.r = create(cv, () => opts);
      }
      return rect;
    };

    return {
      /** Avanza un fotograma. `isMouseActive(rect)` decide si el puntero afecta la escena. */
      frame(isMouseActive) {
        const rect = ensure(true);
        if (!rect) return;
        st.seen = updateSceneMouse(st.ms, rect, st.W, st.seen, isMouseActive(rect));
        st.r.renderAt(st.f++);
      },
      /** Dibuja un fotograma estático ya "asentado" (modo pausa / movimiento reducido). */
      still() {
        if (!ensure(false)) return;
        st.ms.a = 0;
        st.f = Math.max(st.f, stillFrame);
        // Unos pocos fotogramas para que la estela (trail) del estado anterior se desvanezca
        for (let k = 0; k < 6; k++) st.r.renderAt(st.f++);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
