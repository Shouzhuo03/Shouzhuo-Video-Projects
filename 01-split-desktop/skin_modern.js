(function () {
  const K = window.DeskKit, L = window.DeskMotion.layout, { rr, shadow, text, mix } = K;
  const Q = new URLSearchParams(location.search);
  const DOCK = Q.get('dock') === '1';
  const S = {
    gloss: false, tileR: 20, pillR: 10, sel: '#2F6BEA', selBox: 'rgba(255,255,255,0.22)',
    labelWin: '#1D1D1F', labelShadow: 'rgba(0,0,0,0.62)', labelPill: true, tileEdge: 'rgba(0,0,0,0.07)', tileShadow: ['rgba(20,30,50,0.22)', 14, 6],
  };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  const E = { x: -560, y: -440, w: 2560, h: 1960, k: 0.5 };
  const R1 = { x: -216, y: -162, w: 1872, h: 1404 };
  let photo = null, sharp = null, blurred = null, framed = null;
  const cover = (src, dx, dy, dw, dh) => {
    const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height, s = Math.max(dw / iw, dh / ih), sw = dw / s, sh = dh / s;
    return [src, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh];
  };
  function bake() {

    const c = cover(photo, 0, 0, R1.w, R1.h), sw = Math.min(c[3], 4096), sh = sw * R1.h / R1.w;
    sharp = document.createElement('canvas'); sharp.width = Math.round(sw); sharp.height = Math.round(sh);
    const sg = sharp.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(c[0], c[1], c[2], c[3], c[4], 0, 0, sharp.width, sharp.height);
    const k = E.k, W = E.w * k, H = E.h * k, rx = (R1.x - E.x) * k, ry = (R1.y - E.y) * k, rw = R1.w * k, rh = R1.h * k;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const ext = mk(), g = ext.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(...cover(photo, rx, ry, rw, rh));
    g.drawImage(ext, rx, ry, 1, rh, 0, ry, rx, rh);
    g.drawImage(ext, rx + rw - 1, ry, 1, rh, rx + rw, ry, W - rx - rw, rh);
    g.drawImage(ext, 0, ry, W, 1, 0, 0, W, ry);
    g.drawImage(ext, 0, ry + rh - 1, W, 1, 0, ry + rh, W, H - ry - rh);
    blurred = mk(); const b = blurred.getContext('2d');
    b.filter = 'blur(16px)'; b.drawImage(ext, -24, -24, W + 48, H + 48);
    const mask = mk(), m = mask.getContext('2d');
    m.filter = 'blur(15px)'; m.fillStyle = '#fff';
    m.fillRect((-100 - E.x) * k, (-100 - E.y) * k, (1440 + 200) * k, (1080 + 200) * k);
    framed = mk(); const f = framed.getContext('2d');
    f.drawImage(blurred, 0, 0); f.globalCompositeOperation = 'destination-out'; f.drawImage(mask, 0, 0);
  }
  const image = new Image();
  image.src = window.DeskWalls[3];
  window.DeskSceneReady = Promise.all([window.DeskSceneReady, image.decode()]).then(() => {
    photo = image;
    bake();
  });
  function paintWall(ctx) {
    ctx.fillStyle = '#26323F'; ctx.fillRect(E.x, E.y, E.w, E.h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(blurred, E.x, E.y, E.w, E.h);
    ctx.drawImage(sharp, R1.x, R1.y, R1.w, R1.h);
    ctx.drawImage(framed, E.x, E.y, E.w, E.h);
  }

  function glass(ctx, bbox, shape, blur, extra = 'saturate(1.7)') {
    const m = ctx.getTransform(), z = Math.hypot(m.a, m.b), cv = ctx.canvas;
    const pts = [[bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[0], bbox[3]], [bbox[2], bbox[3]]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    const pad = Math.ceil(blur * z * 2.2) + 2;
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])) - pad)), y0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])) - pad));
    const x1 = Math.min(cv.width, Math.ceil(Math.max(...pts.map(p => p[0])) + pad)), y1 = Math.min(cv.height, Math.ceil(Math.max(...pts.map(p => p[1])) + pad));
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save(); shape(); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${blur * z}px) ${extra}`;
    ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }

  function outerShadow(ctx, bbox, shape, color, blur, offY) {
    ctx.save();
    const big = 400, P = new Path2D(); P.rect(bbox[0] - big, bbox[1] - big, bbox[2] - bbox[0] + 2 * big, bbox[3] - bbox[1] + 2 * big);
    P.addPath(shape.path());
    ctx.clip(P, 'evenodd');
    shape(); shadow(ctx, color, blur, offY); ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
  }
  const rrShape = (ctx, x, y, w, h, r) => Object.assign(() => rr(ctx, x, y, w, h, r), { path: () => { const q = new Path2D(); q.roundRect(x, y, w, h, r); return q; } });

  function glassCard(ctx, x, y, w, h, r, o) {
    const shape = rrShape(ctx, x, y, w, h, r), bbox = [x, y, x + w, y + h];
    glass(ctx, bbox, shape, o.blur, o.glassExtra);
    outerShadow(ctx, bbox, shape, o.shadow, o.shadowBlur, o.shadowY);
    shape(); ctx.fillStyle = o.tint; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    const v = ctx.createLinearGradient(0, y, 0, y + h);
    v.addColorStop(0, 'rgba(255,255,255,0.30)'); v.addColorStop(0.5, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h); ctx.restore();
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    rr(ctx, x - 0.5, y - 0.5, w + 1, h + 1, r + 0.5); ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  const RAD = 26;
  function drawWindow(ctx, w, t, active) {
    const [x, y, ww, hh] = w.rect, cx = x + ww / 2, cy = y + hh / 2;
    ctx.save(); ctx.globalAlpha = w.alpha;
    ctx.translate(cx, cy); ctx.scale(w.scale, w.scale); ctx.translate(-cx, -cy);
    ctx.save(); shadow(ctx, active ? 'rgba(6,10,24,0.50)' : 'rgba(6,10,24,0.32)', active ? 74 : 48, active ? 30 : 18);
    rr(ctx, x, y, ww, hh, RAD); ctx.fillStyle = '#F2F2F4'; ctx.fill(); ctx.restore();
    ctx.save(); shadow(ctx, 'rgba(6,10,24,0.30)', 10, 3); rr(ctx, x, y, ww, hh, RAD); ctx.fillStyle = '#F2F2F4'; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, x, y, ww, hh, RAD); ctx.clip();
    const content = [x, y + L.bar, ww, hh - L.bar], env = { id: w.id, r: content };
    const bar = ctx.createLinearGradient(0, y, 0, y + L.bar); bar.addColorStop(0, '#FCFCFD'); bar.addColorStop(1, '#F0F0F2');
    ctx.fillStyle = bar; ctx.fillRect(x, y, ww, L.bar);
    K.scene(ctx, w.id, content, t, S, 'back');
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x, y + L.bar - 1, ww, 1);
    [['#FF5F57', '#E0443E'], ['#FEBC2E', '#D89E1F'], ['#28C840', '#1EA832']].forEach(([c, edge], i) => {
      const px = x + 26 + i * 22, py = y + L.bar / 2;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = active ? c : '#D4D4D8'; ctx.fill(); ctx.strokeStyle = active ? edge : '#BDBDC2'; ctx.lineWidth = 0.9; ctx.stroke();
      if (active) { ctx.beginPath(); ctx.arc(px, py - 1.6, 4.4, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    });
    for (const it of w.icons) K.icon(ctx, it, K.looks[w.id], true, S, env, 'body');
    K.scene(ctx, w.id, content, t, S, 'front');
    for (const it of w.icons) K.icon(ctx, it, K.looks[w.id], true, S, env, 'label');
    ctx.restore();
    rr(ctx, x + 0.5, y + 0.5, ww - 1, hh - 1, RAD - 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    rr(ctx, x - 0.4, y - 0.4, ww + 0.8, hh + 0.8, RAD + 0.4); ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
  }

  function docMark(ctx, cx, cy, h, color, foldAlpha = 0.55) {
    const w = h * 0.74, x = cx - w / 2, y = cy - h / 2, f = w * 0.38, r = w * 0.12;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - f, y); ctx.lineTo(x + w, y + f); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w - f, y); ctx.lineTo(x + w, y + f); ctx.lineTo(x + w - f, y + f); ctx.closePath();
    ctx.fillStyle = `rgba(0,0,0,${foldAlpha * 0.5})`; ctx.fill();
  }
  function tile(ctx, x, y, s, a, b, r = s * 0.23) {
    ctx.save(); shadow(ctx, 'rgba(0,0,0,0.28)', s * 0.12, s * 0.05);
    rr(ctx, x, y, s, s, r); const v = ctx.createLinearGradient(0, y, 0, y + s); v.addColorStop(0, a); v.addColorStop(1, b); ctx.fillStyle = v; ctx.fill(); ctx.restore();
    rr(ctx, x + 0.4, y + 0.4, s - 0.8, s - 0.8, r); ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  const MSG_BUBBLE = new Path2D('M47.881 91.617C51.731 92.517 55.797 93 60 93c24.3 0 44-16.118 44-36S84.3 21 60 21 16 37.118 16 57c0 12.976 8.39 24.348 20.975 30.683-.69 4.907-2.683 8.512-5.975 10.817 6.58 0 12.207-2.294 16.881-6.883z');
  function messagesTile(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 120, s / 120);
    ctx.save(); shadow(ctx, 'rgba(0,0,0,0.22)', 10, 3);
    rr(ctx, 0, 0, 120, 120, 28); const g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#91FC8A'); g.addColorStop(1, '#00DD35');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#FFFFFF'; ctx.fill(MSG_BUBBLE);
    ctx.restore();
  }
  function bubbleTile(ctx, x, y, s) {
    tile(ctx, x, y, s, '#FF9C6B', '#EE4F45');
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 80, s / 80);
    rr(ctx, 16, 19, 48, 33, 11); ctx.moveTo(26, 50); ctx.lineTo(24, 63); ctx.lineTo(38, 52); ctx.closePath();
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    for (let i = 0; i < 2; i++) { rr(ctx, 24, 29 + i * 9, 32 - i * 11, 4, 2); ctx.fillStyle = 'rgba(238,79,69,0.75)'; ctx.fill(); }
    ctx.restore();
  }

  const DOCK_TILES = [
    ['#F1F5FA', '#B8C6D8', (c, s) => docMark(c, s / 2, s / 2, s * 0.62, '#2F3B4C')],
    ['#FFA46E', '#EE4C42', (c, s) => { c.beginPath(); c.arc(s / 2, s / 2, s * 0.24, 0, 6.2832); c.strokeStyle = '#fff'; c.lineWidth = s * 0.1; c.stroke(); }],
    ['#4FD6BF', '#0F8A7E', (c, s) => { [0.3, 0.5, 0.7].forEach((k, i) => { rr(c, s * 0.26, s * (k - 0.04), s * (0.48 - i * 0.08), s * 0.08, s * 0.04); c.fillStyle = '#fff'; c.fill(); }); }],
    ['#8E80FA', '#4B3FCB', (c, s) => { c.beginPath(); c.moveTo(s / 2, s * 0.22); c.lineTo(s * 0.76, s / 2); c.lineTo(s / 2, s * 0.78); c.lineTo(s * 0.24, s / 2); c.closePath(); c.fillStyle = '#fff'; c.fill(); }],
    ['#5DB4FF', '#2467E6', (c, s) => { c.beginPath(); c.moveTo(s * 0.22, s * 0.56); c.bezierCurveTo(s * 0.36, s * 0.3, s * 0.46, s * 0.3, s * 0.52, s * 0.52); c.bezierCurveTo(s * 0.58, s * 0.72, s * 0.66, s * 0.72, s * 0.78, s * 0.44); c.strokeStyle = '#fff'; c.lineWidth = s * 0.09; c.lineCap = 'round'; c.stroke(); }],
    ['#FFD96A', '#F09A1E', (c, s) => { c.beginPath(); c.moveTo(s * 0.4, s * 0.28); c.lineTo(s * 0.74, s / 2); c.lineTo(s * 0.4, s * 0.72); c.closePath(); c.fillStyle = '#fff'; c.fill(); }],
    ['#6A7488', '#2C323E', (c, s) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(s * (0.3 + i * 0.2), s * (0.3 + j * 0.2), s * 0.055, 0, 6.2832); c.fillStyle = '#fff'; c.fill(); } }],
    ['#8BE06A', '#34A04A', (c, s) => { rr(c, s * 0.44, s * 0.24, s * 0.12, s * 0.52, s * 0.06); c.fillStyle = '#fff'; c.fill(); rr(c, s * 0.24, s * 0.44, s * 0.52, s * 0.12, s * 0.06); c.fill(); }],
  ];

  const CFG = window.DeskConfig;
  const CLOCK_BASE = (() => {
    const [h = 18, m = 21, s = 40] = (CFG.clock?.startTime || '18:21:40').split(':').map(Number);
    return h * 3600 + m * 60 + s;
  })();
  const CLOCK_DAY = CFG.clock?.dayLabel || '周一 下午';
  const MENU_NAMES = CFG.contextMenu || ['打开', '复制', '显示简介', '移到废纸篓'];
  const TOP_MENU = (CFG.menuBar || ['访达', '文件', '编辑', '显示', '前往', '窗口', '帮助']).map((s, i) => [s, i === 0 ? 700 : 500]);

  const NOTIF_DROP = 16;
  function fitSize(str, baseSize, weight, maxW) {
    const w = tw(str, baseSize, weight);
    return w > maxW ? Math.max(18, Math.floor(baseSize * maxW / w)) : baseSize;
  }
  function notif(ctx, n, drop) {
    const [x, y0, w, h] = n.rect, y = y0 + drop;
    ctx.save(); ctx.globalAlpha = n.alpha;

    glassCard(ctx, x, y, w, h, 38, { shadow: 'rgba(8,12,26,0.22)', shadowBlur: 30, shadowY: 10, blur: 16, tint: 'rgba(150,180,225,0.16)', glassExtra: 'saturate(1.5) brightness(1.1)' });
    messagesTile(ctx, x + 24, y + (h - 80) / 2, 80);
    const SH = 'rgba(0,0,0,0.25)';
    text(ctx, n.from, x + 126, y + 42, fitSize(n.from, 29, 700, w - 230), '#FFFFFF', 700, 'left', SH);
    text(ctx, n.text, x + 126, y + 86, fitSize(n.text, 32, 500, w - 156), 'rgba(255,255,255,0.95)', 500, 'left', SH);
    const clock = CLOCK_BASE + Math.floor(NOW);
    text(ctx, `${Math.floor(clock / 3600) % 24}:${String(Math.floor(clock / 60) % 60).padStart(2, '0')}`, x + w - 30, y + 36, 21, 'rgba(255,255,255,0.75)', 500, 'right', SH);
    ctx.restore();
  }

  function menu(ctx, m) {
    const h = m.pad * 2 + m.row * m.rows;
    ctx.save(); ctx.globalAlpha = m.alpha;
    glassCard(ctx, m.x, m.y, m.w, h, 22, { shadow: 'rgba(8,12,26,0.24)', shadowBlur: 30, shadowY: 10, blur: 16, tint: 'rgba(150,180,225,0.16)', glassExtra: 'saturate(1.5) brightness(1.1)' });
    for (let i = 0; i < m.rows; i++) {
      const ry = m.y + m.pad + i * m.row;
      if (i === m.hi) { rr(ctx, m.x + 9, ry + 5, m.w - 18, m.row - 10, 14); ctx.fillStyle = S.sel; ctx.fill(); }
      if (i === m.rows - 1 && i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(m.x + 22, ry - 0.5, m.w - 44, 1); }
      text(ctx, MENU_NAMES[i] || MENU_NAMES[2] || '', m.x + 32, ry + m.row / 2, 28, '#FFFFFF', 500, 'left', i === m.hi ? null : 'rgba(0,0,0,0.25)');
    }
    ctx.restore();
  }

  function unproject(x, y, cam) {
    let p = [cam.cx + (x - 720) * cam.w / 1440, cam.cy + (y - 540) * cam.w / 1440];
    for (let i = 0; i < 5; i++) {
      const a = DeskCamera.project(p, cam), b = DeskCamera.project([p[0] + 1, p[1]], cam), c = DeskCamera.project([p[0], p[1] + 1], cam);
      const ax = b[0] - a[0], ay = b[1] - a[1], bx = c[0] - a[0], by = c[1] - a[1], det = ax * by - ay * bx;
      const dx = x - a[0], dy = y - a[1]; p = [p[0] + (dx * by - dy * bx) / det, p[1] + (dy * ax - dx * ay) / det];
    }
    return p;
  }
  function frameLocal(ctx, cam, fx, fy, fn) {
    const p = unproject(fx, fy, cam), px = unproject(fx + 1, fy, cam), py = unproject(fx, fy + 1, cam);
    ctx.save(); ctx.transform(px[0] - p[0], px[1] - p[1], py[0] - p[0], py[1] - p[1], p[0], p[1]); fn(); ctx.restore();
  }
  const BAR_H = 26;
  const measure = document.createElement('canvas').getContext('2d');
  const tw = (s, size, weight) => { measure.font = `${weight} ${size}px ${K.F}`; return measure.measureText(s).width; };
  const dropOf = cam => clamp((Math.min(0, (cam.w - 1390) * 0.4) + BAR_H + 4) / (BAR_H + 4));
  const WHITE = 'rgba(255,255,255,0.96)', BAR_SH = 'rgba(0,0,0,0.34)';

  function menubar(ctx, st, t) {
    const cam = DeskCamera.at(t), offset = Math.min(0, (cam.w - 1390) * 0.4);
    if (offset < -BAR_H - 4 || st.overlay) return;
    const corners = [[-10, offset - 8], [1450, offset - 8], [1450, offset + BAR_H], [-10, offset + BAR_H]].map(p => unproject(...p, cam));
    const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
    const shape = () => { ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); };
    ctx.save();
    glass(ctx, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], shape, 12);
    shape(); ctx.fillStyle = 'rgba(24,30,42,0.34)'; ctx.fill();
    const a = unproject(-10, offset + BAR_H - 0.5, cam), b = unproject(1450, offset + BAR_H - 0.5, cam);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = cam.w / 1440 * 0.8; ctx.stroke();
    const mid = offset + BAR_H / 2;

    frameLocal(ctx, cam, 26, mid, () => {
      docMark(ctx, 0, 0, 15, WHITE, 0.7);
      let x = 24;
      TOP_MENU.forEach(([s, wt]) => { text(ctx, s, x, 0.5, 17, WHITE, wt, 'left', BAR_SH); x += tw(s, 17, wt) + 22; });
    });

    frameLocal(ctx, cam, 1424, mid, () => {
      const clock = CLOCK_BASE + Math.floor(t), hh = Math.floor(clock / 3600) % 12 || 12, mm = Math.floor(clock / 60) % 60, ss = clock % 60;
      const cell = 9.2, colon = 4.6; let x = 0;
      const put = (ch, w) => { x -= w; text(ctx, ch, x + w / 2, 0.5, 17, WHITE, 500, 'center', BAR_SH); };
      String(ss).padStart(2, '0').split('').reverse().forEach(c => put(c, cell)); put(':', colon);
      String(mm).padStart(2, '0').split('').reverse().forEach(c => put(c, cell)); put(':', colon);
      String(hh).split('').reverse().forEach(c => put(c, cell));
      text(ctx, CLOCK_DAY, x - 3, 0.5, 17, WHITE, 500, 'right', BAR_SH);
      x -= 3 + tw(CLOCK_DAY, 17, 500) + 20;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      x -= 13; rr(ctx, x - 12, -5.5, 22, 11, 3.4); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
      rr(ctx, x - 10, -3.6, 15, 7.2, 1.8); ctx.fillStyle = WHITE; ctx.fill(); rr(ctx, x + 11.4, -2, 1.8, 4, 0.9); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
      x -= 13 + 20;

      for (const r of [5, 9, 13]) { ctx.beginPath(); ctx.arc(x, 6, r, Math.PI * 1.27, Math.PI * 1.73); ctx.strokeStyle = WHITE; ctx.lineWidth = 1.8; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, 5.2, 1.7, 0, 6.2832); ctx.fillStyle = WHITE; ctx.fill();
      x -= 12 + 20;

      for (const [dy, kx] of [[-4.3, 5], [4.3, -5]]) { rr(ctx, x - 10, dy - 3.4, 20, 6.8, 3.4); ctx.strokeStyle = WHITE; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.arc(x + kx, dy, 2.2, 0, 6.2832); ctx.fillStyle = WHITE; ctx.fill(); }
      x -= 10 + 20;

      ctx.beginPath(); ctx.arc(x - 1.6, -1.6, 5, 0, 6.2832); ctx.moveTo(x + 2, 2); ctx.lineTo(x + 6.4, 6.4); ctx.strokeStyle = WHITE; ctx.lineWidth = 1.7; ctx.stroke();
    });
    ctx.restore();
  }

  const DOCK_ICON = 32, DOCK_GAP = 7, DOCK_PAD = 6, DOCK_H = DOCK_ICON + DOCK_PAD * 2;
  function dock(ctx, st, t) {
    const cam = DeskCamera.at(t), out = Math.max(0, 1380 - cam.w) * 3;
    if (!DOCK || out > DOCK_H + 6 || st.overlay) return;
    const n = DOCK_TILES.length, w = n * DOCK_ICON + (n - 1) * DOCK_GAP + DOCK_PAD * 2 + 8;
    frameLocal(ctx, cam, 720, 1080 - 3 - DOCK_H / 2 + out, () => {
      const x = -w / 2, y = -DOCK_H / 2, shape = rrShape(ctx, x, y, w, DOCK_H, 15), bbox = [x, y, x + w, y + DOCK_H];
      outerShadow(ctx, bbox, shape, 'rgba(8,12,26,0.32)', 18, 6);
      glass(ctx, bbox, shape, 14);
      shape(); ctx.fillStyle = 'rgba(244,246,250,0.34)'; ctx.fill();
      ctx.save(); shape(); ctx.clip();
      const v = ctx.createLinearGradient(0, y, 0, y + DOCK_H); v.addColorStop(0, 'rgba(255,255,255,0.26)'); v.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = v; ctx.fillRect(x, y, w, DOCK_H); ctx.restore();
      rr(ctx, x + 0.5, y + 0.5, w - 1, DOCK_H - 1, 14.5); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
      DOCK_TILES.forEach(([a, b, glyph], i) => {
        const tx = x + DOCK_PAD + 4 + i * (DOCK_ICON + DOCK_GAP), ty = y + DOCK_PAD;
        tile(ctx, tx, ty, DOCK_ICON, a, b);
        ctx.save(); ctx.translate(tx, ty); glyph(ctx, DOCK_ICON); ctx.restore();
        if (i === 0 || i === 2) { ctx.beginPath(); ctx.arc(tx + DOCK_ICON / 2, y + DOCK_H - 2.6, 1.3, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); }
      });
    });
  }

  let NOW = 0;
  function draw(ctx, st, t) {
    NOW = t;
    paintWall(ctx);
    for (const it of st.desk) K.icon(ctx, it, K.looks.plain, false, S);
    for (const w of st.windows) drawWindow(ctx, w, t, w === st.windows[st.windows.length - 1]);
    dock(ctx, st, t);
    for (const it of st.dragging) K.icon(ctx, it, K.looks.plain, false, S);
    if (st.marquee) {
      const [x, y, w, h] = st.marquee;
      rr(ctx, x, y, w, h, 8); ctx.fillStyle = 'rgba(190,210,255,0.20)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const drop = NOTIF_DROP * (st.overlay ? 0 : dropOf(DeskCamera.at(t)));
    for (const n of st.notifs) notif(ctx, n, drop);
    menubar(ctx, st, t);
    if (st.menu) menu(ctx, st.menu);
    if (st.cursor.visible) K.cursor(ctx, st.cursor);
  }
  window.DeskSkin = { draw, overlay: K.overlay };
})();
