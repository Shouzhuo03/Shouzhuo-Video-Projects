(function () {
  const W = 480, H = 296, R = 4, TAU = Math.PI * 2;
  const C = { ground: '#303130', blue: '#2466a2', host: '#388fc3', green: '#71845a', red: '#bb4438', paper: '#c6c3b8' };
  const seats = [
    { x: 240, y: 29, w: 69, h: 39, a: -.035, host: true },
    { x: 145, y: 60, w: 49, h: 32, a: -.23 },
    { x: 119, y: 116, w: 47, h: 34, a: -.10 },
    { x: 145, y: 176, w: 50, h: 34, a: .15 },
    { x: 335, y: 61, w: 49, h: 33, a: .18 },
    { x: 362, y: 119, w: 48, h: 33, a: -.12 },
    { x: 336, y: 176, w: 50, h: 34, a: -.19 }
  ];
  let cache;
  function rng(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function canvas() { const c = document.createElement('canvas'); c.width = W * R; c.height = H * R; return c; }
  function context(c) { const g = c.getContext('2d'); g.scale(R, R); return g; }
  function poly(g, p) { g.beginPath(); g.moveTo(...p[0]); for (let i = 1; i < p.length; i++) g.lineTo(...p[i]); g.closePath(); }
  function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function grain(g, r, box, count, pale = false) {
    for (let i = 0; i < count; i++) {
      const x = box[0] + r() * box[2], y = box[1] + r() * box[3];
      g.fillStyle = pale ? `rgba(255,255,242,${.035 + r() * .13})` : `rgba(17,28,29,${.12 + r() * .33})`;
      const s = .13 + r() * .43; g.fillRect(x, y, s, s * (.7 + r()));
    }
  }
  function card(g, s, r) {
    g.save(); g.translate(s.x, s.y); g.rotate(s.a);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(-s.w / 2 + 1, -s.h / 2 + 1.5, s.w, s.h);
    g.beginPath(); g.rect(-s.w / 2, -s.h / 2, s.w, s.h); g.save(); g.clip();
    g.fillStyle = s.host ? C.host : C.blue; g.fill();
    grain(g, r, [-s.w / 2, -s.h / 2, s.w, s.h], s.host ? 2100 : 1300);
    grain(g, r, [-s.w / 2, -s.h / 2, s.w, s.h], 650, true); g.restore();
    const x = -s.w / 2 + 8, y = -s.h / 2 + 9;
    dot(g, x + 1, y, s.host ? 4.1 : 3.3, C.ground);
    g.strokeStyle = C.ground; g.lineWidth = .85;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(x + 10, y - 2 + i * 4.1); g.lineTo(s.w / 2 - 7 - (i === 2 ? 7 : 0), y - 2 + i * 4.1); g.stroke();
    }
    dot(g, x + 1, s.h / 2 - 7, 2.3, s.host ? '#ede9d9' : '#a8b6ae');
    g.restore();
  }

  function torn(points, r) {
    const out = [];
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), n = Math.ceil(len / 1.6);
      for (let j = 0; j < n; j++) {
        const u = j / n, d = (r() - .5) * 2.5 + Math.sin(u * 24 + i) * .65;
        out.push([p[0] + dx * u - dy / len * d, p[1] + dy * u + dx / len * d]);
      }
    });
    return out;
  }
  function paper(g, points, r, shade) {
    const p = torn(points, r);
    g.save(); g.translate(1.3, 2); poly(g, p); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.stroke(); g.restore();
    poly(g, p); g.fillStyle = shade; g.fill();
    g.strokeStyle = '#edeae0'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    g.save(); poly(g, p); g.clip();

    for (let x = -5; x < W + 5; x += 1.15 + r() * .75) {
      const y = r() * 20, bend = (r() - .5) * 1.5;
      g.strokeStyle = `rgba(70,67,57,${.09 + r() * .12})`; g.lineWidth = .3 + r() * .45;
      g.beginPath(); g.moveTo(x, -5); g.bezierCurveTo(x + bend, 80 + y, x - bend, 200, x + .7, H + 5); g.stroke();
      g.strokeStyle = 'rgba(255,255,244,.33)'; g.lineWidth = .28;
      g.beginPath(); g.moveTo(x + .65, -5); g.lineTo(x + 1.2, H + 5); g.stroke();
    }
    grain(g, r, [0, 0, W, H], 15000); grain(g, r, [0, 0, W, H], 10000, true);
    g.restore();

    g.strokeStyle = 'rgba(248,246,235,.65)'; g.lineWidth = .23;
    p.forEach(([x, y], i) => {
      if (i % 2) return;
      const dx = (r() - .5) * 3, dy = (r() - .5) * 3;
      g.beginPath(); g.moveTo(x - dx * .3, y - dy * .3); g.lineTo(x + dx, y + dy); g.stroke();
    });
  }
  function build() {
    if (cache) return cache;
    const back = canvas(), front = canvas(), g = context(back), f = context(front), r = rng(7040426);
    g.fillStyle = C.ground; g.fillRect(0, 0, W, H);

    g.save(); g.beginPath(); g.arc(240, 109, 79, 0, TAU); g.arc(240, 109, 60, 0, TAU, true);
    g.clip(); g.fillStyle = C.green; g.fillRect(155, 24, 170, 170);
    grain(g, r, [155, 24, 170, 170], 18500); grain(g, r, [155, 24, 170, 170], 10500, true); g.restore();
    g.strokeStyle = '#4e6244'; g.lineWidth = 2.5; g.beginPath(); g.arc(240, 109, 59, 0, TAU); g.stroke();

    seats.forEach(s => card(f, s, r));

    f.save(); f.strokeStyle = '#6a8a9b'; f.lineWidth = .9; f.setLineDash([3.2, 2.8]);
    f.strokeRect(215, 148, 50, 43); f.restore();
    dot(f, 240, 184, 3.4, '#d9d4c1'); dot(f, 240, 184, 1.9, '#72544a');

    paper(f, [[-8,-8],[78,-8],[70,20],[87,38],[63,57],[68,86],[37,110],[-8,102]], r, '#c8c5ba');
    paper(f, [[390,-8],[488,-8],[488,108],[452,98],[431,73],[407,65],[416,38]], r, '#bdbeb3');
    paper(f, [[-8,125],[28,137],[40,165],[73,183],[62,211],[32,222],[42,251],[-8,277]], r, '#c3c0b5');
    paper(f, [[488,131],[452,144],[442,177],[411,194],[425,220],[453,222],[449,266],[488,286]], r, '#ccc8bc');
    paper(f, [[-8,284],[48,266],[85,274],[111,258],[137,271],[149,304],[-8,304]], r, '#c1beb3');
    paper(f, [[348,304],[355,274],[387,263],[408,279],[437,271],[488,288],[488,304]], r, '#bcbeb3');
    const blur = canvas(), b = blur.getContext('2d');
    b.filter = 'blur(12px)'; b.drawImage(back, 0, 0); b.drawImage(front, 0, 0);
    cache = { back, front, blur }; return cache;
  }
  function liveBack(g, t) {
    g.save(); g.lineWidth = .8; g.lineCap = 'round';
    seats.slice(1).forEach((s, i) => {
      const tremble = Math.sin(t * 2.1 + i * 1.7) * .65;
      const phase = ((t + i * 1.19) % 7.7 + 7.7) % 7.7;
      const flash = Math.max(0, 1 - Math.abs(phase - .4) / .2);
      g.strokeStyle = flash ? `rgba(239,111,77,${.65 + flash * .35})` : C.red;
      g.lineWidth = .72 + flash * .45;
      g.beginPath(); g.moveTo(s.x, s.y + 5);
      g.quadraticCurveTo((s.x + 240) / 2 + tremble, (s.y + 41) / 2 + tremble, 240, 41); g.stroke();
    });

    g.strokeStyle = C.red; g.lineWidth = .85;
    g.beginPath(); g.moveTo(240, 184); g.bezierCurveTo(317 + Math.sin(t * 1.4) * .7, 210, 353, 82, 240, 41); g.stroke();
    dot(g, 240, 42, 4.7, C.red); dot(g, 240, 42, 2.3, C.ground);
    g.restore();
  }
  function liveFront() {}
  window.DeskScenes = Object.assign(window.DeskScenes || {}, {
    drink: { W, H, build, liveBack, liveFront, style: 'collage',
      light: { key: [.83,.85,.78], keyDir: [0,-1], fill: [.39,.46,.56], rim: [.73,.75,.61] } }
  });
})();
