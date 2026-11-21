window.FILM = (function () {

  const SCENES = [

    { id: 'S01', bar: 0, cut: 4, screen: 'break', act: 'draw', opts: { holes: 'none' }, shots: [
      { a: [-6, -12, -3], w: [245, 228] },
      { a: [-4, -24, -5], w: [200, 186], follow: 0.6 } ] },
    { id: 'S02', bar: 2, cut: 4, screen: 'break', act: 'ease', warp: [[0, 2, 0], [0.85, 2, 2], [1.15, 2, 3], [2.15, 3, 0], [3.15, 3, 2], [3.3, 3, 3], [4.3, 4, 0]], opts: { holes: 'none' }, shots: [
      { a: [8, -28, 6], w: [330, 310], look: 'curve', pan: [36, 54], panE: 'out', pan2: [10, 14] },
      { a: [10, -18, 4], w: [205, 190] } ] },
    { id: 'S03', bar: 4, cut: 4, screen: 'break', act: 'wheel', warp: [[0, 4, 0], [0.85, 4, 2], [1.0, 4, 3], [2.2, 5, 0], [3.4, 5, 2], [3.5, 5, 3], [4.57, 6, 0.15]], opts: { holes: 'none' }, shots: [
      { a: [4, -10, 2], w: [240, 222] },
      { a: [12, -20, 4], w: [196, 182], follow: 0.6 } ] },
    { id: 'S04', bar: 6, cut: 4, screen: 'break', act: 'u', warp: [[0, 6, 0], [1.0, 6, 1.93], [1.08, 6, 2], [3.07, 7, 2], [3.15, 7, 3], [4.25, 8, 0.2]], opts: { holes: 'none' }, shots: [
      { a: [16, -12, 3], w: [245, 228] },
      { a: [8, -24, 6], w: [200, 186] } ] },
    { id: 'S05', bar: 8, cut: 4, screen: 'break', act: 'ease2', warp: [[0, 8, 0], [0.9, 8, 3], [1.15, 8, 3.4], [2.4, 9, 0.2]], opts: { holes: 'none' }, shots: [
      { a: [4, -22, -3], w: [215, 200] } ] },

    { id: 'S06', bar: 9, cut: 4, screen: 'break', act: 'num', warp: [[0, 9, 0], [0.85, 9, 1], [2.126, 10, 0]], opts: { holes: 'none' }, shots: [
      { a: [14, -20, 6], w: [205, 192], look: 'numup' } ] },
    { id: 'S07', bar: 10, cut: 4, screen: 'break', act: 'tweak', warp: [[0, 10, 0], [0.8, 10, 1], [1.1, 10, 2], [2.126, 11, 0]], opts: { holes: 'none' }, shots: [
      { a: [-14, -24, -6], w: [215, 200] } ] },
    { id: 'S08', bar: 11, cut: 4, screen: 'break', act: 'graph2', warp: [[0, 11, 0], [0.7, 11, 1], [1.0, 11, 2], [2.126, 12, 0]], opts: { holes: 'none' }, shots: [
      { a: [-6, -16, -4], w: [205, 192] } ] },
    { id: 'S09', bar: 12, cut: 4, screen: 'break', act: 'grade', warp: [[0, 12, 0], [0.9, 12, 1], [2.3, 13, 0]], opts: { holes: 'none' }, shots: [
      { a: [16, -26, -4], w: [205, 190] } ] },

    { id: 'S10', bar: 13, cut: 4, screen: 'break', act: 'close', warp: [[0, 13, 0], [1.05, 13, 2], [3.1, 14, 2]], opts: { holes: 'S10', chars: true }, shots: [
      { a: [-10, -20, 7], w: [212, 196] },
      { a: [-4, -14, 4], w: [112, 104], follow: 0.55 } ] },
    { id: 'S11', bar: 15, cut: 4, screen: 'break', act: 'graph', warp: [[0, 15, 0], [0.95, 15, 2], [3.3, 16, 2]], opts: { holes: 'S11', chars: true }, shots: [
      { a: [-10, -12, -4], w: [122, 112], follow: 0.55 },
      { a: [6, -22, 4], w: [310, 290], look: 'rise', pan: [0, -28], panE: 'out', pan2: [30, 0] } ] },
    { id: 'S12', bar: 17, cut: 4, screen: 'break', act: 'closeu', warp: [[0, 17, 0], [1.05, 17, 2], [3.1, 18, 2]], opts: { holes: 'S12', chars: true }, shots: [
      { a: [6, -20, 6], w: [220, 204] },
      { a: [10, -16, 4], w: [104, 96], follow: 0.5 } ] },
    { id: 'S13', bar: 19, cut: 4, screen: 'break', act: 'spring', warp: [[0, 19, 0], [0.9, 19, 2], [3.35, 20, 2]], opts: { holes: 'S13', chars: true }, shots: [
      { a: [14, -12, 4], w: [196, 184] },
      { a: [10, -20, -5], w: [330, 310], look: 'spring', pan: [40, 0], panE: 'out' } ] },

    { id: 'S14', bar: 21, cut: 4, screen: 'break', act: 'diamond', warp: [[0, 21, 0], [1.15, 21, 2], [3.2, 22, 3.5]], opts: { holes: 'S14', chars: true }, shots: [
      { a: [10, -14, 5], w: [214, 200], look: 'key', pan: [16, -6], panE: 'out' },
      { a: [-6, -10, 3], w: [100, 92], look: 'key' } ] },

    { id: 'S15', bar: 23, cut: 4, screen: 'break', act: 'climb', opts: { holes: 'S15' }, shots: [
      { a: [4, -12, 3], w: [330, 312], follow: 0.3 },
      { a: [-8, -16, -2], w: [124, 114], follow: 0.25 },
      { a: [-2, -12, 3], w: [250, 236], follow: 0.3 },
      { a: [-8, -14, -2], w: [130, 112], follow: 0.2 } ] },

    { id: 'S16', bar: 27, screen: 'break', act: 'climb', opts: { holes: 'S16', fade: [68.7, 70.0] }, shots: [
      { a: [-4, -8, 2], w: [290, 360], look: 'curve' } ] },
  ];

  function layout(TL) {
    const bars = TL.bars, END = TL.events.end;
    const beat = (b, k) => {
      while (b < bars.length && k >= bars[b].meter) { k -= bars[b].meter; b++; }
      return b < bars.length ? bars[b].start + (k * bars[b].dur) / bars[b].meter : TL.events.music_ends;
    };
    const startOf = (s) => (s.ev ? TL.events[s.ev] : beat(s.bar, 0));
    const shots = [];
    SCENES.forEach((s, i) => {
      s.start = i === 0 ? 0 : startOf(s);
      s.actStart = s.cont ? SCENES[i - 1].actStart : s.start;
      s.end = i + 1 < SCENES.length ? startOf(SCENES[i + 1]) : END;
      s.speed = s.len ? s.len / (s.end - s.start) : 1;
      if (s.warp) s.warpT = s.warp.map(([a, b, x]) => [b === null ? x : beat(b, x || 0), a]).sort((p, q) => p[0] - q[0]);
      s.shots.forEach((sh, j) => {
        sh.scene = s; sh.id = s.id + 'abcdef'[j];
        sh.start = j === 0 ? s.start : beat(s.bar, j * s.cut);
        sh.end = j + 1 < s.shots.length ? beat(s.bar, (j + 1) * s.cut) : s.end;
        shots.push(sh);
      });
    });
    shots.forEach((sh, i) => { sh.clampStart = !!sh.skip; sh.clampEnd = !!(shots[i + 1] && shots[i + 1].skip); });
    return shots;
  }

  function actTime(t, sh) {
    const s = sh.scene, W = s.warpT;
    if (!W) return (t - s.actStart) * (s.speed || 1) + (sh.skip || 0);
    if (W.length === 1) return W[0][1] + (t - W[0][0]);
    let i = 0; while (i < W.length - 2 && t > W[i + 1][0]) i++;
    const [t0, a0] = W[i], [t1, a1] = W[i + 1];
    return a0 + ((t - t0) * (a1 - a0)) / (t1 - t0);
  }
  return { SCENES, layout, actTime };
})();
