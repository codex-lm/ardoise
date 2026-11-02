// ARDOISE — interface : défis, atelier, rendu craie sur canvas, i18n.
/* global Life, Levels, I18N, Sfx */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utilitaires
  const $ = function (id) { return document.getElementById(id); };
  const t = function (k, p) { return I18N.t(k, p); };
  const clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

  const store = {
    get: function (k, d) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privé */ } }
  };

  // ---------------------------------------------------------------- état global
  const S = {
    mode: 'home',            // home | challenge | sandbox
    levelIx: 0,              // index du défi courant
    grid: null,              // grille Life affichée
    baseSeed: null,          // semis initial du défi (cellules)
    phase: 'setup',          // setup | run | done
    running: false,
    speed: 12,               // gén./s (atelier)
    tool: 'draw',            // draw | erase
    stamp: null,             // nom du motif sélectionné (atelier)
    stampRot: 0,
    strokes: 0,              // traits de craie consommés (défi)
    hintUsed: false,
    hintUntil: 0,            // affichage de la solution de référence
    hintCells: null,
    placed: 0,               // cellules posées (croissance)
    popHist: [],             // historique population (sparkline)
    cycleInfo: null,
    lastStepAt: 0,
    bellFlash: 0,
    wipeArmed: 0,
    pinch: null                  // état du pincement en cours (atelier)
  };

  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const sparkC = $('spark');
  const sparkX = sparkC.getContext('2d');

  // géométrie : taille logique de cellule et décalages
  let cellPx = 16, dpr = 1, cssW = 0, cssH = 0, offX = 0, offY = 0;
  let bg = null;             // canvas hors écran (fond statique)
  let sprites = [];          // sprites craie [bucket][variant]
  const GHOSTS = [];
  const DUST = [];

  // Vue exploratoire (atelier) : zoom + caméra en pixels monde.
  const SB_CELL = 6;         // taille logique d'une cellule sur le grand tableau
  const VIEW = { zoom: 1, camX: 0, camY: 0, minZ: 0.35, maxZ: 8 };
  function viewActive() { return S.mode === 'sandbox' && !!S.grid; }
  function worldW() { return S.grid ? S.grid.w * cellPx : cssW; }
  function worldH() { return S.grid ? S.grid.h * cellPx : cssH; }

  function clampView() {
    const z = VIEW.zoom, w = worldW(), h = worldH();
    const visW = cssW / z, visH = cssH / z;
    const mx = Math.max(60, w * 0.12), my = Math.max(60, h * 0.12);
    VIEW.camX = clamp(VIEW.camX, -mx, Math.max(-mx, w - visW + mx));
    VIEW.camY = clamp(VIEW.camY, -my, Math.max(-my, h - visH + my));
  }

  function zoomAt(sx, sy, factor) {
    const z0 = VIEW.zoom;
    const z1 = clamp(z0 * factor, VIEW.minZ, VIEW.maxZ);
    if (z1 === z0) return;
    const wx = VIEW.camX + sx / z0, wy = VIEW.camY + sy / z0;
    VIEW.zoom = z1;
    VIEW.camX = wx - sx / z1;
    VIEW.camY = wy - sy / z1;
    clampView();
  }

  function centerView() {
    const w = worldW(), h = worldH();
    VIEW.zoom = clamp(Math.min(cssW / w, cssH / h), VIEW.minZ, 1.4);
    VIEW.camX = (w - cssW / VIEW.zoom) / 2;
    VIEW.camY = (h - cssH / VIEW.zoom) / 2;
    clampView();
  }

  // ---------------------------------------------------------------- dimensions
  function boardArea() {
    const frame = $('board-frame');
    const availW = Math.min(frame.parentElement.clientWidth, 1020) - 24 - 24;
    const availH = Math.max(240, window.innerHeight * 0.52);
    return { w: Math.max(240, availW), h: availH };
  }

  function layout() {
    if (!S.grid) return;
    const a = boardArea();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (S.mode === 'sandbox') {
      // grand tableau exploratoire : cellule logique fixe, canvas = zone visible
      cellPx = SB_CELL;
      cssW = a.w;
      cssH = a.h;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      makeSprites();
      paintBackground();
      clampView();
    } else {
      cellPx = clamp(Math.floor(Math.min(a.w / S.grid.w, a.h / S.grid.h)), 4, 34);
      cssW = cellPx * S.grid.w;
      cssH = cellPx * S.grid.h;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      offX = 0; offY = 0;
      makeSprites();
      paintBackground();
    }
  }

  // ---------------------------------------------------------------- sprites craie
  const BUCKETS = [
    { c: '#fdfcf5', a: 1.0 },   // 0 gén — craie toute neuve
    { c: '#f6f2e2', a: 0.95 },  // 1
    { c: '#efe8d0', a: 0.92 },  // 2-3
    { c: '#e9dcb2', a: 0.9 },   // 4-7
    { c: '#e8d44d', a: 0.92 }   // 8+ — craie ancienne, jaune
  ];

  function bucketOf(age) {
    if (age <= 0) return 0;
    if (age === 1) return 1;
    if (age <= 3) return 2;
    if (age <= 7) return 3;
    return 4;
  }

  function makeSprites() {
    sprites = [];
    const px = Math.max(4, Math.round(cellPx) - (cellPx > 7 ? 1 : 0));
    for (let b = 0; b < BUCKETS.length; b++) {
      const row = [];
      for (let v = 0; v < 4; v++) {
        const c = document.createElement('canvas');
        c.width = Math.max(4, Math.round(cellPx * dpr));
        c.height = c.width;
        const x = c.getContext('2d');
        const s = c.width / cellPx;
        x.scale(s, s);
        const inset = cellPx > 7 ? 1 : 0.5;
        const w = cellPx - inset * 2;
        const r = Math.min(3, w / 4);
        // grain de craie : la forme est pleine puis mordillée par des trous
        x.fillStyle = BUCKETS[b].c;
        x.globalAlpha = BUCKETS[b].a;
        x.beginPath();
        x.moveTo(inset + r, inset);
        x.arcTo(inset + w, inset, inset + w, inset + w, r);
        x.arcTo(inset + w, inset + w, inset, inset + w, r);
        x.arcTo(inset, inset + w, inset, inset, r);
        x.arcTo(inset, inset, inset + w, inset, r);
        x.closePath();
        x.fill();
        // aspérités : petits trous soustraits
        x.globalCompositeOperation = 'destination-out';
        const rnd = mulberry(b * 17 + v * 101 + 7);
        const holes = Math.max(2, Math.round(cellPx / 2.2));
        for (let i = 0; i < holes; i++) {
          const hx = inset + rnd() * w, hy = inset + rnd() * w;
          const hr = 0.35 + rnd() * 0.75;
          x.globalAlpha = 0.28 + rnd() * 0.3;
          x.beginPath(); x.arc(hx, hy, hr, 0, Math.PI * 2); x.fill();
        }
        x.globalCompositeOperation = 'source-over';
        x.globalAlpha = 1;
        row.push(c);
      }
      sprites.push(row);
    }
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let tt = Math.imul(a ^ (a >>> 15), 1 | a);
      tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
      return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- fond statique
  function paintBackground() {
    const wW = worldW(), wH = worldH();
    bg = document.createElement('canvas');
    bg.width = Math.round(wW * dpr);
    bg.height = Math.round(wH * dpr);
    const x = bg.getContext('2d');
    x.scale(dpr, dpr);
    // ardoise
    x.fillStyle = '#2f4a3f';
    x.fillRect(0, 0, wW, wH);
    // granulation de l'ardoise
    const rnd = mulberry(S.grid.w * 131 + S.grid.h * 17 + (S.mode === 'sandbox' ? 5 : 11));
    for (let i = 0; i < wW * wH / 26; i++) {
      const px = rnd() * wW, py = rnd() * wH;
      x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.024)' : 'rgba(0,0,0,0.05)';
      x.fillRect(px, py, 1 + rnd() * 1.6, 1 + rnd() * 1.2);
    }
    // traces d'éponge (ellipse pâle)
    for (let i = 0; i < 3; i++) {
      const ex = rnd() * wW, ey = rnd() * wH;
      const ew = 40 + rnd() * 90, eh = 14 + rnd() * 26;
      const grd = x.createRadialGradient(ex, ey, 2, ex, ey, Math.max(ew, eh) / 2);
      grd.addColorStop(0, 'rgba(230,236,228,0.055)');
      grd.addColorStop(1, 'rgba(230,236,228,0)');
      x.fillStyle = grd;
      x.save(); x.translate(ex, ey); x.scale(1, eh / ew); x.translate(-ex, -ey);
      x.beginPath(); x.arc(ex, ey, ew / 2, 0, Math.PI * 2); x.fill(); x.restore();
    }
    // grille tracée main levée
    x.strokeStyle = 'rgba(242,240,228,0.11)';
    x.lineWidth = 1;
    for (let gx = 0; gx <= S.grid.w; gx++) {
      const jx = mulberry(gx * 977 + 3);
      const wob = cellPx > 8 ? 0.9 : 0.4;
      x.beginPath();
      x.moveTo(gx * cellPx + 0.5 + (jx() - 0.5) * wob, 0);
      for (let seg = 1; seg <= 4; seg++) {
        x.lineTo(gx * cellPx + 0.5 + (jx() - 0.5) * wob, wH * seg / 4);
      }
      x.stroke();
    }
    for (let gy = 0; gy <= S.grid.h; gy++) {
      const jy = mulberry(gy * 613 + 9);
      const wob = cellPx > 8 ? 0.9 : 0.4;
      x.beginPath();
      x.moveTo(0, gy * cellPx + 0.5 + (jy() - 0.5) * wob);
      for (let seg = 1; seg <= 4; seg++) {
        x.lineTo(wW * seg / 4, gy * cellPx + 0.5 + (jy() - 0.5) * wob);
      }
      x.stroke();
    }
    // cadre à la craie (double trait)
    x.strokeStyle = 'rgba(242,240,228,0.5)';
    x.lineWidth = 2;
    handRect(x, 2, 2, wW - 4, wH - 4, 31);
    x.strokeStyle = 'rgba(242,240,228,0.2)';
    x.lineWidth = 1;
    handRect(x, 6, 6, wW - 12, wH - 12, 77);
    // zone de croissance (défi growth)
    if (S.mode === 'challenge' && level() && level().type === 'growth') {
      const z = level().zone;
      x.strokeStyle = 'rgba(232,212,77,0.75)';
      x.lineWidth = 2;
      x.setLineDash([cellPx * 0.7, cellPx * 0.45]);
      handRect(x, z.x * cellPx + 2, z.y * cellPx + 2, z.w * cellPx - 4, z.h * cellPx - 4, 41);
      x.setLineDash([]);
    }
  }

  function handRect(x, a, b, w, h, seed) {
    const rnd = mulberry(seed);
    const pts = 5;
    x.beginPath();
    x.moveTo(a + (rnd() - 0.5) * 2, b + (rnd() - 0.5) * 2);
    for (let i = 1; i <= pts; i++) x.lineTo(a + w * i / pts + (rnd() - 0.5) * 2, b + (rnd() - 0.5) * 2);
    for (let i = 1; i <= pts; i++) x.lineTo(a + w + (rnd() - 0.5) * 2, b + h * i / pts + (rnd() - 0.5) * 2);
    for (let i = 1; i <= pts; i++) x.lineTo(a + w - w * i / pts + (rnd() - 0.5) * 2, b + h + (rnd() - 0.5) * 2);
    for (let i = 1; i <= pts; i++) x.lineTo(a + (rnd() - 0.5) * 2, b + h - h * i / pts + (rnd() - 0.5) * 2);
    x.closePath();
    x.stroke();
  }

  // ---------------------------------------------------------------- boucle de rendu
  let lastFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!S.grid) return;
    const dt = Math.min(0.25, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    if (S.running) {
      S.acc = (S.acc || 0) + dt * (S.mode === 'sandbox' ? S.speed : CH_SPEED);
      while ((S.acc || 0) >= 1) {
        S.acc -= 1;
        doGen();
        if (!S.running) break;
      }
    }
    draw(now, dt);
  }

  function draw(now, dt) {
    const g = S.grid;
    const va = viewActive();
    const z = va ? VIEW.zoom : 1;
    const wW = worldW(), wH = worldH();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#24382f';
    ctx.fillRect(0, 0, cssW, cssH);
    if (va) {
      ctx.setTransform(dpr * z, 0, 0, dpr * z, -VIEW.camX * z * dpr, -VIEW.camY * z * dpr);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (bg) ctx.drawImage(bg, 0, 0, wW, wH);
    // chemin rapide : cellules minuscules à l'écran → fillRect, pas de sprites
    const tiny = cellPx * z < 4.2;
    if (tiny) {
      ctx.fillStyle = '#f2f0e4';
      for (let y = 0; y < g.h; y++) {
        const row = y * g.w;
        for (let x = 0; x < g.w; x++) {
          if (g.cells[row + x]) ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
        }
      }
    } else {
      for (let y = 0; y < g.h; y++) {
        const row = y * g.w;
        for (let x = 0; x < g.w; x++) {
          if (!g.cells[row + x]) continue;
          const b = bucketOf(g.age[row + x]);
          const v = (x * 7 + y * 13 + ((x * y) | 0)) % 4;
          ctx.drawImage(sprites[b][v], x * cellPx, y * cellPx, cellPx, cellPx);
        }
      }
    }
    // fantômes de craie (masqués en vue très éloignée)
    if (!tiny) {
      const nowMs = now;
      for (let i = GHOSTS.length - 1; i >= 0; i--) {
        const gh = GHOSTS[i];
        const age = (nowMs - gh.t0) / 900;
        if (age >= 1) { GHOSTS.splice(i, 1); continue; }
        ctx.strokeStyle = 'rgba(242,240,228,' + (0.3 * (1 - age)).toFixed(3) + ')';
        ctx.lineWidth = 1 / z;
        ctx.strokeRect(gh.x * cellPx + 1.5, gh.y * cellPx + 1.5, cellPx - 3, cellPx - 3);
      }
    }
    // poussière
    for (let i = DUST.length - 1; i >= 0; i--) {
      const p = DUST[i];
      p.life -= dt;
      if (p.life <= 0) { DUST.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt;
      ctx.fillStyle = 'rgba(' + p.rgb + ',' + (0.5 * p.life / p.t0life).toFixed(3) + ')';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    // indice : solution de référence
    if (S.hintCells && now < S.hintUntil) {
      ctx.save();
      ctx.strokeStyle = 'rgba(232,212,77,0.95)';
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.lineWidth = 2 / z;
      for (const [hx, hy] of S.hintCells) {
        ctx.strokeRect(hx * cellPx + 1, hy * cellPx + 1, cellPx - 2, cellPx - 2);
      }
      ctx.restore();
    }
    // surbrillance du survol
    if (S.hover && S.mode !== 'home') {
      ctx.strokeStyle = 'rgba(242,240,228,0.55)';
      ctx.lineWidth = 1.5 / z;
      if (S.stamp && S.mode === 'sandbox') {
        const pc = stampCells();
        ctx.fillStyle = 'rgba(242,240,228,0.35)';
        for (const [sx, sy] of pc) {
          if (sx >= 0 && sy >= 0 && sx < g.w && sy < g.h) {
            ctx.fillRect(sx * cellPx + 1, sy * cellPx + 1, cellPx - 2, cellPx - 2);
          }
        }
      } else {
        ctx.strokeRect(S.hover[0] * cellPx + 1, S.hover[1] * cellPx + 1, cellPx - 2, cellPx - 2);
      }
    }
    // éclair de cloche (repère écran)
    if (S.bellFlash > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const a = S.bellFlash;
      ctx.fillStyle = 'rgba(242,240,228,' + (0.35 * a).toFixed(3) + ')';
      ctx.fillRect(0, 0, cssW, cssH);
      S.bellFlash = Math.max(0, a - dt * 1.4);
    }
  }

  // ---------------------------------------------------------------- génération
  const CH_SPEED = 10; // gén./s en défi

  function doGen() {
    const g = S.grid;
    const before = g.cells.slice(); // step() mute cells en place
    const res = Life.step(g);
    S.popHist.push(Life.population(g));
    if (S.popHist.length > 220) S.popHist.shift();
    // effets : échantillonne au plus ~80 événements par gén.
    let ev = 0;
    for (let i = 0; i < g.cells.length && ev < 60; i++) {
      if (g.cells[i] && !before[i]) { spawnDust(i % g.w, (i / g.w) | 0, 'birth'); ev++; }
      else if (!g.cells[i] && before[i]) { pushGhost(i % g.w, (i / g.w) | 0); spawnDust(i % g.w, (i / g.w) | 0, 'death'); ev++; }
    }
    // détection de cycle (atelier)
    if (S.mode === 'sandbox' && g.gen > 4) {
      const cyc = Life.detectCycle(g);
      S.cycleInfo = cyc ? cyc.period : null;
    }
    updateHud();
    drawSpark();
    if (S.mode === 'challenge') challengeTick();
  }

  function pushGhost(x, y) {
    GHOSTS.push({ x: x, y: y, t0: performance.now() });
    if (GHOSTS.length > 900) GHOSTS.splice(0, GHOSTS.length - 900);
  }

  function spawnDust(x, y, kind) {
    if (DUST.length > 420) return;
    const n = kind === 'birth' ? 2 : 3;
    for (let i = 0; i < n; i++) {
      DUST.push({
        x: x * cellPx + cellPx / 2 + (Math.random() - 0.5) * cellPx,
        y: y * cellPx + cellPx / 2 + (Math.random() - 0.5) * cellPx,
        vx: (Math.random() - 0.5) * 14,
        vy: -4 - Math.random() * 12,
        s: 1 + Math.random() * 1.6,
        life: 0.5 + Math.random() * 0.5,
        t0life: 1,
        rgb: kind === 'birth' ? '246,244,232' : '168,178,168'
      });
    }
  }

  function drawSpark() {
    const W = sparkC.width, H = sparkC.height;
    sparkX.clearRect(0, 0, W, H);
    sparkX.fillStyle = 'rgba(47,74,63,0.15)';
    sparkX.fillRect(0, 0, W, H);
    const h = S.popHist;
    if (h.length < 2) return;
    const max = Math.max.apply(null, h.concat([1]));
    sparkX.strokeStyle = 'rgba(47,74,63,0.85)';
    sparkX.lineWidth = 1.5;
    sparkX.beginPath();
    for (let i = 0; i < h.length; i++) {
      const px = W - (h.length - 1 - i) * (W / 219);
      const py = H - 2 - (h[i] / max) * (H - 5);
      if (i === 0) sparkX.moveTo(px, py); else sparkX.lineTo(px, py);
    }
    sparkX.stroke();
  }

  // ---------------------------------------------------------------- défis
  function level() { return Levels.LEVELS[S.levelIx]; }

  function startChallenge(ix) {
    S.mode = 'challenge';
    S.levelIx = clamp(ix, 0, Levels.LEVELS.length - 1);
    const L = level();
    S.grid = Life.makeGrid(L.w, L.h, L.seed);
    S.grid.wrap = false;
    S.baseSeed = L.seed;
    S.phase = 'setup';
    S.running = false;
    S.strokes = 0;
    S.hintUsed = false;
    S.hintCells = null;
    S.placed = Life.population(S.grid);
    S.popHist = [S.placed];
    S.cycleInfo = null;
    S.tool = L.type === 'extinct' ? 'erase' : 'draw';
    S.stamp = null;
    GHOSTS.length = 0; DUST.length = 0;
    showScreen('game');
    $('tray-challenge').classList.remove('hidden');
    $('tray-sandbox').classList.add('hidden');
    $('patternbar').classList.add('hidden');
    $('sb-hint').style.display = 'none';
    layout();
    refreshTexts();
    updateHud();
    drawSpark();
  }

  function restartChallenge() {
    startChallenge(S.levelIx);
    toast(t('setup'));
  }

  function challengeTick() {
    const L = level();
    const pop = Life.population(S.grid);
    // extinction : réussie dès que le tableau est vide
    if (L.type === 'extinct' && pop === 0) { finish(true, pop); return; }
    // la cloche
    if (S.grid.gen >= L.bell) {
      if (L.type === 'target') finish(pop === L.need, pop);
      else if (L.type === 'rescue') finish(pop >= L.need, pop);
      else finish(pop >= L.stars.s1, pop); // growth : les étoiles se règlent après
    }
  }

  function starsFor(L, pop) {
    if (L.type === 'growth') {
      if (pop >= L.stars.s3) return 3;
      if (pop >= L.stars.s2) return 2;
      if (pop >= L.stars.s1) return 1;
      return 0;
    }
    const u = S.strokes;
    if (u <= L.par.t3) return 3;
    if (u <= L.par.t2) return 2;
    return 1;
  }

  function finish(won, pop) {
    S.running = false;
    S.phase = 'done';
    const L = level();
    S.bellFlash = 1;
    Sfx.bell();
    let stars = 0;
    if (won) {
      stars = starsFor(L, pop);
      if (S.hintUsed) stars = Math.max(1, stars - 1);
      const pr = store.get('ardoise-progress', { stars: {} });
      pr.stars = pr.stars || {};
      const prev = pr.stars[L.id] || 0;
      if (stars > prev) pr.stars[L.id] = stars;
      store.set('ardoise-progress', pr);
      Sfx.win();
    } else {
      Sfx.fail();
    }
    setTimeout(function () { showResult(won, stars, pop); }, 650);
    updateHud();
  }

  function showResult(won, stars, pop) {
    const L = level();
    const isLast = S.levelIx === Levels.LEVELS.length - 1;
    let html = '<h2>' + (won ? esc(t('winTitle')) : esc(t('failTitle'))) + '</h2>';
    if (won) {
      html += '<div class="stars">' +
        '<span>' + (stars >= 1 ? '★' : '<span class="off">★</span>') + '</span>' +
        '<span>' + (stars >= 2 ? '★' : '<span class="off">★</span>') + '</span>' +
        '<span>' + (stars >= 3 ? '★' : '<span class="off">★</span>') + '</span></div>';
      if (L.type === 'target') html += '<p>' + esc(t('winTarget', { n: L.need })) + '</p>';
      if (L.type === 'rescue') html += '<p>' + esc(t('winRescue', { n: pop })) + '</p>';
      if (L.type === 'extinct') html += '<p>' + esc(t('winExtinct', { g: S.grid.gen })) + '</p>';
      if (L.type === 'growth') html += '<p>' + esc(t('bestPop', { n: pop })) + '</p>';
      if (L.type !== 'growth') html += '<p class="mono">' + esc(t(S.strokes === 1 ? 'usedStroke' : 'usedStrokes', { n: S.strokes })) + (S.hintUsed ? ' · ' + esc(t('hintUsed')) : '') + '</p>';
      else if (S.hintUsed) html += '<p class="mono">' + esc(t('hintUsed')) + '</p>';
      if (isLast) html += '<p>' + esc(t('allDone')) + '</p>';
    } else {
      html += '<p>' + esc(t('failBody')) + '</p>';
      html += '<p class="mono">' + esc(t('bestPop', { n: pop })) + '</p>';
    }
    html += '<div class="row">';
    html += '<button id="ov-menu">' + esc(t('backMenu')) + '</button>';
    html += '<button id="ov-again">' + esc(t('again')) + '</button>';
    if (won && !isLast) html += '<button id="ov-next" class="primary">' + esc(t('next')) + '</button>';
    html += '</div>';
    openOverlay(html);
    const mn = $('ov-menu'), ag = $('ov-again'), nx = $('ov-next');
    if (mn) mn.onclick = function () { closeOverlay(); goHome(); };
    if (ag) ag.onclick = function () { closeOverlay(); startChallenge(S.levelIx); };
    if (nx) nx.onclick = function () { closeOverlay(); startChallenge(S.levelIx + 1); };
  }

  // ---------------------------------------------------------------- interactions défi
  function tapCell(x, y) {
    if (S.mode === 'home') return;
    const g = S.grid;
    if (!Life.inBounds(g, x, y)) return;
    const L = S.mode === 'challenge' ? level() : null;

    if (S.stamp && S.mode === 'sandbox') { stampAt(x, y); return; }

    if (S.mode === 'challenge') {
      if (S.phase === 'done') return;
      if (S.running) { toast(t('noEditRun')); return; }
      if (L.type === 'growth' && S.phase !== 'setup') { toast(t('noEditRun')); return; }
      const alive = g.cells[y * g.w + x];
      if (L.type === 'rescue' && alive) { toast(t('drawOnly')); return; }
      if (L.type === 'extinct' && !alive) { toast(t('eraseOnly')); return; }
      if (L.type !== 'growth') {
        if (S.strokes >= L.K) { toast(t('noChalk')); return; }
      } else {
        // croissance : pose/retrait libre dans la zone, nombre final = budget
        if (L.zone) {
          const z = L.zone;
          if (x < z.x || y < z.y || x >= z.x + z.w || y >= z.y + z.h) { toast(t('zoneOnly')); return; }
        }
      }
      const changed = Life.setCell(g, x, y, alive ? 0 : 1);
      if (!changed) return;
      if (L.type !== 'growth') S.strokes++;
      S.placed = Life.population(g);
      if (alive) { pushGhost(x, y); Sfx.sponge(); } else { Sfx.chalk(); }
      if (S.phase === 'run') { S.popHist = [Life.population(g)]; }
      updateHud();
      return;
    }

    // atelier : dessin/éponge libre
    const alive = g.cells[y * g.w + x];
    const want = S.tool === 'draw' ? 1 : 0;
    if (Life.setCell(g, x, y, want)) {
      if (want === 0 && alive) { pushGhost(x, y); Sfx.sponge(); }
      else if (want === 1) Sfx.chalk();
      S.popHist = [Life.population(g)];
      S.cycleInfo = null;
      updateHud();
    }
  }

  // ---------------------------------------------------------------- atelier
  function startSandbox() {
    S.mode = 'sandbox';
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 640;
    const cols = mobile ? 208 : 288, rows = mobile ? 136 : 184; // grand tableau
    S.grid = Life.makeGrid(cols, rows, []);
    S.grid.wrap = true;
    S.phase = 'run';
    S.running = false;
    S.tool = 'draw';
    S.stamp = null;
    S.stampRot = 0;
    S.popHist = [0];
    S.cycleInfo = null;
    S.hover = null;
    POINTERS.clear();
    GHOSTS.length = 0; DUST.length = 0;
    showScreen('game');
    $('tray-challenge').classList.add('hidden');
    $('tray-sandbox').classList.remove('hidden');
    $('patternbar').classList.remove('hidden');
    $('sb-hint').style.display = '';
    layout();
    centerView();
    buildPatternBar();
    refreshTexts();
    updateHud();
  }

  function stampCells() {
    const p = Life.PATTERNS[S.stamp];
    if (!p) return [];
    let cells = p.cells.map(function (c) { return [c[0], c[1]]; });
    for (let r = 0; r < S.stampRot; r++) cells = Life.rotateCells(cells);
    return cells.map(function (c) { return [S.hover ? S.hover[0] + c[0] : 0, S.hover ? S.hover[1] + c[1] : 0]; });
  }

  function stampAt(x, y) {
    const p = Life.PATTERNS[S.stamp];
    if (!p) return;
    let cells = p.cells.slice();
    for (let r = 0; r < S.stampRot; r++) cells = Life.rotateCells(cells);
    for (const c of cells) Life.setCell(S.grid, x + c[0], y + c[1], 1);
    S.popHist = [Life.population(S.grid)];
    S.cycleInfo = null;
    Sfx.stamp();
    updateHud();
  }

  const PAT_ORDER = [
    ['still', ['block', 'beehive', 'loaf']],
    ['osc', ['blinker', 'toad', 'beacon', 'pulsar', 'pentadecathlon']],
    ['ship', ['glider', 'lwss']],
    ['chaos', ['rpentomino', 'acorn', 'diehard']],
    ['gun', ['gosper']]
  ];

  function buildPatternBar() {
    const bar = $('patternbar');
    bar.innerHTML = '';
    for (const [group, names] of PAT_ORDER) {
      const lab = document.createElement('span');
      lab.className = 'chip tp';
      lab.style.fontSize = '11px';
      lab.style.alignSelf = 'center';
      lab.textContent = t('pat_' + group);
      bar.appendChild(lab);
      for (const nm of names) {
        const b = document.createElement('button');
        b.className = 'pat' + (S.stamp === nm ? ' on' : '');
        b.dataset.pat = nm;
        b.textContent = t('pat_' + nm);
        b.onclick = function () {
          S.stamp = S.stamp === nm ? null : nm;
          S.tool = 'draw';
          buildPatternBar();
          updateHud();
        };
        bar.appendChild(b);
      }
    }
  }

  // ---------------------------------------------------------------- HUD
  function updateHud() {
    const L = S.mode === 'challenge' ? level() : null;
    const pop = S.grid ? Life.population(S.grid) : 0;
    if (S.mode === 'challenge') {
      $('chip-level').textContent = t('level', { n: L.id, total: Levels.LEVELS.length });
      $('chip-type').textContent = t('type' + L.type.charAt(0).toUpperCase() + L.type.slice(1));
      $('chip-gen').textContent = t('gen', { n: S.grid.gen });
      const left = L.bell - S.grid.gen;
      $('chip-bell').textContent = S.grid.gen >= L.bell ? t('bellNow') : t('bellIn', { n: Math.max(0, left) });
      $('chip-pop').textContent = t('pop', { n: pop });
      if (L.type === 'growth') {
        $('chip-budget').textContent = t('placed', { n: S.placed, b: L.budget });
      } else {
        $('chip-budget').textContent = t('budget', { left: Math.max(0, L.K - S.strokes) });
      }
      $('chip-status').textContent = S.running ? t('running') : (S.phase === 'setup' ? t('setup') : t('paused'));
      $('btn-run').textContent = S.running ? t('pauseBtn') : t('playBtn');
      $('btn-hint').disabled = S.hintUsed;
      const canRun = L.type !== 'growth' || S.placed === L.budget;
      $('btn-run').disabled = !canRun && !S.running;
    } else if (S.mode === 'sandbox') {
      $('chip-level').textContent = t('sbTitle');
      $('chip-type').textContent = '';
      $('chip-gen').textContent = t('gen', { n: S.grid.gen });
      $('chip-bell').textContent = '';
      $('chip-pop').textContent = t('pop', { n: pop });
      $('chip-budget').textContent = t('gens', { n: S.speed });
      const st = S.grid.wrap ? ' ∞' : '';
      if (pop === 0 && S.grid.gen > 0) $('chip-status').textContent = t('statusDead');
      else if (S.cycleInfo === 1) $('chip-status').textContent = t('statusStill');
      else if (S.cycleInfo >= 2) $('chip-status').textContent = t('statusOsc', { n: S.cycleInfo });
      else $('chip-status').textContent = t('statusActive') + st;
      $('sb-run').textContent = S.running ? t('pauseBtn') : t('playBtn');
      $('sb-speed-val').textContent = t('gens', { n: S.speed });
      $('sb-wrap').classList.toggle('on', S.grid.wrap);
      $('sb-draw').classList.toggle('on', S.tool === 'draw' && !S.stamp);
      $('sb-erase').classList.toggle('on', S.tool === 'erase');
      $('sb-pan').classList.toggle('on', S.tool === 'pan');
    }
  }

  // ---------------------------------------------------------------- textes / écrans
  function refreshTexts() {
    $('tagline').textContent = t('tagline');
    $('btn-play').textContent = t('play');
    $('btn-sandbox').textContent = t('sandbox');
    $('btn-howto').textContent = t('howto');
    $('btn-menu').textContent = t('menu');
    $('btn-restart').textContent = t('restart');
    $('btn-hint').textContent = t('hintBtn');
    $('btn-step').textContent = t('stepBtn');
    $('btn-draw').textContent = t('draw');
    $('btn-erase').textContent = t('erase');
    $('sb-draw').textContent = t('draw');
    $('sb-erase').textContent = t('erase');
    $('sb-pan').textContent = t('pan');
    $('sb-center').textContent = t('recenter');
    $('sb-run').textContent = S.running ? t('pauseBtn') : t('playBtn');
    $('sb-step').textContent = t('stepBtn');
    $('sb-wrap').textContent = t('wrap');
    $('sb-random').textContent = t('random');
    $('sb-clear').textContent = t('clear');
    document.querySelector('label[for="sb-speed"]').textContent = t('speed');
    $('sb-hint').textContent = t('sbHint');
    $('btn-sound').textContent = '♪';
    $('btn-sound').style.textDecoration = Sfx.enabled ? 'none' : 'line-through';
    $('btn-sound').setAttribute('aria-label', Sfx.enabled ? t('soundOn') : t('soundOff'));
    if (S.mode === 'challenge') {
      const L = level();
      const p = { n: L.need, g: L.bell, k: L.K, b: L.budget };
      $('goal-label').textContent = t('goal');
      $('goal-text').textContent = t('goal' + L.type.charAt(0).toUpperCase() + L.type.slice(1), p);
      let legend = '';
      if (L.type === 'growth') {
        legend = t('starsG3', { s: L.stars.s3 }) + ' · ' + t('starsG2', { s: L.stars.s2 }) + ' · ' + t('starsG1', { s: L.stars.s1 });
      } else {
        legend = t('stars3', { t: L.par.t3 }) + ' · ' + t('stars2', { t: L.par.t2 });
      }
      $('goal-stars').textContent = legend;
      $('btn-draw').disabled = L.type === 'extinct';
      $('btn-erase').disabled = L.type === 'rescue';
    }
    buildLevelGrid();
    updateHud();
  }

  function buildLevelGrid() {
    const grid = $('levelgrid');
    grid.innerHTML = '';
    const pr = store.get('ardoise-progress', { stars: {} });
    Levels.LEVELS.forEach(function (L, ix) {
      const solved = (pr.stars && pr.stars[L.id]) || 0;
      const unlocked = ix === 0 || (pr.stars && pr.stars[Levels.LEVELS[ix - 1].id]);
      const d = document.createElement('button');
      d.className = 'lvl' + (unlocked ? '' : ' locked');
      const stars = solved ? '★'.repeat(solved) + '<span class="off">' + '★'.repeat(3 - solved) + '</span>' : '<span class="off">★★★</span>';
      d.innerHTML = '<span class="nm">' + ix1(ix) + ' · ' + esc(t('type' + L.type.charAt(0).toUpperCase() + L.type.slice(1))) + '</span>' +
        (unlocked ? '<span class="st">' + stars + '</span>' : '<span class="lk">' + '· · ·' + '</span>');
      if (unlocked) d.onclick = function () { startChallenge(ix); };
      grid.appendChild(d);
    });
  }

  function ix1(ix) { return String(ix + 1).padStart(2, '0'); }

  function showScreen(name) {
    $('home').classList.toggle('hidden', name !== 'home');
    $('game').classList.toggle('hidden', name !== 'game');
    if (name === 'home') { S.mode = 'home'; S.running = false; buildLevelGrid(); }
  }

  function goHome() { showScreen('home'); S.mode = 'home'; S.running = false; }

  // ---------------------------------------------------------------- superpositions
  let overlayOpen = false;
  function openOverlay(html) {
    overlayOpen = true;
    $('overlay-card').innerHTML = html;
    $('overlay').classList.remove('hidden');
  }
  function closeOverlay() {
    overlayOpen = false;
    $('overlay').classList.add('hidden');
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------------------------------------------------------------- règles (démo animée)
  let demoTimer = 0;
  function showHowto() {
    const params = { n: 6, g: 20, k: 4, b: 7 };
    let html = '<h2>' + esc(t('howto')) + '</h2>' + t('rulesHtml', params);
    html += '<canvas id="demo-canvas" class="demo" width="264" height="132"></canvas>';
    html += '<div class="row"><button id="ov-close" class="primary">' + esc(t('gotIt')) + '</button></div>';
    openOverlay(html);
    $('ov-close').onclick = function () { closeOverlay(); stopDemo(); };
    runDemo();
  }

  let demoGrid = null;
  function runDemo() {
    const c = $('demo-canvas');
    if (!c) return;
    const g = Life.makeGrid(22, 11, []);
    g.wrap = true;
    Life.placePattern(g, 'glider', 2, 2);
    Life.placePattern(g, 'blinker', 13, 4);
    Life.placePattern(g, 'block', 17, 7);
    demoGrid = g;
    const dx = c.getContext('2d');
    const cell = 12;
    clearInterval(demoTimer);
    demoTimer = setInterval(function () {
      if (!demoGrid) { clearInterval(demoTimer); return; }
      Life.step(demoGrid);
      // fait tourner le planeur dans le cadre
      const d = demoGrid;
      dx.fillStyle = '#24382f';
      dx.fillRect(0, 0, c.width, c.height);
      dx.fillStyle = '#f2f0e4';
      for (let y = 0; y < d.h; y++) {
        for (let x = 0; x < d.w; x++) {
          if (d.cells[y * d.w + x]) {
            dx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
          }
        }
      }
    }, 330);
  }
  function stopDemo() { clearInterval(demoTimer); demoGrid = null; }

  // ---------------------------------------------------------------- pointeur
  const POINTERS = new Map();  // pointerId → {x, y} (repère canvas)
  let painting = false;

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    let sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (viewActive()) {
      // écran → monde
      sx = VIEW.camX + sx / VIEW.zoom;
      sy = VIEW.camY + sy / VIEW.zoom;
    }
    return [Math.floor(sx / cellPx), Math.floor(sy / cellPx)];
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    Sfx.unlock();
    if (overlayOpen) return;
    const r = canvas.getBoundingClientRect();
    POINTERS.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    canvas.setPointerCapture(e.pointerId);
    if (POINTERS.size >= 2) { painting = false; return; } // pincement à deux doigts
    painting = true;
    const [x, y] = canvasPos(e);
    S.hover = [x, y];
    if (S.stamp && S.mode === 'sandbox') stampAt(x, y);
    else if (S.tool !== 'pan') tapCell(x, y);
  });

  canvas.addEventListener('pointermove', function (e) {
    const r = canvas.getBoundingClientRect();
    const cur = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (POINTERS.has(e.pointerId)) {
      const prev = POINTERS.get(e.pointerId);
      // pincement : zoom + déplacement simultanés
      if (POINTERS.size === 2 && viewActive()) {
        POINTERS.set(e.pointerId, cur);
        const pts = [...POINTERS.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        if (S.pinch) {
          const f = d / S.pinch.d;
          zoomAt(S.pinch.mid.x, S.pinch.mid.y, f);
          VIEW.camX -= (mid.x - S.pinch.mid.x) / VIEW.zoom;
          VIEW.camY -= (mid.y - S.pinch.mid.y) / VIEW.zoom;
          clampView();
        }
        S.pinch = { d: d, mid: mid };
        return;
      }
      // pan à un doigt avec l'outil Main
      if (S.tool === 'pan' && viewActive() && painting) {
        VIEW.camX -= (cur.x - prev.x) / VIEW.zoom;
        VIEW.camY -= (cur.y - prev.y) / VIEW.zoom;
        clampView();
        POINTERS.set(e.pointerId, cur);
        return;
      }
      POINTERS.set(e.pointerId, cur);
    }
    const [x, y] = canvasPos(e);
    S.hover = [x, y];
    if (!painting) return;
    if (S.tool === 'pan') return;
    if (S.stamp && S.mode === 'sandbox') return; // tampon : un clic = une pose
    // peinture continue : n'agit que si la cellule cible change d'état
    const g = S.grid;
    if (!g || !Life.inBounds(g, x, y)) return;
    if (S.mode === 'sandbox') {
      const want = S.tool === 'draw' ? 1 : 0;
      if (Life.setCell(g, x, y, want)) {
        if (want === 0) Sfx.sponge(); else Sfx.chalk();
        S.popHist = [Life.population(g)];
        updateHud();
      }
    } else if (S.phase !== 'done') {
      // en défi : le glissement appose l'outil (chaque changement coûte)
      const alive = g.cells[y * g.w + x];
      const wantChalk = S.tool === 'draw';
      if (wantChalk && alive) return;
      if (!wantChalk && !alive) return;
      tapCell(x, y);
    }
  });

  function endPaint(e) {
    POINTERS.delete(e.pointerId);
    if (POINTERS.size < 2) S.pinch = null;
    if (POINTERS.size === 0) painting = false;
  }
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);
  canvas.addEventListener('pointerleave', function () { S.hover = null; });

  // molette : zoom autour du curseur (atelier)
  canvas.addEventListener('wheel', function (e) {
    if (!viewActive()) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  // ---------------------------------------------------------------- clavier
  document.addEventListener('keydown', function (e) {
    if (overlayOpen) return;
    if (e.target && e.target.tagName === 'BUTTON') return; // le bouton focalisé garde Espace
    if (e.code === 'Space') {
      e.preventDefault();
      toggleRun();
    } else if (e.key === 's' || e.key === 'S') {
      if (S.mode !== 'home' && !S.running) doStep();
    } else if (e.key === 'r' || e.key === 'R') {
      if (S.mode === 'sandbox' && S.stamp) {
        S.stampRot = (S.stampRot + 1) % 4;
        toast(t('pat_' + S.stamp) + ' ↻');
      } else if (S.mode === 'challenge') {
        restartChallenge();
      }
    }
  });

  function toggleRun() {
    if (S.mode === 'challenge') {
      const L = level();
      if (S.phase === 'done') return;
      if (!S.running && L.type === 'growth' && S.placed !== L.budget) {
        toast(t('growthNeed', { b: L.budget }));
        return;
      }
      S.running = !S.running;
      if (S.running && S.phase === 'setup') S.phase = 'run';
      Sfx.tick();
      updateHud();
    } else if (S.mode === 'sandbox') {
      S.running = !S.running;
      Sfx.tick();
      updateHud();
    }
  }

  function doStep() {
    if (S.mode === 'challenge') {
      const L = level();
      if (S.phase === 'done') return;
      if (S.phase === 'setup') S.phase = 'run';
      doGen();
    } else if (S.mode === 'sandbox') {
      doGen();
    }
  }

  // ---------------------------------------------------------------- boutons
  $('btn-play').onclick = function () {
    // premier défi non résolu
    const pr = store.get('ardoise-progress', { stars: {} });
    let ix = 0;
    for (let i = 0; i < Levels.LEVELS.length; i++) {
      if (!(pr.stars && pr.stars[Levels.LEVELS[i].id])) { ix = i; break; }
      ix = i;
    }
    startChallenge(ix);
  };
  $('btn-sandbox').onclick = startSandbox;
  $('btn-howto').onclick = showHowto;
  $('btn-menu').onclick = goHome;
  $('btn-run').onclick = toggleRun;
  $('btn-step').onclick = doStep;
  $('btn-restart').onclick = restartChallenge;
  $('btn-hint').onclick = function () {
    if (S.mode !== 'challenge' || S.hintUsed) return;
    const L = level();
    S.hintUsed = true;
    S.hintCells = L.ref;
    S.hintUntil = performance.now() + 3200;
    updateHud();
  };
  $('btn-draw').onclick = function () { S.tool = 'draw'; updateHud(); refreshToolOn(); };
  $('btn-erase').onclick = function () { S.tool = 'erase'; updateHud(); refreshToolOn(); };
  function refreshToolOn() {
    $('btn-draw').classList.toggle('on', S.tool === 'draw');
    $('btn-erase').classList.toggle('on', S.tool === 'erase');
  }

  $('sb-run').onclick = toggleRun;
  $('sb-step').onclick = doStep;
  $('sb-draw').onclick = function () { S.tool = 'draw'; S.stamp = null; buildPatternBar(); updateHud(); };
  $('sb-erase').onclick = function () { S.tool = 'erase'; updateHud(); };
  $('sb-pan').onclick = function () { S.tool = S.tool === 'pan' ? 'draw' : 'pan'; updateHud(); };
  $('sb-center').onclick = function () { if (viewActive()) centerView(); };
  $('sb-speed').oninput = function (e) {
    S.speed = parseInt(e.target.value, 10);
    updateHud();
  };
  $('sb-wrap').onclick = function () {
    S.grid.wrap = !S.grid.wrap;
    S.grid._hashes.length = 0;
    updateHud();
  };
  $('sb-random').onclick = function () {
    const g = S.grid;
    S.running = false;
    for (let y = 2; y < g.h - 2; y++) {
      for (let x = 2; x < g.w - 2; x++) {
        Life.setCell(g, x, y, Math.random() < 0.28 ? 1 : 0);
      }
    }
    S.popHist = [Life.population(g)];
    S.cycleInfo = null;
    Sfx.chalkBatch();
    updateHud();
  };
  $('sb-clear').onclick = function () {
    const now = Date.now();
    if (now - S.wipeArmed > 2800) {
      S.wipeArmed = now;
      toast(t('confirmWipe'));
      return;
    }
    S.wipeArmed = 0;
    S.running = false;
    const g = S.grid;
    g.cells.fill(0); g.age.fill(0); g.gen = 0; g._hashes.length = 0;
    S.popHist = [0];
    S.cycleInfo = null;
    Sfx.sponge();
    toast(t('wiped'));
    updateHud();
  };

  $('btn-sound').onclick = function () {
    Sfx.setEnabled(!Sfx.enabled);
    if (Sfx.enabled) { Sfx.unlock(); Sfx.tick(); }
    refreshTexts();
  };

  // langues
  function buildLangs() {
    const box = $('langs');
    box.innerHTML = '';
    I18N.ORDER.forEach(function (code) {
      const b = document.createElement('button');
      b.className = 'ghost small';
      b.textContent = code.toUpperCase();
      b.setAttribute('aria-label', I18N.STR[code].langName);
      if (code === I18N.lang) b.classList.add('on');
      b.onclick = function () {
        I18N.setLang(code);
        buildLangs();
        refreshTexts();
        if (S.mode === 'sandbox') buildPatternBar();
      };
      box.appendChild(b);
    });
  }

  // titre : chaque lettre légèrement tournée (lettrage à la craie)
  function chalkTitle() {
    const el = $('title');
    const word = 'ARDOISE';
    el.innerHTML = '';
    for (let i = 0; i < word.length; i++) {
      const sp = document.createElement('span');
      sp.className = 'lt';
      sp.textContent = word[i];
      sp.style.transform = 'rotate(' + (((i * 37) % 9) - 4) + 'deg) translateY(' + (((i * 53) % 5) - 2) + 'px)';
      el.appendChild(sp);
    }
  }

  // ---------------------------------------------------------------- démarrage
  window.addEventListener('resize', function () {
    if (S.mode !== 'home') layout();
  });

  document.addEventListener('pointerdown', function once() {
    Sfx.unlock();
  }, { once: true });

  chalkTitle();
  buildLangs();
  I18N.setLang(I18N.lang);
  refreshTexts();
  showScreen('home');
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- hook de test
  if (DEBUG) {
    window.__ardoise = {
      S: S,
      start: startChallenge,
      sandbox: startSandbox,
      step: function (n) { for (let i = 0; i < (n || 1); i++) doGen(); return { gen: S.grid.gen, pop: Life.population(S.grid) }; },
      tap: function (x, y) { tapCell(x, y); },
      run: function () { S.running = true; },
      stop: function () { S.running = false; },
      ref: function () { const L = level(); for (const c of L.ref) tapCell(c[0], c[1]); },
      levels: function () { return Levels.LEVELS; },
      layout: layout,
      view: VIEW,
      zoomAt: zoomAt,
      centerView: centerView,
      progress: function () { return store.get('ardoise-progress', { stars: {} }); }
    };
  }
})();
