// Contenido del sitio: se mantiene separado de la presentación para poder editarlo sin tocar componentes.

export const PROFILE = {
  name: 'Juan Manuel',
  handle: 'K4zzu',
  github: 'https://github.com/K4zzu',
  discord: '.k4zu.',
};

export const PROJECTS = [
  {
    id: 'moonsite',
    name: 'MoonSite',
    astro: 'The Moon',
    sub: 'Lunar landing site navigator',
    live: 'https://moonsite.whatbrainy.com',
    repo: 'https://github.com/K4zzu/MoonSite',
    desc: 'Compares lunar landing sites and dates in 3D: where the Sun and Earth sit over the real terrain horizon, and whether a mission gets enough sunlight and Earth-link time. Built for the NASA Space Apps lunar south-pole challenge.',
    stack: ['React', 'Vite', 'Python', 'NASA / JPL data', 'AWS Amplify'],
  },
  {
    id: 'rinnegan',
    name: 'Rinnegan',
    astro: 'Jupiter',
    sub: 'OSINT terminal',
    live: 'https://k4zzu.github.io/Rinnegan/',
    repo: 'https://github.com/K4zzu/Rinnegan',
    desc: 'A terminal-style web app with an animated boot, commands and themes. It queries a separate FastAPI backend for IP, domain, email and username recon.',
    stack: ['React 19', 'Vite', 'Tailwind CSS', 'FastAPI'],
  },
  {
    id: 'nutripae',
    name: 'Nutripae',
    astro: 'Saturn',
    sub: 'Balanced-plate check for school meals',
    live: '',
    repo: 'https://github.com/K4zzu/Nutripae',
    desc: 'A child places a QR card next to the lunch tray; one photo reads the card and the plate and returns a traffic-light verdict in under 10 seconds, while the school keeps a record of what each student was served. Built for the school meal programme (PAE) in Neiva.',
    stack: ['Python', 'FastAPI', 'FastSAM', 'Vision AI', 'SQLite'],
  },
  {
    id: 'nfcpokedex',
    name: 'Nfc_PokeDex',
    astro: 'Iapetus',
    sub: 'Pokédex that scans NFC tags',
    live: 'https://k4zzu.github.io/Nfc_PokeDex/',
    repo: 'https://github.com/K4zzu/Nfc_PokeDex',
    desc: 'A Pokédex that registers Pokémon by scanning NFC tags straight from the browser, with data from PokeAPI, search, pagination and progress saved on the device.',
    stack: ['React', 'Vite', 'Tailwind CSS', 'Web NFC', 'PokeAPI'],
  },
];

// Enlaces sociales: [comando de terminal] -> url, texto, índice del cuerpo en órbita
export const SOCIAL = [
  { id: 'github', label: 'GitHub', url: 'https://github.com/K4zzu', short: 'github.com/K4zzu' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/juan-manuel-sa/', short: 'linkedin.com/in/juan-manuel-sa' },
  { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/juan_manuel.dev', short: 'instagram.com/juan_manuel.dev' },
];

// Saludo del hero, escrito y borrado en bucle: [saludo, nombre, frase] + código de idioma
export const GREETINGS = [
  { lang: 'en', lines: ['Hi, What´s Up!', 'I’m Juan Manuel', 'I’m a developer. What are we building?'] },
  { lang: 'es', lines: ['¡Hola, qué tal!', 'Soy Juan Manuel', 'Soy developer. ¿Qué construiremos?'] },
  { lang: 'pt', lines: ['Olá, tudo bem?', 'Sou Juan Manuel', 'Sou developer. O que vamos construir?'] },
  { lang: 'fr', lines: ['Salut, ça va ?', 'Je suis Juan Manuel', 'Je suis développeur. On construit quoi ?'] },
  { lang: 'de', lines: ['Hallo, wie geht’s?', 'Ich bin Juan Manuel', 'Ich bin Entwickler. Was bauen wir?'] },
  { lang: 'ja', lines: ['やあ、元気？', 'フアン・マヌエルです', '開発者です。何を作りましょう？'] },
];
