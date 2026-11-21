(function () {
  const O = window.Oil, W = 480, H = 256, R = O.R, TAU = Math.PI * 2;
  const { clamp, lerp, hash, fbm, noise2 } = O;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const seedN = s => O.seedOf(s) & 0xffff;

  const SILK = [226, 209, 173];
  const INK = [22, 17, 13];
  const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const css = (c, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${clamp(a)})`;

  const inkC = t => { const e = Math.pow(clamp(t), 0.75); return [0, 1, 2].map(i => lerp(255, 255 * INK[i] / SILK[i], e)); };
  const OCHRE = [242, 210, 166];
  const INDIGO = [168, 192, 200];
  const LEAF = [150, 170, 122];
  const tint = (t, c, u) => mix(inkC(t), c, u);

  function smooth(pts, ds = 0.5) {
    if (pts.length < 2) return pts.slice();
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / ds));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  const centroid = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
  const grow = (P, d) => { const [cx, cy] = centroid(P); return P.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / l * d, y + (y - cy) / l * d]; }); };
  const onPath = (P, x) => { for (let i = 1; i < P.length; i++) if ((P[i - 1][0] - x) * (P[i][0] - x) <= 0) { const u = (x - P[i - 1][0]) / ((P[i][0] - P[i - 1][0]) || 1); return lerp(P[i - 1][1], P[i][1], u); } return P[P.length - 1][1]; };

  function ribbon(P, N, T, wid, i0, i1, off, frac, jag, ns) {
    const Lf = [], Rt = [];
    for (let i = i0; i <= i1; i++) {
      const w = wid[i], c = off * w, h = w * frac / 2;
      const e1 = 1 + jag * (noise2(i * 0.35, 3.1 + ns, 7) - 0.5) * 2, e2 = 1 + jag * (noise2(i * 0.35, 8.7 + ns, 7) - 0.5) * 2;
      Lf.push([P[i][0] + N[i][0] * (c + h * e1), P[i][1] + N[i][1] * (c + h * e1)]);
      Rt.push([P[i][0] + N[i][0] * (c - h * e2), P[i][1] + N[i][1] * (c - h * e2)]);
    }
    const wa = wid[i0] * frac * 0.45, wb = wid[i1] * frac * 0.45;
    const ca = [P[i0][0] + N[i0][0] * off * wid[i0] - T[i0][0] * wa, P[i0][1] + N[i0][1] * off * wid[i0] - T[i0][1] * wa];
    const cb = [P[i1][0] + N[i1][0] * off * wid[i1] + T[i1][0] * wb, P[i1][1] + N[i1][1] * off * wid[i1] + T[i1][1] * wb];
    return [ca].concat(Lf, [cb], Rt.reverse());
  }

  function brush(g, pts, o = {}) {
    const P = smooth(pts, o.ds ?? 0.4), n = P.length;
    if (n < 2) return;
    const S = [0];
    for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = S[n - 1]; if (L < 0.2) return;
    const T = [], N = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      T.push([dx / l, dy / l]); N.push([-dy / l, dx / l]);
    }
    const sd = seedN(o.seed ?? 1), kind = o.kind || 'wet', w0 = o.w ?? 1;
    const head = o.head ?? clamp(1.6 * w0 / L, 0.03, 0.3), tail = o.tail ?? 0.4, press = o.press ?? (kind === 'fine' ? 1.1 : 1.35), lift = o.lift ?? 0.15;
    const wob = o.wob ?? (kind === 'fine' ? 0.1 : 0.25);
    const wid = S.map(s => {
      const u = s / L;
      const k = lerp(0.5, 1, sstep(0, head, u)) * (1 + (press - 1) * Math.exp(-(((u - head) / (head + 0.02)) ** 2))) * lerp(1, lift, sstep(1 - tail, 1, u));
      return w0 * k * (1 + (noise2(s * 0.25, 1.7, sd) - 0.5) * 2 * wob);
    });
    const col = o.col || inkC(o.t ?? 0.85), a = o.a ?? 0.92, jag = o.jag ?? 0.18;
    g.save(); g.globalCompositeOperation = o.mode || 'multiply';
    const fill = (poly, st) => { g.fillStyle = st; O.path(g, poly); g.fill(); };
    if (kind !== 'dry') {
      const bl = o.bleed ?? (kind === 'wet' ? 0.16 : 0);
      if (bl > 0) fill(ribbon(P, N, T, wid, 0, n - 1, 0, 1.4, jag, sd), css(col, a * bl));
      fill(ribbon(P, N, T, wid, 0, n - 1, 0, 1, jag, sd), css(col, a));
    } else {
      const nb = o.nb ?? Math.max(3, Math.min(9, Math.round(w0 * 2.2))), dry = o.dry ?? 0.45, gap = o.gap ?? 2.5, bf = o.bfrac ?? 1.5;
      for (let j = 0; j < nb; j++) {
        const r = m => hash(j * 13 + m, sd, 91);
        const off = ((j + 0.5) / nb - 0.5) * 0.95 + (r(1) - 0.5) * 0.35 / nb;
        const frac = bf / nb * (0.5 + r(2) * 1.0), ns = r(3) * 300;
        const st = css(o.col ? col : inkC(clamp((o.t ?? 0.85) * (0.8 + 0.35 * r(4)))), a * (0.55 + 0.45 * r(5)));
        let i0 = -1;
        for (let i = 0; i <= n; i++) {
          const on = i < n && noise2(S[i] / gap + ns, j * 3.7, sd) >= dry * (0.3 + 0.9 * S[i] / L);
          if (on && i0 < 0) i0 = i;
          else if (!on && i0 >= 0) { if (i - 1 > i0) fill(ribbon(P, N, T, wid, i0, i - 1, off, frac, jag * 1.5, ns), st); i0 = -1; }
        }
      }
    }
    g.restore();
  }

  const pnoise = (u, v, P, seed) => {
    const lat = (ix, iy) => hash(((ix % P) + P) % P, ((iy % P) + P) % P, seed), f = t => t * t * (3 - 2 * t);
    const ix = Math.floor(u), iy = Math.floor(v), fx = f(u - ix), fy = f(v - iy), a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  function tile(fn, size = 256) {
    const c = O.canvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const k = (j * size + i) * 4, v = fn(i, j); img.data[k] = v[0]; img.data[k + 1] = v[1]; img.data[k + 2] = v[2]; img.data[k + 3] = v[3]; }
    x.putImageData(img, 0, 0); return c;
  }
  let GRAIN = null, GRAN = null;
  function tiles() {
    if (GRAIN) return;
    const r1 = O.rng('silkgrain'), r2 = O.rng('granul');
    GRAIN = tile((i, j) => { const u = i / 256 * 40, v = j / 256 * 40; let n = pnoise(u, v, 40, 11) * 0.55 + pnoise(u * 2, v * 2, 40, 12) * 0.3 + (r1() - 0.5) * 0.35; n = clamp(0.5 + (n - 0.45) * 1.1); const c = n * 255; return [c, c, c, 255]; });
    GRAN = tile((i, j) => { const n = pnoise(i / 256 * 12, j / 256 * 12, 12, 21) * 0.7 + r2() * 0.3; return [255, 255, 255, Math.round(clamp((n - 0.35) * 1.6) * 255)]; });
  }

  function wash(g, poly, o = {}) {
    const soft = o.soft ?? 2, pad = soft * 2.6 + 2;
    const [x0, y0, x1, y1] = O.bbox(poly);
    const bx = Math.floor(x0 - pad), by = Math.floor(y0 - pad), bw = Math.ceil(x1 + pad) - bx, bh = Math.ceil(y1 + pad) - by;
    const c = O.canvas(bw * R, bh * R), tc = c.getContext('2d');
    tc.setTransform(R, 0, 0, R, -bx * R, -by * R);
    const col = o.col || inkC(o.t ?? 0.4), a = o.a ?? 0.5;
    const style = k => {
      if (!o.grad) return css(col, a * k);
      const gr = o.grad, lg = gr.y0 != null ? tc.createLinearGradient(0, gr.y0, 0, gr.y1) : tc.createLinearGradient(gr.x0, 0, gr.x1, 0);
      lg.addColorStop(0, css(col, a * k * (gr.a0 ?? 1))); if (gr.am != null) lg.addColorStop(0.5, css(col, a * k * gr.am)); lg.addColorStop(1, css(col, a * k * (gr.a1 ?? 0)));
      return lg;
    };
    tc.filter = `blur(${soft * R}px)`; tc.fillStyle = style(1); O.path(tc, poly); tc.fill();
    if (o.edge) { tc.filter = `blur(${Math.max(0.2, soft * 0.22) * R}px)`; tc.strokeStyle = style(1 + o.edge); tc.lineWidth = 0.35 + o.edge * 0.9; O.path(tc, poly); tc.stroke(); }
    tc.filter = 'none';
    if (o.gran) {
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'destination-out'; tc.globalAlpha = o.gran;
      const p = tc.createPattern(GRAN, 'repeat'); p.setTransform(new DOMMatrix().translate(-bx * R, -by * R)); tc.fillStyle = p; tc.fillRect(0, 0, c.width, c.height);
    }
    g.save(); g.globalCompositeOperation = o.mode || 'multiply'; g.drawImage(c, bx, by, bw, bh); g.restore();
  }

  function axe(g, f) {
    const r = O.rng('ax' + f.seed);
    g.save(); O.path(g, grow(f.clip, 0.5)); g.clip();
    f.src.forEach((s, si) => {
      const P = smooth(s.pts, 1), rows = s.rows ?? 2;
      for (let row = 0; row < rows; row++) {
        const n = Math.round(s.n * Math.pow(0.55, row));
        for (let k = 0; k < n; k++) {
          const u = r(), p = P[Math.min(P.length - 1, Math.floor(u * (P.length - 1)))];
          const ang = s.ang + (r() - 0.5) * (s.aj ?? 0.25), ca = Math.cos(ang), sa = Math.sin(ang);
          const back = row * s.L * 0.55 + (r() - 0.35) * 2.5, jit = (r() - 0.5) * (s.jit ?? 2);
          const x = p[0] + ca * back - sa * jit, y = p[1] + sa * back + ca * jit;
          const L = s.L * (0.55 + r() * 0.75) * (1 - row * 0.15), w = s.w * (0.6 + r() * 0.6), t = clamp(s.t * (0.8 + r() * 0.25) * (1 - row * 0.12)), bend = (r() - 0.5) * L * 0.15;
          const pts = [[x, y], [x + ca * L * 0.5 - sa * bend, y + sa * L * 0.5 + ca * bend], [x + ca * L, y + sa * L]], sk = f.seed + ':' + si + ':' + row + ':' + k;
          brush(g, pts, { kind: 'wet', w: w * 0.8, t: t * 0.8, a: 0.26, press: 1.3, head: 0.1, tail: 0.75, lift: 0.35, bleed: 0, jag: 0.3, seed: sk + 'w' });
          brush(g, pts, { kind: 'dry', w, t, press: 1.3, head: 0.08, tail: 0.8, lift: 0.5, dry: s.dry ?? 0.45, gap: 1.7, nb: Math.round(5 + w * 1.5), bfrac: 1.2, a: 0.85, jag: 0.25, seed: sk });
        }
      }
    });
    g.restore();
  }

  function axeFace(g, f) {
    if (f.src) { axe(g, {seed:f.seed, clip:f.poly, src:f.src}); return; }
    const [x0,y0,x1,y1] = O.bbox(f.poly);
    axe(g, {seed:f.seed, clip:f.poly, src:[{
      pts:[[x0,y0+2],[x1,y0]], n:3, ang:2.15, L:(y1-y0)*0.8,
      w:f.w??1.8, t:0.58, rows:1, dry:0.6, aj:0.3,
    }]});
  }

  let SILKC = null;
  function reserve(g, poly, soft = 0.3) {
    const [x0, y0, x1, y1] = O.bbox(poly), bx = Math.floor(x0 - 2), by = Math.floor(y0 - 2), bw = Math.ceil(x1 + 2) - bx, bh = Math.ceil(y1 + 2) - by;
    const c = O.canvas(bw * R, bh * R), tc = c.getContext('2d');
    tc.setTransform(R, 0, 0, R, -bx * R, -by * R); tc.filter = `blur(${soft * R}px)`; tc.fillStyle = '#000'; O.path(tc, poly); tc.fill();
    tc.filter = 'none'; tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-in';
    tc.drawImage(SILKC, bx * R, by * R, bw * R, bh * R, 0, 0, bw * R, bh * R);
    g.drawImage(c, bx, by, bw, bh);
  }
  function cun(g, poly, o = {}) {
    const key = String(o.seed ?? 1), r = O.rng('cun' + key), [x0, y0, x1, y1] = O.bbox(poly), n = o.n ?? 100, size = o.size ?? 4, clump = o.clump ?? 0.6, sd = seedN(key) % 997;
    let placed = 0, tries = 0;
    g.save(); O.path(g, grow(poly, 0.6)); g.clip();
    while (placed < n && tries < n * 14) {
      tries++;
      const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
      if (!O.inside(poly, x, y)) continue;
      const cl = fbm(x * 0.07, y * 0.07, sd, 3), d = (o.density ? o.density(x, y) : 1) * (1 - clump + clump * clamp((cl - 0.35) * 2.5));
      if (r() > d) continue;
      const t = (o.t ?? 0.8) * (0.7 + 0.45 * r()) * (0.85 + 0.3 * cl), sk = key + ':' + placed++;
      if (o.kind === 'rain') {
        const L = size * (0.5 + r() * 0.9), ang = Math.PI / 2 + (r() - 0.5) * 0.6;
        brush(g, [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], { kind: 'wet', w: (o.w ?? 0.6) * (0.6 + r() * 0.7), t, press: 1.4, head: 0.3, tail: 0.6, a: o.a ?? 0.85, bleed: 0, seed: sk });
      } else {
        const L = size * (2 + r() * 3), ang = (o.angle ?? Math.PI / 2) + (r() - 0.5) * 0.35, ca = Math.cos(ang), sa = Math.sin(ang);
        brush(g, [[x, y], [x + ca * L * 0.5 + (r() - 0.5) * 1.5, y + sa * L * 0.5 + (r() - 0.5) * 1.5], [x + ca * L, y + sa * L]],
          { kind: 'dry', w: (o.w ?? 0.5) * (0.6 + r() * 0.5), t, press: 1.15, tail: 0.5, dry: 0.3, gap: 3, a: o.a ?? 0.7, seed: sk });
      }
    }
    g.restore();
  }
  function dots(g, pts, o = {}) {
    const key = String(o.seed ?? 1), r = O.rng('dots' + key);
    pts.forEach((p, i) => {
      const s = (o.size ?? 2) * (0.6 + r() * 0.8), a = (o.angle ?? -0.25) + (r() - 0.5) * 0.8;
      brush(g, [p, [p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s]], { kind: 'wet', w: (o.w ?? 1) * (0.6 + r() * 0.7), t: (o.t ?? 0.92) * (0.78 + r() * 0.25), col: o.col,
        press: 1.5, head: 0.35, tail: 0.55, lift: 0.3, bleed: 0.25, a: o.a ?? 0.95, seed: key + ':' + i });
    });
  }

  function edges(g, pts, o = {}) {
    const key = String(o.seed ?? 1), r = O.rng('ed' + key);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[0] < 0 && b[0] < 0) || (a[1] > H && b[1] > H)) continue;
      if (o.skip && r() < o.skip) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1), bow = (r() - 0.5) * len * 0.07;
      const dry = r() < (o.dry ?? 0.65);
      brush(g, [a, [lerp(a[0], b[0], 0.5) + nx * bow, lerp(a[1], b[1], 0.5) + ny * bow], [lerp(a[0], b[0], 1.02), lerp(a[1], b[1], 1.02)]],
        { kind: dry ? 'dry' : 'wet', w: (o.w ?? 1.6) * (0.5 + r() * 0.65), t: (o.t ?? 0.9) * (0.92 + r() * 0.1), press: o.press ?? 1.7, head: clamp(2 / len, 0.05, 0.3), tail: 0.45, lift: 0.3, dry: 0.42, a: 0.82, seed: key + ':' + i });
    }
  }

  function silkBase(g) {
    tiles();
    g.fillStyle = css(SILK); g.fillRect(-4, -4, W + 8, H + 8);
    const lo = O.canvas(W / 4, H / 4), lx = lo.getContext('2d'), id = lx.createImageData(lo.width, lo.height);
    for (let j = 0; j < lo.height; j++) for (let i = 0; i < lo.width; i++) {
      const v = (fbm(i / 16, j / 16, 5, 4) - 0.5) * 16 + (fbm(i / 4, j / 5, 6, 2) - 0.5) * 5, k = (j * lo.width + i) * 4;
      id.data[k] = SILK[0] + v; id.data[k + 1] = SILK[1] + v * 0.94; id.data[k + 2] = SILK[2] + v * 0.82; id.data[k + 3] = 255;
    }
    lx.putImageData(id, 0, 0);
    g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(lo, -2, -2, W + 4, H + 4); g.restore();
    const r = O.rng('silk');
    for (let k = 0; k < 18; k++) {
      const x = r() * W, y = r() * H, rad = (0.15 + r() * 0.35) * W, dark = r() < 0.5, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, dark ? 'rgba(90,60,20,0.045)' : 'rgba(255,250,235,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(-4, -4, W + 8, H + 8);
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const pat = g.createPattern(GRAIN, 'repeat');
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.065; g.fillStyle = pat; g.fillRect(0, 0, W * R, H * R);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.05; g.translate(97, 53); g.fillRect(-97, -53, W * R, H * R);
    g.restore();
    weave(g, 0.7);
    for (let k = 0; k < 14; k++) {
      const x = r() * W, y = r() * H, rad = 2 + r() * 12, gr = g.createRadialGradient(x, y, rad * 0.2, x, y, rad);
      gr.addColorStop(0, 'rgba(120,80,30,0.07)'); gr.addColorStop(0.8, 'rgba(120,80,30,0.025)'); gr.addColorStop(1, 'rgba(120,80,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
  }

  function weave(g, k) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (let x = 0, i = 0; x < W * R; i++, x += 2 + (hash(i, 7, 5) < 0.6 ? 1 : 2)) {
      const h = hash(i, 1, 5), slub = h > 0.94 ? 1.8 : 1;
      g.fillStyle = `rgba(70,48,20,${0.022 * k * (0.4 + h) * slub})`; g.fillRect(x, 0, 1, H * R);
    }
    for (let y = 0, i = 0; y < H * R; i++, y += 2 + (hash(i, 8, 5) < 0.55 ? 1 : 2)) {
      const h = hash(i, 2, 5), slub = h > 0.93 ? 1.8 : 1;
      g.fillStyle = `rgba(70,48,20,${0.016 * k * (0.4 + h) * slub})`; g.fillRect(0, y, W * R, 1);
    }
    if (k < 1) {
      g.globalCompositeOperation = 'screen';
      for (let x = 1, i = 0; x < W * R; i++, x += 3) { g.fillStyle = `rgba(255,240,210,${0.025 * (0.4 + hash(i, 3, 5))})`; g.fillRect(x, 0, 1, H * R); }
    }
    g.restore();
  }

  function silkAge(g) {
    weave(g, 0.45);
    const r = O.rng('age');
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);

    for (let k = 0; k < 4; k++) {
      const y = (0.14 + 0.22 * k + (r() - 0.5) * 0.05) * H * R;
      g.strokeStyle = `rgba(250,236,205,${0.04 + r() * 0.04})`; g.lineWidth = 1.5 + r() * 3;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W * R, y + (r() - 0.5) * 10); g.stroke();
    }
    g.restore();
    for (const [cx, cy, rx, ry, s] of [[470, 10, 9, 6, 1], [454, 246, 16, 8, 3]]) {
      const P = O.rough(O.ellipse(cx, cy, rx, ry, 24), Math.min(rx, ry) * 0.35, 40 + s, 1.5);
      g.save(); g.filter = `blur(${1.2 * R}px)`; g.fillStyle = 'rgba(222,212,192,0.22)'; O.path(g, P); g.fill();
      g.filter = `blur(${0.5 * R}px)`; g.strokeStyle = 'rgba(110,80,40,0.08)'; g.lineWidth = 0.8; O.path(g, P); g.stroke(); g.restore();
    }
    g.save();
    const sun = g.createRadialGradient(330, 120, 10, 330, 120, 230);
    sun.addColorStop(0, 'rgba(255,236,196,0.16)'); sun.addColorStop(1, 'rgba(255,236,196,0)');
    g.globalCompositeOperation = 'screen'; g.fillStyle = sun; g.fillRect(-4, -4, W + 8, H + 8);
    g.globalCompositeOperation = 'source-over';
    const e = g.createRadialGradient(W * 0.55, H * 0.48, Math.min(W, H) * 0.42, W * 0.55, H * 0.48, Math.hypot(W, H) * 0.56);
    e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(82,52,18,0.17)');
    g.fillStyle = e; g.fillRect(-4, -4, W + 8, H + 8);
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(214,160,96,0.09)'; g.fillRect(-4, -4, W + 8, H + 8);
    g.restore();
  }

  const A1 = [[-6,110],[10,102],[21,92],[32,99],[33,108],[45,113],[43,128],[54,142],[49,162],[55,178],[44,204],[48,228],[38,262],[-6,262]];
  const A1_TOP = [[-6,110],[10,102],[21,92],[32,99],[33,108],[45,113],[26,124],[12,119],[-6,129]];
  const A1_FACE = [[-6,129],[12,119],[26,124],[45,113],[43,128],[54,142],[49,162],[55,178],[44,204],[48,228],[38,262],[-6,262]];
  const A2 = [[32,187],[42,163],[60,154],[64,141],[78,146],[87,143],[107,160],[120,166],[116,181],[125,196],[121,211],[133,232],[128,249],[138,262],[32,262],[35,230],[30,215]];
  const A2_TOP = [[42,163],[60,154],[64,141],[78,146],[87,143],[107,160],[120,166],[98,174],[81,163],[64,174],[48,179]];
  const A2_FACE = [[32,187],[48,179],[64,174],[81,163],[98,174],[120,166],[116,181],[125,196],[121,211],[133,232],[128,249],[138,262],[32,262],[35,230],[30,215]];
  const SPIT = [[104,153],[126,150],[150,151],[176,154],[198,159],[197,175],[190,187],[170,193],[146,197],[128,199],[124,186],[119,168]];
  const SPIT_FAR = [[104,153],[126,150],[150,151],[176,154],[198,159]];
  const SPIT_NEAR = [[127,199],[146,197],[170,193],[190,187],[197,175]];

  const SEAT = [[194,164],[207,152],[221,145],[240,149],[253,145],[269,153],[281,151],[299,158],[308,166],[300,174],[306,180],[286,185],[274,181],[251,188],[231,184],[214,188],[202,178]];
  const SEAT_TOP = [[194,164],[207,152],[221,145],[240,149],[253,145],[269,153],[281,151],[299,158],[278,164],[253,160],[232,166],[212,159]];
  const SEAT_FACE = [[194,164],[212,159],[232,166],[253,160],[278,164],[299,158],[308,166],[300,174],[306,180],[286,185],[274,181],[251,188],[231,184],[214,188],[202,178]];
  const S1 = [[301,181],[306,174],[314,177],[319,184],[313,188],[304,187]];
  const S2 = [[316,190],[323,184],[330,188],[332,193],[321,194]];
  const PIN = [[264,157],[268,153],[273,150],[278,154],[281,156],[274,159],[266,159]];
  const FST = [[158,186],[166,177],[177,174],[188,163],[199,167],[209,166],[218,176],[216,184],[224,187],[202,190],[183,185],[171,191]];
  const FST_TOP = [[166,177],[177,174],[188,163],[199,167],[209,166],[202,176],[184,180],[171,185]];

  const BUTT = [266, 157.5], TIP0 = [440, 66];
  const rodAt = u => [lerp(BUTT[0], TIP0[0], u), lerp(BUTT[1], TIP0[1], u) + 9 * u * u * u];
  const ROD = [0, 0.2, 0.4, 0.6, 0.8, 0.92, 1].map(rodAt), TIP = rodAt(1);
  const FORK = rodAt((310 - BUTT[0]) / (TIP0[0] - BUTT[0]));
  const FLOAT = [443, 150];

  const FAR1 = [[298, 110], [302, 98], [312, 89], [324, 82], [336, 76], [346, 71], [354, 66], [362, 63], [370, 66], [378, 71], [388, 73], [398, 67], [410, 58], [419, 51], [427, 48], [435, 51], [444, 57], [454, 62], [462, 60], [472, 55], [486, 53], [486, 110]];
  const FAR2 = [[338, 117], [348, 110], [360, 106], [374, 104], [388, 106], [398, 103], [410, 100], [424, 101], [438, 105], [452, 103], [468, 99], [486, 100], [486, 119], [338, 119]];
  function farHills(g) {
    wash(g, FAR1, { col: tint(0.3, INDIGO, 0.55), a: 0.55, soft: 1.8, grad: { y0: 48, y1: 108, a0: 1, am: 0.5, a1: 0 }, edge: 0.3, gran: 0.3 });
    wash(g, [[396, 72], [408, 61], [418, 53], [427, 50], [435, 53], [444, 59], [452, 66], [430, 74], [410, 76]], { col: tint(0.38, INDIGO, 0.5), a: 0.32, soft: 2.2, grad: { y0: 50, y1: 80, a0: 1, a1: 0 } });
    wash(g, [[330, 84], [346, 73], [354, 68], [362, 65], [370, 68], [378, 74], [360, 82]], { col: tint(0.36, INDIGO, 0.5), a: 0.28, soft: 2, grad: { y0: 64, y1: 86, a0: 1, a1: 0 } });
    wash(g, FAR2, { col: tint(0.4, INDIGO, 0.35), a: 0.5, soft: 1.3, grad: { y0: 99, y1: 120, a0: 1, a1: 0.05 }, edge: 0.35, gran: 0.35 });
    const r = O.rng('fartrees');
    let i = 0;
    for (const [c0, c1] of [[356, 372], [392, 404], [430, 452], [464, 482]]) for (let x = c0; x < c1; x += 1.2 + r() * 2.2) {
      if (r() < 0.3) continue;
      const y = onPath(FAR2.slice(1, 12), x) + 0.8, h = 1 + r() * 2.2;
      brush(g, [[x, y], [x + (r() - 0.5) * 0.5, y - h]], { kind: 'wet', w: 0.55 + r() * 0.5, t: 0.4 + r() * 0.18, press: 1.2, head: 0.3, tail: 0.5, lift: 0.4, a: 0.75, bleed: 0.3, seed: 'ft' + i++ });
    }
    for (const [x0, x1, y] of [[400, 452, 120.5]])
      brush(g, [[x0, y], [(x0 + x1) / 2, y + 0.3], [x1, y - 0.2]], { kind: 'fine', w: 0.32, t: 0.36, a: 0.55, press: 1, lift: 0.3, seed: 'fl' + x0 });
    g.save(); g.filter = `blur(${5 * R}px)`; g.fillStyle = 'rgba(250,240,220,0.35)';
    g.fillRect(286, 94, 210, 12); g.restore();
  }
  function boat(g) {
    const x = 380, y = 127;
    brush(g, [[x - 8, y - 1.6], [x - 3, y + 0.6], [x + 4, y + 0.7], [x + 8.5, y - 1.2]], { kind: 'wet', w: 1.2, t: 0.78, press: 1.2, lift: 0.4, seed: 'hull' });
    wash(g, [[x + 0.5, y - 1], [x + 1.2, y - 4], [x + 4.5, y - 4.6], [x + 6.5, y - 1.4]], { t: 0.55, a: 0.7, soft: 0.25 });
    brush(g, [[x + 0.8, y - 3.9], [x + 3.5, y - 5], [x + 6.6, y - 1.6]], { kind: 'fine', w: 0.4, t: 0.8, seed: 'peng' });
    brush(g, [[x - 4.5, y - 1.2], [x - 4.3, y - 3.4]], { kind: 'wet', w: 0.9, t: 0.82, press: 1, seed: 'man' });
    brush(g, [[x - 6.2, y - 3.6], [x - 4.4, y - 4.6], [x - 2.6, y - 3.6]], { kind: 'wet', w: 0.6, t: 0.78, press: 1, seed: 'hat' });
    brush(g, [[x - 4.6, y - 3], [x - 10, y - 7], [x - 15, y - 9]], { kind: 'fine', w: 0.25, t: 0.7, press: 1, lift: 0.5, seed: 'pole' });
    for (const [a, b, yy] of [[-9, 5, 2.4], [-5, 8, 4]]) brush(g, [[x + a, y + yy], [x + b, y + yy + 0.2]], { kind: 'fine', w: 0.3, t: 0.36, a: 0.55, seed: 'refl' + a });
  }

  function water(g) {
    const behind = SPIT_FAR.map(([x, y]) => [x, y - 10]).concat(SPIT_FAR.slice().reverse().map(([x, y]) => [x, y + 2]));
    wash(g, behind, { col: tint(0.24, INDIGO, 0.6), a: 0.45, soft: 4 });
    wash(g, [[40, 96], [56, 108], [62, 128], [104, 146], [104, 154], [60, 150], [40, 112]], { col: tint(0.24, INDIGO, 0.6), a: 0.35, soft: 5 });
    wash(g, [[120, 196], [190, 186], [310, 186], [338, 192], [330, 204], [200, 202], [130, 214]], { col: tint(0.24, INDIGO, 0.6), a: 0.4, soft: 4.5 });
    wash(g, [[132, 214], [136, 262], [180, 262], [150, 220]], { col: tint(0.22, INDIGO, 0.6), a: 0.35, soft: 6 });
    wash(g, [[300, 128], [486, 124], [486, 146], [300, 140]], { col: tint(0.14, INDIGO, 0.7), a: 0.3, soft: 7 });
    const r = O.rng('ripple');
    const line = (x, y, len, t, k) => {
      const pts = []; for (let i = 0; i <= 5; i++) pts.push([x + len * (i / 5 - 0.5), y + Math.sin(i * 1.3 + r() * 1.5) * 0.4]);
      brush(g, pts, { kind: 'fine', w: 0.3 + r() * 0.12, t, a: 0.65, press: 1.05, lift: 0.3, seed: 'rip' + k });
    };
    let k = 0;
    for (let i = 0; i < 5; i++) { const x = 60 + r() * 140, y = onPath([[40, 120], [104, 150]].concat(SPIT_FAR.slice(1)), x) - 3 - r() * r() * 26; line(x, y, 6 + r() * 12, 0.3 + r() * 0.12, k++); }
    for (let i = 0; i < 7; i++) { const x = 140 + r() * 240, y = 198 + r() * r() * 56 + (x > 300 ? -4 : 0); if (x > 160 && x < 320 && y > 186 && y < 226) continue; line(x, y, 8 + r() * 16, 0.28 + r() * 0.1, k++); }
    for (let i = 0; i < 2; i++) line(326 + r() * 156, 134 + r() * 20, 10 + r() * 22, 0.24, k++);
  }

  function stone(g, s) {
    reserve(g, s.out, 0.18);

    const [,y0,,y1] = O.bbox(s.out);
    wash(g, s.out, {t:0.14,a:0.18,soft:0.6,gran:0.5,grad:{y0,y1,a0:0.05,a1:1}});
    for (const tp of s.tops || []) wash(g, tp, {col:OCHRE,a:0.09,soft:2.2,gran:0.65});
    for (const f of s.faces || []) {
      wash(g, f.poly, {t:f.t??0.4,a:f.a??0.4,soft:0.75,gran:0.35,grad:f.grad});
      if (f.pool) wash(g, f.pool, {t:f.pt??0.82,a:f.pa??0.44,soft:0.65,gran:0.3});
      axeFace(g, f);
    }

    for (let i=0; i<(s.veins||[]).length; i++) {
      const v=s.veins[i],seed=s.seed+'vein'+i;
      brush(g,v.pts,{kind:'wet',w:v.w*2.4,t:v.t*0.7,a:0.16,head:0.06,tail:0.7,lift:0.08,seed:seed+'wash'});
      brush(g,v.pts,{kind:'dry',w:v.w,t:v.t,a:0.68,dry:0.53,gap:3.8,head:0.07,tail:0.6,lift:0.15,seed});
    }
    for (const ln of s.lines || []) edges(g, ln.pts, Object.assign({seed:s.seed+'e'+ln.pts[0][0]},ln));
    for (const [x,y,a,L,w] of s.dark || []) {
      const p=[[x,y],[x+Math.cos(a)*L*0.45,y+Math.sin(a)*L*0.45],[x+Math.cos(a)*L,y+Math.sin(a)*L]];
      brush(g,p,{kind:'wet',w:(w??2.4)*0.75,t:1,press:1.5,lift:0.1,tail:0.8,a:0.94,seed:s.seed+'pool'+x+y});
      brush(g,p,{kind:'dry',w:w??2.4,t:1,dry:0.26,nb:6,a:1,seed:s.seed+'d'+x+y});
    }
    if (s.moss) dots(g,s.moss,{seed:s.seed+'m',size:2.1,w:1.4,t:1,col:inkC(1)});
  }
  const A1_STONE = {
    seed:'a1',out:A1,tops:[A1_TOP],
    faces:[{seed:'a1face',poly:A1_FACE,t:0.5,a:0.5,
      pool:[[26,124],[45,113],[43,128],[54,142],[49,162],[55,178],[44,204],[48,228],[38,262],[25,262],[34,219],[29,193],[37,163]],
      src:[
        {pts:[[22,123],[30,135],[35,151]],ang:2.05,n:7,L:29,w:5.4,t:0.87,rows:2,dry:0.52},
        {pts:[[43,157],[42,184],[34,210],[38,239]],ang:2.02,n:10,L:19,w:4.8,t:0.93,rows:1,dry:0.4},
        {pts:[[1,145],[9,177],[4,204]],ang:1.62,n:5,L:28,w:2.4,t:0.55,rows:1,dry:0.7},
      ]}],
    veins:[
      {pts:[[17,125],[12,144],[18,163],[9,186],[11,202]],w:1.8,t:0.66},
      {pts:[[35,151],[32,176],[23,198],[28,219],[19,247]],w:2.1,t:0.78},
      {pts:[[7,208],[4,227],[10,246]],w:1.3,t:0.54},
    ],
    lines:[{pts:A1.slice(0,12),w:1.7,t:0.95,dry:0.7},
      {pts:[[10,102],[15,113],[12,119],[26,124],[30,139]],w:1,t:0.7,dry:0.7},
      {pts:[[26,124],[23,145],[31,166],[24,187],[29,209],[22,241]],w:1.4,t:0.9,dry:0.7}],
    dark:[[43,131,1.9,13,3],[47,159,1.8,10,4],[39,204,1.9,14,3.2],[30,245,1.9,12,2.6]],
    moss:[[18,96],[21,94],[30,101],[33,109],[42,114],[40,124]],
  };
  const A2_STONE = {
    seed:'a2',out:A2,tops:[A2_TOP],
    faces:[{seed:'a2left',poly:[[32,187],[48,179],[64,174],[81,163],[76,188],[83,209],[71,226],[80,245],[76,262],[32,262],[35,230],[30,215]],t:0.42,a:0.44,
      src:[{pts:[[58,177],[67,174],[80,166]],ang:1.98,n:8,L:27,w:6.4,t:0.76,rows:2,dry:0.53},
        {pts:[[73,209],[68,227],[76,246]],ang:2.15,n:7,L:24,w:4,t:0.8,rows:1,dry:0.6}]},
      {seed:'a2right',poly:[[81,163],[98,174],[120,166],[116,181],[125,196],[121,211],[133,232],[128,249],[138,262],[76,262],[80,245],[71,226],[83,209],[76,188]],t:0.62,a:0.58,
       pool:[[106,174],[120,166],[116,181],[125,196],[121,211],[133,232],[128,249],[138,262],[119,262],[114,237],[117,211],[107,193]],pt:0.95,pa:0.6,
       src:[{pts:[[83,168],[98,175],[112,171]],ang:2.08,n:9,L:29,w:6.5,t:0.92,rows:2,dry:0.45},
         {pts:[[118,197],[118,215],[126,236]],ang:2.08,n:8,L:23,w:5,t:0.95,rows:1,dry:0.4}]}],
    veins:[
      {pts:[[63,178],[55,196],[60,213],[48,237],[51,261]],w:2.4,t:0.76},
      {pts:[[99,176],[92,191],[98,207],[90,225],[97,244]],w:2.7,t:0.85},
      {pts:[[114,204],[104,225],[110,246],[107,263]],w:1.9,t:0.79},
      {pts:[[42,226],[46,239],[37,257]],w:1.4,t:0.57},
    ],
    lines:[{pts:A2.slice(0,14),w:1.7,t:0.95,dry:0.7},
      {pts:[[60,154],[64,163],[64,174],[81,163],[98,174],[111,170]],w:1.1,t:0.82,dry:0.75},
      {pts:[[81,163],[76,188],[83,209],[71,226],[80,245]],w:1.5,t:0.93,dry:0.65},
      {pts:[[34,214],[48,205],[63,210],[73,209]],w:1,t:0.8,dry:0.75}],
    dark:[[116,179,1.7,14,4],[120,202,1.85,13,4],[126,237,1.75,15,4],[79,190,1.4,12,2.6],[73,226,1.15,8,2.4]],
    moss:[[62,148],[66,144],[75,147],[84,145],[90,149],[108,163],[116,168]],
  };
  const SEAT_STONE = {
    seed:'seat',out:SEAT,tops:[SEAT_TOP],
    faces:[{seed:'seatleft',poly:[[194,164],[212,159],[232,166],[253,160],[244,177],[231,184],[214,188],[202,178]],t:0.3,a:0.35,
      src:[{pts:[[207,162],[219,164],[230,167]],ang:2.25,n:2,L:20,w:2.2,t:0.43,rows:1,dry:0.65}]},
      {seed:'seatright',poly:[[253,160],[278,164],[299,158],[308,166],[300,174],[306,180],[286,185],[274,181],[251,188],[244,177]],t:0.4,a:0.38,
       pool:[[294,161],[299,158],[308,166],[300,174],[306,180],[286,185],[279,180]],pt:0.65,pa:0.35,
       src:[{pts:[[258,162],[274,165],[288,162]],ang:2.3,n:3,L:22,w:2.4,t:0.52,rows:1,dry:0.63}]}],
    veins:[
      {pts:[[230,164],[222,174],[213,179]],w:1.1,t:0.44},
      {pts:[[280,165],[268,172],[264,181]],w:1.3,t:0.53},
    ],
    lines:[{pts:SEAT.slice(0,9),w:0.95,t:0.75,dry:0.75},
      {pts:[[308,166],[300,174],[306,180],[286,185]],w:1,t:0.8,dry:0.8},
      {pts:[[253,160],[244,177],[251,188]],w:0.8,t:0.65,dry:0.8},
      {pts:[[212,159],[232,166],[248,162]],w:0.65,t:0.55,dry:0.85}],
    dark:[[300,169,2.2,5,1.4],[277,180,2.6,4,1.2]],
    moss:[[207,153],[219,146],[295,157]],
  };
  const FRONT_STONE = {
    seed:'fst',out:FST,tops:[FST_TOP],
    faces:[{seed:'frontleft',poly:[[158,186],[166,177],[177,174],[184,180],[183,185],[171,191]],t:0.38,a:0.4,
      src:[{pts:[[166,179],[177,176]],ang:2.2,n:4,L:9,w:2.7,t:0.69,rows:1,dry:0.58}]},
      {seed:'frontright',poly:[[188,163],[199,167],[209,166],[218,176],[216,184],[224,187],[202,190],[183,185],[184,180],[202,176]],t:0.53,a:0.45,
       pool:[[209,166],[218,176],[216,184],[224,187],[202,190],[196,185]],pt:0.85,pa:0.38,
       src:[{pts:[[200,169],[207,169],[214,176]],ang:2.2,n:3,L:15,w:3,t:0.73,rows:1,dry:0.5}]}],
    lines:[{pts:FST.slice(0,6),w:1.05,t:0.88,dry:0.7},
      {pts:[[209,166],[218,176],[216,184],[224,187]],w:1.15,t:0.95,dry:0.65},
      {pts:[[188,163],[184,180],[171,191]],w:0.8,t:0.75,dry:0.8}],
    dark:[[214,177,1.5,7,2],[197,186,0.25,8,1.8]],
    moss:[[187,164],[193,166],[207,167]],
  };
  function spit(g) {
    wash(g, SPIT, { col: OCHRE, a: 0.5, soft: 1.4 });
    wash(g, SPIT, { t: 0.26, a: 0.35, soft: 1.6, grad: { y0: 150, y1: 199, a0: 0.2, a1: 1 }, gran: 0.4 });
    cun(g, SPIT, { kind: 'hemp', n: 22, size: 2.6, w: 0.5, t: 0.5, angle: 0.12, a: 0.55, seed: 'spit' });
    edges(g, SPIT_FAR, { seed: 'spitfar', w: 0.9, t: 0.72, press: 1.25, dry: 0.4 });
    edges(g, SPIT_NEAR, { seed: 'spitnear', w: 1.2, t: 0.82, press: 1.4, dry: 0.3 });
    const r = O.rng('grass'), pts = [];
    for (let x = 106; x < 196; x += 3 + r() * 7) pts.push([x, onPath(SPIT_FAR, x) + 0.6 + r() * 2]);
    dots(g, pts, { seed: 'spitdots', size: 1.5, w: 0.9, t: 0.88 });
    for (const [x, y, k] of [[128, 151, 4], [160, 153, 3], [184, 156.5, 4]]) for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + (i / (k - 1) - 0.5) * 1.1 + (r() - 0.5) * 0.2, L = 3 + r() * 3.5;
      brush(g, [[x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6], [x + Math.cos(a + 0.15) * L, y + Math.sin(a + 0.15) * L]], { kind: 'wet', w: 0.5, t: 0.82, press: 1.2, lift: 0.05, tail: 0.7, seed: 'gr' + x + i });
    }
  }

  const TRUNK = [[50,152],[54,132],[52,124],[62,105],[67,95],[80,85],[86,70],[104,57],[116,47],[128,40]];
  const trunkW = u => lerp(16, 9, Math.pow(u, 0.8));
  function trunkEdges() {
    const P = smooth(TRUNK, 1.2), n = P.length, Lf = [], Rt = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = i / (n - 1), w = trunkW(u) / 2;
      const bl = 1 + 0.22 * (fbm(i * 0.09, 1, 31, 3) - 0.5) * 2 + (u < 0.08 ? (0.08 - u) * 5 : 0), br = 1 + 0.2 * (fbm(i * 0.09, 5, 32, 3) - 0.5) * 2 + (u < 0.08 ? (0.08 - u) * 4 : 0);
      Lf.push([P[i][0] + dy / l * w * bl, P[i][1] - dx / l * w * bl]); Rt.push([P[i][0] - dy / l * w * br, P[i][1] + dx / l * w * br]);
    }
    return { P, Lf, Rt };
  }
  const SH1 = [[134, 36], [146, 24], [162, 14], [182, 7], [204, 5]];
  const SH2 = [[126, 34], [121, 20], [119, 6], [121, -8]];
  const SH3 = [[138, 42], [156, 40], [176, 42], [198, 48]];
  const SH4 = [[121, 40], [108, 31], [98, 25], [88, 23]];
  const SH5 = [[80, 77], [69, 71], [58, 69]];
  function willow(g) {
    const { P, Lf, Rt } = trunkEdges(), body = Lf.concat(Rt.slice().reverse()), n = P.length;
    reserve(g, body, 0.2);
    wash(g, body, { t: 0.26, a: 0.6, soft: 0.6, edge: 0.3, gran: 0.4 });
    wash(g, body, { col: OCHRE, a: 0.3, soft: 0.8 });
    const shade = Rt.map((p, i) => [lerp(p[0], P[i][0], -0.05), lerp(p[1], P[i][1], -0.05)]).concat(P.map((p, i) => [lerp(p[0], Lf[i][0], 0.2), lerp(p[1], Lf[i][1], 0.2)]).reverse());
    wash(g, shade, { t: 0.55, a: 0.5, soft: 1.1, gran: 0.45 });
    const r = O.rng('bark');
    for (let k = 0; k < 30; k++) {
      const i0 = Math.floor(r() * (n - 12)), len = 6 + Math.floor(r() * 12), side = Math.pow(r(), 0.7) * 1.6 - 0.6, tw = (r() - 0.5) * 0.5;
      const pts = []; for (let i = i0; i <= Math.min(n - 1, i0 + len); i += 2) { const u = (i - i0) / len, s = clamp(side + tw * u, -0.85, 0.85); pts.push([lerp(P[i][0], s > 0 ? Rt[i][0] : Lf[i][0], Math.abs(s)), lerp(P[i][1], s > 0 ? Rt[i][1] : Lf[i][1], Math.abs(s))]); }
      brush(g, pts, { kind: 'dry', w: 0.7 + r() * 0.9, t: 0.55 + r() * 0.4, press: 1.3, dry: 0.42, gap: 2, tail: 0.6, a: 0.8, seed: 'bk' + k });
    }
    for (let k = 0; k < 10; k++) {
      const i = 4 + Math.floor(r() * (n - 8)), s = (r() - 0.3) * 0.9, a = Rt[i], b = Lf[i], c = [lerp(P[i][0], s > 0 ? a[0] : b[0], Math.abs(s)), lerp(P[i][1], s > 0 ? a[1] : b[1], Math.abs(s))], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]), L = 1.5 + r() * 2.5;
      brush(g, [[c[0] - d[0] / l * L / 2, c[1] - d[1] / l * L / 2 + 0.5], [c[0] + d[0] / l * L / 2, c[1] + d[1] / l * L / 2]], { kind: 'wet', w: 0.6 + r() * 0.4, t: 0.85, press: 1.3, seed: 'crk' + k });
    }
    for (let k = 0; k < 4; k++) {
      const pts = P.slice(8+k*5, n-12+k*3).filter((p,i) => i%3===0).map((p,i) => [p[0]+(k-1.5)*1.2+Math.sin(i*0.7)*0.8,p[1]]);
      brush(g, pts, {kind:'dry', w:1.1+k*0.2, t:0.58, a:0.55, dry:0.6, gap:4, seed:'barkfold'+k});
    }
    const hk = Math.floor(n * 0.42), hc = P[hk];
    wash(g, O.rough(O.ellipse(hc[0] + 1.5, hc[1] + 1, 2.4, 4.2, 14), 0.5, 3, 1), { t: 0.85, a: 0.85, soft: 0.3 });
    brush(g, O.ellipse(hc[0] + 1.5, hc[1] + 1, 3.6, 5.6, 14, -0.6, TAU - 1.4), { kind: 'dry', w: 1.2, t: 0.85, press: 1.3, dry: 0.3, seed: 'hole' });
    const third = Math.floor(n * 0.36), two = Math.floor(n * 0.7);
    brush(g, Lf.slice(0, third + 2), { kind: 'dry', w: 1.9, t: 0.9, press: 1.5, tail: 0.3, lift: 0.5, dry: 0.3, seed: 'tl1' });
    brush(g, Lf.slice(third + 4, two + 1), { kind: 'dry', w: 1.6, t: 0.88, press: 1.4, tail: 0.3, lift: 0.5, dry: 0.36, seed: 'tl2' });
    brush(g, Lf.slice(two + 2), { kind: 'wet', w: 1.4, t: 0.88, press: 1.3, lift: 0.5, seed: 'tl3' });
    brush(g, Rt.slice(0, Math.floor(n * 0.5)), { kind: 'wet', w: 2.6, t: 0.95, press: 1.6, lift: 0.55, seed: 'tr1' });
    brush(g, Rt.slice(Math.floor(n * 0.48)), { kind: 'wet', w: 2.0, t: 0.93, press: 1.4, lift: 0.5, seed: 'tr2' });
    for (const [pts, w] of [[[[46, 150], [40, 146], [33, 145], [26, 146]], 2.2], [[[57, 151], [62, 155], [68, 155]], 1.8], [[[50, 153], [49, 160], [52, 166]], 1.6]])
      brush(g, pts, { kind: 'wet', w, t: 0.93, press: 1.4, lift: 0.3, seed: 'root' + pts[0][0] });
    dots(g, [[56,127],[64,102],[83,76],[120,44],[130,37]], {seed:'charredknots',size:2.8,w:1.7,col:inkC(1)});

    for (const [x0, y0, x1, y1, w] of [[124, 42, 120, 34, 5.5], [129, 40, 130, 31, 5], [133, 41, 139, 35, 4.5], [127, 44, 136, 44, 4]]) {
      brush(g, [[x0, y0], [x1, y1]], { kind: 'wet', w, t: 0.42, press: 1.1, lift: 0.85, bleed: 0.1, seed: 'kn' + x1 });
      brush(g, [[x0 - 1, y0 + 1], [x1 - 0.5, y1]], { kind: 'dry', w: w * 0.4, t: 0.92, press: 1.3, lift: 0.8, dry: 0.3, seed: 'kd' + x1 });
      dots(g, [[x1 - 1.4, y1 - 0.6]], { seed: 'kt' + x1, size: 1.6, w: 1.4, t: 0.98 });
    }
    brush(g, SH1, { kind: 'wet', w: 1.2, t: 0.88, press: 1.3, lift: 0.15, tail: 0.7, seed: 'sh1' });
    brush(g, SH2, { kind: 'wet', w: 1.1, t: 0.86, press: 1.3, lift: 0.4, tail: 0.6, seed: 'sh2' });
    brush(g, SH3, { kind: 'wet', w: 0.9, t: 0.84, press: 1.2, lift: 0.15, tail: 0.7, seed: 'sh3' });
    brush(g, SH4, { kind: 'wet', w: 1.0, t: 0.86, press: 1.3, lift: 0.15, tail: 0.7, seed: 'sh4' });
    brush(g, SH5, { kind: 'wet', w: 0.8, t: 0.85, press: 1.3, lift: 0.15, tail: 0.7, seed: 'sh5' });
  }

  const STRANDS = (() => {
    const r = O.rng('strands'), out = [];
    const add = (p, dir, up, L, live, dark) => out.push({ a: p, dir, up, L, drift: dir * (r() * 13 - 2) + (r() - 0.5) * 14, out1: dir * (2 + r() * 7), ph: r() * TAU, amp: 0.7 + r() * 1.3, live, dark, k: out.length });
    const along = (br, m, fn) => { const b = smooth(br, 1); for (let i = 0; i < m; i++) { const u = r(); fn(b[Math.min(b.length - 1, Math.floor(u * (b.length - 1)))], u); } };
    along(SH1, 8, (p, u) => { const m = 1 + (r() < 0.55 ? 1 : 0) + (r() < 0.2 ? 1 : 0); for (let j = 0; j < m; j++) add(p, 1, 0.5 + r() * 4, 34 + r() * 66 - u * 12, p[0] > 150, r() < 0.25); });
    along(SH2, 4, (p) => { const m = 1 + (r() < 0.6 ? 1 : 0); for (let j = 0; j < m; j++) add(p, r() < 0.6 ? 1 : -1, 3 + r() * 9, 50 + r() * 50, false, r() < 0.3); });
    along(SH3, 5, (p) => { const m = 1 + (r() < 0.5 ? 1 : 0); for (let j = 0; j < m; j++) add(p, 1, 0.5 + r() * 2, 26 + r() * 56, p[0] > 150, r() < 0.2); });
    along(SH4, 4, (p) => { const m = 1 + (r() < 0.5 ? 1 : 0); for (let j = 0; j < m; j++) add(p, -1, 1 + r() * 5, 34 + r() * 40, false, r() < 0.3); });
    along(SH5, 2, (p) => add(p, -1, 0.5 + r() * 2, 20 + r() * 22, false, false));
    return out;
  })();
  function strandPts(s, t) {
    const [ax, ay] = s.a, apex = [ax + s.out1, ay + s.L * 0.12];
    const pts = [[ax, ay], [ax + s.out1 * 0.75, ay + s.L * 0.025], apex];
    const m = 7;
    for (let k = 1; k <= m; k++) {
      const u = k / m, sw = t == null ? 0 : s.amp * (Math.sin(t * 0.9 + s.ph - u * 1.3) * 0.75 + Math.sin(t * 2.1 + s.ph * 1.7 - u * 2) * 0.25) * Math.pow(u, 1.5);
      pts.push([apex[0] + s.drift * Math.pow(u, 1.3) + Math.sin(u * 4.5 + s.ph) * (1.2 + 1.5 * hash(s.k,9,32)) * Math.sin(u * Math.PI) + sw, apex[1] + s.L * 0.88 * u]);
    }
    return pts;
  }
  function strand(g, s, t) {
    const pts = strandPts(s, t);
    brush(g, pts, { kind: 'fine', w: 0.32, t: s.dark ? 0.72 : 0.54, a: 0.9, press: 1.05, lift: 0.3, tail: 0.6, ds: 0.6, seed: 'st' + s.k });
    const P = smooth(pts, 0.6), n = P.length;
    let acc = 0, side = 1, k = 0;
    const leaves = [new Path2D(), new Path2D()];
    for (let i = 1; i < n; i++) {
      acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (acc < 1.4 + hash(s.k, k, 22) * 3.3 || i < n * 0.09) continue;
      acc = 0; k++;
      if (hash(s.k, Math.floor(k / 3), 3) < 0.25) continue;
      const u = i / (n - 1), dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1];
      const ang = Math.atan2(dy, dx) - side * (0.3 + 0.5 * hash(s.k, k, 4)), ln = (1.8 + 2.0 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (0.75 + 0.45 * hash(s.k, k, 5));
      const ca = Math.cos(ang), sa = Math.sin(ang), wl = 0.34 + 0.28 * hash(s.k, k, 6), bx = P[i][0], by = P[i][1];
      const p = leaves[s.dark || hash(s.k, k, 7) < 0.15 ? 1 : 0];
      p.moveTo(bx, by); p.lineTo(bx + ca * ln * 0.45 - sa * wl, by + sa * ln * 0.45 + ca * wl); p.lineTo(bx + ca * ln, by + sa * ln); p.lineTo(bx + ca * ln * 0.45 + sa * wl, by + sa * ln * 0.45 - ca * wl); p.closePath();
      if (hash(s.k, k, 25) < 0.72) side = -side;
    }
    g.save(); g.globalCompositeOperation = 'multiply';
    g.fillStyle = css(mix(inkC(0.48), LEAF, 0.5), 0.76); g.fill(leaves[0]);
    g.fillStyle = css(mix(inkC(0.8), LEAF, 0.3), 0.9); g.fill(leaves[1]);
    g.restore();
  }

  function reeds(g) {
    const r = O.rng('reeds');
    const blade = (x, y, h, lean, curl, w, t, col, k) => {
      const pts = [[x, y]];
      for (let i = 1; i <= 6; i++) { const u = i / 6; pts.push([x + lean * h * u + curl * h * u * u * u, y - h * u + (u > 0.65 ? Math.abs(curl) * h * (u - 0.65) * 1.1 : 0)]); }
      brush(g, pts, { kind: 'wet', w, t, col, press: 1.15, head: 0.06, tail: 0.75, lift: 0.04, wob: 0.15, bleed: 0.1, seed: 'reed' + k });
    };
    const root = () => { const x = 122 + r() * 36; return [x, onPath(SPIT_NEAR.slice().reverse(), Math.min(x, 189)) + 1 + r() * 8]; };
    for (let i = 0; i < 8; i++) { const [x, y] = root(); blade(x, y, 24 + r() * 26, -0.1 + r() * 0.35, 0.15 + r() * 0.3, 1.2, 0, tint(0.42, INDIGO, 0.55), 'b' + i); }
    for (let i = 0; i < 12; i++) {
      const [x, y] = root(), h = 18 + r() * 36, lean = -0.12 + r() * 0.4, curl = (r() < 0.3 ? -1 : 1) * (0.12 + r() * 0.35);
      blade(x, y, h, lean, curl, 0.85 + r() * 0.55, 0.6 + r() * 0.35, null, 'f' + i);
    }
    dots(g, [[130, 201], [142, 199], [152, 198.5]], { seed: 'reeddots', size: 1.5, w: 1 });
  }

  function rod(g) {
    brush(g, [[310.5, 179], [310.4, 164], [310.2, 150], [310, FORK[1] + 1]], { kind: 'dry', w: 1.0, t: 0.86, press: 1.2, dry: 0.2, lift: 0.6, seed: 'fork' });
    brush(g, [[310, FORK[1] + 1], [307, FORK[1] - 3], [305.5, FORK[1] - 6]], { kind: 'wet', w: 0.7, t: 0.86, press: 1, lift: 0.3, seed: 'fork2' });
    brush(g, [[310.2, FORK[1] + 1], [313, FORK[1] - 3], [315, FORK[1] - 5.5]], { kind: 'wet', w: 0.6, t: 0.86, press: 1, lift: 0.3, seed: 'fork3' });
    brush(g, ROD, { kind: 'wet', w: 1.5, t: 0.9, press: 1.05, head: 0.02, tail: 0.85, lift: 0.22, wob: 0.06, jag: 0.05, bleed: 0.12, seed: 'rod' });
    for (const u of [0.32, 0.47, 0.6, 0.71]) {
      const p = rodAt(u), q = rodAt(u + 0.004), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, h = 1.2 * (1 - u * 0.5);
      brush(g, [[p[0] - nx * h, p[1] - ny * h], [p[0] + nx * h, p[1] + ny * h]], { kind: 'wet', w: 0.45, t: 0.92, press: 1, bleed: 0, seed: 'node' + u });
    }
  }

  function paintBack(g) {
    silkBase(g);
    SILKC = O.canvas(W * R, H * R);
    SILKC.getContext("2d").drawImage(g.canvas, 0, 0);
    farHills(g);
    water(g);
    boat(g);
    spit(g);
    stone(g, A1_STONE);
    willow(g);
    stone(g, A2_STONE);
    stone(g, SEAT_STONE);
    stone(g, { seed: 's1', out: S1, tops: [S1.slice(0, 4)], faces: [{ seed: 's1f', poly: S1.slice(2).concat([S1[0]]), t: 0.45, L: 4, w: 1.8, ang: 1.9 }], lines: [{ pts: S1.concat([S1[0]]), w: 1.1, t: 0.9 }] });
    stone(g, { seed: 's2', out: S2, faces: [{ seed: 's2f', poly: S2, t: 0.4, L: 3.5, w: 1.6, ang: 1.9 }], lines: [{ pts: S2.concat([S2[0]]), w: 1.0, t: 0.88 }] });
    rod(g);
    stone(g, { seed: 'pin', out: PIN, tops: [PIN.slice(0, 5)], ochre: 0.4, faces: [{ seed: 'pinf', poly: [[264, 157], [283, 156.5], [279, 159.5], [268, 159.8]], t: 0.5, L: 2.5, w: 1.4, ang: 1.8 }],
      lines: [{ pts: PIN.concat([PIN[0]]), w: 1.0, t: 0.92 }] });
    stone(g, FRONT_STONE);
    reeds(g);
    for (const s of STRANDS) if (!s.live) strand(g, s, null);
    silkAge(g);
  }

  const FMASK = grow(FST, 1.4);
  let cache = null;
  function build() {
    if (cache) return cache;
    const back = O.layer(W, H, paintBack);
    const front = O.layer(W, H, g => {
      g.save(); g.filter = `blur(${0.35 * R}px)`; g.fillStyle = '#000'; O.path(g, FMASK); g.fill(); g.restore();
      g.globalCompositeOperation = 'source-in'; g.drawImage(back, 0, 0, W, H);
    });
    const blur = O.canvas(W * R / 2, H * R / 2), bg = blur.getContext('2d');
    bg.filter = `blur(${7 * R / 2}px)`; bg.drawImage(back, -20, -20, blur.width + 40, blur.height + 40);
    return (cache = { back, front, blur });
  }

  const RIP = [[344,198,25],[367,204,11],[402,221,28],[466,233,18],[147,138,10],[112,132,15],[344,237,13]];
  const DIP_P = 7, DIP_T0 = 1.3;
  const dipAge = t => (((t - DIP_T0) % DIP_P) + DIP_P) % DIP_P;
  function ripples(g, t) {
    const c = inkC(0.4);
    g.lineCap = 'round';
    for (let i = 0; i < RIP.length; i++) {
      const [x, y, len] = RIP[i], ph = hash(i, 4, 9) * TAU, al = 0.55 * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.8 + ph))), dx = 1.6 * Math.sin(t * 0.22 + ph * 2);
      g.beginPath();
      for (let k = 0; k <= 8; k++) { const u = k / 8, xx = x + dx + (u - 0.5) * len, yy = y + 0.45 * Math.sin(u * 7 + t * 1.1 + ph) * Math.sin(Math.PI * u); if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
      g.strokeStyle = css(c, al * 0.2); g.lineWidth = 0.9; g.stroke();
      g.strokeStyle = css(c, al); g.lineWidth = 0.3; g.stroke();
    }
  }
  function lineAndFloat(g, t) {
    const age = dipAge(t), bob = age < 1.4 ? 1.7 * Math.exp(-age * 3.2) * Math.sin(age * 12) : 0;
    const fx = FLOAT[0], fy = FLOAT[1] + Math.max(-0.4, bob), sway = 1.4 * Math.sin(t * 0.7) + 0.5 * Math.sin(t * 1.9 + 1);
    const c = inkC(0.62);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(TIP[0], TIP[1]); g.quadraticCurveTo((TIP[0] + fx) / 2 + sway * (age < 1.4 ? 0.4 : 1), (TIP[1] + fy) / 2, fx, fy - 3);
    g.strokeStyle = css(c, 0.18); g.lineWidth = 0.7; g.stroke();
    g.strokeStyle = css(c, 0.85); g.lineWidth = 0.22; g.stroke();

    g.strokeStyle = css(inkC(0.9), 0.95); g.lineWidth = 0.75; g.beginPath(); g.moveTo(fx, fy - 2.6); g.lineTo(fx, fy + 0.2); g.stroke();
    g.strokeStyle = 'rgba(214,92,62,0.95)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(fx, fy - 3.3); g.lineTo(fx, fy - 2.3); g.stroke();
    g.strokeStyle = css(inkC(0.45), 0.6); g.lineWidth = 0.28; g.beginPath(); g.ellipse(fx, FLOAT[1] + 0.4, 2.4, 0.55, 0, 0, TAU); g.stroke();
    for (const [st, k] of [[0.05, 1], [0.5, 0.75]]) {
      const a = age - st; if (a < 0 || a > 2.8) continue;
      const u = a / 2.8, rr = 1.8 + 14 * Math.pow(u, 0.7), al = 0.65 * k * Math.pow(1 - u, 1.5);
      g.beginPath(); g.ellipse(fx, FLOAT[1] + 0.4, rr, rr * 0.28, 0, 0, TAU);
      g.strokeStyle = css(inkC(0.45), al * 0.2); g.lineWidth = 0.9; g.stroke();
      g.strokeStyle = css(inkC(0.45), al); g.lineWidth = 0.28; g.stroke();
    }
  }
  function liveBack(g, t) {
    g.save(); g.globalCompositeOperation = 'multiply';
    ripples(g, t);
    lineAndFloat(g, t);
    g.restore();
    for (const s of STRANDS) if (s.live) strand(g, s, t);
  }
  function liveFront() {}

  const light = { key: [1.05, 0.98, 0.86], keyDir: [0.6, -1], fill: [0.6, 0.57, 0.5], rim: [0.95, 0.88, 0.72], rimDir: [1, 0] };

  window.DeskScenes = Object.assign(window.DeskScenes || {}, { fish: { W, H, build, liveBack, liveFront, light, style: 'ink' } });
})();
