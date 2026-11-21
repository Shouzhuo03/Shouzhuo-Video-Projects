(function () {
  const S = window.DeskScript;
  const L = {
    W: 1440, H: 1080,
    me: [720, 560],
    icon: 140,
    bar: 44,
    grab: [18, 24],
    dupAt: [[-200, 0], [200, 0]],
    tug: { work: [500, 372], home: [940, 372] },
    notif: { x: 856, y: 24, w: 560, h: 128, gap: 12 },
    menu: { w: 280, row: 64, pad: 10, rows: 4, hit: 1 },
    windows: {
      work: [40, 50, 480, 340], home: [920, 50, 480, 340],
      drink: [40, 520, 480, 340], run: [920, 520, 480, 340], fish: [480, 760, 480, 300],
      s1: [580, 30, 280, 230], s2: [355, 300, 260, 230], s3: [825, 300, 260, 230], s4: [20, 352, 260, 230],
      s5: [1160, 352, 260, 230], s6: [180, 820, 280, 230], s7: [980, 820, 280, 230],
    },
    zoomOpen: 0.34,
    carry: [520, -380],
  };
  const OFF = [L.W + 80, L.H - 60];

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const EASE = {
    inOut: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: u => 1 - Math.pow(1 - u, 3),
    in: u => u * u * u,
  };
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const lerpR = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);

  const slotIn = r => [r[0] + r[2] / 2, r[1] + L.bar + (r[3] - L.bar - (L.icon + 46)) / 2 + L.icon / 2];
  const center = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];

  const wins = {};
  for (const w of S.windows) {
    wins[w.id] = { id: w.id, big: !!w.big, base: L.windows[w.id], lives: [], raises: [], moves: [] };
  }
  const icons = { me: { id: 'me', label: window.DeskConfig.meLabel, born: -Infinity, pop: false, goneT: Infinity, vanishT: Infinity,
                        segs: [{ t: -Infinity, kind: 'desk', pos: L.me }] } };
  const notifs = [], keys = [], menus = [], selects = [], clicks = [], grabs = [];
  const vis = [{ t: -Infinity, on: false }];
  let marquee = null, carry = null, title = null;

  const moveTo = (t, p, travel = 0.4, o = {}) => keys.push(Object.assign({ t, p, travel }, o));
  const click = (t, kind = 'click') => clicks.push({ t, kind });
  const segAt = (ic, t) => { let s = ic.segs[0]; for (const x of ic.segs) if (x.t <= t) s = x; return s; };

  const baseAt = (w, t) => {
    let [x, y, ww, hh] = w.base;
    for (const m of w.moves) { const u = EASE.inOut(clamp((t - m.t0) / (m.t1 - m.t0))); x += m.d[0] * u; y += m.d[1] * u; }
    return [x, y, ww, hh];
  };
  const restPos = (ic, t) => { const s = segAt(ic, t); return s.kind === 'win' ? slotIn(baseAt(wins[s.win], t)) : s.pos; };
  const notifRect = n => [L.notif.x, L.notif.y + n.slot * (L.notif.h + L.notif.gap), L.notif.w, L.notif.h];
  const activeNotif = (id, t) => notifs.find(n => n.id === id && n.t <= t && n.dismissT > t);

  const openLife = (w, t, dur, from) => w.lives.push({ openT: t, openDur: dur, openFrom: from, closeT: Infinity, closeDur: 0.15 });
  const liveAt = (w, t) => { let l = null; for (const x of w.lives) if (x.openT <= t) l = x; return l; };
  const closeLife = (w, t, dur = 0.15) => { const l = liveAt(w, t); if (l && l.closeT === Infinity) { l.closeT = t; l.closeDur = dur; } };
  function addNotif(id, t, from, text) {
    const used = notifs.filter(n => n.t <= t && n.dismissT > t).map(n => n.slot);
    let slot = 0;
    while (used.includes(slot)) slot++;
    const n = { id, t, from, text, slot, dismissT: Infinity };
    notifs.push(n);

    return n;
  }

  for (const e of S.events) {
    const t = e.t;
    switch (e.type) {
      case 'notify': addNotif(e.id, t, e.from, e.text); break;
      case 'popup': {
        const n = addNotif('p_' + e.win + '_' + t.toFixed(2), t, e.from, e.text), w = wins[e.win];
        n.dismissT = t + e.hold;
        openLife(w, t + e.hold, L.zoomOpen, notifRect(n));

        break;
      }
      case 'clearnotifs': notifs.forEach(n => { if (n.t <= t && n.dismissT > t) n.dismissT = t + 0.2; }); break;
      case 'browse': {
        e.over.forEach((id, i) => moveTo(t + (i + 1) * e.step, add2(slotIn(baseAt(wins[id], t)), [30, 34]), e.step * 0.7));
        break;
      }
      case 'open': {
        const n = activeNotif(e.from, t), r = notifRect(n), w = wins[e.win];
        moveTo(t - 0.05, center(r), 0.5);
        click(t);
        n.dismissT = t + 0.06;
        openLife(w, t + 0.04, L.zoomOpen, r);

        break;
      }
      case 'tug': {
        const p = add2(L.me, L.grab);
        moveTo(t - 0.1, p, e.approach || 0.45);
        click(t, 'press');
        grabs.push([t, e.t1]);
        let leave = t;
        for (const [id, arrive, hold] of e.seq) {
          const q = add2(L.tug[id], L.grab);
          moveTo(arrive, q, arrive - leave, { arc: id === 'work' ? 0.06 : -0.06 });
          moveTo(hold, q, 0);

          leave = hold;
        }
        moveTo(e.t1, p, e.t1 - leave, { arc: 0.05 });
        click(e.t1, 'release');
        icons.me.segs.push({ t, kind: 'drag', from: 'work', to: 'home' }, { t: e.t1, kind: 'desk', pos: L.me });

        break;
      }
      case 'dup': {
        const d = e.d, p = add2(L.me, L.grab);
        moveTo(t - 0.02, p, e.travel || 0.4);
        click(t, 'right');
        const m = { t0: t, t1: t + 0.75 * d + 0.04, x: p[0] + 6, y: p[1] + 6, hiT: t + 0.5 * d };
        menus.push(m);
        const row = [m.x + 110, m.y + L.menu.pad + L.menu.row * (L.menu.hit + 0.5)];
        moveTo(t + 0.55 * d, row, 0.38 * d);
        click(t + 0.75 * d);
        selects.push({ t0: t, t1: t + 0.75 * d, id: 'me' });
        const busy = Object.values(icons).some(ic => ic.id !== 'me' && ic.goneT > t && segAt(ic, t).kind === 'desk'
                                                && segAt(ic, t).pos[0] < L.me[0]);
        const pos = add2(L.me, L.dupAt[e.side === 'right' || busy ? 1 : 0]), born = t + 0.8 * d;
        icons[e.copy] = { id: e.copy, label: e.label, born, pop: true, goneT: Infinity, vanishT: Infinity,
                          segs: [{ t: born, kind: 'desk', pos }] };

        break;
      }
      case 'drag': {
        const ic = icons[e.copy], s = segAt(ic, t), from = s.kind === 'win' ? s.win : null;
        const p0 = restPos(ic, t), p1 = slotIn(baseAt(wins[e.to], e.t1));
        moveTo(t, add2(p0, L.grab), 0.4);
        click(t, 'press');
        grabs.push([t, e.t1]);
        ic.segs.push({ t, kind: 'drag', from, to: e.to });
        moveTo(e.t1, add2(p1, L.grab), e.t1 - t, { arc: 0.12, ease: 'inOut' });
        ic.segs.push({ t: e.t1, kind: 'win', win: e.to, dropT: e.t1 });
        click(e.t1, 'release');

        if (from && e.close) {
          const tc = t + 0.4 * (e.t1 - t);
          closeLife(wins[from], tc);

        }
        if (from && e.raise) { wins[from].raises.push(e.t1 + 0.05);  }
        break;
      }
      case 'dragin': {
        const w = wins[e.win], r = baseAt(w, t), n = activeNotif('n_' + e.win, t);
        const from = n ? notifRect(n) : [L.notif.x, L.notif.y, L.notif.w, L.notif.h];
        if (n) n.dismissT = t;
        openLife(w, t, Math.min(L.zoomOpen, 0.6 * (e.t1 - t)), from);
        const t0 = t, ta = t + 0.72 * (e.t1 - t);
        const p0 = [Math.max(r[0] - 100, 70), Math.min(r[1] + r[3] + 40, 1010)];
        icons[e.copy] = { id: e.copy, label: e.label, born: t0, pop: false, goneT: Infinity, vanishT: Infinity,
                          segs: [{ t: t0, kind: 'drag', from: null, to: e.win }, { t: ta, kind: 'win', win: e.win, dropT: ta }] };
        moveTo(t0, add2(p0, L.grab), 0);
        moveTo(ta, add2(slotIn(r), L.grab), ta - t0, { arc: 0.06, ease: 'out' });
        grabs.push([t0, ta]);
        click(ta, 'release');

        break;
      }
      case 'park': moveTo(t + 0.8, add2(L.me, [190, 70]), 0.8); break;
      case 'move': {
        const to = e.win ? add2(slotIn(baseAt(wins[e.win], t)), e.off || [0, 0]) : e.p;
        moveTo(t + e.travel, to, e.travel, { ease: e.ease });
        break;
      }
      case 'nudge': {
        const w = wins[e.win], grip = tt => { const r = baseAt(w, tt); return [r[0] + r[2] * 0.42, r[1] + L.bar / 2]; };
        for (const [t0, t1, d] of e.steps) w.moves.push({ t0, t1, d });
        moveTo(t, grip(t), e.travel || 0.5);
        click(t, 'press');
        for (const [t0, t1] of e.steps) { moveTo(t0, grip(t0), 0); moveTo(t1, grip(t1), t1 - t0, { ease: 'inOut' }); }
        const end = e.steps[e.steps.length - 1][1];
        grabs.push([t, end]);
        click(end, 'release');

        break;
      }
      case 'lunge': {
        const ic = icons.me, s = segAt(ic, t), from = s.kind === 'win' ? s.win : null;
        moveTo(t, add2(restPos(ic, t), L.grab), 0.35);
        click(t, 'press');
        grabs.push([t, e.t1]);
        ic.segs.push({ t, kind: 'drag', from, to: null }, { t: e.t1, kind: 'desk', pos: L.me, still: true });
        moveTo(e.t1, add2(L.me, L.grab), e.t1 - t, { ease: 'in' });
        if (from) closeLife(wins[from], t + 0.4 * (e.t1 - t));

        break;
      }
      case 'vanish': {
        const ic = icons[e.copy], s = segAt(ic, t);
        ic.vanishT = t; ic.goneT = t + 0.5;
        if (s.kind === 'win' && e.raise) {
          const tr = e.raise === true ? t + 0.55 : e.raise;
          wins[s.win].raises.push(tr);

        }
        if (s.kind === 'win' && e.close) { closeLife(wins[s.win], t + 0.6);  }

        break;
      }
      case 'hover': moveTo(t + 0.5, add2(slotIn(baseAt(wins[e.win], t)), L.grab), 0.5); break;
      case 'wipe': {
        for (const w of Object.values(wins)) { const l = liveAt(w, t); if (l && l.closeT > t) { l.closeT = t; l.closeDur = 0; } }
        for (const ic of Object.values(icons)) if (ic.id !== 'me' && ic.goneT > t) { ic.goneT = t; ic.vanishT = Infinity; }
        notifs.forEach(n => { if (n.t <= t && n.dismissT > t) n.dismissT = t; });
        vis.push({ t, on: false });

        break;
      }
      case 'cursor':
        vis.push({ t, on: e.on });
        if (e.on) moveTo(t, OFF, 0);
        break;
      case 'marquee': {
        const a = add2(L.me, [-125, -120]), b = add2(L.me, [125, 165]);
        moveTo(t, a, 0.6);
        click(t, 'press');
        moveTo(e.t1, b, e.t1 - t, { ease: 'inOut' });
        click(e.t1, 'release');
        marquee = { t0: t, t1: e.t1, a };
        selects.push({ t0: t + 0.7 * (e.t1 - t), t1: Infinity, id: 'me' });

        break;
      }
      case 'carry': {
        const p = add2(L.me, L.grab);
        moveTo(t - 0.05, p, 0.6);
        click(t, 'press');
        grabs.push([t, Infinity]);
        icons.me.segs.push({ t, kind: 'drag', from: null, to: null });
        moveTo(e.t1, add2(p, L.carry), e.t1 - t, { ease: 'in' });
        carry = { t0: t, t1: e.t1 };

        break;
      }
      case 'title': title = { t, text: e.text };  break;
    }
  }
  keys.sort((a, b) => a.t - b.t);
  keys.unshift({ t: -1e9, p: OFF, travel: 0 });
  clicks.sort((a, b) => a.t - b.t);

  function cursorAt(t) {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= b.t) continue;
      const start = Math.max(a.t, b.t - b.travel);
      if (t < start) return a.p;
      const u = (t - start) / (b.t - start), e = EASE[b.ease || 'inOut'](u);
      const p = lerp2(a.p, b.p, e);
      if (b.arc) {
        const d = sub2(b.p, a.p), s = Math.sin(Math.PI * e) * b.arc;
        p[0] += -d[1] * s; p[1] += d[0] * s;
      }
      return p;
    }
    return keys[keys.length - 1].p;
  }
  const lastOf = (list, t) => { let x = list[0]; for (const y of list) if (y.t <= t) x = y; return x; };

  const SPRING = { w: 2 * Math.PI * 2.4, z: 0.36, k: 0.024, max: 38, settle: 0.7, rate: 240 };
  const springs = new Map();
  function tiltFor(g, t) {
    if (!g || t < g[0]) return 0;
    if (!springs.has(g)) {
      const dt = 1 / SPRING.rate, end = Math.min(g[1], g[0] + 6) + SPRING.settle, out = [0];
      let th = 0, om = 0, prev = cursorAt(g[0]);
      for (let s = g[0] + dt; s <= end; s += dt) {
        const p = cursorAt(s), vx = s < g[1] ? (p[0] - prev[0]) / dt : 0;
        prev = p;
        const target = clamp(-vx * SPRING.k, -SPRING.max, SPRING.max);
        om += (SPRING.w * SPRING.w * (target - th) - 2 * SPRING.z * SPRING.w * om) * dt;
        th += om * dt;
        out.push(th);
      }
      springs.set(g, out);
    }
    const a = springs.get(g);
    return a[Math.min(a.length - 1, Math.floor((t - g[0]) * SPRING.rate))];
  }

  const cursorTilt = (() => {
    const rate = 120, dt = 1 / rate, n = Math.ceil((S.duration + 1) * rate), out = new Float32Array(n);
    let th = 0, om = 0, prev = cursorAt(0);
    for (let i = 1; i < n; i++) {
      const p = cursorAt(i * dt), jump = Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 120;
      const vx = jump ? 0 : (p[0] - prev[0]) / dt;
      prev = p;
      const target = clamp(-vx * SPRING.k, -SPRING.max, SPRING.max);
      om += (SPRING.w * SPRING.w * (target - th) - 2 * SPRING.z * SPRING.w * om) * dt;
      th += om * dt;
      out[i] = th;
    }
    return t => out[clamp(Math.round(t * rate), 0, n - 1)];
  })();
  const holding = t => grabs.find(([a, b]) => t >= a && t < b);
  const endedAt = t1 => grabs.find(g => Math.abs(g[1] - t1) < 1e-6);

  function clickScale(t) {
    let s = 1;
    for (const c of clicks) {
      const a = t - c.t;
      if (a < 0 || a > 0.22) continue;
      const depth = c.kind === 'release' ? 0.08 : 0.2;
      s = Math.min(s, a < 0.05 ? 1 - depth * a / 0.05 : 1 - depth * Math.cos((a - 0.05) / 0.17 * Math.PI / 2) + 0.03 * Math.sin((a - 0.05) / 0.17 * Math.PI));
    }
    return s;
  }

  function rectOf(w, t) {
    let [x, y, ww, hh] = baseAt(w, t);
    for (const r of w.raises) {
      const a = t - r;
      if (a >= 0 && a < 0.45) x += 16 * Math.sin(a * 2 * Math.PI * 6) * Math.exp(-a * 7);
    }
    return [x, y, ww, hh];
  }

  function openRect(w, l, t, lag = 0) {
    const u = EASE.out(clamp((t - lag - l.openT) / l.openDur));
    return lerpR(l.openFrom, rectOf(w, t), u);
  }

  function where(id, t) {
    if (id === 'cursor') return cursorAt(t);
    if (id === 'notifs') {
      const on = notifs.filter(n => t >= n.t && t < n.dismissT);
      const r = notifRect({ slot: on.length ? Math.max(...on.map(n => n.slot)) : 0 });
      return [r[0] + r[2] / 2, r[1] + r[3] / 2];
    }
    if (wins[id]) return center(rectOf(wins[id], t));
    const ic = icons[id];
    if (!ic) return [L.W / 2, L.H / 2];
    const s = segAt(ic, Math.max(t, ic.born));
    if (s.kind === 'desk') return s.pos;
    if (s.kind === 'win') return slotIn(rectOf(wins[s.win], t));
    return sub2(cursorAt(t), L.grab);
  }

  function at(t) {
    const hold = holding(t), tilt = cursorTilt(t);
    const settle = (t1, k) => (t1 > -Infinity && t - t1 < SPRING.settle ? tiltFor(endedAt(t1), t) * k : 0);

    const W = [];
    for (const w of Object.values(wins)) {
      const l = liveAt(w, t);
      if (!l) continue;
      const closing = t >= l.closeT;
      if (closing && (l.closeDur === 0 || t >= l.closeT + l.closeDur)) continue;
      const c = closing ? clamp((t - l.closeT) / l.closeDur) : 0;
      let z = l.openT;
      for (const r of w.raises) if (r <= t) z = Math.max(z, r);
      let rect = rectOf(w, t), alpha = 1 - c, scale = 1 - 0.1 * c;
      if (l.openFrom && t < l.openT + l.openDur + 0.12) {
        rect = openRect(w, l, t);
        alpha *= clamp(0.35 + 2.5 * (t - l.openT) / l.openDur);
      } else if (!l.openFrom && l.openDur) {
        const o = EASE.out(clamp((t - l.openT) / l.openDur));
        alpha *= o; scale *= 0.86 + 0.14 * o;
      }
      W.push({ id: w.id, z, rect, alpha, scale, icons: [] });
    }
    W.sort((a, b) => a.z - b.z);
    const byId = Object.fromEntries(W.map(w => [w.id, w]));

    const desk = [], dragging = [];
    for (const ic of Object.values(icons)) {
      if (t < ic.born || t >= ic.goneT) continue;
      const s = segAt(ic, t);
      let alpha = 1;
      if (t >= ic.vanishT) alpha = Math.floor((t - ic.vanishT) / 0.083) % 2 ? 0.12 : 1;
      const a = t - ic.born, scale = ic.pop && a < 0.16 ? 0.6 + 0.4 * EASE.out(a / 0.16) + 0.08 * Math.sin(Math.PI * a / 0.16) : 1;
      const selected = selects.some(x => x.id === ic.id && t >= x.t0 && t < x.t1);
      const it = { id: ic.id, label: ic.label, alpha, scale, selected, rot: 0 };
      if (s.kind === 'desk') desk.push(Object.assign(it, { pos: s.pos, rot: s.still ? 0 : settle(s.t, 0.55) }));
      else if (s.kind === 'win') {
        const w = byId[s.win];
        if (w) w.icons.push(Object.assign(it, { pos: slotIn(w.rect), rot: settle(s.dropT, 0.55), since: t - s.dropT }));
      } else {
        it.since = t - s.t; it.from = s.from;

        const masks = W.filter(w => w.id === s.from || w.id === s.to).map(w => ({ id: w.id, rect: w.rect, scale: w.scale }));
        dragging.push(Object.assign(it, { pos: sub2(cursorAt(t), L.grab), masks, rot: tilt * 0.55, pivot: cursorAt(t) }));
      }
    }

    const N = notifs.filter(n => t >= n.t && t < n.dismissT).map(n => {
      const u = EASE.out(clamp((t - n.t) / 0.28));
      const r = notifRect(n);
      return { from: n.from, text: n.text, rect: [r[0] + (1 - u) * (L.notif.w + 40), r[1], r[2], r[3]], alpha: clamp(u * 1.5) };
    });
    const m = menus.find(x => t >= x.t0 && t < x.t1);
    const menu = m && { x: m.x, y: m.y, ...L.menu, hi: t >= m.hiT ? L.menu.hit : -1, alpha: clamp((t - m.t0) / 0.06) };
    let box = null;
    if (marquee && t >= marquee.t0 && t < marquee.t1) {
      const b = cursorAt(t), a = marquee.a;
      box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
    }

    const cursor = { pos: cursorAt(t), visible: lastOf(vis, t).on, mode: hold ? 'grab' : 'arrow', scale: clickScale(t), angle: tilt };

    const overlay = title && t >= title.t ? { text: title.text, t0: title.t } : null;

    return { t, windows: W, desk, dragging, notifs: N, menu, marquee: box, cursor, overlay };
  }

  window.DeskMotion = { at, where, layout: L, duration: S.duration, carry: () => carry };
})();
