const { clamp, lerp, motion, cursorAt, makeCursor, cubicBezier, place } = KIT;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const cursor = makeCursor();

const KEYS = [[0, 1], [420, 0], [760, 0.42], [1000, 0], [1110, 0.1], [1200, 0]];
const FALL = [0.5, 0, 0.92, 0.55], RISE_SOFT = [0.2, 0.3, 0.58, 1], RISE_SHARP = [0.3, 0.92, 0.58, 1];
const RISE2_SOFT = [0.12, 0.7, 0.5, 1], RISE2_SHARP = [0.2, 0.95, 0.5, 1];
function segEase(i, rise1, rise2 = RISE2_SOFT) { return i % 2 === 0 ? FALL : i === 1 ? rise1 : rise2; }
function heightAt(ms, rise1, rise2 = RISE2_SOFT) {
  ms = clamp(ms, 0, 1200);
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [t0, v0] = KEYS[i], [t1, v1] = KEYS[i + 1];
    if (ms <= t1) { const e = segEase(i, rise1, rise2); return lerp(v0, v1, cubicBezier(...e)((ms - t0) / (t1 - t0))); }
  }
  return 0;
}

const P = { x0: 50, x1: 650, y1: 30, y0: 330 };
const px = (ms) => P.x0 + (ms / 1200) * (P.x1 - P.x0), py = (v) => P.y0 - v * (P.y0 - P.y1);
function plotRect() { return document.getElementById('plot').getBoundingClientRect(); }

function riseHandle(e, index = 1) {
  const r = plotRect(), [t0, v0] = KEYS[index], [t1, v1] = KEYS[index + 1];
  return [r.left + px(t0 + e[0] * (t1 - t0)), r.top + py(v0 + e[1] * (v1 - v0))];
}
function riseFromScreen(x, y, index = 1) {
  const r = plotRect(), [t0, v0] = KEYS[index], [t1, v1] = KEYS[index + 1];
  return [(((x - r.left - P.x0) / (P.x1 - P.x0)) * 1200 - t0) / (t1 - t0), ((P.y0 - (y - r.top)) / (P.y0 - P.y1) - v0) / (v1 - v0)];
}

const G = { S: 328, L: 40, B: 368 };
const gx = (x) => G.L + x * G.S, gy = (y) => G.B - y * G.S;
function graphRect() { return document.getElementById('graph').getBoundingClientRect(); }
const toScreen = (p) => { const r = graphRect(); return [r.left + gx(p[0]), r.top + gy(p[1])]; };
const fromScreen = (x, y) => { const r = graphRect(); return [(x - r.left - G.L) / G.S, (G.B - (y - r.top)) / G.S]; };
const bz = (t, a, b) => { const u = 1 - t; return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t; };

function curveBase(g, X, Y) {
  for (const y of [0, 1]) el('line', { x1: X(0), y1: Y(y), x2: X(1), y2: Y(y), stroke: '#ababab', 'stroke-width': 2 }, g);
}

function curveLine(g, pts) {
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('');
  el('path', { d, stroke: '#151515', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
}
const bezPts = (e) => { const out = []; for (let i = 0; i <= 120; i++) { const t = i / 120; out.push([gx(bz(t, e[0], e[2])), gy(bz(t, e[1], e[3]))]); } return out; };

function easeGrid(g) {
  for (let k = 0; k <= 8; k++) {
    if (k === 0 || k === 8) continue;
    const c = k % 2 ? '#e9e9e9' : '#dedede', v = k / 8;
    el('line', { x1: gx(v), y1: gy(0), x2: gx(v), y2: gy(1), stroke: c, 'stroke-width': 1 }, g);
    el('line', { x1: gx(0), y1: gy(v), x2: gx(1), y2: gy(v), stroke: c, 'stroke-width': 1 }, g);
  }
  for (const v of [0, 1]) el('line', { x1: gx(v), y1: gy(0), x2: gx(v), y2: gy(1), stroke: '#dedede', 'stroke-width': 1 }, g);
}
function drawEasing(e, grid = true) {
  const g = document.getElementById('graph'); g.innerHTML = '';
  const p1 = [e[0], e[1]], p2 = [e[2], e[3]];
  if (grid) easeGrid(g);
  curveBase(g, gx, gy);
  curveLine(g, bezPts(e), gx, gy);
  for (const [a, p] of [[[0, 0], p1], [[1, 1], p2]]) {
    el('line', { x1: gx(a[0]), y1: gy(a[1]), x2: gx(p[0]), y2: gy(p[1]), stroke: 'var(--hb)', 'stroke-width': 2 }, g);
    el('circle', { cx: gx(p[0]), cy: gy(p[1]), r: 6.5, fill: '#fff', stroke: 'var(--hb)', 'stroke-width': 2.4 }, g);
  }
  document.getElementById('vals').textContent = e.map((v) => v.toFixed(2)).join(', ');
}

const SG = { S: 300, L: 54, B: 356 };
function springY(t, b) { const z = 1 - 0.92 * b, w = 11, wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t)); }
function drawSpring(b, dur) {
  const g = document.getElementById('graph'); g.innerHTML = '';
  const X = (x) => SG.L + x * SG.S, Y = (y) => SG.B - y * SG.S;
  curveBase(g, X, Y);
  const line = (bb) => { const out = []; for (let i = 0; i <= 240; i++) { const t = i / 240; out.push([X(t), Y(springY(t, bb))]); } return out; };
  curveLine(g, line(b), X, Y);
  const tw = 300;
  for (const [k, v] of [['B', b], ['D', dur / 1.6]]) {
    document.getElementById('fill' + k).style.transform = `scaleX(${(v * tw) / 100})`;
    place(document.getElementById('kn' + k), v * tw, 0);
  }
  document.getElementById('numB').textContent = b.toFixed(2); document.getElementById('numD').textContent = dur.toFixed(2);
}

function drawPlot(rise1, ms, hot, selected = 1, rise2 = RISE2_SOFT) {
  const s = document.getElementById('plot'); s.innerHTML = '';
  for (let m = 0; m <= 1600; m += 100) {
    el('line', { x1: px(m), y1: 0, x2: px(m), y2: 556, stroke: m % 200 ? '#f4f4f4' : '#ececec' }, s);
    if (m % 200 === 0) { const t = el('text', { x: px(m), y: 18, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#666', 'font-family': 'Inter' }, s); t.textContent = m; }
  }
  for (const v of [-0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: P.x0, y1: py(v), x2: px(1600), y2: py(v), stroke: '#f0f0f0' }, s);
    const t = el('text', { x: 10, y: py(v) + 4, 'font-size': 10.5, fill: '#aaa', 'font-family': 'JetBrains Mono' }, s); t.textContent = Math.round(v * 240);
  }

  let d = '';
  for (let m = 0; m <= 1200; m += 6) { const h = heightAt(m, rise1, rise2), sq = 1 - 0.2 * clamp(1 - h / 0.05); d += (m ? 'L' : 'M') + px(m).toFixed(1) + ' ' + (py(0.55) - (sq - 0.9) * 600).toFixed(1); }
  el('path', { d, stroke: '#2fae79', 'stroke-width': 1.4, fill: 'none', opacity: 0.55 }, s);

  d = '';
  for (let m = 0; m <= 1200; m += 3) d += (m ? 'L' : 'M') + px(m).toFixed(1) + ' ' + py(heightAt(m, rise1, rise2)).toFixed(1);
  el('path', { d, stroke: '#ef5b5f', 'stroke-width': 1.9, fill: 'none' }, s);

  const [t0, v0] = KEYS[selected], [t1, v1] = KEYS[selected + 1], ease = segEase(selected, rise1, rise2);
  const hx = px(t0 + ease[0] * (t1 - t0)), hy = py(v0 + ease[1] * (v1 - v0));
  el('line', { x1: px(t0), y1: py(v0), x2: hx, y2: hy, stroke: '#0d99ff', 'stroke-width': 1.3 }, s);
  el('circle', { cx: hx, cy: hy, r: 5.5, fill: '#fff', stroke: '#0d99ff', 'stroke-width': 2 }, s);
  KEYS.forEach(([m, v]) => {
    const on = m === t0;
    el('rect', { x: px(m) - 5, y: py(v) - 5, width: 10, height: 10, rx: 2, fill: on ? '#0d99ff' : '#fff', stroke: on ? '#0d99ff' : '#ef5b5f', 'stroke-width': 1.5 }, s);
  });

  el('line', { x1: px(ms), y1: 0, x2: px(ms), y2: 556, stroke: '#0d99ff', 'stroke-width': 1.2 }, s);
  el('path', { d: `M${px(ms) - 7} 2h14v9l-7 6-7-6z`, fill: '#0d99ff' }, s);
  document.getElementById('now').textContent = String(Math.round(ms)).padStart(4, '0');
}

function drawScene(rise1, ms, rise2 = RISE2_SOFT) {
  const s = document.getElementById('scene'); s.innerHTML = '';
  const floor = 262, r = 26, X = (m) => 70 + (m / 1200) * 470, Y = (m) => floor - r - heightAt(m, rise1, rise2) * 190;
  el('line', { x1: 40, y1: floor, x2: 580, y2: floor, stroke: '#d9d9d9', 'stroke-width': 2 }, s);
  let d = ''; for (let m = 0; m <= 1200; m += 10) d += (m ? 'L' : 'M') + X(m).toFixed(1) + ' ' + Y(m).toFixed(1);
  el('path', { d, stroke: '#0d99ff', 'stroke-width': 1.3, 'stroke-dasharray': '2 5', fill: 'none', 'stroke-linecap': 'round' }, s);
  const h = heightAt(ms, rise1, rise2), sq = 1 - 0.2 * clamp(1 - h / 0.05);
  el('ellipse', { cx: X(ms), cy: floor - r * sq, rx: r / sq, ry: r * sq, fill: '#ff6b4a' }, s);
}

const KV = { x0: 170, x1: 820, rows: [['位置 Y', '#ef5b5f', [0, 420, 760, 1000, 1110, 1200]], ['缩放', '#2fae79', [380, 420, 470, 960, 1000, 1040]], ['旋转', '#8a6cf0', [0, 600, 1200]], ['不透明度', '#e8a03a', [0, 120]]], y0: 120, dy: 52 };
const kx = (ms) => KV.x0 + (ms / 1200) * (KV.x1 - KV.x0), ky = (i) => KV.y0 + i * KV.dy;
function keyScreen() { const r = plotRect(); return [r.left + kx(420), r.top + ky(0)]; }
function drawKeys(sel, ms) {
  const s = document.getElementById('plot'); s.innerHTML = '';
  for (let m = 0; m <= 1200; m += 100) {
    el('line', { x1: kx(m), y1: 26, x2: kx(m), y2: 556, stroke: m % 200 ? '#f6f6f6' : '#eeeeee' }, s);
    if (m % 200 === 0) { const t = el('text', { x: kx(m), y: 18, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#666', 'font-family': 'Inter' }, s); t.textContent = m; }
  }
  KV.rows.forEach(([name, col, keys], i) => {
    const y = ky(i);
    el('rect', { x: 0, y: y - 20, width: 864, height: 40, fill: i % 2 ? '#fff' : '#fafafa' }, s);
    el('rect', { x: 18, y: y - 4.5, width: 9, height: 9, rx: 2, fill: col }, s);
    const t = el('text', { x: 36, y: y + 4.5, 'font-size': 13, fill: '#333', 'font-family': 'Inter, Noto Sans SC' }, s); t.textContent = name;
    el('line', { x1: kx(keys[0]), y1: y, x2: kx(keys[keys.length - 1]), y2: y, stroke: '#d6d6d6', 'stroke-width': 2 }, s);
    keys.forEach((m) => {
      const on = sel && i === 0 && m === 420, x = kx(m);
      el('path', { d: `M${x} ${y - 7.5}L${x + 7.5} ${y}L${x} ${y + 7.5}L${x - 7.5} ${y}Z`, fill: on ? '#0d99ff' : '#fff', stroke: on ? '#0d99ff' : '#6b6b6b', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s);
    });
  });
  el('line', { x1: kx(ms), y1: 0, x2: kx(ms), y2: 556, stroke: '#0d99ff', 'stroke-width': 1.2 }, s);
  el('path', { d: `M${kx(ms) - 7} 2h14v9l-7 6-7-6z`, fill: '#0d99ff' }, s);
  document.getElementById('now').textContent = String(Math.round(ms)).padStart(4, '0');
}

const P1 = [0.13, 0.49], P2S = [0.67, 0.4], P2M = [0.75, 0.3], P2E = [0.83, 0.21];
const Q2 = [0.25, 1], Q1S = [0.36, 0.3], Q1M = [0.48, 0.17], Q1E = [0.62, 0.02], EASE2 = { release: 2.4 };
const DIAMOND = { click: 1.15 }, EASE = { release: 3.2 }, GRAPH = { grab: 1.0, release: 3.3 }, SPRING = { grab: 0.95, release: 3.35, b0: 0.3, b1: 0.56 };
const GRAPH2 = { stop: 0.7, resume: 1.0, end: 2.126 };
const PERF = {};
function perf(act) {
  if (PERF[act]) return PERF[act];
  if (act === 'graph2') {
    const [ax, ay] = riseHandle(RISE2_SOFT, 3), [bx, by] = riseHandle(RISE2_SHARP, 3);
    const length = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / length, dy = (by - ay) / length;

    return (PERF[act] = { pos: motion([[0, ax, ay], [GRAPH2.stop, ax + dx * 12, ay + dy * 12, 'out'],
      [GRAPH2.resume, ax + dx * 12, ay + dy * 12, 'hold'], [GRAPH2.end, ax + dx * 60, ay + dy * 60, 'in']]), kinds: [[0, 'grab']] });
  }
  if (act === 'graph') {
    const [ax, ay] = riseHandle(RISE_SOFT), [bx, by] = riseHandle(RISE_SHARP);
    return (PERF[act] = { pos: motion([[0, ax - 20, ay + 2], [0.85, ax, ay, 'out'], [1.0, ax, ay, 'hold'], [3.25, bx, by], [3.35, bx, by, 'hold'], [4.25, bx + 20, by + 2, 'in']]),
      kinds: [[0, 'arrow'], [GRAPH.grab, 'grab'], [GRAPH.release, 'arrow']] });
  }
  if (act === 'diamond') {
    const [x, y] = keyScreen();
    return (PERF[act] = { pos: motion([[0, x - 30, y + 15], [1.05, x + 1, y + 1, 'out'], [1.55, x + 1, y + 1, 'hold'], [3.2, x + 70, y + 20, 'in']]), kinds: [[0, 'arrow']], clicks: [DIAMOND.click] });
  }
  if (act === 'ease2') {
    const [sx, sy] = toScreen(Q1S), [mx, my] = toScreen(Q1M), [ex, ey] = toScreen(Q1E);
    return (PERF[act] = { pos: motion([[0, sx, sy], [0.9, mx, my, 'out'], [1.15, mx, my, 'hold'], [EASE2.release, ex, ey, 'in']]), kinds: [[-9, 'grab'], [EASE2.release, 'arrow']] });
  }
  if (act === 'spring') {
    const r = document.getElementById('trB').getBoundingClientRect(), K = (v) => [r.left + v * 300, r.top + 13];
    const [ax, ay] = K(SPRING.b0), [bx, by] = K(SPRING.b1);
    return (PERF[act] = { pos: motion([[0, ax - 20, ay + 2], [0.8, ax, ay, 'out'], [SPRING.grab, ax, ay, 'hold'], [3.3, bx, by], [3.4, bx, by, 'hold'], [4.25, bx + 20, by + 1, 'in']]),
      kinds: [[0, 'arrow'], [SPRING.grab, 'grab'], [SPRING.release, 'arrow']] });
  }
  const [sx, sy] = toScreen(P2S), [mx, my] = toScreen(P2M), [ex, ey] = toScreen(P2E);
  return (PERF[act] = { pos: motion([[0, sx, sy], [0.85, mx, my, 'out'], [1.15, mx, my, 'hold'], [3.15, ex, ey], [3.3, ex, ey, 'hold'], [4.4, ex + 22, ey + 4, 'in']]),
    kinds: [[-9, 'grab'], [EASE.release, 'arrow']] });
}
function renderAt(act, t) {
  document.body.classList.toggle('spring', act === 'spring');
  document.getElementById('tabC').classList.toggle('on', act !== 'spring'); document.getElementById('tabS').classList.toggle('on', act === 'spring');
  document.getElementById('ddname').textContent = act === 'spring' ? '弹簧' : '自定义贝塞尔';
  document.getElementById('tabK').classList.toggle('on', act === 'diamond'); document.getElementById('tabG').classList.toggle('on', act !== 'diamond');
  if (act === 'climb') {
    drawEasing([...P1, ...P2E], false); drawPlot(RISE_SOFT, 546, false); drawScene(RISE_SOFT, 546);
    cursor.set({ x: 0, y: 0, hidden: true });
    return;
  }
  const Pf = perf(act), c = cursorAt(t, Pf);
  if (act === 'diamond') {
    drawKeys(t >= DIAMOND.click, 980 + t * 6); drawScene(RISE_SHARP, 980); drawEasing([0.3, 0.92, 0.58, 1]);
  } else if (act === 'ease2') {
    const p1 = fromScreen(...Pf.pos(Math.min(t, EASE2.release)));
    drawEasing([...p1, ...Q2]); drawPlot(RISE_SHARP, 700 + t * 6, false); drawScene(RISE_SHARP, 700);
  } else if (act === 'graph2') {
    const h = riseFromScreen(...Pf.pos(t), 3), rise2 = [...h, 0.5, 1], ms = 1040 + t * 6;
    drawPlot(RISE_SHARP, ms, true, 3, rise2); drawScene(RISE_SHARP, ms, rise2); drawEasing(rise2);
  } else if (act === 'graph') {

    const h = t < GRAPH.grab ? RISE_SOFT.slice(0, 2) : riseFromScreen(...Pf.pos(Math.min(t, GRAPH.release)));
    const rise1 = [h[0], h[1], 0.58, 1], ms = 880 + t * 6;
    drawPlot(rise1, ms, t > GRAPH.grab - 0.3 && t < GRAPH.release + 0.4); drawScene(rise1, ms); drawEasing(rise1);
  } else if (act === 'spring') {
    const [kx] = Pf.pos(clamp(t, SPRING.grab, SPRING.release)), r = document.getElementById('trB').getBoundingClientRect();
    drawSpring((kx - r.left) / 300, 0.8); document.getElementById('knB').classList.toggle('hot', t > SPRING.grab - 0.3 && t < SPRING.release + 0.4);
    drawPlot(RISE_SHARP, 620 + t * 6, false); drawScene(RISE_SHARP, 620);
  } else {

    const p2 = t < EASE.release ? fromScreen(...Pf.pos(t)) : P2E;
    drawEasing([...P1, ...p2]);
    drawPlot(RISE_SOFT, 520 + t * 6, false); drawScene(RISE_SOFT, 520);
  }
  cursor.set(c);
}

function focusAt(act, t, look) {
  if (look === 'key') return keyScreen();
  if (look === 'curve') return toScreen([0.5, 0.5]);
  if (look === 'spring') { const r = graphRect(); return [r.left + SG.L + 0.5 * SG.S, r.top + 215]; }
  if (look === 'rise') { const r = plotRect(); return [r.left + px(600), r.top + py(0.3)]; }
  if (act === 'climb') return toScreen([0.5, 0.5]);
  return perf(act).pos(t);
}
window.focusAt = focusAt;
window.easeToScreen = toScreen;
window.EASE_FINAL = [...P1, ...P2E];
window.hero = (act) => focusAt(act, 0);
window.ready = KIT.ready;
window.renderAt = renderAt;
