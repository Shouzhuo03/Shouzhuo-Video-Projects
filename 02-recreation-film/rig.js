(() => {
  const {FPS, W, H, clamp, lerp, lnLerp, inOut, EASE, follower, spikeIn, spikeOut, spikeOutTotal, springTo, springStep, kick, add, sub, mul, mix, rot, len, norm, once} = M;
  const {F, TL, CURVE, shotIndex, X, BAR, GRAB_AT, HANG, AI, WIN, CONV, CANVAS} = STORY;
  const G = TUNE.global, CAM = TUNE.camera;

  const sOf = (c) => W / c.w;
  const project = (p, c) => [W / 2 + (p[0] - c.cx) * sOf(c), H / 2 + (p[1] - c.cy) * sOf(c)];
  const unproject = (P, c) => [c.cx + (P[0] - W / 2) / sOf(c), c.cy + (P[1] - H / 2) / sOf(c)];
  const halfH = (c) => (c.w * H) / W / 2;
  const camTop = (c) => c.cy - halfH(c), camBottom = (c) => c.cy + halfH(c);
  const camMix = (a, b, k) => ({w: lnLerp(a.w, b.w, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k)});
  const prog = (curve, f, f0, f1) => curve(clamp((f - f0) / (f1 - f0)));

  const V_PAN = CAM.panSpeed * FPS;
  const MATCH = CAM.match;
  const DEFOCUS = 3.0;

  const CURSOR = 30;
  const HOT = {arrow: [122, 70], hand: [256, 300]};
  const BODY = [232, 262];
  const RB = [((BODY[0] - HOT.arrow[0]) * CURSOR) / 512, ((BODY[1] - HOT.arrow[1]) * CURSOR) / 512];

  const LINE_Y = X.text.y + 12;
  const SW0 = [BAR.x - 6, LINE_Y], SW1 = [BAR.x + BAR.w + 4, LINE_Y];
  const P_PLAY = [X.video.x + X.video.w / 2, X.video.y + X.video.h / 2];
  const P_REST = [915, 690];
  const P_GRAB = [X.video.x + X.video.w * GRAB_AT[0], X.video.y + X.video.h * GRAB_AT[1]];
  const C = AI.composer, B = AI.send;
  const CHIP = {x: C.x + AI.chip.x, y: C.y + AI.chip.y, w: AI.chip.w, h: AI.chip.h};
  const CHIP_SCALE = CHIP.w / X.video.w;
  const P_SLAM = [CHIP.x + CHIP.w * GRAB_AT[0], CHIP.y + CHIP.h * GRAB_AT[1]];
  const P_INPUT = [560, C.y + 30];
  const P_REST2 = [545, 594];
  const BTN = [C.x + C.w - 12 - B / 2, C.y + C.h + C.grow - 12 - B / 2];
  const SEND_TIP = [...BTN];
  const P_OUT = [360, -90];
  const TAB = {x: 700, w: 150, h: 58};
  const P_GONE = [400, 2600];

  const TOP = {...CAM.top};
  const CLOSE = {cx: 572, cy: BAR.y + BAR.h / 2, w: CAM.close.w};
  const VID = {cx: P_PLAY[0], cy: P_PLAY[1], w: CAM.video.w};
  function cam1base(f) {
    let c = camMix(TOP, CLOSE, prog(CURVE('tilt'), f, F.tilt0, F.tilt1));
    c = {...c, w: c.w * lnLerp(1, 0.985, clamp((f - F.tilt1) / (F.pull0 - F.tilt1)))};
    if (f > F.pull0) c = camMix(c, {...VID, w: lnLerp(VID.w, VID.w * 0.985, clamp((f - F.pull1) / (F.cutB - F.pull1)))}, prog(CURVE('pull'), f, F.pull0, F.pull1));
    return c;
  }
  const panPeak = once(() => V_PAN / sOf(cam1base(F.cutB)));
  const panO = () => ({tc: F.cutB / FPS, t0: F.pan0 / FPS, peak: panPeak()});
  const panDist = (f) => (f <= F.pan0 ? 0 : spikeIn(f / FPS, panO()) - spikeIn(F.pan0 / FPS, panO()));
  const cam1 = (f) => { const c = cam1base(f); return {...c, cx: c.cx + panDist(f)}; };

  const S2C = {...CAM.s2};
  const s2v0 = once(() => (MATCH * V_PAN) / sOf({w: S2C.w0}));
  function cam2(f) {
    const v0 = s2v0(), cx = S2C.cx - spikeOutTotal(v0) + spikeOut((f - F.cutB) / FPS, {v0});
    const sh = kick(f, F.impact, 6, 0.1);
    return {w: lnLerp(S2C.w0, S2C.w1, clamp((f - F.cutB) / (F.cutC - F.cutB))), cx: cx + 1.5 * sh, cy: S2C.cy - 5 * sh};
  }

  function composerGrow(f) {
    if (f < F.impact - 3) return 0;
    const g = springTo(f, F.impact - 3, 0, 1, 4.2, 0.55);
    return f < F.fly0 ? g : springTo(f, F.fly0, springTo(F.fly0, F.impact - 3, 0, 1, 4.2, 0.55), 0, 3.4, 0.7);
  }
  const btnY = (f) => C.y + C.h + C.grow * composerGrow(f) - 12 - B / 2;
  const composerDrop = (f) => 10 * kick(f, F.impact, 3.4, 0.13);

  const MED = CAM.med;
  const S3X = -6, S3Y = 8;
  function cam3(f) {
    const c = {cx: BTN[0] + S3X, cy: btnY(f) + S3Y, w: lnLerp(CAM.send.w0, CAM.send.w1, clamp((f - F.cutC) / (F.pullOut0 - F.cutC)))};
    const med = {cx: MED.cx, cy: MED.cy, w: lnLerp(MED.w, MED.w1 ?? MED.w, clamp((f - F.pullOut1) / (F.cutE - F.pullOut1)))};
    return camMix(c, med, prog(CURVE('pullOut'), f, F.pullOut0, F.pullOut1));
  }

  const mv = (a, b, f0, f1, curve = EASE.go) => ({a, b, f0, f1, curve});
  function moveAt(m, f) {
    if (m.fn) return m.fn(f);
    return mul(sub(m.b, m.a), m.curve(clamp((f - m.f0) / (m.f1 - m.f0))));
  }
  function along(ms, f) { let p = ms.start || ms[0].a; for (const m of ms) p = add(p, moveAt(m, f)); return p; }

  function path(start) {
    const ms = []; ms.start = start; let p = start;
    ms.to = (b, f0, f1, curve = EASE.go) => { ms.push(mv(p, b, f0, f1, curve)); p = b; return ms; };
    ms.jump = (b, at) => { const d = sub(b, p); ms.push({jump: true, at, fn: (f) => (f >= at - 0.5 ? d : [0, 0])}); p = b; return ms; };
    ms.end = () => p;
    return ms;
  }

  const P_IN = once(() => unproject([1.1 * W, 0.92 * H], cam1(F.cursorIn)));
  const trackA = once(() => [mv(P_IN(), SW0, F.cursorIn, F.at1, CURVE('cursorIn')), mv(SW0, SW1, F.swipe0, F.swipe1, CURVE('swipe')), mv(SW1, P_PLAY, F.toPlay0, F.toPlay1, CURVE('toPlay')),
    mv(P_PLAY, P_REST, F.away0, F.away1, CURVE('away')), mv(P_REST, P_GRAB, F.ret0, F.ret1, CURVE('ret'))]);

  const P2_IN = once(() => unproject([1.08 * W, 0.86 * H], cam2(F.arrowIn)));
  const sendMove = mv(null, null, F.send0, F.send1, CURVE('send'));
  const trackB = once(() => { sendMove.a = P_REST2; sendMove.b = SEND_TIP; return [mv(P2_IN(), P_INPUT, F.arrowIn, F.arrowIn + F.arrowD, CURVE('arrowIn')), mv(P_INPUT, P_REST2, F.drift0, F.drift1, CURVE('drift')), sendMove]; });

  const ENTRY = once(() => {
    const fc = F.cutC, c = {cx: BTN[0] + S3X, cy: BTN[1] + S3Y, w: CAM.send.w0};
    const pa = project(along(trackB(), fc - 1.5), cam2(fc - 1.5)), pb = project(along(trackB(), fc - 0.5), cam2(fc - 0.5));
    const v = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const D = (((CAM.sendMatch ?? 0.7) * v) / sOf(c)) * TL.sendIn.dur / (TL.sendIn.curve.startSpeed || 3);
    return sub(SEND_TIP, mul(norm(sub(SEND_TIP, P_REST2)), D));
  });

  const trackC = once(() => [mv(ENTRY(), SEND_TIP, F.sendIn0, F.sendIn1, CURVE('sendIn')), {fn: (f) => [0, btnY(f) - btnY(F.click3)]}, mv(SEND_TIP, P_GONE, F.rest0, F.rest1, CURVE('rest'))]);

  const E0 = once(() => camTop(cam1(F.tab)) - 2);
  const TAB_GRIP = once(() => [TAB.x, E0() + TAB.h * 0.55]);
  const H2_IN = once(() => unproject([1.1 * W, 0.7 * H], cam1(F.h2in0)));
  const trackH2 = once(() => [mv(H2_IN(), TAB_GRIP(), F.h2in0, F.h2in1, CURVE('h2in'))]);

  const tipA = (f) => along(trackA(), f);
  const tipBC = (f, si) => along(si >= 2 ? trackC() : trackB(), f);
  const tipAt = (f, si = shotIndex(Math.round(f))) => (f < F.grab ? tipA(f) : tipBC(f, si));

  const ROT = G.rotate;
  const RBn = mul(RB, 1 / Math.hypot(RB[0], RB[1]));
  function rotTarget(ms, f, scale = 1) {
    const live = ms.filter((m) => !m.jump); live.start = ms.start || ms[0].a;
    const a = along(live, f - 0.5), b = along(live, f + 0.5), cr = (RBn[0] * (b[1] - a[1]) - RBn[1] * (b[0] - a[0])) / scale;
    return Math.sign(cr) * ROT.max * Math.tanh(Math.max(0, Math.abs(cr) - ROT.dead) / ROT.v0);
  }
  const rotFollow = (fn, f0, f1) => follower(fn, f0, f1, ROT.hz, ROT.zeta, ROT.zetaBack);
  const rotA = once(() => rotFollow((f) => rotTarget(trackA(), f), F.cursorIn - 1, F.grab + 2));

  const rotBC = once(() => rotFollow((f) => (f < F.cutC ? rotTarget(trackB(), f) : rotTarget(trackC(), f, f < F.rest0 ? 1 / (ROT.send ?? 1) : 1)), F.arrowIn - 1, F.rest1 + 2));
  const rotH2 = once(() => rotFollow((f) => rotTarget(trackH2(), f), F.h2in0 - 1, F.grip + 2));
  const pointerRot = (f) => (f < F.grab ? rotA()(f) : rotBC()(f));

  const tipVis = (p, tilt, size = CURSOR) => { const rb = mul(RB, size / CURSOR); return sub(add(p, rb), rot(rb, tilt)); };

  const wipeX = (f) => (f < F.swipe0 ? -1e4 : f <= F.swipe1 + 6 ? tipVis(tipA(f), rotA()(f))[0] : 1e4);

  const dim = (f) => (G.dim?.alpha ?? 0.6) * prog(CURVE('dimIn'), f, F.dimIn0, F.dimIn1) * (1 - prog(CURVE('dimOut'), f, F.dimOut0, F.dimOut1));

  const hangSway = (f) => { const u = clamp((f - F.lift1) / 20), t = f / FPS; return [u * 1.4 * Math.sin(2 * Math.PI * 0.35 * t), u * 2.2 * Math.sin(2 * Math.PI * 0.27 * t + 1.1)]; };
  const liftMove = mv(P_GRAB, HANG.pivot, F.lift0, F.lift1, CURVE('lift'));
  const hangPos = (f) => add(add(tipA(f), moveAt(liftMove, f)), hangSway(f));
  function hand1(f) {
    if (f < F.slam0) return hangPos(f);
    if (f < F.impact) return mix(hangPos(F.slam0), P_SLAM, CURVE('slam')((f - F.slam0) / (F.impact - F.slam0)));
    if (f < F.out0) return P_SLAM;
    return mix(P_SLAM, P_OUT, CURVE('out')((f - F.out0) / (F.out1 - F.out0)));
  }
  const vx = (pathFn, f) => (pathFn(f + 0.5)[0] - pathFn(f - 0.5)[0]);

  const SH_END = 22;
  const vidPath = (f) => (f < F.impact ? hand1(f) : P_SLAM);
  const HOLD = G.hold;
  const holdTilt = once(() => follower((f) => HOLD.max * Math.tanh(vx(vidPath, f) / HOLD.v0), F.grab, F.impact + SH_END + 2, HOLD.hz, HOLD.zeta, HOLD.zetaBack));
  const SHR = G.shrink;
  function held(f, si = shotIndex(Math.round(f))) {
    if (f < F.grab || f >= F.impact + SH_END) return null;
    let sc = springTo(f, F.grab, 1, HANG.scale, G.grab.hz, G.grab.zeta), a = holdTilt()(f), blur = si >= 1 ? DEFOCUS : 0;
    const k = f < F.slam0 ? 0 : EASE.go(clamp((f - F.slam0) / (F.impact - F.slam0)));
    blur = lerp(blur, 0, k);
    if (f >= F.impact) sc = springTo(f, F.impact, springTo(F.impact, F.grab, 1, HANG.scale, G.grab.hz, G.grab.zeta), CHIP_SCALE, SHR.hz, SHR.zeta);

    const off = mul(sub(P_GRAB, hand1(F.grab)), 1 - k);
    return {pivot: f < F.impact ? add(hand1(f), off) : add(P_SLAM, [0, composerDrop(f)]), sc, ang: a, blur};
  }

  const EB = once(() => camBottom(cam1(F.drag1)) + 90);

  const THUD = G.thud;
  const thud = (f) => {
    if (f <= F.drag1) return 0;
    const v0 = ((EB() - E0()) * (CURVE('drag').endSpeed ?? 2.4) * FPS) / (F.drag1 - F.drag0) * THUD.keep, w = 2 * Math.PI * THUD.hz, wd = w * Math.sqrt(1 - THUD.zeta ** 2), t = (f - F.drag1) / FPS;
    return (v0 / wd) * Math.exp(-THUD.zeta * w * t) * Math.sin(wd * t);
  };
  function sheetEdge(f) {
    if (f < F.tab) return -1e4;
    if (f < F.drag0) return springTo(f, F.tab, E0() - 50, E0(), 3.4, 0.5);
    if (f < F.drag1) return lerp(E0(), EB(), CURVE('drag')((f - F.drag0) / (F.drag1 - F.drag0)));
    return EB() + thud(f);
  }

  const aiOffset = (f) => (f < F.tab ? -1e4 : f > F.drag1 + 90 ? 0 : sheetEdge(f) - EB());
  function hand2(f) {
    const p = along(trackH2(), f);
    return f < F.grip ? p : add(p, [0, sheetEdge(f) - sheetEdge(F.grip)]);
  }

  const HT = G.handTilt;
  const tilt1 = once(() => follower((f) => clamp(-HT.gain * vx(hand1, f), -HT.max, HT.max), F.grab, F.out1 + 2, HT.hz, HT.zeta, HT.zetaBack));
  const tilt2 = once(() => follower((f) => clamp(-HT.gain * vx(hand2, f), -HT.max, HT.max), F.grip, F.drag1 + 4, HT.hz, HT.zeta, HT.zetaBack));

  const GW = [WIN.x + WIN.w / 2, WIN.y + WIN.h / 2];
  const GSTART = [WIN.x + WIN.w + 520, WIN.y + WIN.h * 0.7];
  const winOutEnd = add(GW, CANVAS.winOut);
  const trackG = once(() => [mv(GSTART, GW, F.grabIn0, F.grabIn1, CURVE('grabIn')), mv(GW, winOutEnd, F.winOut0, F.winOut1, CURVE('winOut'))]);
  const grabTip = (f) => along(trackG(), f);
  const GSC = CANVAS.grabCursor / CURSOR;
  const rotG = once(() => rotFollow((f) => rotTarget(trackG(), f, GSC), F.grabIn0 - 1, F.grabWin + 2));
  const GWIN = G.win;
  const winTilt = once(() => follower((f) => GWIN.tiltMax * Math.tanh(vx(grabTip, f) / GWIN.v0), F.grabWin - 1, F.cutE + 2, GWIN.hz, 0.7, 0.3));
  function winXf(f) {
    if (f < F.grabWin) return null;
    return {d: sub(grabTip(f), GW), pivot: GW, sc: springTo(f, F.grabWin, 1, GWIN.pop, GWIN.hz, GWIN.zeta), ang: winTilt()(f), sel: clamp((f - F.grabWin + 1) / 2)};
  }

  const MM = CAM.macroMatch;
  const inDist = (screenV, wNext, item) => ((MM * screenV) / (W / wNext)) * (TL[item].dur) / (TL[item].curve.startSpeed || 4);
  const outSpeed = (id, lenW) => ((TL[id].curve.endSpeed || 4) * lenW) / TL[id].dur;

  const RING = CANVAS.ring, CAR = G.carry;
  const MAC = {m1: CAM.m1, m2: CAM.m2, m3: CAM.m3, ring: CAM.ring};
  const winScreenV = () => outSpeed('winOut', len(CANVAS.winOut)) * (W / (MED.w1 ?? MED.w));
  const ITEMS = once(() => {
    const out = [];
    const sizeOf = (it) => (it.ring !== undefined ? RING.size(it.ring) : it.img ? [it.h * it.ar, it.h] : [it.w, it.size * 1.2]);
    let prevV = winScreenV(), prevW = MED.w1 ?? MED.w;
    const byCut = {};

    const D1 = inDist(prevV, MAC.m1.w0, 'm1'); byCut.m1 = D1;
    const v1 = outSpeed('m1out', CANVAS.items.find((i) => i.ae === 'm1').out.len) * (W / MAC.m1.w1);
    byCut.m2 = inDist(v1, MAC.m2.w0, 'm2');
    const v2 = outSpeed('m2out', CANVAS.items.find((i) => i.drop === 'm2').out.len) * (W / MAC.m2.w1);
    byCut.m3 = inDist(v2, MAC.m3.w0, 'm3');
    for (const it of CANVAS.items) {
      const [w, h] = sizeOf(it), g = [w * 0.1, h * 0.16];
      const at = it.ring !== undefined ? RING.slot(it.ring) : it.at, pin = add(at, g);
      const drop = TL[it.drop], ae = it.ae ? TL[it.ae] : null;
      let from = it.from;
      if (it.jumpIn) from = sub(pin, mul(norm(it.jumpIn), byCut[it.drop]));
      const hold = path(from).to(pin, drop.f0, drop.f1, drop.curve);
      let endPin = pin, endAt = at;
      if (ae) { const d = mul(norm(it.dir), byCut[it.ae]); endPin = add(pin, d); endAt = add(at, d); hold.to(endPin, ae.f0, ae.f1, ae.curve); }

      const cur = path(from).to(pin, drop.f0, drop.f1, drop.curve);
      if (ae) {
        cur.to(add(pin, [56, 76]), drop.f1 + 4, drop.f1 + 32).jump(pin, ae.f0).to(endPin, ae.f0, ae.f1, ae.curve);
      }
      const last = ae || drop;
      let idle0, gone = 1e9;
      if (it.out) { const o = TL[it.out.id]; cur.to(add(endPin, mul(norm(it.out.dir), it.out.len)), o.f0, o.f1, o.curve); idle0 = 1e9; gone = o.f1 + 2; }
      else if (it.away) { const o = TL[it.away]; cur.to(add(endPin, [110, 150]), o.f0, o.f1, o.curve); idle0 = o.f1; }
      else if (it.exit) { cur.to(it.exit, last.f1 + 5, last.f1 + 45); idle0 = 1e9; gone = last.f1 + 46; }
      else if (it.next) idle0 = 1e9;
      else { cur.to(add(endPin, [56, 76]), last.f1 + 4, last.f1 + 32); idle0 = last.f1 + 32; }
      const x = {it, w, h, g, at, endAt, drop, ae, pin, endPin, hold, cur, idle0, seed: it.cur * 1.7 + 0.4, color: CANVAS.colors[it.cur], gone};
      x.tilt = follower((f) => CAR.max * Math.tanh(vx((q) => along(hold, q), f) / CAR.v0), drop.f0 - 1, F.end + 2, CAR.hz, CAR.zeta, CAR.zetaBack);
      x.rot = rotFollow((f) => rotTarget(cur, f, CANVAS.cursor / CURSOR), drop.f0 - 1, F.end + 2);
      out.push(x);
    }

    for (const i of RING.pre) { const [w, h] = RING.size(i), at = RING.slot(i); out.push({it: {id: 'ring' + i, img: RING.icons[i][0]}, w, h, at, endAt: at, static: true}); }
    out.byCut = byCut;
    return out;
  });
  const itemById = (id) => ITEMS().find((x) => x.it.id === id);

  const itemCenter = (x, f) => (x.static ? x.at : sub(along(x.hold, f), rot(x.g, x.tilt(f))));
  const idleWob = (x, f) => { const k = clamp((f - x.idle0) / 12), t = f / FPS; return [k * 3 * Math.sin(2 * Math.PI * 0.43 * t + x.seed), k * 2.4 * Math.sin(2 * Math.PI * 0.31 * t + 2 * x.seed)]; };

  const CM = CANVAS.comment;
  const CLICK1 = once(() => { const c = itemById('curio'); return add(c.endAt, [-100, 92]); });
  const CARD1 = once(() => { const t = CLICK1(); return {x: t[0] + CM.pin + 10, y: t[1] - CM.pin - 6, w: CM.w, h: CM.h}; });
  const GO_TIP = once(() => { const c = CARD1(); return [c.x + c.w - 16 - 13 - 4, c.y + 76 + 13 + 3]; });
  const trackU = once(() => {
    const c1 = CLICK1(), uStart = add(c1, [-240, 360]);
    return path(uStart).to(c1, F.uIn0, F.uIn1, CURVE('uIn')).to(GO_TIP(), F.cmtSend0, F.cmtSend1, CURVE('cmtSend')).to(add(GO_TIP(), [260, 420]), F.uAway0, F.uAway1, CURVE('uAway'));
  });
  const uSize = CANVAS.cursor;
  const rotU = once(() => rotFollow((f) => rotTarget(trackU(), f, uSize / CURSOR), F.uIn0 - 1, F.uAway1 + 2));
  const userTip = (f) => along(trackU(), f);

  const CMT = G.comment;
  const backIn = (k, c = 1.7) => (c + 1) * k * k * k - c * k * k;
  function comment(f) {
    const f0 = F.uClick + 1;
    if (f < f0 || f >= F.cmtGone1 + 4) return null;
    const u = (f - f0) / FPS, grow = springStep(Math.max(0, u - 0.1), CMT.hz, CMT.zeta), keys = STORY.KEYS3;
    const typed = keys.filter((k) => f >= k).length, gone = clamp((f - F.cmtGone0) / (F.cmtGone1 - F.cmtGone0));
    return {at: CLICK1(), card: CARD1(), pin: springStep(u, CMT.hz * 1.3, 0.5) * (1 - backIn(clamp((f - F.cmtGone0 - 3) / (F.cmtGone1 - F.cmtGone0 - 2)))),
      grow, out: 1 - backIn(gone), head: clamp((f - f0 - 7) / 5), ph: clamp((f - f0 - 9) / 8), row: clamp((f - f0 - 11) / 5),
      typed, caret: f < F.cmtClick && (f - (typed ? keys[typed - 1] : f0)) % 30 < 16, sent: f >= F.cmtClick, sentK: clamp((f - F.cmtClick) / 3)};
  }
  const comments = (f) => [comment(f)].filter(Boolean);

  const SWP = G.swap, SW = FilmCopy.swap;

  const EMW = (ch) => (ch.charCodeAt(0) > 0x2e7f ? 1.0 : "il.'|!,:;".includes(ch) ? 0.26 : ch === ' ' ? 0.24 : 'tfjr'.includes(ch) ? 0.36 : 'mwMW'.includes(ch) ? 0.82 : /[A-Z]/.test(ch) ? 0.68 : 0.57);
  const textW = (t, size) => Array.from(t).reduce((s, ch) => s + EMW(ch) * size, 0);
  const WORDS = once(() => {
    const c = itemById('curio'), left = c.endAt[0] - c.w / 2, size = c.it.size;
    const list = [{id: 'curio', en: STORY.COPY.words[c.it.text], zh: SW.curiosity, left, y: c.endAt[1], size, t0: F.swap0}];

    SW.more.forEach(([en, zh], i) => list.push({id: 'w' + (i + 1), en, zh, left: left + (CANVAS.wordDX?.[i] ?? 0), y: c.endAt[1] + CANVAS.wordGap * (i + 1), size, t0: F.word[i], shown: F.cutG}));
    for (const w of list) { w.enW = textW(w.en, w.size); w.zhW = textW(w.zh, w.size); w.center = [w.left + w.zhW / 2, w.y]; }
    return list;
  });

  function swapAt(id, f) {
    const w = WORDS().find((x) => x.id === id);
    if (!w || f < w.t0) return {p: 0, caret: false};
    const t = f - w.t0, p = t < SWP.out ? EASE.go(t / SWP.out) : t < SWP.out + SWP.hold ? 1 : 1 + EASE.go(clamp((t - SWP.out - SWP.hold) / SWP.in));
    const done = t >= SWP.out + SWP.hold + SWP.in;
    return {p, done, caret: !done || (t - SWP.out - SWP.hold - SWP.in) % 30 < 16};
  }

  const disp = (m, f) => (m ? moveAt(m, f) : [0, 0]);
  const remain = (m, f) => (m ? sub(moveAt(m, f), sub(m.b, m.a)) : [0, 0]);
  function macroCam(key, f, f0, f1, anchor, ins, outs) {
    const c = MAC[key], k = clamp((f - f0) / Math.max(1, f1 - f0));
    let p = anchor;
    for (const m of ins) p = add(p, mul(remain(m, f), c.follow));
    for (const m of outs) p = add(p, mul(disp(m, f), c.follow));
    return {cx: p[0], cy: p[1], w: lnLerp(c.w0, c.w1, k), rx: c.rx, ry: c.ry, rz: c.rz};
  }
  const findMv = (ms, f0) => ms.find((m) => m.f0 === f0 && !m.jump);
  function cam4(f) {
    const x = itemById('record');
    return macroCam('m1', f, F.cutE, F.cutF, add(x.endAt, [-40, 10]), [findMv(x.cur, F.m10)], [findMv(x.cur, TL.m1out.f0)]);
  }
  function cam5(f) {
    const x = itemById('heart');
    return macroCam('m2', f, F.cutF, F.cutG, add(x.at, [10, 0]), [findMv(x.cur, F.m20)], [findMv(x.cur, TL.m2out.f0)]);
  }

  const WS = CAM.wordSpeed, WM = CAM.wordMatch;
  const whipIn = (f, i, w) => { const [f0, fc] = F.whip[i], o = {tc: fc / FPS, t0: f0 / FPS, peak: (WS * FPS) / (W / w)}; return f <= f0 ? 0 : spikeIn(f / FPS, o) - spikeIn(f0 / FPS, o); };
  const whipOut = (f, i, w) => { const v0 = (WM * WS * FPS) / (W / w), fc = F.whip[i][1]; return -spikeOutTotal(v0) + spikeOut((f - fc) / FPS, {v0}); };
  function cam6(f) {
    const x = itemById('curio'), card = CARD1(), cardC = [card.x + card.w / 2 - 20, card.y + card.h / 2 - 10], w0 = WORDS()[0];
    let anchor = mix(add(x.endAt, [0, 20]), cardC, prog(CURVE('cmtCam'), f, F.cmtCam0, F.cmtCam1));
    anchor = mix(anchor, w0.center, prog(CURVE('backCam'), f, F.backCam0, F.backCam1));
    const c = macroCam('m3', f, F.cutG, F.cmtCam1, anchor, [findMv(x.cur, F.m30)], []);
    const w = lnLerp(c.w, CAM.words[0].w, prog(CURVE('backCam'), f, F.backCam0, F.backCam1));
    const lv = 1 - prog(CURVE('level'), f, F.level0, F.level1);
    return {...c, w, cy: c.cy + whipIn(f, 0, w), rx: c.rx * lv, ry: c.ry * lv, rz: c.rz * lv};
  }

  const wordCx = (w, f) => { const p = Math.min(1, swapAt(w.id, f).p); return w.left + lerp(w.enW / 2, w.zhW / 2, p); };
  function camWord(k) {
    return (f) => { const w = WORDS()[k], c = CAM.words[k - 1];
      return {cx: wordCx(w, f), cy: w.y + whipOut(f, k - 1, c.w) + whipIn(f, k, c.w), w: c.w, rx: c.rx, ry: c.ry, rz: c.rz}; };
  }

  const APP = CAM.app, VCARD = {x: 430, y: 316, w: 360, h: 270};

  const trackV = once(() => { const tgt = [VCARD.x + VCARD.w / 2 + 2, VCARD.y + VCARD.h / 2 + 2]; return path(add(tgt, [640, 190])).to(tgt, F.toVideo0, F.toVideo1, CURVE('toVideo')); });

  const rotV = once(() => rotFollow((f) => rotTarget(trackV(), f, CANVAS.cursor / CURSOR / (ROT.send ?? 1)), F.toVideo0 - 1, F.openV + 4));
  function cam10(f) {
    return {cx: APP.cx, cy: APP.cy + whipOut(f, 3, APP.w), w: lnLerp(APP.w, APP.w * 0.94, clamp((f - F.cutApp) / (F.openV - F.cutApp))), rx: APP.rx, ry: APP.ry, rz: APP.rz};
  }
  const appDY = (f) => (f < F.appUp ? 1e4 : springTo(f, F.appUp, 900, 0, G.pop.hz, G.pop.zeta));

  function player(f) {
    if (f < F.openV) return null;
    const c = camAt(F.openV, 9), a = project([VCARD.x, VCARD.y], c), b = project([VCARD.x + VCARD.w, VCARD.y + VCARD.h], c);
    const k = prog(CURVE('expand'), f, F.expand0, F.expand1), fw = W, fh = (W * 3) / 4, full = [0, (H - fh) / 2, fw, fh];
    const r0 = [a[0], a[1], b[0] - a[0], b[1] - a[1]];
    return {rect: r0.map((v, i) => lerp(v, full[i], k)), black: clamp((f - F.openV) / 5), k};
  }

  const OUTRO = {tab: {x: 800, w: 270, h: 100}, cursor: 72, blob: [540, (H - (W * 3) / 4) / 2 + 0.4 * (W * 3) / 4], bottom: H + 90};

  const BU = G.burst || {hz: 3.2, zeta: 0.42};
  const rnd = (i) => { const r = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return r - Math.floor(r); };
  function sign(f) {
    if (f < F.burst0) return null;
    const n = Array.from(FilmCopy.endingTitle).length;
    return Array.from({length: n}, (_, i) => {
      const k = springStep(Math.max(0, f - F.burst0 - Math.round(rnd(i) * 2)) / FPS, BU.hz, BU.zeta);
      return {k, rot: (rnd(i + 7) - 0.5) * 80 * (1 - Math.min(1, k)), sc: lerp(0.6, 1, k)};
    });
  }

  function credEdge(f) {
    if (f < F.tab2) return -1e4;
    if (f < F.drag20) return springTo(f, F.tab2, -OUTRO.tab.h, 0, 3.4, 0.5);
    if (f < F.drag21) return lerp(0, OUTRO.bottom, CURVE('drag2')((f - F.drag20) / (F.drag21 - F.drag20)));
    const v0 = ((OUTRO.bottom * (CURVE('drag2').endSpeed ?? 2.4) * FPS) / (F.drag21 - F.drag20)) * THUD.keep, w = 2 * Math.PI * THUD.hz, wd = w * Math.sqrt(1 - THUD.zeta ** 2), t = (f - F.drag21) / FPS;
    return OUTRO.bottom + (v0 / wd) * Math.exp(-THUD.zeta * w * t) * Math.sin(wd * t);
  }

  const OC = OUTRO.cursor / CURSOR;
  const GRIP3 = [OUTRO.tab.x, OUTRO.tab.h * 0.55];
  const trackH3 = once(() => [mv([1.12 * W, 0.62 * H], GRIP3, F.h3in0, F.h3in1, CURVE('h3in'))]);
  const rotH3 = once(() => rotFollow((f) => rotTarget(trackH3(), f, OC), F.h3in0 - 1, F.grip2 + 2));
  function outroCursor(f) {
    if (f < F.h3in0 || f > F.drag21 + 4) return null;
    const p = along(trackH3(), f);
    if (f < F.grip2) return {kind: 'arrow', pos: p, tilt: rotH3()(f), sc: 1, size: OUTRO.cursor};
    return {kind: 'hand', pos: add(p, [0, credEdge(f) - credEdge(F.grip2)]), tilt: 0, sc: Math.min(press(f, F.grip2), 0.94), size: OUTRO.cursor};
  }

  const CZ = 2.4;
  const CRD = once(() => {
    const it = FilmCopy.credits.items, f1 = F.drag21, mk = (o) => ({...o, color: CANVAS.colors[o.cur ?? 0], tag: STORY.COPY.tags[o.cur ?? 0]});
    const nameW = (s) => textW(s, 54) + 6, H1 = 132;
    const rowGap = Math.min(240, 860 / Math.max(1, it.length - 1));
    const L = it.map(([name, desc], g) => {
      const pos = [100, 420 + g * rowGap];
      const grp = {name, w: Math.min(W - 170, Math.max(nameW(name), Array.from(desc).length * 32 + 8)), h: H1};
      if (g === 0) return mk({kind: 'static', g, grp, pos, cur: 3});
      if (g === 1) return mk({kind: 'drag', g, grp, from: [1420, 980], to: pos, t0: f1 - 6, dur: 30, cur: 0});
      return mk({kind: 'type', g, grp, pos, t0: f1 + 16 + Math.min(24, 6 * (g - 2)), cur: 1});
    });
    for (const x of L) {
      const G = x.grp;
      if (x.kind === 'drag') {
        x.gp = [G.w * 0.12, G.h * 0.3];
        x.hold = path(add(x.from, x.gp)).to(add(x.to, x.gp), x.t0, x.t0 + x.dur);
        x.cur_ = path(add(x.from, x.gp)).to(add(x.to, x.gp), x.t0, x.t0 + x.dur).to(add(x.to, [G.w + 34, G.h - 6]), x.t0 + x.dur + 4, x.t0 + x.dur + 34);
        x.tilt = follower((f) => CAR.max * Math.tanh(vx((q) => along(x.hold, q), f) / (CAR.v0 * CZ / 2)), x.t0 - 1, x.t0 + x.dur + 60, CAR.hz, CAR.zeta, CAR.zetaBack);
        x.c0 = x.t0;
      } else if (x.kind === 'type') {
        const n = Array.from(G.name).length;
        const gap = Math.min(2, 36 / Math.max(1, n - 1));
        x.keys = Array.from({length: n}, (_, i) => x.t0 + 2 + i * gap); x.t1 = x.keys.at(-1) ?? x.t0;
        x.descAt = x.t1 + 4;
        const click = add(x.pos, [-10, 52]);
        x.cur_ = path([-160, 1240]).to(click, x.t0 - 22, x.t0).to(add(click, [-40, 150]), x.t1 + 8, x.t1 + 38);
        x.c0 = x.t0 - 22;
      } else {
        const park = add(x.pos, [G.w + 24, G.h - 8]);
        x.cur_ = path(park);
        x.c0 = -1e9;
      }
      x.rot = rotFollow((f) => rotTarget(x.cur_, f, CZ), (x.c0 > -1e8 ? x.c0 : F.drag20) - 1, F.end + 2);
    }

    const deco = [
      mk({kind: 'static', img: 'record', h: 150, pos: [250, 1470], rot: -10}),
      mk({kind: 'static', img: 'plant', h: 130, pos: [610, 1700], rot: 6}),
      mk({kind: 'drag', img: 'heart', h: 140, from: [1350, 1900], to: [830, 1360], t0: f1 + 6, dur: 30, cur: 6}),
    ];
    for (const d of deco) if (d.kind === 'drag') {
      d.w = d.h * propAspect(d.img); d.gp = [d.w * 0.1, d.h * 0.16];
      d.hold = path(add(d.from, d.gp)).to(add(d.to, d.gp), d.t0, d.t0 + d.dur);
      d.cur_ = path(add(d.from, d.gp)).to(add(d.to, d.gp), d.t0, d.t0 + d.dur).to(add(d.to, [120, 150]), d.t0 + d.dur + 4, d.t0 + d.dur + 34);
      d.tilt = follower((f) => CAR.max * Math.tanh(vx((q) => along(d.hold, q), f) / (CAR.v0 * CZ / 2)), d.t0 - 1, d.t0 + d.dur + 60, CAR.hz, CAR.zeta, CAR.zetaBack);
      d.rot = rotFollow((f) => rotTarget(d.cur_, f, CZ), d.t0 - 1, F.end + 2);
    }
    return {L, deco};
  });

  function credits(f) {
    if (f < F.tab2) return null;
    const {L, deco} = CRD(), items = [], curs = [];
    const selOf = (t0, t1) => (f < t0 ? 0 : f <= t1 + 6 ? 1 : clamp(1 - (f - t1 - 6) / 8));
    for (const x of L) {
      const G = x.grp;
      if (x.kind === 'static') { items.push({g: x.g, pos: x.pos, ang: 0, sel: 1, color: x.color}); curs.push({id: 'c' + x.g, pos: add(along(x.cur_, f), [2.5 * Math.sin(f / 9 + x.g), 2 * Math.sin(f / 13 + 1.7 * x.g)]), tilt: 0, sc: 1, color: x.color, tag: x.tag}); continue; }
      if (x.kind === 'drag') {
        if (f < x.t0) continue;
        const a = x.tilt(f), pin = along(x.hold, f);
        items.push({g: x.g, pos: sub(pin, x.gp), ang: a, sel: selOf(x.t0, x.t0 + x.dur), color: x.color, pivot: x.gp});
      } else {
        if (f < x.t0) { curs.push({id: 'c' + x.g, pos: along(x.cur_, f), tilt: x.rot(f), sc: 1, color: x.color, tag: x.tag}); continue; }
        const n = x.keys.filter((k) => f >= k).length;
        items.push({g: x.g, pos: x.pos, ang: 0, sel: 0, color: x.color, typed: n, caret: f < x.t1 + 2 || (f < x.t1 + 30 && (f - x.t1) % 30 < 16), desc: clamp((f - x.descAt) / 6)});
      }
      if (f >= x.c0) curs.push({id: 'c' + x.g, pos: along(x.cur_, f), tilt: x.rot(f), sc: x.kind === 'type' ? press(f, x.t0) : hold(f, x.t0, x.t0 + x.dur), color: x.color, tag: x.tag});
    }
    const pics = deco.map((d, i) => {
      if (d.kind === 'static') return {i, img: d.img, h: d.h, w: d.h * propAspect(d.img), c: d.pos, ang: d.rot || 0, sel: 0};
      if (f < d.t0) return null;
      const a = d.tilt(f), pin = along(d.hold, f);
      curs.push({id: 'd' + i, pos: along(d.cur_, f), tilt: d.rot(f), sc: hold(f, d.t0, d.t0 + d.dur), color: d.color, tag: d.tag});
      return {i, img: d.img, h: d.h, w: d.w, c: sub(pin, rot(d.gp, a)), ang: a, sel: selOf(d.t0, d.t0 + d.dur), color: d.color};
    }).filter(Boolean);
    return {items, pics, curs, dy: credEdge(f) - OUTRO.bottom, size: 30 * CZ};
  }

  const CAMS = [cam1, cam2, cam3, cam4, cam5, cam6, camWord(1), camWord(2), camWord(3), cam10];

  const BR = G.breath;
  function breath(c, f) {
    if (!BR.amp && !BR.zoom) return c;
    const t = f / FPS, w = (2 * Math.PI) / BR.period;
    return {...c, w: c.w * (1 + BR.zoom * Math.sin(w * 0.71 * t + 0.4)), cx: c.cx + BR.amp * c.w * Math.sin(w * t), cy: c.cy + 0.7 * BR.amp * c.w * Math.sin(w * 1.37 * t + 1.9)};
  }

  const camAt = (f, si = shotIndex(Math.round(f))) => { const c = breath(CAMS[si](f), f); return {rx: 0, ry: 0, rz: 0, ...c}; };

  function canvasItems(f) {
    const out = [];
    for (const x of ITEMS()) {
      if (!x.static && f < x.drop.f0) continue;
      const c = itemCenter(x, f);
      let sel = 0, color = x.color, anchor = false;
      if (!x.static) {
        sel = f <= x.drop.f1 + 6 ? 1 : clamp(1 - (f - x.drop.f1 - 6) / 8);
        const ae = x.ae;
        if (ae && f >= ae.f0 - 1) {
          sel = Math.max(sel, f <= ae.f1 + 18 ? 1 : clamp(1 - (f - ae.f1 - 18) / 8));
          anchor = f <= ae.f1 + 40;
        }
      }
      out.push({id: x.it.id, it: x.it, w: x.w, h: x.h, c, ang: x.static ? 0 : x.tilt(f), sel, color, anchor, under: x.it.ring !== undefined || x.static, swap: x.it.id === 'curio' ? swapAt('curio', f) : null});
    }
    for (const w of WORDS().slice(1)) if (f >= w.shown) out.push({id: w.id, word: w, c: [w.left, w.y], ang: 0, sel: 0, swap: swapAt(w.id, f)});
    return out;
  }

  const DECOR = once(() => {
    const card = CARD1(), A = {abs: [0, 0], cmt: [card.x + card.w / 2, card.y + card.h / 2]};
    WORDS().slice(1).forEach((w, i) => (A['w' + (i + 1)] = [w.left + w.zhW / 2, w.y]));
    return CANVAS.decor.map((d) => {
      const o = A[d.anchor || 'abs'], P = (p) => add(o, p), x = {d, id: d.id, kind: d.kind, under: !!d.under};
      if (d.img) { x.h = d.h; x.w = d.h * propAspect(d.img); } else if (d.text) { x.size = d.size; x.w = textW(d.text, d.size); x.h = d.size * 1.2; }
      if (d.kind === 'static') { x.c = d.left ? add(P(d.pos), [x.w / 2, 0]) : P(d.pos); return x; }
      const t0 = TL[d.at].f0 + (d.off || 0), lead = d.lead || 0;
      x.t0 = t0; x.t1 = t0 + (d.dur || 0); x.color = CANVAS.colors[d.cur]; x.tag = STORY.COPY.tags[d.cur]; x.seed = (d.cur ?? 0) * 1.3 + t0 * 0.01;
      let start = d.enter ? P(d.enter) : null;
      if (d.handoff) { const it = itemById(d.handoff); start = along(it.cur, t0 - lead); it.gone = t0 - lead; x.color = it.color; x.tag = STORY.COPY.tags[it.it.cur]; }
      let cur;
      if (d.kind === 'drag') {
        x.g = [x.w * 0.1, x.h * 0.16];
        x.hold = path(add(P(d.from), x.g)).to(add(P(d.to), x.g), t0, x.t1);
        cur = path(add(P(d.from), x.g)).to(add(P(d.to), x.g), t0, x.t1);
        x.tilt = follower((f) => CAR.max * Math.tanh(vx((q) => along(x.hold, q), f) / CAR.v0), t0 - 1, x.t1 + 70, CAR.hz, CAR.zeta, CAR.zetaBack);
        x.c0 = t0;
      } else if (d.kind === 'draw') {
        x.p0 = P(d.p0);
        cur = path(start).to(x.p0, t0 - lead, t0).to(P(d.p1), t0, x.t1);
        x.c0 = t0 - lead;
      } else if (d.kind === 'type') {
        x.pos = d.left === false ? sub(P(d.pos), [x.w / 2, 0]) : P(d.pos);
        const n = Array.from(d.text).length, ev = d.every || 2;
        x.keys = Array.from({length: n}, (_, i) => t0 + 2 + Math.round(i * ev)); x.t1 = x.keys[n - 1];
        cur = path(start).to(add(x.pos, [-6, x.h * 0.8]), t0 - lead, t0);
        x.c0 = t0 - lead;
      }
      if (d.away) cur.to(add(cur.end(), d.away), x.t1 + 4, x.t1 + 34);
      x.idle0 = x.t1 + 34; x.cur = cur;
      x.rot = rotFollow((f) => rotTarget(cur, f, CANVAS.cursor / CURSOR), x.c0 - 1, x.t1 + 44);

      if (d.kind === 'draw') { const rel = x.t1 + 8, tipOf = (f) => tipVis(along(cur, f), x.rot(f), CANVAS.cursor); x.corner = (f) => tipOf(Math.min(f, rel)); x.rel = rel; }
      return x;
    });
  });
  const decorWob = (x, f) => { const k = clamp((f - x.idle0) / 12), t = f / FPS; return [k * 2.6 * Math.sin(2 * Math.PI * 0.41 * t + x.seed), k * 2 * Math.sin(2 * Math.PI * 0.29 * t + 2 * x.seed)]; };

  function decor(f) {
    const out = [];
    for (const x of DECOR()) {
      if (x.kind === 'static') { out.push({id: x.id, x, c: x.c, ang: x.d.rot || 0}); continue; }
      if (f < x.t0 && x.kind !== 'type') continue;
      if (x.kind === 'drag') { const pin = along(x.hold, f), a = x.tilt(f); out.push({id: x.id, x, c: sub(pin, rot(x.g, a)), ang: a, sel: f <= x.t1 + 4 ? 1 : clamp(1 - (f - x.t1 - 4) / 8)}); }
      else if (x.kind === 'draw') out.push({id: x.id, x, p0: x.p0, p1: x.corner(f), sel: f <= x.rel ? 1 : clamp(1 - (f - x.rel) / 8)});
      else if (x.kind === 'type' && f >= x.t0) { const n = x.keys.filter((k) => f >= k).length; out.push({id: x.id, x, n, caret: f < x.t1 + 2 || (f < x.t1 + 26 && (f - x.t1) % 30 < 16)}); }
    }
    return out;
  }

  const PR = G.press;
  const press = (f, at) => (f < at ? 1 : f < at + 2 ? lerp(1, PR.depth, (f - at) / 2) : springTo(f, at + 2, PR.depth, 1, PR.hz, PR.zeta));

  const hold = (f, a, b) => (f < a ? 1 : f < a + 2 ? lerp(1, PR.depth, (f - a) / 2) : f < b ? PR.depth : springTo(f, b, PR.depth, 1, PR.hz, 0.7));
  function cursors(f, si = shotIndex(Math.round(f))) {
    const out = [], b = Math.round(f), DC = DECOR();
    if (b >= F.cursorIn && b < F.grab) out.push({id: 'arrow', kind: 'arrow', pos: tipA(f), sc: press(f, F.click), tilt: rotA()(f)});
    if (b >= F.arrowIn && b < F.rest1) out.push({id: 'arrow', kind: 'arrow', pos: tipBC(f, si), sc: b < F.click3 - 1 ? press(f, F.click2) : press(f, F.click3), tilt: rotBC()(f)});
    if (b >= F.grab && b <= F.out1) {
      const sc = b < F.impact + 2 ? Math.min(press(f, F.grab), 0.94) : springTo(f, F.impact + 2, 0.94, 1, 3, 0.5);
      out.push({id: 'hand1', kind: 'hand', pos: hand1(f), sc, tilt: tilt1()(f)});
    }
    if (b >= F.h2in0 && b <= F.drag1 + 2) {
      if (b < F.grip) out.push({id: 'arrow2', kind: 'arrow', pos: hand2(f), sc: 1, tilt: rotH2()(f)});
      else out.push({id: 'hand2', kind: 'hand', pos: hand2(f), sc: Math.min(press(f, F.grip), 0.94), tilt: tilt2()(f)});
    }

    for (const x of ITEMS()) {
      if (x.static || b < x.drop.f0 || b > x.gone) continue;
      out.push({id: 'mp-' + x.it.id, kind: 'mp', pos: add(along(x.cur, f), idleWob(x, f)), sc: 1, tilt: x.rot(f), size: CANVAS.cursor, color: x.color, tag: STORY.COPY.tags[x.it.cur]});
    }

    for (const x of DC) {
      if (x.kind === 'static' || b < x.c0) continue;
      out.push({id: 'dc-' + x.id, kind: 'mp', pos: add(along(x.cur, f), decorWob(x, f)), sc: x.kind === 'type' ? press(f, x.t0) : hold(f, x.t0, x.t1), tilt: x.rot(f), size: CANVAS.cursor, color: x.color, tag: x.tag});
    }

    if (b >= F.grabIn0 && b <= F.winOut1 + 2) {
      if (b < F.grabWin) out.push({id: 'garrow', kind: 'arrow', pos: grabTip(f), sc: 1, tilt: rotG()(f), size: CANVAS.grabCursor});
      else out.push({id: 'ghand', kind: 'hand', pos: grabTip(f), sc: Math.min(press(f, F.grabWin), 0.92), tilt: winTilt()(f) * 1.6, size: CANVAS.grabCursor});
    }

    if (b >= F.uIn0 && b < F.uAway1) out.push({id: 'uarrow', kind: 'arrow', pos: userTip(f), sc: b < F.cmtClick - 1 ? press(f, F.uClick) : press(f, F.cmtClick), tilt: rotU()(f), size: uSize});
    if (b >= F.toVideo0 && b < F.openV + 3) out.push({id: 'varrow', kind: 'arrow', pos: along(trackV(), f), sc: press(f, F.openV), tilt: rotV()(f), size: uSize});
    return out;
  }

  const composerBounce = (f) => 1 - 0.025 * kick(f, F.impact, 6, 0.08);
  const flyK = (f) => prog(CURVE('fly'), f, F.fly0, F.fly1);

  function sendBtn(f) {
    const rot = f < F.hover0 ? 45 : springTo(f, F.hover0, 45, 0, 2.6, 0.42);
    let sc = 1;
    if (f >= F.click3) sc = f < F.click3 + 5 ? springTo(f, F.click3, 1, 0.9, 6, 0.75) : springTo(f, F.click3 + 5, springTo(F.click3 + 5, F.click3, 1, 0.9, 6, 0.75), 1, 3.4, 0.45);
    return {rot, sc, pressed: f >= F.click3 && f < F.fly0 + 6, stop: f >= F.fly0 + 6};
  }

  function motion(f, si = shotIndex(Math.round(f))) {
    const a = f - 0.25, b = f + 0.25, ca = camAt(a, si), cb = camAt(b, si), s = sOf(cb);
    let d = Math.hypot(cb.cx - ca.cx, cb.cy - ca.cy) * s + Math.abs(Math.log(cb.w / ca.w)) * 1500;
    const P = (p, c) => project(p, c);
    const la = cursors(a, si), lb = cursors(b, si);
    for (const x of lb) { const y = la.find((z) => z.id === x.id); if (!y) continue; const pa = P(y.pos, ca), pb = P(x.pos, cb); d = Math.max(d, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + Math.abs(x.tilt - y.tilt) * 0.6 + Math.abs(x.sc - y.sc) * 40); }
    const ha = held(a, si), hb = held(b, si);
    if (ha && hb) { const pa = P(ha.pivot, ca), pb = P(hb.pivot, cb); d = Math.max(d, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + Math.abs(hb.ang - ha.ang) * 4 + Math.abs(hb.sc - ha.sc) * 600); }
    if (f >= F.tab - 1 && f < F.drag1 + 20) d = Math.max(d, Math.abs(sheetEdge(b) - sheetEdge(a)) * s);
    if (f >= F.fly0 - 1 && f < F.fly1 + 2) d = Math.max(d, Math.abs(flyK(b) - flyK(a)) * 420 * s);
    if (f >= F.burst0 - 1 && f < F.burst1 + 4) d = Math.max(d, 60);
    if (f >= F.tab2 - 1 && f < F.drag21 + 20) d = Math.max(d, Math.abs(credEdge(b) - credEdge(a)));
    const wa = winXf(a), wb = winXf(b);
    if (wa && wb) d = Math.max(d, Math.hypot(wb.d[0] - wa.d[0], wb.d[1] - wa.d[1]) * s + Math.abs(wb.sc - wa.sc) * 900);
    return d * 2;
  }

  window.RIG = {sOf, project, unproject, camTop, camBottom, camAt, tipAt, tipVis, pointerRot, cursors, held, wipeX, sheetEdge, aiOffset, composerGrow, composerBounce, flyK, sendBtn, motion,
    composerDrop, winXf, canvasItems, comments, swapAt, WORDS, appDY, player, dim, decor, DECOR, OUTRO, sign, credEdge, outroCursor, credits, CZ, VCARD, CHIP_AT: () => F.impact + SH_END, CHIP, CHIP_SCALE, TAB, BTN, CURSOR, HOT, BODY, cams: {cam1, cam2, cam3, cam4, cam5, cam6, cam10}, along, trackA, trackB, trackC, trackH2, trackG, trackU, ITEMS,
    hand1, hand2, rotTarget, rotA, rotBC, rotH2, tilt1, tilt2, E0, EB, ENTRY, SEND_TIP, P_GRAB, GW, CLICK1, CARD1, userTip};
})();
