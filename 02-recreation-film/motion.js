(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lnLerp = (a, b, k) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * k);

  const inOut = (u, p = 2.4) => { u = clamp(u); return u < 0.5 ? 0.5 * Math.pow(2 * u, p) : 1 - 0.5 * Math.pow(2 - 2 * u, p); };
  const ease = (f, f0, f1, p = 2.4) => inOut((f - f0) / (f1 - f0), p);
  const easeIn = (u, p = 2.6) => Math.pow(clamp(u), p);
  const easeOutExpo = (u) => (u >= 1 ? 1 : u <= 0 ? 0 : 1 - Math.pow(2, -10 * u));

  const bezCache = new Map();
  function bezier(x1, y1, x2, y2) {
    const key = [x1, y1, x2, y2].join(',');
    if (bezCache.has(key)) return bezCache.get(key);
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
    const fn = (u) => {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      let lo = 0, hi = 1;
      for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (X(m) < u) lo = m; else hi = m; }
      return Y((lo + hi) / 2);
    };
    bezCache.set(key, fn);
    return fn;
  }
  const ae = (out, inn) => bezier(out, 0, 1 - inn, 1);
  const AE = {move: ae(0.7, 0.68), swipe: ae(0.65, 0.6), cam: ae(0.7, 0.68)};

  AE.pull = bezier(0.75, 0, 0.82, 0.45);

  const aeAt = (curve, f, f0, f1) => curve(clamp((f - f0) / (f1 - f0)));

  function velEase(a, b) {
    const N = 4000, tab = new Float64Array(N + 1), v = (u) => Math.pow(u, a) * Math.pow(1 - u, b);
    let s = 0;
    for (let i = 1; i <= N; i++) { const u0 = (i - 1) / N, u1 = i / N; s += (v(u0) + 4 * v((u0 + u1) / 2) + v(u1)) / (6 * N); tab[i] = s; }
    for (let i = 0; i <= N; i++) tab[i] /= s;
    const fn = (u) => { if (u <= 0) return 0; if (u >= 1) return 1; const x = u * N, i = Math.floor(x); return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
    fn.peakAt = a / (a + b);
    return fn;
  }

  const timeTo = (curve, frac) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (curve(m) < frac) lo = m; else hi = m; } return hi; };
  const EASE = {
    go: velEase(2, 4),
    cam: velEase(2, 4),
    soft: velEase(2, 2.6),
    pull: (u) => Math.pow(clamp(u), 2.4),
    slam: (u) => { u = clamp(u); const s = 1.25; return (s + 1) * u * u * u - s * u * u; },
  };

  function follower(input, f0, f1, hz, zeta, zetaBack = zeta) {
    const SUB = 240 / FPS, n = Math.ceil((f1 - f0) * SUB) + 2, w = 2 * Math.PI * hz, dt = 1 / 240;
    const tab = new Float64Array(n + 1);
    let x = input(f0), v = 0;
    tab[0] = x;
    for (let i = 0; i < n; i++) {
      const tgt = input(f0 + (i + 0.5) / SUB), z = Math.abs(tgt) < Math.abs(x) - 0.01 || Math.sign(tgt) !== Math.sign(x) ? zetaBack : zeta;
      const a = w * w * (tgt - x) - 2 * z * w * v;
      v += a * dt; x += v * dt; tab[i + 1] = x;
    }
    return (f) => { const k = clamp((f - f0) * SUB, 0, n), i = Math.min(Math.floor(k), n - 1); return lerp(tab[i], tab[i + 1], k - i); };
  }

  const SPIKE_IN = [[0.65, 0.07], [0.35, 0.25]];
  const SPIKE_OUT = [[0.6, 0.07], [0.4, 0.35]];
  const sumWK = (ws) => ws.reduce((s, [w, k]) => s + w * k, 0);

  function spikeIn(t, o) {
    const {tc, t0 = tc, base = 0, peak, a = SPIKE_IN} = o;
    const u = Math.min(t, tc), vp = peak - base;
    let p = base * Math.max(0, u - t0);
    for (const [w, k] of a) p += vp * w * k * Math.exp((u - tc) / k);
    return t > tc ? p + peak * (t - tc) : p;
  }

  function spikeOut(tau, o) {
    const {v0, b = SPIKE_OUT} = o;
    if (tau <= 0) return v0 * tau;
    let p = 0;
    for (const [w, k] of b) p += v0 * w * k * (1 - Math.exp(-tau / k));
    return p;
  }
  const spikeOutTotal = (v0, b = SPIKE_OUT) => v0 * sumWK(b);
  function spike(o) {
    const {total, tc, t0 = tc, base = 0, a = SPIKE_IN, b = SPIKE_OUT} = o;
    const ia = sumWK(a), ib = sumWK(b), L = Math.max(0, tc - t0);
    const peak = base + (total - base * (L + ib)) / (ia + ib);
    const atPeak = spikeIn(tc, {tc, t0, base, peak, a});
    return {peak, P: (t) => (t <= tc ? spikeIn(t, {tc, t0, base, peak, a}) : atPeak + spikeOut(t - tc, {v0: peak, b}))};
  }
  const spikeCache = new Map();
  function spike01(f, f0, peakAfter) {
    const key = f0 + '|' + peakAfter;
    let s = spikeCache.get(key);
    if (!s) { s = spike({total: 1, tc: (f0 + peakAfter) / FPS, t0: f0 / FPS}); s.p0 = s.P(f0 / FPS); spikeCache.set(key, s); }
    return clamp((s.P(f / FPS) - s.p0) / (1 - s.p0), 0, 1.0001);
  }

  const brake01 = (f, f0) => (f < f0 ? 0 : spikeOut((f - f0) / FPS, {v0: 1}) / spikeOutTotal(1));

  const stepCache = new Map();
  function springStep(t, hz, zeta) {
    if (t <= 0) return 0;
    const key = hz + ',' + zeta;
    let tab = stepCache.get(key);
    if (!tab) {
      const n = 240 * 6, w = 2 * Math.PI * hz, dt = 1 / 240;
      tab = new Float64Array(n + 1);
      let x = 0, v = 0;
      for (let i = 0; i < n; i++) { const a = w * w * (1 - x) - 2 * zeta * w * v; v += a * dt; x += v * dt; tab[i + 1] = x; }
      stepCache.set(key, tab);
    }
    const x = t * 240;
    if (x >= tab.length - 1) return 1;
    const i = Math.floor(x);
    return lerp(tab[i], tab[i + 1], x - i);
  }

  const springTo = (f, f0, a, b, hz, zeta) => (f < f0 ? a : a + (b - a) * springStep((f - f0) / FPS, hz, zeta));

  const kick = (f, f0, hz, decay) => { if (f < f0) return 0; const t = (f - f0) / FPS; return Math.exp(-t / decay) * Math.sin(2 * Math.PI * hz * t); };

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const norm = (a) => { const l = len(a); return [a[0] / l, a[1] / l]; };
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const bez2 = (p0, p1, p2, u) => mix(mix(p0, p1, u), mix(p1, p2, u), u);
  const rot = (v, deg) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  const once = (fn) => { let v, done = false; return () => (done ? v : ((done = true), (v = fn()))); };

  window.M = {FPS, W, H, clamp, lerp, lnLerp, inOut, ease, easeIn, easeOutExpo, bezier, ae, AE, aeAt, velEase, timeTo, EASE, follower, spikeIn, spikeOut, spikeOutTotal, spike01, brake01,
    springStep, springTo, kick, add, sub, mul, len, norm, mix, bez2, rot, once};
})();
