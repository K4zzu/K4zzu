import { useEffect, useState } from 'react';

const fmt = (d) => d.toTimeString().slice(0, 8);

/** Hora local del visitante. En el HTML pre-renderizado se muestra un marcador neutro. */
export default function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time dateTime={now ? now.toISOString() : undefined}>{now ? fmt(now) : '--:--:--'}</time>;
}
