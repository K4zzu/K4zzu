import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { PROJECTS, SOCIAL } from '../data/content.js';

const MAX_LINES = 24;
const QUICK = ['help', 'projects', 'about', 'github', 'linkedin', 'instagram', 'discord'];
const openTab = (url) => window.open(url, '_blank', 'noopener,noreferrer');

/**
 * Terminal de contacto. Usa un <form> con envío nativo: el navegador ya ignora el Enter
 * que confirma una composición IME, así que no hace falta un manejador de keydown.
 * La salida es un role="log" para que los lectores de pantalla anuncien las respuestas.
 */
const Terminal = forwardRef(function Terminal({ onFlash, onSelectProject, onCopyDiscord, runRef }, ref) {
  const [lines, setLines] = useState([{ id: 0, p: '', t: 'type a command or click one below. try: help' }]);
  const [cmd, setCmd] = useState('');
  const logRef = useRef(null);
  const nextId = useRef(1);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  const print = (input, out) => {
    const add = [{ p: '$ ', t: input }, ...out.map((t) => ({ p: '', t }))].map((l) => ({ ...l, id: nextId.current++ }));
    setLines((prev) => prev.concat(add).slice(-MAX_LINES));
  };

  const run = async (raw) => {
    const input = String(raw || '').trim().toLowerCase();
    setCmd('');
    if (!input) return;
    if (input === 'clear') {
      setLines([]);
      return;
    }

    const social = SOCIAL.findIndex((s) => s.id === input);
    if (social !== -1) {
      const s = SOCIAL[social];
      onFlash(social);
      openTab(s.url);
      print(input, [`opening ${s.short} ↗`]);
      return;
    }

    switch (input) {
      case 'discord': {
        onFlash(3);
        const ok = await onCopyDiscord();
        print(input, [`discord: .k4zu.${ok ? '  (copied to clipboard)' : ''}`]);
        return;
      }
      case 'help':
      case 'ls':
        print(input, ['commands: projects · open <name> · about · github · linkedin · instagram · discord · clear']);
        return;
      case 'projects':
        print(input, [...PROJECTS.map((p, i) => `0${i + 1} ${p.id}`), 'open one with: open <name>']);
        return;
      case 'about':
        print(input, [
          'Juan Manuel (K4zzu), developer.',
          'Software + electronics: automation, security, creativity.',
          'Learning cybersecurity, electronics and networking.',
        ]);
        return;
      case 'whoami':
        print(input, ['K4zzu — Juan Manuel']);
        return;
      default:
        break;
    }

    if (input === 'open' || input.startsWith('open ')) {
      const q = input.slice(4).replace(/[^a-z0-9]/g, '');
      const p = q && PROJECTS.find((pr) => pr.id.includes(q));
      if (p) {
        onSelectProject(PROJECTS.indexOf(p));
        openTab(p.live || p.repo);
        print(input, [`opening ${p.name} ↗`]);
      } else {
        print(input, ['usage: open moonsite | rinnegan | nutripae | pokedex']);
      }
      return;
    }

    print(input, [`command not found: ${input} — try help`]);
  };

  // Permite que otros controles (el botón Discord en órbita) ejecuten comandos
  useLayoutEffect(() => {
    if (runRef) runRef.current = run;
  });

  const onSubmit = (e) => {
    e.preventDefault();
    run(cmd);
  };

  return (
    <div ref={ref} className="terminal panel">
      <div className="panel__bar">
        <span>k4zzu@blackhole: ~</span>
        <span>contact</span>
      </div>
      <div ref={logRef} className="terminal__log" role="log" aria-live="polite" aria-label="Terminal output" tabIndex={0}>
        {lines.map((ln) => (
          <div key={ln.id} className="terminal__line">
            <span className="prompt">{ln.p}</span>
            {ln.t}
          </div>
        ))}
      </div>
      <form className="terminal__form" onSubmit={onSubmit}>
        <label htmlFor="terminal-input" className="prompt">
          <span aria-hidden="true">$</span>
          <span className="visually-hidden">Terminal command</span>
        </label>
        <input
          id="terminal-input"
          name="command"
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="type a command…"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          enterKeyHint="go"
        />
        <button type="submit" className="terminal__run">run</button>
      </form>
      <div className="terminal__quick" role="group" aria-label="Quick commands">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => run(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});

export default Terminal;
