// ARDOISE — sons doux à la WebAudio : craie, éponge, cloche, victoire.
// Aucun asset externe : tout est synthétisé. Reprise après suspension mobile.
/* global window */
(function () {
  'use strict';

  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Petit bruit filtré : grain de craie (pose) ou coup d'éponge (retrait).
  function noise(dur, freq, q, gain, type) {
    const c = ensure();
    if (!c || !enabled) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2.2);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  function tone(freq, dur, gain, delay, type) {
    const c = ensure();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  const API = {
    unlock: function () { ensure(); },
    get enabled() { return enabled; },
    setEnabled: function (v) { enabled = !!v; if (enabled) ensure(); },
    chalk: function () { noise(0.07, 2600, 1.1, 0.5); },
    chalkBatch: function () { noise(0.16, 2200, 0.9, 0.42); },
    sponge: function () { noise(0.12, 700, 0.7, 0.5, 'lowpass'); },
    tick: function () { tone(1250, 0.05, 0.10, 0, 'triangle'); },
    bell: function () {
      tone(1568, 1.2, 0.22, 0);        // sol 6
      tone(2349, 0.9, 0.10, 0.006);    // ré 7 (partiel)
      tone(3136, 0.5, 0.05, 0.012);
    },
    win: function () {
      tone(523, 0.16, 0.16, 0);
      tone(659, 0.16, 0.16, 0.09);
      tone(784, 0.16, 0.16, 0.18);
      tone(1047, 0.42, 0.18, 0.27);
    },
    fail: function () {
      tone(392, 0.2, 0.15, 0, 'triangle');
      tone(311, 0.34, 0.15, 0.12, 'triangle');
    },
    stamp: function () { noise(0.1, 1700, 1.4, 0.5); tone(880, 0.06, 0.08, 0, 'triangle'); }
  };

  if (typeof window !== 'undefined') window.Sfx = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
