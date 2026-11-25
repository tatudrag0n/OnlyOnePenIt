const $ = id => document.getElementById(id);
const canvas = $('paper'), ctx = canvas.getContext('2d', { willReadFrequently: true });
const debrisCanvas = $('crumbLayer'), debrisCtx = debrisCanvas.getContext('2d');
const STORAGE = 'onlyonepenit-v2';
const initial = () => ({ money:1000, paper:100, crumbs:0, tool:'pencil', color:'#424841', size:3, opacity:75, particles:[], residue:0, owned:{pencil:true,mech:true,eraser:true,ruler:true,hand:true,coloredPencil:false,ballpoint:false,brush:false}, condition:{pencil:100,mech:100,eraser:100,coloredPencil:100,ballpoint:100,brush:100}, clear:false });
let state = initial();
let loadingImage=false;
try { const saved = JSON.parse(localStorage.getItem(STORAGE)); if(saved?.state) state = {...initial(), ...saved.state, owned:{...initial().owned,...saved.state.owned}, condition:{...initial().condition,...saved.state.condition}}; if(saved?.image){ loadingImage=true; const img = new Image(); img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);loadingImage=false;}; img.onerror=()=>{loadingImage=false;message('保存された画像を読み込めませんでした。');}; img.src=saved.image; } } catch(e){ console.warn('保存データを読み込めませんでした',e); }
const tools = {
 pencil:{name:'鉛筆',sub:'PENCIL · HB',icon:'✎',hint:'鉛筆らしい、やさしい黒。',label:'鉛筆の残り',note:'使うほど少しずつ短くなります。'},
 mech:{name:'シャーペン',sub:'MECHANICAL PENCIL',icon:'╱',hint:'細く、繊細な線を描きます。',label:'芯の残り',note:'芯がなくなったら補充しよう。'},
 coloredPencil:{name:'色鉛筆',sub:'COLORED PENCIL',icon:'✎',hint:'好きな色を選んで描こう。',label:'色鉛筆の残り',note:'使うほど少しずつ短くなります。'},
 ballpoint:{name:'ボールペン',sub:'BALLPOINT PEN',icon:'✒',hint:'くっきりとした線を描きます。',label:'インクの残り',note:'インクがなくなったら補充しよう。'},
 brush:{name:'絵筆',sub:'PAINT BRUSH',icon:'♢',hint:'重ねるほど色が深まります。',label:'絵の具の残り',note:'絵の具がなくなったら補充しよう。'},
 eraser:{name:'消しゴム',sub:'ERASER',icon:'▰',hint:'描いたところをやさしく消します。',label:'消しゴムの残り',note:'消すと消しカスがたまります。'},
 hand:{name:'手で集める',sub:'SWEEP CRUMBS',icon:'☝',hint:'ドラッグして消しカスを押し寄せよう。',label:'道具の状態',note:'消しカス同士をぶつけるとまとまります。'},
 ruler:{name:'定規',sub:'RULER',icon:'▱',hint:'ドラッグしてまっすぐな線を引こう。',label:'道具の状態',note:'何度でも使えます。'}
};
const palette = ['#424841','#859a7e','#b5c4a5','#d4b977','#d38d80','#91a8b0','#7b83a0','#ffffff'];
// Convert old counter-only saves once so existing progress is not lost.
if (!Array.isArray(state.particles)) state.particles=[];
if (state.crumbs && !state.particles.length) {
 const count=Math.min(100,state.crumbs);
 for(let i=0;i<count;i++) state.particles.push({x:100+Math.random()*590,y:100+Math.random()*900,mass:i===0?state.crumbs-count+1:1,angle:Math.random()*6.28});
}
state.crumbs=0;
let crumbDistance=Number(state.residue)||0;
let history=[], future=[], drawing=false, last=null, start=null, strokeChanged=false, saveTimer, previousFuture=[];
function message(text){$('message').textContent=text;}
function snapshot(){ return {image:ctx.getImageData(0,0,canvas.width,canvas.height), condition:{...state.condition}, particles:state.particles.map(p=>({...p})), crumbDistance}; }
function restore(s){ctx.putImageData(s.image,0,0);state.condition={...s.condition};state.particles=s.particles.map(p=>({...p}));crumbDistance=s.crumbDistance;drawDebris();}
function clearHistory(){history=[];future=[];updateHistory();}
function remember(){previousFuture=future;history.push(snapshot()); if(history.length>15)history.shift(); future=[]; updateHistory();}
function updateHistory(){ $('undo').disabled=!history.length; $('redo').disabled=!future.length; }
function scheduleSave(){ $('saved').textContent='● 保存中'; clearTimeout(saveTimer); saveTimer=setTimeout(save,600); }
function save(){if(loadingImage){scheduleSave();return;}state.residue=crumbDistance;try{localStorage.setItem(STORAGE,JSON.stringify({state,image:canvas.toDataURL()}));$('saved').textContent='● 自動保存';}catch(e){$('saved').textContent='保存できません';message('保存容量がいっぱいです。画像をダウンロードしてください。');}}
function render(){
 if(state.money>=10000)state.electronicsUnlocked=true;
 const t=tools[state.tool] || tools.pencil, val=state.condition[state.tool] ?? 100;
 $('money').textContent=state.money.toLocaleString('ja-JP'); $('modalMoney').textContent='¥ '+state.money.toLocaleString('ja-JP'); $('paperCount').textContent=state.paper; $('crumbCount').textContent=state.particles.reduce((n,p)=>n+p.mass,0)+' 個';
 $('selectedName').textContent=t.name; $('selectedSub').textContent=t.sub; $('selectedIcon').textContent=t.icon; $('colorHint').textContent=t.hint;
 $('conditionLabel').textContent=t.label; $('conditionValue').textContent=Math.ceil(val)+'%'; $('conditionBar').style.width=Math.max(0,val)+'%'; $('conditionHint').textContent=t.note;
 $('canvasHint').classList.toggle('hidden-hint',!!state.started);$('customColor').value=state.color; $('size').value=state.size; $('sizeValue').textContent=state.size+' px'; $('opacity').value=state.opacity; $('opacityValue').textContent=state.opacity+'%';
 $('maintain').textContent=state.tool==='pencil'||state.tool==='coloredPencil'?'✧  道具を削る':state.tool==='eraser'?'✧  消しゴムを交換する':'✧  補充する'; $('maintain').style.display=['ruler','hand'].includes(state.tool)?'none':''; canvas.classList.toggle('sweeping',state.tool==='hand');
 document.querySelectorAll('[data-tool]').forEach(b=>{const key=b.dataset.tool;b.classList.toggle('active',key===state.tool);b.setAttribute('aria-pressed',key===state.tool?'true':'false');const lock=b.querySelector('.lock');if(lock)lock.textContent=state.owned[key]?'✓':'⌑';});
 $('colors').innerHTML=''; palette.forEach(color=>{const b=document.createElement('button');b.className='swatch'+(state.color===color?' active':'');b.style.background=color;b.title=color;b.setAttribute('aria-label','色 '+color);b.setAttribute('aria-pressed',state.color===color?'true':'false');b.onclick=()=>{state.color=color;render();scheduleSave()};$('colors').append(b)}); updateHistory();
}
function selectTool(key){if(!state.owned[key]){message('この道具は文房具屋さんで購入できます。');openShop();return;}state.tool=key;message(tools[key].name+'を選びました。');render();scheduleSave();}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
$('customColor').oninput=e=>{state.color=e.target.value;render();scheduleSave()};
$('size').oninput=e=>{state.size=+e.target.value;$('sizeValue').textContent=state.size+' px';scheduleSave()};
$('opacity').oninput=e=>{state.opacity=+e.target.value;$('opacityValue').textContent=state.opacity+'%';scheduleSave()};
function position(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,pressure:e.pointerType==='pen' && e.pressure?e.pressure:0.5};}
// Count actual pigment under the eraser, rather than rewarding movement over blank paper.
function pigmentUnder(a,b,radius){
 const left=Math.max(0,Math.floor(Math.min(a.x,b.x)-radius)), top=Math.max(0,Math.floor(Math.min(a.y,b.y)-radius));
 const right=Math.min(canvas.width,Math.ceil(Math.max(a.x,b.x)+radius)), bottom=Math.min(canvas.height,Math.ceil(Math.max(a.y,b.y)+radius));
 if(right<=left||bottom<=top)return 0;
 const w=right-left,h=bottom-top,data=ctx.getImageData(left,top,w,h).data;
 const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;let pigment=0;
 // Sampling every other pixel keeps large, fast pointer movements responsive.
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
  const px=left+x,py=top+y,t=length2?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/length2)):0;
  if((px-a.x-t*dx)**2+(py-a.y-t*dy)**2<=radius*radius) pigment+=data[(y*w+x)*4+3]/255*4;
 }
 return pigment;
}
function line(a,b){
 const tool=state.tool; const dist=Math.hypot(b.x-a.x,b.y-a.y); if((state.condition[tool]??100)<=0){message('道具がなくなりました。右のボタンから補充してね。');return;}
 let width=state.size*(b.pressure*0.7+0.65); if(tool==='mech')width*=0.65;if(tool==='brush')width*=2.5;if(tool==='eraser')width*=5;
 const pigment=tool==='eraser'?pigmentUnder(a,b,width/2):0;
 if(tool==='eraser' && pigment<0.01)return;
 // Pens lay down a smooth line; graphite is deposited as many irregular grains.
 if(tool==='pencil'||tool==='coloredPencil'){
  const steps=Math.max(1,Math.ceil(dist/1.5)), alpha=state.opacity/100;
  ctx.save();ctx.fillStyle=state.color;
  for(let i=0;i<=steps;i++){
   const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   const pressure=a.pressure+(b.pressure-a.pressure)*t;
   const spread=Math.max(.6,state.size*(pressure*.7+.65)*.52);
   for(let grain=0;grain<5;grain++){
    const angle=Math.random()*Math.PI*2,offset=Math.sqrt(Math.random())*spread;
    ctx.globalAlpha=alpha*(.09+Math.random()*.18)*(0.5+pressure);
    ctx.beginPath();ctx.arc(x+Math.cos(angle)*offset,y+Math.sin(angle)*offset,.35+Math.random()*.55,0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();
 }else{
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x+0.01,b.y+0.01);
  ctx.lineWidth=width;ctx.strokeStyle=state.color;ctx.globalAlpha=state.opacity/100;
  if(tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=0.85;}
  if(tool==='brush')ctx.globalAlpha*=0.45;
  ctx.stroke();ctx.restore();
  if(tool==='brush' && dist>0){
   // Fine bristles overlap translucent paint along the direction of travel.
   const nx=-(b.y-a.y)/dist,ny=(b.x-a.x)/dist;
   ctx.save();ctx.strokeStyle=state.color;ctx.lineCap='round';ctx.lineWidth=Math.max(.5,width*.08);ctx.globalAlpha=state.opacity/100*.18;
   for(let i=-2;i<=2;i++){const offset=width*i*.15;ctx.beginPath();ctx.moveTo(a.x+nx*offset,a.y+ny*offset);ctx.lineTo(b.x+nx*offset,b.y+ny*offset);ctx.stroke();}ctx.restore();
  }
 }
 strokeChanged=true;
 if(tool!=='ruler' && tool!=='hand') state.condition[tool]=Math.max(0,state.condition[tool]-Math.max(dist,1)*0.002);
 if(tool==='eraser'){crumbDistance+=pigment;while(crumbDistance>=45){addCrumb(b,width);crumbDistance-=45;}drawDebris();}
}
// A separate layer keeps shavings out of the artwork and the exported image.
function radius(p){return Math.min(28,5+Math.sqrt(p.mass)*2.4);}
function addCrumb(at,width){
 if(state.particles.length>=350){ // Keep a bounded simulation, preserving all earned material.
  const nearest=state.particles.reduce((best,p)=>Math.hypot(p.x-at.x,p.y-at.y)<Math.hypot(best.x-at.x,best.y-at.y)?p:best);
  nearest.mass++;return;
 }
 state.particles.push({x:Math.max(3,Math.min(canvas.width-3,at.x+(Math.random()-.5)*width*1.5)),y:Math.max(3,Math.min(canvas.height-3,at.y+(Math.random()-.5)*width*1.5)),mass:1,angle:Math.random()*Math.PI*2,seed:Math.random()*100000|0});
}
// Stable procedural strips: tapered, uneven edges and a slight curl, not round dots.
// The seed is stored with each shaving so redraws and reloads do not change its shape.
function randomFor(seed){let n=(seed|0) || 1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};}
function drawDebris(){
 debrisCtx.clearRect(0,0,canvas.width,canvas.height);
 for(const p of state.particles){
  if(p.seed===undefined)p.seed=(Math.abs(Math.floor(p.x*137+p.y*313))||1);
  const rand=randomFor(p.seed), count=Math.min(p.mass,12), pileRadius=Math.max(0,radius(p)-7);
  debrisCtx.save();debrisCtx.translate(p.x,p.y);debrisCtx.rotate(p.angle||0);
  for(let piece=0;piece<count;piece++){
   const angle=rand()*Math.PI*2, distance=piece===0?0:Math.sqrt(rand())*pileRadius;
   const length=9+rand()*10, thickness=1.5+rand()*2.2, bend=(rand()-.5)*6;
   const offsetX=Math.cos(angle)*distance,offsetY=Math.sin(angle)*distance;
   const turn=rand()*Math.PI*2;
   const edge=[];
   for(let i=0;i<=8;i++){
    const t=i/8, x=(t-.5)*length, y=Math.sin(t*Math.PI)*bend+(rand()-.5)*.8;
    const half=thickness*(.25+.75*Math.sin(Math.PI*t))*(.75+rand()*.35);
    edge.push({x,y,half});
   }
   debrisCtx.save();debrisCtx.translate(offsetX,offsetY);debrisCtx.rotate(turn);
   debrisCtx.shadowColor='rgba(62,53,43,.28)';debrisCtx.shadowBlur=2;debrisCtx.shadowOffsetY=1.5;
   debrisCtx.fillStyle=piece%3===0?'#c8bfb2':piece%3===1?'#ddd4c8':'#e8e0d6';
   debrisCtx.strokeStyle='#aaa092';debrisCtx.lineWidth=.55;
   debrisCtx.beginPath();debrisCtx.moveTo(edge[0].x,edge[0].y-edge[0].half);
   for(const v of edge)debrisCtx.lineTo(v.x,v.y-v.half);
   for(let i=edge.length-1;i>=0;i--)debrisCtx.lineTo(edge[i].x,edge[i].y+edge[i].half);
   debrisCtx.closePath();debrisCtx.fill();debrisCtx.stroke();
   debrisCtx.shadowColor='transparent';debrisCtx.strokeStyle='rgba(100,93,84,.32)';debrisCtx.lineWidth=.5;
   debrisCtx.beginPath();debrisCtx.moveTo(edge[2].x,edge[2].y);for(let i=3;i<7;i++)debrisCtx.lineTo(edge[i].x,edge[i].y);debrisCtx.stroke();
   debrisCtx.restore();
  }
  debrisCtx.restore();
 }
}
function sweep(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(dist/10));let moved=false;
 for(let step=1;step<=steps;step++){
  const x=a.x+dx*step/steps,y=a.y+dy*step/steps, sx=dx/steps,sy=dy/steps;
  // The leading edge of the hand pushes shavings ahead, rather than moving
  // everything in its radius by the same amount. This lets them gather.
  if(dist>0){
   const ux=dx/dist,uy=dy/dist;
   for(const p of state.particles){
    const rx=p.x-x,ry=p.y-y,along=rx*ux+ry*uy,side=rx*(-uy)+ry*ux,reach=25+radius(p);
    if(along>=-radius(p) && Math.abs(side)<reach){
     const front=Math.sqrt(reach*reach-side*side);
     if(along<front){const push=front-along;p.x=Math.max(radius(p),Math.min(canvas.width-radius(p),p.x+ux*push));p.y=Math.max(radius(p),Math.min(canvas.height-radius(p),p.y+uy*push));p.angle+=push*.015;moved=true;}
    }
   }
  }
  // Only contact during sweeping combines particles; mass and value are conserved.
  for(let i=0;i<state.particles.length;i++)for(let j=i+1;j<state.particles.length;j++){
   const p=state.particles[i],q=state.particles[j];
   if(Math.abs(p.x-x)>80 || Math.abs(p.y-y)>80) break;
   if(Math.hypot(p.x-q.x,p.y-q.y)<(radius(p)+radius(q))*.8 && (Math.hypot(p.x-x,p.y-y)<50 || Math.hypot(q.x-x,q.y-y)<50)){
    const total=p.mass+q.mass;p.x=(p.x*p.mass+q.x*q.mass)/total;p.y=(p.y*p.mass+q.y*q.mass)/total;p.mass=total;state.particles.splice(j,1);j--;moved=true;
   }
  }
 }
 if(moved){strokeChanged=true;drawDebris();}
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(loadingImage){message('保存した絵を読み込んでいます。');return;}if((state.condition[state.tool]??100)<=0){message('道具がなくなりました。補充してね。');return;}e.preventDefault();state.started=true;$('canvasHint').classList.add('hidden-hint');canvas.setPointerCapture(e.pointerId);drawing=true;start=last=position(e);strokeChanged=false;remember();if(state.tool!=='ruler' && state.tool!=='hand')line(last,last);});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const events=e.getCoalescedEvents?.() || [e];for(const event of (events.length?events:[e])){const p=position(event);if(state.tool==='hand')sweep(last,p);else if(state.tool==='ruler'){drawDebris();debrisCtx.save();debrisCtx.globalAlpha=state.opacity/100;debrisCtx.strokeStyle=state.color;debrisCtx.lineWidth=state.size;debrisCtx.lineCap='round';debrisCtx.beginPath();debrisCtx.moveTo(start.x,start.y);debrisCtx.lineTo(p.x,p.y);debrisCtx.stroke();debrisCtx.restore();}else line(last,p);last=p;}});
function finish(e){if(!drawing)return;drawing=false;const p=position(e);if(state.tool==='ruler'){line(start,p);drawDebris();}else if(Math.hypot(p.x-last.x,p.y-last.y)>0.1){if(state.tool==='hand')sweep(last,p);else line(last,p);}if(!strokeChanged){history.pop();future=previousFuture;}render();scheduleSave();}
canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
$('undo').onclick=()=>{if(!history.length)return;future.push(snapshot());restore(history.pop());message('ひとつ前に戻しました。');render();scheduleSave()};
$('redo').onclick=()=>{if(!future.length)return;history.push(snapshot());restore(future.pop());message('やり直しました。');render();scheduleSave()};
$('download').onclick=()=>{if(loadingImage){message('保存した絵を読み込んでいます。');return;}const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);const link=document.createElement('a');link.download='onlyonepenit.png';link.href=out.toDataURL('image/png');link.click();message('作品を画像として保存しました。');};
function newPaper(){if(loadingImage){message('保存した絵を読み込んでいます。');return;}if(state.paper<=0){message('紙がありません。文房具屋さんで購入してね。');return;}if(!confirm('新しい紙に取り替えますか？今の絵は消えます。'))return;clearHistory();ctx.clearRect(0,0,canvas.width,canvas.height);state.particles=[];crumbDistance=0;drawDebris();state.paper--;message('新しい紙に取り替えました。');render();scheduleSave();}
$('newPaper').onclick=newPaper;$('newPaperSide').onclick=newPaper;
$('trash').onclick=()=>{
 const piles=state.particles.filter(p=>p.mass>=2);
 if(!piles.length){message(state.particles.length?'「手で集める」で消しカスをひとまとめにしてね。':'消しカスはまだありません。');return;}
 const count=piles.reduce((n,p)=>n+p.mass,0),gain=count*10;clearHistory();state.money+=gain;state.particles=state.particles.filter(p=>p.mass<2);drawDebris();message('まとまった消しカスを捨てて ¥'+gain+' をゲット！');render();scheduleSave();
};
$('maintain').onclick=()=>{const key=state.tool;if(state.condition[key]>=99){message('まだ十分使えます。');return;}const cost=key==='eraser'?30:key==='pencil'||key==='coloredPencil'?20:50;if(state.money<cost){message('お金が足りません。');return;}clearHistory();state.money-=cost;state.condition[key]=100;message(tools[key].name+'をお手入れしました（¥'+cost+'）。');render();scheduleSave();};
const shop=[
 {key:'coloredPencil',name:'色鉛筆',desc:'ざらっと優しい色を、重ねて楽しもう。',price:100,icon:'✎',category:'draw',badge:'人気の道具',once:true},
 {key:'ballpoint',name:'ボールペン',desc:'なめらかで、くっきりした線に。',price:100,icon:'✒',category:'draw',badge:'すっきり',once:true},
 {key:'brush',name:'絵筆',desc:'半透明の絵の具を、のびのび重ねて。',price:100,icon:'♢',category:'draw',badge:'色あそび',once:true},
 {key:'paper',name:'画用紙 100枚',desc:'まっさらな紙を、たっぷりストック。',price:100,icon:'▤',category:'supply',badge:'100 SHEETS'},
 {key:'pencil',name:'鉛筆のお手入れ',desc:'使い込んだ鉛筆を、また使いやすく。',price:20,icon:'✎',category:'supply',badge:'お手入れ',service:true},
 {key:'eraser',name:'消しゴム交換',desc:'小さくなった消しゴムを新しく。',price:30,icon:'▰',category:'supply',badge:'お手入れ',service:true},
 {key:'tablet',name:'液晶ペンタブレット',desc:'いつか手にしたい、夢の道具。',price:100000,icon:'▣',category:'dream',badge:'あこがれ',once:true}
];
let basket={}, category='all';
function tabletUnlocked(){if(state.money>=10000)state.electronicsUnlocked=true;return !!state.electronicsUnlocked||state.clear;}
function itemOwned(item){return item.key==='tablet'?!!state.clear:!!(item.once&&state.owned[item.key]);}
function itemBlocked(item){if(itemOwned(item))return '購入済み';if(item.key==='tablet'&&!tabletUnlocked())return 'まだ準備中';if(item.service&&state.condition[item.key]>=99)return '状態良好';return '';}
function basketSum(){return shop.reduce((total,item)=>total+(basket[item.key]||0)*item.price,0);}
function openShop(){tabletUnlocked();category='all';$('shopMessage').textContent='気になるものをかごに入れてね。';renderShop();$('modal').classList.remove('hidden');$('modalClose').focus();scheduleSave();}
function renderShop(){
 tabletUnlocked();
 $('modalMoney').textContent='¥ '+state.money.toLocaleString('ja-JP');
 document.querySelectorAll('[data-category]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.category===category);btn.setAttribute('aria-pressed',btn.dataset.category===category?'true':'false')});
 const items=shop.filter(item=>category==='all'||item.category===category);
 $('shelfCount').textContent=items.length+' ITEMS';$('shopItems').innerHTML='';
 items.forEach(item=>{
  const el=document.createElement('div');el.className='shop-item';el.dataset.key=item.key;
  const blocked=itemBlocked(item), inBasket=basket[item.key]||0, max=(item.once||item.service)?1:20;
  const buttonText=blocked||((inBasket>=max)?'かごに追加済':'＋ かごへ');
  el.innerHTML=`<div class="shop-art"><span class="product-badge">${item.badge}</span><span class="shop-icon" aria-hidden="true">${item.icon}</span></div><div class="shop-item-body"><strong>${item.name}</strong><small>${item.desc}</small><div class="shop-item-bottom"><span class="shop-price">¥ ${item.price.toLocaleString('ja-JP')}</span><button class="wish-toggle ${state.wish===item.key?'selected':''}" aria-label="${item.name}を${state.wish===item.key?'ほしいものから外す':'ほしいものにする'}" aria-pressed="${state.wish===item.key}">${state.wish===item.key?'♥':'♡'}</button><button class="add-cart" ${blocked||inBasket>=max?'disabled':''}>${buttonText}</button></div></div>`;
  el.querySelector('.wish-toggle').onclick=()=>{state.wish=state.wish===item.key?null:item.key;$('shopMessage').textContent=state.wish?item.name+'をほしいものに登録しました。':'ほしいものを解除しました。';renderShop();scheduleSave();};
  el.querySelector('.add-cart').onclick=()=>{basket[item.key]=(basket[item.key]||0)+1;$('shopMessage').textContent=item.name+'をかごに入れました。';renderShop();};$('shopItems').append(el);
 });
 const selected=shop.filter(item=>basket[item.key]>0);$('basketCount').textContent=Object.values(basket).reduce((a,b)=>a+b,0);$('jumpCount').textContent=$('basketCount').textContent+' 点';$('basketItems').innerHTML='';
 if(!selected.length){$('basketItems').innerHTML='<div class="basket-empty">かごはまだ空っぽ。<br>お気に入りを見つけよう。 ✳</div>';}
 selected.forEach(item=>{const row=document.createElement('div');row.className='basket-row';row.innerHTML=`<div class="basket-row-top"><strong>${item.name}</strong><span>¥ ${(item.price*basket[item.key]).toLocaleString('ja-JP')}</span></div><div class="basket-row-bottom"><span>¥ ${item.price.toLocaleString('ja-JP')} / 点</span><div class="quantity"><button aria-label="${item.name}を減らす">−</button><span>${basket[item.key]}</span><button aria-label="${item.name}を増やす" ${(item.once||item.service||basket[item.key]>=20)?'disabled':''}>＋</button></div></div>`;
  const buttons=row.querySelectorAll('button');buttons[0].onclick=()=>{if(--basket[item.key]===0)delete basket[item.key];renderShop();};buttons[1].onclick=()=>{basket[item.key]++;renderShop();};$('basketItems').append(row);
 });
 const total=basketSum();$('basketTotal').textContent='¥ '+total.toLocaleString('ja-JP');$('checkout').disabled=!selected.length;
 const wish=shop.find(item=>item.key===state.wish), panel=$('wishPanel');
 if(!wish){panel.innerHTML='<span class="eyebrow">SOMEDAY, MAYBE</span><h4>ほしいものリスト ♡</h4><p>商品の ♡ を押して、次のお買いものの目標に。</p>';}
 else {const locked=wish.key==='tablet'&&!tabletUnlocked();const target=locked?10000:wish.price;const pct=Math.min(100,state.money/target*100);const left=Math.max(0,target-state.money);panel.innerHTML=`<span class="eyebrow">SOMEDAY, MAYBE</span><h4>♡ ${wish.name}</h4><p>${itemOwned(wish)?'もう持っているお気に入り。':locked?'所持金 ¥10,000 でお店に登場。':'次のお買いものの目標に。'}</p><div class="wish-progress"><i style="width:${pct}%"></i></div><strong>${itemOwned(wish)?'購入済み':left?'あと ¥ '+left.toLocaleString('ja-JP'):'お金がたまりました！'}</strong>`;}
}
$('viewBasket').onclick=()=>document.querySelector('.shop-side').scrollIntoView({behavior:'smooth',block:'start'});
document.querySelectorAll('[data-category]').forEach(btn=>btn.onclick=()=>{category=btn.dataset.category;renderShop();});
$('checkout').onclick=()=>{
 const selected=shop.filter(item=>basket[item.key]>0),total=basketSum();
 if(!selected.length)return;
 if(selected.some(item=>itemBlocked(item))){$('shopMessage').textContent='購入できない商品がかごにあります。取り除いてね。';renderShop();return;}
 if(state.money<total){$('shopMessage').textContent='あと ¥'+(total-state.money).toLocaleString('ja-JP')+' 足りません。かごを調整してね。';return;}
 clearHistory();state.money-=total;
 for(const item of selected){const n=basket[item.key];if(item.key==='paper')state.paper+=100*n;else if(item.key==='tablet')state.clear=true;else if(item.service)state.condition[item.key]=100;else state.owned[item.key]=true;}
 const names=selected.map(item=>item.name+(basket[item.key]>1?' ×'+basket[item.key]:'')).join('、');basket={};
 $('shopMessage').textContent='お買い上げありがとう！ '+names+' をお渡ししました。';message(state.clear&&selected.some(item=>item.key==='tablet')?'ゲームクリア！液晶ペンタブレットを手に入れました！':names+'を購入しました。');render();renderShop();scheduleSave();
};
$('help').onclick=()=>{$('helpModal').classList.remove('hidden');$('helpClose').focus();};
function closeHelp(){$('helpModal').classList.add('hidden');$('help').focus();}
$('helpClose').onclick=closeHelp;$('helpStart').onclick=closeHelp;$('helpModal').onclick=e=>{if(e.target===$('helpModal'))closeHelp();};
window.addEventListener('pagehide',()=>{if(!loadingImage){clearTimeout(saveTimer);save();}});
$('btnStore').onclick=openShop;$('btnStoreSmall').onclick=openShop;$('modalClose').onclick=()=>$('modal').classList.add('hidden');$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')};document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('helpModal').classList.contains('hidden'))closeHelp();$('modal').classList.add('hidden');}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}});
render();drawDebris();
