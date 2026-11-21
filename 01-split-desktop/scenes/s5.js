(function () {
  const O=window.Oil,W=280,H=186,TAU=Math.PI*2;
  const paper='#e9e2cc',ink='#272820',colors=['#c33b72','#de5635','#e3a32c','#e5c94f','#429ca4'];
  let cache;
  function circle(g,x,y,r,c){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
  function band(g,k){
    g.beginPath();g.moveTo(27,103+k*12);g.lineTo(59,103+k*12);
    g.bezierCurveTo(95,103+k*12,81+k*6,25+k*12,133+k*9,25+k*12);
    g.lineTo(283,25+k*12);g.stroke();
  }
  function paint(g){
    g.fillStyle=paper;g.fillRect(0,0,W,H);
    g.fillStyle=ink;g.fillRect(9,9,262,168);
    g.save();g.beginPath();g.rect(10,10,260,138);g.clip();
    colors.forEach((c,k)=>{g.strokeStyle=c;g.lineWidth=9;g.lineCap='butt';band(g,k);});

    g.fillStyle=paper;g.fillRect(22,20,43,5);g.fillRect(22,30,25,2);
    g.fillStyle='#131713';g.fillRect(219,90,42,51);
    for(let y=94;y<140;y+=4)for(let x=223;x<260;x+=4)circle(g,x+(y%8?0:1),y,.72,'#aaa88b');

    g.fillStyle='#a79e82';g.fillRect(102,42,78,82);
    g.fillStyle=paper;g.fillRect(100,40,78,82);
    g.strokeStyle='#b4aa8e';g.lineWidth=.55;g.strokeRect(103,43,72,76);

    g.save();g.translate(43,78);g.rotate(-.42);
    g.fillStyle=paper;g.fillRect(-4,8,8,48);g.fillStyle='#a5a38e';g.fillRect(1,13,2,38);
    circle(g,0,0,13,paper);g.strokeStyle=ink;g.lineWidth=.8;
    g.save();g.beginPath();g.arc(0,0,10,0,TAU);g.clip();
    for(let y=-12;y<13;y+=3){g.beginPath();g.moveTo(-13,y);g.lineTo(13,y);g.stroke();}
    for(let x=-12;x<13;x+=4){g.beginPath();g.moveTo(x,-13);g.lineTo(x,13);g.stroke();}g.restore();
    g.fillStyle=ink;g.fillRect(-4,18,8,4);g.restore();
    g.strokeStyle=paper;g.lineWidth=.8;g.beginPath();g.moveTo(61,128);g.bezierCurveTo(87,149,15,159,29,174);g.stroke();
    g.restore();

    g.fillStyle=paper;g.fillRect(12,148,256,26);g.fillRect(77,10,184,15);
    for(let k=0;k<6;k++){
      const x=89+k*32;circle(g,x,17.5,6.1,ink);circle(g,x,17.5,4.8,'#414038');
      const a=-2.3+k*.35;g.strokeStyle='#df4b37';g.lineWidth=1.5;g.beginPath();g.moveTo(x+Math.cos(a)*2,17.5+Math.sin(a)*1.5);g.lineTo(x+Math.cos(a)*6,17.5+Math.sin(a)*4.5);g.stroke();
    }
    g.fillStyle='#bf3a68';g.fillRect(22,155,19,4);g.fillStyle='#419ba1';g.fillRect(22,163,30,3);
    const r=O.rng(5708);
    for(let i=0;i<10500;i++){
      g.fillStyle=i%3?'rgba(242,230,194,.10)':'rgba(40,29,18,.11)';
      g.fillRect(r()*W,r()*H,.15+r()*.5,.15+r()*.35);
    }
    g.fillStyle=paper;
    for(let i=0;i<170;i++){const x=r()*W,y=r()<.5?9+r()*2:175+r()*2;g.fillRect(x,y,.5+r()*2,.25+r()*.6);}
  }
  function build(){if(cache)return cache;const back=O.layer(W,H,paint),front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2);const g=blur.getContext('2d');g.filter='blur(9px)';g.drawImage(back,0,0,blur.width,blur.height);return cache={back,front,blur};}
  function liveBack(g,t){
    g.save();g.lineCap='butt';

    colors.forEach((c,k)=>{const n=2+Math.floor((.5+.5*Math.sin(t*1.5-k*.65))*3);g.fillStyle=c;for(let j=0;j<n;j++)g.fillRect(187+k*13,121-j*5,8,3);});
    g.restore();
  }
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s5:{W,H,build,liveBack,liveFront(){},style:'tape',light:{key:[1,.85,.7],keyDir:[-1,0],fill:[.7,.3,.5],rim:[.3,.85,.9]}}});
})();
