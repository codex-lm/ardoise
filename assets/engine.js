// ARDOISE — moteur du Jeu de la vie de Conway.
// Pur (aucun DOM) : utilisé par l'interface et par les tests Node.
/* global window */
(function () {
  'use strict';

  // --- Grille ----------------------------------------------------------------
  // cells : Uint8Array (0/1), next : tampon de calcul, age : génération de
  // survie continue d'une cellule (0 à la naissance). gen : générations écoulées.
  function makeGrid(w, h, seed) {
    const g = {
      w: w, h: h,
      cells: new Uint8Array(w * h),
      next: new Uint8Array(w * h),
      age: new Uint16Array(w * h),
      gen: 0, wrap: false,
      _hashes: [], _hashSet: {}
    };
    if (seed) for (const [x, y] of seed) setCell(g, x, y, 1);
    return g;
  }

  function idx(g, x, y) { return y * g.w + x; }

  function inBounds(g, x, y) { return x >= 0 && y >= 0 && x < g.w && y < g.h; }

  function getCell(g, x, y) { return inBounds(g, x, y) ? g.cells[y * g.w + x] : 0; }

  function setCell(g, x, y, v) {
    if (!inBounds(g, x, y)) return false;
    const i = y * g.w + x;
    if (g.cells[i] === (v ? 1 : 0)) return false;
    g.cells[i] = v ? 1 : 0;
    g.age[i] = 0;
    g._hashes.length = 0; // toute édition invalide les cycles connus
    return true;
  }

  function population(g) {
    let n = 0;
    for (let i = 0; i < g.cells.length; i++) n += g.cells[i];
    return n;
  }

  // Règle B3/S23 : naissance avec 3 voisines, survie avec 2 ou 3.
  // Retourne { births, deaths } pour les effets visuels et les stats.
  function step(g) {
    const w = g.w, h = g.h, cells = g.cells, next = g.next, age = g.age, wrap = g.wrap;
    let births = 0, deaths = 0;
    for (let y = 0; y < h; y++) {
      const yUp = y > 0 ? y - 1 : (wrap ? h - 1 : -1);
      const yDn = y < h - 1 ? y + 1 : (wrap ? 0 : -1);
      const r0 = yUp * w, r1 = y * w, r2 = yDn * w;
      for (let x = 0; x < w; x++) {
        const xL = x > 0 ? x - 1 : (wrap ? w - 1 : -1);
        const xR = x < w - 1 ? x + 1 : (wrap ? 0 : -1);
        let n = 0;
        if (yUp >= 0) {
          if (xL >= 0) n += cells[r0 + xL];
          n += cells[r0 + x];
          if (xR >= 0) n += cells[r0 + xR];
        }
        if (xL >= 0) n += cells[r1 + xL];
        if (xR >= 0) n += cells[r1 + xR];
        if (yDn >= 0) {
          if (xL >= 0) n += cells[r2 + xL];
          n += cells[r2 + x];
          if (xR >= 0) n += cells[r2 + xR];
        }
        const i = r1 + x, alive = cells[i];
        const live = alive ? (n === 2 || n === 3) : (n === 3);
        next[i] = live ? 1 : 0;
        if (live) { if (!alive) births++; } else { if (alive) deaths++; }
      }
    }
    // âges : naissances à 0, survivantes +1
    for (let i = 0; i < next.length; i++) {
      if (next[i]) { age[i] = cells[i] ? Math.min(age[i] + 1, 65535) : 0; }
    }
    g.cells.set(next);
    g.gen++;
    return { births: births, deaths: deaths };
  }

  // Copie indépendante (rejouer un défi).
  function cloneGrid(g) {
    const c = makeGrid(g.w, g.h);
    c.cells.set(g.cells); c.age.set(g.age); c.gen = g.gen; c.wrap = g.wrap;
    return c;
  }

  // --- Détection de cycles (still lifes / oscillateurs) ----------------------
  function fnv(bytes) {
    let h = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i]; h = (h * 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // Enregistre l'état courant ; retourne la période détectée (1 = figure fixe,
  // p >= 2 = oscillateur de période p) ou 0 si aucun cycle.
  function detectCycle(g) {
    const h = fnv(g.cells);
    const key = h;
    const hs = g._hashes;
    // une naissance modifie cells : ne hash que si la population est stable ?
    // non : hash complet ; une grille qui revient identique est un vrai cycle.
    for (let i = hs.length - 1; i >= 0; i--) {
      if (hs[i].h === key) return { period: hs.length - i, atGen: g.gen };
    }
    hs.push({ h: key });
    if (hs.length > 96) hs.shift();
    return null;
  }

  // --- Bibliothèque de motifs ------------------------------------------------
  // Chaque motif : liste de [x, y] (coin haut-gauche à 0,0) + encombrement.
  const PATTERNS = {
    block: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 2, h: 2, kind: 'still' },
    beehive: { cells: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]], w: 4, h: 3, kind: 'still' },
    loaf: { cells: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [3, 2], [2, 3]], w: 4, h: 4, kind: 'still' },
    blinker: { cells: [[0, 0], [1, 0], [2, 0]], w: 3, h: 3, kind: 'osc' },
    toad: { cells: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]], w: 4, h: 2, kind: 'osc' },
    beacon: { cells: [[0, 0], [1, 0], [0, 1], [3, 1], [2, 2], [3, 2]], w: 4, h: 3, kind: 'osc' },
    glider: { cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], w: 3, h: 3, kind: 'ship' },
    lwss: { cells: [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]], w: 5, h: 4, kind: 'ship' },
    pulsar: {
      cells: [[2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
              [0, 2], [5, 2], [7, 2], [12, 2], [0, 3], [5, 3], [7, 3], [12, 3],
              [0, 4], [5, 4], [7, 4], [12, 4],
              [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
              [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
              [0, 8], [5, 8], [7, 8], [12, 8], [0, 9], [5, 9], [7, 9], [12, 9],
              [0, 10], [5, 10], [7, 10], [12, 10],
              [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]],
      w: 13, h: 13, kind: 'osc'
    },
    pentadecathlon: {
      cells: [[1, 0], [1, 1], [1, 2], [1, 3], [0, 4], [2, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11]],
      w: 3, h: 12, kind: 'osc'
    },
    rpentomino: { cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], w: 3, h: 3, kind: 'chaos' },
    acorn: { cells: [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]], w: 7, h: 3, kind: 'chaos' },
    diehard: { cells: [[6, 0], [0, 1], [1, 1], [1, 2], [5, 2], [6, 2], [7, 2]], w: 8, h: 3, kind: 'chaos' },
    gosper: {
      cells: [[0, 4], [0, 5], [1, 4], [1, 5],
              [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8],
              [13, 2], [13, 8],
              [14, 5], [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
              [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5],
              [24, 0], [24, 1], [24, 5], [24, 6],
              [34, 2], [34, 3], [35, 2], [35, 3]],
      w: 36, h: 9, kind: 'gun'
    }
  };

  // Translation d'un motif (coordonnées quelconques).
  function placePattern(g, name, ox, oy) {
    const p = PATTERNS[name];
    if (!p) return 0;
    let n = 0;
    for (const [px, py] of p.cells) { if (setCell(g, ox + px, oy + py, 1)) n++; }
    return n;
  }

  // Rotation 90° horaire d'une liste de cellules autour de son coin.
  function rotateCells(cells) {
    let maxX = 0, maxY = 0;
    for (const [x, y] of cells) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    return cells.map(([x, y]) => [maxY - y, x]);
  }

  // Populations d'un semis : renvoie pop(t) pour t = 0..steps (utile aux tests).
  function simulate(seed, w, h, steps, wrap) {
    const g = makeGrid(w, h, seed);
    g.wrap = !!wrap;
    const pops = [population(g)];
    for (let t = 0; t < steps; t++) { step(g); pops.push(population(g)); }
    return pops;
  }

  const API = {
    makeGrid: makeGrid, setCell: setCell, getCell: getCell, inBounds: inBounds,
    population: population, step: step, cloneGrid: cloneGrid,
    detectCycle: detectCycle, PATTERNS: PATTERNS, placePattern: placePattern,
    rotateCells: rotateCells, simulate: simulate
  };

  if (typeof window !== 'undefined') window.Life = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
