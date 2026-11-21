(function () {
  const S = window.DeskScript, L = window.DeskMotion.layout, bar = S.bar, C = S.coda, HIT = S.hit;
  const list = [];
  const fill = (t, z) => z.map(k => (k[0] === null ? [t, k[1], k[2]] : k));
  const shot = (t, kind, c, z, o = {}) => list.push(Object.assign({ t, kind, c, z: fill(t, z) }, o));
  const slot = id => { const r = L.windows[id]; return [r[0] + r[2] / 2, r[1] + L.bar + (r[3] - L.bar - (L.icon + 46)) / 2 + L.icon / 2]; };
  const NOTE0 = [L.notif.x + L.notif.w / 2, L.notif.y + L.notif.h / 2];

  const dragin = (t, id, o = {}) => {
    const r = L.windows[id];
    shot(t, 'close', [r[0] + r[2] * 0.4, r[1] + r[3] * 0.6], [[null, r[2] * 1.7, -0.022]], Object.assign({ tilt: [14, -18] }, o));
  };
  const FIRST = { tilt: [6, -9] };

  const chase = (t0, t1, w, o = {}, mode = 'src') => {
    const M = window.DeskMotion, up = 0.1 * w * 0.75;
    const pt = (id, t) => { const p = M.where(id, t); return [p[0], p[1] - up]; };
    const goals = [];
    let prev = null;
    for (const e of S.events) {
      if (e.t < t0 || e.t >= t1) continue;
      if (e.type === 'vanish' && e.raise) goals.push([e.t - 0.2, e.t + 0.25, pt(e.copy, e.t)]);
      if (e.type !== 'drag') continue;
      const to = pt(e.copy, e.t1 + 0.01);
      if (mode === 'pre' && prev) goals.push([prev.t1 + 0.15, e.t + 0.25, to]);
      else {
        if (mode === 'src' || !goals.length) goals.push([e.t - 0.6, e.t + 0.15, pt(e.copy, e.t - 0.01)]);
        goals.push(mode === 'follow' ? [e.t + 0.05, e.t1 + 0.1, to] : [e.t + 0.1, e.t1 + 0.2, to]);
      }
      prev = e;
    }
    goals.sort((a, b) => a[1] - b[1]);
    let [, , cur] = goals[0], last = t0;
    const path = [[t0, ...cur]];
    for (const [start, arrive, p] of goals.slice(1)) {
      const d = Math.hypot(p[0] - cur[0], p[1] - cur[1]);
      if (d < 24) continue;
      const go = Math.max(start, last), at = Math.max(arrive, go + 0.45 + d / 2400);
      if (go > last + 0.02) path.push([go, ...cur]);
      path.push([at, ...p]);
      cur = p; last = at;
    }
    list.push(Object.assign({ t: t0, kind: 'close', c: path[0].slice(1), z: [[t0, w, -0.02]], path }, o));
  };

  shot(0, 'wide', [720, 540], [[0, 1440, -0.012], [4.6, 1395, -0.015], [5.35, 1240, -0.45]], { ...FIRST });

  const W1 = [275, 200], H1 = [1225, 200];
  shot(5.35, 'close', [720, 480], [[5.35, 970, -0.45], [6.4, 820, -0.006], [19.7, 780, -0.003]], {
    ...FIRST, match: true,
    path: [
      [5.35, 720, 480], [6.4, 720, 480],
      [7.8, 330, 270], [8.45, 330, 270],
      [9.85, 1110, 270], [10.75, 1110, 270],
      [12.1, 737, 620], [13.05, 737, 620],
      [14.45, ...W1], [15.45, ...W1],
      [16.75, 835, 620], [17.05, 835, 620],
      [18.45, ...H1],
    ],
  });

  [['drink', 8], ['run', 10], ['fish', 12]].forEach(([id, b0]) => {
    shot(bar(b0) + 0.03, 'close', NOTE0, [[null, 640, -0.03]], { tilt: [10, -12] });
    dragin(bar(b0) + 0.75, id);
  });

  const n0 = bar(14) + 0.7, slotY = i => L.notif.y + i * (L.notif.h + L.notif.gap) + L.notif.h / 2;
  shot(n0, 'close', [NOTE0[0], slotY(1)], [[null, 680, -0.015]],
       { pan: [[n0, slotY(1), 0], [n0 + 2.5, slotY(5), 40]], tilt: [10, -12] });
  ['s2', 's3', 's4', 's5', 's6', 's7', 's1'].forEach((id, i) => dragin([17, 18, 19, 20, 21, 21 + 2 / 3, 22 + 1 / 3].map(bar)[i], id, { montage: true }));

  shot(bar(23), 'wide', [720, 540], [[null, 1400, -0.012]], { ...FIRST });
  const flick = S.events.find(e => e.type === 'vanish' && e.copy === 'c1').t;
  shot(flick + 0.15, 'close', slot('work'), [[null, 600, -0.02]], { tilt: [12, -15] });

  shot(bar(30) - 0.05, 'wide', [720, 540], [[null, 1400, -0.015]], { tilt: [6, 9] });

  const rescue = (t0, t1) => chase(t0, t1, 560, { tilt: [12, 14] });
  rescue(bar(33) + 0.15, bar(36) + 0.25);
  rescue(bar(36) + 0.25, bar(39) - 0.15);
  rescue(bar(39) - 0.15, bar(41) - 0.15);
  rescue(bar(41) - 0.15, bar(44));
  shot(bar(44), 'close', slot('run'), [[bar(44), 640, -0.08], [bar(46), 500, -0.12]], { tilt: [16, -14], dof: 1.2 });
  chase(bar(46) - 0.1, bar(47.9), 820, { tilt: [12, 14] }, 'follow');

  const vt = S.events.find(e => e.type === 'vanish' && e.t >= bar(47.9)).t - 0.15;

  chase(vt, bar(51.2), 720, { tilt: [11, 13] }, 'pre');
  chase(bar(51.2), bar(54.2), 800, { tilt: [11, -13] }, 'pre');

  const t9 = S.events.find(e => e.type === 'vanish' && e.t >= bar(54.2)).t - 0.15;
  shot(t9, 'wide', [705, 450], [[t9, 1250, -0.03], [bar(60), 1110, -0.04]], { tilt: [10, -12] });

  shot(bar(60), 'wide', [720, 540], [[null, 1440, -0.02]], { ...FIRST });
  shot(HIT, 'wide', [720, 540], [[HIT, 1440, -0.012], [C[2] - 0.2, 1390, -0.012], [C[3], 1100, -0.2], [C[4], 920, -0.08]],
       { ...FIRST });
  shot(C[4], 'title', [720, 540], [[null, 1440, 0]], {});

  list.sort((a, b) => a.t - b.t);
  window.DeskShots = { list };
})();
