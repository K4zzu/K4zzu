import { createContext, useContext } from 'react';

/** Estado global de movimiento: { paused }. Lo provee <MotionProvider>. */
export const MotionContext = createContext({ paused: false });

export const useMotion = () => useContext(MotionContext);
