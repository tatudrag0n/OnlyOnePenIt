// canvas.js
export let canvas, ctx;
export function initCanvas(w,h){
  canvas = document.getElementById('paper');
  canvas.width = w; canvas.height = h;
  ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,w,h);
}

export function resizeCanvas(w,h){
  // preserve? new paper clears
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,w,h);
}

export function clearCanvas(){
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

export function drawPencilStroke(points, color, width, opacity){
  if(points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

export function eraseRect(x,y,w,h){
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(x,y,w,h);
  ctx.restore();
}

export function eraseCircle(x,y,r){
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// correction tape: white-ish rectangle with outline
export function correctionTapeRect(x,y,w,h){
  ctx.save();
  ctx.fillStyle = 'rgba(245,240,230,0.95)';
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = 'rgba(200,195,185,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x,y,w,h);
  ctx.restore();
}
// correction fluid: beige smudge
export function correctionFluidBlob(x,y,r){
  ctx.save();
  ctx.fillStyle = 'rgba(240,232,210,0.9)';
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

export function drawLine(x1,y1,x2,y2,color,width){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}

export function drawCircle(cx,cy,r,color,width){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

export function getCanvas(){ return canvas; }
export function getCtx(){ return ctx; }
