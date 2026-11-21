(function () {
  const O = window.Oil;
  const W = 280, H = 186, R = 4, TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;

  const INK = {
    b: { rgb: [0x32, 0x55, 0xA4], ang: 15 / 180 * Math.PI, cell: 3.0, off: [0, 0], rot: 0, seed: 101 },
    p: { rgb: [0xFF, 0x48, 0xB0], ang: 75 / 180 * Math.PI, cell: 3.1, off: [0.75, 0.2], rot: 0.0004, seed: 202 },
    y: { rgb: [0xFF, 0xE8, 0x00], ang: 45 / 180 * Math.PI, cell: 3.4, off: [-0.65, 0.45], rot: -0.0003, seed: 303 },
  };
  const PAPER = [0xF4, 0xEF, 0xE4];

  const TS = 256;
  function vtile(seed, period) {
    const out = new Float32Array(TS * TS), cell = TS / period, h = (a, b) => O.hash(((a % period) + period) % period, ((b % period) + period) % period, seed);
    for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
      const x = i / cell, y = j / cell, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      out[j * TS + i] = lerp(lerp(h(ix, iy), h(ix + 1, iy), sx), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), sx), sy);
    }
    return out;
  }
  let TILES = null;
  function tiles() {
    if (TILES) return TILES;
    TILES = {};
    for (const k of 'bpy') {
      const s = INK[k].seed;

      const gx = Math.ceil((W + 40) * R / 16) + 2, gy = Math.ceil((H + 40) * R / 16) + 2, low = new Float32Array(gx * gy);
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) low[j * gx + i] = O.fbm((i * 16 - 80) / R / 34, (j * 16 - 80) / R / 34, s, 3);

      const streak = new Float32Array(2048);
      for (let i = 0; i < 2048; i++) streak[i] = O.fbm(i / 7.5, 0.5, s + 9, 2) * 0.7 + O.fbm(i / 60, 3.5, s + 10, 2) * 0.3;
      TILES[k] = { mid: vtile(s + 1, 72), hi: vtile(s + 2, 256), low, gx, streak };
    }
    return TILES;
  }

  let S = null;
  function plates(x0, y0, w, h, M = 3) {
    const sp = { x0, y0, w, h, M, pw: Math.round((w + 2 * M) * R), ph: Math.round((h + 2 * M) * R) };
    for (const k of 'bpy') {
      sp[k] = { used: false };
      for (const L of ['tone', 'solid']) {
        const c = O.canvas(sp.pw, sp.ph), g = c.getContext('2d', { willReadFrequently: true });
        g.setTransform(R, 0, 0, R, (M - x0) * R, (M - y0) * R); g.lineCap = 'round'; g.lineJoin = 'round';
        sp[k][L] = { c, g };
      }
    }
    return sp;
  }
  const styleOf = (g, st) => (typeof st === 'number' ? `rgba(0,0,0,${clamp(st)})` : typeof st === 'function' ? st(g) : st);
  function paint(k, layer, shape, st, op = 'source-over') {
    const g = S[k][layer].g; S[k].used = true;
    g.save(); g.globalCompositeOperation = op; g.fillStyle = styleOf(g, st);
    g.beginPath(); shape(g); g.fill(); g.restore();
  }

  function tone(spec, shape) { for (const k in spec) { paint(k, 'tone', shape, 1, 'destination-out'); if (spec[k]) paint(k, 'tone', shape, spec[k]); } }
  function addTone(spec, shape) { for (const k in spec) paint(k, 'tone', shape, spec[k]); }
  function solid(ks, shape, a = 1) { for (const k of ks) paint(k, 'solid', shape, a); }

  function knock(ks, shape, a = 1, layers = ['tone', 'solid']) { for (const k of ks) for (const L of layers) paint(k, L, shape, a, 'destination-out'); }

  function mask(draw) { const c = O.canvas(S.pw, S.ph), g = c.getContext('2d'); g.setTransform(R, 0, 0, R, (S.M - S.x0) * R, (S.M - S.y0) * R); g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); return c; }
  function stamp(k, layer, m, op = 'source-over', a = 1) {
    const g = S[k][layer].g; S[k].used = true;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op; g.globalAlpha = a; g.drawImage(m, 0, 0); g.restore();
  }

  const lin = (x0, y0, x1, y1, stops) => g => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [u, a] of stops) gr.addColorStop(u, `rgba(0,0,0,${clamp(a)})`); return gr; };
  const rad = (cx, cy, r0, r1, stops) => g => { const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r1); for (const [u, a] of stops) gr.addColorStop(u, `rgba(0,0,0,${clamp(a)})`); return gr; };

  function cw(pts) { let s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; return s >= 0 ? pts : pts.slice().reverse(); }
  const poly = pts => g => { const q = cw(pts); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); g.closePath(); };
  const ell = (cx, cy, rx, ry, rot = 0) => g => { g.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot)); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); g.closePath(); };
  const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const union = (...ss) => g => ss.forEach(s => s(g));

  const figureUnion = (...parts) => g => { for (const part of parts) { g.beginPath(); part(g); g.fill(); } };
  const shift = (shape, dx, dy) => g => { g.save(); g.translate(dx, dy); shape(g); g.restore(); };

  function spline(P, n = 6) {
    if (P.length < 3) return P;
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(P[P.length - 1]);
    return out;
  }
  function densify(P, ds = 0.7) {
    const out = [P[0]];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / ds));
      for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
    }
    return out;
  }

  function brush(P0, w0, w1 = w0, o = {}) {
    const P = densify(o.smooth === false ? P0 : spline(P0, 6), 0.6), n = P.length;
    const Ls = [0]; for (let i = 1; i < n; i++) Ls.push(Ls[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = Ls[n - 1] || 1, ta = o.ta ?? 0.12, tb = o.tb ?? 0.12, seed = o.seed || 1, wob = o.wob ?? 0.12;
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const s = Ls[i] / tot, a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const env = Math.min(1, ta > 0 ? s / ta : 1, tb > 0 ? (1 - s) / tb : 1);
      const w = lerp(w0, w1, s) * (0.25 + 0.75 * Math.sqrt(Math.max(0, env))) * (1 + (O.noise2(Ls[i] * 0.35, 0.5, seed) - 0.5) * 2 * wob) / 2;
      L.push([P[i][0] - dy / l * w, P[i][1] + dx / l * w]); Rr.push([P[i][0] + dy / l * w, P[i][1] - dx / l * w]);
    }
    return L.concat(Rr.reverse());
  }
  const line = (ks, P, w0, w1, o) => solid(ks, poly(brush(P, w0, w1, o)), o && o.a != null ? o.a : 1);

  let GRAIN = null;
  function grainTile() {
    if (GRAIN) return GRAIN;
    const n = 128, c = O.canvas(n, n), g = c.getContext('2d'), id = g.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = 0.55 * O.noise2(i / 3, j / 3, 7) + 0.25 * O.noise2(i / 1.2, j / 1.2, 8) + 0.2 * O.hash(i, j, 9), k = (j * n + i) * 4;
      id.data[k] = id.data[k + 1] = id.data[k + 2] = clamp(v, 0, 1) * 255; id.data[k + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return (GRAIN = c);
  }
  function paper(g, x0, y0, w, h) {
    g.save(); g.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
    g.fillStyle = `rgb(${PAPER})`; g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    const r = O.rng('paper');
    for (let k = 0; k < 16; k++) {
      const x = r() * W, y = r() * H, rr = 30 + r() * 90, dark = r() < 0.5, gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, dark ? 'rgba(130,100,60,0.025)' : 'rgba(255,255,250,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    const pat = g.createPattern(grainTile(), 'repeat'); pat.setTransform(new DOMMatrix().scale(1 / R * 1.4));
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.065; g.fillStyle = pat; g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.025; g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (let k = 0; k < 140; k++) {
      const x = r() * W, y = r() * H, L = 2 + r() * 7, a = r() * TAU;
      g.strokeStyle = r() < 0.55 ? 'rgba(110,85,50,0.10)' : 'rgba(255,255,252,0.35)'; g.lineWidth = 0.12 + r() * 0.18;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.7) * L * 0.5, y + Math.sin(a + 0.7) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    for (let k = 0; k < 22; k++) { g.fillStyle = `rgba(70,55,40,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(r() * W, r() * H, 0.12 + r() * 0.22, 0, TAU); g.fill(); }
    g.restore();
  }

  function print(sp, o = {}) {
    const T = tiles(), ow = Math.round(sp.w * R), oh = Math.round(sp.h * R), MP = sp.M * R, pw = sp.pw, ph = sp.ph;
    const out = O.canvas(ow, oh), og = out.getContext('2d');
    const N = ow * oh, ar = new Float32Array(N), ag = new Float32Array(N), ab = new Float32Array(N);
    if (o.paper) {
      paper(og, sp.x0, sp.y0, sp.w, sp.h);
      const d = og.getImageData(0, 0, ow, oh).data;
      for (let i = 0; i < N; i++) { ar[i] = d[i * 4]; ag[i] = d[i * 4 + 1]; ab[i] = d[i * 4 + 2]; }
    } else { const base = o.base || [255, 255, 255]; ar.fill(base[0]); ag.fill(base[1]); ab.fill(base[2]); }
    const gx0 = sp.x0 * R, gy0 = sp.y0 * R, cx = W * R / 2, cy = H * R / 2;
    for (const k of 'bpy') {
      if (!sp[k].used) continue;
      const ink = INK[k], tl = T[k], Tn = sp[k].tone.g.getImageData(0, 0, pw, ph).data, Sd = sp[k].solid.g.getImageData(0, 0, pw, ph).data;
      const ca = Math.cos(ink.ang), sa = Math.sin(ink.ang);
      const kr = 1 - ink.rgb[0] / 255, kg = 1 - ink.rgb[1] / 255, kb = 1 - ink.rgb[2] / 255;
      const ox = ink.off[0] * R, oy = ink.off[1] * R, rot = ink.rot, mid = tl.mid, hi = tl.hi, low = tl.low, lgx = tl.gx, streak = tl.streak;
      for (let j = 0; j < oh; j++) {
        const Gy = gy0 + j;
        for (let i = 0; i < ow; i++) {
          const Gx = gx0 + i;
          const sx = Gx - ox - rot * (Gy - cy), sy = Gy - oy + rot * (Gx - cx);
          const li = Math.round(sx - gx0 + MP), lj = Math.round(sy - gy0 + MP);
          if (li < 0 || lj < 0 || li >= pw || lj >= ph) continue;
          const q = (lj * pw + li) * 4 + 3, t = Tn[q] / 255; let c = Sd[q] / 255;
          if (t < 0.004 && c < 0.004) continue;
          if (t >= 0.004) {

            const u = (sx * ca + sy * sa) / (ink.cell * R), v = (-sx * sa + sy * ca) / (ink.cell * R);
            const dx = u - Math.round(u), dy = v - Math.round(v);
            const radius = Math.sqrt(t / Math.PI);
            const h = clamp((radius - Math.hypot(dx, dy)) * ink.cell * R + 0.5);
            c = 1 - (1 - c) * (1 - h);
          }
          const xi = Math.round(sx) & 255, yi = Math.round(sy) & 255, ti = yi * TS + xi;
          if (c > 0.02 && c < 0.98) c = clamp(c + (hi[ti] - 0.5) * 0.10);
          const vd = mid[ti]; if (vd > 0.82) c *= 1 - Math.min(0.35, (vd - 0.82) * 2);
          const lx = (sx + 80) / 16, ly = (sy + 80) / 16, lx0 = Math.max(0, Math.min(lgx - 2, lx | 0)), ly0 = Math.max(0, ly | 0), fx = clamp(lx - lx0), fy = clamp(ly - ly0);
          const l0 = low[ly0 * lgx + lx0], l1 = low[ly0 * lgx + lx0 + 1], l2 = low[(ly0 + 1) * lgx + lx0], l3 = low[(ly0 + 1) * lgx + lx0 + 1];
          const lo = (l0 + (l1 - l0) * fx) + ((l2 + (l3 - l2) * fx) - (l0 + (l1 - l0) * fx)) * fy;
          c *= (0.94 + 0.06 * lo) * (0.98 + 0.02 * streak[(Math.round(sx) + 4096) & 2047]);
          if (c <= 0) continue;
          if (c > 1) c = 1;
          const n = j * ow + i;
          ar[n] *= 1 - c * kr; ag[n] *= 1 - c * kg; ab[n] *= 1 - c * kb;
        }
      }
    }
    const id = og.createImageData(ow, oh), d = id.data;
    for (let i = 0; i < N; i++) { d[i * 4] = ar[i]; d[i * 4 + 1] = ag[i]; d[i * 4 + 2] = ab[i]; d[i * 4 + 3] = 255; }
    og.putImageData(id, 0, 0);
    if (o.mask) { og.save(); og.setTransform(R, 0, 0, R, -sp.x0 * R, -sp.y0 * R); og.globalCompositeOperation = 'destination-in'; og.fillStyle = '#000'; og.beginPath(); o.mask(og); og.fill(); og.restore(); }
    return out;
  }

  const VP = [140, 118], F = 272;
  const p3 = (X, Y, Z) => [VP[0] + F * X / Z, VP[1] - F * (Y - 1) / Z];
  const gy = Z => VP[1] + F / Z;
  const FENCE_Z = 17.5, SIDE_Z = 16, FLOOR_Y = gy(FENCE_Z);

  const ZH = 6.6, XR = (236 - VP[0]) * ZH / F, E = 1.3, XB = XR + 1.0, XFT = XB - 5.8;
  const RIM = p3(XR, 3.05, ZH), NET_Y = p3(XR, 3.05 - 0.45 * E, ZH)[1];
  const ringPt = (a, r, Y) => p3(XR + r * Math.cos(a), Y, ZH + r * Math.sin(a));
  const SH = { base: [35, 129], ground: [35, 143] };
  const RB = { base: [260, 133], ground: [260, 145] };
  const SEAT_BALL = [150, 136.2, 3.5];
  const RELEASE = [64, 33];

  function contour(d) {
    const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g), steps = [];
    const spec = { M: ['moveTo',2], L: ['lineTo',2], C: ['bezierCurveTo',6], Q: ['quadraticCurveTo',4], Z: ['closePath',0] };
    for (let i = 0; i < tokens.length;) {
      const [method, n] = spec[tokens[i++]], args = tokens.slice(i, i+n).map(Number); i += n;
      steps.push([method,args]);
    }
    return g => { for (const [method,args] of steps) g[method](...args); };
  }
  const shooterBody = {
    all: figureUnion(
      contour('M 38 69 Q 35 75 33 84 Q 29 91 29 98 L 24 102 Q 31 106 40 106 Q 45 96 47 86 L 49 75 L 45 69 Z'),
      ell(43.5,62,4.8,5.5,-0.18),
      contour('M 40 66 L 39 72 L 45 74 L 46 66 Z'),
      contour('M 42 74 Q 50 71 54 60 L 54 40 Q 54 35 57 34 L 64 36 L 64 38 L 58 38 L 60 60 Q 57 75 46 80 Z'),
      contour('M 36 76 Q 32 67 36 56 Q 40 49 51 42 L 54 44 Q 44 54 41 59 L 42 72 Z'),
      contour('M 31 100 L 39 105 Q 34 112 27 116 L 17 110 L 13 112 Q 10 113 10 110 L 16 105 L 25 109 Z'),
      contour('M 38 101 L 44 103 Q 49 111 43 118 L 33 127 L 39 129 Q 41 132 37 132 L 27 130 Q 25 128 28 125 L 37 114 L 34 109 Z')
    ),
    jersey: contour('M 36 75 Q 40 80 46 77 L 44 90 L 41 103 L 26 101 Q 32 93 33 85 Z'),
    shorts: contour('M 29 99 L 43 100 L 46 108 L 38 113 L 34 107 L 28 111 L 22 107 Z')
  };
  const rebBody = {
    all: figureUnion(
      contour('M 243 72 Q 240 81 244 90 L 249 103 Q 254 107 262 102 L 257 88 Q 255 78 251 72 Z'),
      ell(246,66,4.6,5.5,-0.27),
      contour('M 244 69 L 243 76 L 250 78 L 249 69 Z'),
      contour('M 244 77 Q 235 65 231 54 L 225 43 L 224 38 L 227 39 L 231 44 L 238 54 L 249 73 Z'),
      contour('M 250 74 Q 261 74 271 65 L 279 61 L 282 64 L 273 70 Q 266 79 255 82 Z'),
      contour('M 249 101 L 257 100 Q 260 113 260 124 L 267 129 Q 269 132 266 134 L 256 130 L 253 116 Z'),
      contour('M 256 99 L 262 99 L 273 108 Q 276 112 271 119 L 277 118 L 279 121 L 269 125 Q 265 124 267 120 L 268 111 L 257 110 Z')
    ),
    jersey: contour('M 243 77 Q 249 81 254 76 L 256 87 L 262 99 L 246 102 L 244 91 Z'),
    shorts: contour('M 247 98 L 261 97 L 267 106 L 260 112 L 255 107 L 250 111 Z')
  };
  const runnerBody = {
    all: figureUnion(ell(192,103,2.5,2.9,-0.3),
      contour('M 190 106 L 195 105 L 201 116 L 195 119 L 189 112 Z'),
      contour('M 193 108 L 188 115 L 181 112 L 182 110 L 187 112 L 190 106 Z'),
      contour('M 195 107 L 203 109 L 207 103 L 209 104 L 205 112 L 198 112 Z'),
      contour('M 196 116 L 200 116 L 205 124 L 213 123 L 214 125 L 203 128 L 198 122 Z'),
      contour('M 195 116 L 199 120 L 192 125 L 186 132 L 182 132 L 183 130 L 188 122 Z')),
    jersey: contour('M 191 108 L 196 107 L 201 116 L 194 119 L 190 112 Z'),
    shorts: contour('M 194 116 L 201 114 L 204 120 L 199 123 L 195 121 Z')
  };

  function sky() {
    solid('p', rect(-6,-6,W+6,47), 0.88);
    solid('y', rect(-6,27,W+6,FLOOR_Y+2));
    addTone({p: lin(0,47,0,64,[[0,0.75],[1,0]])}, rect(-6,47,W+6,64));
    addTone({y: lin(0,18,0,27,[[0,0],[1,0.7]])}, rect(-6,18,W+6,27));
  }
  function clouds() {

    knock('bpy',poly([[-6,10],[54,12],[99,8],[151,10],[112,14],[55,17],[-6,14]]));
    knock('bpy',poly([[125,73],[179,70],[223,72],[192,74],[147,75]]));
  }
  function city() {

    const blocks = [[-4,19,108],[17,34,116],[32,47,99],[45,68,111],[67,91,105],[90,116,114],
      [115,140,103],[138,162,112],[160,183,106],[181,207,115],[205,226,109],[224,249,117],[247,284,107]];
    for (let i=0;i<blocks.length;i++) {
      const [x0,x1,y]=blocks[i], sh=rect(x0,y,x1,135);
      knock('bpy',sh); solid('b',sh,i%2 ? 0.24 : 0.38); solid('p',sh,i%2 ? 0.14 : 0.08);
    }
    const tower=union(rect(35,93,42,99),ell(38.5,93,3.5,1.2));
    knock('bpy',tower); solid('b',tower,0.45);
    line('b',[[35.5,98],[34.5,101]],0.5,0.3);
    line('b',[[41.5,98],[42.5,101]],0.5,0.3);
  }

  const LAMP = [21.5, 25.5];
  function lamp() {
    line('b', [[7.6, 137], [7.8, 60], [8.2, 32], [10, 26.5], [14, 24.6], [19, 24.3]], 1.25, 0.8, { ta: 0, tb: 0.05 });
    const head = poly([[16.5, 22.4], [25.5, 22.8], [27.5, 25.6], [15.5, 25.4]]);
    knock('bpy', head); solid('b', head);
    const bulb = ell(LAMP[0], LAMP[1] + 0.4, 4.2, 1.1);
    knock('bpy', bulb); solid('y', bulb, 0.35);
    knock('bp', rect(-6, -6, 70, 80), rad(LAMP[0], LAMP[1] + 2, 0, 16, [[0, 0.7], [0.5, 0.3], [1, 0]]), ['tone']);
    addTone({ y: rad(LAMP[0], LAMP[1] + 2, 2, 20, [[0, 0.9], [0.5, 0.45], [1, 0]]) }, rect(-6, -6, 70, 80));
  }

  function fence() {
    const top = p3(0, 3.5, FENCE_Z)[1], base = FLOOR_Y;
    const mesh = mask(g => {
      g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 0.18;
      for (let x = -60; x < W + 60; x += 4.6) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + (base - top), base); g.stroke(); g.beginPath(); g.moveTo(x, top); g.lineTo(x - (base - top), base); g.stroke(); }
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.fillRect(-10, top, W + 20, base - top);
    });
    stamp('b', 'solid', mesh);
    for (let k = -3; k <= 3; k++) { const x = VP[0] + F * 3 * k / FENCE_Z; line('b', [[x, base + 0.5], [x, top - 1]], 0.95, 0.85, { ta: 0, tb: 0, smooth: false, wob: 0.05 }); }
    line('b', [[-6, top], [W + 6, top]], 0.75, 0.75, { ta: 0, tb: 0, smooth: false, wob: 0.06 });
  }

  const xAt = (X, y) => VP[0] + X * (y - VP[1]);
  function floor() {
    const fl = rect(-6, FLOOR_Y, W + 6, H + 6);
    knock('bpy', fl);

    const z1 = ZH + 2.45;
    const key = poly([[xAt(XFT,gy(z1)),gy(z1)],[xAt(XB,gy(z1)),gy(z1)],[xAt(XB,H+8),H+8],[xAt(XFT,H+8),H+8]]);
    solid('y',key,0.13);
    solid('py',poly([[xAt(XB,FLOOR_Y),FLOOR_Y],[W+6,FLOOR_Y],[W+6,155],[xAt(XB,155),155]]),0.7);

    const lw = Z => 0.035 * F / Z;
    const L = [];
    const seg = (X0, Z0, X1, Z1, n = 12) => { const P = []; for (let i = 0; i <= n; i++) { const u = i / n, X = lerp(X0, X1, u), Z = lerp(Z0, Z1, u); P.push([...p3(X, 0, Z).slice(0, 1), gy(Z)].map(Number)); } return P; };
    const wseg = (P, Z0, Z1) => L.push(poly(brush(P, lw(Z0), lw(Z1), { ta: 0, tb: 0, wob: 0.04, smooth: false })));
    wseg(seg(-12, SIDE_Z, 12, SIDE_Z), SIDE_Z, SIDE_Z);
    wseg(seg(XB, SIDE_Z, XB, 3.2), SIDE_Z, 3.2);
    wseg(seg(XFT, z1, XB, z1), z1, z1);
    wseg(seg(XFT, z1, XFT, 3.6), z1, 3.6);

    const arc = (cx, cz, r, a0, a1) => { const P = []; for (let i = 0; i <= 40; i++) { const a = lerp(a0, a1, i / 40), X = cx + r * Math.cos(a), Z = cz + r * Math.sin(a); if (Z > 3) P.push([VP[0] + F * X / Z, gy(Z), Z]); } return P; };
    const arcLine = P => { if (P.length > 2) L.push(poly(brush(P.map(p => [p[0], p[1]]), lw(P[0][2]), lw(P[P.length - 1][2]), { ta: 0, tb: 0, wob: 0.04, smooth: false }))); };
    arcLine(arc(XFT, ZH, 1.8, Math.PI / 2, Math.PI * 1.5));
    arcLine(arc(XR, ZH, 6.75, Math.PI * 0.5, Math.PI * 1.25));
    wseg(seg(XR, ZH + 6.75, XB, ZH + 6.75), ZH + 6.75, ZH + 6.75);
    solid('b', union(...L), 0.85);

    for (const f of [SH, RB]) {
      const [x, y] = f.ground, dx = f === SH ? -36 : -26;
      const shadow = poly([[x - 7, y - 1], [x + 6, y + 1], [x + dx + 6, y + 14], [x + dx - 5, y + 12]]);
      addTone({ b: 0.26 }, shadow);
    }

    for (const [x, y, rx, ry, a] of [[SH.ground[0] + 1, SH.ground[1], 13, 2.6, 0.55], [RB.ground[0] - 1, RB.ground[1], 10, 2.1, 0.5], [SEAT_BALL[0] + 1, SEAT_BALL[1] + SEAT_BALL[2] - 0.2, 4, 0.9, 0.6]]) {
      addTone({ b: rad(x, y, 0, rx, [[0, a], [0.6, a * 0.6], [1, 0]]), p: rad(x, y, 0, rx, [[0, a * 0.5], [1, 0]]) }, ell(x, y, rx, ry));
    }
  }

  const BOARD = { X: XR + 0.38, y0: 2.9, y1: 3.95, z0: ZH - 0.9, z1: ZH + 0.9 };
  const boardPts = () => [p3(BOARD.X, BOARD.y1, BOARD.z1), p3(BOARD.X, BOARD.y0, BOARD.z1), p3(BOARD.X, BOARD.y0, BOARD.z0), p3(BOARD.X, BOARD.y1, BOARD.z0)];
  const rimRing = (r = 0.23 * E) => { const P = []; for (let i = 0; i <= 48; i++) P.push(ringPt(i / 48 * TAU, r, 3.05)); return P; };
  function hoop() {

    line('b', [p3(BOARD.X + 0.05, 3.35, ZH), p3(BOARD.X + 1.6, 3.25, ZH)], 2.6, 3.4, { ta: 0, tb: 0, smooth: false });
    line('b', [p3(BOARD.X + 0.05, 2.95, ZH), p3(BOARD.X + 1.6, 3.15, ZH)], 1.4, 2.0, { ta: 0, tb: 0, smooth: false });
    const B = boardPts(), bsh = poly(B);
    knock('bpy', bsh);
    solid('y', bsh, 0.03);

    line('p', [B[2],B[3]], 2.4,2.4,{ta:0,tb:0,smooth:false});

    line('b', [B[0], B[1]], 1.0, 1.0, { ta: 0, tb: 0, smooth: false });
    line('b', [B[1], B[2]], 1.0, 1.5, { ta: 0, tb: 0, smooth: false });
    line('b', [B[2], B[3]], 2.2, 2.6, { ta: 0, tb: 0, smooth: false });
    line('b', [B[3], B[0]], 1.4, 1.0, { ta: 0, tb: 0, smooth: false });

    const q = (z, y) => p3(BOARD.X, y, z), za = ZH - 0.3, zb = ZH + 0.3;
    for (const [a, b] of [[q(za, 3.05), q(za, 3.5)], [q(zb, 3.05), q(zb, 3.5)], [q(za, 3.5), q(zb, 3.5)]]) line('b', [a, b], 0.9, 0.9, { ta: 0, tb: 0, smooth: false });

    const nb = 10, tw = 0.55, net = [], netBack = [];
    for (let i = 0; i < nb; i++) for (const sgn of [1, -1]) {
      const a = i / nb * TAU, top = ringPt(a, 0.23 * E, 3.05), bot = ringPt(a + sgn * tw, 0.13 * E, 3.05 - 0.45 * E);
      const midp = ringPt(a + sgn * tw * 0.5, 0.19 * E, 3.05 - 0.24 * E);
      const front = Math.sin(a + sgn * tw * 0.5) < 0.1;
      (front ? net : netBack).push(poly(brush([top, midp, bot], 0.42, 0.34, { ta: 0, tb: 0.1, wob: 0.08 })));
    }
    solid('b', union(...netBack), 0.6); solid('b', union(...net));

    const ring = poly(brush(rimRing(), 1.5, 1.5, { ta: 0, tb: 0, smooth: false, wob: 0.03 }));
    knock('bpy', ring); solid('p', ring);
    const nearHalf = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; const pt = ringPt(a, 0.23 * E, 3.05); nearHalf.push([pt[0], pt[1] + 0.55]); }
    line('b', nearHalf, 0.3, 0.6, { ta: 0.2, tb: 0.2, smooth: false });
    line('b', [ringPt(0, 0.23 * E, 3.05), p3(BOARD.X, 3.0, ZH)], 1.4, 1.8, { ta: 0, tb: 0, smooth: false });
  }

  function friend(B, accent) {
    const drawBody = g => { B.all(g); g.beginPath(); B.shorts(g); g.fill(); };
    const m=mask(g=>{g.fillStyle='#000';drawBody(g);});
    for (const k of 'bpy') for (const layer of ['solid','tone']) stamp(k,layer,m,'destination-out');
    stamp('b','solid',m);

    const fringe=mask(g=>{
      g.fillStyle='#000';drawBody(g);
      g.globalCompositeOperation='destination-out';g.translate(-0.8,0.4);drawBody(g);
    });
    stamp('p','solid',fringe);
    knock('bpy',B.jersey); solid('p',B.jersey,accent); solid('b',B.jersey,0.78);
    solid('b',B.shorts);
  }
  function figureInk() {
    const runner = { all: shift(runnerBody.all,28,0), jersey: shift(runnerBody.jersey,28,0), shorts: shift(runnerBody.shorts,28,0) };
    friend(runner,0.1); friend(rebBody,0.12); friend(shooterBody,0.7);

    knock('bpy',contour('M 37 75 Q 40 79 44 76 L 44 78 Q 40 81 37 78 Z'));
    knock('bpy',contour('M 31 93 L 29 98 L 38 99 L 35 97 Z'));
    knock('bpy',contour('M 248 81 L 251 89 L 254 92 L 252 85 Z'));
    line('b',[[34,87],[32,94],[29,97]],0.25,1.4,{ta:0.1,tb:0.1});
    line('b',[[242,84],[248,97],[256,100]],0.35,1.5,{ta:0.1,tb:0.1});
    line('b',[[54,39],[54.5,54],[53,62]],0.2,1.6,{ta:0.1,tb:0.05,wob:0.18});
    line('b',[[32,105],[26,114],[17,109]],1.7,0.2,{ta:0.1,tb:0.3,wob:0.2});
    line('b',[[225,40],[234,58],[242,71]],0.2,1.8,{ta:0.3,tb:0.05,wob:0.18});
  }

  function seatBall() {
    const [x, y, r] = SEAT_BALL, sh = ell(x, y, r, r);
    knock('bpy', sh); solid('py', sh);
    addTone({ b: rad(x + r * 0.5, y + r * 0.5, 0, r * 1.2, [[0, 0.6], [1, 0]]) }, sh);
    line('b', [[x - r * 0.15, y - r], [x + r * 0.25, y + r]], 0.35, 0.35, { ta: 0.2, tb: 0.2 });
    line('b', [[x - r, y - r * 0.1], [x + r, y + r * 0.15]], 0.35, 0.35, { ta: 0.2, tb: 0.2 });
    for (const [dy, l] of [[-1.4, 9], [0.6, 12], [2.2, 7]]) line('b', [[x - r - 2 - l, y + dy], [x - r - 1.5, y + dy]], 0.12, 0.45, { ta: 0.5, tb: 0.05, smooth: false });
  }

  function paintBack() {
    S = plates(0, 0, W, H, 4);
    sky(); clouds(); city(); lamp(); fence(); floor(); seatBall();
    figureInk(); hoop();
    return print(S, { paper: true });
  }

  const BR = 5.4;
  function ballSprites() {
    const out = [], s = BR + 2.5;
    const seams = [[[-1, 0], [1, 0]], [[0, -1], [0, 1]], [[-0.62, -0.78], [-0.3, 0], [-0.62, 0.78]], [[0.62, -0.78], [0.3, 0], [0.62, 0.78]]];
    const outline = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; outline.push([Math.cos(a) * BR, Math.sin(a) * BR]); }
    for (let f = 0; f < 8; f++) {
      const phi = f / 8 * Math.PI, rotp = ([u, v]) => [(u * Math.cos(phi) - v * Math.sin(phi)) * BR * 1.02, (u * Math.sin(phi) + v * Math.cos(phi)) * BR * 1.02];
      S = plates(-s, -s, 2 * s, 2 * s, 2);
      const disc = ell(0, 0, BR, BR);
      solid('py', disc);
      addTone({ b: rad(BR * 0.55, BR * 0.6, 0, BR * 1.35, [[0, 0.7], [0.55, 0.38], [1, 0]]) }, disc);
      knock('p', ell(-BR * 0.38, -BR * 0.42, BR * 0.32, BR * 0.22, -0.6), 0.6, ['solid']);
      const sm = mask(g => {
        g.fillStyle = '#000';
        for (const P of seams) { g.beginPath(); poly(brush(P.map(rotp), 0.5, 0.5, { ta: 0, tb: 0, wob: 0.05 }))(g); g.fill(); }
        g.globalCompositeOperation = 'destination-in'; g.beginPath(); disc(g); g.fill();
      });
      stamp('b', 'solid', sm);
      line('b', outline, 0.55, 0.55, { ta: 0, tb: 0, smooth: false, wob: 0.06 });
      out.push(print(S, { base: PAPER, mask: ell(0, 0, BR + 0.7, BR + 0.7) }));
    }
    return out;
  }

  function rimFrontSprite() {
    const x0 = RIM[0] - 20, y0 = RIM[1] - 10;
    S = plates(x0, y0, 40, 20, 2);
    const half = []; for (let i = 0; i <= 24; i++) half.push(ringPt(Math.PI + i / 24 * Math.PI, 0.23 * E, 3.05));
    const sh = poly(brush(half, 1.5, 1.5, { ta: 0, tb: 0, smooth: false, wob: 0.03 }));
    solid('p', sh);
    line('b', half.map(p => [p[0], p[1] + 0.55]), 0.3, 0.6, { ta: 0.2, tb: 0.2, smooth: false });
    return { img: print(S, { base: PAPER, mask: sh }), x0, y0, w: 40, h: 20 };
  }

  const SPD = { x0: 0, y0: 18, w: W, h: H - 18 };
  function speedSprites() {
    const out = [];
    for (let v = 0; v < 3; v++) {
      S = plates(SPD.x0, SPD.y0, SPD.w, SPD.h, 3);
      const r = O.rng('spd' + v);
      const feet = (cx, y0, n, spread, len, w) => {
        for (let k = 0; k < n; k++) {
          const x = cx + (k / (n - 1) - 0.5) * spread + (r() - 0.5) * 2.2, yA = y0 + r() * 3, l = len * (0.55 + r() * 0.6);
          line(r() < 0.25 ? 'p' : 'b', [[x, yA], [x + (x - cx) * 0.05, yA + l]], w * (0.7 + r() * 0.6), 0.05, { ta: 0.05, tb: 0.6, smooth: false });
        }
      };
      feet(28,132,4,22,12,1.1);
      feet(264,136,3,15,10,0.8);

      const C=[40,85];
      for(let k=0;k<10;k++) {
        const a=(112+k*10)/180*Math.PI, d=34+r()*6, l=13+r()*13;
        const P=[[C[0]+Math.cos(a)*d,C[1]+Math.sin(a)*d],
          [C[0]+Math.cos(a)*(d+l),C[1]+Math.sin(a)*(d+l)]];
        line(k%3?'b':'p',P,0.1,1.0+r()*0.7,{ta:0.5,tb:0.02,smooth:false});
      }

      const sweat=contour('M 30 59 Q 24 55 25 52 Q 29 49 30 59 Z M 259 68 Q 266 62 266 66 Q 268 71 259 68 Z');
      solid('b',sweat);
      line('p',[[66,47],[68,40],[71,36]],1.3,0.1,{ta:0.05,tb:0.5});
      out.push(print(S, {}));
    }
    return out;
  }

  const HALO = { x0: LAMP[0] - 22, y0: LAMP[1] - 16, w: 44, h: 40 };
  function haloSprite() {
    S = plates(HALO.x0, HALO.y0, HALO.w, HALO.h, 2);
    addTone({ y: rad(LAMP[0], LAMP[1] + 1.5, 1, 19, [[0, 0.75], [0.5, 0.32], [1, 0]]) }, rect(HALO.x0 - 3, HALO.y0 - 3, HALO.x0 + HALO.w + 3, HALO.y0 + HALO.h + 3));
    addTone({ p: rad(LAMP[0], LAMP[1] + 1.5, 6, 16, [[0, 0], [0.5, 0.14], [1, 0]]) }, rect(HALO.x0 - 3, HALO.y0 - 3, HALO.x0 + HALO.w + 3, HALO.y0 + HALO.h + 3));
    return print(S, {});
  }

  let cache = null, live = null;
  function build() {
    if (cache) return cache;
    const back = paintBack();
    const front = O.canvas(W * R, H * R);
    const blur = O.canvas(W * R / 2, H * R / 2), bg = blur.getContext('2d');
    bg.filter = `blur(${5 * R / 2}px)`; bg.drawImage(back, -20, -20, blur.width + 40, blur.height + 40);
    live = { balls: ballSprites(), rimFront: rimFrontSprite(), speed: speedSprites(), halo: haloSprite() };
    S = null;
    return (cache = { back, front, blur });
  }

  const PER = 2.2, PH0 = 1.31;
  const ease = s => s * s * (3 - 2 * s);
  const flightAt = s => { const x = lerp(RELEASE[0], RIM[0], ease(s)), y = lerp(RELEASE[1], RIM[1] - 1, s) - 4 * 20 * s * (1 - s); return [x, y]; };
  function ballAt(t) {
    const u = ((((t - PH0) % PER) + PER) % PER) / PER;
    if (u < 0.5) { const s = u / 0.5, [x, y] = flightAt(s); return { ph: 'fly', s, x, y, spin: s * 7 }; }
    if (u < 0.58) { const s = (u - 0.5) / 0.08; return { ph: 'net', s, x: RIM[0] + s * 1.5, y: lerp(RIM[1] - 1, NET_Y + 2, s * s * 0.6 + s * 0.4), spin: 7 + s }; }
    if (u < 0.86) {
      const s = (u - 0.58) / 0.28, G = gy(ZH) - BR + 1, x = lerp(RIM[0] + 1.5, W + 14, s);
      const sb = 0.42, y = s < sb ? lerp(NET_Y + 2, G, (s / sb) ** 2) : G - 30 * (4 * ((s - sb) / (1 - sb)) * (1 - (s - sb) / (1 - sb))) * 0.9;
      return { ph: 'fall', s, x, y, spin: 8 + s * 5, ground: G };
    }
    return null;
  }
  function tri(g, P, col, a) {
    g.fillStyle = `rgba(${col},${a})`; g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); g.fill();
  }
  const BLUE = '50,85,164', PINK = '255,72,176';
  function trail(g, t, b) {
    const f = Math.floor(t * 24);
    g.save(); g.globalCompositeOperation = 'multiply';
    if (b.ph === 'fly') {
      const lines = [[-4.5, 0.32, 1.0], [-1.8, 0.46, 1.8], [1.0, 0.38, 1.3], [3.8, 0.26, 0.9]];
      lines.forEach(([off, len, w], k) => {
        const L = len * (0.8 + 0.4 * O.hash(f, k, 3)), P = [], Q = [], haloP = [], haloQ = [];
        for (let i = 0; i <= 10; i++) {
          const s = b.s - L * i / 10; if (s < 0) break;
          const [x, y] = flightAt(s), [x2, y2] = flightAt(s + 0.004), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1;
          const ww = w * (1 - i / 10) * 0.5, o = off * (1 - 0.3 * i / 10);
          P.push([x - dy / l * (o + ww), y + dx / l * (o + ww)]); Q.push([x - dy / l * (o - ww), y + dx / l * (o - ww)]);
          const hw=ww+0.38*(1-i/10);
          haloP.push([x-dy/l*(o+hw),y+dx/l*(o+hw)]); haloQ.push([x-dy/l*(o-hw),y+dx/l*(o-hw)]);
        }
        if (P.length > 2) {

          g.globalCompositeOperation='source-over'; tri(g,haloP.concat(haloQ.reverse()),PAPER.join(','),1);
          g.globalCompositeOperation='multiply'; tri(g,P.concat(Q.reverse()),PINK,0.98);
        }
      });
    } else if (b.ph === 'fall' || b.ph === 'net') {
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * 3.2 + (O.hash(f, k, 5) - 0.5), len = 7 + 6 * O.hash(f, k, 6), x = b.x + ox, y = b.y - BR - 1;
        tri(g, [[x - 0.5, y], [x + 0.5, y], [x - (b.ph === 'fall' ? 3 : 0.5), y - len]], BLUE, 0.8);
      }
    }
    g.restore();
  }
  function swish(g, t, b) {
    if (!b || b.ph !== 'net') return;
    const f = Math.floor(t * 24), k0 = 1 - b.s * 0.6;
    g.save(); g.globalCompositeOperation = 'multiply';
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.95 + k / 6 * 1.1) + (O.hash(f, k, 8) - 0.5) * 0.15, r0 = 15 + 2 * O.hash(f, k, 9), r1 = r0 + 6 * k0 + 3;
      const cx = RIM[0], cy = RIM[1] + 3, n = [-Math.sin(a), Math.cos(a)];
      tri(g, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.75], [cx + Math.cos(a) * r1 + n[0] * 0.7, cy + Math.sin(a) * r1 * 0.75 + n[1] * 0.7], [cx + Math.cos(a) * r1 - n[0] * 0.7, cy + Math.sin(a) * r1 * 0.75 - n[1] * 0.7]], k % 3 ? BLUE : PINK, 0.9);
    }
    g.restore();
  }
  function lampFlicker(t) {
    const k = Math.floor(t * 12), base = 0.78 + 0.18 * O.hash(k, 11);
    const u = ((t % 4.3) + 4.3) % 4.3;
    return u < 0.09 ? 0.2 : u < 0.14 ? 0.7 : u < 0.2 ? 0.35 : base;
  }
  function liveBack(g, t) {
    if (!live) build();
    g.save();
    g.globalCompositeOperation = 'multiply';
    const v = Math.floor(t * 8) % 3;
    g.globalAlpha = 0.9; g.drawImage(live.speed[v], SPD.x0, SPD.y0, SPD.w, SPD.h);
    g.globalAlpha = lampFlicker(t); g.drawImage(live.halo, HALO.x0, HALO.y0, HALO.w, HALO.h);
    g.restore();
    const b = ballAt(t);
    if (b) {
      trail(g, t, b);
      if (b.ph === 'fall') {
        const h = clamp((b.ground - b.y) / 40), sx = b.x;
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${BLUE},${0.5 * (1 - h)})`;
        g.beginPath(); g.ellipse(sx, gy(ZH) + 0.5, BR * (1.1 - 0.4 * h), 1.2, 0, 0, TAU); g.fill(); g.restore();
      }
      const img = live.balls[Math.floor(b.spin * 8 / Math.PI) & 7], s = BR + 2.5;
      g.drawImage(img, b.x - s, b.y - s, 2 * s, 2 * s);
      if (b.ph === 'net' || (b.ph === 'fly' && b.s > 0.96)) {
        const rf = live.rimFront; g.drawImage(rf.img, rf.x0, rf.y0, rf.w, rf.h);
        if (b.ph === 'net') {
          g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = `rgba(${BLUE},0.9)`; g.lineWidth = 0.45;
          for (let i = 0; i < 8; i++) for (const sgn of [1, -1]) {
            const a = Math.PI * (1.05 + i / 7 * 0.9), top = ringPt(a, 0.23 * E, 3.05), bot = ringPt(a + sgn * 0.55, 0.13 * E, 3.05 - 0.45 * E);
            const bulge = Math.sin(b.s * Math.PI) * 2.2;
            g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo((top[0] + bot[0]) / 2 + (top[0] - RIM[0]) * 0.15 * bulge, (top[1] + bot[1]) / 2 + bulge, bot[0], bot[1] + bulge * 0.6); g.stroke();
          }
          g.restore();
        }
      }
    }
    swish(g, t, b);
  }
  function liveFront() {}

  const light_ = { key: [1.1, 0.78, 0.7], keyDir: [1, -0.2], fill: [0.55, 0.45, 0.75], rim: [1.0, 0.92, 0.45], rimDir: [1, 0] };

  window.DeskScenes = Object.assign(window.DeskScenes || {}, { s1: { W, H, build, liveBack, liveFront, light: light_, style: 'riso' } });
})();
