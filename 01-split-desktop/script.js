(function () {
  const TL = window.TL;
  const BARS = TL.bars.filter(b => typeof b.bar === 'number');
  const CODA = TL.bars.filter(b => typeof b.bar !== 'number').map(b => b.t);
  const bar = x => {
    const i = Math.floor(x), a = BARS.find(b => b.bar === i), b = BARS.find(b => b.bar === i + 1);
    return b ? a.t + (x - i) * (b.t - a.t) : a.t;
  };
  const beat = (n, k) => bar(n + k / 3);
  const HIT = bar(62);

  const CFG = window.DeskConfig;
  const WINDOWS = CFG.windows;
  const WIN = Object.fromEntries(WINDOWS.map(w => [w.id, w]));
  const label = CFG.copyLabel;

  const E = [];
  const add = (type, t, o = {}) => E.push(Object.assign({ type, t }, o));
  const notify = (t, win, id = 'n_' + win) => add('notify', t, { id, win, from: WIN[win].from, text: WIN[win].text });
  const open = (t, win) => add('open', t, { win, from: 'n_' + win });
  const dup = (t, n, d = 0.55, side, travel) => add('dup', t, { copy: 'c' + n, label: label(n), d, side, travel });
  const drag = (t, t1, n, to, o = {}) => add('drag', t, Object.assign({ t1, copy: 'c' + n, to }, o));
  const vanish = (t, n, o = {}) => add('vanish', t, Object.assign({ copy: 'c' + n }, o));
  const dragin = (t, t1, win, n) => add('dragin', t, { t1, win, copy: 'c' + n, label: label(n) });

  notify(0.6, 'work');
  notify(1.6, 'home');
  add('cursor', 2.8, { on: true });
  open(3.35, 'work');
  open(4.3, 'home');

  add('tug', 6.0, { t1: 11.45, approach: 1.1, seq: [['work', 6.85, 8.3], ['home', 9.35, 10.6]] });

  dup(12.0, 1, 0.6);
  drag(13.0, 13.95, 1, 'work');
  dup(16.3, 2, 0.55, 'right', 1.0);
  drag(17.0, 17.9, 2, 'home');

  [['drink', 3, 8], ['run', 4, 10], ['fish', 5, 12]].forEach(([w, n, b0]) => {
    notify(bar(b0), w);
    dragin(bar(b0) + 0.75, bar(b0 + 2) - 0.1, w, n);
  });

  const SMALL = ['s2', 's3', 's4', 's5', 's6', 's7', 's1'];
  const COPY = Object.fromEntries(SMALL.map((w, i) => [w, 6 + i]));
  SMALL.forEach((w, i) => notify(bar(14) + 0.8 + i * 0.32, w));
  add('clearnotifs', bar(17));
  const ins = [17, 18, 19, 20, 21, 21 + 2 / 3, 22 + 1 / 3, 23].map(bar);
  SMALL.forEach((w, i) => dragin(ins[i], ins[i + 1], w, COPY[w]));

  add('nudge', bar(24), { win: 's3', travel: 0.5, steps: [[bar(24) + 0.05, bar(24) + 0.8, [-26, 30]], [bar(24) + 1.25, bar(24) + 1.65, [8, -6]]] });
  add('move', bar(24) + 2.2, { p: [760, 420], travel: 1.3 });

  vanish(bar(28) + 0.1, 1, { raise: bar(29) + 0.6 });
  add('move', bar(28) + 0.15, { win: 'work', off: [70, 80], travel: 0.45, ease: 'out' });
  add('browse', bar(30) + 0.1, { over: ['s4', 'drink', 's2', 'run', 'fish'], step: 0.38 });
  drag(bar(30) + 2.05, bar(30) + 3.15, 5, 'work', { close: true });
  vanish(bar(33) + 0.3, 2, { raise: true });
  drag(bar(34) + 0.4, bar(35) + 0.2, COPY.s1, 'home', { close: true });
  vanish(bar(36) + 0.4, 5, { raise: true });
  drag(bar(37), bar(37) + 0.75, COPY.s2, 'work', { close: true });
  vanish(bar(39), COPY.s1, { raise: true });
  drag(bar(39) + 0.65, bar(40) + 0.3, COPY.s3, 'home', { close: true });
  vanish(bar(40) + 0.6, COPY.s5, { close: true });
  vanish(bar(41), COPY.s2, { raise: true });
  drag(bar(41) + 0.6, bar(42) + 0.2, COPY.s4, 'work', { close: true });
  vanish(bar(42) + 0.3, COPY.s6, { close: true });
  vanish(bar(42) + 0.55, COPY.s7, { close: true });
  vanish(bar(42) + 0.8, 3, { raise: true });

  add('hover', bar(44), { t1: bar(46), win: 'run' });
  drag(bar(46), bar(46) + 0.8, 4, 'drink', { close: true });
  {

    const followUps = id => (WIN[id] && WIN[id].followUps && WIN[id].followUps.length ? WIN[id].followUps : [WIN[id].text]);
    const said = { work: 0, home: 0, drink: 0 };
    const starts = [48, 49.75, 51.25, 52.5, 53.5, 54.25, 55, 55.75, 56.5, 57.25, 58, 58.75, 59.5, 60];
    const filled = [['work', 'c' + COPY.s4], ['drink', 'c4']], empty = ['home'];
    vanish(bar(48), COPY.s3, { raise: true });
    for (let k = 0; k < starts.length - 1; k++) {
      const T = bar(starts[k]), len = bar(starts[k + 1]) - T;
      if (starts[k] === 54.25) {
        const [w, id] = filled.pop();
        add('vanish', T, { copy: id, raise: true });
        empty.push(w);
        continue;
      }
      const t0 = T + (k === 0 ? 0.6 : 0.08), t1 = t0 + 0.55 * (len - (k === 0 ? 0.6 : 0.08)), to = empty.shift();
      if (starts[k] === 55) {
        add('drag', t0, { t1: t0 + 0.8 * (len - 0.08), copy: 'me', to });
        filled.push([to, 'me']);
        continue;
      }
      const [from, id] = filled.shift();
      add('drag', t0, { t1, copy: id, to, close: true });
      filled.push([to, id]);
      const msgs = followUps(from);
      add('popup', t1 + 0.05, { win: from, from: WIN[from].from, text: msgs[said[from]++ % msgs.length], hold: 0.22 });
      empty.push(from);
    }
    var [lastWin, lastCopy] = filled.find(f => f[1] !== 'me');
    var meWin = filled.find(f => f[1] === 'me')[0];
  }

  add('vanish', bar(60) + 0.05, { copy: lastCopy });
  ['run', 's2', 'fish', 's5', 'drink', 's1', 'home', 's6', 's3', 's7', 's4', 'work']
    .filter(w => w !== lastWin && w !== meWin).concat([lastWin])
    .forEach((w, k) => add('popup', bar(60 + k / 6), { win: w, from: WIN[w].from, text: WIN[w].text, hold: 0.1 }));
  add('lunge', bar(61.1), { t1: HIT });
  add('wipe', HIT);

  notify(CODA[0] + 0.1, 'work', 'n_work2');
  notify(CODA[0] + 1.0, 'home', 'n_home2');
  add('cursor', CODA[1], { on: true });
  add('marquee', CODA[2], { t1: CODA[2] + 1.1 });
  add('carry', CODA[3], { t1: CODA[4] });
  add('title', CODA[4], { text: CFG.endingTitle });

  E.sort((a, b) => a.t - b.t);

  window.DeskScript = { windows: WINDOWS, events: E, duration: TL.duration, bar, beat, coda: CODA, hit: HIT };
})();
