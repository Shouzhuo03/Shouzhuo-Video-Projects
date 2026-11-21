(function () {
  const F = (window.DeskConfig && window.DeskConfig.fontFamily) || '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';
  const L = window.DeskMotion.layout;

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  const zoom = ctx => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); };

  function shadow(ctx, color, blur, offY = 0) {
    const z = zoom(ctx);
    ctx.shadowColor = color; ctx.shadowBlur = blur * z; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = offY * z;
  }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, u) => { const p = rgb(a), q = rgb(b); return hex(p.map((v, i) => v + (q[i] - v) * u)); };
  const shade = (a, k) => mix(a, k > 0 ? '#ffffff' : '#000000', Math.abs(k));

  function vg(ctx, S, y0, y1, a, b) {
    if (!S.gloss) return mix(a, b, 0.5);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, a); g.addColorStop(1, b);
    return g;
  }
  const fillRect = (ctx, style, x, y, w, h) => { ctx.fillStyle = style; ctx.fillRect(x, y, w, h); };
  function circle(ctx, x, y, r, style) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = style; ctx.fill(); }
  function poly(ctx, pts, style) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
  }

  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  const sprites = new Map();
  function sprite(s, size, color, weight, res, sh) {
    const key = `${s}|${size}|${color}|${weight}|${res}|${sh}`;
    let sp = sprites.get(key);
    if (!sp) {
      const c = document.createElement('canvas'), g = c.getContext('2d'), font = `${weight} ${size}px ${F}`;
      g.font = font;
      const pad = size * 0.35, w = g.measureText(s).width + 2 * pad, h = size * 1.7;
      c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
      g.scale(res, res);
      g.font = font; g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'middle';
      if (sh) { g.shadowColor = sh; g.shadowBlur = size * 0.16 * res; g.shadowOffsetY = size * 0.06 * res; }
      g.fillText(s, pad, h / 2);
      sp = { c, w, h, pad };
      sprites.set(key, sp);
    }
    return sp;
  }
  function text(ctx, s, x, y, size, color, weight = 500, align = 'center', sh = null) {
    const res = Math.min(16, Math.pow(2, Math.ceil(Math.log2(Math.max(0.5, zoom(ctx))))));
    const sp = sprite(s, size, color, weight, res, sh), tw = sp.w - 2 * sp.pad;
    const x0 = (align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x) - sp.pad;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sp.c, x0, y - sp.h / 2, sp.w, sp.h);
  }
  const textWidth = (s, size, weight) => { const g = sprite(s, size, '#000', weight, 1, null); return g.w - 2 * g.pad; };

  const bitmapCache = new Map();
  function bitmap(s, color = '#000000', weight = 600) {
    const key = `${s}|${color}|${weight}`;
    if (bitmapCache.has(key)) return bitmapCache.get(key);
    const chars = Array.from(s), widths = chars.map(c => /[^\x00-\xff]/.test(c) ? 13 : /[ ilI:.,!]/.test(c) ? 4 : 7);
    const c = document.createElement('canvas'); c.width = widths.reduce((a, b) => a + b, 0) + 2; c.height = 16;
    const g = c.getContext('2d'); g.font = `400 12px "Hiragino Sans GB", "Songti SC", sans-serif`; g.textBaseline = 'alphabetic'; g.fillStyle = '#FFFFFF';
    let x = 1; chars.forEach((ch, i) => { g.fillText(ch, x, 12); x += widths[i]; });
    const d = g.getImageData(0, 0, c.width, c.height), rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (let i = 0; i < d.data.length; i += 4) { const on = d.data[i + 3] >= 110; d.data[i] = rgb[0]; d.data[i + 1] = rgb[1]; d.data[i + 2] = rgb[2]; d.data[i + 3] = on ? 255 : 0; }
    g.putImageData(d, 0, 0); const out = { c, w: c.width }; bitmapCache.set(key, out); return out;
  }
  function pixelText(ctx, s, x, y, size = 24, color = '#000000', weight = 600, align = 'center') {
    const px = 2.25, sp = bitmap(s, color, weight), unit = px * Math.max(1, Math.round(size / (12 * px))), w = sp.w * unit;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sp.c, Math.round((x - (align === 'left' ? 0 : align === 'right' ? w : w / 2)) / px) * px, Math.round((y - 8 * unit) / px) * px, w, 16 * unit); ctx.restore();
  }
  const pixelWidth = (s, size = 24) => bitmap(s).w * 2.25 * Math.max(1, Math.round(size / 27));

  const gridCanvas = document.createElement('canvas');
  function pixelLayer(ctx, bounds, paint, grid) {
    if (!grid) { paint(ctx); return; }
    const rel = grid.matrix.inverse().multiply(ctx.getTransform()), px = grid.PX;
    const [x, y, w, h] = bounds;
    const points = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b]) => [rel.a*a+rel.c*b+rel.e, rel.b*a+rel.d*b+rel.f]);
    const x0 = Math.floor(Math.min(...points.map(p => p[0])) / px) * px, y0 = Math.floor(Math.min(...points.map(p => p[1])) / px) * px;
    const cw = Math.max(1, Math.ceil((Math.max(...points.map(p => p[0])) - x0) / px)), ch = Math.max(1, Math.ceil((Math.max(...points.map(p => p[1])) - y0) / px));
    gridCanvas.width = cw; gridCanvas.height = ch;
    const g = gridCanvas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.setTransform(rel.a / px, rel.b / px, rel.c / px, rel.d / px, (rel.e - x0) / px, (rel.f - y0) / px);
    paint(g);

    const data = g.getImageData(0, 0, cw, ch);
    for (let i = 3; i < data.data.length; i += 4) data.data[i] = data.data[i] >= 128 ? 255 : 0;
    g.putImageData(data, 0, 0);
    ctx.save(); ctx.setTransform(grid.matrix); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gridCanvas, x0, y0, cw * px, ch * px); ctx.restore();
  }

  function traced(ctx, shape) {
    for (const [part, color] of [['outer', '#0B0B0C'], ['inner', '#FFFFFF']]) {
      const pts = DeskCursors[shape][part];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
  function cursor(ctx, c) {
    ctx.save();
    ctx.translate(c.pos[0], c.pos[1]); ctx.rotate(c.angle * Math.PI / 180); ctx.scale(c.scale, c.scale);
    traced(ctx, c.mode === 'grab' ? 'grab' : 'arrow');
    ctx.restore();
  }
  function overlay(ctx, o) {
    ctx.fillStyle = '#000';
    ctx.fillRect(-L.W, -L.H, 3 * L.W, 3 * L.H);
    text(ctx, o.text, o.x, o.y, 120, '#F2F2F2', 700);
  }

  const WIN_BG = {
    drink: ['#EBD5D4', '#A35A58'], run: ['#D4E7D8', '#4C8A5F'], fish: ['#D2E5EA', '#4A8594'],
    s1: ['#EDE2CC', '#BF862A'], s2: ['#E8D4E5', '#985891'], s3: ['#D8D5EC', '#5C579C'], s4: ['#E4E4D8', '#8B8B66'],
    s5: ['#F0D8DE', '#B3546C'], s6: ['#DCE7DF', '#6B8D76'], s7: ['#E6DDD1', '#8A7154'],
  };
  const LOOKS = {

    plain: { costume: 'hoodie', shirt: '#7D8EA8', tile: ['#F5F5F3', '#CFD0CC'] },
    work: { costume: 'suit', shirt: '#2C3950', tile: ['#CFE0F7', '#7FA2D4'] },
    home: { costume: 'pajamas', shirt: '#D6E4F5', tile: ['#FFE6C2', '#F0B26E'] },
  };
  for (const [id, [bg, fill]] of Object.entries(WIN_BG)) LOOKS[id] = { costume: 'tee', shirt: fill, tile: [shade(bg, 0.4), bg] };
  const SKIN = '#F0C9A3', HAIR = '#3A2E29', NAVY = '#2F4166';

  function bust(ctx, x, y, look, S, Lt = { top: '#FFE2C2', rim: '#B8C8F0' }) {
    const body = look.shirt, c = look.costume, g = ctx;
    const blend = (mode, a, fn) => { g.save(); g.globalCompositeOperation = mode; g.globalAlpha = a; fn(); g.restore(); };
    const torso = () => {
      g.beginPath();
      g.moveTo(x - 74, y + 82);
      g.bezierCurveTo(x - 72, y + 44, x - 58, y + 29, x - 31, y + 23);
      g.quadraticCurveTo(x - 18, y + 20, x - 12, y + 14);
      g.lineTo(x + 12, y + 14);
      g.quadraticCurveTo(x + 18, y + 20, x + 31, y + 23);
      g.bezierCurveTo(x + 58, y + 29, x + 72, y + 44, x + 74, y + 82);
      g.closePath();
    };

    torso(); g.fillStyle = vg(ctx, S, y + 16, y + 82, shade(body, 0.1), shade(body, -0.12)); g.fill();
    g.save(); torso(); g.clip();
    if (c === 'pajamas') {
      g.fillStyle = shade(body, -0.28);
      for (let i = -7; i <= 7; i++) {
        const xt = x + i * 8.6, xc = x + i * 11.4, xb = x + i * 12.6, w0 = 1.5, w1 = 2.3;
        g.beginPath(); g.moveTo(xt - w0, y + 12); g.quadraticCurveTo(xc - w1, y + 46, xb - w1, y + 84);
        g.lineTo(xb + w1, y + 84); g.quadraticCurveTo(xc + w1, y + 46, xt + w0, y + 12); g.closePath(); g.fill();
      }
    }

    blend('multiply', 0.22, () => {
      g.strokeStyle = '#5A4A60'; g.lineWidth = 7; g.lineCap = 'round'; g.filter = `blur(${3 * zoom(ctx)}px)`;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 58, y + 52); g.quadraticCurveTo(x + s * 40, y + 60, x + s * 30, y + 80); g.stroke(); }
    });
    blend('screen', 0.4, () => {
      g.strokeStyle = Lt.top; g.lineWidth = 5; g.filter = `blur(${2.5 * zoom(ctx)}px)`;
      g.beginPath(); g.moveTo(x - 62, y + 36); g.quadraticCurveTo(x - 46, y + 26, x - 26, y + 25); g.moveTo(x + 62, y + 36); g.quadraticCurveTo(x + 46, y + 26, x + 26, y + 25); g.stroke();
    });
    g.restore();
    blend('screen', 0.55, () => {
      g.save(); torso(); g.clip(); g.strokeStyle = Lt.rim; g.lineWidth = 3; g.filter = `blur(${1.2 * zoom(ctx)}px)`;
      g.beginPath(); g.moveTo(x - 72, y + 70); g.bezierCurveTo(x - 71, y + 44, x - 58, y + 30, x - 32, y + 24); g.stroke(); g.restore();
    });

    if (c === 'pajamas') {
      for (const s of [-1, 1]) {
        const col = () => { g.beginPath(); g.moveTo(x + s * 12, y + 14); g.quadraticCurveTo(x + s * 26, y + 17, x + s * 33, y + 23); g.lineTo(x + s * 21, y + 41); g.quadraticCurveTo(x + s * 11, y + 37, x + s * 2, y + 33); g.closePath(); };
        blend('multiply', 0.3, () => { g.save(); g.translate(s * 1.5, 3); g.filter = `blur(${2 * zoom(ctx)}px)`; col(); g.fillStyle = '#3A3050'; g.fill(); g.restore(); });
        col(); g.fillStyle = vg(ctx, S, y + 14, y + 41, '#F6F9FD', '#DCE6F3'); g.fill();
        g.strokeStyle = NAVY; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke();
      }
      g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 1, y + 33); g.lineTo(x + 3, y + 84); g.stroke();
      for (const by of [48, 64]) {
        circle(ctx, x + 2.5, y + by + 1, 3.6, 'rgba(40,40,70,0.25)');
        circle(ctx, x + 2, y + by, 3.4, '#FFFFFF'); g.strokeStyle = shade(NAVY, 0.2); g.lineWidth = 1; g.stroke();
        circle(ctx, x + 1.1, y + by - 1, 1, 'rgba(255,255,255,0.9)');
      }
      g.save(); g.translate(x + 31, y + 50); g.rotate(-0.05);
      g.fillStyle = 'rgba(40,40,70,0.12)'; g.fillRect(0.5, 1.5, 17, 15);
      g.strokeStyle = shade(body, -0.3); g.lineWidth = 1; g.strokeRect(0, 0, 17, 15);
      g.strokeStyle = NAVY; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-0.5, 0); g.lineTo(17.5, 0); g.stroke();
      g.restore();
    } else if (c === 'suit') {
      poly(ctx, [[x - 13, y + 14], [x + 13, y + 14], [x, y + 58]], '#F4F6F9');
      poly(ctx, [[x - 13, y + 14], [x - 4, y + 15], [x - 9, y + 26]], '#FFFFFF');
      poly(ctx, [[x + 13, y + 14], [x + 4, y + 15], [x + 9, y + 26]], '#FFFFFF');
      poly(ctx, [[x - 5, y + 17], [x + 5, y + 17], [x + 4, y + 26], [x - 4, y + 26]], '#8E2830');
      poly(ctx, [[x - 4, y + 26], [x + 4, y + 26], [x + 7, y + 64], [x, y + 74], [x - 7, y + 64]], vg(ctx, S, y + 26, y + 74, '#C4404A', '#8C262E'));
      blend('multiply', 0.35, () => { g.fillStyle = '#5A1A20'; g.fillRect(x - 0.6, y + 28, 1.2, 10); });
      for (const s of [-1, 1]) {
        poly(ctx, [[x + s * 13, y + 14], [x + s * 28, y + 24], [x + s * 22, y + 30], [x + s * 27, y + 34], [x + s * 4, y + 62], [x, y + 58]], shade(body, -0.18));
        blend('screen', 0.3, () => { g.strokeStyle = Lt.top; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + s * 27, y + 34); g.lineTo(x + s * 5, y + 61); g.stroke(); });
      }
    } else if (c === 'hoodie') {
      g.beginPath(); g.ellipse(x, y + 18, 32, 12, 0, 0, TAU); g.fillStyle = shade(body, -0.25); g.fill();
      g.beginPath(); g.ellipse(x, y + 16, 22, 7, 0, 0, TAU); g.fillStyle = shade(body, -0.45); g.fill();
      g.strokeStyle = shade(body, 0.6); g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 8, y + 24); g.quadraticCurveTo(x - 10, y + 38, x - 9, y + 50); g.moveTo(x + 8, y + 24); g.quadraticCurveTo(x + 10, y + 38, x + 10, y + 50); g.stroke();
      for (const s of [-9, 10]) circle(ctx, x + s, y + 52, 2, '#C9CDD4');
    } else {
      g.beginPath(); g.ellipse(x, y + 16, 15, 6, 0, 0, Math.PI); g.strokeStyle = shade(body, -0.3); g.lineWidth = 3.2; g.stroke();
    }

    g.beginPath(); g.moveTo(x - 10, y - 8); g.lineTo(x - 11, y + 15); g.quadraticCurveTo(x, y + 19, x + 11, y + 15); g.lineTo(x + 10, y - 8); g.closePath();
    g.fillStyle = shade(SKIN, -0.1); g.fill();
    blend('multiply', 0.45, () => { g.fillStyle = lgrad(g, y - 6, y + 6, 'rgba(150,90,70,1)', 'rgba(150,90,70,0)'); g.fillRect(x - 12, y - 8, 24, 14); });
    if (c === 'suit') poly(ctx, [[x - 11, y + 11], [x + 11, y + 11], [x + 14, y + 15], [x - 14, y + 15]], '#F4F6F9');

    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(x + s * 21.5, y - 23, 4.2, 6.6, s * 0.15, 0, TAU); g.fillStyle = shade(SKIN, -0.06); g.fill();
      g.beginPath(); g.ellipse(x + s * 21.8, y - 23, 2, 3.8, s * 0.15, 0, TAU); g.fillStyle = shade(SKIN, -0.2); g.fill();
    }

    const head = () => { g.beginPath(); g.moveTo(x, y - 52); g.bezierCurveTo(x + 15, y - 52, x + 23, y - 40, x + 22.5, y - 26); g.bezierCurveTo(x + 22, y - 10, x + 12, y - 1, x, y - 1); g.bezierCurveTo(x - 12, y - 1, x - 22, y - 10, x - 22.5, y - 26); g.bezierCurveTo(x - 23, y - 40, x - 15, y - 52, x, y - 52); g.closePath(); };
    head();
    const fg = g.createRadialGradient(x + 5, y - 38, 3, x, y - 26, 30);
    fg.addColorStop(0, shade(SKIN, 0.22)); fg.addColorStop(0.6, SKIN); fg.addColorStop(1, shade(SKIN, -0.14));
    g.fillStyle = fg; g.fill();
    blend('multiply', 0.25, () => { head(); g.fillStyle = lgrad(g, y - 20, y - 1, 'rgba(170,100,80,0)', 'rgba(170,100,80,1)'); g.fill(); });
    blend('screen', 0.6, () => { g.save(); head(); g.clip(); g.strokeStyle = Lt.rim; g.lineWidth = 2.6; g.filter = `blur(${1 * zoom(ctx)}px)`;
      g.beginPath(); g.moveTo(x - 10, y - 4); g.bezierCurveTo(x - 21, y - 10, x - 23, y - 24, x - 21, y - 36); g.stroke(); g.restore(); });

    const hair = () => {
      g.beginPath(); g.moveTo(x - 23.5, y - 19);
      g.bezierCurveTo(x - 30, y - 40, x - 20, y - 63, x + 2, y - 62);
      g.bezierCurveTo(x + 22, y - 61, x + 31, y - 46, x + 25, y - 21);
      g.bezierCurveTo(x + 23, y - 28, x + 21, y - 33, x + 17, y - 36);
      g.bezierCurveTo(x + 12, y - 38, x + 8, y - 37, x + 5, y - 40);
      g.bezierCurveTo(x + 1, y - 44, x - 7, y - 44, x - 12, y - 38);
      g.bezierCurveTo(x - 17, y - 33, x - 20, y - 28, x - 21, y - 19);
      g.closePath();
    };
    hair(); g.fillStyle = lgrad(g, y - 59, y - 22, shade(HAIR, 0.12), shade(HAIR, -0.15)); g.fill();
    g.save(); hair(); g.clip();
    g.strokeStyle = shade(HAIR, 0.35); g.lineWidth = 0.9; g.globalAlpha = 0.6;
    for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x - 9 + k * 0.6, y - 60); g.bezierCurveTo(x - 1 + k * 3, y - 57 + k, x + 9 + k * 2.2, y - 50 + k * 1.4, x + 15 + k * 1.4, y - 40 + k * 1.1); g.stroke(); }
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x - 10 - k * 0.5, y - 60); g.bezierCurveTo(x - 17 - k * 1.5, y - 55 + k, x - 22 - k, y - 44 + k, x - 23 + k * 0.4, y - 26 + k); g.stroke(); }
    g.globalAlpha = 1;
    blend('screen', 0.55, () => { g.strokeStyle = Lt.top; g.lineWidth = 4; g.filter = `blur(${2 * zoom(ctx)}px)`; g.beginPath(); g.moveTo(x - 6, y - 58); g.quadraticCurveTo(x + 6, y - 62, x + 18, y - 55); g.stroke(); });
    g.strokeStyle = shade(HAIR, -0.45); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 10, y - 61); g.quadraticCurveTo(x - 10, y - 52, x - 9, y - 45); g.stroke();
    g.restore();
  }
  const lgrad = (g, y0, y1, a, b) => { const s = g.createLinearGradient(0, y0, 0, y1); s.addColorStop(0, a); s.addColorStop(1, b); return s; };
  const TAU = Math.PI * 2;

  function iconBody(ctx, x, y, look, S, env) {
    const id = env ? env.id : Object.keys(LOOKS).find(id => LOOKS[id] === look) || 'plain';
    const style = S.iconStyle === 'classic' && DeskMe.PENS.classic ? 'classic' : 'icon';
    if (S.pixel) pixelLayer(ctx, [x - 150, y - 175, 300, 300], g => DeskMe.draw(g, { x, y, look: id, style, expr: 'calm', n: 48, scale: 216 / 224 }), S.grid);
    else DeskMe.draw(ctx, { x, y, look: id, style, expr: 'calm', scale: L.icon / 124 });
  }

  const paintedIn = id => !!(window.DeskScenes && DeskScenes[id] && DeskScenes[id].style === 'oil' && window.DeskMe && DeskMe.PENS.oil && window.Oil);

  const meLayer = new Map();
  function paintedMe(ctx, id, pose, x, y, alpha = 1) {
    if (alpha <= 0) return;
    const key = id + '|' + pose;
    if (!meLayer.has(key)) {
      const O = window.Oil, lt = (DeskScenes[id] && DeskScenes[id].light) || null, W = 200, C = 100;
      const sc = (L.icon / 124) * (pose === 'seated' ? 0.955 : 1), dy = pose === 'seated' ? 3 : 0;
      const body = g => DeskMe.draw(g, { x: C, y: C + dy, look: id, style: 'oil', scale: sc, light: lt || undefined });
      const base = O.layer(W, W, body);
      meLayer.set(key, !(lt && lt.rim) ? base : O.layer(W, W, g => {
        const rd = lt.rimDir || [-1, 0], rl = Math.hypot(rd[0], rd[1]) || 1, d = 3.2;
        const sil = O.layer(W, W, h => { h.drawImage(base, 0, 0, W, W); h.globalCompositeOperation = 'source-in'; h.fillStyle = '#fff'; h.fillRect(0, 0, W, W); });
        const edge = O.layer(W, W, h => {
          h.drawImage(sil, 0, 0, W, W);
          h.globalCompositeOperation = 'destination-out'; h.drawImage(sil, -rd[0] / rl * d, -rd[1] / rl * d, W, W);
          h.globalCompositeOperation = 'source-in'; h.fillStyle = O.css(lt.rim.map(v => Math.min(1, v) * 255), 1); h.fillRect(0, 0, W, W);
        });
        g.drawImage(base, 0, 0, W, W);
        g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.55; g.drawImage(edge, 0, 0, W, W); g.restore();
      }));
    }
    ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(meLayer.get(key), x - 100, y - 100, 200, 200);
    ctx.restore();
  }
  const smooth01 = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const sc_light = id => (id === 'home' ? { top: '#FFD49A', rim: '#9FB4EC' } : { top: '#FFE2C2', rim: '#B8C8F0' });

  function icon(ctx, it, look, inWindow, S, env = null, part = 'all') {
    const [x, y] = it.pos, h = L.icon / 2;
    ctx.save();
    ctx.globalAlpha *= it.alpha;
    if (it.rot) {
      const [px, py] = it.pivot || it.pos;
      ctx.translate(px, py); ctx.rotate(it.rot * Math.PI / 180); ctx.translate(-px, -py);
    }
    ctx.translate(x, y); ctx.scale(it.scale, it.scale); ctx.translate(-x, -y);
    if (part !== 'label') {
      ctx.save();
      if (S.pixel && it.selected) ctx.filter = 'brightness(0.52)';
      if (it.selected && !S.pixel) { rr(ctx, x - L.icon * 0.47, y - h - 14, L.icon * 0.94, L.icon + 20, S.tileR + 4); ctx.fillStyle = S.selBox; ctx.fill(); }
      if (it.masks) {

        const box = m => { const [rx, ry, rw, rh] = m.rect, cx = rx + rw / 2, cy = ry + rh / 2, k = m.scale; return [cx - rw * k / 2, cy - rh * k / 2, rw * k, rh * k]; };
        const content = m => { const [bx, by, bw, bh] = box(m); return [bx, by + L.bar * m.scale, bw, bh - L.bar * m.scale]; };
        const painted = it.masks.filter(m => paintedIn(m.id));
        ctx.save();
        if (painted.length) { ctx.beginPath(); ctx.rect(x - 400, y - 400, 800, 800); for (const m of painted) ctx.rect(...content(m)); ctx.clip('evenodd'); }
        iconBody(ctx, x, y, LOOKS.plain, S);
        for (const m of it.masks.filter(m => !paintedIn(m.id))) { ctx.save(); ctx.beginPath(); ctx.rect(...box(m)); ctx.clip(); iconBody(ctx, x, y, LOOKS[m.id], S); ctx.restore(); }
        ctx.restore();
        for (const m of painted) {
          ctx.save(); ctx.beginPath(); ctx.rect(...content(m)); ctx.clip();
          const k = it.from === m.id ? smooth01((it.since ?? 1) / 0.22) : 1;
          paintedMe(ctx, m.id, 'seated', x, y, 1 - k);
          paintedMe(ctx, m.id, 'bust', x, y, k);
          ctx.restore();
        }
      } else if (env && paintedIn(env.id)) {

        const k = smooth01(((it.since ?? 9) - 0.04) / 0.36);
        paintedMe(ctx, env.id, 'bust', x, y, 1 - k);
        paintedMe(ctx, env.id, 'seated', x, y + 2 * k, k);
      } else iconBody(ctx, x, y, look, S, env);
      ctx.restore();
    }
    if (part !== 'body') {
      const ly = S.pixel && S.labelBottom != null ? Math.min(y + h + 31, S.labelBottom) : y + h + 31;
      if (S.pixel) {
        const tw = pixelWidth(it.label, 24) + 9;
        pixelLayer(ctx, [x - tw / 2 - 3, ly - 20, tw + 6, 40], g => {
          g.fillStyle = it.selected ? '#000000' : '#FFFFFF'; g.fillRect(x - tw / 2, ly - 18, tw, 36);
          pixelText(g, it.label, x, ly, 24, it.selected ? '#FFFFFF' : '#000000');
        }, S.grid);
      } else if (it.selected) {
        const tw = textWidth(it.label, 26, 600) + 26;
        rr(ctx, x - tw / 2, ly - 19, tw, 38, S.pillR); ctx.fillStyle = S.sel; ctx.fill();
        text(ctx, it.label, x, ly, 26, '#FFFFFF', 600);
      } else if (inWindow && S.labelPill) {
        const tw = textWidth(it.label, 24, 600) + 28;
        ctx.save(); shadow(ctx, 'rgba(60,40,30,0.25)', 6, 2);
        rr(ctx, x - tw / 2, ly - 18, tw, 36, 18); ctx.fillStyle = 'rgba(255,252,247,0.82)'; ctx.fill();
        ctx.restore();
        text(ctx, it.label, x, ly, 24, S.labelWin, 600);
      } else if (inWindow) text(ctx, it.label, x, ly, 26, S.labelWin, 600);
      else text(ctx, it.label, x, ly, 26, '#FFFFFF', 600, 'center', S.labelShadow);
    }
    ctx.restore();
  }

  function office(ctx, S, t) {
    fillRect(ctx, vg(ctx, S, 0, 296, '#E6EBF2', '#C8D1DD'), 0, 0, 480, 296);
    const sky = vg(ctx, S, 14, 176, '#121C36', '#2E4170');
    fillRect(ctx, sky, 22, 14, 436, 162);
    circle(ctx, 398, 46, 13, '#F3EAC6');
    circle(ctx, 404, 41, 12, sky);
    const B = [[22, 44, 70], [62, 30, 104], [88, 52, 58], [136, 40, 122], [172, 58, 86], [226, 34, 136], [256, 56, 68],
               [306, 44, 112], [346, 38, 80], [380, 50, 126], [426, 32, 94]];
    B.forEach(([bx, bw, bh], i) => {
      const top = 176 - bh;
      fillRect(ctx, vg(ctx, S, top, 176, '#2F4067', '#22304F'), bx, top, bw, bh);
      for (let gy = top + 8; gy < 168; gy += 13) for (let gx = bx + 6; gx < bx + bw - 6; gx += 11) {
        const r = hash(gx, gy);
        if (r > 0.38) continue;
        const tw = r < 0.05 ? 0.55 + 0.45 * Math.sin(t * 1.7 + gx) : 1;
        ctx.globalAlpha = tw * (0.6 + r);
        fillRect(ctx, '#F6D47C', gx, gy, 5, 7);
        ctx.globalAlpha = 1;
      }
    });
    ctx.fillStyle = S.gloss ? '#F4F7FB' : '#EEF2F7';
    ctx.fillRect(16, 8, 448, 7); ctx.fillRect(16, 174, 448, 9); ctx.fillRect(16, 8, 7, 175); ctx.fillRect(457, 8, 7, 175);
    ctx.fillRect(166, 8, 6, 175); ctx.fillRect(310, 8, 6, 175);
    rr(ctx, 194, 90, 92, 108, 18); ctx.fillStyle = vg(ctx, S, 90, 198, '#4A5366', '#30384A'); ctx.fill();
    fillRect(ctx, vg(ctx, S, 186, 200, '#DCE1E8', '#BAC3CF'), 0, 186, 480, 14);
    fillRect(ctx, vg(ctx, S, 200, 296, '#B3BDCB', '#8E9AAD'), 0, 200, 480, 96);
    for (const dx of [18, 334]) for (const dy of [210, 246]) {
      rr(ctx, dx, dy, 128, 30, 3); ctx.strokeStyle = 'rgba(40,50,70,0.28)'; ctx.lineWidth = 1.6; ctx.stroke();
      rr(ctx, dx + 52, dy + 12, 24, 5, 2.5); ctx.fillStyle = 'rgba(40,50,70,0.45)'; ctx.fill();
    }

    fillRect(ctx, '#596377', 99, 166, 13, 22);
    ctx.beginPath(); ctx.ellipse(105, 188, 30, 4.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#4C5568'; ctx.fill();
    rr(ctx, 38, 88, 134, 84, 6); ctx.fillStyle = '#262C37'; ctx.fill();
    rr(ctx, 44, 94, 122, 70, 3); ctx.fillStyle = vg(ctx, S, 94, 164, '#E4F0FF', '#B7D0F2'); ctx.fill();
    ctx.fillStyle = 'rgba(70,110,170,0.35)';
    for (let ry = 104; ry < 158; ry += 8) ctx.fillRect(50, ry, 110, 2);
    ctx.fillStyle = 'rgba(70,110,170,0.5)';
    for (let k = 0; k < 4; k++) ctx.fillRect(52 + k * 26, 150 - (18 + 14 * hash(k, 3)), 14, 18 + 14 * hash(k, 3));
    if (S.gloss) poly(ctx, [[44, 94], [104, 94], [74, 164], [44, 164]], 'rgba(255,255,255,0.18)');

    for (const [sx, n] of [[322, 7], [356, 4]]) for (let k = 0; k < n; k++) {
      fillRect(ctx, k % 2 ? '#E3E8EF' : '#FFFFFF', sx + (k % 3) * 2, 182 - k * 5, 52, 5);
    }
    rr(ctx, 418, 160, 22, 27, 4); ctx.fillStyle = vg(ctx, S, 160, 187, '#D9644B', '#B0442F'); ctx.fill();
    ctx.beginPath(); ctx.arc(441, 172, 6.5, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = '#B0442F'; ctx.lineWidth = 3.5; ctx.stroke();
    const cone = ctx.createLinearGradient(0, 112, 0, 190);
    cone.addColorStop(0, 'rgba(255,236,180,0.55)'); cone.addColorStop(1, 'rgba(255,236,180,0.08)');
    poly(ctx, [[392, 112], [414, 112], [452, 190], [340, 190]], cone);
    ctx.strokeStyle = '#3A4252'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(458, 187); ctx.lineTo(446, 128); ctx.lineTo(408, 104); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(458, 188, 15, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#3A4252'; ctx.fill();
    poly(ctx, [[392, 96], [416, 104], [418, 116], [388, 112]], vg(ctx, S, 96, 116, '#4E586B', '#2F3644'));
  }

  function dinner(ctx, S, t) {
    fillRect(ctx, vg(ctx, S, 0, 296, '#F7EAD7', '#E8CDAE'), 0, 0, 480, 296);

    fillRect(ctx, vg(ctx, S, 30, 146, '#F6AE62', '#A86C9C'), 34, 30, 112, 116);
    circle(ctx, 112, 116, 16, 'rgba(255,214,140,0.9)');
    fillRect(ctx, vg(ctx, S, 30, 146, '#F6AE62', '#A86C9C'), 34, 132, 112, 14);
    ctx.fillStyle = '#FFF8EE';
    ctx.fillRect(28, 24, 124, 6); ctx.fillRect(28, 144, 124, 8); ctx.fillRect(28, 24, 6, 128); ctx.fillRect(146, 24, 6, 128); ctx.fillRect(87, 24, 5, 128);
    for (const [cx, s] of [[24, 1], [156, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx - 8 * s, 18); ctx.lineTo(cx + 18 * s, 18);
      ctx.quadraticCurveTo(cx + 4 * s, 90, cx + 14 * s, 158); ctx.lineTo(cx - 8 * s, 158); ctx.closePath();
      ctx.fillStyle = vg(ctx, S, 18, 158, '#D2694F', '#A94A36'); ctx.fill();
    }

    rr(ctx, 336, 38, 92, 74, 3); ctx.fillStyle = '#8C5A3C'; ctx.fill();
    fillRect(ctx, vg(ctx, S, 44, 106, '#F3E2C6', '#E3C9A2'), 342, 44, 80, 62);
    [[360, 70, 9, '#C98B5E'], [382, 66, 11, '#7E6A9E'], [404, 72, 8, '#5E8C74']].forEach(([px, py, pr, pc]) => {
      circle(ctx, px, py, pr, '#E7B993');
      ctx.beginPath(); ctx.ellipse(px, py + pr + 14, pr * 1.6, pr * 1.3, 0, Math.PI, 0); ctx.fillStyle = pc; ctx.fill();
    });

    ctx.strokeStyle = '#5A4636'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(240, 0); ctx.lineTo(240, 18); ctx.stroke();
    const glow = ctx.createRadialGradient(240, 44, 6, 240, 60, 170);
    glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(60, 0, 360, 220);
    poly(ctx, [[214, 18], [266, 18], [284, 44], [196, 44]], vg(ctx, S, 18, 44, '#F1BE55', '#D9962E'));

    rr(ctx, 198, 98, 84, 100, 10); ctx.fillStyle = vg(ctx, S, 98, 198, '#A8704A', '#7E4F31'); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const sx of [214, 234, 254]) ctx.fillRect(sx, 112, 10, 80);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 186, 480, 110); ctx.clip();
    fillRect(ctx, '#FBF7F0', 0, 186, 480, 110);
    ctx.fillStyle = 'rgba(204,64,56,0.42)';
    for (let gx = -4; gx < 480; gx += 18) ctx.fillRect(gx, 186, 9, 110);
    for (let gy = 186; gy < 296; gy += 18) ctx.fillRect(0, gy, 480, 9);
    if (S.gloss) fillRect(ctx, vg(ctx, S, 186, 296, 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.12)'), 0, 186, 480, 110);
    ctx.restore();
    fillRect(ctx, 'rgba(120,60,30,0.25)', 0, 186, 480, 3);

    const bowl = (bx, by, bw, top, rim) => {
      ctx.beginPath(); ctx.moveTo(bx - bw, by); ctx.quadraticCurveTo(bx, by + bw * 1.15, bx + bw, by); ctx.closePath();
      ctx.fillStyle = vg(ctx, S, by, by + bw * 0.6, '#FFFFFF', '#D9DEE6'); ctx.fill();
      fillRect(ctx, rim, bx - bw * 0.82, by + bw * 0.18, bw * 1.64, 3);
      ctx.beginPath(); ctx.ellipse(bx, by, bw, bw * 0.24, 0, 0, Math.PI * 2); ctx.fillStyle = top; ctx.fill();
      if (S.gloss) { ctx.beginPath(); ctx.ellipse(bx - bw * 0.45, by + bw * 0.3, bw * 0.18, bw * 0.08, -0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); }
    };
    bowl(98, 180, 26, '#FFFDF6', '#4F7FC4');
    ctx.beginPath(); ctx.arc(98, 180, 22, Math.PI, 0); ctx.fillStyle = '#FFFDF6'; ctx.fill();
    ctx.strokeStyle = '#8A5A35'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(130, 204); ctx.lineTo(166, 178); ctx.moveTo(135, 207); ctx.lineTo(170, 182); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(40, 204, 34, 9, 0, 0, Math.PI * 2); ctx.fillStyle = vg(ctx, S, 195, 213, '#FFFFFF', '#DDE2EA'); ctx.fill();
    [[30, 200, '#4E9A45'], [42, 203, '#5FAE52'], [52, 199, '#4A8F40'], [36, 205, '#E2553D']].forEach(([vx, vy, vc]) => {
      ctx.beginPath(); ctx.ellipse(vx, vy, 9, 4, 0.3, 0, Math.PI * 2); ctx.fillStyle = vc; ctx.fill();
    });

    bowl(378, 176, 36, '#E8B45E', '#C9533F');
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.45 + i / 3) % 1, a = Math.sin(ph * Math.PI) * 0.7;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const yy = 166 - ph * 36 - k * 4, xx = 364 + i * 14 + Math.sin(k * 0.65 + t * 2.4 + i * 2) * 4;
        if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(446, 206, 32, 9, 0, 0, Math.PI * 2); ctx.fillStyle = vg(ctx, S, 197, 215, '#FFFFFF', '#DDE2EA'); ctx.fill();
    ctx.beginPath(); ctx.ellipse(442, 203, 20, 6.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#E08A57'; ctx.fill();
    poly(ctx, [[460, 203], [472, 196], [472, 210]], '#E08A57');
  }

  function plainScene(ctx, S, id) {
    const bg = WIN_BG[id][0];
    fillRect(ctx, vg(ctx, S, 0, 296, shade(bg, 0.35), shade(bg, -0.04)), 0, 0, 480, 296);
  }

  function scene(ctx, id, r, t, S, part = 'back') {
    const hero = window.DeskScenes && DeskScenes[id];
    if (part === 'front' && !hero) return;
    const [x, y, w, h] = r, W0 = hero ? hero.W : 480, H0 = hero ? hero.H : 296, s = Math.max(w / W0, h / H0);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - W0 * s) / 2, y + (h - H0 * s) / 2); ctx.scale(s, s);
    if (hero) {
      const c = hero.build();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(part === 'back' ? c.back : c.front, 0, 0, W0, H0);
      (part === 'back' ? hero.liveBack : hero.liveFront)(ctx, t);
    } else if (id === 'work') office(ctx, S, t);
    else if (id === 'home') dinner(ctx, S, t);
    else plainScene(ctx, S, id);
    ctx.restore();
  }

  window.DeskKit = { F, rr, shadow, vg, mix, shade, text, pixelText, pixelWidth, pixelLayer, cursor, overlay, icon, scene, looks: LOOKS };
})();
