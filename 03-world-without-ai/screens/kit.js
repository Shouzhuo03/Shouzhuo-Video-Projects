(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const EO = (k) => 1 - Math.pow(1 - k, 3);
  const EI = (k) => k * k * k;
  const smooth = (k) => k * k * (3 - 2 * k);
  const EASE = { io: inOut, eo: EO, ei: EI, lin: (k) => k, sm: smooth };
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  function cubicBezier(x1, y1, x2, y2) {
    const B = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1;
      for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (B(m, x1, x2) < x) lo = m; else hi = m; }
      return B((lo + hi) / 2, y1, y2);
    };
  }

  function track(keys, ease = 'io') {
    return (t) => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 0; i < keys.length - 1; i++) {
        const [t0, a] = keys[i], [t1, b, e] = keys[i + 1];
        if (t <= t1) {
          const k = EASE[e || ease](clamp((t - t0) / (t1 - t0)));
          return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
        }
      }
      return keys[keys.length - 1][1];
    };
  }

  const EZ = cubicBezier(0.65, 0, 0.35, 1);
  const SEG = { io: EZ, in: (s) => s * s * s, out: (s) => 1 - Math.pow(1 - s, 3), hold: () => 0, lin: (s) => s };
  function motion(keys) {
    const v = (i) => { const [t0, x0, y0] = keys[i - 1], [t1, x1, y1] = keys[i], d = t1 - t0; return [(3 * (x1 - x0)) / d, (3 * (y1 - y0)) / d]; };
    const f = (t) => {
      const a = keys[0], z = keys[keys.length - 1];
      if (t <= a[0]) { const u = keys[1] && keys[1][3] === 'out' ? v(1) : [0, 0]; return [a[1] + u[0] * (t - a[0]), a[2] + u[1] * (t - a[0])]; }
      if (t >= z[0]) { const u = z[3] === 'in' ? v(keys.length - 1) : [0, 0]; return [z[1] + u[0] * (t - z[0]), z[2] + u[1] * (t - z[0])]; }
      let i = 0; while (t > keys[i + 1][0]) i++;
      const [t0, x0, y0] = keys[i], [t1, x1, y1, e = 'io'] = keys[i + 1], k = SEG[e]((t - t0) / (t1 - t0));
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    };
    f.keys = keys;
    return f;
  }

  function clickScale(t, clicks) {
    let s = 1;
    for (const c of clicks) {
      const a = t - (typeof c === 'number' ? c : c.t); if (a < 0 || a > 0.26) continue;
      s = Math.min(s, a < 0.06 ? 1 - (0.18 * a) / 0.06 : 1 - 0.18 * Math.cos(((a - 0.06) / 0.2) * Math.PI / 2) + 0.025 * Math.sin(((a - 0.06) / 0.2) * Math.PI));
    }
    return s;
  }

  function tiltAt(posAt, t, { f = 2.4, zeta = 0.36, k = 0.02, max = 30, rate = 240 } = {}) {
    const t0 = -1, w = 2 * Math.PI * f, dt = 1 / rate, n = Math.max(0, Math.round((t - t0) * rate));
    let th = 0, om = 0, prev = posAt(t0)[0];
    for (let i = 1; i <= n; i++) {
      const x = posAt(t0 + i * dt)[0], target = clamp(-((x - prev) / dt) * k, -max, max); prev = x;
      om += (w * w * (target - th) - 2 * zeta * w * om) * dt; th += om * dt;
    }
    return th;
  }
  function kindAt(t, kinds) { let kind = kinds[0][1]; for (const [tk, k] of kinds) if (t >= tk) kind = k; return kind; }

  function tiltWeight(t, kinds) {
    let w = kindAt(t, kinds) === 'arrow' ? 1 : 0;
    for (let i = 1; i < kinds.length; i++) {
      const tc = kinds[i][0], a = kinds[i - 1][1] === 'arrow', b = kinds[i][1] === 'arrow';
      if (a !== b && Math.abs(t - tc) < 0.15) w = clamp(0.5 + ((b ? 1 : -1) * (t - tc)) / 0.3);
    }
    return w;
  }

  const NIB = '<g transform="translate(3 3) rotate(-30)" stroke="#111" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">'
    + '<path d="M0 0L5.5 9.6Q6.1 10.8 5.6 12L4.6 14.3H-4.6L-5.6 12Q-6.1 10.8 -5.5 9.6Z" fill="#fff"/>'
    + '<rect x="-4.5" y="15.9" width="9" height="3.1" rx="1.2" fill="#fff"/><path d="M0 1.4V7.3" fill="none" stroke-width="1.35"/><circle cx="0" cy="9" r="1.55" fill="#fff" stroke-width="1.35"/></g>';
  const SHAPES = {
    arrow: { w: 21, h: 28, vb: '0 0 24 32', anchor: [2.6, 2.4],
      d: '<path d="M3.2 3.6Q2.9 1.6 4.8 2.4L22 16.6Q23.6 18.2 21.4 18.7L15.4 18.9Q13.2 19 12 20.7L7 27.4Q5.4 29.2 4.6 27Z" fill="#fff" stroke="#111" stroke-width="2.2" stroke-linejoin="round"/>' },
    grab: { w: 24, h: 24, vb: '0 0 26 26', anchor: [8.5, 6],
      d: '<path d="M5.5 11.2V7.8a2.25 2.25 0 0 1 4.5-.6 2.2 2.2 0 0 1 4.4 0 2.2 2.2 0 0 1 4.4.2 2.15 2.15 0 0 1 4.2 1V14c0 5.8-4.4 10-9.8 10S3.2 19.8 3.2 14.2V13a1.9 1.9 0 0 1 2.3-1.8z" fill="#fff" stroke="#111" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 7.2v2.6M14.4 7.2v2.6M18.8 7.4v2.6M5.5 11.2v2.4" stroke="#111" stroke-width="1.7" stroke-linecap="round"/>' },

    blade: { w: 26, h: 26, vb: '0 0 26 26', anchor: [3.2, 9.6],
      d: '<g transform="translate(3.2 9.6) rotate(45)"><rect x="0" y="-7.2" width="21" height="7.2" rx="1.6" fill="#fff" stroke="#111" stroke-width="1.7"/>'
        + '<path d="M4.2 0V-2.4M7.6 0V-3.6M11 0V-2.4" stroke="#111" stroke-width="1.5" stroke-linecap="round"/><circle cx="16.4" cy="-3.2" r="1.25" fill="#111"/></g>' },

    resize: { w: 28, h: 16, vb: '0 0 28 16', anchor: [14, 8],
      d: '<path d="M3 8H25M7.5 3.5L3 8l4.5 4.5M20.5 3.5L25 8l-4.5 4.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M3 8H25M7.5 3.5L3 8l4.5 4.5M20.5 3.5L25 8l-4.5 4.5" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' },
    pen: { w: 26, h: 26, vb: '0 0 26 26', anchor: [3, 3], d: NIB },

    pen_close: { w: 26, h: 26, vb: '0 0 26 26', anchor: [3, 3], d: NIB + '<circle cx="20.6" cy="9" r="2.6" fill="#fff" stroke="#111" stroke-width="1.5"/>' },
  };

  function makeCursor() {
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:999;filter:drop-shadow(0 1px 1.6px rgba(0,0,0,.28))';
    const parts = {};
    for (const k in SHAPES) {
      const s = SHAPES[k], el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.setAttribute('viewBox', s.vb); el.setAttribute('width', s.w); el.setAttribute('height', s.h);
      el.style.cssText = 'position:absolute;left:0;top:0;display:none';
      el.innerHTML = s.d; box.appendChild(el); parts[k] = el;
    }
    document.body.appendChild(box);
    return {

      set({ x, y, kind = 'arrow', tilt = 0, scale = 1, hidden = false }) {
        box.style.display = hidden ? 'none' : '';
        for (const k in parts) parts[k].style.display = k === kind ? '' : 'none';
        const s = SHAPES[kind], [vx, vy] = s.vb.split(' ').slice(2).map(Number);
        const ax = (s.anchor[0] * s.w) / vx, ay = (s.anchor[1] * s.h) / vy;
        box.style.transformOrigin = `${ax}px ${ay}px`;
        box.style.transform = `translate(${x - ax}px, ${y - ay}px) rotate(${tilt}deg) scale(${scale})`;
      },
    };
  }

  function cursorAt(t, { pos, kinds = [[0, 'arrow']], clicks = [] }) {
    const kind = kindAt(t, kinds), [x, y] = pos(t), w = tiltWeight(t, kinds);
    return { x, y, kind, tilt: w > 0 ? w * tiltAt(pos, t) : 0, scale: clickScale(t, clicks) };
  }

  const place = (el, x, y) => { el.style.left = '0px'; el.style.top = '0px'; el.style.transform = `translate(${x}px, ${y}px)`; };

  const ready = document.fonts.ready;

  window.KIT = { clamp, lerp, inOut, EO, EI, smooth, hash, cubicBezier, track, motion, clickScale, tiltAt, makeCursor, cursorAt, kindAt, place, ready };
})();
