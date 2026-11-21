(function(){
  const O=window.Oil,W=260,H=186,TAU=Math.PI*2;let cache;
  function poly(g,p,c){g.fillStyle=c;O.path(g,p);g.fill();}
  function ellipse(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}
  function build(){
    if(cache)return cache;

    const tone=O.layer(W,H,g=>{
      g.fillStyle='#151515';g.fillRect(0,0,W,H);
      g.fillStyle='#b5b5b5';g.fillRect(0,0,94,H);
      [[15,34,28,9],[38,30,20,14],[59,40,38,8],[79,91,28,10],[48,99,43,7],[14,154,42,10],[24,143,19,14],[72,165,32,9]].forEach(([x,y,a,b])=>ellipse(g,x,y,a,b,'#f4f4f4'));

      poly(g,[[103,40],[211,32],[218,92],[110,104]],'#696969');
      poly(g,[[106,83],[210,74],[249,178],[91,178]],'#b8b8b8');
      poly(g,[[113,83],[202,78],[235,165],[101,169]],'#dddddd');
      poly(g,[[113,55],[150,50],[161,74],[119,87],[105,73]],'#ededed');
      ellipse(g,130,69,14,8,'#a0a0a0');ellipse(g,130,68,10,5,'#bdbdbd');

      poly(g,[[144,87],[193,78],[216,101],[188,111],[161,104]],'#454545');
      poly(g,[[139,90],[191,83],[209,99],[179,107],[157,102]],'#f5f5f5');
      poly(g,[[139,90],[157,102],[179,107],[166,113],[143,103]],'#929292');
      poly(g,[[146,106],[164,117],[137,158],[116,170]],'#aeaeae');
      poly(g,[[164,117],[172,113],[153,157],[137,169]],'#efefef');
      poly(g,[[187,110],[195,108],[225,164],[213,165]],'#aaaaaa');

      for(let i=0;i<9;i++){g.strokeStyle=i%2?'#c6c6c6':'#969696';g.lineWidth=.7+i%3*.3;g.beginPath();g.moveTo(112+i*11,118+i%3*6);g.quadraticCurveTo(118+i*10,145,108+i*13,171);g.stroke();}
      poly(g,[[166,62],[177,65],[173,83],[162,80]],'#333333');
      poly(g,[[167,64],[175,66],[172,80],[164,78]],'#ffffff');
    },2);
    const pixels=tone.getContext('2d').getImageData(0,0,W*2,H*2).data;
    const back=O.layer(W,H,g=>{
      g.fillStyle='#111312';g.fillRect(0,0,W,H);g.fillStyle='#eee9db';g.fillRect(0,0,94,H);

      const step=1.35;
      for(let y=.5;y<H;y+=step)for(let x=.5;x<W;x+=step){
        const ix=Math.min(W*2-1,Math.floor(x*2)),iy=Math.min(H*2-1,Math.floor(y*2));const v=pixels[(iy*W*2+ix)*4]/255;
        const ink=x<94?1-v:v; const r=Math.sqrt(ink)*step*.68;
        if(r<.07)continue;g.fillStyle=x<94?'#377f9a':'#edece5';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
      }

      for(const x of [15,44,73,102,131,160])ellipse(g,x,25,8.5,8.5,'#39ac3d');
      ellipse(g,189,25,8.5,8.5,'#ed4a37');

      poly(g,[[167,64],[175,66],[172,80],[164,78]],'#e9f4f3');
      const r=O.rng(7404);g.fillStyle='rgba(12,31,36,.11)';
      for(let i=0;i<9000;i++)g.fillRect(r()*W,r()*H,.18,.3);

      g.fillStyle='#141615';g.fillRect(94,177,166,9);
    });
    const front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2),g=blur.getContext('2d');g.filter='blur(12px)';g.drawImage(back,0,0,blur.width,blur.height);return cache={back,front,blur};
  }
  function liveBack(g,t){g.save();const k=.5+.5*Math.sin(t*.12);ellipse(g,218,25,8.5,8.5,`rgb(${Math.round(57+180*k)},${Math.round(172-98*k)},${Math.round(61-6*k)})`);g.restore();}
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s4:{W,H,build,liveBack,liveFront(){},style:'halftone',light:{key:[.75,.88,1],keyDir:[-1,-1],fill:[.45,.5,.54],rim:[.8,.9,1]}}});
})();
