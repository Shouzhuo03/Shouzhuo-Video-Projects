(function () {
  const O = window.Oil, W = 480, H = 296, TAU = Math.PI * 2, V = Math.PI / 2;
  const { clamp, lerp } = O;
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const ONE = () => [1, 1, 1];
  const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const addc = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mulc = (a, k) => [a[0] * k[0], a[1] * k[1], a[2] * k[2]];

  function spline(P, n = 5, closed = true) {
    const out = [], m = P.length, get = i => P[closed ? ((i % m) + m) % m : clamp(i, 0, m - 1)], segs = closed ? m : m - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    if (!closed) out.push(P[m - 1]);
    return out;
  }

  function ramp(stops) {
    const S = stops.map(([i, c]) => [i, O.rgb(c)]);
    return I => {
      if (I <= S[0][0]) return S[0][1];
      for (let k = 1; k < S.length; k++) if (I <= S[k][0]) return O.mixc(S[k - 1][1], S[k][1], (I - S[k - 1][0]) / (S[k][0] - S[k - 1][0]));
      return S[S.length - 1][1];
    };
  }

  function limb(P, Wd, n = 4) {
    const L = [], R = [];
    P.forEach((p, i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      L.push([p[0] + nx * Wd[i], p[1] + ny * Wd[i]]); R.push([p[0] - nx * Wd[i], p[1] - ny * Wd[i]]);
    });
    return spline(L.concat(R.reverse()), n, true);
  }

  function shaded(g, poly, colFn, res) {
    const [x0, y0, x1, y1] = O.bbox(poly), A = (x1 - x0) * (y1 - y0);
    res = Math.min(res ?? 2, Math.sqrt(60000 / Math.max(A, 1)));
    const bw = Math.ceil((x1 - x0) * res) + 2, bh = Math.ceil((y1 - y0) * res) + 2, c = O.canvas(bw, bh), cg = c.getContext('2d'), id = cg.createImageData(bw, bh), d = id.data;
    for (let j = 0, k = 0; j < bh; j++) for (let i = 0; i < bw; i++, k += 4) {
      const col = colFn(x0 + (i + 0.5) / res, y0 + (j + 0.5) / res);
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    cg.putImageData(id, 0, 0);
    g.save(); O.path(g, poly); g.clip(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(c, x0, y0, bw / res, bh / res); g.restore();
  }

  function pt(g, poly, colFn, o) {
    if (o.rough) poly = O.rough(poly, o.rough, o.seed ? O.seedOf(o.seed) : 1, 2.5);
    shaded(g, poly, colFn, o.res);
    O.region(g, poly, Object.assign({ color: colFn, light: ONE, dir: 0, len: [6, 12], w: [2, 3.5], cover: 2.2, dry: 0.1, jitter: 0.07, cj: 11 }, o, { base: 0, a: Math.min(o.a ?? 0.6, 0.6) }));
  }

  function scatter(g, poly, o) {
    const r = O.rng(o.seed), [x0, y0, x1, y1] = O.bbox(poly), n = o.n ?? Math.round(O.area(poly) * (o.density ?? 0.03));
    g.save(); O.path(g, poly); g.clip();
    for (let k = 0; k < n; k++) {
      const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), q = r(), q2 = r(), q3 = r();
      if (!O.inside(poly, x, y)) continue;
      const c = o.col(x, y, q); if (!c) continue;
      const a = typeof o.dir === 'function' ? o.dir(x, y) : (o.dir ?? 0), ang = a + (q2 - 0.5) * (o.dj ?? 0.6), l = lerp(o.len[0], o.len[1], q3), ca = Math.cos(ang), sa = Math.sin(ang);
      O.stroke(g, [[x - ca * l / 2, y - sa * l / 2], [x + ca * l / 2, y + sa * l / 2]], { w: lerp(o.w[0], o.w[1], q), col: c, a: lerp(o.a[0], o.a[1], q2), nb: o.nb ?? 2, dry: o.dry ?? 0.1, cj: o.cj ?? 8, seed: k * 13 + 5 });
    }
    g.restore();
  }

  const F = 486, CH = 1.24, HZ = 88, TT = 0.75, TOPK = (CH - TT) * F;
  const FARY = 192, XS = 0.475;
  const edgeL = y => 139.2 - (y - FARY) * 0.971, edgeR = y => 340.8 + (y - FARY) * 0.971;
  const xAt = (X, y) => 240 + X * (y - HZ) * F / TOPK;
  const LP = [0, 1.42, 1.95];

  function lampI(X, h, Z, N, wrap = 0.15, k = 1) {
    const vx = LP[0] - X, vy = LP[1] - h, vz = LP[2] - Z, d2 = vx * vx + vy * vy + vz * vz, d = Math.sqrt(d2) + 1e-6;
    const lam = clamp(((N[0] * vx + N[1] * vy + N[2] * vz) / d + wrap) / (1 + wrap));
    if (lam <= 0) return 0;
    return k * lam * (0.22 + 0.78 * ss(-0.15, 0.35, vy / d)) / (0.25 + d2);
  }
  const lightZ = (x, y, Z, N, wrap, k) => lampI((x - 240) * Z / F, CH - (y - HZ) * Z / F, Z, N, wrap, k);
  const WZ = 3.5, FACE = [0, 0, -1];
  const Iwall = (x, y) => lightZ(x, y, WZ, FACE, 0.15, 2.0);
  const Itop = (x, y) => { const Z = TOPK / Math.max(2, y - HZ); return lampI((x - 240) * Z / F, TT, Z, [0, 1, 0], 0.1); };

  const ell = (cx, cy, rx, ry) => (x, y) => { const nx = clamp((x - cx) / rx, -1, 1), ny = clamp((y - cy) / ry, -1, 1); return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))]; };
  function cyl(P, Wd) {
    return (x, y) => {
      let best = 1e9, u = 0, ax = 1, ay = 0, w = 6;
      for (let i = 0; i < P.length - 1; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[i + 1], dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, t = clamp(((x - x0) * dx + (y - y0) * dy) / l2), px = x0 + dx * t, py = y0 + dy * t, d = Math.hypot(x - px, y - py);
        if (d < best) { best = d; const l = Math.sqrt(l2); ax = dx / l; ay = dy / l; w = lerp(Wd[i], Wd[i + 1], t); u = clamp(((x - px) * -ay + (y - py) * ax) / w, -1, 1); }
      }
      return [-ay * u, ax * u, Math.sqrt(Math.max(0, 1 - u * u))];
    };
  }
  function surf(n, x, y, Zf, o) {
    let [nx, ny, nz] = n;
    const nx0 = nx;
    if (o.turn) { const c = Math.cos(o.turn), t = Math.sin(o.turn); [nx, nz] = [nx * c + nz * t, nz * c - nx * t]; }
    let N = [nx, -ny + (o.up ?? 0.15), -nz]; const nl = Math.hypot(N[0], N[1], N[2]) || 1; N = [N[0] / nl, N[1] / nl, N[2] / nl];
    const Zs = Zf - nz * (o.rz ?? 0.07), X = (x - 240) * Zs / F, h = CH - (y - HZ) * Zs / F;
    return { Il: lampI(X, h, Zs, N, o.wrap ?? 0.18, o.k ?? 1), Ib: Math.max(0, -N[1]), rim: Math.pow(1 - Math.abs(n[2]), 1.6) * Math.max(0, nx0 * (o.rimDir ?? 1)) };
  }
  const RIMC = [34, 62, 140];
  function volColor(nf, rmp, Zf, o = {}) {
    return (x, y) => {
      const s = surf(nf(x, y), x, y, Zf, o), c = rmp(Math.max(0, s.Il + 0.3 * s.Ib * (o.bounce ?? 1) + (o.lift || 0)));
      const r = s.rim * (o.rim ?? 1);
      return [c[0] + RIMC[0] * r + 34 * s.Ib * 0.4, c[1] + RIMC[1] * r + 14 * s.Ib * 0.4, c[2] + RIMC[2] * r + 4 * s.Ib * 0.4];
    };
  }

  const R_WALL = ramp([[0, '#2A2556'], [0.1, '#4A4A7C'], [0.2, '#7C8A74'], [0.32, '#A8A864'], [0.46, '#D2B45C'], [0.62, '#EEC464'], [0.85, '#FFD878']]);
  const R_PAT = ramp([[0, '#3A3068'], [0.12, '#6A5A98'], [0.25, '#B08A9A'], [0.4, '#E8A8A0'], [0.6, '#FFCFA0'], [0.8, '#FFE8B8']]);
  const R_LEAF = ramp([[0, '#243A5A'], [0.2, '#3E6A6A'], [0.4, '#78A070'], [0.6, '#A8C070']]);
  const R_CLOTH = ramp([[0, '#3C3A84'], [0.1, '#5E5AA0'], [0.25, '#9A92C4'], [0.42, '#E0C8B0'], [0.65, '#F4D8A0'], [0.9, '#FCE8A4'], [1.2, '#FFF0B4'], [1.6, '#FFF8D0']]);
  const R_SKIN = ramp([[0, '#4E2E58'], [0.15, '#80506A'], [0.4, '#C07A78'], [0.8, '#EDA886'], [1.2, '#FFC49A'], [1.6, '#FFDDB0']]);
  const R_HAIR = ramp([[0, '#1C1838'], [0.15, '#2E2240'], [0.4, '#4A3038'], [0.8, '#7A4E38'], [1.2, '#B07840'], [1.6, '#E0A860']]);
  const R_CARDI = ramp([[0, '#2E1C4C'], [0.15, '#5A2858'], [0.4, '#963A5A'], [0.8, '#CC4C50'], [1.2, '#EE6A54'], [1.6, '#FF9068']]);
  const R_APRON = ramp([[0, '#34406C'], [0.15, '#5C7490'], [0.4, '#94B0A0'], [0.8, '#D0E0AC'], [1.2, '#F4F2BC'], [1.6, '#FFFBD8']]);
  const R_CREAM = ramp([[0, '#40407A'], [0.15, '#7A78A8'], [0.4, '#C0B0A8'], [0.8, '#F0DCB4'], [1.2, '#FFF0C8']]);
  const R_OCHRE = ramp([[0, '#34265A'], [0.15, '#664A58'], [0.4, '#B07A38'], [0.8, '#E8A838'], [1.2, '#FFC848'], [1.6, '#FFE080']]);
  const R_SEA = ramp([[0, '#203A62'], [0.15, '#3A6078'], [0.4, '#5E9A88'], [0.8, '#8CC8A0'], [1.2, '#B8E8B0']]);
  const R_NAVY = ramp([[0, '#161638'], [0.15, '#262858'], [0.4, '#3C4A8C'], [0.8, '#5A6CB4'], [1.2, '#8498D0']]);
  const R_WOOD = ramp([[0, '#241838'], [0.15, '#4A2848'], [0.4, '#8A4A3C'], [0.8, '#C47040'], [1.2, '#E89850'], [1.6, '#FFC070']]);
  const R_PORC = ramp([[0, '#3C3E80'], [0.15, '#7478B4'], [0.4, '#B8B8D0'], [0.8, '#F0E8D0'], [1.2, '#FFF6DC'], [1.6, '#FFFFF0']]);
  const R_GOLD = ramp([[0, '#3A2A48'], [0.15, '#6A4A44'], [0.4, '#B08A44'], [0.8, '#EAC468'], [1.2, '#FFE490']]);
  const R_BROTH = ramp([[0, '#6A3A30'], [0.4, '#C8802C'], [0.8, '#F0B040'], [1.2, '#FFD870']]);
  const R_GREEN = ramp([[0, '#1C3A58'], [0.15, '#2C5A58'], [0.4, '#4C9040'], [0.8, '#88C040'], [1.2, '#C8E060']]);
  const R_TOMATO = ramp([[0, '#3A1848'], [0.3, '#9A2A40'], [0.8, '#E04A30'], [1.2, '#FF7040']]);
  const R_EGG = ramp([[0, '#5A3A48'], [0.3, '#B88A30'], [0.8, '#F8C840'], [1.2, '#FFE060']]);
  const R_CURT = ramp([[0, '#2A1840'], [0.08, '#5A2858'], [0.2, '#9A3A5A'], [0.4, '#D04858'], [0.7, '#F07860']]);
  const R_METAL = ramp([[0, '#3A3A5A'], [0.3, '#8A8AA8'], [0.7, '#D8D8E0'], [1.2, '#FFFFFF']]);
  const R_MEAT = ramp([[0, '#3A1E30'], [0.3, '#7A3A28'], [0.8, '#B8602C'], [1.2, '#E89040']]);

  const mulL = (x, y) => { const u = clamp(Iwall(x, y) / 0.55); return [lerp(0.32, 1.1, u), lerp(0.28, 0.98, u), lerp(0.5, 0.8, u)]; };

  const FLOOR = 262;
  function wall(g) {
    const P = rect(-10, -10, 490, FLOOR);
    pt(g, P, (x, y) => { const n = O.fbm(x * 0.02, y * 0.03, 5, 3) - 0.5, c = R_WALL(Iwall(x, y) + n * 0.06); return [c[0] * (1 + n * 0.1), c[1] * (1 - n * 0.03), c[2] * (1 - n * 0.1)]; },
      { dir: V, dj: 0.28, len: [14, 28], w: [4, 8], cover: 1.8, a: 0.5, dry: 0.08, jitter: 0.04, cj: 8, seed: 'wall' });
    scatter(g, P, {
      seed: 'wallsc', density: 0.007, len: [6, 14], w: [2.4, 5], a: [0.14, 0.3], dir: V, dj: 0.7, nb: 2,
      col: (x, y, q) => { const I = Iwall(x, y), c = R_WALL(I); return I > 0.34 ? O.mixc(c, q < 0.5 ? [255, 150, 120] : [255, 214, 100], 0.4) : O.mixc(c, q < 0.5 ? [80, 100, 200] : [70, 150, 130], 0.35); },
    });

    const r = O.rng('paper');
    for (let row = 0; row < 14; row++) for (let col = 0; col < 23; col++) {
      const x = 8 + col * 22 + (row % 2) * 11 + (r() - 0.5) * 4, y = 8 + row * 19.5 + (r() - 0.5) * 4, I = Iwall(x, y), a0 = r() * TAU, pc = R_PAT(I * 0.9 + 0.04);
      for (let k = 0; k < 5; k++) { const a = a0 + k * TAU / 5; O.stroke(g, [[x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2], [x + Math.cos(a) * 3.8, y + Math.sin(a) * 3.8]], { w: 2.4, col: pc, a: 0.5, nb: 1, dry: 0, taper: 0.3, seed: row * 100 + col * 5 + k }); }
      O.stroke(g, [[x - 0.6, y - 0.6], [x + 0.6, y + 0.4]], { w: 1.6, col: R_PAT(I * 0.9 + 0.3), a: 0.6, nb: 1, dry: 0, seed: row * 100 + col + 800 });
      for (const s of [-1, 1]) O.stroke(g, [[x + s * 3, y + 4.5], [x + s * 6.6, y + 8.6]], { w: 1.8, col: R_LEAF(I * 0.9), a: 0.45, nb: 1, dry: 0, taper: 0.3, seed: row * 100 + col + 900 + s });
    }

    pt(g, rect(-10, FLOOR, 490, 310), (x, y) => R_WOOD(0.04 + 0.1 * ss(0, 1, 1 - Math.abs(x - 240) / 260)), { dir: 0, dj: 0.04, len: [20, 40], w: [3, 6], cover: 2, a: 0.7, seed: 'floor' });
    pt(g, rect(-10, FLOOR - 8, 490, FLOOR), (x, y) => R_WOOD(Iwall(x, y) * 1.1 + 0.1), { dir: 0, len: [14, 28], w: [1.6, 2.6], cover: 2.4, a: 0.8, seed: 'base' });
    O.line(g, [[-10, FLOOR - 8], [490, FLOOR - 8]], { w: 0.9, col: [255, 200, 130], a: 0.3, nb: 1, seed: 8 });
  }

  function picture(g) {
    const [x0, y0, x1, y1] = [24, 18, 74, 64], Pi = rect(x0 + 4, y0 + 4, x1 - 4, y1 - 4);
    O.glaze(g, rect(x0 + 2, y0 + 3, x1 + 3, y1 + 4), 'rgba(40,24,60,1)', 0.4, 'multiply', 1.6);
    pt(g, rect(x0, y0, x1, y1), (x, y) => R_GOLD(Iwall(x, y) * 1.5 + 0.1 + (x < x0 + 2.5 || y < y0 + 2.5 ? 0.3 : 0)), { dir: 0, len: [5, 10], w: [1.4, 2.2], cover: 2.6, seed: 'frame' });
    g.save(); O.path(g, Pi); g.clip();
    O.region(g, rect(x0 + 4, y0 + 4, x1 - 4, y0 + 22), { color: (x, y) => O.mixc('#6A78C8', '#F0A8A0', (y - y0) / 20), light: mulL, dir: 0, len: [6, 12], w: [2, 3.4], cover: 2.4, seed: 'pic1' });
    O.region(g, [[x0 + 4, y0 + 24], [x0 + 16, y0 + 17], [x0 + 32, y0 + 25], [x1 - 4, y0 + 19], [x1 - 4, y1 - 4], [x0 + 4, y1 - 4]], { color: '#4E8A6A', light: mulL, dir: 0.2, len: [5, 10], w: [2, 3.4], cover: 2.4, seed: 'pic2' });
    O.region(g, [[x0 + 4, y0 + 34], [x1 - 4, y0 + 30], [x1 - 4, y1 - 4], [x0 + 4, y1 - 4]], { color: '#D8A050', light: mulL, dir: 0, len: [5, 10], w: [2, 3.4], cover: 2.4, seed: 'pic3' });
    O.region(g, rect(x0 + 30, y0 + 24, x0 + 38, y0 + 31), { color: '#C0503A', light: mulL, dir: 0, len: [3, 5], w: [1.4, 2], cover: 2.6, seed: 'pic4' });
    g.restore();
  }

  const CLOCK = [150, 44, 14];
  function clock(g) {
    const [cx, cy, r] = CLOCK;
    O.glaze(g, O.ellipse(cx + 1.2, cy + 3, r + 2, r + 2), 'rgba(40,24,60,1)', 0.4, 'multiply', 1.6);
    pt(g, O.ellipse(cx, cy, r + 2.4, r + 2.4), (x, y) => R_WOOD(Iwall(x, y) * 1.3 + 0.12 + 0.35 * ss(0.5, 1, 1 - Math.hypot(x - cx + 4, y - cy + 5) / (r * 1.6))), { dir: (x, y) => Math.atan2(y - cy, x - cx) + V, len: [3, 6], w: [1.2, 2], cover: 2.6, seed: 'clockrim' });
    pt(g, O.ellipse(cx, cy, r, r), (x, y) => mulc([244, 234, 204], mulL(x, y)), { dir: (x, y) => Math.atan2(y - cy, x - cx) + V, len: [3, 7], w: [1.2, 2.2], cover: 2.6, seed: 'clockface' });
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU, l = k % 3 ? 1.3 : 2.4;
      O.stroke(g, [[cx + Math.sin(a) * (r - 1.3), cy - Math.cos(a) * (r - 1.3)], [cx + Math.sin(a) * (r - 1.3 - l), cy - Math.cos(a) * (r - 1.3 - l)]], { w: k % 3 ? 0.6 : 0.95, col: [70, 48, 80], a: 0.85, nb: 1, dry: 0, seed: k });
    }
  }

  function sideboard(g) {
    const Wn = FACE, lt = (x, y, N) => lightZ(x, y, 3.0, N || Wn, 0.15, 1.5);
    O.glaze(g, [[-10, 262], [120, 262], [126, 270], [-10, 270]], 'rgba(30,20,50,1)', 0.45, 'multiply', 2);
    pt(g, rect(-12, 152, 118, 262), (x, y) => R_WOOD(lt(x, y) * 0.95), { dir: V, dj: 0.06, len: [10, 22], w: [3, 5], cover: 2.2, a: 0.7, seed: 'sbfront' });
    for (const [a, b] of [[4, 54], [62, 112]]) {
      pt(g, rect(a, 164, b, 248), (x, y) => R_WOOD(lt(x, y) * 0.8 - 0.04 * ((x - a) / 50)), { dir: V, len: [8, 18], w: [2.4, 4], cover: 2.4, seed: 'sbdoor' + a });
      O.line(g, [[a, 249], [b, 249]], { w: 1, col: [255, 190, 120], a: 0.35, nb: 1, seed: 20 + a });
      O.line(g, [[a, 164], [b, 164]], { w: 1.1, col: [40, 20, 50], a: 0.5, nb: 1, seed: 22 + a });
      O.line(g, [[b, 164], [b, 248]], { w: 1.1, col: [40, 20, 50], a: 0.4, nb: 1, seed: 24 + a });
    }
    O.stroke(g, [[56, 202], [56, 212]], { w: 2, col: [240, 200, 110], a: 0.9, nb: 1, dry: 0, seed: 31 });
    pt(g, rect(-14, 146, 122, 153), (x, y) => R_WOOD(lt(x, y, [0, 1, 0]) * 1.1 + 0.2), { dir: 0, len: [10, 22], w: [1.6, 2.6], cover: 2.6, seed: 'sbtop' });
    O.line(g, [[-14, 146.4], [122, 146.4]], { w: 1, col: [255, 214, 150], a: 0.55, nb: 1, seed: 33 });

    const vb = spline([[26, 118], [38, 118], [41, 128], [40, 140], [36, 146], [28, 146], [24, 140], [23, 128]], 5);
    O.glaze(g, [[18, 147], [48, 147], [52, 150], [20, 150]], 'rgba(30,20,50,1)', 0.45, 'multiply', 1.2);
    pt(g, vb, volColor(ell(32, 131, 9, 15), R_PORC, 3.0, { rimDir: 0 }), { dir: V, len: [3, 6], w: [1.2, 2], cover: 2.8, seed: 'vase' });
    O.line(g, [[24, 132], [30, 134.5], [40, 132]], { w: 1.6, col: [70, 86, 170], a: 0.7, nb: 2, seed: 34 });
    const r = O.rng('bouquet'), cols = [[250, 200, 70], [255, 150, 70], [170, 110, 200], [255, 232, 160], [240, 120, 120]];
    for (let k = 0; k < 9; k++) { const a = -V + (k - 4) * 0.2, l = 20 + r() * 12; O.stroke(g, [[32, 120], [32 + Math.cos(a) * l * 0.9, 120 + Math.sin(a) * l]], { w: 1.3, col: [60, 120, 80], a: 0.8, nb: 1, dry: 0, seed: 40 + k }); }
    for (let k = 0; k < 34; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 21, x = 32 + Math.cos(a) * d * 0.95, y = 94 + Math.sin(a) * d * 0.85, c = cols[Math.floor(r() * cols.length)], lit = 0.55 + 0.6 * ss(-18, 18, x - 32);
      O.stroke(g, [[x - 2.2, y - 0.5], [x + 2.2, y + 0.5]], { w: 3 + r() * 1.6, col: [c[0] * lit, c[1] * lit, c[2] * lit * 1.05], a: 0.85, nb: 2, dry: 0.05, cj: 12, seed: 100 + k });
    }
    for (let k = 0; k < 12; k++) { const a = r() * TAU, d = r() * 22, x = 32 + Math.cos(a) * d, y = 96 + Math.sin(a) * d * 0.9; O.stroke(g, [[x, y], [x + 3.4, y + 1.6]], { w: 2, col: [70, 140, 90], a: 0.55, nb: 1, dry: 0, seed: 200 + k }); }
  }

  const WIN = [332, 14, 438, 150];
  function windowOut(g) {
    const [x0, y0, x1, y1] = WIN, G = rect(x0, y0, x1, y1);
    g.save(); O.path(g, G); g.clip();
    O.region(g, G, { color: (x, y) => { const t = (y - y0) / (y1 - y0), s = [[0, '#1F2A7E'], [0.28, '#3A3C9C'], [0.52, '#6A4AA0'], [0.72, '#C0609C'], [0.88, '#F08A70'], [1, '#FFC070']]; for (let k = 1; k < s.length; k++) if (t <= s[k][0]) return O.mixc(s[k - 1][1], s[k][1], (t - s[k - 1][0]) / (s[k][0] - s[k - 1][0])); return O.rgb(s[5][1]); }, light: ONE, dir: 0, dj: 0.04, len: [10, 22], w: [3, 5], cover: 2, a: 0.75, dry: 0.04, cj: 8, seed: 'dusk' });
    for (const [cx, cy, l, c] of [[360, 98, 34, [255, 170, 170]], [412, 90, 28, [255, 180, 160]], [380, 112, 40, [255, 190, 150]], [350, 76, 26, [190, 130, 220]]]) O.stroke(g, [[cx - l / 2, cy], [cx + l / 2, cy - 1.5]], { w: 3.2, col: c, a: 0.4, nb: 3, dry: 0.1, seed: cx });
    for (const [bx, bw, top, k] of [[330, 26, 120, 'a'], [352, 44, 112, 'b'], [394, 46, 124, 'c']]) {
      const roof = k === 'b' ? [[bx, 128], [bx, 118], [bx + bw / 2, 104], [bx + bw, 118], [bx + bw, 128]] : [[bx, top], [bx + bw, top]];
      O.region(g, roof.concat([[bx + bw, y1 + 4], [bx, y1 + 4]]), { color: '#28245A', light: ONE, dir: V, len: [6, 12], w: [2, 3.4], cover: 2, seed: 'house' + k });
      O.line(g, roof, { w: 0.9, col: [140, 120, 200], a: 0.5, nb: 1, seed: bx });
    }
    O.region(g, rect(380, 98, 384, 112), { color: '#28245A', light: ONE, dir: V, len: [4, 8], w: [1.4, 2], cover: 2.4, seed: 'chimney' });
    for (const [wx, wy, big] of [[338, 130, 0], [344, 137, 0], [361, 130, 0], [368, 136, 1], [404, 137, 0], [418, 131, 0], [426, 139, 0]]) { const ww = big ? 4 : 3, hh = big ? 4.6 : 3.6; g.fillStyle = 'rgba(255,208,110,0.95)'; g.fillRect(wx, wy, ww, hh); O.glaze(g, O.ellipse(wx + ww / 2, wy + hh / 2, ww * 1.6, hh * 1.6), 'rgba(255,190,90,1)', 0.3, 'screen', 1.2); }
    O.stroke(g, [[420, 26], [420.8, 26]], { w: 1.2, col: [240, 232, 255], a: 0.8, nb: 1, dry: 0, seed: 91 });
    O.glaze(g, O.ellipse(348, 52, 15, 7), 'rgba(255,232,170,1)', 0.16, 'screen', 2.5);
    O.glaze(g, [[342, 14], [349, 14], [344, 150], [336, 150]], 'rgba(255,220,160,1)', 0.05, 'screen', 2);
    g.restore();
    const fr = (a, b, w, k) => O.line(g, [a, b], { w, col: mulc(R_CREAM(0.22 + 0.2 * Iwall(a[0], a[1])), [1, 1, 1.04]), a: 0.95, seed: k });
    fr([x0 - 2, y0 - 1.5], [x1 + 2, y0 - 1.5], 3.4, 1); fr([x0 - 1.5, y0 - 2], [x0 - 1.5, y1 + 1], 3.2, 2); fr([x1 + 1.5, y0 - 2], [x1 + 1.5, y1 + 1], 3.2, 3);
    fr([385, y0], [385, y1], 2.8, 4); fr([x0, 82], [x1, 82], 2.6, 5);
    pt(g, [[x0 - 8, y1], [x1 + 8, y1], [x1 + 10, y1 + 6], [x0 - 10, y1 + 6]], (x, y) => R_CREAM(0.35 + 0.3 * Iwall(x, y) + 0.3 * ss(y1 + 2, y1, y)), { dir: 0, len: [8, 16], w: [1.6, 2.6], cover: 2.4, seed: 'sill' });
    O.line(g, [[x0 - 8, y1 + 0.6], [x1 + 8, y1 + 0.6]], { w: 1, col: [255, 236, 190], a: 0.45, nb: 1, seed: 6 });
    O.glaze(g, [[x0 - 6, y1 + 6], [x1 + 6, y1 + 6], [x1 + 2, y1 + 18], [x0 - 2, y1 + 18]], 'rgba(30,20,70,1)', 0.35, 'multiply', 3);
  }

  function curtains(g) {
    O.line(g, [[304, 10], [468, 10]], { w: 1.8, col: [70, 44, 60], a: 0.9, nb: 2, seed: 70 });
    const L = spline([[312, 9], [338, 9], [339, 40], [334, 80], [337, 96], [343, 140], [346, 178], [318, 178], [320, 140], [323, 98], [319, 80], [313, 40]], 4),
      Rr = spline([[428, 9], [458, 9], [462, 40], [458, 80], [462, 96], [462, 140], [466, 178], [438, 178], [440, 140], [437, 98], [432, 80], [429, 40]], 4);
    for (const [P, x0, x1, k] of [[L, 312, 346, 'cl'], [Rr, 428, 466, 'cr']]) {
      const col = (x, y) => { const fold = 0.5 + 0.5 * Math.sin((x - x0) * 0.62 + (y - 9) * 0.01), I = (0.08 + 0.45 * Iwall(x, y)) * (0.35 + 1.1 * fold) * (k === 'cl' ? 1.1 : 0.65); return mulc(R_CURT(I), [1, 1, 1 + 0.06 * (1 - fold)]); };
      O.glaze(g, P.map(([x, y]) => [x + 2.5, y + 2]), 'rgba(30,20,50,1)', 0.35, 'multiply', 2.4);
      pt(g, P, col, { dir: V, dj: 0.06, len: [8, 18], w: [2, 3.6], cover: 2.6, a: 0.8, seed: 'curt' + k });
      for (let f = 0; f < 5; f++) { const x = lerp(x0 + 4, x1 - 4, (f + 0.5) / 5); O.line(g, [[x, 12], [x + (f - 2) * 0.8, 96], [x + (f - 2) * 1.4, 176]], { w: 0.8, col: [60, 24, 60], a: 0.28, nb: 1, seed: 80 + f + x0 }); }
    }
    for (const [x, y] of [[337, 92], [434, 92]]) O.line(g, [[x - 5, y], [x + 5, y + 1]], { w: 2, col: [236, 190, 100], a: 0.8, nb: 1, seed: 90 + x });
  }

  function lamp(g) {
    O.line(g, [[240, -6], [240, 7]], { w: 1.5, col: [60, 36, 50], a: 0.95, nb: 1, seed: 120 });
    pt(g, rect(236.5, 2, 243.5, 8), () => [200, 150, 80], { dir: V, len: [3, 5], w: [1, 1.6], cover: 3, seed: 'cap' });
    const body = spline([[233, 6], [247, 6], [263, 15], [276, 28], [281, 33], [240, 41], [199, 33], [204, 28], [217, 15]], 5);
    pt(g, body, (x, y) => mulc(O.mixc('#FFEDA0', '#FFF8DA', ss(8, 38, y)), [1, 1, 1 - 0.05 * Math.abs(x - 240) / 40]), { dir: (x, y) => Math.atan2(y - 6, x - 240) , dj: 0.08, len: [4, 9], w: [1.6, 3], cover: 2.6, jitter: 0.02, seed: 'shade' });
    pt(g, O.ellipse(240, 34.5, 41, 6.4, 40), (x, y) => O.mixc('#FFFFFF', '#FFE9A0', Math.hypot((x - 240) / 41, (y - 34.5) / 6.4)), { dir: 0, len: [4, 9], w: [1.2, 2.2], cover: 2.8, jitter: 0.02, seed: 'shadein' });
    O.line(g, O.ellipse(240, 34.5, 41, 6.4, 40, 0.05 * Math.PI, 0.95 * Math.PI), { w: 1, col: [200, 140, 70], a: 0.5, nb: 1, seed: 121 });
  }
  function lampGlow(g) {
    O.glaze(g, O.ellipse(240, 36, 78, 22), 'rgba(255,226,150,1)', 0.4, 'screen', 5);
    O.glaze(g, O.ellipse(240, 40, 150, 80), 'rgba(255,208,120,1)', 0.16, 'screen', 14);
    O.glaze(g, O.ellipse(240, 150, 120, 60), 'rgba(255,196,110,1)', 0.07, 'screen', 18);
  }

  const CH0 = { x0: 198, x1: 282, top: 78 };
  function chairShadow(g) {
    O.glaze(g, spline([[184, 92], [296, 92], [304, 184], [176, 184]], 4), 'rgba(50,28,80,1)', 0.4, 'multiply', 5);
  }
  function chairHis(g) {
    const Z = 2.45, lt = (x, y, N) => lightZ(x, y, Z, N || FACE, 0.2, 1) * 0.55;
    const wood = (x, y, N, add = 0) => R_WOOD(lt(x, y, N) + add);
    for (const [a, b] of [[CH0.x0, CH0.x0 + 8], [CH0.x1 - 8, CH0.x1]]) {
      pt(g, rect(a, CH0.top + 8, b, FARY + 1), (x, y) => wood(x, y, [(a < 240 ? -0.5 : 0.5), 0, -0.85]), { dir: V, dj: 0.04, len: [10, 24], w: [1.4, 2.4], cover: 2.6, a: 0.85, seed: 'post' + a });
      O.line(g, [[a < 240 ? a + 7.4 : a + 0.6, CH0.top + 10], [a < 240 ? a + 7.4 : a + 0.6, FARY]], { w: 0.9, col: [255, 170, 100], a: 0.4, nb: 1, seed: 125 + a });
    }
    const rails = [[104, 112], [124, 132], [144, 152], [164, 174]];
    for (const [a, b] of rails) {
      pt(g, rect(CH0.x0 + 7, a, CH0.x1 - 7, b), (x, y) => wood(x, y, FACE, -0.05), { dir: 0, len: [8, 16], w: [1.4, 2.4], cover: 2.6, seed: 'rail' + a });
      O.line(g, [[CH0.x0 + 7, a + 0.4], [CH0.x1 - 7, a + 0.4]], { w: 1.2, col: [255, 196, 120], a: 0.7, nb: 2, seed: 130 + a });
      O.glaze(g, rect(CH0.x0 + 7, b, CH0.x1 - 7, b + 4), 'rgba(40,20,70,1)', 0.3, 'multiply', 1.4);
    }

    const crest = []; for (let x = CH0.x0 - 2; x <= CH0.x1 + 2; x += 4) crest.push([x, 97 - 18 * (1 - Math.pow((x - 240) / 44, 2))]);
    crest.push([CH0.x1 + 2, 104], [CH0.x0 - 2, 104]);
    O.glaze(g, crest.map(([x, y]) => [x + 1, y + 3.5]), 'rgba(40,20,70,1)', 0.35, 'multiply', 1.6);
    pt(g, crest, (x, y) => wood(x, y, [0, 0.25 * ss(92, 82, y), -0.95], 0.1), { dir: 0, len: [8, 16], w: [1.8, 3], cover: 2.6, seed: 'crest' });
    O.line(g, crest.slice(1, crest.length - 3).map(([x, y]) => [x, y + 0.5]), { w: 1.3, col: [255, 208, 140], a: 0.75, nb: 2, seed: 140 });
  }

  function chairsSide(g) {
    const lt = (x, y) => lightZ(x, y, 2.05, [0.9, 0, -0.4], 0.2, 1) * 0.3;
    pt(g, rect(40, 252, 120, 264), (x, y) => R_WOOD(lt(x, y)), { dir: 0, len: [8, 16], w: [1.6, 2.6], cover: 2.6, seed: 'wc3' });
    const ls = (x, y) => lightZ(x, y, 1.95, [-0.8, 0.3, -0.5], 0.2, 1) * 0.55;
    O.glaze(g, [[444, 160], [474, 160], [480, 300], [448, 300]], 'rgba(30,18,60,1)', 0.3, 'multiply', 2);
    pt(g, rect(448, 158, 456, 300), (x, y) => R_WOOD(ls(x, y)), { dir: V, len: [10, 22], w: [1.6, 2.6], cover: 2.6, seed: 'sc1' });
    O.line(g, [[448.6, 160], [448.6, 290]], { w: 0.9, col: [255, 170, 100], a: 0.35, nb: 1, seed: 151 });
    pt(g, spline([[438, 152], [456, 150.5], [476, 152], [478, 159], [456, 161], [438, 160]], 4), (x, y) => R_WOOD(ls(x, y) + 0.1), { dir: 0, len: [8, 14], w: [1.8, 3], cover: 2.6, seed: 'sc2' });
    O.line(g, [[439, 152.4], [476, 152.4]], { w: 1.1, col: [255, 200, 130], a: 0.55, nb: 2, seed: 150 });
    O.glaze(g, [[438, 160], [478, 160], [478, 166], [438, 166]], 'rgba(30,18,60,1)', 0.3, 'multiply', 1.4);
    pt(g, rect(372, 278, 480, 290), (x, y) => R_WOOD(ls(x, y) + 0.05), { dir: 0, len: [8, 16], w: [1.8, 3], cover: 2.6, seed: 'sc4' });
  }

  const ZW = 2.05;
  function wifeBody(g) {
    const H0 = spline([[95, 76], [109, 81], [115, 93], [116, 105], [112, 118], [104, 128], [94, 132], [85, 128], [78, 118], [74, 103], [77, 89], [85, 79]], 5);
    const torso = spline([[60, 160], [70, 150], [88, 146], [108, 149], [122, 158], [126, 178], [126, 204], [118, 232], [112, 266], [56, 266], [52, 232], [56, 200], [56, 172]], 5);
    O.glaze(g, torso.map(([x, y]) => [x - 5, y + 2]), 'rgba(30,18,60,1)', 0.3, 'multiply', 4);
    pt(g, torso, volColor(ell(90, 204, 38, 60), R_CARDI, ZW, { turn: 0.45 }), { rough: 0.3, dir: (x, y) => V + (x - 92) / 150, dj: 0.08, len: [5, 10], w: [2, 3.4], cover: 2.6, seed: 'wtorso' });
    const apron = spline([[96, 160], [114, 156], [122, 170], [126, 198], [122, 228], [112, 266], [86, 266], [88, 216], [92, 182]], 5);
    pt(g, apron, volColor(ell(108, 212, 20, 56), R_APRON, ZW + 0.05, { bounce: 0.6, turn: 0.45 }), { rough: 0.3, dir: V, dj: 0.1, len: [4, 9], w: [1.8, 3], cover: 2.6, seed: 'wapron' });
    for (let k = 0; k < 5; k++) O.line(g, [[95 + k * 6, 204], [96 + k * 6, 260]], { w: 0.7, col: [70, 120, 130], a: 0.2, nb: 1, seed: 160 + k });
    O.line(g, [[97, 159], [91, 148]], { w: 1.3, col: R_APRON(0.55), a: 0.9, nb: 1, seed: 170 }); O.line(g, [[115, 156], [106, 149]], { w: 1.3, col: R_APRON(0.9), a: 0.9, nb: 1, seed: 171 });
    O.line(g, spline([[56, 172], [54, 200], [52, 232]], 4, false), { w: 1.1, col: [120, 150, 230], a: 0.25, nb: 1, seed: 172 });
    O.line(g, spline([[122, 158], [126, 178], [126, 204]], 4, false), { w: 1.5, col: [255, 190, 120], a: 0.5, nb: 2, seed: 173 });

    pt(g, [[84, 126], [106, 126], [111, 150], [78, 152]], volColor(ell(95, 140, 15, 14), R_SKIN, ZW, { lift: -0.3, turn: 0.4 }), { dir: V, len: [3, 6], w: [1.4, 2.4], cover: 2.8, seed: 'wneck' });
    pt(g, [[82, 146], [106, 146], [99, 163], [92, 163]], volColor(ell(95, 154, 12, 12), R_CREAM, ZW, { turn: 0.4 }), { dir: 0.4, len: [3, 6], w: [1.2, 2], cover: 2.8, seed: 'wcollar' });
    g.save(); g.translate(96, 132); g.rotate(0.09); g.translate(-96, -132);
    pt(g, H0, volColor(ell(94, 104, 21, 29), R_SKIN, ZW, { wrap: 0.15, rim: 0.9, turn: 0.62 }), { rough: 0.25, dir: (x, y) => Math.atan2(y - 104, x - 94) + V, dj: 0.15, len: [3, 6], w: [1.4, 2.4], cover: 3, dry: 0.04, jitter: 0.04, cj: 6, seed: 'whead' });
    O.glaze(g, [[78, 112], [96, 126], [108, 124], [114, 112], [100, 118]], 'rgba(120,50,100,1)', 0.22, 'multiply', 2.5);
    scatter(g, H0, { seed: 'wblush', n: 22, len: [3, 6], w: [2, 3.2], a: [0.14, 0.26], dir: 0.6, col: (x, y) => (x > 98 && y > 104 && y < 122 ? [236, 120, 110] : null) });
    pt(g, O.ellipse(83.5, 110, 3, 5, 14), volColor(ell(83.5, 110, 3, 5), R_SKIN, ZW, { lift: -0.2 }), { dir: V, len: [2, 4], w: [1, 1.6], cover: 3, seed: 'wear' });
    const hair = spline([[109, 84], [97, 76], [82, 78], [74, 90], [72, 105], [75, 119], [82, 129], [88, 122], [86, 110], [93, 101], [102, 96], [111, 93]], 5);
    O.glaze(g, hair.map(([x, y]) => [x + 2, y + 3]), 'rgba(80,30,60,1)', 0.22, 'multiply', 1.6);
    pt(g, spline([[77, 88], [69, 82], [61, 86], [59, 94], [65, 100], [73, 98]], 5), volColor(ell(67, 90, 9, 9), R_HAIR, ZW, { rimDir: -1, turn: 0.3 }), { dir: 0.5, len: [3, 5], w: [1.4, 2.2], cover: 3, seed: 'wbun' });
    pt(g, hair, volColor(ell(90, 96, 22, 28), R_HAIR, ZW, { wrap: 0.3, turn: 0.45 }), { rough: 0.25, dir: (x, y) => Math.atan2(y - 82, x - 98) + 1.2, dj: 0.15, len: [4, 8], w: [1.4, 2.2], cover: 3, dry: 0.04, seed: 'whair' });
    for (let k = 0; k < 6; k++) O.line(g, [[107 - k * 1.2, 84 + k * 1.2], [97 - k * 2.4, 78 + k * 0.8], [85 - k * 2, 84 + k * 3]], { w: 0.9, col: R_HAIR(0.8 + 0.2 * (k % 2)), a: 0.5, nb: 1, seed: 180 + k });
    O.line(g, spline([[110, 86], [115, 96], [117, 106]], 4, false), { w: 1.2, col: [255, 214, 160], a: 0.5, nb: 2, seed: 190 });
    g.restore();
  }

  function wifeArm(g, sil) {
    const up = [[112, 160], [120, 182], [124, 198]], upW = [9, 8.5, 7.5], fa = [[124, 198], [150, 190], [176, 178]], faW = [7.5, 6.2, 5];
    const upP = limb(up, upW), faP = limb(fa, faW);
    O.glaze(g, faP.map(([x, y]) => [x - 3, y + 6]), 'rgba(60,40,130,1)', 0.35, 'multiply', 2.5);
    pt(g, upP, volColor(cyl(up, upW), R_CARDI, ZW - 0.05), { rough: 0.25, dir: Math.atan2(38, 12), len: [4, 8], w: [1.8, 3], cover: 2.8, seed: 'wup' });
    pt(g, faP, volColor(cyl(fa, faW), R_CARDI, ZW - 0.1), { rough: 0.25, dir: Math.atan2(-20, 52), len: [4, 8], w: [1.6, 2.6], cover: 2.8, seed: 'wfa' });
    for (let k = 0; k < 3; k++) O.line(g, [[132 + k * 8, 196 - k * 3 - 5], [134 + k * 8, 196 - k * 3 + 5]], { w: 0.7, col: [90, 40, 80], a: 0.22, nb: 1, seed: 200 + k });
    O.line(g, faP.slice(0, 10), { w: 1.2, col: [255, 196, 130], a: 0.45, nb: 2, seed: 205 });
    const cuffP = [[170, 181], [178, 177]], cuff = limb(cuffP, [5.4, 5]);
    pt(g, cuff, volColor(cyl(cuffP, [5.4, 5]), R_CREAM, ZW - 0.1), { dir: 0, len: [2, 4], w: [1, 1.6], cover: 3, seed: 'wcuff' });
    const hand = spline([[177, 172], [184, 171.5], [190, 174], [190.5, 179], [185, 181.5], [178, 180]], 4);
    pt(g, hand, volColor(ell(184, 176.5, 7, 5), R_SKIN, ZW - 0.1, { wrap: 0.3 }), { dir: 0.2, len: [2, 4], w: [1, 1.6], cover: 3.2, seed: 'whand' });
    O.line(g, [[180, 173], [187, 173]], { w: 0.8, col: [255, 214, 170], a: 0.5, nb: 1, seed: 206 });

    const C1 = [[184, 175], [233, 187]], C2 = [[185, 177.6], [235, 189.2]];
    for (const [c, a] of [[C1, 0.95], [C2, 0.8]]) O.stroke(g, c, { w: 1.5, col: [120, 40, 40], a, nb: 2, dry: 0, taper: 0.02, seed: 207 + c[0][1] });
    O.line(g, [[187, 175], [231, 186.2]], { w: 0.6, col: [255, 160, 120], a: 0.55, nb: 1, seed: 209 });
    const meat = spline([[228.5, 184], [233, 182.4], [238, 183.8], [238.6, 188], [234, 190.4], [229.5, 188.8]], 4);
    pt(g, meat, volColor(ell(233.5, 186.5, 5.4, 4.2), R_MEAT, 2.2, { wrap: 0.3, up: 0.7, lift: 0.2 }), { dir: 0.2, len: [2, 4], w: [1, 1.6], cover: 3.2, seed: 'meat' });
    O.line(g, [[230.4, 184.2], [236, 183.4]], { w: 0.8, col: [255, 214, 140], a: 0.6, nb: 1, seed: 210 });
    if (sil) sil.push(upP, faP, cuff, hand, meat, limb(C1, [0.9, 0.9]), limb(C2, [0.9, 0.9]));
  }

  const ZS = 1.95;
  function sonBody(g) {
    const torso = spline([[366, 178], [372, 164], [388, 160], [406, 161], [420, 168], [424, 184], [424, 208], [420, 238], [414, 272], [372, 272], [366, 238], [364, 208]], 5);
    O.glaze(g, torso.map(([x, y]) => [x + 5, y + 3]), 'rgba(30,18,70,1)', 0.3, 'multiply', 4);
    const nf = ell(392, 216, 34, 58), oc = volColor(nf, R_OCHRE, ZS, { rimDir: 1, turn: -0.35 }), sea = volColor(nf, R_SEA, ZS, { rimDir: 1, turn: -0.35 });
    pt(g, torso, oc, { rough: 0.3, dir: (x, y) => 0.05 * (x - 392) / 40, dj: 0.06, len: [5, 10], w: [2, 3.4], cover: 2.6, seed: 'storso' });
    g.save(); O.path(g, torso); g.clip();
    for (let y0 = 164, i = 0; y0 < 280; y0 += 10, i++) for (let x = 358; x < 432; x += 10) {
      const ya = y0 + (x - 392) * (x - 392) / 900, yb = y0 + (x + 10 - 392) * (x + 10 - 392) / 900;
      O.stroke(g, [[x, ya], [x + 11, yb]], { w: 4.4, col: sea(x + 5, (ya + yb) / 2), a: 0.7, nb: 2, dry: 0.04, taper: 0.03, cj: 6, seed: i * 31 + x });
    }
    g.restore();
    O.line(g, spline([[420, 168], [424, 184], [424, 208], [420, 238]], 4, false), { w: 1.6, col: [150, 190, 255], a: 0.5, nb: 2, seed: 300 });
    O.line(g, spline([[372, 164], [388, 160], [406, 161]], 4, false), { w: 1.5, col: [255, 214, 130], a: 0.55, nb: 2, seed: 301 });
    pt(g, [[374, 258], [424, 258], [424, 276], [374, 276]], volColor(ell(398, 266, 28, 16), R_NAVY, ZS, { rimDir: 1, turn: -0.35 }), { dir: 0, len: [5, 10], w: [2, 3.4], cover: 2.8, seed: 'sshorts' });

    pt(g, [[384, 145], [402, 145], [404, 162], [382, 162]], volColor(ell(393, 154, 11, 16), R_SKIN, ZS, { lift: -0.35, turn: 0.4 }), { dir: V, len: [3, 6], w: [1.4, 2.4], cover: 2.8, seed: 'sneck' });
    pt(g, spline([[379, 156], [405, 156], [406, 163], [392, 167], [380, 163]], 4), volColor(ell(392, 161, 13, 8), R_NAVY, ZS, { turn: -0.2 }), { dir: 0, len: [3, 6], w: [1.2, 2], cover: 2.8, seed: 'scollar' });
    const head = spline([[394, 105], [408, 110], [413, 124], [411, 139], [403, 150], [392, 153], [383, 148], [378, 137], [377, 121], [382, 109]], 5);
    pt(g, head, volColor(ell(394, 129, 18, 24), R_SKIN, ZS, { wrap: 0.3, rim: 1.3, rimDir: 1, turn: 0.55 }), { rough: 0.25, dir: (x, y) => Math.atan2(y - 129, x - 394) + V, dj: 0.15, len: [3, 6], w: [1.4, 2.4], cover: 3, dry: 0.04, jitter: 0.04, cj: 6, seed: 'shead' });
    scatter(g, head, { seed: 'sblush', n: 14, len: [3, 5], w: [2, 3], a: [0.12, 0.22], dir: 0.4, col: (x, y) => (x > 398 && y > 128 && y < 142 ? [240, 130, 120] : null) });
    pt(g, O.ellipse(386.5, 131, 3.6, 5, 14), volColor(ell(386.5, 131, 3.6, 5), R_SKIN, ZS, { lift: -0.2 }), { dir: V, len: [2, 4], w: [1, 1.6], cover: 3, seed: 'sear' });
    const hair = spline([[408, 110], [394, 103], [381, 106], [375, 119], [374, 136], [379, 147], [385, 140], [384, 126], [391, 117], [403, 117], [410, 122]], 5);
    pt(g, hair, volColor(ell(388, 124, 21, 24), R_HAIR, ZS, { wrap: 0.3, rimDir: 1, rim: 1.4, turn: -0.2 }), { rough: 0.25, dir: (x, y) => Math.atan2(y - 110, x - 394) + 1.3, dj: 0.15, len: [4, 8], w: [1.4, 2.2], cover: 3, dry: 0.04, seed: 'shair' });
    O.stroke(g, [[388, 104], [384, 98.5]], { w: 1.8, col: R_HAIR(0.7), a: 0.9, nb: 2, dry: 0, seed: 310 });
    O.line(g, spline([[402, 106], [409, 113], [412, 124]], 4, false), { w: 1.3, col: [170, 200, 255], a: 0.6, nb: 2, seed: 311 });
    O.line(g, spline([[388, 103], [378, 109], [375, 121]], 4, false), { w: 1.3, col: [255, 200, 130], a: 0.5, nb: 2, seed: 312 });
  }

  function sonArm(g) {
    const A = [[414, 172], [432, 182], [448, 163]], Wd = [7.5, 6.5, 5], P = limb(A, Wd);
    pt(g, P, volColor(cyl(A, Wd), R_OCHRE, ZS - 0.05, { rimDir: 1, turn: -0.2 }), { dir: 0.5, len: [4, 7], w: [1.6, 2.6], cover: 2.8, seed: 'sarm' });
    for (let k = 0; k < 3; k++) O.line(g, [[422 + k * 7, 172 + k * 3], [425 + k * 7, 181 + k * 2]], { w: 1.6, col: R_SEA(0.5), a: 0.5, nb: 1, seed: 320 + k });
    pt(g, spline([[444, 154], [451, 151.5], [458, 153], [460, 158], [453, 162], [446, 161]], 4), volColor(ell(452, 157, 7, 5), R_SKIN, ZS - 0.05, { rimDir: 1, turn: 0.3 }), { dir: 0.2, len: [2, 4], w: [1, 1.6], cover: 3, seed: 'shand' });
  }

  const TOP = [[139.2, FARY], [340.8, FARY], [455.8, 310], [24.6, 310]];
  function cloth(g) {
    const col = (x, y) => { const n = O.fbm(x * 0.04, y * 0.05, 9, 3) - 0.5, c = R_CLOTH(Itop(x, y)); return [c[0] * (1 + n * 0.07), c[1] * (1 + n * 0.02), c[2] * (1 - n * 0.1)]; };
    pt(g, O.rough(TOP, 0.5, 41, 3), col, { dir: (x, y) => Math.atan2(HZ - y, 240 - x), dj: 0.07, len: [10, 24], w: [3, 6], cover: 2.4, a: 0.72, dry: 0.06, jitter: 0.04, cj: 8, seed: 'cloth' });
    scatter(g, TOP, {
      seed: 'clsc', density: 0.022, len: [6, 14], w: [2.4, 4.6], a: [0.22, 0.42], dir: (x, y) => Math.atan2(HZ - y, 240 - x), dj: 0.2, nb: 2,
      col: (x, y, q) => { const I = Itop(x, y), c = R_CLOTH(I); return I > 1.0 ? O.mixc(c, [255, 252, 224], 0.7) : I < 0.55 ? O.mixc(c, q < 0.5 ? [120, 120, 220] : [200, 150, 210], 0.4) : O.mixc(c, [255, 190, 150], 0.35); },
    });

    const dx = (2 * XS) / 10;
    for (let k = 0; k < 10; k += 2) O.glaze(g, O.rough([[xAt(-XS + k * dx, FARY), FARY], [xAt(-XS + (k + 1) * dx, FARY), FARY], [xAt(-XS + (k + 1) * dx, 310), 310], [xAt(-XS + k * dx, 310), 310]], 0.4, 50 + k, 3), 'rgba(140,150,228,1)', 0.22, 'multiply', 0.5);
    for (let k = 0; ; k += 2) {
      const Za = 2.29 - k * dx, Zb = 2.29 - (k + 1) * dx; if (Zb < 1.1) break;
      const ya = HZ + TOPK / Za, yb = HZ + TOPK / Zb;
      O.glaze(g, O.rough([[edgeL(ya), ya], [edgeR(ya), ya], [edgeR(yb), yb], [edgeL(yb), yb]], 0.4, 60 + k, 3), 'rgba(140,150,228,1)', 0.22, 'multiply', 0.5);
    }
    O.glaze(g, [[300, FARY], [340.8, FARY], [455.8, 310], [330, 310]], 'rgba(110,140,250,1)', 0.13, 'screen', 8);
    O.glaze(g, O.ellipse(240, 218, 90, 24), 'rgba(255,226,150,1)', 0.1, 'screen', 9);

    O.line(g, [[139.2, FARY + 0.3], [340.8, FARY + 0.3]], { w: 1.3, col: [255, 244, 196], a: 0.7, nb: 2, seed: 70 });
    O.line(g, [[139.2, FARY], [24.6, 310]], { w: 1.3, col: [255, 226, 170], a: 0.45, nb: 2, seed: 71 });
    O.line(g, [[340.8, FARY], [455.8, 310]], { w: 1.3, col: [235, 216, 200], a: 0.4, nb: 2, seed: 72 });
  }

  function skirts(g) {
    const SKL = [[139.2, FARY], [139.2, 247], [99.4, 310], [24.6, 310]], SKR = [[340.8, FARY], [340.8, 247], [380.6, 310], [455.8, 310]];
    for (const [P, side, k] of [[SKL, -1, 'l'], [SKR, 1, 'r']]) {
      const col = (x, y) => { const fold = 0.5 + 0.5 * Math.sin(x * 0.55 + (side < 0 ? 1 : 2)), I = 0.06 + 0.12 * fold + 0.06 * (1 - (y - FARY) / 104); const c = R_CLOTH(I); return addc(c, [20, 8, 0], 0.5 + 0.5 * ss(220, 296, y)); };
      pt(g, O.rough(P, 0.5, 80, 3), col, { dir: V, dj: 0.08, len: [8, 16], w: [2, 3.6], cover: 2.6, a: 0.8, seed: 'skirt' + k });
      O.line(g, [[P[2][0], P[2][1]], [P[1][0], P[1][1]]], { w: 3, col: [92, 100, 190], a: 0.5, nb: 2, seed: 330 + side });
      for (let f = 0; f < 4; f++) { const u = (f + 0.5) / 4, x0 = lerp(P[0][0], P[3][0], u), x1 = lerp(P[1][0], P[2][0], u); O.line(g, [[x0, lerp(FARY, 310, u)], [x1, lerp(247, 310, u)]], { w: 1.1, col: [40, 24, 90], a: 0.3, nb: 1, seed: 340 + f + side * 10 }); }
    }
    O.glaze(g, [[139, 236], [100, 310], [50, 310], [139, 236]], 'rgba(20,10,50,1)', 0.25, 'multiply', 6);
  }

  const SIL = [];
  const tableZ = y => TOPK / (y - HZ);

  function bowl(g, cx, cy, rx, h, o) {
    const ry = rx * 0.34, Z = tableZ(cy + h), sil = [];
    const bodyP = spline([[cx - rx, cy], [cx - rx * 0.96, cy + h * 0.45], [cx - rx * 0.55, cy + h * 0.95], [cx + rx * 0.55, cy + h * 0.95], [cx + rx * 0.96, cy + h * 0.45], [cx + rx, cy]], 4, false).concat(O.ellipse(cx, cy, rx, ry, 24, 0, Math.PI).reverse());
    O.glaze(g, O.ellipse(cx + (cx - 240) * 0.06, cy + h * 0.95 + 0.6, rx * 1.05, ry * 0.95), 'rgba(60,40,140,1)', 0.5, 'multiply', 1.2);
    const nfBody = (x, y) => { const u = clamp((x - cx) / rx, -1, 1); return [u, 0.2 + 0.4 * (y - cy) / h, Math.sqrt(Math.max(0, 1 - u * u))]; };
    pt(g, bodyP, volColor(nfBody, R_PORC, Z, { rz: 0.04, rim: 0.7, up: 0.3 }), { dir: V, len: [3, 6], w: [1.2, 2], cover: 2.8, seed: 'bowl' + cx });
    sil.push(bodyP);
    O.line(g, spline([[cx - rx * 0.97, cy + h * 0.28], [cx, cy + h * 0.42], [cx + rx * 0.97, cy + h * 0.28]], 5, false), { w: 1.4, col: [70, 90, 180], a: 0.75, nb: 2, seed: 400 + cx });
    O.line(g, spline([[cx - rx * 0.6, cy + h * 0.9], [cx, cy + h * 1.0], [cx + rx * 0.6, cy + h * 0.9]], 4, false), { w: 1, col: [90, 100, 180], a: 0.4, nb: 1, seed: 401 + cx });
    const rim = O.ellipse(cx, cy, rx, ry, 28);
    pt(g, rim, volColor(ell(cx, cy, rx, ry * 2.2), R_PORC, Z, { lift: 0.15, rz: 0.04 }), { dir: 0, len: [3, 6], w: [1, 1.6], cover: 3, seed: 'rim' + cx });
    sil.push(rim);
    if (o.rice) {
      const mound = spline([[cx - rx * 0.86, cy + 0.4], [cx - rx * 0.6, cy - h * 0.5], [cx - rx * 0.1, cy - h * 0.86], [cx + rx * 0.4, cy - h * 0.7], [cx + rx * 0.8, cy - h * 0.2], [cx + rx * 0.86, cy + 0.4], [cx, cy + ry * 0.9]], 4);
      pt(g, mound, volColor(ell(cx - 1, cy - h * 0.1, rx * 0.9, h * 0.95), R_PORC, Z - 0.05, { lift: 0.25, wrap: 0.3, up: 0.7 }), { dir: (x, y) => Math.atan2(y - cy, x - cx) + V, len: [2, 4], w: [1, 1.6], cover: 3.2, a: 0.88, seed: 'rice' + cx });
      scatter(g, mound, { seed: 'grain' + cx, n: 60, len: [1.4, 2.6], w: [0.7, 1.1], a: [0.5, 0.8], dir: 0.4, dj: 2, nb: 1, dry: 0, col: (x, y, q) => (q < 0.5 ? [255, 252, 236] : [236, 214, 196]) });
      sil.push(mound);
    }
    if (o.broth) {
      const inner = O.ellipse(cx, cy + 0.3, rx - 1.3, ry - 0.6, 24);
      pt(g, inner, (x, y) => R_BROTH(0.45 + 0.7 * ss(1, -1, (y - cy) / ry) + 0.2 * Math.sin(x * 1.4)), { dir: 0, len: [2, 4], w: [1, 1.5], cover: 3, seed: 'broth' + cx });
      O.stroke(g, [[cx - rx * 0.4, cy - 0.6], [cx + rx * 0.2, cy - 1]], { w: 1, col: [255, 240, 190], a: 0.7, nb: 1, dry: 0, seed: 402 + cx });
    }
    return sil;
  }
  function plate(g, cx, cy, rx, ry, food, seed) {
    const Z = tableZ(cy), outer = O.ellipse(cx, cy, rx, ry, 36), inner = O.ellipse(cx, cy - 0.2, rx * 0.8, ry * 0.76, 32);
    O.glaze(g, O.ellipse(cx + (cx - 240) * 0.04, cy + 2.2, rx * 1.03, ry * 1.02), 'rgba(60,40,140,1)', 0.45, 'multiply', 1.4);
    pt(g, outer, volColor(ell(cx, cy, rx, ry * 2), R_PORC, Z, { rz: 0.03, up: 0.8 }), { dir: 0, len: [4, 8], w: [1.2, 2], cover: 2.8, seed: 'pl' + seed });
    O.line(g, O.ellipse(cx, cy, rx * 0.9, ry * 0.88, 30, 0.1, Math.PI - 0.1), { w: 1, col: [80, 98, 186], a: 0.6, nb: 1, seed: 410 + seed });
    pt(g, inner, volColor(ell(cx, cy, rx * 0.8, ry * 1.6), R_PORC, Z, { lift: -0.08, rz: 0.03, up: 0.8 }), { dir: 0, len: [3, 6], w: [1, 1.6], cover: 2.8, seed: 'pli' + seed });
    food(g, cx, cy, rx * 0.74, ry * 0.7, Z);
  }
  function greens(g, cx, cy, rx, ry, Z) {
    const heap = spline([[cx - rx, cy + 1], [cx - rx * 0.6, cy - ry * 1.3], [cx, cy - ry * 1.9], [cx + rx * 0.6, cy - ry * 1.2], [cx + rx, cy + 1], [cx, cy + ry * 0.9]], 4);
    pt(g, heap, volColor(ell(cx, cy - ry * 0.5, rx, ry * 1.8), R_GREEN, Z - 0.05, { wrap: 0.3, bounce: 0.4, up: 0.8 }), { dir: (x, y) => Math.atan2(y - cy, x - cx) * 0.3 + 0.4, dj: 0.7, len: [3, 6], w: [1.4, 2.4], cover: 3, seed: 'gr' + cx });
    scatter(g, heap, { seed: 'grsc' + cx, n: 26, len: [2.5, 4.5], w: [1.2, 2], a: [0.5, 0.8], dir: 0.5, dj: 2, nb: 1, dry: 0, col: (x, y, q) => (q < 0.4 ? [226, 244, 110] : q < 0.7 ? [70, 150, 80] : [250, 250, 190]) });
  }
  function tomato(g, cx, cy, rx, ry, Z) {
    const heap = spline([[cx - rx, cy + 1], [cx - rx * 0.5, cy - ry * 1.1], [cx + rx * 0.2, cy - ry * 1.5], [cx + rx * 0.8, cy - ry * 0.8], [cx + rx, cy + 1], [cx, cy + ry * 0.9]], 4);
    pt(g, heap, volColor(ell(cx, cy - ry * 0.4, rx, ry * 1.6), R_TOMATO, Z - 0.05, { wrap: 0.3, bounce: 0.5, up: 0.8, lift: 0.25 }), { dir: 0.3, dj: 0.8, len: [3, 6], w: [1.4, 2.4], cover: 3, seed: 'to' + cx });
    scatter(g, heap, { seed: 'tosc' + cx, n: 30, len: [3, 6], w: [1.6, 2.6], a: [0.6, 0.9], dir: 0.4, dj: 1.4, nb: 1, dry: 0, col: (x, y, q) => (q < 0.55 ? R_EGG(0.9 + 0.3 * ss(cy + 2, cy - ry * 1.4, y)) : q < 0.8 ? [255, 120, 70] : [255, 236, 150]) });
  }

  function tureen(g, cx, cy, rx, h) {
    const Z = tableZ(cy + h * 0.5), body = spline([[cx - rx, cy - h * 0.3], [cx - rx * 0.98, cy + h * 0.1], [cx - rx * 0.7, cy + h * 0.5], [cx + rx * 0.7, cy + h * 0.5], [cx + rx * 0.98, cy + h * 0.1], [cx + rx, cy - h * 0.3]], 4, false).concat([[cx + rx, cy - h * 0.3], [cx - rx, cy - h * 0.3]]);
    O.glaze(g, O.ellipse(cx - 3, cy + h * 0.52, rx * 1.1, rx * 0.3), 'rgba(60,40,140,1)', 0.5, 'multiply', 1.4);
    pt(g, body, volColor((x, y) => { const u = clamp((x - cx) / rx, -1, 1); return [u, 0.3, Math.sqrt(Math.max(0, 1 - u * u))]; }, R_PORC, Z, { rz: 0.05 }), { dir: V, len: [3, 6], w: [1.4, 2.2], cover: 2.8, seed: 'tur' });
    for (const s of [-1, 1]) O.line(g, spline([[cx + s * rx * 0.98, cy - h * 0.15], [cx + s * (rx + 6), cy - h * 0.15], [cx + s * (rx + 6), cy + h * 0.1], [cx + s * rx * 0.96, cy + h * 0.15]], 4, false), { w: 1.8, col: R_PORC(s < 0 ? 0.2 : 0.9), a: 0.9, nb: 2, seed: 420 + s });
    O.line(g, spline([[cx - rx * 0.97, cy + h * 0.1], [cx, cy + h * 0.2], [cx + rx * 0.97, cy + h * 0.1]], 5, false), { w: 1.6, col: [70, 90, 180], a: 0.75, nb: 2, seed: 423 });
    const lid = spline([[cx - rx * 1.04, cy - h * 0.3], [cx - rx * 0.86, cy - h * 0.62], [cx - rx * 0.4, cy - h * 0.92], [cx, cy - h * 1.0], [cx + rx * 0.4, cy - h * 0.92], [cx + rx * 0.86, cy - h * 0.62], [cx + rx * 1.04, cy - h * 0.3]], 4, false);
    pt(g, lid, volColor((x, y) => { const u = clamp((x - cx) / (rx * 1.04), -1, 1); return [u * 0.8, (y - cy + h * 0.5) / (h * 0.5), Math.sqrt(Math.max(0, 1 - u * u * 0.64))]; }, R_PORC, Z - 0.04, { lift: 0.1, rz: 0.05 }), { dir: (x, y) => Math.atan2(y - cy, x - cx) * 0.5 + V, len: [3, 6], w: [1.2, 2], cover: 3, seed: 'lid' });
    pt(g, O.ellipse(cx, cy - h * 1.04, 2.8, 2.2, 10), volColor(ell(cx, cy - h * 1.04, 2.8, 2.2), R_GOLD, Z - 0.04, { lift: 0.2 }), { dir: 0, len: [2, 3], w: [1, 1.4], cover: 3.4, seed: 'knob' });
    O.line(g, spline([[cx - rx * 0.9, cy - h * 0.38], [cx, cy - h * 0.28], [cx + rx * 0.9, cy - h * 0.38]], 5, false), { w: 1, col: [60, 70, 150], a: 0.5, nb: 1, seed: 424 });
  }
  function chopsticks(g, sil) {
    for (const [a, b, k] of [[[278, 200], [304, 192], 0], [[280, 202.8], [306, 194.8], 1]]) {
      O.glaze(g, limb([[a[0] - 1, a[1] + 1.6], [b[0] - 1, b[1] + 1.6]], [0.9, 0.9]), 'rgba(60,40,140,1)', 0.4, 'multiply', 0.8);
      O.stroke(g, [a, b], { w: 1.6, col: [130, 44, 44], a: 0.95, nb: 2, dry: 0, taper: 0.02, seed: 430 + k });
      O.stroke(g, [[a[0] + 1, a[1] - 0.4], [b[0] - 1, b[1] - 0.4]], { w: 0.6, col: [255, 170, 130], a: 0.6, nb: 1, dry: 0, taper: 0.1, seed: 432 + k });
      sil.push(limb([a, b], [0.7, 0.7]));
    }
  }

  function paintBack(g, silOut) {
    O.ground(g, W, H, { tone: '#4A2E48', seed: 7 });
    const far = O.layer(W, H, f => {
      O.ground(f, W, H, { tone: '#4A2E48', seed: 7 });
      wall(f); picture(f); clock(f); sideboard(f); windowOut(f); curtains(f);
    });
    g.save(); g.filter = `blur(${0.4 * O.R}px)`; g.drawImage(far, 0, 0, W, H); g.restore();
    chairShadow(g); chairsSide(g); chairHis(g);
    wifeBody(g); sonBody(g); sonArm(g);
    cloth(g); skirts(g);
    tureen(g, 126, 232, 17, 19);
    plate(g, 140, 270, 34, 10.5, greens, 1);
    plate(g, 354, 242, 28, 9.4, tomato, 2);
    bowl(g, 330, 206, 13, 10, { broth: true });
    SIL.length = 0;
    SIL.push(...bowl(g, 240, 195, 17, 12, { rice: true }));
    chopsticks(g, SIL);
    wifeArm(g, SIL);
    lamp(g); lampGlow(g);
    O.finish(g, W, H, { vignette: 0.7, vignetteColor: '#2A1B3E', tint: ['#FFB66A', 0.07], grain: 0.17 });
  }

  let cache = null;
  function build() {
    if (cache) return cache;
    SIL.length = 0;
    const back = O.layer(W, H, g => paintBack(g));

    const mask = O.layer(W, H, g => { g.fillStyle = '#fff'; for (const p of SIL) { O.path(g, p); g.fill(); } });
    const front = O.canvas(back.width, back.height), fg = front.getContext('2d');
    fg.drawImage(back, 0, 0); fg.globalCompositeOperation = 'destination-in'; fg.drawImage(mask, 0, 0);
    const blur = O.canvas(W * O.R / 2, H * O.R / 2), bg = blur.getContext('2d');
    bg.filter = `blur(${7 * O.R / 2}px)`; bg.drawImage(back, -20, -20, blur.width + 40, blur.height + 40);
    return (cache = { back, front, blur });
  }

  function steam(g, x0, y0, t, seed, n, rise, spread, alpha) {
    for (let k = 0; k < n; k++) {
      const ph = O.hash(seed, k, 1), u = (t * 0.17 + k / n + ph) % 1, sway = Math.sin((u * 1.3 + ph * 3) * TAU) * spread * u;
      const x = x0 + sway + (ph - 0.5) * spread * 0.5, y = y0 - rise * u, r = 2.2 + 7 * u, a = alpha * Math.pow(Math.sin(Math.PI * u), 1.3) * (0.7 + 0.3 * O.hash(seed, k, 2));
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,246,220,${a})`); gr.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function hand(g, cx, cy, a, l, w, rgb, tail = 0) {
    const dx = Math.sin(a), dy = -Math.cos(a);
    for (const [k, al] of [[2.2, 0.22], [1, 0.9]]) {
      g.strokeStyle = `rgba(${rgb},${al})`; g.lineWidth = w * k; g.beginPath();
      g.moveTo(cx - dx * tail, cy - dy * tail); g.lineTo(cx + dx * l, cy + dy * l); g.stroke();
    }
  }
  function liveBack(g, t) {
    g.save(); g.lineCap = 'round';
    steam(g, 126, 211, t, 11, 7, 34, 7, 0.26);
    steam(g, 330, 199, t, 12, 4, 22, 5, 0.16);
    const [cx, cy, r] = CLOCK, hr = (7 + 30 / 60) / 12 * TAU + t / 43200 * TAU, mn = 0.5 * TAU + t / 3600 * TAU, sc = (t % 60) / 60 * TAU;
    hand(g, cx, cy, hr, r * 0.5, 1.5, '60,36,60');
    hand(g, cx, cy, mn, r * 0.78, 1.0, '60,36,60');
    hand(g, cx, cy, sc, r * 0.86, 0.42, '176,56,48', 2.6);
    g.fillStyle = 'rgba(60,36,60,0.9)'; g.beginPath(); g.arc(cx, cy, 0.9, 0, TAU); g.fill();

    const k = 0.03 + 0.022 * Math.sin(t * 0.83 + 0.5) + 0.012 * Math.sin(t * 2.1 + 1.3);
    g.globalCompositeOperation = 'screen';
    let gr = g.createRadialGradient(240, 38, 4, 240, 60, 130);
    gr.addColorStop(0, `rgba(255,222,140,${k * 2.2})`); gr.addColorStop(1, 'rgba(255,212,120,0)');
    g.fillStyle = gr; g.fillRect(100, 0, 280, 190);
    gr = g.createRadialGradient(240, 200, 6, 240, 200, 110);
    gr.addColorStop(0, `rgba(255,226,150,${k * 0.9})`); gr.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = gr; g.fillRect(120, 150, 240, 100);
    g.restore();
  }
  function liveFront(g, t) {
    g.save();
    steam(g, 240, 184, t + 3.1, 21, 6, 26, 6, 0.26);
    g.restore();
  }

  const light = { key: [1.02, 0.84, 0.58], keyDir: [-0.1, -1], fill: [0.46, 0.38, 0.6], rim: [0.55, 0.68, 1.0], rimDir: [1, 0] };

  window.DeskScenes = Object.assign(window.DeskScenes || {}, { home: { W, H, build, liveBack, liveFront, light, style: 'oil' } });
})();
