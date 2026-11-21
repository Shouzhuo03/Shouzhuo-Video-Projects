(() => {
  const R = TIMELINE.resolve(TUNE, M, FilmCopy), {TL, E, LAG} = R;
  Object.assign(M.EASE, E);
  const T = (id) => TL[id];
  const CURVE = (id) => TL[id].curve;

  const F = {};
  F.tilt0 = T('tilt').f0; F.tilt1 = T('tilt').f1;
  F.cursorIn = T('cursorIn').f0; F.at1 = T('cursorIn').f1;
  F.swipe0 = T('swipe').f0; F.swipe1 = T('swipe').f1;
  F.pull0 = T('pull').f0; F.pull1 = T('pull').f1;
  F.toPlay0 = T('toPlay').f0; F.toPlay1 = T('toPlay').f1; F.click = T('click').f0; F.play = T('play').f0;
  F.away0 = T('away').f0; F.away1 = T('away').f1;
  F.ret0 = T('ret').f0; F.ret1 = T('ret').f1; F.grab = T('grab').f0;
  F.lift0 = T('lift').f0; F.lift1 = T('lift').f1;
  F.h2in0 = T('h2in').f0; F.h2in1 = T('h2in').f1; F.tab = T('tab').f0; F.grip = T('grip').f0;
  F.drag0 = T('drag').f0; F.drag1 = T('drag').f1;
  F.aiIn = T('aiIn').f0;
  F.pan0 = T('pan').f0;
  F.arrowIn = T('arrowIn').f0; F.arrowD = T('arrowIn').dur; F.click2 = T('click2').f0;
  F.drift0 = T('drift').f0; F.drift1 = T('drift').f1;
  F.type0 = T('type').f0; F.typeEnd = T('type').f1;
  F.slam0 = T('slam').f0; F.impact = T('slam').f1;
  F.out0 = T('out').f0; F.out1 = T('out').f1;
  F.send0 = T('send').f0; F.sendD = T('send').dur; F.send1 = T('send').f1;
  const cut = Object.fromEntries(R.shots.map((s) => [s.id, s.f0]));
  F.cutB = cut.S2; F.cutC = cut.S3; F.cutD = cut.S4;
  F.sendIn0 = T('sendIn').f0; F.sendIn1 = T('sendIn').f1;
  F.click3 = T('click3').f0;
  F.hover0 = T('hover').f0; F.hover1 = F.hover0 + 14;
  F.fly0 = T('fly').f0; F.fly1 = T('fly').f1;
  F.rest0 = T('rest').f0; F.rest1 = T('rest').f1;
  F.pullOut0 = T('pullOut').f0; F.pullOut1 = T('pullOut').f1;
  F.grabIn0 = T('grabIn').f0; F.grabIn1 = T('grabIn').f1; F.grabWin = T('grabWin').f0;
  F.winOut0 = T('winOut').f0; F.winOut1 = T('winOut').f1;
  F.cutE = cut.S4; F.cutF = cut.S5; F.cutG = cut.S6; F.cutH = cut.S7; F.cutApp = cut.S10;
  F.m10 = T('m1').f0; F.m11 = T('m1').f1; F.m1out0 = T('m1out').f0;
  F.m20 = T('m2').f0; F.m21 = T('m2').f1; F.m2out0 = T('m2out').f0;
  F.m30 = T('m3').f0; F.m31 = T('m3').f1;
  F.uIn0 = T('uIn').f0; F.uIn1 = T('uIn').f1; F.uClick = T('uClick').f0;
  F.cmtCam0 = T('cmtCam').f0; F.cmtCam1 = T('cmtCam').f1;
  F.type30 = T('type3').f0; F.type3End = T('type3').f1;
  F.cmtSend0 = T('cmtSend').f0; F.cmtSend1 = T('cmtSend').f1; F.cmtClick = T('cmtClick').f0;
  F.cmtGone0 = T('cmtGone').f0; F.cmtGone1 = T('cmtGone').f1;
  F.backCam0 = T('backCam').f0; F.backCam1 = T('backCam').f1;
  F.uAway0 = T('uAway').f0; F.uAway1 = T('uAway').f1;
  F.swap0 = T('swap0').f0;
  F.whip = [0, 1, 2, 3].map((i) => [T('whip' + i).f0, T('whip' + i).f1]);
  F.word = [1, 2, 3].map((i) => T('w' + i).f0);
  F.level0 = T('level').f0; F.level1 = T('level').f1;
  F.dimIn0 = T('dimIn').f0; F.dimIn1 = T('dimIn').f1; F.dimOut0 = T('dimOut').f0; F.dimOut1 = T('dimOut').f1;
  F.appUp = T('appUp').f0; F.vcard = T('vcard').f0;
  F.toVideo0 = T('toVideo').f0; F.toVideo1 = T('toVideo').f1; F.openV = T('openV').f0;
  F.expand0 = T('expand').f0; F.expand1 = T('expand').f1;
  F.playV0 = T('playV').f0; F.playV1 = T('playV').f1;
  F.burst0 = T('burst').f0; F.burst1 = T('burst').f1; F.tab2 = T('tab2').f0;
  F.h3in0 = T('h3in').f0; F.h3in1 = T('h3in').f1; F.grip2 = T('grip2').f0;
  F.drag20 = T('drag2').f0; F.drag21 = T('drag2').f1; F.credIn = T('credIn').f0;
  F.end = T('end').f0;
  const keys = T('type').keys, keys3 = T('type3').keys, r3Times = T('reply3').times;

  const SHOTS = R.shots.map(({id, f0}) => ({id, from: f0}));
  const shotIndex = (f) => { let i = 0; while (i + 1 < SHOTS.length && f >= SHOTS[i + 1].from) i++; return i; };

  const IN0 = {
    header: -6, avatar: -5,
    name: {f0: -7, peak: 4}, handle: {f0: -2, peak: 4}, more: 2,
    text: {f0: 6, peak: 9}, video: 16, meta: {f0: 22, peak: 7},
    div1: 26, actions: 28, div2: 36, reply: 37,
  };
  const tw = T('tweetIn'), sh = (v) => Math.round(tw.f0 + v * (tw.item.stagger ?? 1));
  const IN = Object.fromEntries(Object.entries(IN0).map(([k, v]) => [k, typeof v === 'number' ? sh(v) : {...v, f0: sh(v.f0)}]));

  const X = {
    col: {x: 400, w: 600},
    headerH: 53,
    avatar: {x: 416, y: 66, d: 40},
    nameY: 66, handleY: 89,
    text: {x: 416, y: 118, size: 17, width: 298},
    video: {x: 416, y: 154, w: 568, h: 426},
    metaY: 598, div1: 638, actionsY: 650, div2: 702, replyY: 716,
  };

  const BAR = {x: 408, y: 113, h: 30, size: 19, w: 314};
  const GRAB_AT = [0.5, 0.5];
  const HANG = {pivot: [450, 265], scale: 0.42};

  const AI = {
    bg: '#F3F2ED', panel: '#FFFFFF', line: '#DEDBD3', lineFocus: '#B9B5AA', ink: '#1F1E1B', sub: '#8B887F', greet: '#2A2925',
    accent: '#D9785A', accentPress: '#C2603F', accentOff: '#EBC9BB', ok: '#4FA36B', side: '#EAE8E1', sideLine: '#DCD9D0', bubble: '#E9E7E0',
    greetingY: 374,
    composer: {x: 430, y: 442, w: 720, h: 118, grow: 104},
    chip: {x: 14, y: 14, w: 120, h: 90},
    send: 46,
  };

  const WIN = {x: 20, y: 20, w: 1300, h: 960, side: 240, bar: 44, r: 16};

  const CONV = {right: AI.composer.x + AI.composer.w, chip: {x: AI.composer.x + AI.composer.w - AI.chip.w, y: 92}, bubble: {y: 194, h: 42}};

  const RING = {cx: 670, cy: 1110, r: 215, fit: 112,
    icons: ['camera', 'coin', 'gamepad', 'cap', 'plant', 'cash', 'cat', 'heart'].map(name => [name, propAspect(name)]),
    pre: [0, 1]};
  RING.slot = (i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / RING.icons.length; return [RING.cx + RING.r * Math.cos(a), RING.cy + RING.r * Math.sin(a)]; };
  RING.size = (i) => { const ar = RING.icons[i][1]; return ar >= 1 ? [RING.fit, RING.fit / ar] : [RING.fit * ar, RING.fit]; };
  const CANVAS = {
    bg: '#F8F7F3', grid: 'rgba(30,28,24,.06)', gridStep: 48,
    cursor: TUNE.global.canvasCursor ?? 30, tagSize: 14, grabCursor: TUNE.global.canvasCursor ?? 30,
    colors: ['#D9785A', '#B5489A', '#1E8A73', '#3B6FD6', '#C98A1B', '#E0558B', '#6A5ACD', '#2E9E4F', '#0E95D6', '#9A3FD8'],
    winOut: [1500, 80],
    ring: RING,
    items: [
      {id: 'record', img: 'record', h: 120, ar: propAspect('record'), from: [1750, 230], at: [1075, 400], cur: 0, drop: 'c1', ae: 'm1', dir: [1, 0], out: {id: 'm1out', dir: [0.8, 0.6], len: 170}},
      {id: 'curio', text: 1, size: 56, w: 270, from: [1330, 1500], at: [1200, 650], cur: 1, drop: 'c2', ae: 'm3', dir: [1, 0], away: 'm3away'},

      {id: 'r2', ring: 2, from: [-900, 2200], cur: 2, drop: 'c3', exit: [1760, 1420]},
      {id: 'r3', ring: 3, from: [-1250, 1700], cur: 3, drop: 'c4', exit: [1500, 2150]},
      {id: 'dont', text: 0, size: 60, w: 300, from: [560, -1700], at: [470, -260], cur: 4, drop: 'c5', next: true},
      {id: 'clapper', img: 'clapper', h: 120, ar: propAspect('clapper'), from: [2300, -520], at: [1120, -190], cur: 5, drop: 'c6', exit: [1900, -560]},
      {id: 'r4', ring: 4, from: [820, 2350], cur: 7, drop: 'c7', exit: [980, 2300]},
      {id: 'r5', ring: 5, from: [-700, 2000], cur: 8, drop: 'c8', exit: [-640, 1780]},
      {id: 'r6', ring: 6, from: [-800, 980], cur: 9, drop: 'c9', exit: [-700, 1330]},
      {id: 'heart', ring: 7, cur: 6, drop: 'm2', jumpIn: [0.8, 0.6], out: {id: 'm2out', dir: [1, -0.15], len: 170}},
    ],

    comment: {pin: 40, w: 300, h: 116},

    wordGap: 2400, wordDX: [-160, 120, -60],

    decor: [

      {id: 'u-book', kind: 'static', under: true, img: 'book', h: 96, pos: [205, 470]},
      {id: 'u-skate', kind: 'static', under: true, img: 'skateboard', h: 84, pos: [1160, 860], rot: -8},
      {id: 'u-note', kind: 'static', under: true, text: FilmCopy.decor['u-note'], size: 34, pos: [1010, 120], left: true},
      {id: 'u-type', kind: 'type', under: true, handoff: 'dont', text: FilmCopy.decor['u-type'], size: 42, pos: [70, 150], at: 'grabWin', off: 6, every: 1.3, lead: 24, away: [40, 70]},
      {id: 'u-rect', kind: 'draw', under: true, shape: 'rect', cur: 6, p0: [60, 620], p1: [330, 860], at: 'grabWin', off: 5, dur: 22, lead: 26, enter: [-320, 980], fill: '#F6D9E4', away: [-300, 160]},

      {id: 's6-book', kind: 'drag', anchor: 'cmt', img: 'book', h: 74, cur: 3, from: [-470, 470], to: [-130, 255], at: 'uClick', off: 4, dur: 30, away: [70, 90]},
      {id: 's6-oval', kind: 'draw', anchor: 'cmt', shape: 'ellipse', cur: 5, p0: [30, 185], p1: [170, 300], at: 'uClick', off: 30, dur: 20, lead: 22, enter: [380, 520], fill: '#FBE3C2', away: [60, 80]},
      {id: 's6-txt', kind: 'type', anchor: 'cmt', cur: 7, text: FilmCopy.decor['s6-txt'], size: 18, pos: [40, -330], at: 'uClick', off: 22, every: 2, lead: 20, enter: [380, -560], away: [70, -80]},

      {id: 'w1-cash', kind: 'static', anchor: 'w1', img: 'cash', h: 60, pos: [165, -170], rot: 6},
      {id: 'w1-coin', kind: 'drag', anchor: 'w1', img: 'coin', h: 78, cur: 3, from: [-400, -560], to: [-120, -240], at: 'w1', off: -12, dur: 26, away: [-60, -40]},
      {id: 'w1-rect', kind: 'draw', anchor: 'w1', shape: 'rect', cur: 5, p0: [-150, 175], p1: [60, 290], at: 'w1', off: 2, dur: 20, lead: 14, enter: [-360, 400], fill: '#D8E6FB', away: [50, 60]},
      {id: 'w1-txt', kind: 'type', anchor: 'w1', cur: 1, text: FilmCopy.decor['w1-txt'], size: 18, pos: [40, -290], at: 'w1', off: -2, every: 2, lead: 14, enter: [300, -500], away: [70, -50]},

      {id: 'w2-cap', kind: 'static', anchor: 'w2', img: 'cap', h: 58, pos: [170, -205], rot: -7},
      {id: 'w2-txt', kind: 'type', anchor: 'w2', cur: 1, text: FilmCopy.decor['w2-txt'], size: 18, pos: [-190, -285], at: 'w2', off: -4, every: 2, lead: 14, enter: [-400, -520], away: [-50, -60]},
      {id: 'w2-pad', kind: 'drag', anchor: 'w2', img: 'gamepad', h: 64, cur: 6, from: [-460, 600], to: [-110, 235], at: 'w2', off: -10, dur: 26, away: [-50, 60]},
      {id: 'w2-oval', kind: 'draw', anchor: 'w2', shape: 'ellipse', cur: 4, p0: [70, 150], p1: [185, 270], at: 'w2', off: 4, dur: 18, lead: 14, enter: [380, 430], fill: '#D5F0DC', away: [50, 70]},

      {id: 'w3-plant', kind: 'static', anchor: 'w3', img: 'plant', h: 74, pos: [170, 300], rot: 5},
      {id: 'w3-rect', kind: 'draw', anchor: 'w3', shape: 'rect', cur: 0, p0: [-185, -300], p1: [-35, -175], at: 'w3', off: -2, dur: 18, lead: 14, enter: [-400, -520], fill: '#FDE7D6', away: [-40, -50]},
      {id: 'w3-cam', kind: 'drag', anchor: 'w3', img: 'camera', h: 66, cur: 2, from: [360, 620], to: [40, 225], at: 'w3', off: -10, dur: 26, away: [60, 60]},
      {id: 'w3-txt', kind: 'type', anchor: 'w3', cur: 8, text: FilmCopy.decor['w3-txt'], size: 18, pos: [-185, 190], at: 'w3', off: 4, every: 2, lead: 14, enter: [-400, 480], away: [-50, 70]},
    ],
  };

  const COPY = {...FilmCopy, tags: FilmCopy.canvas.tags, words: FilmCopy.canvas.words};

  window.STORY = {F, TL, CURVE, SHOTS, shotIndex, IN, X, BAR, GRAB_AT, HANG, AI, WIN, CONV, CANVAS, COPY, LAG, KEYS: keys, KEYS3: keys3, REPLY3_T: r3Times,
    PLAY_FRAMES: F.grab - F.play};
})();
