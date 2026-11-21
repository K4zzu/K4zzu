import { useEffect, useState } from 'react';
import { MotionProvider } from './components/MotionProvider.jsx';
import { trackPointer } from './lib/pointer.js';
import CustomCursor from './components/CustomCursor.jsx';
import Hero from './components/Hero.jsx';
import Projects from './components/Projects.jsx';
import Contact from './components/Contact.jsx';

export default function App() {
  // El proyecto seleccionado se comparte: la terminal (`open <name>`) también lo cambia
  const [project, setProject] = useState(0);

  // Posición del puntero compartida por las tres escenas ASCII
  useEffect(() => trackPointer(), []);

  return (
    <MotionProvider>
      <a className="skip-link" href="#projects">Skip to content</a>
      <CustomCursor />
      <Hero />
      <main>
        <Projects selected={project} onSelect={setProject} />
        <Contact onSelectProject={setProject} />
      </main>
    </MotionProvider>
  );
}
