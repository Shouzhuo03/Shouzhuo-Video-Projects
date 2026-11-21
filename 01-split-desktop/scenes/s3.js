(function(){
  const O=window.Oil,W=260,H=186,TAU=Math.PI*2,VP=[130,39];let cache;
  const rays=[[0,9],[260,13],[0,65],[260,69],[0,135],[260,141]];
  function line(g,p,c,w){g.strokeStyle=c;g.lineWidth=w;O.path(g,p,false);g.stroke();}
  function block(g,x,y,w,h,c,seed){
    g.fillStyle=c;g.fillRect(x,y,w,h);const r=O.rng(seed);
    for(let i=0;i<w*h*1.7;i++){g.fillStyle=i%3?'rgba(13,28,15,.29)':'rgba(224,230,161,.27)';g.fillRect(x+r()*w,y+r()*h,.2+r()*.45,.2+r()*.4);}
    g.strokeStyle='#172b20';g.lineWidth=.7;g.strokeRect(x+4,y+4,w-8,h-8);
  }
  function build(){
    if(cache)return cache;
    const back=O.layer(W,H,g=>{
      g.fillStyle='#202321';g.fillRect(0,0,W,H);

      g.save();g.beginPath();g.rect(0,40,W,H-40);g.clip();
      for(let x=-470;x<=730;x+=60)line(g,[VP,[x,H]],'rgba(232,166,66,.58)',.55);
      for(const y of [45,50,57,66,78,94,116,145,182])line(g,[[0,y],[W,y]],'rgba(232,166,66,.6)',.55);
      g.restore();
      rays.forEach(p=>line(g,[VP,p],'#ac803b',.6));

      g.fillStyle='rgba(40,101,215,.10)';g.fillRect(98,7,64,53);
      block(g,105,14,50,36,'#2866af',303);g.fillStyle='#161f24';g.fillRect(111,20,38,24);
      g.strokeStyle='#4b8ce0';g.lineWidth=.7;g.strokeRect(109,18,42,28);
      line(g,[[130,50],[130,55],[117,55],[143,55]],'#4777a2',1.2);
      block(g,-8,83,65,91,'#73904f',311);block(g,204,74,65,100,'#658747',312);
      block(g,64,55,24,41,'#81995d',313);block(g,173,53,22,39,'#79914e',314);
      for(let row=0;row<8;row++)for(let col=0;col<4;col++){
        const x=8+col*10,y=98+row*8;g.strokeStyle='#263c28';g.lineWidth=.8;g.beginPath();g.arc(x,y,2.6,0,TAU);g.stroke();
      }
      for(let i=0;i<6;i++){line(g,[[220,94+i*11],[250-(i%2)*9,94+i*11]],'#243626',1.7);g.fillStyle='#243626';g.beginPath();g.arc(214,94+i*11,1.5,0,TAU);g.fill();}
      for(const x of [76,184]){g.fillStyle='#243626';g.beginPath();g.arc(x,67,5,0,TAU);g.fill();g.beginPath();g.arc(x,83,2.6,0,TAU);g.fill();}

      line(g,[[113,50],[147,50],[151,56],[146,88],[114,88],[109,56],[113,50]],'#b5a777',1.15);
      line(g,[[114,88],[108,124],[152,124],[146,88]],'#8f906e',.85);
      line(g,[[111,92],[104,92],[102,107]],'#b5a777',1);
      line(g,[[149,92],[156,92],[158,107]],'#b5a777',1);
      line(g,[[130,125],[130,138],[113,145],[130,138],[147,145]],'#a99a6b',1);

      const fade=g.createLinearGradient(0,141,0,181);fade.addColorStop(0,'rgba(32,35,33,0)');fade.addColorStop(1,'rgba(32,35,33,.94)');g.fillStyle=fade;g.fillRect(58,141,144,45);
    });
    const front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2),g=blur.getContext('2d');g.filter='blur(12px)';g.drawImage(back,0,0,blur.width,blur.height);return cache={back,front,blur};
  }
  function liveBack(g,t){g.save();
    rays.forEach((end,i)=>{for(let j=0;j<2;j++){const u=(t*.025+i*.137+j*.47)%1;const x=VP[0]+(end[0]-VP[0])*u,y=VP[1]+(end[1]-VP[1])*u;g.fillStyle='#ffbc4d';g.beginPath();g.arc(x,y,1.5,0,TAU);g.fill();}});
    g.globalAlpha=.09+.045*Math.sin(t*.8);g.strokeStyle='#83b8ff';g.lineWidth=2;g.strokeRect(106,15,48,34);g.restore();}
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s3:{W,H,build,liveBack,liveFront(){},style:'grid',light:{key:[.35,.6,1],keyDir:[0,-1],fill:[.16,.23,.2],rim:[.8,.65,.34]}}});
})();
