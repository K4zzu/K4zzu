import { createContext, useContext } from 'react';

/** Estado global de movimiento: { paused, toggle }. Lo provee <MotionProvider>. */
export const MotionContext = createContext({ paused: false, toggle: () => {} });

export const useMotion = () => useContext(MotionContext);
