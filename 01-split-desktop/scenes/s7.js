(function(){
  const O=window.Oil,W=280,H=186,TAU=Math.PI*2,paper='#e1dfcf',ink='#35372f';let cache;
  function poly(g,pts,c){g.fillStyle=c;O.path(g,pts);g.fill();}
  function stroke(g,pts,w=1,c=ink){g.strokeStyle=c;g.lineWidth=w;O.path(g,pts,false);g.stroke();}
  const body=[[42,117],[53,107],[76,109],[93,116],[100,129],[91,140],[59,140],[45,132]];
  const head=[[43,116],[37,109],[24,109],[20,103],[24,92],[39,90],[50,100],[53,114]];
  const legs=[[[50,133],[48,154],[39,158],[54,158],[61,135]],[[72,135],[78,154],[73,158],[87,158],[83,134]],[[88,131],[98,146],[98,155],[107,155],[103,143],[98,126]]];
  function pencil(g,pts,r,w=.9){
    for(let j=0;j<4;j++){g.save();g.translate((r()-.5)*1.1,(r()-.5)*1.1);g.globalAlpha=.25+r()*.25;stroke(g,pts,w*(.6+r()*.6));g.restore();}
  }
  function paint(g){
    g.fillStyle=paper;g.fillRect(0,0,W,H);g.fillStyle='#eab05b';g.fillRect(0,0,95,101);g.fillStyle='#b9d0c4';g.fillRect(95,0,99,101);g.fillStyle='#8b9e68';g.fillRect(95,101,99,85);
    g.fillStyle='#285da0';g.fillRect(194,0,86,H);

    stroke(g,[[250,170],[250,50],[244,42],[229,42]],1.9,'#e6e8d7');
    poly(g,[[224,43],[236,43],[239,48],[221,48]],'#e6e8d7');
    stroke(g,[[201,186],[211,143],[219,97],[212,62],[218,17]],1.2,'#e6e8d7');
    const r=O.rng(7716);
    for(let i=0;i<22;i++){
      const y=20+i*6.6,x=215+Math.sin(i*.72)*6,side=i%2?1:-1,ex=x+side*(10+r()*16),ey=y-9-r()*8;
      stroke(g,[[x,y],[ex,ey]],.7,'#e6e8d7');
      g.save();g.translate(ex,ey);g.rotate(side*.7);g.fillStyle='#e6e8d7';g.beginPath();g.ellipse(0,0,3.2,7.4,0,0,TAU);g.fill();g.restore();
    }

    stroke(g,[[0,171],[67,166]],.6,'#898b77');stroke(g,[[167,164],[191,160]],.6,'#647653');
    const shapes=[body,head,...legs];
    g.save();g.beginPath();shapes.forEach(s=>{g.moveTo(s[0][0],s[0][1]);s.slice(1).forEach(q=>g.lineTo(q[0],q[1]));g.closePath();});g.clip();

    for(let i=0;i<560;i++){
      const x=17+r()*94,y=87+r()*74;
      g.globalAlpha=.12+r()*.4;stroke(g,[[x,y],[x+3+r()*8,y-3-r()*5]],.3+r()*.5);
    }
    g.restore();
    shapes.forEach(s=>pencil(g,s.concat([s[0]]),r,1));

    pencil(g,[[39,94],[46,97],[47,113],[42,117],[36,107],[39,94]],r,1.5);
    poly(g,[[20,99],[24,98],[24,102],[20,103]],ink);
    g.fillStyle=ink;g.beginPath();g.arc(30,96,1.2,0,TAU);g.fill();
    stroke(g,[[47,113],[51,116],[49,122]],1.5,'#975135');
    const texture=O.rng(71919);
    for(let i=0;i<15000;i++){
      g.fillStyle=i%3?'rgba(245,240,218,.09)':'rgba(40,43,30,.09)';
      g.fillRect(texture()*W,texture()*H,.15+texture()*.45,.15+texture()*.4);
    }
  }
  function build(){if(cache)return cache;const back=O.layer(W,H,paint),front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2);const g=blur.getContext('2d');g.filter='blur(8px)';g.drawImage(back,0,0,blur.width,blur.height);return cache={back,front,blur};}
  function liveBack(g,t){
    g.save();g.lineCap='round';const s=Math.sin(t*1.2);

    g.strokeStyle=ink;g.lineWidth=.85;g.beginPath();g.moveTo(50,119);g.bezierCurveTo(75,146+s,107,155,139,137);g.bezierCurveTo(156,127-s,150,119,140,127);g.stroke();

    for(let j=0;j<3;j++){g.globalAlpha=.4;g.lineWidth=.6+j*.15;g.beginPath();g.moveTo(94+j*.3,119);g.bezierCurveTo(109,119,118,107+s*2,116,99+s*3);g.bezierCurveTo(124,113+s*2,112,129,99,128);g.stroke();}
    g.restore();
  }
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s7:{W,H,build,liveBack,liveFront(){},style:'cyanotype',light:{key:[1,.85,.6],keyDir:[-1,-1],fill:[.6,.75,.7],rim:[.6,.75,1]}}});
})();
