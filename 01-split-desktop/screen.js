(function () {
  const q = new URLSearchParams(location.search);
  const value = (name, fallback, lo, hi) => {
    const n = q.has(name) ? Number(q.get(name)) : fallback;
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  };
  const config = Object.freeze({
    enabled: q.get('crt') === '1',
    moire: value('crtMoire', 0.22, 0, 1.5),
    halation: value('crtGlow', 0.16, 0, 0.5),
    scan: value('crtScan', 0.18, 0, 0.7),
    grid: value('crtGrid', 0, 0, 1),
    mtf: value('crtMTF', 0.42, 0.15, 1.5),
    sharpen: value('crtSharp', 0.12, 0, 0.5),
    pitch: value('crtPitch', 1.12, 1, 1.5),
  });
  let time = 0;
  const post = (src, t) => { time = t; return src; };

  function regions() {
    const st = DeskMotion.at(time), bar = DeskMotion.layout.bar;
    const windows = st.windows.filter(w => w.alpha > 0.01).slice(-8);
    const outers = windows.map(w => {
      const [x,y,ww,hh] = w.rect, s = w.scale;
      return [x + ww * (1-s)/2, y + hh * (1-s)/2, ww*s, hh*s];
    });
    const rects = windows.map(w => {
      const [x, y, ww, hh] = w.rect, s = w.scale, cx = x + ww / 2, cy = y + hh / 2;
      const classic = q.get('skin') === 'classic', frame = q.get('frame');
      const margin = classic ? (frame === 'platinum' ? 5 : 3) : 4;
      const scroll = classic && frame === 'scroll' ? 18 : 0;
      return [cx + (x + margin - cx) * s, cy + (y + bar - cy) * s, (ww - margin*2 - scroll) * s, (hh - bar - margin - scroll) * s];
    });
    const exclude = st.notifs.filter(n => n.alpha > 0.01).slice(-8).map(n => n.rect);

    if (st.cursor.visible && exclude.length < 8) { const [x,y] = st.cursor.pos; exclude.push([x-8,y-8,66,90]); }
    for (const it of st.dragging) { if (exclude.length >= 8) break; exclude.push([it.pos[0]-76,it.pos[1]-76,152,200]); }
    return { rects, outers, exclude };
  }
  window.DeskScreen = { post, config, regions, get time() { return time; }, get PX() { return Number(DeskSkin.PX) || 2.25; } };
})();
