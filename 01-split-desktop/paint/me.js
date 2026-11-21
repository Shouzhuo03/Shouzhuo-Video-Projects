(function () {
  const TAU = Math.PI * 2;
  const rgb = h => (Array.isArray(h) ? h : [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, u) => { const p = rgb(a), q = rgb(b); return hex(p.map((v, i) => v + (q[i] - v) * u)); };
  const shade = (a, k) => mix(a, k > 0 ? '#ffffff' : '#000000', Math.abs(k));
  const css = (c, a = 1) => { c = rgb(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

  function ell(cx, cy, rx, ry, n = 28, a0 = 0, a1 = TAU, rot = 0) {
    const o = [], full = Math.abs(a1 - a0) >= TAU - 1e-6, cr = Math.cos(rot), sr = Math.sin(rot);
    for (let k = 0; k < n; k++) {
      const t = a0 + (a1 - a0) * k / (full ? n : n - 1), x = Math.cos(t) * rx, y = Math.sin(t) * ry;
      o.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return o;
  }
  function arc(cx, cy, r, a0, a1, n = 8) { return ell(cx, cy, r, r, n, a0, a1); }
  function rrect(x0, y0, w, h, r = 0, n = 4) {
    if (!r) return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    const x1 = x0 + w, y1 = y0 + h;
    return [].concat(arc(x1 - r, y0 + r, r, -Math.PI / 2, 0, n), arc(x1 - r, y1 - r, r, 0, Math.PI / 2, n), arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, n), arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, n));
  }
  const T = (pts, f) => pts.map(([x, y]) => f(x, y));
  const rot = (pts, a, cx = 0, cy = 0) => T(pts, (x, y) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
  const move = (pts, dx, dy) => T(pts, (x, y) => [x + dx, y + dy]);

  function softCorners(pts, r = 5) {
    const out = [];
    pts.forEach((p, i) => {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const d = Math.min(r, la / 3, lb / 3);
      const u = [p[0] + (a[0] - p[0]) * d / la, p[1] + (a[1] - p[1]) * d / la];
      const v = [p[0] + (b[0] - p[0]) * d / lb, p[1] + (b[1] - p[1]) * d / lb];
      for (let j = 0; j <= 8; j++) { const t = j / 8, s = 1 - t; out.push([s * s * u[0] + 2 * s * t * p[0] + t * t * v[0], s * s * u[1] + 2 * s * t * p[1] + t * t * v[1]]); }
    });
    return out;
  }

  const B = { x0: -56, y0: -60, s: 112, F: 22 };
  const bodyPts = () => { const { x0, y0, s, F } = B, x1 = x0 + s, y1 = y0 + s; return softCorners([[x0, y0], [x1 - F, y0], [x1, y0 + F], [x1, y1], [x0, y1]], 5); };
  const foldPts = () => { const x1 = B.x0 + B.s; return [[x1 - B.F, B.y0], [x1, B.y0 + B.F], [x1 - B.F, B.y0 + B.F]]; };

  function squircle(cx, cy, a, b, n = 4.6, k = 72) {
    const o = [];
    for (let i = 0; i < k; i++) { const t = i / k * TAU, c = Math.cos(t), s = Math.sin(t); o.push([cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]); }
    return o;
  }

  const SHAPES = {
    doc: () => ({ parts: [[bodyPts(), 0, 'body'], [foldPts(), -0.14, 'fold']], clip: bodyPts(), top: -60, bot: 52, half: 56, eyeY: -24, bandR: 22 }),
    squircle: () => { const b = squircle(0, -4, 58, 58); return { parts: [[b, 0, 'body']], clip: b, top: -62, bot: 54, half: 58, eyeY: -22, bandR: 0 }; },
    folder: () => {
      const back = [[-62, -60], [-24, -60], [-16, -50], [62, -50], [62, 52], [-62, 52]], front = rrect(-64, -38, 128, 92, 9, 4);
      return { parts: [[back, -0.2, 'back'], [front, 0, 'body']], clip: front, top: -50, bot: 54, half: 64, eyeY: -10, bandR: 0, bandTop: -38 };
    },
  };

  const LOOKS = {
    plain: { shell: '#FFFFFF', expr: 'calm' },
    work: { shell: '#78848C', expr: 'tired', acc: ['suit', 'tie'] },
    home: { shell: '#C49B6E', expr: 'happy', acc: ['pajamas'] },
    drink: { shell: '#AF795F', expr: 'fake', pose: 'bow', acc: ['dinnerSuit', 'looseTie'] },
    run: { shell: '#8D9A75', expr: 'eager', acc: ['headband', 'runningVest'] },
    fish: { shell: '#B39B6C', expr: 'calm', acc: ['bucketHat'] },
    s1: { shell: '#D4704E', expr: 'happy', acc: ['sweatband', 'jersey'] },
    s2: { shell: '#B57F8A', expr: 'happy', acc: ['partyHat'] },
    s3: { shell: '#807794', expr: 'eager', acc: ['hoodie', 'headset'] },
    s4: { shell: '#ABA18E', expr: 'tired', acc: ['blanket'] },
    s5: { shell: '#AA786C', expr: 'happy', acc: ['stageJacket', 'boomMic'] },
    s6: { shell: '#72938B', expr: 'calm', acc: ['topShades', 'crossbody'] },
    s7: { shell: '#A6825F', expr: 'calm', acc: ['cap', 'leash'] },
  };
  const INK = '#000000', CREAM = '#F7EFDF';

  function build(lookId = 'plain', expr, pose, shape = 'doc') {
    const L = LOOKS[lookId] || LOOKS.plain, shell = L.shell, acc = L.acc || [], P = [];
    expr = expr || L.expr; pose = pose || L.pose || 'stand';
    const fill = (pts, col, role = 'acc', o = {}) => P.push(Object.assign({ k: 'fill', pts, col, role }, o));
    const line = (pts, w, col = INK, role = 'acc', o = {}) => P.push(Object.assign({ k: 'line', pts, w, col, role }, o));
    const has = a => acc.includes(a);
    const eyeCol = INK;

    const G = SHAPES[shape](), clip = G.clip, top = G.top, half = G.half;
    for (const [pts, k, role] of G.parts) fill(pts, role === 'fold' && lookId === 'plain' ? '#E2E5E8' : k ? shade(shell, k) : shell, role, role === 'fold' ? { clip } : {});
    const clothes = (pts, col) => fill(pts, col, 'acc', { clip });
    if (has('suit')) {
      const suit = '#303E4E';
      clothes(rrect(-70, 6, 140, 64), suit);
      clothes([[-8, 6], [8, 6], [5, 52], [-5, 52]], CREAM);
      clothes([[-28, 6], [-8, 6], [-15, 22]], shade(suit, 0.1));
      clothes([[28, 6], [8, 6], [15, 22]], shade(suit, 0.1));
    }
    if (has('dinnerSuit')) {

      clothes(rrect(-70, 6, 140, 64), '#985E53');
      clothes([[-29, 6], [29, 6], [21, 52], [-21, 52]], '#FFFFFF');
      clothes([[-39, 6], [-29, 6], [-21, 38]], '#B57966');
      clothes([[39, 6], [29, 6], [21, 38]], '#B57966');
    }
    if (has('pajamas')) {
      clothes(rrect(-70, 5, 140, 65), '#96B2C1');
      for (let k = -3; k <= 3; k++) clothes(rrect(k * 15 - 0.8, 5, 1.6, 50), '#C9D6D9');
      clothes([[-14, 5], [0, 14], [14, 5]], '#CBD9DF');
    }
    if (has('runningVest')) {
      clothes([[-44, -1], [-29, -5], [-21, 8], [21, 8], [29, -5], [44, -1], [53, 56], [-53, 56]], '#D6A34D');
      line([[-29, -4], [-21, 10], [21, 10], [29, -4]], 3, CREAM);
    }
    if (has('hoodie')) {
      clothes([[-56, 5], [-33, -1], [0, 12], [33, -1], [56, 5], [56, 56], [-56, 56]], '#45445D');
      line([[-29, 3], [0, 17], [29, 3]], 3, '#B8ACBD');
      clothes(rrect(-10, 17, 2, 13), '#B8ACBD'); clothes(rrect(8, 17, 2, 13), '#B8ACBD');
    }
    if (has('stageJacket')) {
      fill([[-56, 1], [-63, 9], [-62, 52], [62, 52], [63, 9], [56, 1]], '#7B4260');
      clothes([[-19, 1], [0, 23], [19, 1], [10, 52], [-10, 52]], '#C0A069');

      for (const x of [-41, -27, 27, 41]) for (const y of [18, 34, 47]) clothes([[x - 1.5, y - 2], [x + 1.5, y], [x + 1.5, y + 3], [x - 1.5, y + 1]], '#C0A069');
    }
    if (has('jersey')) { fill(rrect(-70, 10, 140, 60), '#2E3E5C', 'acc', { clip }); fill(rrect(-70, 10, 140, 3), CREAM, 'acc', { clip }); }

    const ex = 20, ey = G.eyeY, ew = 19, eh = 4.6;
    const bar = (x, y, w = ew, h = eh) => fill(rrect(x - w / 2, y - h / 2, w, h), eyeCol, 'face');
    const chevron = (x, h = 6, w = 18) => line([[x - w / 2, ey + h / 2], [x, ey - h / 2], [x + w / 2, ey + h / 2]], 4.2, eyeCol, 'face');
    for (const side of [-1, 1]) {
      const x = side * ex, start = P.length;
      switch (expr) {
        case 'happy': case 'sing': chevron(x); break;
        case 'eager': bar(x, ey); bar(x, ey, eh, ew); break;
        case 'tired': bar(x, ey - 4.4, ew, 3.8); bar(x, ey + 4.4, ew, 3.8); break;
        case 'panic': line([[x + side * 6, ey - 8], [x - side * 4, ey], [x + side * 6, ey + 8]], 4.2, eyeCol, 'face'); break;
        case 'dizzy':
          for (let k = 0; k < 3; k++) { const a = Math.PI / 6 + k * Math.PI / 3, dx = Math.cos(a) * 10, dy = Math.sin(a) * 10; line([[x - dx, ey - dy], [x + dx, ey + dy]], 3.8, eyeCol, 'face'); }
          break;
        case 'fake': chevron(x, 4, 21); break;
        case 'blank': break;
        default: bar(x, ey);
      }
      for (let i = start; i < P.length; i++) { P[i].glyph = expr; P[i].eye = [x, ey]; }
    }

    if (has('tie')) { clothes([[-3, 9], [3, 9], [4, 39], [0, 45], [-4, 39]], '#873C3C'); }
    if (has('looseTie')) {
      clothes([[7, 15], [14, 12], [18, 18], [10, 22]], '#387F91');
      clothes([[11, 21], [17, 18], [34, 41], [32, 49], [25, 46]], '#387F91');
    }
    const bt = (G.bandTop ?? top) + 10;
    if (has('headband')) {
      fill(rrect(-70, bt, 140 - 14 - G.bandR, 8), '#B34F3C', 'acc', { clip });
      fill([[-54, bt + 2], [-65, bt + 4], [-71, bt + 17], [-59, bt + 11]], '#B34F3C');
    }
    if (has('sweatband')) fill(rrect(-70, bt, 140 - 14 - G.bandR, 7), CREAM, 'acc', { clip });
    if (has('bucketHat')) { fill([[-40, top], [-32, top - 18], [32, top - 18], [40, top]], '#55593F', 'acc'); fill(rrect(-half - 2, top - 2, (half + 2) * 2, 5), '#4A4E36', 'acc'); }
    if (has('partyHat')) {
      fill(rot([[-29, top + 2], [29, top + 2], [0, top - 52]], -0.17, 0, top), '#D3AF53');
      fill(rot([[-26, top - 3], [26, top - 3], [23, top - 9], [-23, top - 9]], -0.17, 0, top), '#F2DBA8');
    }
    if (has('headset')) {
      line([[-61, -20], [-61, -48], [-53, top - 9], [45, top - 9], [61, -48], [61, -20]], 7, '#292936');
      for (const s of [-1, 1]) fill(rrect(s * 61 - 8, -40, 16, 33, 4, 6), '#292936');
    }
    if (has('blanket')) {
      const wrap = '#566D7D';

      fill(softCorners([[-70, 61], [-66, -43], [-57, -69], [-43, -77], [22, -71], [40, -57], [25, -51], [-42, -56], [-50, -31], [-48, 25], [-13, 57]], 3), wrap);
      fill(softCorners([[49, -49], [64, -21], [72, 58], [-24, 58], [24, 29], [51, 7]], 3), wrap);
      line([[-48, -48], [-57, -28], [-59, 32]], 2.5, '#91A5B0');
      line([[-12, 51], [37, 40], [63, 44]], 2.5, '#91A5B0');
    }
    if (has('boomMic')) {
      line([[-59, -17], [-60, -48], [-48, top - 7], [34, top - 7]], 4, '#40323E');
      fill(rrect(-65, -35, 12, 25, 3, 6), '#40323E');
      line([[-59, -14], [-49, 0], [-30, 0]], 3, '#40323E');
      fill(rrect(-32, -3, 9, 6, 2, 6), '#40323E');
    }
    if (has('topShades')) {
      line([[-52, top + 2], [-39, top - 7], [32, top - 7], [47, top + 1]], 3, '#343930');
      for (const x of [-31, 9]) fill(rrect(x, top - 10, 23, 15, 3, 6), '#343930');
      line([[-8, top - 5], [9, top - 5]], 3, '#343930');
    }
    if (has('crossbody')) {
      clothes([[-53, -6], [-46, -11], [53, 43], [53, 51]], '#A3774E');
      clothes(rrect(26, 29, 30, 23, 3, 6), '#A3774E');
      clothes(rrect(31, 31, 20, 2), '#D4BB92');
    }
    if (has('cap')) { fill([[-half, top], [-half + 6, top - 16], [half - 22, top - 16], [half - 16, top]], '#3E5B48', 'acc'); fill(rrect(-half, top - 2, half * 2 + 16, 5), '#34503F', 'acc'); }
    if (has('leash')) line([[-half, 20], [-half - 24, 34], [-half - 44, 52]], 2.4, '#9E3A2E', 'acc');

    const fitted = shape === 'doc' ? P.map(pr => mapPrim(pr, (x, y) => [x * 100 / 112, -4 + (y + 4) * 124 / 112])) : P;
    return pose === 'bow' ? bowFront(fitted, shell) : fitted;
  }
  function mapPrim(pr, f) {
    const q = Object.assign({}, pr);
    if (q.pts) q.pts = T(q.pts, f);
    if (q.clip) q.clip = T(q.clip, f);
    if (q.x !== undefined) [q.x, q.y] = f(q.x, q.y);
    if (q.eye) q.eye = f(q.eye[0], q.eye[1]);
    return q;
  }
  function bowFront(P, shell) {

    const hinge = 7;
    const top = Math.min(...P.find(pr => pr.role === 'body').pts.map(p => p[1]));

    const split = pts => {
      const out = [];
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length]; out.push(a);
        if ((a[1] - hinge) * (b[1] - hinge) < 0) { const t = (hinge - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, hinge]); }
      });
      return out;
    };
    const folded = P.map(pr => {
      const q = Object.assign({}, pr);
      if (q.pts && q.k === 'fill') q.pts = split(q.pts);
      if (q.clip) q.clip = split(q.clip);
      return mapPrim(q, (x, y) => [x * (y < hinge ? 1 - 0.09 * Math.min(1, (hinge - y) / (hinge - top)) : 1), y <= hinge ? hinge + (y - hinge) * 0.44 : y]);
    });
    const clip = folded.find(pr => pr.role === 'body').pts;
    folded.push({ k: 'fill', pts: rrect(-80, hinge - 1, 160, 4), col: shade(shell, -0.22), role: 'crease', clip });
    folded.push({ k: 'fill', pts: rrect(-80, hinge + 3, 160, 1.2), col: shade(shell, 0.3), role: 'crease', clip });
    return folded;
  }

  function path(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
  const off = (pr, pts) => (pr.dx || pr.dy ? move(pts, pr.dx || 0, pr.dy || 0) : pts);
  function penIcon(g, P, o = {}) {
    const z = (() => { const m = g.getTransform(); return Math.hypot(m.a, m.b); })();
    for (const pr of P) {
      if (pr.k === 'fill') {
        const pts = off(pr, pr.pts);
        g.save();
        if (pr.clip) { path(g, pr.clip); g.clip(); }
        if ((pr.role === 'body' || pr.role === 'back') && o.shadow !== false) { g.shadowColor = 'rgba(0,0,0,0.26)'; g.shadowBlur = 8 * z; g.shadowOffsetY = 4 * z; }
        path(g, pts); g.fillStyle = pr.col; g.fill();
        g.restore();
        if (pr.role === 'body') {
          g.save(); path(g, pts); g.lineWidth = 0.75;
          g.strokeStyle = pr.col === '#FFFFFF' ? '#D4D8DC' : shade(pr.col, -0.13); g.stroke(); g.restore();
        }
      } else if (pr.k === 'line') {
        const pts = pr.pts;
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.strokeStyle = pr.col; g.lineWidth = pr.w; g.lineCap = 'butt'; g.lineJoin = 'miter'; g.stroke();
      } else if (pr.k === 'dot') { g.beginPath(); g.arc(pr.x, pr.y, pr.r, 0, TAU); g.fillStyle = pr.col; g.fill(); }
      else if (pr.k === 'ring') { g.beginPath(); g.arc(pr.x, pr.y, pr.r, 0, TAU); g.strokeStyle = pr.col; g.lineWidth = pr.w; g.stroke(); }
      else if (pr.k === 'glow') {
        g.save(); if (pr.clip) { path(g, pr.clip); g.clip(); }
        const gr = g.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.r); gr.addColorStop(0, css(pr.col, 0.35)); gr.addColorStop(1, css(pr.col, 0));
        g.fillStyle = gr; g.fillRect(pr.x - pr.r, pr.y - pr.r, pr.r * 2, pr.r * 2); g.restore();
      }
    }
  }

  function penOil(g, P, o = {}) {
    const O = window.Oil, lt = o.light || { key: [1.0, 0.86, 0.66], keyDir: [-0.6, -0.8], fill: [0.42, 0.44, 0.52] };
    const Lf = (cx, cy, rx, ry) => (x, y) => {
      const nx = Math.max(-1, Math.min(1, (x - cx) / rx)), ny = Math.max(-1, Math.min(1, (y - cy) / ry)), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const kd = lt.keyDir, kl = Math.hypot(kd[0], kd[1], 0.7);
      const lam = Math.max(0, (nx * kd[0] + ny * kd[1] + nz * 0.7) / kl);
      return [0, 1, 2].map(i => lt.fill[i] + lt.key[i] * lam);
    };
    let k = 0;
    for (const pr of P) {
      k++;
      if (pr.role === 'face') { penIcon(g, [pr], { shadow: false }); continue; }
      if (pr.k === 'fill') {
        const pts = off(pr, pr.pts), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 1, ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 1;
        const big = rx * ry > 400, small = rx * ry < 60;
        g.save(); if (pr.clip) { O.path(g, pr.clip); g.clip(); }
        if (pr.role === 'face' && small) { O.path(g, pts); g.fillStyle = pr.col; g.fill(); }
        else O.region(g, pts, { color: pr.col, light: pr.role === 'face' ? () => [0.9, 0.9, 0.9] : Lf(cx, cy, rx * 1.3, ry * 1.3), dir: pr.role === 'body' ? Math.PI / 2 : 0, dj: 0.12,
                                len: big ? [22, 44] : [4, 9], w: big ? [6, 10] : [1.4, 2.4], cover: big ? 1.7 : 2.4, dry: 0.05, a: 0.7, jitter: 0.02, cj: 4, seed: 'me' + k });
        g.restore();
      } else if (pr.k === 'line') O.line(g, pr.pts, { w: pr.w * 1.1, col: rgb(pr.col), a: 0.92, seed: k, nb: 2 });
      else if (pr.k === 'dot') O.stroke(g, [[pr.x - pr.r * 0.6, pr.y], [pr.x + pr.r * 0.6, pr.y + 0.2]], { w: pr.r * 1.9, col: rgb(pr.col), a: 0.95, nb: 2, dry: 0, seed: k });
      else if (pr.k === 'ring') O.line(g, ell(pr.x, pr.y, pr.r, pr.r, 14).concat([[pr.x + pr.r, pr.y]]), { w: pr.w, col: rgb(pr.col), a: 0.9, seed: k });
      else if (pr.k === 'glow') O.glaze(g, ell(pr.x, pr.y, pr.r, pr.r, 20), 'rgba(190,227,255,1)', 0.35, 'screen', 4);
    }
  }

  function brushLine(g, pts, w, col, seed, closed = false) {
    const Q = closed ? pts.concat([pts[0]]) : pts;
    for (let i = 1; i < Q.length; i++) {
      const [x0, y0] = Q[i - 1], [x1, y1] = Q[i], u = i / Q.length;
      const pw = w * (0.6 + 0.7 * Math.abs(Math.sin(u * 5.3 + seed)) * (0.7 + 0.3 * hash(i, seed)));
      if (hash(i, seed, 3) < 0.05) continue;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = pw; g.lineCap = 'round'; g.strokeStyle = css(col, 0.88); g.stroke();
    }
  }
  function penInk(g, P, o = {}) {
    let k = 0;
    for (const pr of P) {
      k++;
      if (pr.role === 'face') { penIcon(g, [pr], { shadow: false }); continue; }
      if (pr.k === 'fill') {
        const pts = off(pr, pr.pts);
        g.save(); if (pr.clip) { path(g, pr.clip); g.clip(); }
        const wash = pr.role === 'face' ? pr.col : mix(pr.col, '#FFFFFF', 0.12);
        g.save(); g.translate(1.6, 1.2); path(g, pts); g.fillStyle = css(wash, pr.role === 'face' ? 0.95 : 0.55); g.fill(); g.restore();
        if (pr.role !== 'face') { path(g, pts); g.fillStyle = css(wash, 0.18); g.fill(); }
        g.restore();
        if (pr.outline || pr.role === 'body') brushLine(g, pts, pr.role === 'body' ? 3.2 : 2, '#2A2522', k * 1.7, true);
      } else if (pr.k === 'line') brushLine(g, pr.pts, pr.w * 1.05, pr.col, k);
      else if (pr.k === 'dot') { g.beginPath(); g.arc(pr.x, pr.y, pr.r * 1.05, 0, TAU); g.fillStyle = css(pr.col, 0.92); g.fill(); }
      else if (pr.k === 'ring') brushLine(g, ell(pr.x, pr.y, pr.r, pr.r, 12), pr.w, pr.col, k, true);
    }
  }

  const RISO = { blue: '#3255A4', pink: '#FF48B0', yellow: '#FFE800' };
  function spotFor(pr) {
    const [r, g, b] = rgb(pr.col);
    if (Math.min(r, g, b) > 205) return null;
    if (pr.role === 'fold') return 'yellow';
    if ((r + g + b) / 3 < 110) return 'blue';
    if (r > g * 1.13 && r > b * 0.98) return 'pink';
    if (r > b * 1.2 && g > b * 1.15) return 'yellow';
    return 'blue';
  }
  function penRiso(g, P, o = {}) {
    const m = g.getTransform(), z = Math.max(0.01, Math.hypot(m.a, m.b)), S = 280, px = Math.ceil(S * z), sc = px / S;
    const plate = () => { const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, px / 2, px / 2); return { c, x }; };
    const plates = { blue: plate(), pink: plate(), yellow: plate() };
    const faces = [];
    const each = fn => Object.entries(plates).forEach(([key, p]) => fn(key, p.x));
    function coarseTransition(pr) {
      if (!['body', 'fold'].includes(pr.role)) return;
      const xs = pr.pts.map(p => p[0]), ys = pr.pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const cy = pr.role === 'body' ? y0 + (y1 - y0) * 0.58 : y1 - 3;
      const x = plates.blue.x;
      x.save(); if (pr.clip) { path(x, pr.clip); x.clip(); } path(x, pr.pts); x.clip();
      x.fillStyle = '#000';

      for (let row = 0; row < 2; row++) for (let cx = x0 + 3 + row * 3; cx < x1; cx += 6) {
        x.beginPath(); x.arc(cx, cy - 5 + row * 5, row ? 1.65 : 1.05, 0, TAU); x.fill();
      }
      x.restore();
    }
    for (const pr of P) {
      if (pr.role === 'face') { faces.push(pr); continue; }
      if (pr.k === 'fill') {

        each((key, x) => { x.save(); if (pr.clip) { path(x, pr.clip); x.clip(); } path(x, off(pr, pr.pts)); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(); x.restore(); });
        const key = spotFor(pr);
        if (key) { const x = plates[key].x; x.save(); if (pr.clip) { path(x, pr.clip); x.clip(); } path(x, off(pr, pr.pts)); x.fillStyle = '#000'; x.fill(); x.restore(); }
        if (key) coarseTransition(pr);
      } else if (pr.k === 'line' || pr.k === 'ring' || pr.k === 'dot') {
        const x = plates[spotFor(pr) || 'blue'].x; penIcon(x, [pr], { shadow: false });
      }
    }

    const reg = { yellow: [0.8, 0], pink: [0, -0.8], blue: [-1, 0.8] };
    for (const key of ['yellow', 'pink', 'blue']) {
      const { c, x } = plates[key];
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = RISO[key]; x.fillRect(0, 0, px, px); x.restore();
      g.drawImage(c, -S / 2 + reg[key][0] / z, -S / 2 + reg[key][1] / z, S, S);
    }
    penIcon(g, faces, { shadow: false });
  }

  function penPixel(g, P, o = {}) {
    const N = o.n || 32, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'); x.setTransform(N / 150, 0, 0, N / 150, N / 2, N / 2 + 1);
    x.imageSmoothingEnabled = false;
    penIcon(x, P.filter(p => p.k !== 'glow' && p.role !== 'face'), { shadow: false });

    const snap = pts => pts.map(([px, py]) => [Math.round(px * N / 150 + N / 2), Math.round(py * N / 150 + N / 2 + 1)]);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000000';

    const patterns = {
      calm: ['11111'], happy: ['00100', '01010', '10001'],
      eager: ['00100', '00100', '11111', '00100', '00100'],
      tired: ['11111', '00000', '11111'],
      dizzy: ['00100', '10101', '01110', '10101', '00100'],
      fake: ['01110', '10001'], sing: ['00100', '01010', '10001']
    };
    const seen = new Set(), unit = Math.max(1, Math.round(N / 32));
    for (const pr of P.filter(p => p.role === 'face')) {
      const id = pr.eye.join(','); if (seen.has(id)) continue; seen.add(id);
      const center = snap([pr.eye])[0];
      const pattern = pr.glyph === 'panic' ? (pr.eye[0] < 0 ? ['100','010','001','010','100'] : ['001','010','100','010','001']) : patterns[pr.glyph] || patterns.calm;
      const ox = center[0] - Math.floor(pattern[0].length / 2) * unit, oy = center[1] - Math.floor(pattern.length / 2) * unit;
      pattern.forEach((row, j) => Array.from(row).forEach((bit, i) => { if (bit === '1') x.fillRect(ox + i * unit, oy + j * unit, unit, unit); }));
    }
    x.restore();
    const id = x.getImageData(0, 0, N, N);
    for (let i = 0; i < id.data.length; i += 4) {
      for (let j = 0; j < 3; j++) id.data[i + j] = Math.round(id.data[i + j] / 51) * 51;
      id.data[i + 3] = id.data[i + 3] > 110 ? 255 : 0;
    }
    x.putImageData(id, 0, 0);
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, -75, -74, 150, 150); g.restore();
  }

  const CLASSIC_COLORS = {
    '#78848C':'#7F91A3', '#C49B6E':'#BCA67B', '#AF795F':'#AA7C70', '#8D9A75':'#98AA7F',
    '#B39B6C':'#B9AC79', '#D4704E':'#B97865', '#B57F8A':'#B79B9E', '#807794':'#9A94B0',
    '#ABA18E':'#B8B6A2', '#AA786C':'#A98887', '#72938B':'#7FA49F', '#A6825F':'#A99578',
    '#303E4E':'#485361', '#96B2C1':'#93ACBC', '#985E53':'#91685F', '#387F91':'#527E91',
    '#D6A34D':'#BEAB70', '#B34F3C':'#9E6B5D', '#55593F':'#697858', '#4A4E36':'#53634A',
    '#2E3E5C':'#52617D', '#D3AF53':'#BEAE66', '#F2DBA8':'#E3D8AD', '#45445D':'#62677C',
    '#292936':'#414650', '#566D7D':'#7D8F96', '#91A5B0':'#BBC5C5', '#7B4260':'#8D7489',
    '#C0A069':'#B9AD7F', '#40323E':'#4C4852', '#343930':'#454F48', '#A3774E':'#AD9475',
    '#3E5B48':'#687E74', '#34503F':'#4D655C', '#9E3A2E':'#986D62',
    '#873C3C':'#946D70', '#B57966':'#B18D7D', '#B8ACBD':'#C2BDCC', '#D4BB92':'#C8BA9B'
  };
  const classicColor = col => {
    if (CLASSIC_COLORS[col]) return CLASSIC_COLORS[col];
    const c = rgb(col), gray = c[0]*0.3+c[1]*0.59+c[2]*0.11;
    return hex(c.map(v=>v*0.84+gray*0.16)).toUpperCase();
  };
  const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const classicCache = new Map();
  function insidePixel(x, y, pts) {
    let hit = false;
    for (let i=0,j=pts.length-1;i<pts.length;j=i++) {
      const a=pts[i], b=pts[j];
      if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
    }
    return hit;
  }
  function classicSprite(P, N) {
    const S=224, X0=-112, Y0=-140, step=S/N;
    const ids=new Int16Array(N*N);ids.fill(-1);
    const materials=[];
    const pos=(x,y)=>[X0+(x+0.5)*step,Y0+(y+0.5)*step];
    const extent=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];};

    P.filter(pr=>pr.role!=='face'&&pr.k!=='glow').forEach(pr=>{
      const pts=pr.pts?off(pr,pr.pts):null;
      const box=pts?extent(pts):[pr.x-pr.r,pr.y-pr.r,pr.x+pr.r,pr.y+pr.r];
      const col=pr.role==='fold'?'#C5CBD0':classicColor(pr.col);
      const id=materials.length;materials.push({pr,box,col,outline:false});
      const pad=pr.k==='line'?(pr.w||1)/2:0;
      const xa=Math.max(0,Math.floor((box[0]-pad-X0)/step)),xb=Math.min(N-1,Math.ceil((box[2]+pad-X0)/step));
      const ya=Math.max(0,Math.floor((box[1]-pad-Y0)/step)),yb=Math.min(N-1,Math.ceil((box[3]+pad-Y0)/step));
      for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){
        const [px,py]=pos(x,y);if(pr.clip&&!insidePixel(px,py,pr.clip))continue;
        let hit=false;
        if(pr.k==='fill')hit=insidePixel(px,py,pts);
        else if(pr.k==='dot'||pr.k==='ring') {const d=Math.hypot(px-pr.x,py-pr.y);hit=pr.k==='dot'?d<=pr.r:Math.abs(d-pr.r)<=Math.max(pr.w||1,step)/2;}
        else if(pr.k==='line')for(let i=1;i<pts.length&&!hit;i++){
          const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1];
          const t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1)));
          hit=Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy)<=Math.max(pr.w,step*0.9)/2;
        }
        if(hit)ids[y*N+x]=id;
      }
    });
    const idAt=(x,y)=>x<0||y<0||x>=N||y>=N?-1:ids[y*N+x];

    for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){
      const id=idAt(x,y);if(id<0)continue;
      if([[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>idAt(x+dx,y+dy)===id))materials[id].outline=true;
    }
    const c=document.createElement('canvas');c.width=c.height=N;
    const ctx=c.getContext('2d'),im=ctx.createImageData(N,N),out=im.data;
    const put=(x,y,col)=>{if(x<0||y<0||x>=N||y>=N)return;const i=(y*N+x)*4;out[i]=col[0];out[i+1]=col[1];out[i+2]=col[2];out[i+3]=255;};

    for(let y=0;y<N-1;y++)for(let x=0;x<N-1;x++)if(idAt(x,y)>=0&&idAt(x+1,y+1)<0)put(x+1,y+1,[0,0,0]);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const id=idAt(x,y);if(id<0)continue;
      const m=materials[id],pr=m.pr,adj=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>idAt(x+dx,y+dy));
      const silhouette=adj.some(j=>j<0),edge=m.outline&&pr.k==='fill'&&!['body','back','fold'].includes(pr.role)&&adj.some(j=>j!==id);
      const foldCrease=pr.role==='fold'&&(idAt(x-1,y)!==id||idAt(x,y+1)!==id);
      if(silhouette||edge){put(x,y,[0,0,0]);continue;}
      if(foldCrease){put(x,y,[75,83,91]);continue;}
      const [px,py]=pos(x,y),b=m.box;
      const u=(px-b[0])/Math.max(step,b[2]-b[0]),v=(py-b[1])/Math.max(step,b[3]-b[1]),light=u*0.42+v*0.58;
      const white=m.col==='#FFFFFF',base=white?'#F4F5F2':m.col;
      const hi=white?'#FFFFFF':shade(base,0.17),lo=white?'#C9CED1':shade(base,-0.19);
      const threshold=(BAYER4[(y%4)*4+x%4]+0.5)/16;
      let color=base;
      if(light<0.22)color=hi;
      else if(light<0.34)color=threshold<(light-0.22)/0.12?base:hi;
      else if(light>0.84)color=lo;
      else if(light>0.71)color=threshold<(light-0.71)/0.13?lo:base;
      put(x,y,rgb(color));
    }

    const wide=N>=48,patterns=wide?{
      calm:['11111'],happy:['00100','01010','10001'],eager:['00100','00100','11111','00100','00100'],
      tired:['11111','00000','11111'],dizzy:['00100','10101','01110','10101','00100'],fake:['01110','10001']
    }:{calm:['111'],happy:['010','101'],eager:['010','111','010'],tired:['111','000','111'],dizzy:['010','101','111','101','010'],fake:['111','101']};
    const seen=new Set();
    for(const pr of P.filter(p=>p.role==='face')){
      const key=pr.eye.join(',');if(seen.has(key))continue;seen.add(key);
      const pattern=pr.glyph==='panic'?(pr.eye[0]<0?(wide?['100','010','001','010','100']:['10','01','10']):(wide?['001','010','100','010','001']:['01','10','01'])):patterns[pr.glyph]||patterns.happy;
      const cx=Math.floor((pr.eye[0]-X0)/step),cy=Math.floor((pr.eye[1]-Y0)/step);
      const ox=cx-Math.floor(pattern[0].length/2),oy=cy-Math.floor(pattern.length/2);
      pattern.forEach((row,j)=>Array.from(row).forEach((bit,i)=>{if(bit==='1')put(ox+i,oy+j,[0,0,0]);}));
    }
    ctx.putImageData(im,0,0);return c;
  }
  function penClassic(g,P,o={}) {
    const N=o.n===32?32:48,key=N+'|'+JSON.stringify(P);
    let c=classicCache.get(key);
    if(!c){c=classicSprite(P,N);if(classicCache.size>=256)classicCache.clear();classicCache.set(key,c);}
    g.save();g.imageSmoothingEnabled=false;g.drawImage(c,-112,-140,224,224);g.restore();
  }

  const PENS = { classic: penClassic, icon: penIcon, oil: penOil, ink: penInk, riso: penRiso, pixel: penPixel };

  function draw(g, o) {
    const P = build(o.look || 'plain', o.expr, o.pose, o.shape || 'doc');
    g.save(); g.translate(o.x || 0, o.y || 0); g.scale(o.scale || 1, o.scale || 1);
    (PENS[o.style || 'classic'])(g, P, o);
    g.restore();
  }

  window.DeskMe = { draw, build, LOOKS, PENS };
})();
