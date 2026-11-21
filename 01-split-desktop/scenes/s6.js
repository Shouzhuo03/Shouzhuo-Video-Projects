(function(){
  const O=window.Oil,W=280,H=186,TAU=Math.PI*2;
  const p='#f1eee4',blue='#295da2',black='#282b24',orange='#d9823e',green='#7c9e53',yellow='#f0bf42';let cache;
  function dot(g,x,y,r,c){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
  function card(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);g.strokeStyle=black;g.lineWidth=.65;g.strokeRect(x,y,w,h);}
  function wire(g,pts){g.strokeStyle='#93958b';g.lineWidth=.6;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function shopper(g,x,y,c,dir){
    dot(g,x,y,5.5,black);card(g,x-7,y+10,14,29,c);
    g.strokeStyle=black;g.lineWidth=1.5;
    for(const d of [-1,1]){g.beginPath();g.moveTo(x+d*4,y+39);g.lineTo(x+d*5,y+55);g.stroke();}
    g.beginPath();g.moveTo(x+dir*7,y+15);g.lineTo(x+dir*17,y+29);g.stroke();
    const bx=x+dir*20;card(g,bx-7,y+32,15,19,c===blue?yellow:blue);
    g.beginPath();g.arc(bx+.5,y+32,4,Math.PI,TAU);g.stroke();dot(g,bx+.5,y+42,1.2,p);
  }
  function paint(g){
    g.fillStyle=blue;g.fillRect(0,0,W,H);g.fillStyle=p;g.fillRect(8,8,264,170);

    card(g,21,23,89,81,p);
    g.save();g.beginPath();g.rect(22,24,87,79);g.clip();
    for(let y=29;y<102;y+=7)for(let x=26;x<109;x+=7){g.beginPath();g.arc(x,y,1.7,0,TAU);if((x+y)%3===0){g.fillStyle=orange;g.fill();}else{g.strokeStyle=orange;g.lineWidth=.65;g.stroke();}}g.restore();
    card(g,41,40,56,82,green);g.strokeStyle=p;g.lineWidth=.6;g.strokeRect(47,48,44,65);
    for(const y of [54,63,72])dot(g,53,y,1.8,p);
    card(g,171,18,69,88,yellow);g.strokeStyle=black;g.strokeRect(179,30,51,65);
    card(g,193,42,64,84,blue);
    for(let y=51;y<121;y+=12)for(let x=201;x<251;x+=12)dot(g,x,y,1.6,p);

    g.fillStyle=orange;g.fillRect(27,17,24,5);g.fillStyle=green;g.fillRect(218,12,22,4);
    wire(g,[[8,135],[30,135],[44,121],[44,105]]);dot(g,30,135,2,'#93958b');
    wire(g,[[241,91],[263,91],[263,143],[230,143],[218,154]]);dot(g,263,112,2,'#93958b');
    wire(g,[[87,87],[99,87],[99,137],[75,137]]);dot(g,99,121,2,'#93958b');
    wire(g,[[204,112],[186,130],[186,160],[252,160],[265,174]]);dot(g,232,160,2,'#93958b');
    shopper(g,52,91,blue,1);shopper(g,213,98,green,-1);

    g.strokeStyle=black;g.lineWidth=.7;g.strokeRect(114,42,52,90);
    const r=O.rng(6505);g.fillStyle='rgba(68,57,32,.035)';
    for(let i=0;i<6500;i++)g.fillRect(r()*W,r()*H,.2,.25);
  }
  function build(){if(cache)return cache;const back=O.layer(W,H,paint),front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2);const g=blur.getContext('2d');g.filter='blur(8px)';g.drawImage(back,0,0,blur.width,blur.height);return cache={back,front,blur};}
  function liveBack(g,t){const u=((t*.065)%1+1)%1;let x,y;if(u<.5){x=241+44*u;y=91;}else{x=263;y=91+(u-.5)*104;}dot(g,x,y,2.1,orange);}
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s6:{W,H,build,liveBack,liveFront(){},style:'cards',light:{key:[1,1,.88],keyDir:[1,-1],fill:[.7,.8,.65],rim:[1,.85,.5]}}});
})();
