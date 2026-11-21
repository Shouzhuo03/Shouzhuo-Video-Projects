(function () {
  const O = window.Oil, W = 480, H = 296;
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const sky = ['#e9dfce', '#e4d4c8', '#d5d9d6', '#d4dce0', '#f4e5c8'];
  const grass = ['#929f7f', '#a6af86', '#b7b68a', '#7e9486', '#c2be90', '#a0a38e'];
  const path = [[273,91],[292,91],[319,131],[352,174],[422,236],[500,286],[500,310],[78,310],[148,232],[190,174],[227,133]];

  function dab(g, x, y, len, w, a, col, r, opacity = 1) {
    g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = opacity; g.fillStyle = col;
    g.beginPath(); g.moveTo(-len*.5, -w*.35);
    g.lineTo(-len*.3, -w*.55); g.lineTo(len*.4, -w*.4);
    g.lineTo(len*.53, -w*.05); g.lineTo(len*.38, w*.44);
    g.lineTo(-len*.42, w*.5); g.closePath(); g.fill();
    g.globalAlpha = opacity*.21; g.fillStyle = '#f0e5ce';
    g.fillRect(-len*.35, (r()-.5)*w*.6, len*(.25+r()*.4), .12);
    g.restore();
  }
  function field(g, pts, base, palette, n, seed, angle = 0, scale = 1) {
    const r = O.rng(seed), box = O.bbox(pts);
    g.save(); O.path(g, pts); g.clip(); g.fillStyle = base; g.fillRect(...[box[0],box[1],box[2]-box[0],box[3]-box[1]]);
    for(let i=0;i<n;i++) {
      const x=O.lerp(box[0],box[2],r()), y=O.lerp(box[1],box[3],r());
      dab(g,x,y,(2+r()*6)*scale,(.7+r()*2.1)*scale,angle+(r()-.5)*.65,pick(r,palette),r,.45+r()*.5);
    }
    g.restore();
  }
  function tree(g, x, foot, height, width, seed, far = false) {
    const r=O.rng(seed), top=foot-height;
    const bark=far?['#aaa9a0','#b2b4a5','#c7bca5']:['#6f7977','#7b7e7f','#908e86','#aaa38e'];

    for(let y=foot;y>top;y-=2.1) {
      const u=(foot-y)/height, xx=x+Math.sin(u*3+seed)*width*.4-u*width*.6;
      dab(g,xx,y,3+r()*4,width*(1-u*.7),1.5,pick(r,bark),r,.95);
      dab(g,xx+width*.32,y,2+r()*3,width*.15,1.48,far?'#d9ccb0':'#d8bf89',r,.65);
    }
    for(let branch=0;branch<5;branch++) {
      const yy=top+height*(.18+branch*.115), side=branch%2?1:-1;
      for(let j=0;j<12;j++) dab(g,x+side*j*2,yy-j*1.6,4,Math.max(.6,width*.21-j*.07),-.65*side,pick(r,bark),r,.7);
    }
  }
  function crown(g, cx, cy, rx, ry, n, seed, far=false) {
    const r=O.rng(seed), colors=far?['#bec5b0','#ccd0b7','#d8d4af','#b1bead','#e5d9af']:['#748d80','#91a184','#adb18a','#c2be8e','#d7c58f','#809785','#b8ba9a'];
    for(let i=0;i<n;i++) {
      const a=r()*Math.PI*2, d=Math.sqrt(r()), x=cx+Math.cos(a)*rx*d, y=cy+Math.sin(a)*ry*d;
      if(x>260 && x<390 && y>20 && r()<.6) continue;
      dab(g,x,y,2+r()*6,.8+r()*2.7,-.4+r()*1.5,pick(r,colors),r,.5+r()*.45);
    }
  }
  const runners = [[210,154,1.02,'#7b858e'],[299,147,.88,'#a18a81'],[323,143,.75,'#8f9b95']];
  function runner(g,x,y,s,col,seed) {
    const r=O.rng(seed);
    g.save();g.translate(x,y);g.scale(s,s);

    field(g,[[-4,-40],[1,-42],[4,-39],[3,-34],[-2,-33],[-5,-36]],'#9b978d',['#a8a398','#c9bda4','#8c9493'],30,seed+1,1.4,.4);
    field(g,[[-5,-32],[2,-33],[7,-28],[6,-17],[-6,-18],[-8,-26]],col,[col,'#a7aaa6','#bdb6a4','#7c8993'],65,seed+2,1.3,.6);
    dab(g,-8,-24,12,2,1.65,'#afa89a',r);dab(g,7,-23,11,2,1.35,'#c6b99e',r);
    dab(g,-3,-16,8,6,0,'#737f89',r);dab(g,3,-15,7,5,.15,'#6e7e8b',r);
    dab(g,-4,-7,12,2.5,1.68,'#9e9e9c',r);dab(g,4,-7,11,2.5,1.32,'#b3ab9c',r);
    dab(g,-5,-.5,6,2,-.1,'#d9d7c7',r);dab(g,6,0,6,2,.1,'#d4d7cf',r);
    dab(g,3,-37,6,.8,1.5,'#edd6ab',r,.8);g.restore();
  }
  function paint(g) {
    O.ground(g,W,H,{tone:'#d9d7c3',seed:610});
    const air=g.createLinearGradient(0,0,0,150);air.addColorStop(0,'#d5dcde');air.addColorStop(.65,'#f0dfc5');air.addColorStop(1,'#ded9c7');g.fillStyle=air;g.fillRect(0,0,W,170);
    const r=O.rng(611);
    for(let i=0;i<2600;i++) dab(g,r()*W,r()*140,3+r()*8,.7+r()*2,.05,pick(r,sky),r,.28);
    const sun=g.createRadialGradient(350,55,0,350,55,102);sun.addColorStop(0,'rgba(255,241,201,.88)');sun.addColorStop(.18,'rgba(255,235,188,.46)');sun.addColorStop(1,'rgba(255,232,190,0)');g.fillStyle=sun;g.fillRect(240,0,230,170);

    field(g,[[0,96],[74,84],[155,93],[246,89],[330,103],[480,97],[480,151],[0,155]],'#b8c2b2',['#b3bdaf','#c8c9b5','#aebbad','#d0cbbc','#c4bfb8'],2700,612,0,.75);
    for(let i=0;i<17;i++)tree(g,20+i*28,123+r()*12,36+r()*33,1.4,620+i,true);

    field(g,[[0,135],[126,126],[238,108],[256,112],[192,150],[128,200],[77,263],[0,284]],'#b7c6c7',['#a3b9bf','#c6d0c9','#d9d8c2','#e7ddbd','#a6b6c2','#c0becb'],3500,640,0,1);
    field(g,[[0,291],[81,228],[166,161],[236,118],[278,97],[480,126],[480,310],[0,310]],'#a6ad8c',grass,4200,641,-.4,1.1);
    field(g,path,'#d5ccba',['#dcd2bf','#e9d8b6','#c3c2bd','#c9c4c3','#e0cfb9','#e8dcbd'],4900,642,-.2,1.2);

    const shadows=[[[405,164],[411,165],[171,296],[128,296]],[[455,207],[462,210],[305,296],[266,296]],[[345,131],[348,132],[133,245],[116,240]],[[370,143],[373,143],[69,292],[37,296]]];
    shadows.forEach((p,i)=>field(g,p,'#a3acb5',['#a4aebb','#b5b7be','#929fb2','#b9b8c2','#b6b6bb'],720,650+i,-.5,.85));

    runners.forEach(([x,y,s],i)=>field(g,[[x-3,y],[x+4,y],[x-59*s,y+45*s],[x-74*s,y+47*s]],'#a1a8b4',['#a6aeb9','#b5b5bf','#99a7b5'],170,660+i,-.6,.55));

    for(let i=0;i<520;i++) {
      const u=r(),y=137+u*164,x=225-177*u+Math.sin(u*4)*-15;
      dab(g,x+(r()-.5)*15,y,2+r()*6,.5+r()*1.3,-.9,pick(r,grass),r,.7);
    }

    [[346,131,88,2],[369,143,113,3],[405,164,155,5],[456,207,220,8],[477,235,265,10],[108,173,170,6],[41,220,235,10]].forEach((a,i)=>tree(g,...a,680+i));
    crown(g,190,69,89,29,1500,700,true);crown(g,429,37,102,51,2100,701);crown(g,55,22,123,72,2500,702);crown(g,29,105,61,44,900,703);
    runners.forEach(([x,y,s,c],i)=>runner(g,x,y,s,c,730+i*5));

    for(let i=0;i<700;i++) {
      const x=r()*W,y=178+r()*118;
      if(x>160 && x<320 && y>201 && y<248)continue;
      if(x<105 || x>406)dab(g,x,y,2+r()*7,1+r()*2,-.4,pick(r,['#d1c78d','#e0cf9a','#b3b388','#c5c0a1']),r,.65);
    }
    O.canvasGrain(g,W,H,.085);
  }
  let cache;
  function build() {
    if(cache)return cache;
    const back=O.layer(W,H,paint),front=O.layer(W,H,()=>{});
    const blur=O.canvas(W*2,H*2),g=blur.getContext('2d');g.filter='blur(14px)';g.drawImage(back,0,0,blur.width,blur.height);
    return cache={back,front,blur};
  }
  function liveBack(g,t) {
    g.save();

    for(let i=0;i<3;i++) {
      const x=85+i*150+Math.sin(t*.065+i*1.8)*19,y=105+i*5;
      g.save();g.translate(x,y);g.scale(1,.12);
      const fog=g.createRadialGradient(0,0,0,0,0,114);fog.addColorStop(0,'rgba(247,235,215,.12)');fog.addColorStop(1,'rgba(247,235,215,0)');g.fillStyle=fog;g.fillRect(-114,-114,228,228);g.restore();
    }

    const r=O.rng(780);
    for(let i=0;i<24;i++) {
      const x=i<12?r()*150:390+r()*90,y=12+r()*65,k=.09+.12*(.5+.5*Math.sin(t*.7+i*2.3));
      g.fillStyle=`rgba(255,230,167,${k})`;g.fillRect(x,y,1.5+r()*2,.6+r());
    }
    g.restore();
  }
  window.DeskScenes=Object.assign(window.DeskScenes||{},{run:{W,H,build,liveBack,liveFront(){},style:'impression',light:{key:[1.12,1.03,.84],keyDir:[1,-.6],fill:[.72,.8,.93],rim:[1.2,1.08,.8]}}});
})();
