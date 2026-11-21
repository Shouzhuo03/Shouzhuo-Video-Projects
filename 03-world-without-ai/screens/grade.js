const { clamp, lerp, motion, cursorAt, makeCursor, place } = KIT;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const cursor = makeCursor();

const WHEELS = [['lift', '暗部'], ['gamma', '中灰'], ['gain', '亮部'], ['offset', '偏移']];
const HUES = [[0, 345], [55, 290], [105, 235], [160, 185], [205, 135], [250, 70], [290, 30], [360, -15]];
for (const [k, name] of WHEELS) {
  document.getElementById('wheels').insertAdjacentHTML('beforeend', `<div class="wh" id="w_${k}">
    <div class="t"><span class="l">${k === 'offset' ? '' : '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><circle cx="17" cy="17" r="2.2" fill="currentColor"/></svg>'}</span>${name}<span class="r"><svg class="i" viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2-5M5 4v4h4"/></svg></span></div>
    <div class="ring"><div class="outer"></div><svg class="arc" width="208" height="208"></svg><div class="hue"></div><div class="disc"></div><div class="cross"></div><div class="puck"></div></div>
    <div class="vals">${(k === 'offset' ? ['R', 'G', 'B'] : ['Y', 'R', 'G', 'B']).map((c) => `<div data-c="${c}">0.00<i style="background:${{ Y: '#ccc', R: '#e5484d', G: '#2fae5b', B: '#3e63dd' }[c]}"></i></div>`).join('')}</div>
    <div class="jog"></div></div>`);
}
function wheelCenter(k) { const r = document.querySelector(`#w_${k} .ring`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

function hueOfAngle(a) {
  a = ((a % 360) + 360) % 360;
  for (let i = 0; i < HUES.length - 1; i++) { const [a0, h0] = HUES[i], [a1, h1] = HUES[i + 1]; if (a <= a1) return lerp(h0, h1, (a - a0) / (a1 - a0)); }
  return 345;
}
function rgbOfHue(h) { h = ((h % 360) + 360) % 360; const f = (n) => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
function wheelRGB([u, v]) {
  const m = Math.hypot(u, v); if (m < 1e-4) return [0, 0, 0];
  const a = (Math.atan2(u, v) * 180) / Math.PI, c = rgbOfHue(hueOfAngle(a)), mean = (c[0] + c[1] + c[2]) / 3;
  return c.map((x) => (x - mean) * m);
}

const flat = ([r, g, b]) => { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; return [0.24 + 0.5 * lerp(y, r, 0.5), 0.25 + 0.5 * lerp(y, g, 0.5), 0.24 + 0.5 * lerp(y, b, 0.5)]; };
const SAMPLES = (() => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), gau = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.73;
  const comps = [[0.27, [0.6, 0.72, 0.88], 0.07, [0, 1]], [0.2, [0.8, 0.56, 0.38], 0.08, [0.28, 0.62]], [0.25, [0.16, 0.18, 0.15], 0.06, [0, 1]],
    [0.17, [0.38, 0.5, 0.28], 0.08, [0.5, 1]], [0.11, [0.93, 0.9, 0.83], 0.04, [0.15, 0.5]]];
  const out = [];
  for (let i = 0; i < 7000; i++) {
    let u = rnd(), c = comps[0]; for (const k of comps) { if (u < k[0]) { c = k; break; } u -= k[0]; }
    const l = gau() * c[2], rgb = c[1].map((m) => clamp(m + l + gau() * c[2] * 0.45, 0, 1));
    out.push({ v: flat(rgb), x: lerp(c[3][0], c[3][1], rnd()) });
  }
  return out;
})();
function look(P) {
  const lift = wheelRGB(P.lift).map((x) => x * 0.25), gam = wheelRGB(P.gamma).map((x) => x * 0.6), gain = wheelRGB(P.gain).map((x) => 1 + x * 0.7);
  const sat = P.sat / 50, con = P.con, pv = 0.435;
  return (src) => {
    const v = src.map((x, ch) => { let s = (x - pv) * con + pv; s = s * gain[ch] + lift[ch] * (1 - s); return Math.pow(clamp(s, 0, 1), 1 / (1 + gam[ch])); });
    const L = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    return v.map((x) => clamp(L + (x - L) * sat, 0, 1));
  };
}

const HB = 180, HW = 760, HH = 256, HX = 36, HY = 14;
function drawHisto(vals) {
  const s = document.getElementById('histo'); s.innerHTML = '';
  const cnt = [0, 1, 2].map(() => new Float32Array(HB));
  for (const v of vals) for (let ch = 0; ch < 3; ch++) cnt[ch][Math.min(HB - 1, Math.floor(v[ch] * HB))]++;
  const sm = cnt.map((a) => a.map((_, i) => { let s = 0, w = 0; for (let k = -3; k <= 3; k++) { const j = i + k; if (j < 0 || j >= HB) continue; const wk = 4 - Math.abs(k); s += a[j] * wk; w += wk; } return s / w; }));
  const mx = Math.max(...sm.map((a) => Math.max(...a)));
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: HX + v * HW, y1: HY, x2: HX + v * HW, y2: HY + HH, stroke: '#ececec' }, s);
    const t = el('text', { x: HX + v * HW, y: HY + HH + 22, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#999', 'font-family': 'JetBrains Mono' }, s); t.textContent = Math.round(v * 100);
  }
  el('line', { x1: HX, y1: HY + HH, x2: HX + HW, y2: HY + HH, stroke: '#d6d6d6' }, s);
  ['#e5484d', '#2fae5b', '#3e63dd'].forEach((c, ch) => {
    let d = `M${HX} ${HY + HH}`;
    sm[ch].forEach((n, i) => { d += `L${(HX + ((i + 0.5) / HB) * HW).toFixed(2)} ${(HY + HH - (n / mx) * (HH - 12)).toFixed(2)}`; });
    d += `L${HX + HW} ${HY + HH}Z`;
    el('path', { d, fill: c, 'fill-opacity': 0.42, class: 'ch' }, s);
    el('path', { d, fill: 'none', stroke: c, 'stroke-width': 1.3, 'stroke-opacity': 0.9 }, s);
  });
}

let TRACE = null, PCV = null, PARADE = Promise.resolve();
window.settled = () => PARADE;
function drawParade(vals) {
  const BX = 240, BY = 320, cnt = [0, 1, 2].map(() => new Uint16Array(BX * BY));
  vals.forEach((v, i) => { const bx = Math.floor(SAMPLES[i].x * (BX - 1)); for (let ch = 0; ch < 3; ch++) cnt[ch][Math.min(BY - 1, Math.floor((1 - v[ch]) * (BY - 1))) * BX + bx] += 12; });
  if (!PCV) { PCV = document.createElement('canvas'); PCV.width = 1488; PCV.height = 960; }
  const cv = PCV, c = cv.getContext('2d'), k = 3, w = cv.width, h = cv.height;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#fbfbfa'; c.fillRect(0, 0, w, h); c.scale(k, k);
  const L = 44, T = 10, PW = 440, PH = 296;
  c.font = '500 11px "JetBrains Mono"'; c.textAlign = 'right';
  for (const v of [0, 128, 256, 384, 512, 640, 768, 896, 1023]) {
    const y = T + PH - (v / 1023) * PH; c.strokeStyle = 'rgba(176,140,60,.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(L, y); c.lineTo(L + PW, y); c.stroke();
    c.fillStyle = '#b08c3c'; c.fillText(String(v), L - 6, y + 4);
  }
  const cols = [[222, 52, 60], [34, 160, 80], [52, 88, 214]], third = PW / 3;
  if (!TRACE) { TRACE = document.createElement('canvas'); TRACE.width = BX; TRACE.height = BY; }
  const tc = TRACE.getContext('2d');
  cnt.forEach((a, ch) => {
    const im = tc.createImageData(BX, BY), d = im.data, [r, g, b] = cols[ch];
    for (let i = 0; i < a.length; i++) { const al = 1 - Math.exp(-a[i] * 0.09); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = al * 235; }
    tc.putImageData(im, 0, 0);
    c.imageSmoothingEnabled = true; c.drawImage(TRACE, L + ch * third + 8, T, third - 16, PH);
  });
  const img = document.getElementById('parade');
  img.src = cv.toDataURL();
  PARADE = img.decode().catch(() => {});
}
function grade(P) { const fn = look(P), vals = SAMPLES.map((s) => fn(s.v)); drawHisto(vals); drawParade(vals); }

function setUI(P, hot) {
  for (const [k] of WHEELS) {
    const [u, v] = P[k], disc = 84, pk = document.querySelector(`#w_${k} .puck`);
    place(pk, 95 + u * disc, 95 - v * disc);
    pk.classList.toggle('hot', hot === k);
    const rgb = wheelRGB(P[k]), base = k === 'gain' ? 1 : k === 'offset' ? 25 : 0, sc = k === 'gain' ? 0.7 : k === 'offset' ? 20 : 0.25;
    const vals = k === 'offset' ? rgb.map((x) => base + x * sc) : [base, ...rgb.map((x) => base + x * sc)];
    document.querySelectorAll(`#w_${k} .vals div`).forEach((d, i) => { d.firstChild.textContent = vals[i].toFixed(2); });
  }
  document.getElementById('f_con').firstChild.textContent = P.con.toFixed(3);
  document.getElementById('f_sat').firstChild.textContent = P.sat.toFixed(2);
  document.getElementById('f_con').classList.toggle('hot', hot === 'con');
}
const pk = (k, u, v) => { const [cx, cy] = wheelCenter(k); return [cx + u * 84, cy - v * 84]; };

const WARM = [-0.42, 0.16], TEAL = [0.24, -0.3];
const WH = { grab: 0.95, release: 3.45, end: 4.57 }, GR = { press: 0.9, release: 3.8, end: 4.25 }, LF = { grab: 0.9, end: 4.25 };
const NUM = { arrive: 0.75, press: 0.9, end: 2.126, distance: 80, value: 0.16 };
const numCenter = () => { const r = document.querySelector('#w_gamma .vals [data-c="G"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

const NUM_ANGLE = (205 + (135 - 120) / (135 - 70) * 45) * Math.PI / 180;
const NUM_DIR = [Math.sin(NUM_ANGLE), Math.cos(NUM_ANGLE)];
const NUM_SCALE = wheelRGB(NUM_DIR)[1] * 0.25;
const PERF = {};
function perf(act) {
  if (PERF[act]) return PERF[act];
  if (act === 'num') {
    const [fx, fy] = numCenter();
    return (PERF[act] = { pos: motion([[0, fx - 22, fy - 16], [NUM.arrive, fx, fy, 'out'], [NUM.press, fx, fy, 'hold'], [NUM.end, fx + NUM.distance, fy, 'in']]),
      kinds: [[0, 'arrow'], [NUM.arrive, 'resize']], f: [fx, fy] });
  }
  if (act === 'grade') {
    const fc = document.getElementById('f_con').getBoundingClientRect(), fx = fc.left + fc.width / 2 + 10, fy = fc.top + fc.height / 2;
    return (PERF[act] = { pos: motion([[0, fx - 18, fy + 3], [0.8, fx, fy, 'out'], [0.95, fx, fy, 'hold'], [3.75, fx + 50, fy], [3.85, fx + 50, fy, 'hold'], [GR.end, fx + 58, fy + 1, 'in']]),
      kinds: [[0, 'arrow'], [0.6, 'resize'], [GR.release, 'arrow']], f: [fx, fy] });
  }
  if (act === 'lift') {
    const [ax, ay] = pk('lift', 0, 0), [bx, by] = pk('lift', ...TEAL);
    return (PERF[act] = { pos: motion([[0, ax - 16, ay - 10], [0.8, ax, ay, 'out'], [0.95, ax, ay, 'hold'], [4.9, bx, by]]),
      kinds: [[0, 'arrow'], [LF.grab, 'grab']], a: [ax, ay] });
  }
  const [ax, ay] = pk('gain', 0, 0), [bx, by] = pk('gain', ...WARM);
  return (PERF[act] = { pos: motion([[0, ax - 22, ay + 4], [0.85, ax, ay, 'out'], [1.0, ax, ay, 'hold'], [3.4, bx, by], [3.5, bx, by, 'hold'], [WH.end, bx + 18, by + 12, 'in']]),
    kinds: [[0, 'arrow'], [WH.grab, 'grab'], [WH.release, 'arrow']], a: [ax, ay] });
}
const fromPuck = (Pf, t, t0, t1) => { const [x, y] = Pf.pos(clamp(t, t0, t1)), [ax, ay] = Pf.a; return [(x - ax) / 84, -(y - ay) / 84]; };
function renderAt(act, t) {
  const Pf = perf(act), c = cursorAt(t, Pf);
  let P, hot = null;
  if (act === 'num') {
    const [x] = Pf.pos(Math.max(t, NUM.press));

    const value = clamp((x - Pf.f[0]) * NUM.value / NUM.distance, 0, NUM_SCALE), m = value / NUM_SCALE;
    P = { lift: TEAL, gamma: NUM_DIR.map((v) => v * m), gain: WARM, offset: [0, 0], con: 1.62, sat: 50 };
  } else if (act === 'grade') {
    const [x] = Pf.pos(clamp(t, GR.press, GR.release)), con = 1 + (0.62 * (x - Pf.f[0])) / 50;
    P = { lift: [0, 0], gamma: [0, 0], gain: WARM, offset: [0, 0], con, sat: 50 }; hot = t > GR.press - 0.3 && t < GR.release + 0.3 ? 'con' : null;
  } else if (act === 'lift') {
    P = { lift: t < LF.grab ? [0, 0] : fromPuck(Pf, t, LF.grab, 99), gamma: [0, 0], gain: WARM, offset: [0, 0], con: 1.62, sat: 50 }; hot = t > LF.grab - 0.3 ? 'lift' : null;
  } else {
    P = { lift: [0, 0], gamma: [0, 0], gain: t < WH.grab ? [0, 0] : fromPuck(Pf, t, WH.grab, WH.release), offset: [0, 0], con: 1.0, sat: 50 }; hot = t > WH.grab - 0.3 && t < WH.release + 0.4 ? 'gain' : null;
  }
  setUI(P, hot); grade(P);
  cursor.set(c);
}

function focusAt(act, t, look) {
  if (look === 'numv') return numCenter();
  if (look === 'numup') { const [x, y] = perf(act).pos(t); return [x, y - 85]; }
  if (look === 'vals') { const [cx, cy] = wheelCenter('gain'); return [cx, cy + 62]; }
  if (look === 'hist') { const r = document.getElementById('histo').getBoundingClientRect(); return [r.left + HX + 0.5 * HW, r.top + HY + HH * 0.7]; }
  return perf(act).pos(t);
}
window.focusAt = focusAt;
window.hero = (act) => focusAt(act, 0);
window.ready = KIT.ready;
window.renderAt = renderAt;
