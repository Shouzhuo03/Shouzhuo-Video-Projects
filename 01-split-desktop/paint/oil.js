(function () {
  const R = 4;
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;

  function hash(a, b = 0, c = 0) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x27d4eb2f, 0x165667b1);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  const seedOf = s => { if (typeof s === 'number') return s | 0; let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; };
  function rng(seed) { let k = 0; const s = seedOf(seed); return () => hash(s, k++, 77); }
  function noise2(x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  }
  function fbm(x, y, s = 0, oct = 4) { let v = 0, a = 0.5, n = 0, f = 1; for (let k = 0; k < oct; k++) { v += a * noise2(x * f, y * f, s + k * 131); n += a; a *= 0.5; f *= 2; } return v / n; }

  const rgb = h => (Array.isArray(h) ? h : [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const css = (c, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`;
  const mixc = (a, b, u) => { a = rgb(a); b = rgb(b); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; };
  const mul = (c, L) => { c = rgb(c); return [c[0] * L[0], c[1] * L[1], c[2] * L[2]]; };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function layer(W, H, draw, r = R) { const c = canvas(W * r, H * r), g = c.getContext('2d'); g.scale(r, r); g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); return c; }
  function path(g, pts, close = true) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); }
  function inside(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
  function area(pts) { let s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(s / 2); }
  function ellipse(cx, cy, rx, ry, n = 40, a0 = 0, a1 = TAU) { const o = []; for (let k = 0; k < n; k++) { const t = a0 + (a1 - a0) * k / (a1 - a0 >= TAU - 1e-6 ? n : n - 1); o.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } return o; }

  function rough(pts, amp = 0.6, seed = 0, ds = 3) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / ds));
      const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
      for (let k = 0; k < n; k++) {
        const u = k / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), d = (fbm(x * 0.15, y * 0.15, seed, 2) - 0.5) * 2 * amp;
        out.push([x + nx * d, y + ny * d]);
      }
    }
    return out;
  }

  const weave = (() => {
    const n = 64, c = canvas(n, n), g = c.getContext('2d'), id = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const wx = 0.5 + 0.5 * Math.sin(x / n * TAU * 16 + hash(y >> 2, 1) * 2), wy = 0.5 + 0.5 * Math.sin(y / n * TAU * 16 + hash(x >> 2, 2) * 2);
      const v = 128 + (((x >> 2) + (y >> 2)) % 2 ? wx : wy) * 70 - 35 + (hash(x, y, 3) - 0.5) * 30;
      const i = (y * n + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return c;
  })();
  function texture(g, tex, scale, mode, alpha, x0, y0, w, h) {
    g.save();
    const p = g.createPattern(tex, 'repeat'); p.setTransform(new DOMMatrix().scale(scale));
    g.globalCompositeOperation = mode; g.globalAlpha = alpha; g.fillStyle = p; g.fillRect(x0, y0, w, h);
    g.restore();
  }
  function ground(g, W, H, o = {}) {
    const tone = rgb(o.tone || '#8A6A4A'), seed = o.seed || 1;
    g.fillStyle = css(tone); g.fillRect(-10, -10, W + 20, H + 20);
    const lo = canvas(Math.ceil(W / 3), Math.ceil(H / 3)), lx = lo.getContext('2d'), id = lx.createImageData(lo.width, lo.height);
    for (let j = 0; j < lo.height; j++) for (let i = 0; i < lo.width; i++) {
      const v = (fbm(i / 18, j / 18, seed, 4) - 0.5) * 40, k = (j * lo.width + i) * 4;
      id.data[k] = tone[0] + v; id.data[k + 1] = tone[1] + v * 0.9; id.data[k + 2] = tone[2] + v * 0.75; id.data[k + 3] = 255;
    }
    lx.putImageData(id, 0, 0);
    g.drawImage(lo, -10, -10, W + 20, H + 20);
    texture(g, weave, 0.5 / R * 4, 'overlay', 0.35, -10, -10, W + 20, H + 20);
  }

  function canvasGrain(g, W, H, alpha = 0.16) { texture(g, weave, 0.5 / R * 4, 'overlay', alpha, -10, -10, W + 20, H + 20); }

  function makeLight(o) {
    const amb = o.ambient || [0.5, 0.5, 0.55];
    return (x, y) => {
      const out = amb.slice();
      for (const l of o.lamps || []) {
        const d = Math.hypot(x - l.x, (y - l.y) * (l.squash || 1));
        let k = l.power / (1 + (d / l.radius) ** 2);
        if (l.cone) { const a = Math.atan2(y - l.y, x - l.x), da = Math.abs(((a - l.cone.dir + Math.PI * 3) % TAU) - Math.PI); k *= clamp((l.cone.half - da) / l.cone.soft + 0.5); }
        if (l.shadows) for (const s of l.shadows) if (inside(s, x, y)) { k *= l.shadowLeak ?? 0.12; break; }
        const c = l.color || [1, 1, 1];
        out[0] += k * c[0]; out[1] += k * c[1]; out[2] += k * c[2];
      }
      return out;
    };
  }

  function dense(P, ds) {
    const out = [P[0]];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / ds));
      for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
    }
    return out;
  }
  function stroke(g, P0, o) {
    if (P0.length < 2) return;
    const w = o.w, P = dense(P0, Math.max(0.6, w * 0.5)), n = P.length, seed = o.seed | 0;
    const Ls = [0]; for (let i = 1; i < n; i++) Ls.push(Ls[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = Ls[n - 1]; if (tot < 0.3) return;
    const nb = o.nb ?? Math.max(1, Math.min(6, Math.round(w / 1.2))), dry = o.dry ?? 0.25, gap = o.gap ?? 6, a = o.a ?? 0.9, cj = o.cj ?? 10, tp = o.taper ?? 0.2;
    const col = rgb(o.col);
    for (let j = 0; j < nb; j++) {
      const r = m => hash(j * 11 + m, seed, 5);
      const off = nb === 1 ? 0 : ((j + 0.5) / nb - 0.5) * w + (r(1) - 0.5) * (w / nb) * 0.5;
      const bw = nb === 1 ? w : (w / nb) * (1.25 + r(2) * 0.6);
      const s0 = r(5) * 0.08, s1 = 1 - r(6) * 0.1, ns = r(7) * 500;
      g.beginPath();
      let on = false, cnt = 0;
      for (let i = 0; i < n; i++) {
        const s = Ls[i] / tot;
        if (s < s0 || s > s1) { on = false; continue; }
        if (dry > 0 && noise2(Ls[i] / gap + ns, j * 3.7, seed) < dry * (0.4 + 0.9 * s)) { on = false; continue; }
        const env = Math.min(1, s / tp, (1 - s) / tp), p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(n - 1, i + 1)];
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, ox = off * (0.35 + 0.65 * env);
        const x = P[i][0] - dy / l * ox, y = P[i][1] + dx / l * ox;
        if (!on) { g.moveTo(x, y); on = true; } else { g.lineTo(x, y); cnt++; }
      }
      if (!cnt) continue;
      g.strokeStyle = css([col[0] + (r(3) - 0.5) * cj, col[1] + (r(8) - 0.5) * cj, col[2] + (r(9) - 0.5) * cj], a * (0.65 + 0.35 * r(4)));
      g.lineWidth = bw;
      g.stroke();
    }
  }

  function region(g, pts, o) {
    const L = o.light || (() => [1, 1, 1]), seed = seedOf(o.seed ?? 1);
    const colAt = (x, y) => { const c = typeof o.color === 'function' ? o.color(x, y) : o.color; return mul(c, L(x, y)); };
    const [x0, y0, x1, y1] = bbox(pts), A = area(pts);
    g.save();
    path(g, pts); g.clip();
    if ((o.base ?? 1) > 0) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, c0 = colAt(cx, cy);
      g.globalAlpha = o.base ?? 1; g.fillStyle = css(c0); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
      const steps = 10;
      for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
        const px = lerp(x0, x1, (i + 0.5) / steps), py = lerp(y0, y1, (j + 0.5) / steps), c = colAt(px, py);
        const gr = g.createRadialGradient(px, py, 0, px, py, Math.max(x1 - x0, y1 - y0) / steps * 1.1);
        gr.addColorStop(0, css(c, 0.6)); gr.addColorStop(1, css(c, 0));
        g.fillStyle = gr; g.fillRect(px - (x1 - x0) / steps * 1.2, py - (y1 - y0) / steps * 1.2, (x1 - x0) / steps * 2.4, (y1 - y0) / steps * 2.4);
      }
      g.globalAlpha = 1;
    }
    const len = o.len || [8, 18], wid = o.w || [2, 4], cover = o.cover ?? 2.2;
    const mean = ((len[0] + len[1]) / 2) * ((wid[0] + wid[1]) / 2), N = Math.round(cover * A / mean);
    const rr = rng(seed);
    for (let k = 0; k < N; k++) {
      let x, y, tries = 0;
      do { x = lerp(x0, x1, rr()); y = lerp(y0, y1, rr()); } while (!inside(pts, x, y) && ++tries < 8);
      const ang = (typeof o.dir === 'function' ? o.dir(x, y) : (o.dir ?? 0)) + (rr() - 0.5) * 2 * (o.dj ?? 0.12);
      const l = lerp(len[0], len[1], rr()), wv = lerp(wid[0], wid[1], rr()), bend = (rr() - 0.5) * (o.curve ?? 0.15) * l;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const P = [[x - ca * l / 2, y - sa * l / 2], [x - sa * bend, y + ca * bend], [x + ca * l / 2, y + sa * l / 2]];
      const c = colAt(x, y), jit = o.jitter ?? 0.06, f = 1 + (rr() - 0.5) * 2 * jit;
      stroke(g, P, { w: wv, col: [c[0] * f, c[1] * f, c[2] * f], a: o.a ?? 0.85, dry: o.dry ?? 0.25, gap: o.gap ?? 5, cj: o.cj ?? 10, seed: seed * 31 + k });
    }
    g.restore();
  }

  function line(g, pts, o) { stroke(g, pts, Object.assign({ nb: 3, dry: 0.12, taper: 0.06, cj: 6 }, o)); }

  function glaze(g, pts, style, alpha, mode = 'multiply', blur = 0) {
    g.save(); g.globalCompositeOperation = mode; g.globalAlpha = alpha;
    if (blur) g.filter = `blur(${blur * R}px)`;
    g.fillStyle = style;
    if (pts) { path(g, pts); g.fill(); } else g.fillRect(-20, -20, 4000, 4000);
    g.restore();
  }

  function finish(g, W, H, o = {}) {
    if (o.vignette) {
      g.save(); g.globalCompositeOperation = 'multiply';
      const v = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.3, W / 2, H * 0.48, Math.hypot(W, H) * 0.62);
      v.addColorStop(0, '#ffffff'); v.addColorStop(1, css(rgb(o.vignetteColor || '#5a4a52')));
      g.globalAlpha = o.vignette; g.fillStyle = v; g.fillRect(-10, -10, W + 20, H + 20); g.restore();
    }
    if (o.tint) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = o.tint[1]; g.fillStyle = o.tint[0]; g.fillRect(-10, -10, W + 20, H + 20); g.restore(); }
    canvasGrain(g, W, H, o.grain ?? 0.14);
  }

  window.Oil = { R, TAU, clamp, lerp, hash, rng, noise2, fbm, rgb, css, mixc, mul, canvas, layer, path, inside, bbox, area, ellipse, rough,
                 ground, canvasGrain, makeLight, stroke, region, line, glaze, finish, seedOf };
})();
