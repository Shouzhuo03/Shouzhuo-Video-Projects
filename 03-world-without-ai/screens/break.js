const G = 16, NX = 90, NY = 57;

const C = {
  bg: '#202020', tile: '#373735', ink: '#121110', cream: '#e2e0d3', punct: '#8c8378', label: '#0b0a0a', dim: '#5d5a54',
  coral: ['#f45b40', '#e2533a'], rose: ['#9e7e6e', '#8f7163'], tan: ['#d6ae7c', '#c39a64'], dtan: ['#a9844f', '#987545'],
  blue: ['#98bab8', '#86aba9'], dblue: ['#618282', '#577676'], olive: ['#abb773', '#9ba667'], grey: ['#988b78', '#887c6a'],
};
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const esc = (c) => c.replace('&', '&amp;').replace('<', '&lt;');

const COPY = top.FilmCopy;
const LINES = COPY.log.length ? COPY.log : [['', '']];
const logAnchors = Object.fromEntries(LINES.flatMap((row, index) => row[2] ? [[row[2], index]] : []));
const lineOf = id => logAnchors[id] ?? 0;
const chineseFont = '"Noto Sans SC", "Noto Sans SC Fallback", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const COLW = 44, FW = 30, LIVE = 6;
const MARK = { T: ['coral', '>'], o: ['tan', '='], a: ['olive', '+'], d: ['grey', '-'], F: ['dblue', '#'] };

function tokens(s) {
  const out = [], re = /("[^"]*")|(-?\d*\.?\d+)|([A-Za-z_][\w-]*(?=\())|([A-Za-z_][\w-]*)|([㐀-鿿✓×·]+)|(\s+)|(.)/gu;
  let m;
  while ((m = re.exec(s))) {
    const k = m[1] ? 'str' : m[2] ? 'num' : m[3] ? 'fn' : m[4] ? 'id' : m[5] ? 'cjk' : m[6] ? 'sp' : 'p';
    for (const ch of m[0]) out.push([ch, k]);
  }
  return out;
}
const isCJK = (ch) => /[㐀-鿿]/u.test(ch);

let TL = null;
const beat = (b, x) => { while (x >= TL.bars[b].meter) { x -= TL.bars[b].meter; b++; } return TL.bars[b].start + (x * TL.bars[b].dur) / TL.bars[b].meter; };
const per16 = (b0, x0, b1, x1) => {
  const out = [];
  for (let b = b0; b <= b1; b++) for (let k = b === b0 ? x0 * 4 : 0; k < (b === b1 ? x1 * 4 : 16); k++) out.push(beat(b, k / 4));
  return out;
};

const PH1 = [0, 1, 2, 4, 6, 7, 8, 10, 11, 12], PH2 = [0, 1, 2, 4, 6, 7, 8, 10, 12];
let MEL = null;
const melody = () => MEL || (MEL = [...PH1.map((x) => beat(13, x)), ...PH2.map((x) => beat(17, x))]);

const tick = (b0, x0, b1, x1, n, m = 0) => per16(b0, x0, b1, x1).map((t) => [t, n + (melody().some((u) => Math.abs(u - t) < 0.02) ? m : 0)]);

function ticksFrom(t0, n) {
  const out = [];
  for (let b = 0; b < TL.bars.length && out.length < n; b++) { const B = TL.bars[b], d = B.dur / 16; for (let k = 0; k < 16 && out.length < n; k++) { const s = B.start + k * d; if (s >= t0 - 1e-6) out.push(s); } }
  return out;
}

function n16(T) {
  let n = 0;
  for (let b = 13; b < TL.bars.length && TL.bars[b].start <= T + 1e-6; b++) {
    const B = TL.bars[b], d = B.dur / 16;
    for (let k = 0; k < 16; k++) { const s = B.start + k * d; if (s > T + 1e-6 || s >= TL.events.stop - 1e-6) break; n++; }
  }
  return n;
}

const ribbon = (i, j, H) => climbPath().near((H.ai + i + 0.5) * G, (H.aj + j + 0.5) * G) < 1.5 * G;
const HOLES = {
  none: null,

  S10: { act: 'close', ref: 2.0, also: 'arch', line: lineOf('S10'), field: 'cluster', pre: 0,
    guard: 1.3, blocks: () => [[-6, -6, 3, 2], [3, -5, 3, 2], [-5, 1, 3, 2], [3, 5, 2, 3], [-4, 7, 4, 2]].map((b) => [...b, beat(13, 0)]),
    events: () => tick(13, 2, 14, 4, 1, 3) },

  S11: { act: 'graph', ref: 2.0, also: 'rise', guard: 1.4, line: lineOf('S11'), field: 'cluster', pre: 70,
    blocks: () => [[-14, 5, 5, 3, beat(16, 0), 2], [8, 6, 4, 3, beat(16, 0), 2]],
    events: () => tick(15, 0, 16, 4, 1, 3) },

  S12: { act: 'closeu', ref: 2.0, guard: 1.5, line: lineOf('S12'), field: 'sweep', th0: 3.8,
    v: (i, j) => -0.5 * i - 0.46 * j + 1.5 * hash(j, 3),
    events: () => tick(17, 0, 18, 4, 2, 4) },

  S13: { act: 'spring', ref: 2.0, also: 'spring', line: lineOf('S13'), field: 'sweep', th0: 1.0,
    v: (i, j) => 0.46 * i - 0.5 * j + 1.5 * hash(j, 11),
    events: () => [...tick(19, 0, 20, 0, 3, 6), [beat(20, 0), 40], ...tick(20, 0, 20, 4, 3, 6)] },

  S14: { act: 'diamond', ref: 1.0, look: 'key', line: lineOf('S14'), field: 'island',
    v: (i, j) => Math.abs(i + 0.5) + 1.25 * Math.abs(j) - 0.9 * hash(j, 5),
    events: () => [[-1, 9.6], ...per16(21, 0.25, 22, 4).map((t, k, a) => [t, 9.6 - (9.0 * (k + 1)) / a.length])] },

  S15: { act: 'climb', ref: 0, line: lineOf('S15'), field: 'keep', anchor: () => climbPath().pts[0], keep: ribbon },

  S16: { act: 'climb', ref: 0, line: lineOf('S15'), field: 'keep', anchor: () => climbPath().pts[0], keep: ribbon,
    order: (i, j, H) => climbPath().index((H.ai + i + 0.5) * G, (H.aj + j + 0.5) * G) + 40 * hash(i, j + 7),
    events: () => [...per16(27, 0, 27, 4).map((t) => [t, 3 + ([0, 1, 2].some((x) => Math.abs(beat(27, x) - t) < 0.02) ? 10 : 0)]), [beat(28, 0), 9999]] },
};

const BASE = { draw: 'pen', close: 'pen', closeu: 'pen', u: 'pen', tweak: 'pen',
  ease: 'curve', ease2: 'curve', graph: 'curve', graph2: 'curve', spring: 'curve', diamond: 'curve', climb: 'curve',
  wheel: 'grade', grade: 'grade', lift: 'grade', num: 'grade' };
const frames = {};
function load(screen) {
  if (frames[screen]) return frames[screen].ready;
  const f = top.makeScreen(screen, document);
  document.getElementById('slab').appendChild(f);
  frames[screen] = f;
  f.ready = new Promise((res) => (f.onload = async () => { await f.contentWindow.ready; res(); }));
  return f.ready;
}
const win = (act) => frames[BASE[act]].contentWindow;
const curBox = (act) => frames[BASE[act]].contentDocument.querySelector('body > div[style*="z-index: 999"]');

window.ready = (async () => {
  TL = top.filmTimeline;
  await Promise.all([...new Set(Object.values(BASE))].map(load));
  await document.fonts.load(`${WORD.weight} 120px ${chineseFont}`, WORD.text + CLIMB + LINES.map(row => row[1]).join(''));
  await document.fonts.ready;
})();

const CLIMB = COPY.climbText, CW = 8;
let CP = null;
function climbPath() {
  if (CP) return CP;
  const w = win('climb'), [x1, y1, x2, y2] = w.EASE_FINAL, Bz = (u, a, b) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  const pts = [], len = [0];
  for (let k = 0; k <= 600; k++) { const u = k / 600; pts.push(w.easeToScreen([Bz(u, x1, x2), Bz(u, y1, y2)])); if (k) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); }
  const chars = tokens(CLIMB), n = chars.length + 1;
  const L = len[600], at = (s) => {
    let k = 1; while (k < 600 && len[k] < s) k++;
    const a = pts[k - 1], b = pts[k], f = (s - len[k - 1]) / (len[k] - len[k - 1] || 1), tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: tx / tl, ty: ty / tl };
  };
  const times = [...per16(23, 0, 25, 4), ...per16(26, 0, 26, 2), TL.events.stop];
  const cells = [];
  for (let k = 0; k < n; k++) {
    const p = at((L * (k + 0.5)) / n), off = 0.8 * CW;
    const [c, kind] = chars[k] ?? ['', 'caret'];
    const beatIndex = n === 1 ? times.length - 1 : k * (times.length - 1) / (n - 1);
    const low = Math.floor(beatIndex), high = Math.ceil(beatIndex);
    const t = times[low] + (times[high] - times[low]) * (beatIndex - low);
    cells.push({ x: p.x + p.ty * off, y: p.y - p.tx * off, a: (Math.atan2(p.ty, p.tx) * 180) / Math.PI, c, kind, t });
  }
  const near = (x, y) => { let d = 1e9; for (let k = 0; k <= 600; k += 4) d = Math.min(d, Math.hypot(x - pts[k][0], y - pts[k][1])); return d; };
  const index = (x, y) => { let d = 1e9, best = 0; for (let k = 0; k <= 600; k += 4) { const e = Math.hypot(x - pts[k][0], y - pts[k][1]); if (e < d) { d = e; best = k; } } return best; };
  return (CP = { pts, cells, near, index });
}
function paintClimb(T) {
  const P = climbPath(), CF = { fn: [C.coral[0], C.ink], num: [C.blue[0], C.ink], str: [C.tan[0], C.ink], id: [C.bg, C.cream], p: [C.bg, C.punct], caret: [C.coral[0], C.ink] };
  let h = '';
  for (const c of P.cells) {
    const s = clamp((T - c.t) / 0.08); if (s <= 0) continue;
    const e = 1 - (1 - s) * (1 - s), [fill, ink] = CF[c.kind] || CF.id;
    h += `<g transform="translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) rotate(${c.a.toFixed(2)}) scale(${e.toFixed(3)})"><rect x="${-CW / 2}" y="${-CW / 2}" width="${CW}" height="${CW}" fill="${fill}"/>${c.c ? `<text y=".3" fill="${ink}">${esc(c.c)}</text>` : ''}</g>`;
  }
  document.getElementById('over').innerHTML = h;
}

function climbHead(T) {
  const c = climbPath().cells; let k = 0; while (k + 1 < c.length && c[k + 1].t <= T) k++;
  if (k + 1 >= c.length || T <= c[0].t) return [c[k].x, c[k].y];
  const f = (T - c[k].t) / (c[k + 1].t - c[k].t);
  return [c[k].x + (c[k + 1].x - c[k].x) * f, c[k].y + (c[k + 1].y - c[k].y) * f];
}

function prep(key, act) {
  const H = HOLES[key];
  if (H.ready) return H;
  const w = win(act);
  w.renderAt(act, H.ref, {});
  const [x, y] = H.anchor ? H.anchor() : w.focusAt(act, H.ref, H.look);
  H.ai = Math.floor(x / G); H.aj = Math.floor(y / G);
  const rel = ([px, py]) => [px / G - H.ai - 0.5, py / G - H.aj - 0.5];

  const path = [];
  for (let u = -0.3; u <= 5; u += 0.1) path.push(rel(w.focusAt(act, u)));
  const near = (i, j) => Math.min(...path.map(([px, py]) => Math.hypot(i - px, j - py)));
  H.drop = new Map();
  const g = H.guard ?? 2.4;

  const inBlock = new Set();
  for (const [bi, bj, bw, bh, t0, per = 1] of H.blocks ? H.blocks() : []) {
    const ts = ticksFrom(t0, Math.ceil((bw * bh) / per));
    let c = 0;
    for (let j = bj; j < bj + bh; j++) for (let i = bi; i < bi + bw; i++, c++) { inBlock.add(`${i},${j}`); H.drop.set(`${i},${j}`, ts[Math.floor(c / per)]); }
  }
  H.blockList = [];
  const each = (f) => { for (let j = -H.aj; j < NY - H.aj; j++) for (let i = -H.ai; i < NX - H.ai; i++) if (!inBlock.has(`${i},${j}`)) f(i, j); };

  const fall = (cells, pre) => {
    cells.sort((a, b) => a[0] - b[0]);
    let k = 0;
    for (; k < pre && k < cells.length; k++) H.drop.set(`${cells[k][1]},${cells[k][2]}`, -1);
    for (const [t, n] of H.events()) for (let m = 0; m < n && k < cells.length; m++, k++) H.drop.set(`${cells[k][1]},${cells[k][2]}`, t);
  };
  if (H.field === 'cluster') {

    const seeds = [], also = H.also ? rel(w.focusAt(act, H.ref, H.also)) : null;
    for (let k = 0; k < 6; k++) {
      const [ox, oy] = also && k % 2 ? also : [0, 0], a = 6.283 * hash(k, H.ai + H.aj), r = 3.5 + 3 * hash(H.aj, k);
      seeds.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r * 1.3]);
    }
    const cells = [];
    each((i, j) => {
      const d = Math.min(...seeds.map(([sx, sy], k) => Math.hypot(i - sx, (j - sy) * 0.9) + 3 * Math.floor(k / (also ? 2 : 1))));
      if (d > 26) return;
      const n = near(i, j);
      cells.push([d + 0.9 * hash(i, j) + (n < g ? 60 : n < g + 1.4 ? 8 : 0), i, j]);
    });
    fall(cells, H.pre);
  }
  if (H.field === 'sweep') {
    const cells = [];
    each((i, j) => { let v = H.v(i, j); const n = near(i, j); if (n < g) v -= 40; else if (n < g + 1.3) v -= 1.2; cells.push([-v, i, j]); });
    fall(cells, cells.filter(([v]) => -v > H.th0).length);
  }
  if (H.field === 'island') {
    const ev = H.events();
    each((i, j) => { const v = H.v(i, j); for (const [t, th] of ev) if (v > th) { H.drop.set(`${i},${j}`, t); break; } });
  }
  if (H.field === 'keep') {
    const kept = [];
    each((i, j) => { if (!H.keep(i, j, H)) H.drop.set(`${i},${j}`, -1); else if (H.order) kept.push([H.order(i, j, H), i, j]); });
    if (H.order) fall(kept, 0);
  }
  H.ready = true;
  return H;
}

let built = null, prog = [], lastDone = -1;
const CELLS = new Map();
function buildCode(key) {
  const H = HOLES[key], svg = document.getElementById('code'), x0 = H.ai - 12, out = [];
  out.push(`<rect width="1440" height="900" fill="${C.bg}"/>`);
  CELLS.clear();
  const cell = (gx, gy) => CELLS.get(`${gx},${gy}`) || CELLS.set(`${gx},${gy}`, { gx, gy, fill: null, c: '', col: C.cream }).get(`${gx},${gy}`);
  const tile = (gx, gy, fill) => { out.push(`<rect x="${gx * G}" y="${gy * G}" width="${G}" height="${G}" fill="${fill}"/>`); cell(gx, gy).fill = fill; };
  const ch = (gx, gy, c, col) => { out.push(`<text class="${isCJK(c) ? 'cjk' : ''}" x="${gx * G + G / 2}" y="${gy * G + G / 2 + 0.5}" fill="${col}">${esc(c)}</text>`); Object.assign(cell(gx, gy), { c, col }); };
  const shade = (pal, gx, gy) => pal[(gx + gy) & 1];

  for (let gy = 0; gy < NY; gy++) {
    const xs = [], s = [];
    for (let gx = 0; gx < NX; gx++) {
      if (gx >= x0 && gx < x0 + COLW) continue;
      const m = (((gx - x0) % 3) + 3) % 3; if (m === 2) continue;
      xs.push(gx * G + G / 2); s.push('0123456789abcdef'[Math.floor(hash(Math.floor((gx - x0) / 3) * 7 + gy, gy * 3 + m) * 16)]);
    }
    out.push(`<text class="hex" x="${xs.join(' ')}" y="${gy * G + G / 2 + 0.5}">${s.join('')}</text>`);
  }
  prog = [];
  for (let gy = 0; gy < NY; gy++) {
    const n = LINES.length, li = (((H.line + gy - H.aj) % n) + n) % n, [tag, text] = LINES[li];
    if (!tag) continue;
    const [mp, mc] = MARK[tag];
    tile(x0, gy, shade(C[mp], x0, gy)); ch(x0, gy, mc, C.ink);
    if (tag === 'T') {
      const wcells = Math.ceil((text.length * 12.4 + 14) / G);
      out.push(`<rect x="${(x0 + 1) * G}" y="${gy * G}" width="${wcells * G}" height="${G}" fill="${C.label}"/><text class="lab" x="${(x0 + 1) * G + 7}" y="${gy * G + G / 2 + 0.5}" fill="${C.cream}">${text}</text>`);
      continue;
    }
    if (tag === 'F') {
      for (let k = 0; k < FW; k++) { const gx = x0 + 2 + k; prog.push({ gx, gy, idx: text * FW + k }); out.push(`<g data-p="${prog.length - 1}"></g>`); }
      continue;
    }
    tokens(text).forEach(([c, k], n) => {
      const gx = x0 + 2 + n;
      if (k === 'sp') return;
      if (k === 'fn') { tile(gx, gy, shade(C.coral, gx, gy)); ch(gx, gy, c, C.ink); }
      else if (k === 'num') { tile(gx, gy, shade(C.blue, gx, gy)); ch(gx, gy, c, C.ink); }
      else if (k === 'str') { tile(gx, gy, shade(C.tan, gx, gy)); ch(gx, gy, c, C.ink); }
      else ch(gx, gy, c, k === 'p' ? C.punct : tag === 'd' ? C.grey[0] : C.cream);
    });
  }
  svg.innerHTML = out.join('');
  built = key; lastDone = -1; WORD.plan = null;
}

function paintProgress(T) {
  const done = Math.min(LIVE * FW, 20 + n16(T));
  if (done === lastDone) return; lastDone = done;
  const BAND = [[C.tan, C.dtan], [C.coral, C.rose], [C.blue, C.dblue]];
  const svg = document.getElementById('code');
  prog.forEach((p, n) => {
    const g = svg.querySelector(`g[data-p="${n}"]`), row = Math.floor(p.idx / FW) % 3, x = p.gx * G, y = p.gy * G;
    if (p.idx >= done) { g.innerHTML = `<rect x="${x}" y="${y}" width="${G}" height="${G}" fill="${C.tile}"/><text x="${x + G / 2}" y="${y + G / 2 + 0.5}" fill="${C.dim}">.</text>`; return; }
    const h = hash(p.gx, p.gy), [a, b] = BAND[row], fill = (h < 0.3 ? b : a)[(p.gx + p.gy) & 1];
    g.innerHTML = `<rect x="${x}" y="${y}" width="${G}" height="${G}" fill="${fill}"/><text x="${x + G / 2}" y="${y + G / 2 + 0.5}" fill="${C.ink}">${'0123456789abcdef'[p.idx % 16]}</text>`;
  });
}

const DROP = 0.16;
function holesPath(H, T) {
  let d = 'M0 0H1440V900H0Z';
  const shrink = (x, y, w, h, t0) => {
    const k = Math.min(1, (T - t0) / DROP), e = (1 - k) * (1 - k);
    d += `M${x} ${y}h${w}v${h}h${-w}Z`;
    if (k < 1) d += `M${x + (w * (1 - e)) / 2} ${y + (h * (1 - e)) / 2}h${w * e}v${h * e}h${-w * e}Z`;
  };
  for (const [i, j, w, h, t0] of H.blockList) if (T >= t0) shrink((H.ai + i) * G, (H.aj + j) * G, w * G, h * G, t0);
  for (let gy = 0; gy < NY; gy++) {
    let run = -1;
    for (let gx = 0; gx <= NX; gx++) {
      const t0 = gx < NX ? H.drop.get(`${gx - H.ai},${gy - H.aj}`) : undefined, gone = t0 !== undefined && T >= t0;
      const full = gone && T - t0 >= DROP;
      if (full) { if (run < 0) run = gx; continue; }
      if (run >= 0) { d += `M${run * G} ${gy * G}h${(gx - run) * G}v${G}h${-(gx - run) * G}Z`; run = -1; }
      if (gone) shrink(gx * G, gy * G, G, G, t0);
    }
  }
  return d;
}

const CELL = 8, ARROW = [[0, 0], [0, 1], [1, 1], [0, 2], [1, 2], [2, 2]];
const CHARSET = ['x', 'y', '0', '.', '(', ')', '1', 't', '=', '{', '3', ';', 'k', ']'], CFILL = [C.coral[0], C.tan[0], C.blue[0], C.olive[0], C.cream, C.rose[0]];

let FORMS = null;
const forms = () => FORMS || (FORMS = [[TL.events.sixteenths_arrive, 1], [beat(13, 12), 0], [beat(17, 0), 1], [beat(17, 12), 0], [beat(21, 0), 1], [beat(21, 2), 0], [beat(22, 0), 1], [beat(22, 2), 0]]);
function paintChars(act, t, T, on) {
  const svg = document.getElementById('chars'), F = forms().filter(([s]) => s <= T + 1e-4).pop(), T0 = F ? F[0] : 0;
  if (!on || !F || !F[1]) { svg.innerHTML = ''; return false; }
  const [x, y] = win(act).focusAt(act, t), k = melody().filter((m) => m <= T + 1e-4).length;
  let h = '';
  ARROW.forEach(([cx, cy], n) => {
    const s = clamp((T - T0 - n * 0.012) / 0.12), e = s < 0.55 ? 1.18 * KIT.EO(s / 0.55) : 1.18 - 0.18 * KIT.inOut((s - 0.55) / 0.45);
    if (e <= 0) return;
    const fill = CFILL[(n + k) % CFILL.length], c = CHARSET[(n * 5 + k * 3) % CHARSET.length];
    const ox = x + cx * CELL + CELL / 2, oy = y + cy * CELL + CELL / 2;
    h += `<g transform="translate(${ox} ${oy}) scale(${e})"><rect x="${-CELL / 2}" y="${-CELL / 2}" width="${CELL}" height="${CELL}" fill="${fill}"/><text y=".3" fill="${C.ink}">${esc(c)}</text></g>`;
  });
  svg.innerHTML = h;
  return true;
}

const WORD = { text: COPY.endingTitle, N: 15, weight: 400, th: 0.3, gap: 1, first: 5, snap: 0.6, dim: [0.55, 1.0, 0.18], plan: null };

function glyphCells(ch, N, weight = WORD.weight, th = WORD.th) {

  const S = 240, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.font = `${weight} ${S * 0.82}px ${chineseFont}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, S / 2, S / 2);
  const d = x.getImageData(0, 0, S, S).data, ink = (i, j) => d[(j * S + i) * 4 + 3] / 255;
  let l = S, r = 0, t = S, b = 0;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) if (ink(i, j) > 0.5) { l = Math.min(l, i); r = Math.max(r, i); t = Math.min(t, j); b = Math.max(b, j); }
  const side = Math.max(r - l, b - t) + 1, ox = (l + r + 1) / 2 - side / 2, oy = (t + b + 1) / 2 - side / 2, out = [];
  for (let gj = 0; gj < N; gj++) for (let gi = 0; gi < N; gi++) {
    let s = 0, n = 0;
    for (let v = 0; v < 6; v++) for (let u = 0; u < 6; u++) { const px = Math.floor(ox + ((gi + (u + 0.5) / 6) * side) / N), py = Math.floor(oy + ((gj + (v + 0.5) / 6) * side) / N); s += px >= 0 && py >= 0 && px < S && py < S ? ink(px, py) : 0; n++; }
    if (s / n > th) out.push([gi, gj]);
  }
  return out;
}
function wordPlan(H) {
  if (WORD.plan) return WORD.plan;
  const [cx, cy] = win('climb').focusAt('climb', 0, 'curve');
  const chars = Array.from(WORD.text.trim());
  const rows = Math.min(chars.length, Math.max(4, Math.ceil(Math.sqrt(chars.length * 2))));
  const columns = Math.ceil(chars.length / rows), gap = WORD.gap;
  const N = Math.max(1, Math.min(WORD.N, Math.floor((36 + gap) / rows) - gap, Math.floor((16 + gap) / columns) - gap));
  const left = cx / G - (columns * (N + gap) - gap) / 2;
  const targets = [];
  chars.forEach((ch, k) => {
    const column = Math.floor(k / rows), row = k % rows, rowsInColumn = Math.min(rows, chars.length - column * rows);
    const ci = Math.round(left + (columns - 1 - column) * (N + gap));
    const cj = Math.round(cy / G - (rowsInColumn * (N + gap) - gap) / 2) + row * (N + gap);
    const cells = glyphCells(ch, N).map(([i, j]) => [ci + i, cj + j]);
    cells.sort((a, b) => a[1] - b[1] + 0.8 * (hash(a[0], a[1]) - hash(b[0], b[1])));
    targets.push(...cells);
  });

  const s16 = per16(27, 0, 28, 0.25), M = targets.length, span = 16 - WORD.first + 1;

  const pool = [...CELLS.values()].filter((c) => c.c.trim() && Math.abs(c.gx * G + 8 - cx) < 190 && Math.abs(c.gy * G + 8 - cy) < 330 && !ribbon(c.gx - H.ai, c.gy - H.aj, H));
  const used = new Set(), PAL = [C.coral, C.tan, C.blue, C.olive, C.grey];
  const plan = targets.map(([ti, tj], n) => {
    const L = Math.min(16, WORD.first + Math.floor((n * span) / M));
    let best = null, bd = 1e9;
    for (const c of pool) {
      if (used.has(c)) continue;
      const m = Math.abs(c.gx - ti) + Math.abs(c.gy - tj); if (m < 2) continue;
      const d = m + (c.fill ? 0 : 3) + 0.3 * hash(c.gx, c.gy); if (d < bd) { bd = d; best = c; }
    }
    if (best) used.add(best);
    const src = best || { gx: ti, gy: tj - L, fill: null, c: '·', col: C.cream };
    const dx = ti - src.gx, dy = tj - src.gy, d = Math.abs(dx) + Math.abs(dy);
    const step = Math.max(1, Math.ceil(d / L)), steps = Math.ceil(d / step), first = L - steps;
    const fill = src.fill || PAL[Math.floor(hash(ti, tj) * PAL.length)][(ti + tj) & 1];
    return { sx: src.gx, sy: src.gy, dx, dy, d, step, first, hv: hash(tj, ti) < 0.5, fill, c: src.c, from: !!best, t0: s16[first] };
  });
  WORD.s16 = s16;
  return (WORD.plan = plan);
}

function wordAt(p, l) {
  const ax = Math.abs(p.dx), ay = Math.abs(p.dy), sx = Math.sign(p.dx), sy = Math.sign(p.dy);
  if (p.hv) return l <= ax ? [p.sx + sx * l, p.sy] : [p.sx + p.dx, p.sy + sy * (l - ax)];
  return l <= ay ? [p.sx, p.sy + sy * l] : [p.sx + sx * (l - ay), p.sy + p.dy];
}
function paintWord(H, T) {
  const vac = document.getElementById('vac'), word = document.getElementById('word');
  if (!H || HOLES.S16 !== H || !WORD.text.trim()) { vac.innerHTML = word.innerHTML = ''; for (const id of ['code', 'vac', 'over']) document.getElementById(id).style.opacity = 1; return; }
  const plan = wordPlan(H), s16 = WORD.s16, ease = (u) => 1 - Math.pow(1 - u, 3);
  let hv = '', hw = '';
  for (const p of plan) {
    if (T < p.t0) continue;
    if (p.from) hv += `<rect x="${p.sx * G}" y="${p.sy * G}" width="${G}" height="${G}" fill="${C.bg}"/>`;

    let l = p.d;
    for (let j = 0; j < Math.ceil(p.d / p.step); j++) {
      const a = s16[p.first + j], b = s16[p.first + j + 1];
      if (T < a) { l = j * p.step; break; }
      if (T < b) { l = Math.min(p.d, j * p.step + p.step * ease(clamp((T - a) / (WORD.snap * (b - a))))); break; }
    }
    const [gx, gy] = wordAt(p, Math.min(l, p.d));
    hw += `<g transform="translate(${(gx * G + G / 2).toFixed(2)} ${(gy * G + G / 2).toFixed(2)})"><rect x="${-G / 2}" y="${-G / 2}" width="${G}" height="${G}" fill="${p.fill}"/>${p.c ? `<text class="${isCJK(p.c) ? 'cjk' : ''}" y=".5" fill="${C.ink}">${esc(p.c)}</text>` : ''}</g>`;
  }
  vac.innerHTML = hv; word.innerHTML = hw;

  const [mid, d1, lo] = WORD.dim, chord = s16[16];
  const o = T < chord ? 1 - (1 - mid) * KIT.inOut(clamp((T - s16[0]) / (chord - s16[0]))) : mid - (mid - lo) * KIT.inOut(clamp((T - chord) / d1));
  for (const id of ['code', 'vac', 'over']) document.getElementById(id).style.opacity = o;
}

function renderAt(act, t, opts = {}) {
  const base = BASE[act], f = frames[base], T = opts.T ?? t;
  for (const s in frames) frames[s].style.visibility = s === base ? 'visible' : 'hidden';
  const key = opts.holes && HOLES[opts.holes] ? opts.holes : null;
  if (key) {
    const H = prep(key, act);
    if (built !== key) buildCode(key);
    paintProgress(T);
    f.style.clipPath = `path(evenodd, "${holesPath(H, T)}")`;
  } else f.style.clipPath = 'none';
  f.contentWindow.renderAt(act, t, {});
  if (act === 'climb') paintClimb(T); else document.getElementById('over').innerHTML = '';
  paintWord(key === 'S16' ? HOLES.S16 : null, T);
  const chars = paintChars(act, t, T, !!opts.chars), box = curBox(act);
  if (box) box.style.visibility = chars ? 'hidden' : 'visible';
  const [f0, f1] = opts.fade || [1e9, 1e9];
  document.getElementById('fade').style.opacity = KIT.inOut(clamp((T - f0) / (f1 - f0)));
}
window.renderAt = renderAt;

window.settled = () => Promise.all(Object.values(frames).map((f) => (f.contentWindow.settled ? f.contentWindow.settled() : null)));
window.focusAt = (act, t, look, opts = {}) => (act === 'climb' && !look ? climbHead(opts.T ?? t) : win(act).focusAt(act, t, look));
