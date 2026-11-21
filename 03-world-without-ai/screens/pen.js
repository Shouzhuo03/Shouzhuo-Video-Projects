const { clamp, lerp, motion, cursorAt, makeCursor } = KIT;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const cursor = makeCursor();

const S = 0.62, BL = 600, OX = { o: 60, n: 382, u: 704 };
const gx = (u, g) => OX[g] + u * S, gy = (v) => BL - v * S;
const cvRect = () => document.getElementById('cv').getBoundingClientRect();
const toScreen = ([u, v], g) => { const r = cvRect(); return [r.left + gx(u, g), r.top + gy(v)]; };
const fromScreen = (x, y, g) => { const r = cvRect(); return [(x - r.left - OX[g]) / S, (BL - (y - r.top)) / S]; };

const N = [
  { p: [60, 0] }, { p: [60, 500] }, { p: [150, 500] },
  { p: [150, 430] },
  { p: [300, 512], in: [212, 512], out: [388, 512], smooth: true },
  { p: [450, 380], in: [450, 470], smooth: true },
  { p: [450, 0] }, { p: [358, 0] },
  { p: [358, 362], out: [358, 402], smooth: true },
  { p: [280, 424], in: [330, 424], out: [226, 424], smooth: true },
  { p: [150, 352], in: [168, 394] },
  { p: [150, 0] },
];

const rot = (q) => q && [510 - q[0], 512 - q[1]];
const U = [N[0], ...N.slice(1).reverse()].map((n) => ({ p: rot(n.p), in: rot(n.out), out: rot(n.in), smooth: n.smooth }));
const GLYPH = { n: N, u: U };

const EXT = 0.24;
const stretch = (nodes, e) => nodes.map((n) => ({ ...n, in: n.in && [n.p[0] + (n.in[0] - n.p[0]) * (1 + e), n.p[1] + (n.in[1] - n.p[1]) * (1 + e)], out: n.out && [n.p[0] + (n.out[0] - n.p[0]) * (1 + e), n.p[1] + (n.out[1] - n.p[1]) * (1 + e)] }));

function ellipseD(cx, cy, rx, ry, g) {
  const k = 0.5523, P = (u, v) => `${gx(u, g).toFixed(2)} ${gy(v).toFixed(2)}`;
  return `M${P(cx, cy + ry)}C${P(cx + rx * k, cy + ry)} ${P(cx + rx, cy + ry * k)} ${P(cx + rx, cy)}C${P(cx + rx, cy - ry * k)} ${P(cx + rx * k, cy - ry)} ${P(cx, cy - ry)}`
    + `C${P(cx - rx * k, cy - ry)} ${P(cx - rx, cy - ry * k)} ${P(cx - rx, cy)}C${P(cx - rx, cy + ry * k)} ${P(cx - rx * k, cy + ry)} ${P(cx, cy + ry)}Z`;
}
const O_D = ellipseD(260, 250, 205, 262, 'o') + ellipseD(260, 250, 117, 176, 'o');

function ellipseNodes(rx, ry) {
  const k = 0.5523, cx = 260, cy = 250;
  return [
    { p: [cx, cy + ry], in: [cx - rx * k, cy + ry], out: [cx + rx * k, cy + ry], smooth: true },
    { p: [cx + rx, cy], in: [cx + rx, cy + ry * k], out: [cx + rx, cy - ry * k], smooth: true },
    { p: [cx, cy - ry], in: [cx + rx * k, cy - ry], out: [cx - rx * k, cy - ry], smooth: true },
    { p: [cx - rx, cy], in: [cx - rx, cy - ry * k], out: [cx - rx, cy + ry * k], smooth: true },
  ];
}
const O = ellipseNodes(205, 262), O_INNER = ellipseNodes(117, 176);

const P2 = (q, g) => `${gx(q[0], g).toFixed(2)} ${gy(q[1]).toFixed(2)}`;
const seg = (a, b, g) => (a.out || b.in ? `C${P2(a.out || a.p, g)} ${P2(b.in || b.p, g)} ${P2(b.p, g)}` : `L${P2(b.p, g)}`);
function pathD(nodes, closed, g) {
  let d = `M${P2(nodes[0].p, g)}`;
  for (let i = 1; i < nodes.length; i++) d += seg(nodes[i - 1], nodes[i], g);
  if (closed) d += seg(nodes[nodes.length - 1], nodes[0], g) + 'Z';
  return d;
}

function drawBase() {
  const s = document.getElementById('cv');
  const defs = el('defs', {}, s);
  const pat = el('pattern', { id: 'dots', width: 4.4, height: 4.4, patternUnits: 'userSpaceOnUse' }, defs);
  el('circle', { cx: 2.2, cy: 2.2, r: 0.85, fill: '#87a3df' }, pat);
  for (const id of ['mo', 'mn', 'mu']) {
    const m = el('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1062, height: 878 }, defs);
    el('rect', { width: 1062, height: 878, fill: '#fff' }, m);
    el('path', { d: id === 'mo' ? O_D : '', fill: '#000', 'fill-rule': 'evenodd', id: id + 'p' }, m);
  }
  const g = el('g', { id: 'base' }, s);
  for (let x = 0; x <= 1062; x += 31) el('line', { x1: x, y1: 0, x2: x, y2: 878, stroke: (x / 31) % 2 ? '#eceef2' : '#e3e7ee', 'stroke-dasharray': '2 3' }, g);
  for (let v = -300; v <= 900; v += 50) el('line', { x1: 0, y1: gy(v), x2: 1062, y2: gy(v), stroke: v % 100 ? '#eceef2' : '#e3e7ee', 'stroke-dasharray': '2 3' }, g);
  for (const [v, lab] of [[720, '720'], [500, '500'], [0, '0'], [-200, '−200']]) {
    el('line', { x1: 0, y1: gy(v), x2: 1062, y2: gy(v), stroke: '#a9bde6', 'stroke-width': 0.8, 'stroke-dasharray': '4 3' }, g);
    const t = el('text', { x: 8, y: gy(v) - 5, 'font-size': 10.5, fill: '#6f8fd8', 'font-family': 'JetBrains Mono' }, g); t.textContent = lab;
  }
  for (const gl of ['o', 'n', 'u']) for (const o of [0, 520]) el('line', { x1: gx(o, gl), y1: gy(800), x2: gx(o, gl), y2: gy(-250), stroke: '#a9bde6', 'stroke-width': 0.8, 'stroke-dasharray': '4 3' }, g);
  for (const gl of ['o', 'n', 'u']) { const t = el('text', { x: gx(260, gl), y: gy(-200) + 16, 'font-size': 10.5, fill: '#6f8fd8', 'font-family': 'JetBrains Mono', 'text-anchor': 'middle' }, g); t.textContent = '520'; }

  const sh = el('g', { mask: 'url(#mo)' }, g);
  el('path', { id: 'oShadow', d: O_D, fill: 'url(#dots)', 'fill-rule': 'evenodd', transform: 'translate(8 9)' }, sh);
  el('path', { id: 'oOutline', d: O_D, fill: 'none', stroke: '#3a3a3a', 'stroke-width': 1 }, g);
  el('g', { id: 'live' }, s);

  const rh = document.getElementById('rh'), rv = document.getElementById('rv');
  for (let x = 0; x <= 1062; x += 10) {
    el('line', { x1: x, y1: x % 100 ? 16 : 6, x2: x, y2: 22, stroke: '#c4c4c4', 'stroke-width': 0.8 }, rh);
    if (x % 100 === 0) { const t = el('text', { x: x + 3, y: 11, 'font-size': 9, fill: '#999', 'font-family': 'JetBrains Mono' }, rh); t.textContent = x; }
  }
  for (let y = 0; y <= 878; y += 10) {
    el('line', { x1: y % 100 ? 16 : 6, y1: y, x2: 22, y2: y, stroke: '#c4c4c4', 'stroke-width': 0.8 }, rv);
    if (y % 100 === 0) { const t = el('text', { x: 11, y: y + 3, 'font-size': 9, fill: '#999', 'font-family': 'JetBrains Mono', transform: `rotate(-90 11 ${y + 3})`, 'text-anchor': 'end' }, rv); t.textContent = y; }
  }
}

const BLUE = '#2f7cf6', GRAY = '#a3a3a3';
function anchor(s, x, y, hot) {
  if (hot) { el('circle', { cx: x, cy: y, r: 5.3, fill: BLUE, stroke: '#fff', 'stroke-width': 1.7 }, s); el('circle', { cx: x, cy: y, r: 6.2, fill: 'none', stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.6 }, s); }
  else el('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: BLUE, 'stroke-width': 1.35 }, s);
}
function handle(s, p, h, g) {
  const x1 = gx(p[0], g), y1 = gy(p[1]), x2 = gx(h[0], g), y2 = gy(h[1]);
  el('line', { x1, y1, x2, y2, stroke: BLUE, 'stroke-width': 1.4 }, s);
  el('rect', { x: x2 - 3.55, y: y2 - 3.55, width: 7.1, height: 7.1, fill: '#fff', stroke: BLUE, 'stroke-width': 1.35, transform: `rotate(45 ${x2} ${y2})` }, s);
}

function drawGlyph(layer, st) {
  const { g, nodes, closed = false, preview = null, hot = -1, handles = [], fill = 0, done = false } = st;
  const d = pathD(nodes, closed, g);
  document.getElementById(`m${g}p`).setAttribute('d', closed ? d : '');
  if (closed && fill > 0) {
    const sh = el('g', { mask: `url(#m${g})`, opacity: fill }, layer);
    el('path', { d, fill: 'url(#dots)', transform: 'translate(8 9)' }, sh);
  }
  if (done) { el('path', { d, fill: 'none', stroke: '#3a3a3a', 'stroke-width': 1 }, layer); return; }

  const last = nodes.length - 1;
  if (nodes.length > 1) {
    el('path', { d: pathD(closed ? nodes : nodes.slice(0, st.activeSeg ? last : last + 1), closed, g), fill: 'none', stroke: closed ? '#2b2b2b' : GRAY, 'stroke-width': closed ? 1.2 : 1.45, 'stroke-linejoin': 'round' }, layer);
    if (st.activeSeg && !closed) el('path', { d: `M${P2(nodes[last - 1].p, g)}` + seg(nodes[last - 1], nodes[last], g), fill: 'none', stroke: BLUE, 'stroke-width': 1.5 }, layer);
  }
  if (preview) { const a = nodes[last]; el('path', { d: `M${P2(a.p, g)}` + (a.out ? `C${P2(a.out, g)} ${P2(preview, g)} ${P2(preview, g)}` : `L${P2(preview, g)}`), fill: 'none', stroke: BLUE, 'stroke-width': 1.5 }, layer); }
  for (const i of handles) { const n = nodes[i]; if (!n) continue; if (n.in) handle(layer, n.p, n.in, g); if (n.out) handle(layer, n.p, n.out, g); }
  nodes.forEach((n, i) => anchor(layer, gx(n.p[0], g), gy(n.p[1]), i === hot));
  document.getElementById('pts').textContent = `${nodes.length} 个点`;
}
function setPanel(g, n, fill) {
  document.getElementById('gname').textContent = `${g} · U+${{ o: '006F', n: '006E', u: '0075' }[g]}`;
  document.getElementById('nx').textContent = Math.round(n.p[0]); document.getElementById('ny').textContent = Math.round(n.p[1]);
  document.getElementById('nt').textContent = n.smooth ? '平滑' : '角点';
  document.getElementById('nh').textContent = n.out ? Math.round(Math.hypot(n.out[0] - n.p[0], n.out[1] - n.p[1])) : '—';
  const on = fill > 0;
  document.getElementById('fillName').textContent = on ? '图案' : '无';
  document.getElementById('fillHex').textContent = on ? '点阵' : '—';
  document.getElementById('fillSw').style.background = on ? 'radial-gradient(circle, #87a3df 30%, transparent 32%) 0 0 / 4px 4px, #fff' : '#fff';
  document.getElementById('fillOp').textContent = Math.round(fill * 100) + '%';
}

const DRAWS = {

  draw: { g: 'n', k: 4, pre: [[2, 0.15], [3, 1.65]], click: 3.90, grab: 3.98, release: 5.80,
    keys: (ax, ay, hx, hy, [p2x, p2y], [p3x, p3y]) => [[-0.5, p2x - 34, p2y + 1], [0.12, p2x, p2y, 'out'], [0.31, p2x, p2y, 'hold'], [1.61, p3x, p3y], [1.81, p3x, p3y, 'hold'],
      [3.15, p3x + 0.76 * (ax - p3x), p3y + 0.76 * (ay - p3y), 'in'], [3.85, ax, ay, 'out'], [3.98, ax, ay, 'hold'], [5.80, hx, hy], [5.86, hx, hy, 'hold'], [6.30, hx + 16, hy + 30, 'in']] },
  u:    { g: 'u', k: 8, click: 1.08, grab: 1.18, release: 3.07, keys: (ax, ay, hx, hy) => [[0, ax - 12, ay - 10], [1.0, ax, ay, 'out'], [1.18, ax, ay, 'hold'], [3.07, hx, hy], [3.15, hx, hy, 'hold'], [4.25, hx + 18, hy + 8, 'in']] },
};
const CLOSE = { click: 1.05, end: 4.25 };
const TWEAK = { stop: 0.8, resume: 1.1, release: 1.95, end: 2.126 };
const PERF = {};
function perf(act) {
  if (PERF[act]) return PERF[act];
  if (act === 'closeu') {
    const [ax, ay] = toScreen(U[0].p, 'u'), ext = (t) => KIT.inOut(clamp((t - 1.3) / (4.6 - 1.3)));
    return (PERF[act] = { pos: motion([[0, ax - 24, ay - 3], [0.95, ax, ay, 'out'], [1.25, ax, ay, 'hold'], [2.9, ax + 38, ay + 20], [3.3, ax + 38, ay + 20, 'hold'], [CLOSE.end, ax + 56, ay + 26, 'in']]),
      kinds: [[0, 'pen'], [0.5, 'pen_close'], [CLOSE.click + 0.05, 'pen']], clicks: [CLOSE.click], node: [ax, ay], ext });
  }
  if (act === 'tweak') {
    const [hx, hy] = toScreen(O[1].out, 'o');

    return (PERF[act] = { pos: motion([[0, hx, hy], [TWEAK.stop, hx + 20, hy, 'out'], [TWEAK.resume, hx + 20, hy, 'hold'], [TWEAK.end, hx + 60, hy - 10, 'in']]),
      kinds: [[0, 'grab'], [TWEAK.release, 'arrow']] });
  }
  if (act === 'close') {
    const [ax, ay] = toScreen(N[0].p, 'n');
    const ext = (t) => KIT.inOut(clamp((t - 1.3) / (4.6 - 1.3)));
    return (PERF[act] = { pos: motion([[0, ax - 24, ay + 2], [0.95, ax, ay, 'out'], [1.25, ax, ay, 'hold'], [2.9, ax + 40, ay + 18], [3.3, ax + 40, ay + 18, 'hold'], [CLOSE.end, ax + 58, ay + 20, 'in']]),
      kinds: [[0, 'pen'], [0.5, 'pen_close'], [CLOSE.click + 0.05, 'pen']], clicks: [CLOSE.click], node: [ax, ay], ext });
  }
  const D = DRAWS[act], nodes = GLYPH[D.g], [ax, ay] = toScreen(nodes[D.k].p, D.g), [hx, hy] = toScreen(nodes[D.k].out, D.g), pre = (D.pre || []).map(([k]) => toScreen(nodes[k].p, D.g));
  return (PERF[act] = { pos: motion(D.keys(ax, ay, hx, hy, ...pre)), kinds: [[0, 'pen']], clicks: [...(D.pre || []).map(([, c]) => c), D.click], node: [ax, ay], D, nodes });
}
function renderAt(act, t) {
  const live = document.getElementById('live'); live.innerHTML = '';
  for (const g of ['n', 'u']) document.getElementById(`m${g}p`).setAttribute('d', '');
  const P = perf(act), c = cursorAt(t, P), [mx, my] = P.pos(t);

  let od = O_D;
  if (act === 'tweak') {
    const nodes = O.map((n) => ({ ...n })), n = nodes[1];
    n.out = fromScreen(...P.pos(Math.min(t, TWEAK.release)), 'o');
    n.in = [2 * n.p[0] - n.out[0], 2 * n.p[1] - n.out[1]];
    od = pathD(nodes, true, 'o') + pathD(O_INNER, true, 'o');
    for (const contour of [nodes, O_INNER]) {
      for (const n of contour) { handle(live, n.p, n.in, 'o'); handle(live, n.p, n.out, 'o'); }
      for (const n of contour) anchor(live, gx(n.p[0], 'o'), gy(n.p[1]), false);
    }
    for (const g of ['n', 'u']) drawGlyph(live, { g, nodes: stretch(GLYPH[g], EXT), closed: true, fill: 1, done: true });
    document.getElementById('pts').textContent = '8 个点';
    setPanel('o', n, 1);
    if (c.kind === 'grab') c.tilt = 0;
  } else if (act === 'close' || act === 'closeu') {
    const g = act === 'close' ? 'n' : 'u', G0 = GLYPH[g];
    if (g === 'u') drawGlyph(live, { g: 'n', nodes: stretch(N, EXT), closed: true, fill: 1, done: true });
    const closed = t >= CLOSE.click, e = P.ext(t) * EXT, nodes = stretch(G0, e), fill = KIT.smooth(clamp((t - 1.6) / 2.4));
    drawGlyph(live, { g, nodes, closed, preview: closed ? null : fromScreen(mx, my, g), hot: closed ? 0 : G0.length - 1, handles: closed ? G0.map((_, i) => i) : [G0.length - 1], fill });
    setPanel(g, closed ? nodes[0] : nodes[G0.length - 1], fill);
  } else {
    const D = P.D, nodes = P.nodes.slice(0, D.k).filter((_, i) => !(D.pre || []).some(([k, c]) => k === i && t < c)).map((n) => ({ ...n }));
    if (D.g === 'u') drawGlyph(live, { g: 'n', nodes: stretch(N, EXT), closed: true, fill: 1, done: true });
    const placed = t >= D.click, dragging = t >= D.grab;
    if (placed) {
      const p = P.nodes[D.k].p, out = dragging ? fromScreen(...P.pos(Math.min(t, D.release)), D.g) : p;
      const nk = { p, out, in: [2 * p[0] - out[0], 2 * p[1] - out[1]], smooth: true };
      if (Math.hypot(out[0] - p[0], out[1] - p[1]) < 1.5) { delete nk.in; delete nk.out; nk.smooth = false; }
      nodes.push(nk);
    }
    const k = nodes.length - 1;
    drawGlyph(live, { g: D.g, nodes, activeSeg: placed && t <= D.release, preview: !placed || t > D.release ? fromScreen(mx, my, D.g) : null, hot: k, handles: [k - 1, k] });
    setPanel(D.g, nodes[k], 0);
  }
  for (const id of ['mop', 'oShadow', 'oOutline']) document.getElementById(id).setAttribute('d', od);
  cursor.set(c);
}

function focusAt(act, t, look) {
  if (look === 'arch') return toScreen([300, 430], 'n');
  if (look === 'bowl') return toScreen([210, 80], 'u');
  if (look === 'onode') return toScreen(O[1].p, 'o');
  return perf(act).pos(t);
}

drawBase();
window.focusAt = focusAt;
window.hero = (act) => focusAt(act, 0);
window.ready = KIT.ready;
window.renderAt = renderAt;
