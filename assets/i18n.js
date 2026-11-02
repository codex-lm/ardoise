// ARDOISE — interface trilingue : anglais (défaut), français, espagnol.
// Les clés sont identiques par langue ; {x} = paramètre injecté.
/* global window */
(function () {
  'use strict';

  const STR = {
    en: {
      langName: 'English',
      tagline: 'Conway’s Game of Life, on a school blackboard',
      subtitle: 'Twelve chalk challenges and a free sandbox for the oldest cellular automaton of them all.',
      credit: 'A game by Cédric Bernadac, created with AI agents (ZCode & Kimi K3.1 Pro).',
      homage: 'After John Horton Conway, 1937–2020.',
      play: 'Challenges',
      sandbox: 'Sandbox',
      howto: 'How to play',
      touchHint: 'Works with mouse, pen or touch. Space pauses, S steps one generation.',
      langNext: 'FR',
      // Règles (HTML)
      rulesHtml: '<p><b>The rule is one line long.</b> A dead cell with exactly 3 living neighbours is <i>born</i>. A living cell with 2 or 3 neighbours <i>survives</i>. Everything else dies. That’s all — everything else is consequence.</p>' +
        '<p><b>Challenges.</b> Each challenge gives you a colony and a chalk budget. Set the board while life is paused (each tap flips one cell and costs one chalk stroke), then let life run to the bell:</p>' +
        '<ul>' +
        '<li><b>Balance</b> — reach exactly {n} living cells when the bell rings at generation {g}.</li>' +
        '<li><b>Rescue</b> — the colony is doomed: add up to {k} cells so that at least {n} cells are alive at generation {g}.</li>' +
        '<li><b>Black out</b> — erase up to {k} cells so the board is completely empty before generation {g}.</li>' +
        '<li><b>Growth</b> — place exactly {b} cells inside the chalk zone, then run: the biggest population at generation {g} wins the stars.</li>' +
        '</ul>' +
        '<p><b>Sandbox.</b> A big board, a speed dial, wrap-around, and a library of famous patterns: gliders, spaceships, the pulsar, even Gosper’s glider gun. Young chalk is white, old chalk turns yellow, and dead cells leave a faint smudge before fading.</p>' +
        '<p>★★★ rewards the tightest solutions. The bell always rings — be ready.</p>',
      // HUD défi
      level: 'Challenge {n}/{total}',
      budget: 'Chalk {left}',
      gen: 'Gen {n}',
      bellIn: 'Bell in {n}',
      bellNow: 'Bell!',
      pop: '{n} cells',
      paused: 'Paused',
      running: 'Running',
      setup: 'Set the board',
      goal: 'Goal',
      stars3: '★★★ {t} strokes',
      stars2: '★★ {t} strokes',
      starsG3: '★★★ {s}+ cells',
      starsG2: '★★ {s}+ cells',
      starsG1: '★ {s}+ cells',
      hintBtn: 'Hint',
      restart: 'Restart',
      menu: 'Menu',
      playBtn: 'Run',
      pauseBtn: 'Pause',
      stepBtn: 'Step',
      draw: 'Chalk',
      erase: 'Sponge',
      runBell: 'Ring the bell',
      // Objectifs par type
      typeTarget: 'Balance',
      typeRescue: 'Rescue',
      typeExtinct: 'Black out',
      typeGrowth: 'Growth',
      goalTarget: 'Exactly {n} living cells at generation {g}.',
      goalRescue: 'At least {n} living cells at generation {g}.',
      goalExtinct: 'An empty board before generation {g}.',
      goalGrowth: 'Place exactly {b} cells in the zone, reach the biggest population at generation {g}.',
      placed: '{n}/{b} placed',
      // Fin de défi
      winTitle: 'Bell rings — well played!',
      failTitle: 'The bell rang…',
      winTarget: 'Exactly {n} cells. Precise as chalk.',
      winRescue: '{n} cells alive at the bell. The colony is saved.',
      winExtinct: 'A clean board at generation {g}.',
      failBody: 'The goal was missed. Chalk it up and try again.',
      usedStrokes: '{n} chalk strokes',
      bestPop: 'Population at the bell: {n}',
      hintUsed: 'Hint used — one star docked',
      next: 'Next challenge',
      again: 'Try again',
      backMenu: 'Back to menu',
      allDone: 'All twelve challenges cleared. The blackboard is yours!',
      // Sandbox
      sbTitle: 'Sandbox',
      sbHint: 'Pick a pattern, tap the board to stamp it (R rotates). Or draw freehand with the chalk and the sponge.',
      speed: 'Speed',
      gens: '{n} gen/s',
      clear: 'Wipe',
      random: 'Sprinkle',
      wrap: 'Wrap edges',
      statusActive: 'Active',
      statusStill: 'Still life',
      statusOsc: 'Oscillator, period {n}',
      statusDead: 'Empty board',
      confirmWipe: 'Wipe the whole board?',
      wiped: 'Board wiped',
      // Toasts
      noChalk: 'No chalk left',
      noEditRun: 'Pause life to edit the board',
      growthNeed: 'Place exactly {b} cells before running',
      zoneOnly: 'Cells only inside the chalk zone',
      eraseOnly: 'This challenge is won with the sponge only',
      drawOnly: 'This challenge is won with chalk only',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      close: 'Close',
      gotIt: 'Got it',
      // Motifs (atelier)
      pat_still: 'Still lifes',
      pat_osc: 'Oscillators',
      pat_ship: 'Spaceships',
      pat_chaos: 'Chaos',
      pat_gun: 'Guns',
      pat_block: 'Block',
      pat_beehive: 'Beehive',
      pat_loaf: 'Loaf',
      pat_blinker: 'Blinker',
      pat_toad: 'Toad',
      pat_beacon: 'Beacon',
      pat_glider: 'Glider',
      pat_lwss: 'Lightweight ship',
      pat_pulsar: 'Pulsar',
      pat_pentadecathlon: 'Pentadecathlon',
      pat_rpentomino: 'R-pentomino',
      pat_acorn: 'Acorn',
      pat_diehard: 'Diehard',
      pat_gosper: 'Gosper gun'
    },

    fr: {
      langName: 'Français',
      tagline: 'Le Jeu de la vie de Conway, sur un tableau d’école',
      subtitle: 'Douze défis à la craie et un atelier libre pour le plus célèbre automate cellulaire.',
      credit: 'Un jeu de Cédric Bernadac, créé avec des agents IA (ZCode & Kimi K3.1 Pro).',
      homage: 'D’après John Horton Conway, 1937–2020.',
      play: 'Défis',
      sandbox: 'Atelier',
      howto: 'Comment jouer',
      touchHint: 'Souris, stylet ou tactile. Espace met en pause, S avance d’une génération.',
      langNext: 'ES',
      rulesHtml: '<p><b>La règle tient en une ligne.</b> Une case morte entourée d’exactement 3 voisines vivantes <i>naît</i>. Une cellule vivante entourée de 2 ou 3 voisines <i>survit</i>. Tout le reste meurt. C’est tout — le reste n’est que conséquence.</p>' +
        '<p><b>Les défis.</b> Chaque défi vous donne une colonie et un budget de craie. Préparez le plateau pendant que la vie est en pause (chaque toucher bascule une case et coûte un trait de craie), puis laissez la vie courir jusqu’à la cloche :</p>' +
        '<ul>' +
        '<li><b>Équilibre</b> — atteindre exactement {n} cellules vivantes quand la cloche sonne à la génération {g}.</li>' +
        '<li><b>Sauvetage</b> — la colonie est condamnée : ajoutez jusqu’à {k} cellules pour qu’au moins {n} cellules soient vivantes à la génération {g}.</li>' +
        '<li><b>Extinction</b> — effacez jusqu’à {k} cellules pour que le tableau soit entièrement vide avant la génération {g}.</li>' +
        '<li><b>Croissance</b> — posez exactement {b} cellules dans la zone à la craie, puis lancez : la plus grande population à la génération {g} gagne les étoiles.</li>' +
        '</ul>' +
        '<p><b>L’atelier.</b> Une grande planche, un réglage de vitesse, les bords qui se rejoignent, et une bibliothèque de motifs célèbres : planeurs, vaisseaux, pulsar, jusqu’au canon à planeurs de Gosper. La craie jeune est blanche, la craie ancienne jaunit, et les cellules mortes laissent une traînée qui s’efface.</p>' +
        '<p>★★★ récompense les solutions les plus économes. La cloche sonne toujours — soyez prêt.</p>',
      level: 'Défi {n}/{total}',
      budget: 'Craie {left}',
      gen: 'Gén. {n}',
      bellIn: 'Cloche dans {n}',
      bellNow: 'Cloche !',
      pop: '{n} cellules',
      paused: 'Pause',
      running: 'En cours',
      setup: 'Préparez le plateau',
      goal: 'Objectif',
      stars3: '★★★ {t} traits',
      stars2: '★★ {t} traits',
      starsG3: '★★★ {s}+ cellules',
      starsG2: '★★ {s}+ cellules',
      starsG1: '★ {s}+ cellules',
      hintBtn: 'Indice',
      restart: 'Recommencer',
      menu: 'Menu',
      playBtn: 'Lancer',
      pauseBtn: 'Pause',
      stepBtn: 'Pas à pas',
      draw: 'Craie',
      erase: 'Éponge',
      runBell: 'Sonner la cloche',
      typeTarget: 'Équilibre',
      typeRescue: 'Sauvetage',
      typeExtinct: 'Extinction',
      typeGrowth: 'Croissance',
      goalTarget: 'Exactement {n} cellules vivantes à la génération {g}.',
      goalRescue: 'Au moins {n} cellules vivantes à la génération {g}.',
      goalExtinct: 'Un tableau vide avant la génération {g}.',
      goalGrowth: 'Posez exactement {b} cellules dans la zone, atteignez la plus grande population à la génération {g}.',
      placed: '{n}/{b} posées',
      winTitle: 'La cloche sonne — bien joué !',
      failTitle: 'La cloche a sonné…',
      winTarget: 'Exactement {n} cellules. Précis comme la craie.',
      winRescue: '{n} cellules vivantes à la cloche. La colonie est sauvée.',
      winExtinct: 'Tableau nettoyé à la génération {g}.',
      failBody: 'L’objectif est manqué. Effacez et réessayez.',
      usedStrokes: '{n} traits de craie',
      bestPop: 'Population à la cloche : {n}',
      hintUsed: 'Indice utilisé — une étoile en moins',
      next: 'Défi suivant',
      again: 'Réessayer',
      backMenu: 'Retour au menu',
      allDone: 'Les douze défis sont réussis. Le tableau est à vous !',
      sbTitle: 'Atelier',
      sbHint: 'Choisissez un motif, touchez le tableau pour le tamponner (R tourne). Ou dessinez à main levée avec la craie et l’éponge.',
      speed: 'Vitesse',
      gens: '{n} gén./s',
      clear: 'Effacer',
      random: 'Saupoudrer',
      wrap: 'Bords rejoints',
      statusActive: 'Actif',
      statusStill: 'Figure fixe',
      statusOsc: 'Oscillateur, période {n}',
      statusDead: 'Tableau vide',
      confirmWipe: 'Effacer tout le tableau ?',
      wiped: 'Tableau effacé',
      noChalk: 'Plus de craie',
      noEditRun: 'Mettez la vie en pause pour modifier',
      growthNeed: 'Posez exactement {b} cellules avant de lancer',
      zoneOnly: 'Cellules uniquement dans la zone à la craie',
      eraseOnly: 'Ce défi se gagne à l’éponge seulement',
      drawOnly: 'Ce défi se gagne à la craie seulement',
      soundOn: 'Son activé',
      soundOff: 'Son coupé',
      close: 'Fermer',
      gotIt: 'Compris',
      // Motifs (atelier)
      pat_still: 'Figures fixes',
      pat_osc: 'Oscillateurs',
      pat_ship: 'Vaisseaux',
      pat_chaos: 'Chaos',
      pat_gun: 'Canons',
      pat_block: 'Bloc',
      pat_beehive: 'Ruche',
      pat_loaf: 'Miche',
      pat_blinker: 'Clignotant',
      pat_toad: 'Crapaud',
      pat_beacon: 'Balise',
      pat_glider: 'Planeur',
      pat_lwss: 'Vaisseau léger',
      pat_pulsar: 'Pulsar',
      pat_pentadecathlon: 'Pentadécathlon',
      pat_rpentomino: 'R-pentomino',
      pat_acorn: 'Gland',
      pat_diehard: 'Coriace',
      pat_gosper: 'Canon de Gosper'
    },

    es: {
      langName: 'Español',
      tagline: 'El Juego de la Vida de Conway, en una pizarra de colegio',
      subtitle: 'Doce retos con tiza y un taller libre para el autómata celular más célebre.',
      credit: 'Un juego de Cédric Bernadac, creado con agentes de IA (ZCode & Kimi K3.1 Pro).',
      homage: 'Según John Horton Conway, 1937–2020.',
      play: 'Retos',
      sandbox: 'Taller',
      howto: 'Cómo jugar',
      touchHint: 'Ratón, lápiz o táctil. Espacio pausa, S avanza una generación.',
      langNext: 'EN',
      rulesHtml: '<p><b>La regla cabe en una línea.</b> Una casilla muerta con exactamente 3 vecinas vivas <i>nace</i>. Una célula viva con 2 o 3 vecinas <i>sobrevive</i>. Todo lo demás muere. Eso es todo — el resto es consecuencia.</p>' +
        '<p><b>Los retos.</b> Cada reto te da una colonia y un presupuesto de tiza. Prepara el tablero mientras la vida está en pausa (cada toque cambia una casilla y cuesta un trazo de tiza), luego deja correr la vida hasta la campana:</p>' +
        '<ul>' +
        '<li><b>Equilibrio</b> — alcanzar exactamente {n} células vivas cuando la campana suene en la generación {g}.</li>' +
        '<li><b>Rescate</b> — la colonia está condenada: añade hasta {k} células para que al menos {n} células estén vivas en la generación {g}.</li>' +
        '<li><b>Apagón</b> — borra hasta {k} células para que el tablero quede completamente vacío antes de la generación {g}.</li>' +
        '<li><b>Crecimiento</b> — coloca exactamente {b} células dentro de la zona de tiza y lanza: la población más grande en la generación {g} gana las estrellas.</li>' +
        '</ul>' +
        '<p><b>El taller.</b> Un tablero grande, un mando de velocidad, bordes que se unen y una biblioteca de patrones famosos: planeadores, naves, el púlsar, hasta el cañón de planeadores de Gosper. La tiza joven es blanca, la tiza antigua se vuelve amarilla, y las células muertas dejan un rastro que se borra solo.</p>' +
        '<p>★★★ premia las soluciones más ajustadas. La campana siempre suena —estate listo.</p>',
      level: 'Reto {n}/{total}',
      budget: 'Tiza {left}',
      gen: 'Gen. {n}',
      bellIn: 'Campana en {n}',
      bellNow: '¡Campana!',
      pop: '{n} células',
      paused: 'En pausa',
      running: 'En marcha',
      setup: 'Prepara el tablero',
      goal: 'Objetivo',
      stars3: '★★★ {t} trazos',
      stars2: '★★ {t} trazos',
      starsG3: '★★★ {s}+ células',
      starsG2: '★★ {s}+ células',
      starsG1: '★ {s}+ células',
      hintBtn: 'Pista',
      restart: 'Reiniciar',
      menu: 'Menú',
      playBtn: 'Lanzar',
      pauseBtn: 'Pausa',
      stepBtn: 'Paso a paso',
      draw: 'Tiza',
      erase: 'Borrador',
      runBell: 'Tocar la campana',
      typeTarget: 'Equilibrio',
      typeRescue: 'Rescate',
      typeExtinct: 'Apagón',
      typeGrowth: 'Crecimiento',
      goalTarget: 'Exactamente {n} células vivas en la generación {g}.',
      goalRescue: 'Al menos {n} células vivas en la generación {g}.',
      goalExtinct: 'Un tablero vacío antes de la generación {g}.',
      goalGrowth: 'Coloca exactamente {b} células en la zona, alcanza la mayor población en la generación {g}.',
      placed: '{n}/{b} colocadas',
      winTitle: 'Suena la campana — ¡bien jugado!',
      failTitle: 'La campana sonó…',
      winTarget: 'Exactamente {n} células. Preciso como la tiza.',
      winRescue: '{n} células vivas a la campana. La colonia está a salvo.',
      winExtinct: 'Tablero limpio en la generación {g}.',
      failBody: 'El objetivo se escapó. Borra y vuelve a intentarlo.',
      usedStrokes: '{n} trazos de tiza',
      bestPop: 'Población a la campana: {n}',
      hintUsed: 'Pista usada — una estrella menos',
      next: 'Siguiente reto',
      again: 'Reintentar',
      backMenu: 'Volver al menú',
      allDone: 'Los doce retos superados. ¡La pizarra es tuya!',
      sbTitle: 'Taller',
      sbHint: 'Elige un patrón, toca el tablero para estamparlo (R lo gira). O dibuja a mano alzada con la tiza y el borrador.',
      speed: 'Velocidad',
      gens: '{n} gen/s',
      clear: 'Borrar todo',
      random: 'Espolvorear',
      wrap: 'Bordes unidos',
      statusActive: 'Activo',
      statusStill: 'Figura fija',
      statusOsc: 'Oscilador, período {n}',
      statusDead: 'Tablero vacío',
      confirmWipe: '¿Borrar todo el tablero?',
      wiped: 'Tablero borrado',
      noChalk: 'No queda tiza',
      noEditRun: 'Pausa la vida para editar',
      growthNeed: 'Coloca exactamente {b} células antes de lanzar',
      zoneOnly: 'Células solo dentro de la zona de tiza',
      eraseOnly: 'Este reto se gana solo con el borrador',
      drawOnly: 'Este reto se gana solo con la tiza',
      soundOn: 'Sonido activado',
      soundOff: 'Sonido apagado',
      close: 'Cerrar',
      gotIt: 'Entendido',
      // Motifs (taller)
      pat_still: 'Figuras fijas',
      pat_osc: 'Osciladores',
      pat_ship: 'Naves',
      pat_chaos: 'Caos',
      pat_gun: 'Cañones',
      pat_block: 'Bloque',
      pat_beehive: 'Colmena',
      pat_loaf: 'Pan',
      pat_blinker: 'Parpadeador',
      pat_toad: 'Sapo',
      pat_beacon: 'Baliza',
      pat_glider: 'Planeador',
      pat_lwss: 'Nave ligera',
      pat_pulsar: 'Púlsar',
      pat_pentadecathlon: 'Pentadecatlón',
      pat_rpentomino: 'R-pentominó',
      pat_acorn: 'Bellota',
      pat_diehard: 'Duro de matar',
      pat_gosper: 'Cañón de Gosper'
    }
  };

  const ORDER = ['en', 'fr', 'es'];
  let current = 'en';
  try {
    const saved = sessionStorage.getItem('ardoise-lang');
    if (saved && STR[saved]) current = saved;
  } catch (e) { /* stockage indisponible : défaut */ }

  function setLang(code) {
    if (!STR[code]) return;
    current = code;
    try { sessionStorage.setItem('ardoise-lang', code); } catch (e) { /* idem */ }
    document.documentElement.setAttribute('lang', code);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const k = el.getAttribute('data-i18n');
      const v = STR[code][k];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const k = el.getAttribute('data-i18n-placeholder');
      const v = STR[code][k];
      if (typeof v === 'string') el.setAttribute('aria-label', v);
    });
  }

  function t(key, params) {
    let s = STR[current][key] !== undefined ? STR[current][key] : STR.en[key];
    if (s === undefined) return key;
    if (params) {
      Object.keys(params).forEach(function (p) {
        s = s.split('{' + p + '}').join(String(params[p]));
      });
    }
    return s;
  }

  const API = {
    STR: STR, ORDER: ORDER,
    get lang() { return current; },
    setLang: setLang, t: t,
    cycle: function () {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      setLang(next);
      return next;
    }
  };

  if (typeof window !== 'undefined') window.I18N = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
