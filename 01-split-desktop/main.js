(function () {
  const q = new URLSearchParams(location.search);
  const L = DeskMotion.layout, OS = DeskCamera.OS;
  const W = +q.get('w') || 960, H = +q.get('h') || Math.round(W * L.H / L.W);
  const out = document.getElementById('c');
  out.width = W; out.height = H;
  const scr = document.createElement('canvas');
  scr.width = Math.round(W * OS); scr.height = Math.round(H * OS);
  const ctx = scr.getContext('2d');
  const acc = document.createElement('canvas');
  acc.width = scr.width; acc.height = scr.height;
  const actx = acc.getContext('2d');

  function frame(t) {
    const st = DeskMotion.at(t), cam = DeskCamera.at(t), z = W / cam.w;
    ctx.setTransform(z, 0, 0, z, scr.width / 2 - cam.cx * z, scr.height / 2 - cam.cy * z);
    DeskSkin.draw(ctx, st, t);
    if (st.overlay) {
      const [x, y] = DeskCamera.titleAt(t, st.overlay.t0);
      ctx.setTransform(W / L.W, 0, 0, W / L.W, (scr.width - W) / 2, (scr.height - H) / 2);
      DeskSkin.overlay(ctx, { ...st.overlay, x, y });
    }
  }

  const S = DeskScript, busyFrom = S.bar(48), busyTo = S.hit;
  const shutter = t => (t >= busyFrom && t < busyTo ? 0.05 : 0.03);

  function subframes(t, sh, a, b) {
    const t0 = Math.max(t - sh / 2, a), t1 = Math.min(t + sh / 2, b - 1e-4), c0 = DeskCamera.at(t0), c1 = DeskCamera.at(t1), z = W / c1.w;
    const p0 = DeskMotion.where('cursor', t0), p1 = DeskMotion.where('cursor', t1);
    const cur = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * z;
    const cam = (Math.abs(c1.cx - c0.cx) + Math.abs(c1.cy - c0.cy)) * z + Math.abs(Math.log(c1.w / c0.w)) * W / 2;
    return Math.max(24, Math.min(96, Math.ceil(Math.max(cur, cam) / 1.5)));
  }

  window.renderAt = t => {
    const sh = shutter(t), [a, b] = DeskCamera.span(t), n = window.NO_BLUR ? 1 : subframes(t, sh, a, b);
    for (let k = 0; k < n; k++) {
      const tk = n === 1 ? t : Math.min(Math.max(t + sh * (k / (n - 1) - 0.5), a), b - 1e-4);
      frame(tk);
      actx.globalAlpha = 1 / (k + 1);
      actx.drawImage(scr, 0, 0);
    }
    actx.globalAlpha = 1;
    const exposure = DeskScreen.config.enabled ? {
      open: DeskCamera.at(n === 1 ? t : Math.max(t - sh / 2, a)),
      close: DeskCamera.at(n === 1 ? t : Math.min(t + sh / 2, b - 1e-4)),
    } : undefined;
    DeskCamera.lens(DeskScreen.post(acc, t), out, DeskCamera.at(t), exposure);
  };
  window.animation = {
    duration: DeskMotion.duration,
    seek(t) {
      window.NO_BLUR = !q.has('capture');
      renderAt(t);
    }
  };
})();
