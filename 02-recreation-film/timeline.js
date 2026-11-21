(() => {
  const CHUNKS = [3, 2, 4, 3, 2, 3, 4, 2, 3, 3, 2, 4];
  const cache = new Map();
  function velocityEase(M, peak, sharp) {
    const key = `v|${peak}|${sharp}`;
    if (!cache.has(key)) cache.set(key, M.velEase(peak * sharp, (1 - peak) * sharp));
    return cache.get(key);
  }
  const pullEase = (M, power) => { const fn = (u) => Math.pow(M.clamp(u), power); fn.kind = 'pull'; fn.endSpeed = power; return fn; };

  const brakeEase = (M, power) => { const fn = (u) => 1 - Math.pow(1 - M.clamp(u), power); fn.kind = 'brake'; fn.startSpeed = power; return fn; };

  const slamEase = (M, s, p = 3) => { const fn = (u) => { u = M.clamp(u); return (s + 1) * Math.pow(u, p) - s * Math.pow(u, p - 1); }; fn.kind = 'slam'; fn.endSpeed = p + s; return fn; };

  function aeEase(M, out, inn) {
    out = M.clamp(out, 0.001, 1); inn = M.clamp(inn, 0.001, 1);
    const key = `ae|${out}|${inn}`;
    if (cache.has(key)) return cache.get(key);
    const b = M.bezier(out, 0, 1 - inn, 1), fn = (u) => b(u);
    let vmax = 0, at = 0.5;
    for (let i = 0; i < 1000; i++) { const v = b((i + 1) / 1000) - b(i / 1000); if (v > vmax) { vmax = v; at = (i + 0.5) / 1000; } }
    fn.peakAt = at; fn.kind = 'ae';
    cache.set(key, fn);
    return fn;
  }

  function makeCurve(M, family, p) {
    if (family === 'pull') return pullEase(M, p.power);
    if (family === 'brake') return brakeEase(M, p.power);
    if (family === 'slam') return slamEase(M, p.back, p.power ?? 3);
    if (p.out !== undefined) return aeEase(M, p.out, p.in);
    return velocityEase(M, p.peak, p.sharp);
  }
  function globalCurves(T, M) {
    const e = T.global.ease, E = {};
    for (const k of ['go', 'cam', 'soft', 'pull', 'slam', 'brake']) if (e[k]) E[k] = makeCurve(M, k, e[k]);
    return E;
  }
  const textOf = (copy, key) => key.split('.').reduce((o, k) => o[k], copy);
  const textLen = (copy, key) => Array.from(textOf(copy, key)).length;
  function streamTimes(n, f0, every) {
    const t = []; let f = f0, k = 0;
    while (t.length < n) { const c = CHUNKS[k++ % CHUNKS.length]; for (let j = 0; j < c && t.length < n; j++) t.push(f); f += every; }
    return t;
  }

  function resolve(T, M, copy) {
    const E = globalCurves(T, M), LAG = T.global.lag, TL = {}, order = [];
    for (const it of T.timeline) {
      const r = it.ref ? TL[it.ref] : null;
      if (it.ref && !r) throw new Error(`「${it.id}」接在 ${it.ref} 后面，但 ${it.ref} 不在它前面`);
      const peakF = (y) => y.f0 + Math.round((y.curve?.peakAt ?? 1 / 3) * y.dur * (1 + LAG / 2));
      const base = !r ? 0 : it.at === 'end' ? r.f1 : it.at === 'arrive' ? r.arrive : it.at === 'peak' ? peakF(r) : r.f0;
      const f0 = base + (it.offset || 0);
      const curve = it.curve ? (it.ease ? makeCurve(M, it.curve, it.ease) : E[it.curve]) : null;
      const x = {id: it.id, item: it, f0, curve, base};
      let dur = it.dur || 0;
      if (it.kind === 'type') {
        const n = textLen(copy, it.text || 'prompt'), keys = n ? [f0] : [];
        let acc = 0;
        for (let i = 1; i < n; i++) { acc += (it.gaps[(i - 1) % it.gaps.length] || 2) * (it.scale || 1); keys.push(f0 + Math.round(acc)); }
        x.keys = keys; dur = (keys.at(-1) ?? f0) - f0;
      } else if (it.kind === 'stream') {
        x.times = streamTimes(textLen(copy, it.text), f0, it.every || 2); dur = (x.times.at(-1) ?? f0) - f0;
      } else if (it.kind === 'event') dur = 0;
      x.dur = dur; x.f1 = f0 + dur;

      x.arrive = curve && curve.peakAt !== undefined ? f0 + Math.round(M.timeTo(curve, T.global.arrive ?? 0.99) * dur * (1 + LAG)) : curve && curve.kind === 'brake' ? x.f1 + (T.global.clickSettle ?? 8) : x.f1;
      TL[it.id] = x; order.push(x);
    }
    return {TL, E, LAG, order, shots: shotsOf(TL, LAG)};
  }

  function shotsOf(TL, LAG) {
    const s = TL.send, out = [{id: 'S1', f0: 0}];
    if (TL.pan) out.push({id: 'S2', f0: TL.pan.f1});
    if (s) out.push({id: 'S3', f0: s.f0 + Math.round((s.curve.peakAt ?? 1 / 3) * s.dur * (1 + LAG / 2))});

    [['S4', 'winOut'], ['S5', 'm1out'], ['S6', 'm2out'], ['S7', 'whip0'], ['S8', 'whip1'], ['S9', 'whip2'], ['S10', 'whip3']].forEach(([id, k]) => TL[k] && out.push({id, f0: TL[k].f1}));
    return out;
  }

  function speedProfile(curve, n = 48) { const out = []; for (let i = 0; i <= n; i++) { const u = i / n, h = 0.5 / n; out.push((curve(Math.min(1, u + h)) - curve(Math.max(0, u - h))) / (Math.min(1, u + h) - Math.max(0, u - h))); } return out; }

  const api = {resolve, makeCurve, aeEase, globalCurves, speedProfile, shotsOf, textOf, CHUNKS};
  if (typeof window !== 'undefined') window.TIMELINE = api;
})();
