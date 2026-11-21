(function () {
  const O = window.Oil, W = 260, H = 186, TAU = Math.PI * 2;
  const C = ['#789640', '#246342', '#315baa', '#df9482', '#c5b194'];
  let cache;
  function dot(g, x, y, r, c) {
    g.fillStyle = 'rgba(48,48,33,.10)'; g.beginPath(); g.arc(x + .45, y + .8, r + .35, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function friend(g, x, y, c, side) {
    g.fillStyle = c; g.beginPath(); g.arc(x, y, 6.5, 0, TAU); g.fill();
    g.save(); g.translate(x,y+12); g.rotate(side*.12); g.fillRect(-5.5,0,11,31); g.restore();
    g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(x+side*3,y+17); g.lineTo(x+side*16,y+20); g.lineTo(x+side*23,y+7); g.stroke();
    g.strokeStyle = '#555849'; g.lineWidth = .8; g.strokeRect(x+side*23-2.5,y-.5,5,6); g.beginPath(); g.moveTo(x+side*23,y+6); g.lineTo(x+side*23,y+10); g.stroke();
  }
  function build() {
    if (cache) return cache;
    const back = O.layer(W,H,g=>{
      g.fillStyle='#d3cebc'; g.fillRect(0,0,W,H);
      g.strokeStyle='rgba(69,76,63,.27)'; g.lineWidth=.45;
      for(let x=3;x<W;x+=10){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}
      for(let y=4;y<H;y+=10){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}

      const rr=O.rng(7202);
      const scattered=[[10,31,8],[42,14,10],[71,38,9],[192,16,12],[242,40,9],[22,145,11],[53,132,8],[211,132,12],[249,161,10],[20,179,7],[83,16,6],[187,59,7],[67,105,10],[195,101,8],[238,12,6],[8,103,6]];
      scattered.forEach(([x,y,r],i)=>dot(g,x+(rr()-.5)*3,y+(rr()-.5)*4,r,C[i%5]));
      [[100,47],[130,35],[160,47],[174,73],[159,100],[101,99],[86,73]].forEach(([x,y],i)=>dot(g,x,y,10.5,C[(i+2)%5]));

      g.fillStyle='rgba(250,245,219,.65)'; g.beginPath();g.arc(130,70,13,0,TAU);g.fill();
      g.strokeStyle='rgba(255,250,226,.65)';g.lineWidth=1;g.setLineDash([1,2.5]);g.stroke();g.setLineDash([]);
      friend(g,29,66,C[1],1);friend(g,224,74,C[2],-1);friend(g,57,63,C[3],1);

      g.strokeStyle='#606856';g.lineWidth=.7;g.beginPath();g.moveTo(0,6);g.quadraticCurveTo(130,37,260,3);g.stroke();
      [14,37,64,91,119,148,178,207,236].forEach((x,i)=>dot(g,x,6+12*Math.sin(x/W*Math.PI),2.3,C[i%5]));
      g.fillStyle='rgba(55,46,25,.085)';
      for(let i=0;i<15000;i++)g.fillRect(rr()*W,rr()*H,.15+rr()*.25,.15+rr()*.4);
    });
    const front=O.layer(W,H,()=>{}),blur=O.canvas(W*2,H*2),g=blur.getContext('2d');g.filter='blur(12px)';g.drawImage(back,0,0,blur.width,blur.height);
    return cache={back,front,blur};
  }
  function liveBack(g,t){g.save();dot(g,11+.8*Math.sin(t*.6),119+.6*Math.cos(t*.7),6,C[3]);dot(g,244+.6*Math.cos(t*.5),112+.7*Math.sin(t*.6),7,C[0]);g.restore();}
  window.DeskScenes=Object.assign(window.DeskScenes||{},{s2:{W,H,build,liveBack,liveFront(){},style:'dots',light:{key:[.95,.9,.75],keyDir:[-1,-1],fill:[.58,.65,.5],rim:[1,.75,.6]}}});
})();
