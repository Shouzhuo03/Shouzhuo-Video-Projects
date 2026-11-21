(function () {
  const O = window.Oil, W = 480, H = 296, VP = [240, 112], TAU = Math.PI * 2, V = Math.PI / 2;
  const NEAR = 244, FAR = 158;
  const CEIL = 28, FLOOR = 150, WL = 48, WR = 432;
  const toward = (x, y, y2) => VP[0] + (x - VP[0]) * (y2 - VP[1]) / (y - VP[1]);
  const yOn = (x0, y0, x) => VP[1] + (y0 - VP[1]) * (x - VP[0]) / (x0 - VP[0]);
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const ONE = () => [1, 1, 1];

  const FL = [0.85, 0.95, 0.9], MON = [0.6, 0.75, 1.0], WARM = [1.0, 0.8, 0.55];
  const MON_AT = [160, 168], LAMP_AT = [382, 204];
  const L = O.makeLight({
    ambient: [0.22, 0.28, 0.26],
    lamps: [
      { x: 246, y: 64, color: FL, power: 0.45, radius: 105 },
      { x: MON_AT[0], y: MON_AT[1], color: MON, power: 0.8, radius: 34, squash: 1.5, cone: { dir: -0.2, half: 1.15, soft: 0.5 } },
      { x: LAMP_AT[0], y: LAMP_AT[1], color: WARM, power: 1.5, radius: 28, squash: 2.1 },
      { x: 398, y: 152, color: WARM, power: 0.22, radius: 55 },
    ],
  });

  const WPATCH = O.rough([[202, CEIL], [350, CEIL], [370, FLOOR], [184, FLOOR]], 0.5, 21);
  const FLP = [0.92, 0.98, 0.93];
  const Lwp = (x, y) => add(L(x, y), FLP, 0.92 - 0.3 * O.clamp((y - CEIL) / (FLOOR - CEIL)));
  const DP = [[194, FAR], [290, FAR], [toward(290, FAR, NEAR), NEAR], [toward(194, FAR, NEAR), NEAR]];
  const DPATCH = O.rough(DP, 0.5, 22);

  const pen = y => 0.8 + 7 * Math.pow(O.clamp((y - FAR) / (NEAR - FAR)), 1.2);
  const patchPoly = d => {
    const ys = []; for (let i = 0; i <= 10; i++) ys.push(FAR + (NEAR + 3 - FAR) * i / 10);
    const pts = ys.map(y => [toward(DP[0][0], FAR, y) - d * pen(y), y]).concat(ys.slice().reverse().map(y => [toward(DP[1][0], FAR, y) + d * pen(y), y]));
    return O.rough(pts, 0.5, 30 + d);
  };

  const kdp = y => 1.12 - 0.58 * Math.pow(O.clamp((y - FAR) / (NEAR - FAR)), 0.75);
  const Ldp = (x, y) => add(scl(L(x, y), 0.9), FLP, kdp(y));
  const sm = u => { u = O.clamp(u); return u * u * (3 - 2 * u); };
  const fdp = (x, y) => { const p = 2 * pen(y); return sm((x - toward(DP[0][0], FAR, y)) / p + 0.5) * sm((toward(DP[1][0], FAR, y) - x) / p + 0.5); };
  const LdpSoft = (x, y) => add(scl(L(x, y), 0.9), FLP, kdp(y) * fdp(x, y));
  const Ldim = k => (x, y) => scl(L(x, y), k);

  const CEILING = [[-20, -20], [500, -20], [500, yOn(WR, CEIL, 500)], [WR, CEIL], [WL, CEIL], [-20, yOn(WL, CEIL, -20)]];
  const FLOORP = [[-20, yOn(WL, FLOOR, -20)], [WL, FLOOR], [WR, FLOOR], [500, yOn(WR, FLOOR, 500)], [500, 300], [-20, 300]];
  const LEFTW = [[-20, yOn(WL, CEIL, -20)], [WL, CEIL], [WL, FLOOR], [-20, yOn(WL, FLOOR, -20)]];
  const RIGHTW = [[WR, CEIL], [500, yOn(WR, CEIL, 500)], [500, yOn(WR, FLOOR, 500)], [WR, FLOOR]];

  function scumble(g, pts, col, light, seed, o = {}) {
    O.region(g, pts, Object.assign({ color: col, light, base: 0, dir: V, dj: 0.3, len: [18, 40], w: [5, 10], cover: 0.45, dry: 0.35, a: 0.22, jitter: 0.08, cj: 10, seed }, o));
  }
  const wallStroke = { dir: V, dj: 0.2, len: [24, 50], w: [6, 11], cover: 1.9, dry: 0.08, a: 0.55, jitter: 0.05, cj: 7 };
  function room(g) {
    O.region(g, CEILING, { color: '#5C665E', light: Ldim(0.75), dir: 0, len: [24, 50], w: [4, 8], cover: 1.6, dry: 0.1, a: 0.55, seed: 'ceil' });

    for (const y of [1.5, 12, 19.5, 24.5]) O.line(g, [[-20, y], [500, y]], { w: 0.6, col: [14, 20, 18], a: 0.35, nb: 1, seed: 100 + y });
    for (let k = 0; k <= 9; k++) { const x = WL + 2 + k * 42.6; O.line(g, [[x, CEIL], [toward(x, CEIL, -20), -20]], { w: 0.6, col: [14, 20, 18], a: 0.3, nb: 1, seed: 120 + k }); }
    O.region(g, FLOORP, { color: '#4A514C', light: L, dir: 0, len: [30, 60], w: [5, 9], cover: 1.6, dry: 0.1, a: 0.6, seed: 'floor' });
    O.region(g, rect(WL, CEIL, WR, FLOOR), Object.assign({ color: (x, y) => O.mixc('#888C7A', '#788A82', O.fbm(x * 0.025, y * 0.04, 11, 3)), light: L, seed: 'farwall' }, wallStroke));
    O.region(g, LEFTW, Object.assign({ color: (x, y) => O.mixc('#76826C', '#687C78', O.fbm(x * 0.03, y * 0.03, 12, 3)), light: (x, y) => O.mul([0.72, 0.78, 0.8], L(x, y)), seed: 'leftwall' }, wallStroke));
    O.region(g, RIGHTW, Object.assign({ color: (x, y) => O.mixc('#7E8670', '#6E8078', O.fbm(x * 0.03, y * 0.03, 13, 3)), light: (x, y) => O.mul([0.8, 0.82, 0.82], L(x, y)), seed: 'rightwall' }, wallStroke));
    scumble(g, rect(WL, CEIL, WR, FLOOR), '#9AA08A', L, 'scf');
    scumble(g, LEFTW, '#8E9886', (x, y) => O.mul([0.72, 0.78, 0.8], L(x, y)), 'scl');
    scumble(g, RIGHTW, '#9A9A84', (x, y) => O.mul([0.8, 0.82, 0.82], L(x, y)), 'scr');
    O.region(g, rect(WL, FLOOR - 4, WR, FLOOR), { color: '#2E3430', light: L, dir: 0, len: [20, 40], w: [2, 3], cover: 2, seed: 'base' });
    O.line(g, [[WL, CEIL], [WL, FLOOR]], { w: 1.6, col: [18, 24, 21], a: 0.6, seed: 3 });
    O.line(g, [[WR, CEIL], [WR, FLOOR]], { w: 1.6, col: [18, 24, 21], a: 0.6, seed: 4 });
    O.line(g, [[WL, CEIL], [WR, CEIL]], { w: 1.2, col: [18, 24, 21], a: 0.5, seed: 5 });
  }

  function wallPatch(g) {
    O.region(g, WPATCH, Object.assign({ color: (x, y) => O.mixc('#8A8E7E', '#84907E', O.fbm(x * 0.04, y * 0.03, 4, 3)), light: Lwp, seed: 'wpatch' }, wallStroke, { a: 0.62, cover: 2.2, jitter: 0.055, cj: 8 }));
    scumble(g, WPATCH, (x, y) => O.mixc('#A6AA92', '#8E9C92', O.fbm(x * 0.05, y * 0.05, 14, 2)), Lwp, 'scp', { cover: 0.55, a: 0.16, dj: 0.15 });
    O.region(g, rect(184, FLOOR - 4, 370, FLOOR), { color: '#2E3430', light: Lwp, dir: 0, len: [20, 40], w: [2, 3], cover: 2, seed: 'basep' });
  }

  const WIN = [60, 38, 178, 138];
  function windowOut(g) {
    const [x0, y0, x1, y1] = WIN, R0 = rect(x0, y0, x1, y1);
    g.save(); O.path(g, R0); g.clip();

    O.region(g, R0, { color: (x, y) => O.mixc(O.mixc('#060A1A', '#141B38', O.clamp((y - y0) / 56)), '#34304A', Math.pow(O.clamp((y - 92) / 46), 1.6) * 0.9), light: ONE, dir: 0, len: [10, 22], w: [3, 5], cover: 2, dry: 0.05, a: 0.7, seed: 'night' });

    const T = { A: [50, 30, 72, '#111626'], B: [80, 26, 52, '#0A0E1A'], C: [106, 18, 96, '#181E30'], D: [123, 33, 62, '#0D121F'], E: [156, 26, 84, '#131929'] };
    for (const k of ['C', 'A', 'E', 'B', 'D']) {
      const [bx, bw, top, c] = T[k];
      O.region(g, rect(bx, top, bx + bw, y1 + 4), { color: c, light: ONE, dir: V, len: [8, 16], w: [2.5, 4], cover: 1.8, a: 0.9, dry: 0.1, seed: 'tower' + k });
      O.line(g, [[bx + 0.5, y1], [bx + 0.5, top + 0.5], [bx + bw - 0.5, top + 0.5]], { w: 0.7, col: [44, 50, 74], a: 0.6, nb: 1, dry: 0.2, seed: k.charCodeAt(0) });
    }

    const cells = [[84, 66, 0], [88.5, 66, 0], [93, 66, 0], [88, 96, 1], [127, 78, 0], [131.5, 78, 0], [136, 78, 0], [145, 78, 0], [140, 104, 0], [61, 90, 0], [162, 100, 0], [166.5, 100, 0], [171, 118, 1]];
    for (const [wx, wy, warm] of cells) O.stroke(g, [[wx, wy], [wx + 2.6, wy]], { w: 2.1, col: warm ? [224, 182, 108] : [178, 206, 188], a: 0.88, nb: 2, dry: 0, seed: wx * 7 + wy });
    for (const [gx, gy, gw] of [[83, 66, 14], [126, 78, 23], [161, 100, 9]]) O.glaze(g, O.ellipse(gx + gw / 2, gy, gw * 0.7, 3), 'rgba(160,200,180,1)', 0.12, 'screen', 2);
    O.stroke(g, [[92.6, 50.6], [93.2, 50.6]], { w: 1.3, col: [110, 30, 26], a: 0.9, nb: 1, dry: 0, seed: 77 });
    O.glaze(g, [[146, y0], [x1, y0], [x1, y1], [158, y1]], 'rgba(170,210,190,1)', 0.05, 'screen', 3);
    g.restore();
    const frame = [34, 42, 38];
    for (const [a, b, w] of [[[x0 - 2, y0 - 1.5], [x1 + 2, y0 - 1.5], 3], [[x0 - 1.5, y0 - 2], [x0 - 1.5, y1 + 1], 3], [[x1 + 1.5, y0 - 2], [x1 + 1.5, y1 + 1], 3],
                             [[99.3, y0], [99.3, y1], 2.2], [[138.6, y0], [138.6, y1], 2.2]]) {
      O.line(g, [a, b], { w, col: O.mul(frame, O.mul([1.6, 1.6, 1.6], L((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))), a: 0.95, seed: a[0] * 3 + a[1] });
    }
    O.region(g, [[x0 - 5, y1], [x1 + 5, y1], [x1 + 7, y1 + 4], [x0 - 7, y1 + 4]], { color: '#8E9688', light: L, dir: 0, len: [14, 28], w: [2, 3], cover: 2, seed: 'sill' });
  }

  const CLOCK = [334, 60, 10.5];
  function clock(g) {
    const [cx, cy, r] = CLOCK;
    O.glaze(g, O.ellipse(cx + 0.8, cy + 3.4, r + 1.6, r + 1.6), 'rgba(20,32,26,1)', 0.45, 'multiply', 1.4);
    O.region(g, O.ellipse(cx, cy, r + 1.7, r + 1.7), { color: '#1C201E', light: Lwp, dir: 0, len: [4, 8], w: [1.4, 2.4], cover: 2, seed: 'clockrim' });
    O.region(g, O.ellipse(cx, cy, r, r), { color: '#E6E8DD', light: Lwp, dir: (x, y) => Math.atan2(y - cy, x - cx) + V, len: [4, 9], w: [1.4, 2.4], cover: 2.6, seed: 'clockface' });
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU, l = k % 3 ? 1.4 : 2.6;
      O.stroke(g, [[cx + Math.sin(a) * (r - 1.4), cy - Math.cos(a) * (r - 1.4)], [cx + Math.sin(a) * (r - 1.4 - l), cy - Math.cos(a) * (r - 1.4 - l)]], { w: k % 3 ? 0.6 : 1.0, col: [40, 44, 40], a: 0.9, nb: 1, dry: 0, seed: k });
    }
  }

  const CAB = [386, 60, 430, 154];
  function cabinet(g) {
    const [x0, y0, x1, y1] = CAB, s = (FLOOR - VP[1]) / (y1 - VP[1]), bx = VP[0] + (x0 - VP[0]) * s, by = VP[1] + (y0 - VP[1]) * s, xm = (x0 + x1) / 2;
    O.glaze(g, [[bx - 6, by + 4], [bx, by], [bx, FLOOR], [bx - 8, FLOOR]], 'rgba(10,16,12,1)', 0.35, 'multiply', 3);
    const Lc = (x, y) => O.mul([0.92, 0.95, 0.95], L(x, y));
    O.region(g, [[bx, by], [x0, y0], [x0, y1], [bx, FLOOR]], { color: '#56625B', light: Lc, dir: V, len: [10, 22], w: [2, 4], cover: 2.2, seed: 'cabside' });
    O.region(g, rect(x0, y0, x1, y1), { color: '#6C7871', light: Lc, dir: V, len: [12, 26], w: [3, 5], cover: 2.2, dry: 0.12, seed: 'cabfront' });
    O.line(g, [[x0, y0 + 0.6], [x1, y0 + 0.6]], { w: 1.2, col: O.mul([150, 165, 155], Lc(xm, y0)), a: 0.8, seed: 31 });
    O.region(g, [[xm - 0.4, y0 + 3], [xm + 2.2, y0 + 3], [xm + 2.2, y1 - 6], [xm - 0.4, y1 - 6]], { color: '#050706', light: ONE, dir: V, len: [6, 12], w: [1, 1.6], cover: 3, seed: 'gap' });
    O.line(g, [[xm + 2.6, y0 + 3], [xm + 2.6, y1 - 6]], { w: 0.9, col: O.mul([190, 180, 150], Lc(xm + 3, 120)), a: 0.85, nb: 1, seed: 32 });
    for (const hx of [xm - 3.2, xm + 5.4]) O.line(g, [[hx, 98], [hx, 108]], { w: 1.2, col: [26, 30, 28], a: 0.9, nb: 1, seed: 33 + hx });
    O.line(g, [[x0, y1], [x1, y1]], { w: 1.6, col: [12, 16, 14], a: 0.8, seed: 34 });
  }

  function fixture(g, xa, xb, yF, yN, lit, seed) {
    const na = toward(xa, yF, yN), nb = toward(xb, yF, yN), th = (yF - yN) * 0.28;
    O.region(g, [[na - 1, yN - th], [nb + 1, yN - th], [nb + 0.6, yN], [xb + 0.6, yF + 0.6], [xa - 0.6, yF + 0.6], [na - 0.6, yN]], { color: '#1A201D', light: ONE, dir: 0, len: [8, 16], w: [1.2, 2], cover: 2.4, seed: seed + 'h' });
    const diff = O.rough([[na + 1, yN + 0.5], [nb - 1, yN + 0.5], [xb - 1, yF - 0.4], [xa + 1, yF - 0.4]], 0.25, seed.length + xa, 2);
    if (lit) {
      O.region(g, diff, { color: '#EEF9F0', light: ONE, dir: 0, len: [10, 22], w: [1.4, 2.4], cover: 2.6, jitter: 0.02, seed: seed + 'd' });
      for (const u of [0.3, 0.7]) {
        const yy = O.lerp(yN, yF, u), xa2 = toward(xa, yF, yy), xb2 = toward(xb, yF, yy);
        O.stroke(g, [[xa2 + 3, yy], [xb2 - 3, yy]], { w: 1.2, col: [255, 255, 250], a: 0.8, nb: 1, dry: 0.05, seed: seed.length * 9 + u * 10 });
      }
    } else O.region(g, diff, { color: '#3C4642', light: ONE, dir: 0, len: [8, 18], w: [1.2, 2.2], cover: 2.4, seed: seed + 'd' });
  }
  function fixtures(g) {
    for (const [xa, xb, k] of [[76, 152, 'f1'], [204, 280, 'f2'], [332, 408, 'f3']]) fixture(g, xa, xb, 25, 21.6, false, k);
    for (const [xa, xb, lit, k] of [[34, 148, false, 'n1'], [192, 300, true, 'n2'], [344, 458, false, 'n3']]) fixture(g, xa, xb, 15, 6, lit, k);
  }

  function chair(g) {
    const x0 = 203, x1 = 277, y0 = 90, y1 = 160, r = 15;
    const back = O.ellipse(x0 + r, y0 + r, r, r, 10, Math.PI, Math.PI * 1.5).concat(O.ellipse(x1 - r, y0 + r, r, r, 10, Math.PI * 1.5, TAU), [[x1 + 1, y1], [x0 - 1, y1]]);
    O.glaze(g, back.map(([x, y]) => [x + 2, y + 6]), 'rgba(10,16,12,1)', 0.35, 'multiply', 4);
    for (const ax of [193, 278]) {
      O.region(g, rect(ax + 3.5, 153, ax + 6.5, 160), { color: '#1A1E21', light: L, dir: V, len: [3, 6], w: [1, 1.6], cover: 2.6, seed: 'armpost' + ax });
      O.region(g, O.rough(rect(ax, 149.5, ax + 10, 153.5), 0.3, ax), { color: '#22272B', light: (x, y) => add(L(x, y), FL, 0.15), dir: 0, len: [4, 8], w: [1.2, 2], cover: 2.6, seed: 'armpad' + ax });
    }
    O.region(g, back, { color: '#2E343C', light: (x, y) => add(L(x, y), FL, 0.35 * O.clamp((104 - y) / 14)), dir: V, dj: 0.08, len: [10, 22], w: [2.5, 4], cover: 2.4, seed: 'chair' });
    O.line(g, O.ellipse(x0 + r, y0 + r, r - 0.6, r - 0.6, 8, Math.PI * 1.05, Math.PI * 1.5).concat(O.ellipse(x1 - r, y0 + r, r - 0.6, r - 0.6, 8, Math.PI * 1.5, Math.PI * 1.95)), { w: 1.4, col: [176, 204, 190], a: 0.6, seed: 41 });
    O.line(g, [[x0 + 0.8, y0 + r + 2], [x0 + 0.8, y1 - 4]], { w: 1.1, col: [96, 128, 190], a: 0.45, seed: 42 });
    O.line(g, [[x1 - 0.8, y0 + r + 6], [x1 - 0.8, y1 - 8]], { w: 1.0, col: [190, 150, 100], a: 0.3, seed: 43 });
  }

  const DESK = [[84, FAR], [396, FAR], [500, yOn(396, FAR, 500)], [500, NEAR], [-20, NEAR], [-20, yOn(84, FAR, -20)]];
  const deskCol = (x, y) => O.mixc('#A69C84', '#969A8E', O.fbm(x * 0.03, y * 0.06, 9, 3));
  const deskStroke = { dir: 0, dj: 0.03, len: [16, 38], w: [3.5, 7], cover: 2.1, dry: 0.08, a: 0.6, jitter: 0.03, cj: 5 };
  function desk(g) {
    O.glaze(g, [[70, FAR - 3], [410, FAR - 3], [420, FAR + 2], [60, FAR + 2]], 'rgba(10,14,12,1)', 0.5, 'multiply', 2);
    O.region(g, DESK, Object.assign({ color: deskCol, light: Ldim(0.85), seed: 'desk' }, deskStroke));

    O.region(g, patchPoly(1), Object.assign({}, deskStroke, { color: deskCol, light: LdpSoft, dir: (x, y) => Math.atan2(VP[1] - y, VP[0] - x), dj: 0.05, len: [14, 30], w: [3, 6], cover: 2.6, a: 0.66, seed: 'deskpatch' }));
    O.line(g, [[84, FAR], [396, FAR]], { w: 1, col: [30, 36, 32], a: 0.6, seed: 51 });
    O.glaze(g, [[204, FAR], [276, FAR], [284, FAR + 9], [272, FAR + 14], [208, FAR + 14], [196, FAR + 9]], 'rgba(26,40,36,1)', 0.55, 'multiply', 3);
    O.line(g, [[DP[0][0], FAR + 0.3], [DP[1][0], FAR + 0.3]], { w: 0.9, col: [214, 232, 214], a: 0.45, nb: 1, seed: 56 });
    O.line(g, [[84, FAR], [-20, yOn(84, FAR, -20)]], { w: 1.2, col: [120, 130, 124], a: 0.3, seed: 52 });
    O.line(g, [[396, FAR], [500, yOn(396, FAR, 500)]], { w: 1.2, col: [150, 140, 120], a: 0.35, seed: 53 });

    O.region(g, rect(-30, NEAR, 510, H + 4), { color: (x, y) => O.mixc('#5E6C64', '#4A5650', O.clamp((y - NEAR) / 50)), light: (x, y) => scl(L(x, NEAR - 6), 0.72), dir: V, dj: 0.06, len: [20, 40], w: [5, 9], cover: 2.2, dry: 0.1, a: 0.6, jitter: 0.1, cj: 8, seed: 'deskfront' });
    scumble(g, rect(-30, NEAR, 510, H + 4), '#7A8A80', (x, y) => scl(L(x, NEAR - 6), 0.72), 'scd', { cover: 0.5 });
    O.glaze(g, rect(-30, NEAR, 510, NEAR + 5), 'rgba(150,175,165,1)', 0.08, 'screen', 1.5);
    const [nl, nr] = [DP[3][0], DP[2][0]];
    O.line(g, [[-30, NEAR + 0.6], [510, NEAR + 0.6]], { w: 1.4, col: [70, 80, 74], a: 0.6, seed: 54 });
    O.line(g, [[nl + 6, NEAR + 0.6], [nr - 6, NEAR + 0.6]], { w: 1.4, col: [200, 216, 200], a: 0.45, seed: 55 });
  }
  const sAt = y => (y - VP[1]) / (NEAR - VP[1]);

  function monitor(g) {
    O.glaze(g, [[94, 178], [158, 175], [166, 194], [88, 196]], 'rgba(8,12,10,1)', 0.45, 'multiply', 2.5);

    O.glaze(g, [[160, 146], [222, 150], [240, 206], [164, 198]], 'rgba(110,150,235,1)', 0.3, 'screen', 7);
    O.glaze(g, [[162, 130], [206, 118], [210, 160], [164, 172]], 'rgba(120,160,240,1)', 0.12, 'screen', 9);
    const Lm = (x, y) => scl(L(x, y), 0.8);
    O.region(g, O.ellipse(126, 186, 21, 4.2), { color: '#8E8A7A', light: Lm, dir: 0, len: [5, 10], w: [1.4, 2.2], cover: 2.4, seed: 'monfoot' });
    O.region(g, [[117, 170], [136, 170], [138, 185], [115, 185]], { color: '#7A7666', light: Lm, dir: V, len: [4, 8], w: [1.4, 2.2], cover: 2.4, seed: 'monneck' });

    const tube = [[138, 121], [113, 128], [99, 136], [95, 146], [96, 158], [101, 166], [114, 170], [138, 173]];
    O.region(g, tube, { color: '#868272', light: (x, y) => add(Lm(x, y), FL, 0.2 * O.clamp((134 - y) / 10)), dir: (x, y) => Math.atan2(y - 147, x - 140) * 0.35, dj: 0.1, len: [6, 14], w: [2, 3.2], cover: 2.4, seed: 'montube' });
    for (let k = 0; k < 4; k++) O.line(g, [[108 + k * 5, 137 - k * 1.4], [109 + k * 5, 156 - k * 0.4]], { w: 0.7, col: [26, 28, 24], a: 0.35, nb: 1, seed: 60 + k });
    O.region(g, [[136, 118], [152, 116], [156, 177], [137, 175]], { color: (x, y) => O.mixc('#9A9584', '#ACA693', O.clamp((x - 136) / 18)), light: (x, y) => add(Lm(x, y), FL, 0.24 * O.clamp((126 - y) / 8)), dir: V, dj: 0.06, len: [8, 16], w: [2, 3.2], cover: 2.4, seed: 'mon' });
    O.line(g, [[99, 136], [113, 128], [138, 121]], { w: 1.0, col: [150, 170, 158], a: 0.4, seed: 61 });
    O.line(g, [[136.5, 118], [152, 116]], { w: 1.1, col: [176, 196, 184], a: 0.55, nb: 2, seed: 63 });
    O.line(g, [[137, 119], [137.6, 174]], { w: 0.8, col: [40, 42, 36], a: 0.5, nb: 1, seed: 64 });
    O.region(g, [[151, 117], [158, 116], [161, 177], [155, 176]], { color: '#A8AEB4', light: (x, y) => add(Lm(x, y), MON, 0.75), dir: V, len: [6, 12], w: [1.2, 2], cover: 2.6, seed: 'bezel' });
    O.stroke(g, [[160.6, 119], [162, 175]], { w: 1.5, col: [196, 220, 255], a: 0.95, nb: 2, dry: 0.05, seed: 62 });
    O.glaze(g, [[158, 116], [168, 118], [170, 176], [160, 178]], 'rgba(150,190,255,1)', 0.35, 'screen', 3);
  }

  function papers(g) {
    const cx = 342, yF = 175, yN = 186, wF = 44, hh = 6;
    const xs = y => [toward(cx - wF / 2, yF, y), toward(cx + wF / 2, yF, y)];
    const [na, nb] = xs(yN);
    O.glaze(g, [[na - 2, yN - 1], [nb + 7, yN - 1], [nb + 5, yN + 6], [na - 6, yN + 6]], 'rgba(20,16,10,1)', 0.45, 'multiply', 1.6);
    const r = O.rng('stack'), layers = ['#B4874A', '#E6E0D0', '#DCD6C4', '#8C989C', '#E8E3D4', '#B98E54', '#E2DCCB', '#E9E5D7', '#A38050', '#E6E1D2'];
    layers.forEach((c, k) => {
      const y = yN - k * (hh / layers.length), dx = (r() - 0.5) * 2.4;
      O.region(g, [[na + dx - 0.6, y - hh / layers.length - 0.4], [nb + dx + 0.6, y - hh / layers.length - 0.4], [nb + dx + 0.6, y], [na + dx - 0.6, y]], { color: c, light: L, dir: 0, len: [6, 14], w: [0.7, 1.1], cover: 2.6, jitter: 0.05, seed: 'layer' + k });
    });
    const top = (dx, dy, col, seed) => {
      const a = yF - hh + dy, b = yN - hh + dy, [xa, xb] = [cx - wF / 2 + dx, cx + wF / 2 + dx];
      O.region(g, [[xa, a], [xb, a], [toward(xb, a, b), b], [toward(xa, a, b), b]], { color: col, light: L, dir: 0, len: [8, 16], w: [1.4, 2.4], cover: 2.4, jitter: 0.04, seed });
    };
    top(-1, 0.2, '#DCD6C4', 'top1'); top(1.4, -0.3, '#E2DDCC', 'top2');
    for (let k = 0; k < 4; k++) O.line(g, [[cx - 13, yF - hh + 2.4 + k * 2.1], [cx + 11 - (k % 2) * 7, yF - hh + 2.4 + k * 2.1]], { w: 0.55, col: [120, 110, 96], a: 0.4, nb: 1, seed: 80 + k });
  }

  function mug(g) {
    const x = 352, y = 206, rx = 7.4, ry = 2.2, h = 14;
    O.glaze(g, O.ellipse(x - 2, y + h + 0.5, rx * 1.2, ry * 1.1), 'rgba(20,16,10,1)', 0.5, 'multiply', 1.2);
    O.line(g, O.ellipse(x + rx - 0.6, y + 6, 4.4, 4.2, 16, -Math.PI / 2 - 0.25, Math.PI / 2 + 0.25), { w: 1.9, taper: 0.02, col: O.mul([226, 222, 210], L(x + 10, y + 6)), a: 0.95, nb: 2, seed: 90 });
    O.region(g, [[x - rx, y], [x + rx, y], [x + rx, y + h - 1], [x + rx * 0.8, y + h], [x - rx * 0.8, y + h], [x - rx, y + h - 1]],
      { color: (px) => O.mixc('#E8E4DA', '#9C9A92', O.clamp((x - px) / rx * 0.5 + 0.3)), light: L, dir: V, len: [4, 8], w: [1.2, 2], cover: 2.8, seed: 'mug' });
    O.region(g, O.ellipse(x, y, rx, ry, 24), { color: '#D8D4C8', light: L, dir: 0, len: [3, 6], w: [1, 1.6], cover: 2.8, seed: 'mugrim' });
    O.region(g, O.ellipse(x, y + 0.4, rx - 1.1, ry - 0.6, 24), { color: '#2A1C14', light: ONE, dir: 0, len: [3, 6], w: [0.8, 1.4], cover: 3, seed: 'coffee' });
    O.line(g, O.ellipse(x + 26, y + 18, 6, 1.7, 20, 0.4, TAU - 0.6), { w: 0.6, col: [110, 80, 50], a: 0.35, nb: 1, seed: 91 });
  }

  function deskLamp(g) {
    const bx = 428, by = 216;
    O.glaze(g, O.ellipse(bx - 5, by + 1.6, 17, 3.6), 'rgba(16,12,8,1)', 0.5, 'multiply', 1.2);
    O.region(g, O.ellipse(bx, by, 13, 3.6, 24), { color: '#262A28', light: L, dir: 0, len: [4, 8], w: [1.2, 2], cover: 2.6, seed: 'lampbase' });
    O.line(g, [[bx - 9, by - 1.4], [bx + 6, by - 2.6]], { w: 0.8, col: [200, 160, 110], a: 0.5, nb: 1, seed: 92 });
    O.line(g, [[bx, by - 2], [bx + 7, 176]], { w: 2, col: [34, 36, 34], a: 0.95, seed: 93 });
    O.line(g, [[bx + 7, 176], [405, 151]], { w: 1.8, col: [34, 36, 34], a: 0.95, seed: 94 });
    O.region(g, O.ellipse(bx + 7, 176, 2, 2, 10), { color: '#1E201F', light: ONE, dir: 0, len: [2, 3], w: [0.8, 1], cover: 3, seed: 'joint' });

    const ax = -0.6, ay = 0.8, px = 0.8, py = 0.6, c = [392, 166], top = [404.5, 150];
    const arc = []; for (let k = 0; k <= 20; k++) { const t = k / 20 * Math.PI; arc.push([c[0] + Math.cos(t) * 13 * px + Math.sin(t) * 4 * ax, c[1] + Math.cos(t) * 13 * py + Math.sin(t) * 4 * ay]); }
    const body = [[top[0] + 4 * px, top[1] + 4 * py]].concat(arc, [[top[0] - 4 * px, top[1] - 4 * py]]);
    O.region(g, body, { color: '#2A302C', light: (x, y) => add(L(x, y), FL, 0.25), dir: (x, y) => Math.atan2(ay, ax), len: [5, 10], w: [1.4, 2.4], cover: 2.6, seed: 'shade' });
    const inner = []; for (let k = 0; k <= 24; k++) { const t = k / 24 * TAU; inner.push([c[0] + Math.cos(t) * 12.4 * px - Math.sin(t) * 3.6 * ax, c[1] + Math.cos(t) * 12.4 * py - Math.sin(t) * 3.6 * ay]); }
    O.region(g, inner, { color: (x, y) => O.mixc('#FFF2D0', '#E8A858', O.clamp(Math.hypot(x - c[0], y - c[1]) / 12)), light: ONE, dir: Math.atan2(py, px), len: [4, 8], w: [1.2, 2], cover: 2.6, seed: 'shadein' });
    O.line(g, [[top[0] - 3 * px, top[1] - 3 * py], [c[0] - 12 * px, c[1] - 12 * py]], { w: 0.9, col: [150, 170, 160], a: 0.45, nb: 1, seed: 95 });
  }

  function glow(g) {
    O.glaze(g, O.ellipse(246, 10, 78, 13), 'rgba(205,250,225,1)', 0.22, 'screen', 6);
    O.glaze(g, [[196, 15], [296, 15], [DP[2][0], NEAR], [DP[3][0], NEAR]], 'rgba(200,240,215,1)', 0.035, 'screen', 8);
    O.glaze(g, O.ellipse(390, 168, 20, 11), 'rgba(255,212,150,1)', 0.5, 'screen', 5);
    O.glaze(g, O.ellipse(LAMP_AT[0], LAMP_AT[1], 54, 18), 'rgba(255,196,120,1)', 0.12, 'screen', 8);
    O.glaze(g, O.ellipse(178, 160, 24, 30), 'rgba(140,180,255,1)', 0.12, 'screen', 8);
    O.finish(g, W, H, { vignette: 0.85, vignetteColor: '#1C2628', tint: ['#4A6A66', 0.08], grain: 0.16 });
  }

  function paintBack(g) {
    O.ground(g, W, H, { tone: '#3E4A40', seed: 7 });
    const far = O.layer(W, H, f => { O.ground(f, W, H, { tone: '#3E4A40', seed: 7 }); room(f); wallPatch(f); windowOut(f); clock(f); cabinet(f); fixtures(f); });
    g.save(); g.filter = `blur(${0.35 * O.R}px)`; g.drawImage(far, 0, 0, W, H); g.restore();
    chair(g); desk(g);
    monitor(g); papers(g); mug(g); deskLamp(g);
    glow(g);
  }

  const KB = { yF: 187, yN: 200, xF: [203, 277] };
  const KBP = [[KB.xF[0], KB.yF], [KB.xF[1], KB.yF], [toward(KB.xF[1], KB.yF, KB.yN), KB.yN], [toward(KB.xF[0], KB.yF, KB.yN), KB.yN]];
  function paintFront(g) {
    const [a, b, c, d] = KBP;
    O.glaze(g, [[d[0] - 1, d[1]], [c[0] + 2, c[1]], [c[0] + 1, c[1] + 4], [d[0], d[1] + 4]], 'rgba(30,40,34,1)', 0.45, 'multiply', 1.2);
    O.region(g, [[d[0], d[1]], [c[0], c[1]], [c[0], c[1] + 2.6], [d[0], d[1] + 2.6]], { color: '#8E8A78', light: Ldp, dir: 0, len: [6, 12], w: [1, 1.6], cover: 2.6, seed: 'kblip' });
    O.region(g, KBP, { color: '#B0AA95', light: Ldp, dir: 0, len: [8, 16], w: [1.4, 2.4], cover: 2.4, jitter: 0.04, seed: 'kb' });
    for (let r = 0; r < 5; r++) {
      const y = O.lerp(KB.yF + 1.6, KB.yN - 1.4, r / 4), xa = toward(KB.xF[0], KB.yF, y) + 2.5, xb = toward(KB.xF[1], KB.yF, y) - 2.5, n = 15;
      for (let k = 0; k < n; k++) {
        if (r === 4 && k > 4 && k < 10) continue;
        const x = O.lerp(xa, xb, (k + 0.15) / n), w = (xb - xa) / n * (0.6 + 0.2 * O.hash(r, k, 3));
        O.stroke(g, [[x, y], [x + w, y + (O.hash(r, k, 4) - 0.5) * 0.3]], { w: 1.4 * sAt(y), col: [88 + 20 * O.hash(r, k, 5), 92, 84], a: 0.3 + 0.18 * O.hash(r, k, 6), nb: 2, dry: 0.1, seed: 200 + r * 20 + k });
      }
      if (r === 4) O.stroke(g, [[O.lerp(xa, xb, 5.15 / n), y], [O.lerp(xa, xb, 9.9 / n), y]], { w: 1.4 * sAt(y), col: [92, 94, 84], a: 0.42, nb: 1, dry: 0, seed: 299 });
    }
    O.line(g, [a, b], { w: 0.8, col: [220, 232, 220], a: 0.4, nb: 1, seed: 300 });
  }

  let cache = null;
  function build() {
    if (cache) return cache;
    const back = O.layer(W, H, paintBack), front = O.layer(W, H, paintFront);
    const blur = O.canvas(W * O.R / 2, H * O.R / 2), bg = blur.getContext('2d');
    bg.filter = `blur(${7 * O.R / 2}px)`; bg.drawImage(back, -20, -20, blur.width + 40, blur.height + 40);
    return (cache = { back, front, blur });
  }

  function flicker(t) {
    if (t < 30) return 0;
    const P = 13.3, u = (((t - 5.2) % P) + P) % P;
    if (u > 0.42) return 0;
    if (u < 0.05) return 0.75;
    if (u < 0.09) return 0.1;
    if (u < 0.12) return 0.45;
    if (u < 0.18) return 0.05;
    if (u < 0.26) return 0.85;
    return 0.5 * (1 - (u - 0.26) / 0.16);
  }
  function dimPatches(g, k, front) {
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(60,70,66,${0.6 * k})`;
    for (const p of front ? [KBP] : [WPATCH, DPATCH, [[190, 4], [302, 4], [300, 15], [190, 15]]]) { O.path(g, p); g.fill(); }
    if (!front) { g.fillStyle = `rgba(90,100,96,${0.25 * k})`; g.fillRect(-20, -20, W + 40, H + 40); }
    g.restore();
  }

  function hand(g, cx, cy, a, l, w, rgb, tail = 0) {
    const dx = Math.sin(a), dy = -Math.cos(a);
    for (const [k, al] of [[2.2, 0.22], [1, 0.9]]) {
      g.strokeStyle = `rgba(${rgb},${al})`; g.lineWidth = w * k; g.beginPath();
      g.moveTo(cx - dx * tail, cy - dy * tail); g.lineTo(cx + dx * l, cy + dy * l); g.stroke();
    }
  }
  function liveBack(g, t) {
    const [cx, cy, r] = CLOCK, hr = (11 + 40 / 60) / 12 * TAU, mn = 40 / 60 * TAU + t / 3600 * TAU, sc = (t % 60) / 60 * TAU;
    g.save(); g.lineCap = 'round';
    hand(g, cx, cy, hr, r * 0.5, 1.4, '28,30,28');
    hand(g, cx, cy, mn, r * 0.78, 0.95, '28,30,28');
    hand(g, cx, cy, sc, r * 0.86, 0.42, '160,48,40', 2.6);
    g.fillStyle = 'rgba(28,30,28,0.9)'; g.beginPath(); g.arc(cx, cy, 0.8, 0, TAU); g.fill();
    if ((t % 2.6) < 0.45) {
      const gr = g.createRadialGradient(92.9, 50.6, 0, 92.9, 50.6, 3.4);
      gr.addColorStop(0, 'rgba(255,90,60,0.95)'); gr.addColorStop(0.25, 'rgba(255,60,40,0.55)'); gr.addColorStop(1, 'rgba(255,60,40,0)');
      g.fillStyle = gr; g.fillRect(89, 47, 8, 8);
    }
    g.restore();

    const f = Math.floor(t * 30), s = 0.5 + 0.5 * Math.sin(t * 9.3 + Math.sin(t * 2.1) * 2);
    const k = 0.035 * s + 0.02 * O.hash(f, 17);
    g.save(); g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(170, 168, 0, 170, 168, 40);
    gr.addColorStop(0, `rgba(150,190,255,${k})`); gr.addColorStop(1, 'rgba(150,190,255,0)');
    g.fillStyle = gr; g.fillRect(120, 120, 100, 100);
    g.restore();
    const d = flicker(t); if (d > 0) dimPatches(g, d, false);
  }
  function liveFront(g, t) { const d = flicker(t); if (d > 0) dimPatches(g, d, true); }

  const light_ = { key: [0.75, 0.85, 1.0], keyDir: [-1, 0], fill: [0.25, 0.3, 0.28], rim: [1.0, 0.8, 0.55], rimDir: [1, 0] };

  window.DeskScenes = Object.assign(window.DeskScenes || {}, { work: { W, H, build, liveBack, liveFront, light: light_, style: 'oil' } });
})();
