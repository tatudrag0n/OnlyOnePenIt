// main.js
import { state, newPaper, PAPER_SIZES } from './state.js';
import * as C from './canvas.js';
import { inventorySummary, hasItem, consumeItem, addItem } from './inventory.js';

let currentStroke = null;
let isDrawing = false;
let crumbs = state.crumbs;
let crumbCounter = 0;

function $(id){ return document.getElementById(id); }
function setMessage(msg){ const el=$('message'); if(el){ el.textContent = msg; } }

function paperEl(){ return document.getElementById('paper'); }

function updateTopbar(){
  $('money').textContent = state.money;
  $('paperSize').textContent = state.paper.size;
  $('paperCount').textContent = state.paper.count;
  $('btnElectronics').style.display = state.electronicsUnlocked ? 'inline-block' : 'none';
}

function colorOf(name){ const m={red:'#e53935',blue:'#1e88e5',yellow:'#fdd835',green:'#43a047',orange:'#fb8c00',pink:'#ec407a',white:'#ffffff',gold:'#ffd700',silver:'#c0c0c0'}; return m[name]||'#222'; }
function colorOfBp(name){ const m={red:'#d32f2f',blue:'#1976d2',orange:'#f57c00',green:'#388e3c',black:'#212121'}; return m[name]||'#212121'; }
function colorOfPaint(name){ const m={red:'#e53935',blue:'#1e88e5',yellow:'#fdd835',white:'#ffffff'}; return m[name]||'#222'; }

function stockForTool(kind){
  if(kind==='pencil') return state.inventory.pencil.HB>0 || state.inventory.pencil.H>0 || state.inventory.pencil.B>0 || state.inventory.pencil['2B']>0;
  if(kind==='mech') return state.inventory.mech>0;
  if(kind==='eraserNormal') return state.inventory.eraser.normal>0;
  if(kind==='eraserHard') return state.inventory.eraser.hard>0;
  if(kind==='eraserSuper') return state.inventory.eraser.super>0;
  if(kind==='eraserColor') return state.inventory.eraser.color>0;
  if(kind==='eraserPen') return state.inventory.eraser.pen>0 || state.inventory.unlocked.penEraser;
  if(kind==='eraserElectric') return state.inventory.eraser.electric>0 || state.inventory.unlocked.electricEraser;
  if(kind==='coloredPencil') return Object.values(state.inventory.coloredPencil).some(v=>v>0);
  if(kind==='ballpoint') return Object.values(state.inventory.ballpoint).some(v=>v>0);
  if(kind==='brush') return Object.values(state.inventory.brush).some(v=>v>0);
  if(kind==='ruler') return state.inventory.ruler>0;
  if(kind==='compass') return state.inventory.compass>0;
  if(kind==='correctionTape') return state.inventory.correctionTape>0;
  if(kind==='correctionFluid') return state.inventory.correctionFluid>0;
  return true;
}
function updateToolButtons(){
  document.querySelectorAll('.toolbar button[data-tool]').forEach(btn=>{
    const ok = stockForTool(btn.dataset.tool);
    btn.disabled = !ok;
    btn.title = ok ? '' : '在庫なし（文房具屋で購入）';
    btn.style.opacity = ok ? '1' : '0.4';
  });
}
function updateSidepanel(){
  $('inventory').innerHTML = '<h3>所持品</h3><pre>'+inventorySummary()+'</pre>';
  $('status').innerHTML = '<h3>状態</h3><pre>'+statusText()+'</pre>';
  renderToolOptions();
  updateToolButtons();
}

function statusText(){
  const a = state.active;
  if(!a) return 'ツール未選択';
  if(a.kind==='pencil') return `鉛筆 ${a.hardness}\n長さ ${a.length.toFixed(1)}\n太さ ${a.thickness.toFixed(2)}`;
  if(a.kind==='mech') return `シャーペン ${a.hardness}\n芯残 ${a.leadLength.toFixed(1)}\nリザーブ ${a.reservoir}`;
  if(a.kind==='eraser') return `消しゴム ${a.variant}\n角${a.corner+1}\n残量 ${a.length.toFixed(1)}\n${a.corners[a.corner].black?'■黒消しゴム状態':''}`;
  if(a.kind==='coloredPencil') return `色鉛筆 ${a.color}\n長さ ${a.length.toFixed(1)}`;
  if(a.kind==='ballpoint') return `ボールペン ${a.color}\nインク ${a.ink.toFixed(1)}`;
  if(a.kind==='brush') return `筆 ${a.size}\n絵の具残 ${a.paint.toFixed(1)}`;
  if(a.kind==='correctionTape') return `修正テープ残 ${a.remaining.toFixed(1)}`;
  if(a.kind==='correctionFluid') return `修正液残 ${a.remaining.toFixed(1)}`;
  return a.kind;
}

function renderToolOptions(){
  const el = $('toolOptions');
  const a = state.active;
  if(!a){ el.innerHTML=''; return; }
  let html = '<h3>ツール設定</h3>';
  if(a.kind==='pencil'){
    html += `硬さ: <select id="optHardness">${['H','HB','B','2B'].map(h=>`<option ${h===a.hardness?'selected':''}>${h}</option>`).join('')}</select><br>`;
    html += `<button id="btnSharpen">鉛筆を削る</button>`;
  }
  if(a.kind==='mech'){
    html += `硬さ: <select id="optMechHardness">${['H','HB','B','2B'].map(h=>`<option ${h===a.hardness?'selected':''}>${h}</option>`).join('')}</select><br>`;
    html += `<button id="btnKnock">ノック</button>`;
    html += `<button id="btnRefillLead">芯交換</button>`;
  }
  if(a.kind==='eraser'){
    html += `角: <div class="corner-btns">${a.corners.map((c,i)=>`<button data-corner="${i}" class="${i===a.corner?'active':''}">角${i+1}</button>`).join('')}</div>`;
  }
  if(a.kind==='coloredPencil'){
    html += `色: <select id="optColor">${['red','blue','yellow','green','orange','pink','white','gold','silver'].map(c=>`<option ${c===a.color?'selected':''}>${c}</option>`).join('')}</select>`;
  }
  if(a.kind==='ballpoint'){
    html += `色: <select id="optBpColor">${['red','blue','orange','green','black'].map(c=>`<option ${c===a.color?'selected':''}>${c}</option>`).join('')}</select>`;
  }
  if(a.kind==='brush'){
    html += `サイズ: <select id="optBrushSize">${['thick','thin','flat'].map(s=>`<option ${s===a.size?'selected':''}>${s}</option>`).join('')}</select><br>`;
    html += `絵の具色: <select id="optPaintColor">${['red','blue','yellow','white'].map(c=>`<option ${c===a.paintColor?'selected':''}>${c}</option>`).join('')}</select><br>`;
    html += `<button id="btnDip">絵の具をつける</button>`;
  }
  el.innerHTML = html;

  const h = $('optHardness'); if(h) h.onchange = e=>{ a.hardness=e.target.value; };
  const mh = $('optMechHardness'); if(mh) mh.onchange = e=>{ a.hardness=e.target.value; };
  const sh = $('btnSharpen'); if(sh) sh.onclick = ()=>sharpenPencil();
  const kn = $('btnKnock'); if(kn) kn.onclick = ()=>knockMech();
  const rf = $('btnRefillLead'); if(rf) rf.onclick = ()=>refillMechLead();
  document.querySelectorAll('[data-corner]').forEach(b=> b.onclick = ()=>{ a.corner=+b.dataset.corner; renderToolOptions(); });
  const oc = $('optColor'); if(oc) oc.onchange = e=>{ a.color=e.target.value; };
  const ob = $('optBpColor'); if(ob) ob.onchange = e=>{ a.color=e.target.value; };
  const obs = $('optBrushSize'); if(obs) obs.onchange = e=>{ a.size=e.target.value; };
  const opc = $('optPaintColor'); if(opc) opc.onchange = e=>{ a.paintColor=e.target.value; };
  const bd = $('btnDip'); if(bd) bd.onclick = ()=>dipBrush();
}

function activateTool(kind){
  if(kind==='pencil'){
    let h = ['HB','H','B','2B'].find(x=>state.inventory.pencil[x]>0);
    if(!h){ setMessage('鉛筆がない。文房具屋で買う。'); return; }
    consumeItem('pencil', h);
    state.active = { kind:'pencil', hardness:h, length:100, thickness:0.5, color:'#222' };
    setMessage('鉛筆('+h+')を使用開始 (残り'+state.inventory.pencil[h]+'本)');
  } else if(kind==='mech'){
    if(state.inventory.mech<=0){ setMessage('シャーペンがない。'); return; }
    state.active = { kind:'mech', hardness:'HB', leadLength:5, reservoir: state.inventory.refillLead.HB||0, color:'#222', knockCount:0 };
    setMessage('シャーペンを使用開始');
  } else if(kind.startsWith('eraser')){
    const variant = kind==='eraserNormal'?'normal': kind==='eraserHard'?'hard': kind==='eraserSuper'?'super': kind==='eraserColor'?'color': kind==='eraserPen'?'pen': 'electric';
    if(variant==='pen' && !state.inventory.unlocked.penEraser){ setMessage('ペン型消しゴムは未解放（100円）'); return; }
    if(variant==='electric' && !state.inventory.unlocked.electricEraser){ setMessage('電動消しゴムは未解放（200円）'); return; }
    if(!hasItem('eraser', variant)){ setMessage('消しゴムがない。'); return; }
    consumeItem('eraser', variant);
    const corners = [0,1,2,3].map(()=>({worn:0, black:false, blackProg:0}));
    state.active = { kind:'eraser', variant, corner:0, corners, length:100 };
    setMessage('消しゴム('+variant+')を使用開始');
  } else if(kind==='coloredPencil'){
    const c='red';
    if(!hasItem('coloredPencil', c)){ setMessage('色鉛筆がない。'); return; }
    consumeItem('coloredPencil', c);
    state.active = { kind:'coloredPencil', color:c, length:100, thickness:0.6 };
  } else if(kind==='ballpoint'){
    const c='black';
    if(!hasItem('ballpoint', c)){ setMessage('ボールペンがない。'); return; }
    consumeItem('ballpoint', c);
    state.active = { kind:'ballpoint', color:c, ink:100 };
  } else if(kind==='brush'){
    const s='thick';
    if(!hasItem('brush', s)){ setMessage('筆がない。'); return; }
    consumeItem('brush', s);
    state.active = { kind:'brush', size:s, paintColor:'red', paint:0, strokes:0 };
  } else if(kind==='ruler'){
    if(state.inventory.ruler<=0){ setMessage('定規がない。'); return; }
    state.active = { kind:'ruler', start:null };
  } else if(kind==='compass'){
    if(state.inventory.compass<=0){ setMessage('コンパスがない。'); return; }
    state.active = { kind:'compass', center:null };
  } else if(kind==='correctionTape'){
    if(state.inventory.correctionTape<=0){ setMessage('修正テープがない。'); return; }
    consumeItem('correctionTape');
    state.active = { kind:'correctionTape', remaining:100 };
  } else if(kind==='correctionFluid'){
    if(state.inventory.correctionFluid<=0){ setMessage('修正液がない。'); return; }
    consumeItem('correctionFluid');
    state.active = { kind:'correctionFluid', remaining:100 };
  } else if(kind==='crumb'){
    state.active = { kind:'crumb' };
  } else if(kind==='hand'){
    state.active = { kind:'hand' };
  }
  state.currentTool = kind;
  document.querySelectorAll('.toolbar button').forEach(b=> b.classList.toggle('active', b.dataset.tool===kind));
  updateSidepanel();
}

document.querySelectorAll('.toolbar button[data-tool]').forEach(btn=>{
  btn.addEventListener('click', ()=> activateTool(btn.dataset.tool));
});

function sharpenPencil(){
  const a = state.active; if(!a||a.kind!=='pencil') return;
  if(a.length < 5){ setMessage('短すぎて削れない'); return; }
  a.length -= 5;
  a.thickness = 0.5;
  updateSidepanel();
}

function knockMech(){
  const a = state.active; if(!a||a.kind!=='mech') return;
  a.knockCount = (a.knockCount||0)+1;
  if(a.knockCount > 5){
    if(Math.random() < 0.4){
      a.leadLength = 0;
      a.knockCount = 0;
      setMessage('芯が折れた！');
      updateSidepanel(); return;
    }
  }
  if(a.leadLength <= 0){
    if(a.reservoir>0){ a.reservoir--; a.leadLength = 5; }
    else { setMessage('芯がない。交換必要。'); }
  } else {
    a.leadLength = Math.min(10, a.leadLength + 2);
  }
  updateSidepanel();
}

function refillMechLead(){
  const a = state.active; if(!a||a.kind!=='mech') return;
  if(state.inventory.refillLead[a.hardness]<=0){ setMessage('替芯がない。文房具屋へ。'); return; }
  state.inventory.refillLead[a.hardness]--;
  a.reservoir += 20;
  setMessage('芯を交換した');
  updateSidepanel();
}

function dipBrush(){
  const a = state.active; if(!a||a.kind!=='brush') return;
  if(state.inventory.paint[a.paintColor]<=0){ setMessage('絵の具がない。'); return; }
  state.inventory.paint[a.paintColor] = Math.max(0, state.inventory.paint[a.paintColor]-0.1);
  a.paint = 100;
  updateSidepanel();
}

function hardnessAlpha(h){ return h==='H'?0.4: h==='HB'?0.6: h==='B'?0.75: 0.9; }
function hardnessWidthMul(h){ return h==='H'?0.8: h==='HB'?1: h==='B'?1.1: 1.2; }

function pos(e){ const c = paperEl(); const r = c.getBoundingClientRect(); const sx = c.width / r.width; const sy = c.height / r.height; return { x: (e.clientX - r.left)*sx, y: (e.clientY - r.top)*sy }; }

function eraseAt(p){
  const a = state.active;
  const corner = a.corners[a.corner];
  let r = 8;
  if(a.variant==='normal') r = 8 + corner.worn*0.5;
  if(a.variant==='hard') r = 8 + corner.worn*0.3;
  if(a.variant==='super') r = 8 + corner.worn*0.7;
  if(a.variant==='color') r = 8 + corner.worn*0.5;
  if(a.variant==='pen') r = 5;
  if(a.variant==='electric') r = 6;
  C.eraseCircle(p.x,p.y,r);
  if(a.variant!=='pen' && a.variant!=='electric'){
    corner.worn += 0.05;
    if(corner.worn > 20) corner.worn = 20;
    if(!corner.black){
      corner.blackProg += 0.1 + (a.variant==='super'?0.15:0);
      if(corner.blackProg > 10){ corner.black = true; corner.blackProg=0; }
    }
  }
  a.length -= 0.02;
  if(a.length <= 0){ setMessage('消しゴムが使えなくなった'); state.active=null; state.currentTool=null; }
  // break chance
  if((a.variant==='normal'||a.variant==='super') && Math.random() < 0.002){
    a.length /= 2;
    setMessage('消しゴムが折れた！');
  }
  if(corner.black){
    const ctx = C.getCtx();
    ctx.fillStyle='rgba(30,30,30,0.15)';
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
    corner.blackProg -= 0.2;
    if(corner.blackProg <= -10){ corner.black=false; corner.blackProg=0; setMessage('黒消しゴム状態解除'); }
  }
  // generate crumb
  crumbCounter++;
  if(crumbCounter % 8 === 0){
    crumbs.push({ id: 'c'+Date.now()+Math.random(), x: p.x+Math.random()*10-5, y: p.y+Math.random()*10-5, size: 8+Math.random()*6 });
    state.crumbs = crumbs;
    renderCrumbs();
  }
  updateSidepanel();
}

function drawSegment(a, pts){
  if(pts.length<2) return;
  if(a.kind==='pencil'){
    const w = a.thickness * hardnessWidthMul(a.hardness);
    const alpha = hardnessAlpha(a.hardness);
    C.drawPencilStroke(pts, a.color, w, alpha);
  } else if(a.kind==='mech'){
    const w = 0.6 * hardnessWidthMul(a.hardness);
    const alpha = hardnessAlpha(a.hardness);
    C.drawPencilStroke(pts, a.color, w, alpha);
  } else if(a.kind==='coloredPencil'){
    C.drawPencilStroke(pts, colorOf(a.color), a.thickness, 0.85);
  } else if(a.kind==='ballpoint'){
    C.drawPencilStroke(pts, colorOfBp(a.color), 0.8, 0.95);
  } else if(a.kind==='brush'){
    const w = a.size==='thick'?6: a.size==='thin'?2: 4;
    C.drawPencilStroke(pts, colorOfPaint(a.paintColor), w, 0.8);
  }
}

function consumeTool(a, pts){
  const len = pts.length;
  if(a.kind==='pencil'){
    a.length -= len*0.05 * (a.hardness==='2B'?1.5: a.hardness==='B'?1.2:1);
    a.thickness += len*0.002;
    if(a.thickness > 3){ /* too thick */ }
    if(a.length <= 0){ setMessage('鉛筆がなくなった'); state.active=null; state.currentTool=null; }
  } else if(a.kind==='mech'){
    a.leadLength -= len*0.05 * (a.hardness==='2B'?1.5:1);
    if(a.leadLength <= 0){ setMessage('芯がなくなった。ノックして。'); }
  } else if(a.kind==='coloredPencil'){
    a.length -= len*0.05;
    if(a.length<=0){ setMessage('色鉛筆がなくなった'); state.active=null; state.currentTool=null; }
  } else if(a.kind==='ballpoint'){
    a.ink -= len*0.05;
    if(a.ink<=0){ setMessage('インクが切れた'); state.active=null; state.currentTool=null; }
  } else if(a.kind==='brush'){
    a.paint -= len*0.1;
    if(a.paint <= 0){ setMessage('絵の具がなくなった。つけて。'); }
  }
}

paperEl().addEventListener('mousedown', e=>{
  if(!state.active) return;
  const p = pos(e);
  isDrawing = true;
  currentStroke = [p];
  if(state.active.kind==='ruler'){ state.active.start = p; }
  if(state.active.kind==='compass'){
    if(!state.active.center){ state.active.center = p; }
    else {
      const r = Math.hypot(p.x-state.active.center.x, p.y-state.active.center.y);
      C.drawCircle(state.active.center.x, state.active.center.y, r, '#222', 1);
      state.active.center=null; isDrawing=false; currentStroke=null;
    }
  }
  if(state.active.kind==='eraser'){ eraseAt(p); }
});
paperEl().addEventListener('mousemove', e=>{
  if(!isDrawing) return;
  const p = pos(e);
  const a = state.active;
  if(a.kind==='pencil'||a.kind==='mech'||a.kind==='coloredPencil'||a.kind==='ballpoint'||a.kind==='brush'){
    currentStroke.push(p);
    drawSegment(a, currentStroke.slice(-2));
  } else if(a.kind==='eraser'){
    eraseAt(p);
  } else if(a.kind==='correctionTape'){
    C.correctionTapeRect(p.x-20, p.y-10, 40, 20);
    a.remaining -= 0.5;
    if(a.remaining<=0){ setMessage('修正テープがなくなった'); state.active=null; state.currentTool=null; }
  } else if(a.kind==='correctionFluid'){
    C.correctionFluidBlob(p.x,p.y,12);
    a.remaining -= 0.5;
    if(a.remaining<=0){ setMessage('修正液がなくなった'); state.active=null; state.currentTool=null; }
  }
});
paperEl().addEventListener('mouseup', e=>{
  if(!isDrawing) return;
  isDrawing = false;
  const a = state.active;
  const p = pos(e);
  if(currentStroke && currentStroke.length>1 && a && (a.kind==='pencil'||a.kind==='mech'||a.kind==='coloredPencil'||a.kind==='ballpoint'||a.kind==='brush')){
    consumeTool(a, currentStroke);
  }
  if(a && a.kind==='ruler' && a.start){
    C.drawLine(a.start.x,a.start.y,p.x,p.y, a.color||'#222', 1);
    a.start=null;
  }
  currentStroke = null;
  updateSidepanel();
});

function renderCrumbs(){
  const layer = $('crumbsLayer');
  layer.innerHTML = '';
  crumbs.forEach(c=>{
    const d = document.createElement('div');
    d.className='crumb';
    d.style.left = (c.x- c.size/2) + 'px';
    d.style.top = (c.y - c.size/2) + 'px';
    d.style.width = c.size+'px';
    d.style.height = c.size+'px';
    makeDraggable(d, c);
    layer.appendChild(d);
  });
}
function makeDraggable(el, c){
  let dragging=false, ox=0, oy=0;
  el.addEventListener('mousedown', e=>{ dragging=true; ox=e.clientX-c.x; oy=e.clientY-c.y; e.stopPropagation(); });
  window.addEventListener('mousemove', e=>{
    if(!dragging) return;
    c.x = e.clientX - ox; c.y = e.clientY - oy;
    el.style.left = (c.x - c.size/2)+'px';
    el.style.top = (c.y - c.size/2)+'px';
    crumbs.forEach(other=>{
      if(other.id===c.id) return;
      const dist = Math.hypot(other.x-c.x, other.y-c.y);
      if(dist < (c.size+other.size)/2){
        c.size = Math.sqrt(c.size*c.size + other.size*other.size);
        crumbs = crumbs.filter(o=>o.id!==other.id);
        state.crumbs = crumbs;
        renderCrumbs();
      }
    });
  });
  window.addEventListener('mouseup', ()=>{ dragging=false; });
}

$('btnTrash').addEventListener('click', ()=>{
  let gain = 0;
  crumbs.forEach(c=> gain += Math.round(c.size*2));
  crumbs = [];
  state.crumbs = crumbs;
  state.money += gain;
  setMessage('ゴミを捨てて '+gain+' 円獲得');
  renderCrumbs(); updateTopbar();
});

$('btnNewPaper').addEventListener('click', ()=>{
  if(state.paper.count<=0){ setMessage('紙がない。文房具屋へ。'); return; }
  newPaper(state.paper.size);
  C.resizeCanvas(state.paper.width, state.paper.height);
  updateTopbar();
});

function openStore(){
  const body = $('modalBody');
  const items = [];
  const add = (name,key,sub,price)=>items.push([name,key,sub,price]);
  ['H','HB','B','2B'].forEach(h=>add('鉛筆 '+h,'pencil',h,50));
  add('シャーペン','mech',null,100);
  add('普通消しゴム','eraser','normal',30);
  add('かたい消しゴム','eraser','hard',50);
  add('すごい消しゴム','eraser','super',100);
  add('色鉛筆用消しゴム','eraser','color',50);
  add('ペン型消しゴム','eraser','pen',100);
  add('電動消しゴム','eraser','electric',200);
  add('ペン型替えゴム(5)','penRefill',null,100);
  add('電動替えゴム(10)','electricRefill',null,100);
  add('定規','ruler',null,50);
  add('コンパス','compass',null,100);
  ['H','HB','B','2B'].forEach(h=>add('替芯 '+h+'(20)','refillLead',h,100));
  ['red','blue','green','yellow'].forEach(c=>add('色替芯 '+c+'(15)','coloredRefill',c,100));
  ['red','blue','yellow','green','orange','pink','white','gold','silver'].forEach(c=>add('色鉛筆 '+c,'coloredPencil',c,100));
  ['red','blue','orange','green','black'].forEach(c=>add('ボールペン '+c,'ballpoint',c,100));
  ['thick','thin','flat'].forEach(s=>add('筆 '+s,'brush',s,100));
  ['red','blue','yellow','white'].forEach(c=>add('絵の具 '+c,'paint',c,100));
  add('パレット','palette',null,100);
  add('バケツ','bucket',null,100);
  add('修正テープ','correctionTape',null,100);
  add('修正液','correctionFluid',null,200);
  Object.keys(PAPER_SIZES).forEach(s=>add('紙 '+s+' 100枚','paper',s,100));
  add('紙 指定サイズ 100枚','paperCustom',null,2000);

  let html = '<h2>文房具屋</h2><div>';
  items.forEach(([name,key,sub,price])=>{
    html += `<div class="store-item"><span>${name} - ${price}円</span><button data-key="${key}" data-sub="${sub||''}" data-price="${price}">買う</button></div>`;
  });
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll('button[data-key]').forEach(b=>{
    b.onclick = ()=>{
      const key=b.dataset.key, sub=b.dataset.sub, price=+b.dataset.price;
      if(!state.spend(price)){ setMessage('お金が足りない'); return; }
      if(key==='pencil'){ addItem('pencil', sub, 1); }
      else if(key==='mech'){ state.inventory.mech++; }
      else if(key==='eraser'){ 
        addItem('eraser', sub, 1);
        if(sub==='pen') state.inventory.unlocked.penEraser=true;
        if(sub==='electric') state.inventory.unlocked.electricEraser=true;
      }
      else if(key==='penRefill'){ state.inventory.penRefill += 5; }
      else if(key==='electricRefill'){ state.inventory.electricRefill += 10; }
      else if(key==='ruler'){ state.inventory.ruler++; }
      else if(key==='compass'){ state.inventory.compass++; }
      else if(key==='refillLead'){ addItem('refillLead', sub, 20); }
      else if(key==='coloredRefill'){ addItem('coloredRefill', sub, 15); }
      else if(key==='coloredPencil'){ addItem('coloredPencil', sub, 1); }
      else if(key==='ballpoint'){ addItem('ballpoint', sub, 1); }
      else if(key==='brush'){ addItem('brush', sub, 1); }
      else if(key==='paint'){ addItem('paint', sub, 1); }
      else if(key==='palette'){ state.inventory.palette++; state.inventory.unlocked.palette=true; }
      else if(key==='bucket'){ state.inventory.bucket++; state.inventory.unlocked.bucket=true; }
      else if(key==='correctionTape'){ state.inventory.correctionTape++; }
      else if(key==='correctionFluid'){ state.inventory.correctionFluid++; }
      else if(key==='paper'){ state.paper.count += 100; }
      else if(key==='paperCustom'){ state.paper.count += 100; }
      setMessage('購入した');
      updateTopbar(); updateSidepanel();
    };
  });
  $('modal').classList.remove('hidden');
}

$('btnStore').addEventListener('click', openStore);

$('btnElectronics').addEventListener('click', ()=>{
  const body=$('modalBody');
  body.innerHTML='<h2>家電量販店</h2>';
  body.innerHTML += `<div class="store-item"><span>液タブ - 100000円</span><button id="buyTab">買う</button></div>`;
  $('buyTab').onclick = ()=>{
    if(state.money < 100000){ setMessage('お金が足りない'); return; }
    state.spend(100000);
    state.inventory.unlocked.liquidTab = true;
    state.gameClear = true;
    setMessage('ゲームクリア！他のペイントツールへようこそ。');
    updateTopbar();
  };
  $('modal').classList.remove('hidden');
});

setInterval(()=>{ if(state.money>10000 && !state.electronicsUnlocked){ state.electronicsUnlocked=true; updateTopbar(); } }, 1000);

$('modalClose').addEventListener('click', ()=> $('modal').classList.add('hidden'));

C.initCanvas(state.paper.width, state.paper.height);
updateTopbar(); updateSidepanel(); renderCrumbs();
setMessage('準備完了。道具を選んで描き始めてください。');
