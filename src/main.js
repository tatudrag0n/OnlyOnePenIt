// OnlyOnePenIt — spec edition
// Media are tracked per-pixel on a hidden "medium map" canvas so that
// erasers can respect what each medium allows (pencil / colored pencil /
// ballpoint / paint / correction), plus an indent map for mechanical-pencil grooves.
const $ = id => document.getElementById(id);
const paper = $('paper'), ctx = paper.getContext('2d', { willReadFrequently: true });
const overlay = $('overlay'), octx = overlay.getContext('2d');
const crumbC = $('crumbLayer'), cctx = crumbC.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = paper.width; c.height = paper.height; return c; };
let mapC = mk(), indentC = mk(), tapeC = mk();
const mapX = () => mapC.getContext('2d', { willReadFrequently: true });
const MED = { pencil: [255, 0, 0], colored: [0, 200, 0], ball: [0, 0, 255], paint: [255, 200, 0], covered: [255, 0, 255] };
const medName = (r, g, b) => { if (r > 200 && g < 80 && b < 80) return 'pencil'; if (g > 150 && r < 80) return 'colored'; if (b > 200 && r < 80) return 'ball'; if (r > 200 && g > 150 && b < 80) return 'paint'; if (r > 200 && b > 200) return 'covered'; return null; };

const HARD = { H: { dark: 0.34, dullRate: 0.55, useRate: 0.6, col: '#71766f' }, HB: { dark: 0.55, dullRate: 1, useRate: 1, col: '#454a45' }, B: { dark: 0.74, dullRate: 1.5, useRate: 1.45, col: '#2e332e' }, '2B': { dark: 0.9, dullRate: 2.1, useRate: 1.9, col: '#1b1e1b' } };
const CP_COLORS = { '赤': '#e0392e', '青': '#2456c8', '黄': '#e8b400', '緑': '#2e9e4f', '橙': '#f07d18', 'ピンク': '#ef7fb0', '白': '#f4f4f0', '金': '#c9a227', '銀': '#a8adb3' };
const BP_COLORS = { '赤': '#d42a20', '青': '#1d44b8', '橙': '#f07d18', '緑': '#1e8a46', '黒': '#191919' };
const LEAD_COLORS = { '赤': '#e0392e', '青': '#2456c8', '緑': '#2e9e4f', '黄': '#d9a400' };
const PAINTS = { '赤': '#d8382a', '青': '#2456c8', '黄': '#f0b90c', '白': '#f6f6f2' };
const SIZES = { A4: [794, 1123], A5: [559, 794], A6: [397, 559], B4: [971, 1374], B5: [687, 971], B6: [486, 687] };
const ERASERS = {
  normal: { name: '普通の消しゴム', price: 30, str: 0.25, base: 15, wear: 0.00035, breakP: 0.05, blackRate: 1, clump: 1 },
  hard: { name: 'かたい消しゴム', price: 50, str: 0.13, base: 14, wear: 0.00018, breakP: 0.02, blackRate: 1.8, clump: 0.5 },
  super: { name: 'すごい消しゴム', price: 100, str: 0.38, base: 17, wear: 0.0006, breakP: 0.10, blackRate: 0.8, clump: 1.8 },
  color: { name: '色鉛筆用消しゴム', price: 50, str: 0.30, base: 15, wear: 0.00035, breakP: 0.05, blackRate: 0, clump: 1 },
};
const freshCorners = () => [0, 1, 2, 3].map(() => ({ wear: 0, black: 0, on: false, charge: 0 }));
const freshBlock = () => ({ remain: 100, corner: 0, corners: freshCorners() });

const STORAGE = 'onlyonepenit-v3';
const initial = () => ({
  money: 1000, clear: false, tabletUnlocked: false, tool: 'pencil', wish: null,
  paperSize: 'A4', nextSize: 'A4', custom: { w: 210, h: 297, stock: 0 },
  paperStock: { A4: 100, A5: 0, A6: 0, B4: 0, B5: 0, B6: 0 },
  pencil: { hard: 'HB', stock: { H: 0, HB: 1, B: 0, '2B': 0 }, cur: { H: { length: 100, dull: 0 }, HB: { length: 100, dull: 0 }, B: { length: 100, dull: 0 }, '2B': { length: 100, dull: 0 } } },
  mech: { hard: 'HB', colorLead: null, leads: { H: 0, HB: 10, B: 0, '2B': 0 }, colorLeads: { '赤': 0, '青': 0, '緑': 0, '黄': 0 }, loadedKey: 'HB', internal: 60, exposed: 0.6 },
  eraser: { type: 'normal', stock: { normal: 2, hard: 0, super: 0, color: 0 }, cur: { normal: freshBlock(), hard: freshBlock(), super: freshBlock(), color: freshBlock() }, penUnlocked: false, penRefills: 0, penRemain: 100, elecUnlocked: false, elecRefills: 0, elecRemain: 100, battery: 100, batteries: 0 },
  cp: { color: '赤', stock: Object.fromEntries(Object.keys(CP_COLORS).map(k => [k, 0])), cur: Object.fromEntries(Object.keys(CP_COLORS).map(k => [k, { length: 100, dull: 0 }])) },
  bp: { color: '黒', stock: Object.fromEntries(Object.keys(BP_COLORS).map(k => [k, 0])), ink: Object.fromEntries(Object.keys(BP_COLORS).map(k => [k, 100])) },
  brush: { type: '太筆', paint: '赤', stock: { '太筆': 0, '細筆': 0, '平筆': 0 }, paints: { '赤': 0, '青': 0, '黄': 0, '白': 0 }, dip: 0, palette: false, bucket: false, mix: '#7a5aa0', dilute: false },
  corr: { type: 'tape', tapeStock: 0, tapeRemain: 100, fluidStock: 0, fluidRemain: 100 },
  ruler: false, compass: false,
});
let state = initial();
let particles = [];
try { const s = JSON.parse(localStorage.getItem(STORAGE)); if (s && s.state) { state = Object.assign(initial(), s.state); particles = s.particles || []; } } catch (e) { /* fresh start */ }

let undoStack = [], redoStack = [], drawing = false, last = null, anchor = null, strokeDist = 0, erasedAccum = 0, msgLock = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const yen = n => '¥ ' + Math.round(n).toLocaleString('ja-JP');
function message(t) { const el = $('message'); if (el) el.textContent = t; }
function msgOnce(t) { const now = Date.now(); if (now - msgLock > 2500) { msgLock = now; message(t); } }
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE, JSON.stringify({ state, particles, img: paper.toDataURL(), map: mapC.toDataURL(), ind: indentC.toDataURL(), tape: tapeC.toDataURL(), dims: [paper.width, paper.height] })); } catch (e) { /* storage full etc. */ } }, 350); }
function setDims(w, h) { [paper, overlay, crumbC, mapC, indentC, tapeC].forEach(c => { c.width = w; c.height = h; }); }
function loadImages() { try { const s = JSON.parse(localStorage.getItem(STORAGE)); if (!s || !s.img) return; if (s.dims && (s.dims[0] !== paper.width || s.dims[1] !== paper.height)) setDims(s.dims[0], s.dims[1]); const put = (cv, src) => new Promise(res => { if (!src) return res(); const i = new Image(); i.onload = () => { cv.getContext('2d').drawImage(i, 0, 0); res(); }; i.onerror = res; i.src = src; }); Promise.all([put(paper, s.img), put(mapC, s.map), put(indentC, s.ind), put(tapeC, s.tape)]).then(() => drawCrumbs()); } catch (e) { /* ignore */ } }

// ---------- history ----------
function snapshot() { return { img: paper.toDataURL(), map: mapC.toDataURL(), ind: indentC.toDataURL(), tape: tapeC.toDataURL(), dims: [paper.width, paper.height], state: JSON.stringify(state), particles: JSON.stringify(particles) }; }
function restore(s) { if (s.dims[0] !== paper.width || s.dims[1] !== paper.height) setDims(s.dims[0], s.dims[1]); state = Object.assign(initial(), JSON.parse(s.state)); particles = JSON.parse(s.particles); const put = (cv, src) => { const i = new Image(); i.onload = () => { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.getContext('2d').drawImage(i, 0, 0); if (cv === tapeC) { drawCrumbs(); renderAll(); } }; i.src = src; }; put(paper, s.img); put(mapC, s.map); put(indentC, s.ind); put(tapeC, s.tape); save(); }
function pushHistory() { undoStack.push(snapshot()); if (undoStack.length > 30) undoStack.shift(); redoStack = []; syncUndoBtns(); }
function clearHistory() { undoStack = []; redoStack = []; syncUndoBtns(); }
function syncUndoBtns() { const u = $('undo'), r = $('redo'); if (u) u.disabled = !undoStack.length; if (r) r.disabled = !redoStack.length; }

// ---------- shared UI ----------
const TOOLMETA = {
  pencil: { name: '鉛筆', sub: 'PENCIL', icon: '✎' }, mech: { name: 'シャーペン', sub: 'MECHANICAL PENCIL', icon: '╱' },
  coloredPencil: { name: '色鉛筆', sub: 'COLORED PENCIL', icon: '✎' }, ballpoint: { name: 'ボールペン', sub: 'BALLPOINT PEN', icon: '✒' },
  brush: { name: '絵筆', sub: 'PAINT BRUSH', icon: '♢' }, eraser: { name: '消しゴム', sub: 'ERASER', icon: '▰' },
  correction: { name: '修正', sub: 'CORRECTION', icon: '▭' }, ruler: { name: '定規', sub: 'RULER', icon: '▱' },
  compass: { name: 'コンパス', sub: 'COMPASS', icon: '◎' }, hand: { name: '手で集める', sub: 'SWEEP CRUMBS', icon: '☝' },
};
function toolAvailable(t) {
  if (t === 'coloredPencil') return Object.values(state.cp.stock).some(v => v > 0);
  if (t === 'ballpoint') return Object.values(state.bp.stock).some(v => v > 0);
  if (t === 'brush') return Object.values(state.brush.stock).some(v => v > 0);
  if (t === 'correction') return state.corr.tapeStock > 0 || state.corr.fluidStock > 0;
  if (t === 'ruler') return state.ruler;
  if (t === 'compass') return state.compass;
  return true;
}
function bar(label, val) { return `<div class="condition-row"><span>${label}</span><strong>${Math.round(val)}%</strong></div><div class="progress"><i style="width:${clamp(val, 0, 100)}%"></i></div>`; }
function segs(items, cur, attr) { return `<div class="seg-group">${items.map(([v, label, sub, dis]) => `<button class="seg ${v === cur ? 'active' : ''}" data-${attr}="${v}" ${dis ? 'disabled' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`; }

function renderHeader() { $('money').textContent = Math.round(state.money).toLocaleString('ja-JP'); if (state.money > 10000) state.tabletUnlocked = true; $('btnElectronics').style.display = state.tabletUnlocked ? '' : 'none'; const b = document.querySelector('.paper-badge'); if (b) b.textContent = state.paperSize; }
function renderToolbar() { document.querySelectorAll('.tool').forEach(btn => { const t = btn.dataset.tool; btn.classList.toggle('active', state.tool === t); const lock = btn.querySelector('.lock'); if (lock) lock.style.display = toolAvailable(t) ? 'none' : ''; }); paper.classList.toggle('sweeping', state.tool === 'hand'); }
function renderAll() { renderHeader(); renderToolbar(); renderInspector(); drawCrumbs(); }

function renderInspector() {
  const ins = document.querySelector('.inspector'); if (!ins) return;
  const t = state.tool, M = TOOLMETA[t];
  let dyn = '';
  if (t === 'pencil') { const P = state.pencil, cur = P.cur[P.hard], H = HARD[P.hard];
    dyn = `<div class="setting-block"><div class="setting-title"><span>芯の硬さ</span><small>HARDNESS</small></div>${segs(Object.keys(HARD).map(h => [h, h, `在庫 ${P.stock[h]}`, P.stock[h] <= 0]), P.hard, 'hard')}<p class="mini-note">硬いほど薄く長持ち、柔らかいほど濃く消耗が激しい。重ね描きで濃くなる。</p></div>
    <div class="setting-block condition"><div class="setting-title"><span>鉛筆の状態</span><small>CONDITION</small></div>${bar('長さ', cur.length)}${bar('先の丸さ', 100 - cur.dull)}<p class="mini-note">${cur.dull >= 100 ? '先が丸くなりすぎて書けない。削ってね。' : cur.length <= 18 ? '短くなって線がブレやすくなっている。' : '使うほど先が太くなっていく。'}</p><button class="outline-button" id="maintain">✧ 鉛筆を削る（長さ消費）</button></div>`;
  } else if (t === 'mech') { const Mc = state.mech;
    dyn = `<div class="setting-block"><div class="setting-title"><span>芯の種類</span><small>LEAD</small></div>${segs(Object.keys(HARD).map(h => [h, h, `替芯 ${Mc.leads[h]}`, false]), Mc.colorLead ? '' : Mc.hard, 'lead')}<div class="setting-title" style="margin-top:12px"><span>色つき芯</span><small>COLOR LEAD</small></div>${segs(Object.keys(LEAD_COLORS).map(c => [c, c, `替芯 ${Mc.colorLeads[c]}`, false]), Mc.colorLead || '', 'leadcolor')}<p class="mini-note">芯を変えるときは交換が必要（在庫から1本使う）。硬い芯は紙に跡が残りやすい。</p></div>
    <div class="setting-block condition"><div class="setting-title"><span>芯の状態</span><small>CONDITION</small></div>${bar('本体の芯', Mc.internal / 60 * 100)}<div class="condition-row"><span>出ている芯</span><strong>${Mc.exposed.toFixed(1)} mm</strong></div><p class="mini-note">${Mc.exposed < 0.1 ? '芯が出ていない。ノックしてね。' : Mc.exposed > 1 ? '出しすぎると折れやすい。' : 'ノックで芯を出す。本体の芯が尽きたら交換。'}</p><button class="outline-button" id="maintain">✧ ノックする</button><button class="outline-button" id="exchange">芯を交換する</button></div>`;
  } else if (t === 'coloredPencil') { const C = state.cp, cur = C.cur[C.color];
    dyn = `<div class="setting-block"><div class="setting-title"><span>色</span><small>COLOR</small></div>${segs(Object.keys(CP_COLORS).map(c => [c, c, `在庫 ${C.stock[c]}`, C.stock[c] <= 0]), C.color, 'cpcolor')}</div>
    <div class="setting-block condition"><div class="setting-title"><span>色鉛筆の状態</span><small>CONDITION</small></div>${bar('長さ', cur.length)}${bar('先の丸さ', 100 - cur.dull)}<p class="mini-note">消すには色鉛筆用消しゴムが必要。鉛筆と同じく削れる。</p><button class="outline-button" id="maintain">✧ 色鉛筆を削る（長さ消費）</button></div>`;
  } else if (t === 'ballpoint') { const B = state.bp;
    dyn = `<div class="setting-block"><div class="setting-title"><span>色</span><small>COLOR</small></div>${segs(Object.keys(BP_COLORS).map(c => [c, c, `在庫 ${B.stock[c]}`, B.stock[c] <= 0]), B.color, 'bpcolor')}</div>
    <div class="setting-block condition"><div class="setting-title"><span>インク</span><small>INK</small></div>${bar('インクの残り', B.ink[B.color])}<p class="mini-note">消しゴムでは消えない。直すには修正テープ／修正液。インクが切れたら新しい1本に替わる（在庫が必要）。</p></div>`;
  } else if (t === 'brush') { const Br = state.brush;
    dyn = `<div class="setting-block"><div class="setting-title"><span>筆</span><small>BRUSH</small></div>${segs(Object.keys(Br.stock).map(b => [b, b, `在庫 ${Br.stock[b]}`, Br.stock[b] <= 0]), Br.type, 'brushtype')}</div>
    <div class="setting-block"><div class="setting-title"><span>絵の具</span><small>PAINT</small></div>${segs(Object.keys(PAINTS).map(c => [c, c, `残量 ${Math.round(Br.paints[c])}%`, Br.paints[c] <= 0]), Br.paint, 'paintcolor')}${Br.palette ? `<label class="custom-color">混ぜ色（パレット）<input type="color" id="mixColor" value="${Br.mix}"></label>` : '<p class="mini-note">パレットを解放すると色を混ぜられる。</p>'}${Br.bucket ? `<label class="mini-note"><input type="checkbox" id="dilute" ${Br.dilute ? 'checked' : ''}> バケツの水で薄める</label>` : '<p class="mini-note">バケツを解放すると絵の具を薄められる。</p>'}</div>
    <div class="setting-block condition"><div class="setting-title"><span>筆の状態</span><small>CONDITION</small></div>${bar('ついている絵の具', Br.dip)}<p class="mini-note">一定量使うごとに絵の具をつけ直す。絵の具は消すことができない。</p><button class="outline-button" id="maintain">✧ 絵の具をつける</button></div>`;
  } else if (t === 'eraser') { const E = state.eraser;
    if (E.type === 'pen' || E.type === 'elec') { const pen = E.type === 'pen';
      dyn = `<div class="setting-block"><div class="setting-title"><span>種類</span><small>TYPE</small></div>${segs(eraserTypeItems(), E.type, 'erastype')}</div>
      <div class="setting-block condition"><div class="setting-title"><span>状態</span><small>CONDITION</small></div>${bar('替えゴム', pen ? E.penRemain : E.elecRemain)}${pen ? '' : bar('電池', E.battery)}<p class="mini-note">${pen ? '消す範囲が変わらず、黒消しゴム状態にならない。折れやすい。' : '消す範囲が変わらず、黒くならず、折れない。すり減りやすく少しブレる。'}</p></div>`;
    } else { const P = ERASERS[E.type], cur = E.cur[E.type], cn = cur.corners[cur.corner];
      dyn = `<div class="setting-block"><div class="setting-title"><span>種類</span><small>TYPE</small></div>${segs(eraserTypeItems(), E.type, 'erastype')}</div>
      <div class="setting-block"><div class="setting-title"><span>使う角</span><small>CORNER</small></div><div class="corner-grid">${cur.corners.map((c, i) => `<button class="corner-btn ${i === cur.corner ? 'active' : ''}" data-corner="${i}">${['左上', '右上', '左下', '右下'][i]}${c.on ? ' 黒' : ''}</button>`).join('')}</div><p class="mini-note">角は使うほど丸くなり、消す範囲が広がる。黒消しゴム状態は角ごと。</p></div>
      <div class="setting-block condition"><div class="setting-title"><span>消しゴムの状態</span><small>CONDITION</small></div>${bar('残り', cur.remain)}${bar('角の丸さ', cn.wear)}${cn.on ? '<p class="mini-note">この角は黒消しゴム状態。こすり続けると解除される。</p>' : ''}<p class="mini-note">${P.name}（在庫 ${E.stock[E.type]}）。完全に消すには何度かこする必要がある。</p></div>`;
    }
  } else if (t === 'correction') { const C = state.corr;
    dyn = `<div class="setting-block"><div class="setting-title"><span>種類</span><small>TYPE</small></div>${segs([['tape', '修正テープ', `在庫 ${C.tapeStock}`], ['fluid', '修正液', `在庫 ${C.fluidStock}`]], C.type, 'corrtype')}<p class="mini-note">あらゆるものを消せる（覆う）。${C.type === 'tape' ? 'テープの輪郭が少し見え、その上にはボールペン以外で描けない。' : '少しベージュっぽくなる。'}</p></div>
    <div class="setting-block condition"><div class="setting-title"><span>残り</span><small>CONDITION</small></div>${bar(C.type === 'tape' ? 'テープの長さ' : '修正液の容量', C.type === 'tape' ? C.tapeRemain : C.fluidRemain)}</div>`;
  } else if (t === 'ruler') { dyn = `<div class="setting-block"><p class="mini-note">${state.ruler ? 'ドラッグで始点→終点の直線を引く（鉛筆の状態で描く）。大きさは固定で、あまり透明じゃない定規。' : '文房具屋さんで定規を買うと使える。'}</p></div>`;
  } else if (t === 'compass') { dyn = `<div class="setting-block"><p class="mini-note">${state.compass ? '中心からドラッグした距離が半径。鉛筆をセットして使うタイプで、線は鉛筆の状態に依存する。' : '文房具屋さんでコンパスを買うと使える。'}</p></div>`;
  } else if (t === 'hand') { const piles = particles.filter(p => p.size >= 3).length; dyn = `<div class="setting-block"><p class="mini-note">消しカスをドラッグで動かせる。2つを同じ位置でこするとまとまって大きくなる。まとめた消しカスほど、ゴミ箱で高く換金できる（いま大きなまとまり ${piles} 個）。</p></div>`; }
  const stock = state.paperSize === 'カスタム' ? state.custom.stock : state.paperStock[state.paperSize];
  ins.innerHTML = `
    <div class="panel-heading"><div><span class="eyebrow">CURRENT TOOL</span><h2>道具の設定 <span>✦</span></h2></div></div>
    <div class="selected-card"><div class="selected-illustration">${M.icon}</div><div><span class="eyebrow">NOW USING</span><h3>${M.name}</h3><p>${M.sub}</p></div><span class="selected-check">✓</span></div>
    ${dyn}
    <div class="paper-card"><div class="paper-card-icon">▤</div><div><strong>紙のストック</strong><small>${state.paperSize}・残り</small></div><span><b>${stock}</b> 枚</span></div>
    <div class="setting-block"><div class="setting-title"><span>次の紙</span><small>NEXT PAPER</small></div>${segs([...Object.keys(SIZES).map(s => [s, s, `${state.paperStock[s]}枚`]), ['カスタム', '指定', `${state.custom.stock}枚`]], state.nextSize, 'nextsize')}
    ${state.nextSize === 'カスタム' ? `<p class="mini-note">幅 <input id="cw" type="number" value="${state.custom.w}" style="width:56px"> mm × 高さ <input id="ch" type="number" value="${state.custom.h}" style="width:56px"> mm</p>` : ''}</div>
    <button class="new-paper" id="newPaperSide">＋ &nbsp; 新しい紙に取り替える</button>
    <div class="tip"><span>✦</span><p><strong>ちょっとしたヒント</strong><br>消しカスは「手で集める」で寄せて<br>ひとまとめにしてから捨てよう。</p></div>
    <button class="trash-button" id="trash">♧ &nbsp; まとまりをゴミ箱へ <span>${particles.filter(p => p.size >= 3).length} 個</span></button>`;
  bindInspector();
}
function eraserTypeItems() { const E = state.eraser; return [...Object.keys(ERASERS).map(k => [k, ERASERS[k].name.replace('の消しゴム', '').replace('消しゴム', '') || k, `在庫 ${E.stock[k]}`, E.stock[k] <= 0]), ['pen', 'ペン型', E.penUnlocked ? `替 ${E.penRefills}` : '未解放', !E.penUnlocked], ['elec', '電動', E.elecUnlocked ? `替 ${E.elecRefills}` : '未解放', !E.elecUnlocked]]; }

// ---------- inspector binding ----------
function bindInspector() {
  const q = (attr, fn) => document.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => fn(b.dataset[attr])));
  q('hard', v => { state.pencil.hard = v; renderAll(); save(); });
  q('lead', v => exchangeLead(v, null));
  q('leadcolor', v => exchangeLead(null, v));
  q('cpcolor', v => { state.cp.color = v; renderAll(); save(); });
  q('bpcolor', v => { state.bp.color = v; renderAll(); save(); });
  q('brushtype', v => { state.brush.type = v; renderAll(); save(); });
  q('paintcolor', v => { state.brush.paint = v; state.brush.useMix = false; renderAll(); save(); });
  q('erastype', v => { state.eraser.type = v; renderAll(); save(); });
  q('corner', v => { const E = state.eraser; E.cur[E.type].corner = +v; renderAll(); save(); });
  q('corrtype', v => { state.corr.type = v; renderAll(); save(); });
  q('nextsize', v => { state.nextSize = v; renderAll(); save(); });
  const mc = $('mixColor'); if (mc) mc.addEventListener('input', () => { state.brush.mix = mc.value; state.brush.useMix = true; save(); });
  const dl = $('dilute'); if (dl) dl.addEventListener('change', () => { state.brush.dilute = dl.checked; save(); });
  const cw = $('cw'), ch = $('ch'); const upd = () => { if (cw) state.custom.w = clamp(+cw.value || 210, 30, 400); if (ch) state.custom.h = clamp(+ch.value || 297, 30, 400); save(); };
  if (cw) cw.addEventListener('change', upd); if (ch) ch.addEventListener('change', upd);
  const m = $('maintain'); if (m) m.addEventListener('click', maintain);
  const ex = $('exchange'); if (ex) ex.addEventListener('click', () => { const Mc = state.mech; if (Mc.internal > 0) { message('まだ本体に芯が残っている。'); return; } exchangeLead(Mc.colorLead ? null : Mc.hard, Mc.colorLead, true); });
  const np = $('newPaperSide'); if (np) np.addEventListener('click', newPaper);
  const tr = $('trash'); if (tr) tr.addEventListener('click', cashCrumbs);
}
function sharpenCur(cur, stock, key, label) {
  if (stock[key] <= 0) { message(`${label}がない。文房具屋さんで買ってね。`); return; }
  if (cur.length > 12) { cur.length -= 9; cur.dull = 0; message(`${label}を削った。先が鋭くなった（長さ消費）。`); }
  else { stock[key]--; if (stock[key] > 0) { cur.length = 100; cur.dull = 0; message(`短くなりすぎたので、新しい${label}に替えた。`); } else { cur.length = 0; cur.dull = 100; message(`${label}がなくなった。文房具屋さんで買ってね。`); } }
  clearHistory(); renderAll(); save();
}
function maintain() {
  const t = state.tool;
  if (t === 'pencil') sharpenCur(state.pencil.cur[state.pencil.hard], state.pencil.stock, state.pencil.hard, '鉛筆');
  else if (t === 'coloredPencil') sharpenCur(state.cp.cur[state.cp.color], state.cp.stock, state.cp.color, '色鉛筆');
  else if (t === 'mech') { const Mc = state.mech; if (Mc.internal <= 0) { message('本体の芯がない。「芯を交換する」を押してね。'); return; } const take = Math.min(0.5, Mc.internal); Mc.internal -= take; Mc.exposed = clamp(Mc.exposed + take, 0, 1.6); message(`ノックした（出ている芯 ${Mc.exposed.toFixed(1)}mm）。出しすぎると折れやすい。`); renderAll(); save(); }
  else if (t === 'brush') { const Br = state.brush; if (Br.useMix && Br.palette) { if (Object.values(Br.paints).some(v => v < 4)) { message('混ぜるには全色の絵の具が少しずつ必要。'); return; } Object.keys(Br.paints).forEach(k => Br.paints[k] -= 4); } else { if (Br.paints[Br.paint] <= 0) { message('その絵の具がない。文房具屋さんで買ってね。'); return; } Br.paints[Br.paint] = Math.max(0, Br.paints[Br.paint] - 7); } Br.dip = 100; message('筆に絵の具をつけた。'); clearHistory(); renderAll(); save(); }
}
function exchangeLead(hard, color, force) {
  const Mc = state.mech;
  const key = color ? 'C:' + color : hard;
  if (!force && Mc.loadedKey === key && Mc.internal > 0) { Mc.hard = hard || Mc.hard; Mc.colorLead = color; renderAll(); save(); return; }
  if (color) { if (Mc.colorLeads[color] <= 0) { message('その色の替芯がない。文房具屋さんで買ってね。'); return; } Mc.colorLeads[color]--; }
  else { if (Mc.leads[hard] <= 0) { message('その硬さの替芯がない。文房具屋さんで買ってね。'); return; } Mc.leads[hard]--; }
  Mc.loadedKey = key; Mc.colorLead = color; if (hard) Mc.hard = hard; Mc.internal = 60; Mc.exposed = 0.5;
  message('芯を交換した。'); renderAll(); save();
}

// ---------- drawing engine ----------
function pos(e) { const r = paper.getBoundingClientRect(); return { x: (e.clientX - r.left) * paper.width / r.width, y: (e.clientY - r.top) * paper.height / r.height }; }
function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function stroke(col, w, al, a, b) { ctx.strokeStyle = col; ctx.globalAlpha = al; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + 0.01, b.y + 0.01); ctx.stroke(); ctx.globalAlpha = 1; }
function mapSeg(med, w, a, b) { const c = MED[med], x = mapX(); x.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`; x.globalAlpha = 1; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x + 0.01, b.y + 0.01); x.stroke(); }
function tapeAt(x, y) { try { return tapeC.getContext('2d').getImageData(clamp(Math.round(x), 0, paper.width - 1), clamp(Math.round(y), 0, paper.height - 1), 1, 1).data[3] > 40; } catch (e) { return false; } }
let pressure = 0.6;
function drawPencilLike(a, b, cur, hardKey, medium, colOverride) {
  if (cur.dull >= 100) { msgOnce('先が丸くなりすぎて書けない。削ってね。'); return false; }
  if (cur.length <= 4) { msgOnce('短くなりすぎて使えない。削るか新しいのを買ってね。'); return false; }
  let { x, y } = b; if (cur.length < 25) { const w = (25 - cur.length) / 25 * 2.6; x += (Math.random() - 0.5) * w; y += (Math.random() - 0.5) * w; }
  const H = HARD[hardKey], wdt = 1.5 + cur.dull * 0.05, al = H.dark * (0.5 + 0.5 * pressure);
  stroke(colOverride || H.col, wdt, al, a, { x, y }); mapSeg(medium, wdt + 0.9, a, { x, y });
  const d = dist(a, b); cur.dull = clamp(cur.dull + d * 0.028 * H.dullRate, 0, 100); cur.length = clamp(cur.length - d * 0.004 * H.useRate, 0, 100);
  return true;
}
function drawSeg(a, b) {
  const t = state.tool, d = dist(a, b);
  if (t !== 'ballpoint' && tapeAt(b.x, b.y)) { msgOnce('修正テープの上にはボールペン以外で描けない。'); return false; }
  if (t === 'pencil') { const P = state.pencil; if (P.stock[P.hard] <= 0) { msgOnce('その硬さの鉛筆がない。文房具屋さんで買ってね。'); return false; } return drawPencilLike(a, b, P.cur[P.hard], P.hard, 'pencil'); }
  if (t === 'coloredPencil') { const C = state.cp; if (C.stock[C.color] <= 0) { msgOnce('その色の色鉛筆がない。文房具屋さんで買ってね。'); return false; } return drawPencilLike(a, b, C.cur[C.color], 'HB', 'colored', CP_COLORS[C.color]); }
  if (t === 'mech') { const Mc = state.mech;
    if (Mc.exposed < 0.08) { msgOnce('芯が出ていない。ノックしてね。'); return false; }
    const col = Mc.colorLead ? LEAD_COLORS[Mc.colorLead] : HARD[Mc.hard].col, dark = Mc.colorLead ? 0.62 : HARD[Mc.hard].dark;
    stroke(col, 1.4, dark * (0.55 + 0.45 * pressure), a, b); mapSeg(Mc.colorLead ? 'colored' : 'pencil', 2.2, a, b);
    if (!Mc.colorLead) { const ix = indentC.getContext('2d'); ix.strokeStyle = '#5a5a5a'; ix.globalAlpha = { H: 0.5, HB: 0.3, B: 0.15, '2B': 0.08 }[Mc.hard]; ix.lineWidth = 1.7; ix.lineCap = 'round'; ix.beginPath(); ix.moveTo(a.x, a.y); ix.lineTo(b.x, b.y); ix.stroke(); ix.globalAlpha = 1; }
    Mc.exposed = Math.max(0, Mc.exposed - d * 0.0035 * (Mc.colorLead ? 1 : HARD[Mc.hard].useRate));
    const bp = clamp(Mc.exposed - 0.5, 0, 0.9) * d * 0.0022; if (Math.random() < bp) { Mc.exposed = 0; message('芯が折れた！出ていた分が失われた。'); }
    return true; }
  if (t === 'ballpoint') { const B = state.bp;
    if (B.stock[B.color] <= 0) { msgOnce('その色のボールペンがない。文房具屋さんで買ってね。'); return false; }
    if (B.ink[B.color] <= 0) { B.stock[B.color]--; if (B.stock[B.color] > 0) { B.ink[B.color] = 100; message('インクが切れたので、新しいボールペンに替えた。'); } else { message('インクが切れて在庫もない。文房具屋さんで買ってね。'); return false; } }
    stroke(BP_COLORS[B.color], 1.7, 0.88, a, b); mapSeg('ball', 2.4, a, b); B.ink[B.color] = Math.max(0, B.ink[B.color] - d * 0.012); return true; }
  if (t === 'brush') { const Br = state.brush;
    if (!Object.values(Br.stock).some(v => v > 0) || Br.stock[Br.type] <= 0) { msgOnce('その筆を持っていない。文房具屋さんで買ってね。'); return false; }
    if (Br.dip <= 0) { msgOnce('筆に絵の具がついていない。「絵の具をつける」を押してね。'); return false; }
    if (!Br.useMix && Br.paints[Br.paint] <= 0 && Br.dip <= 0) { return false; }
    const col = Br.useMix && Br.palette ? Br.mix : PAINTS[Br.paint], w = { '太筆': 13, '細筆': 4.5, '平筆': 8.5 }[Br.type];
    stroke(col, w, Br.dilute && Br.bucket ? 0.3 : 0.52, a, b); mapSeg('paint', w + 1, a, b);
    Br.dip = Math.max(0, Br.dip - d * ({ '太筆': 0.05, '細筆': 0.022, '平筆': 0.038 }[Br.type])); return true; }
  if (t === 'correction') { return drawCorrection(a, b, d); }
  if (t === 'eraser') { return eraseSeg(a, b); }
  return false;
}
function drawCorrection(a, b, d) {
  const C = state.corr;
  if (C.type === 'tape') {
    if (C.tapeRemain <= 0) { C.tapeStock--; if (C.tapeStock > 0) { C.tapeRemain = 100; message('新しい修正テープに替えた。'); } else { C.tapeStock = 0; message('修正テープがなくなった。文房具屋さんで買ってね。'); return false; } }
    if (C.tapeStock <= 0) { msgOnce('修正テープを持っていない。'); return false; }
    stroke('rgba(140,140,140,0.35)', 16.5, 1, a, b); stroke('#fcfcfa', 15, 0.97, a, b); mapSeg('covered', 15, a, b);
    const tx = tapeC.getContext('2d'); tx.strokeStyle = '#fff'; tx.lineWidth = 15; tx.lineCap = 'round'; tx.beginPath(); tx.moveTo(a.x, a.y); tx.lineTo(b.x, b.y); tx.stroke();
    C.tapeRemain = Math.max(0, C.tapeRemain - d * 0.06); return true;
  }
  if (C.fluidRemain <= 0) { C.fluidStock--; if (C.fluidStock > 0) { C.fluidRemain = 100; message('新しい修正液に替えた。'); } else { C.fluidStock = 0; message('修正液がなくなった。文房具屋さんで買ってね。'); return false; } }
  if (C.fluidStock <= 0) { msgOnce('修正液を持っていない。'); return false; }
  stroke('#f2e7d3', 12, 0.98, a, b); mapSeg('covered', 12, a, b); C.fluidRemain = Math.max(0, C.fluidRemain - d * 0.05); return true;
}

// ---------- eraser ----------
let workSum = 0, darkSum = 0, smudgeSum = 0, crumbAcc = 0;
function eraserSetup() {
  const E = state.eraser, t = E.type;
  if (t === 'pen') { if (!E.penUnlocked) { msgOnce('ペン型消しゴムは未解放。文房具屋さんで解放してね。'); return null; } if (E.penRemain <= 0) { if (E.penRefills > 0) { E.penRefills--; E.penRemain = 100; message('ペン型消しゴムの替えゴムに替えた。'); } else { msgOnce('替えゴムがない。文房具屋さんで買ってね。'); return null; } } return { radius: 10, str: 0.22, targets: ['pencil'], kind: 'pen' }; }
  if (t === 'elec') { if (!E.elecUnlocked) { msgOnce('電動消しゴムは未解放。文房具屋さんで解放してね。'); return null; } if (E.elecRemain <= 0) { if (E.elecRefills > 0) { E.elecRefills--; E.elecRemain = 100; message('電動消しゴムの替えゴムに替えた。'); } else { msgOnce('替えゴムがない。文房具屋さんで買ってね。'); return null; } } if (E.battery <= 0) { if (E.batteries > 0) { E.batteries--; E.battery = 100; message('電池を替えた。'); } else { msgOnce('電池がない。文房具屋さんで買ってね。'); return null; } } return { radius: 11, str: 0.30, targets: ['pencil'], kind: 'elec' }; }
  const P = ERASERS[t], cur = E.cur[t];
  if (E.stock[t] <= 0 || cur.remain <= 0) { msgOnce(`${P.name}がない。文房具屋さんで買ってね。`); return null; }
  return { radius: P.base + cur.corners[cur.corner].wear * 0.13, str: P.str, targets: t === 'color' ? ['colored'] : ['pencil'], kind: 'block', P, cur };
}
function eraseSeg(a, b) {
  const s = eraserSetup(); if (!s) return false;
  const E = state.eraser, blackOn = s.kind === 'block' && s.cur.corners[s.cur.corner].on;
  const d = dist(a, b), steps = Math.max(1, Math.ceil(d / (s.radius * 0.55)));
  for (let i = 1; i <= steps; i++) { const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps; applyErase(x + (s.kind === 'elec' ? (Math.random() - 0.5) * 3 : 0), y + (s.kind === 'elec' ? (Math.random() - 0.5) * 3 : 0), s, blackOn); }
  if (s.kind === 'pen') E.penRemain = Math.max(0, E.penRemain - d * 0.01);
  if (s.kind === 'elec') { E.elecRemain = Math.max(0, E.elecRemain - d * 0.02); E.battery = Math.max(0, E.battery - d * 0.004); }
  return true;
}
function applyErase(x, y, s, blackOn) {
  const r = s.radius, x0 = Math.max(0, Math.floor(x - r)), y0 = Math.max(0, Math.floor(y - r)), x1 = Math.min(paper.width, Math.ceil(x + r)), y1 = Math.min(paper.height, Math.ceil(y + r));
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0, h = y1 - y0, img = ctx.getImageData(x0, y0, w, h), mp = mapX().getImageData(x0, y0, w, h), ind = indentC.getContext('2d').getImageData(x0, y0, w, h);
  const clump = s.kind === 'block' ? s.P.clump : 1;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const dx = x0 + px - x, dy = y0 + py - y; if (dx * dx + dy * dy > r * r) continue;
    const i = (py * w + px) * 4, a = img.data[i + 3];
    if (blackOn) {
      if (a > 0 || Math.random() < 0.25) { img.data[i] = img.data[i] * 0.35 + 22; img.data[i + 1] = img.data[i + 1] * 0.35 + 22; img.data[i + 2] = img.data[i + 2] * 0.35 + 22; img.data[i + 3] = Math.min(255, a + 34); if (a === 0) { mp.data[i] = 255; mp.data[i + 1] = 0; mp.data[i + 2] = 0; mp.data[i + 3] = 255; } smudgeSum++; }
      continue;
    }
    if (a === 0) continue;
    const med = medName(mp.data[i], mp.data[i + 1], mp.data[i + 2]); if (!med || !s.targets.includes(med)) continue;
    const dark = 1 - (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 765;
    let na = a * (1 - s.str);
    const removed = (a - na) / 255; workSum += removed; darkSum += removed * dark; crumbAcc += removed * clump;
    if (med === 'pencil' && ind.data[i + 3] > 60) { if (na < 42) { na = 42; img.data[i] = 118; img.data[i + 1] = 118; img.data[i + 2] = 118; } }
    img.data[i + 3] = na; if (na < 8) { img.data[i + 3] = 0; mp.data[i + 3] = 0; }
  }
  ctx.putImageData(img, x0, y0); mapX().putImageData(mp, x0, y0);
  while (crumbAcc > 16) { crumbAcc -= 16; spawnCrumb(x, y); }
}
function spawnCrumb(x, y) { if (particles.length > 260) particles.shift(); particles.push({ x: x + (Math.random() - 0.5) * 22, y: y + (Math.random() - 0.5) * 22, size: 1 }); drawCrumbs(); }
function finishEraserStroke() {
  const E = state.eraser, t = E.type;
  if ((t === 'pen' || t === 'elec') || !ERASERS[t]) { workSum = darkSum = smudgeSum = 0; return; }
  const P = ERASERS[t], cur = E.cur[t], cn = cur.corners[cur.corner];
  if (cn.on) { cn.charge -= smudgeSum; if (cn.charge <= 0) { cn.on = false; cn.black = 0; message('こすり続けて、黒消しゴム状態が解除された。'); } }
  else if (P.blackRate > 0) { cn.black += darkSum * 0.05 * P.blackRate; if (cn.black >= 100) { cn.on = true; cn.charge = 9000; message('消しゴムが黒くなった！この角は黒いにじみをつけるようになった。'); } }
  cur.remain = Math.max(0, cur.remain - workSum * 0.0022 * (P.wear / 0.00035));
  cn.wear = clamp(cn.wear + workSum * 0.0016, 0, 100);
  if (strokeDist > 110 && Math.random() < P.breakP) { cur.remain = Math.floor(cur.remain / 2); message('消しゴムが折れた！長さが半分になり、残量が半減した。'); }
  if (cur.remain <= 0) { E.stock[t]--; if (E.stock[t] > 0) { E.cur[t] = freshBlock(); message(`消しゴムを使い切ったので、新しい${P.name}に替えた。`); } else message(`消しゴムを使い切った。文房具屋さんで買ってね。`); }
  workSum = darkSum = smudgeSum = 0;
}

// ---------- crumbs ----------
function drawCrumbs() { cctx.clearRect(0, 0, crumbC.width, crumbC.height); for (const p of particles) { const r = Math.min(10, 1.7 + p.size * 0.6); cctx.beginPath(); cctx.ellipse(p.x, p.y, r, r * 0.72, 0.6, 0, Math.PI * 2); cctx.fillStyle = '#c3c8bd'; cctx.fill(); cctx.strokeStyle = '#9aa392'; cctx.lineWidth = 0.7; cctx.stroke(); } }
function sweep(a, b) { const dx = b.x - a.x, dy = b.y - a.y; for (const p of particles) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < 52) { const f = (52 - d) / 52; p.x += dx * f * 1.15 + (Math.random() - 0.5) * 1.4; p.y += dy * f * 1.15 + (Math.random() - 0.5) * 1.4; p.x = clamp(p.x, 4, paper.width - 4); p.y = clamp(p.y, 4, paper.height - 4); } } mergeCrumbs(); drawCrumbs(); }
function mergeCrumbs() { let merged = true; while (merged) { merged = false; outer: for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) { const A = particles[i], B = particles[j], rr = (1.7 + A.size * 0.6) + (1.7 + B.size * 0.6); if (Math.hypot(A.x - B.x, A.y - B.y) < rr * 0.8) { const tot = A.size + B.size; A.x = (A.x * A.size + B.x * B.size) / tot; A.y = (A.y * A.size + B.y * B.size) / tot; A.size = tot; particles.splice(j, 1); merged = true; break outer; } } } }
function cashCrumbs() { const piles = particles.filter(p => p.size >= 3); if (!piles.length) { message('まだ小さい消しカスばかり。「手で集める」でこすり合わせてまとめると換金できる。'); return; } const value = piles.reduce((s, p) => s + Math.floor(6 * Math.pow(p.size, 1.5)), 0); state.money += value; particles = particles.filter(p => p.size < 3); message(`まとまった消しカス ${piles.length} 個を捨てて ${yen(value)} もらった。大きいほどお得。`); clearHistory(); renderAll(); save(); }
function newPaper() {
  const size = state.nextSize;
  const stock = size === 'カスタム' ? state.custom.stock : state.paperStock[size];
  if (stock <= 0) { message('その紙の在庫がない。文房具屋さんで買ってね。'); return; }
  if (size === 'カスタム') { state.custom.stock--; setDims(clamp(Math.round(state.custom.w * 3.78), 200, 1400), clamp(Math.round(state.custom.h * 3.78), 200, 1400)); }
  else { state.paperStock[size]--; setDims(SIZES[size][0], SIZES[size][1]); }
  state.paperSize = size; particles = []; clearHistory(); drawCrumbs(); renderAll(); save(); message(`新しい紙（${size}）に取り替えた。`);
}
function downloadPNG() { const out = document.createElement('canvas'); out.width = paper.width; out.height = paper.height; const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height); o.globalAlpha = 0.5; o.drawImage(indentC, 0, 0); o.globalAlpha = 1; o.drawImage(paper, 0, 0); const a = document.createElement('a'); a.download = 'onlyonepenit.png'; a.href = out.toDataURL('image/png'); a.click(); }

// ---------- shop ----------
const CATALOG = [];
const addItem = (id, name, price, cat, desc, icon, key) => CATALOG.push({ id, name, price, cat, desc, icon: icon || '✎', key: key || '' });
Object.keys(HARD).forEach(h => addItem('pencil-' + h, `鉛筆 ${h}`, 50, 'draw', '1本。硬いほど薄く長持ち、柔らかいほど濃く消耗が激しい。'));
addItem('mech-body', 'シャーペン本体', 200, 'draw', '買い替え用に1本。', '╱');
Object.keys(HARD).forEach(h => addItem('lead-' + h, `替芯 ${h}（20本）`, 100, 'supply', 'シャーペン用替芯。', '╱'));
Object.keys(LEAD_COLORS).forEach(c => addItem('leadc-' + c, `色つき替芯 ${c}（15本）`, 100, 'supply', 'シャーペン用。消すには色鉛筆用消しゴム。', '╱', 'coloredPencil'));
Object.entries(ERASERS).forEach(([k, v]) => addItem('er-' + k, v.name, v.price, 'draw', k === 'normal' ? '基本の消しゴム。角が4つある。' : k === 'hard' ? 'すり減りにくく折れにくいが、消しにくく黒くなりやすい。' : k === 'super' ? 'よく消えて消しカスがまとまりやすいが、すり減りやすく折れやすい。' : '色鉛筆を消せる。', '▰', 'eraser'));
addItem('pen-unlock', 'ペン型消しゴム（解放）', 100, 'dream', '範囲が変わらず黒くならない。折れやすい。替えゴムが必要。', '▰', 'eraser');
addItem('pen-refill', 'ペン型用替えゴム（5個）', 100, 'supply', '', '▰', 'eraser');
addItem('elec-unlock', '電動消しゴム（解放）', 200, 'dream', '範囲が変わらず、黒くならず、折れない。替えゴムと電池が必要。', '▰', 'eraser');
addItem('elec-refill', '電動用替えゴム（10個）', 100, 'supply', '', '▰', 'eraser');
addItem('battery', '電池セット（2本）', 100, 'supply', '電動消しゴム用。', '▭');
addItem('ruler', '定規', 100, 'supply', '直線を引くための道具。', '▱');
addItem('compass', 'コンパス', 200, 'supply', '鉛筆をセットして円を描く道具。', '◎');
Object.keys(CP_COLORS).forEach(c => addItem('cp-' + c, `色鉛筆 ${c}`, 100, 'draw', '消すには色鉛筆用消しゴムが必要。', '✎', 'coloredPencil'));
Object.keys(BP_COLORS).forEach(c => addItem('bp-' + c, `ボールペン ${c}`, 100, 'draw', '消しゴムでは消えない。修正テープ／液で直せる。', '✒', 'ballpoint'));
['太筆', '細筆', '平筆'].forEach(b => addItem('brush-' + b, `筆 ${b}`, 100, 'draw', '使うごとに絵の具をつけ直す。', '♢', 'brush'));
Object.keys(PAINTS).forEach(c => addItem('paint-' + c, `絵の具 ${c}`, 100, 'draw', '1個で満タン。絵の具は消すことができない。', '♢', 'brush'));
addItem('palette', 'パレット（解放）', 100, 'dream', '絵の具を混ぜて好きな色を作れる。', '♢', 'brush');
addItem('bucket', 'バケツ（解放）', 100, 'dream', '絵の具を水で薄められる。', '♢', 'brush');
addItem('tape', '修正テープ', 100, 'supply', 'あらゆるものを覆える。その上にはボールペン以外描けない。', '▭');
addItem('fluid', '修正液', 200, 'supply', 'あらゆるものを覆える。少しベージュっぽくなる。', '▭');
Object.keys(SIZES).forEach(s => addItem('paper-' + s, `紙 ${s}（100枚）`, 100, 'supply', '', '▤', 'paper'));
addItem('paper-custom', '紙 指定サイズ（100枚）', 2000, 'supply', '好きな寸法（mm）で注文できる。', '▤', 'paper');
const ONETIME = { 'pen-unlock': () => state.eraser.penUnlocked, 'elec-unlock': () => state.eraser.elecUnlocked, 'palette': () => state.brush.palette, 'bucket': () => state.brush.bucket, 'ruler': () => state.ruler, 'compass': () => state.compass };
function stockInfo(id) {
  const [k, v] = [id.slice(0, id.indexOf('-')), id.slice(id.indexOf('-') + 1)];
  if (k === 'pencil') return `在庫 ${state.pencil.stock[v]}`;
  if (k === 'lead') return `替芯 ${state.mech.leads[v]} 本`;
  if (k === 'leadc') return `替芯 ${state.mech.colorLeads[v]} 本`;
  if (k === 'er') return `在庫 ${state.eraser.stock[v]}`;
  if (id === 'pen-refill') return `替えゴム ${state.eraser.penRefills} 個`;
  if (id === 'elec-refill') return `替えゴム ${state.eraser.elecRefills} 個`;
  if (id === 'battery') return `電池 ${state.eraser.batteries} セット`;
  if (k === 'cp') return `在庫 ${state.cp.stock[v]}`;
  if (k === 'bp') return `在庫 ${state.bp.stock[v]}`;
  if (k === 'brush') return `在庫 ${state.brush.stock[v]}`;
  if (k === 'paint') return `残量 ${Math.round(state.brush.paints[v])}%`;
  if (id === 'tape') return `在庫 ${state.corr.tapeStock}`;
  if (id === 'fluid') return `在庫 ${state.corr.fluidStock}`;
  if (k === 'paper') return v === 'custom' ? `在庫 ${state.custom.stock} 枚` : `在庫 ${state.paperStock[v]} 枚`;
  return '';
}
function applyItem(id) {
  const [k, v] = [id.slice(0, id.indexOf('-')), id.slice(id.indexOf('-') + 1)];
  if (k === 'pencil') { state.pencil.stock[v]++; const c = state.pencil.cur[v]; if (c.length <= 4) { c.length = 100; c.dull = 0; } }
  else if (id === 'mech-body') { state.mech.internal = Math.max(state.mech.internal, 0); state.mech.exposed = Math.max(state.mech.exposed, 0.5); }
  else if (k === 'lead') state.mech.leads[v] += 20;
  else if (k === 'leadc') state.mech.colorLeads[v] += 15;
  else if (k === 'er') { state.eraser.stock[v]++; if (state.eraser.cur[v].remain <= 0) state.eraser.cur[v] = freshBlock(); }
  else if (id === 'pen-unlock') state.eraser.penUnlocked = true;
  else if (id === 'pen-refill') state.eraser.penRefills += 5;
  else if (id === 'elec-unlock') state.eraser.elecUnlocked = true;
  else if (id === 'elec-refill') state.eraser.elecRefills += 10;
  else if (id === 'battery') state.eraser.batteries += 2;
  else if (id === 'ruler') state.ruler = true;
  else if (id === 'compass') state.compass = true;
  else if (k === 'cp') { state.cp.stock[v]++; const c = state.cp.cur[v]; if (c.length <= 4) { c.length = 100; c.dull = 0; } }
  else if (k === 'bp') { state.bp.stock[v]++; if (state.bp.ink[v] <= 0) state.bp.ink[v] = 100; }
  else if (k === 'brush') state.brush.stock[v]++;
  else if (k === 'paint') state.brush.paints[v] = 100;
  else if (id === 'palette') state.brush.palette = true;
  else if (id === 'bucket') state.brush.bucket = true;
  else if (id === 'tape') state.corr.tapeStock++;
  else if (id === 'fluid') state.corr.fluidStock++;
  else if (k === 'paper') { if (v === 'custom') state.custom.stock += 100; else state.paperStock[v] += 100; }
}
let basket = {}, shopCat = 'all';
function basketTotal() { return Object.entries(basket).reduce((s, [id, q]) => s + (CATALOG.find(i => i.id === id)?.price || 0) * q, 0); }
function renderShop() {
  $('modalMoney').textContent = yen(state.money);
  const items = CATALOG.filter(i => shopCat === 'all' || i.cat === shopCat);
  $('shelfCount').textContent = `${items.length} 点`;
  $('shopItems').innerHTML = items.map(i => { const owned = ONETIME[i.id] && ONETIME[i.id](); return `<div class="shop-item" data-key="${i.key}"><div class="shop-art"><span class="shop-icon">${i.icon}</span>${owned ? '<span class="product-badge">解放済み</span>' : ''}</div><div class="shop-item-body"><strong>${i.name}</strong><small>${i.desc}${stockInfo(i.id) ? `（${stockInfo(i.id)}）` : ''}</small><div class="shop-item-bottom"><span class="shop-price">${yen(i.price)}</span><button class="wish-toggle ${state.wish === i.id ? 'selected' : ''}" data-wish="${i.id}" aria-label="欲しいものに設定">♡</button><button class="add-cart" data-add="${i.id}" ${owned ? 'disabled' : ''}>かごへ</button></div></div></div>`; }).join('');
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { basket[b.dataset.add] = (basket[b.dataset.add] || 0) + 1; renderShop(); }));
  document.querySelectorAll('[data-wish]').forEach(b => b.addEventListener('click', () => { state.wish = state.wish === b.dataset.wish ? null : b.dataset.wish; renderShop(); save(); }));
  const rows = Object.entries(basket);
  $('basketItems').innerHTML = rows.length ? rows.map(([id, q]) => { const i = CATALOG.find(x => x.id === id); return `<div class="basket-row"><div class="basket-row-top"><strong>${i.name}</strong><span>${yen(i.price * q)}</span></div><div class="basket-row-bottom"><span class="quantity"><button data-dec="${id}">−</button>${q}<button data-inc="${id}">＋</button></span><button data-del="${id}" style="border:0;background:none;color:#b08a84;cursor:pointer">削除</button></div></div>`; }).join('') : '<div class="basket-empty">かごは空っぽ。<br>気になる道具を選んでね。</div>';
  document.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => { basket[b.dataset.inc]++; renderShop(); }));
  document.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.dec; basket[id]--; if (basket[id] <= 0) delete basket[id]; renderShop(); }));
  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { delete basket[b.dataset.del]; renderShop(); }));
  const total = basketTotal(), count = rows.reduce((s, [, q]) => s + q, 0);
  $('basketTotal').textContent = yen(total); $('basketCount').textContent = count; $('jumpCount').textContent = `${count} 点`;
  $('checkout').disabled = !count || total > state.money;
  const w = CATALOG.find(i => i.id === state.wish);
  $('wishPanel').innerHTML = w ? `<div class="basket-row"><div class="basket-row-top"><strong>♡ 目標：${w.name}</strong><span>${yen(w.price)}</span></div><div class="basket-row-bottom"><span>${state.money >= w.price ? '買える金額に達した！' : `あと ${yen(w.price - state.money)}`}</span></div></div>` : '';
}
function openShop() { renderShop(); $('modal').classList.remove('hidden'); }
function checkout() { const total = basketTotal(); if (!total || total > state.money) { $('shopMessage').textContent = 'お金が足りないみたい。'; return; } Object.entries(basket).forEach(([id, q]) => { for (let n = 0; n < q; n++) applyItem(id); }); state.money -= total; basket = {}; clearHistory(); $('shopMessage').textContent = 'ありがとうございました！道具が増えたよ。'; renderShop(); renderAll(); save(); }

// ---------- pointer ----------
function commitRulerCompass(a, b, kind) {
  const P = state.pencil; if (P.stock[P.hard] <= 0) { message('鉛筆がない。コンパス／定規は鉛筆で描くよ。'); return; }
  const cur = P.cur[P.hard], H = HARD[P.hard]; if (cur.dull >= 100) { message('鉛筆の先が丸い。削ってね。'); return; }
  const wdt = 1.5 + cur.dull * 0.05;
  ctx.strokeStyle = H.col; ctx.globalAlpha = H.dark * 0.85; ctx.lineWidth = wdt; ctx.lineCap = 'round';
  mapX().strokeStyle = `rgb(${MED.pencil[0]},${MED.pencil[1]},${MED.pencil[2]})`; mapX().lineWidth = wdt + 0.9;
  ctx.beginPath(); mapX().beginPath();
  if (kind === 'ruler') { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); mapX().moveTo(a.x, a.y); mapX().lineTo(b.x, b.y); }
  else { const r = dist(a, b); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); mapX().arc(a.x, a.y, r, 0, Math.PI * 2); }
  ctx.stroke(); mapX().stroke(); ctx.globalAlpha = 1;
  const len = kind === 'ruler' ? dist(a, b) : 2 * Math.PI * dist(a, b);
  cur.dull = clamp(cur.dull + len * 0.028 * H.dullRate, 0, 100); cur.length = clamp(cur.length - len * 0.004 * H.useRate, 0, 100);
}
paper.addEventListener('pointerdown', e => { e.preventDefault(); try { paper.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ } const p = pos(e); pressure = e.pressure || 0.6; const hint = $('canvasHint'); if (hint) hint.classList.add('hidden-hint');
  if (state.tool === 'hand') { drawing = 'sweep'; last = p; pushHistory(); return; }
  if (state.tool === 'ruler' || state.tool === 'compass') { if (!toolAvailable(state.tool)) { message(state.tool === 'ruler' ? '文房具屋さんで定規を買うと使える。' : '文房具屋さんでコンパスを買うと使える。'); return; } drawing = state.tool; anchor = p; last = p; pushHistory(); return; }
  drawing = 'draw'; last = p; strokeDist = 0; workSum = darkSum = smudgeSum = 0; pushHistory(); drawSeg(p, { x: p.x + 0.01, y: p.y + 0.01 }); });
paper.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); pressure = e.pressure || pressure;
  if (drawing === 'sweep') { sweep(last, p); last = p; return; }
  if (drawing === 'ruler' || drawing === 'compass') { octx.clearRect(0, 0, overlay.width, overlay.height); octx.strokeStyle = 'rgba(70,80,70,0.55)'; octx.lineWidth = 1.6; octx.setLineDash([7, 5]); octx.beginPath(); if (drawing === 'ruler') { octx.moveTo(anchor.x, anchor.y); octx.lineTo(p.x, p.y); } else octx.arc(anchor.x, anchor.y, dist(anchor, p), 0, Math.PI * 2); octx.stroke(); octx.setLineDash([]); last = p; return; }
  const d = dist(last, p); if (d < 1.5) return; const steps = Math.ceil(d / 22); for (let i = 1; i <= steps; i++) { const q = { x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps }; drawSeg({ x: last.x + (p.x - last.x) * (i - 1) / steps, y: last.y + (p.y - last.y) * (i - 1) / steps }, q); } strokeDist += d; last = p; });
function endStroke(e) { if (!drawing) return; const p = last;
  if (drawing === 'ruler' || drawing === 'compass') { octx.clearRect(0, 0, overlay.width, overlay.height); if (p && anchor && dist(anchor, p) > 4) commitRulerCompass(anchor, p, drawing); }
  if (drawing === 'draw' && state.tool === 'eraser') finishEraserStroke();
  if (drawing === 'draw' && state.tool === 'correction') { /* remain handled per segment */ }
  drawing = false; anchor = null; renderAll(); save(); }
paper.addEventListener('pointerup', endStroke); paper.addEventListener('pointercancel', endStroke);

// ---------- chrome / modals / init ----------
document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => { state.tool = b.dataset.tool; renderAll(); save(); if (!toolAvailable(state.tool)) message('その道具はまだ持っていない。文房具屋さんで買えるよ。'); }));
$('btnStore').addEventListener('click', openShop); const bs = $('btnStoreSmall'); if (bs) bs.addEventListener('click', openShop);
$('modalClose').addEventListener('click', () => $('modal').classList.add('hidden'));
document.querySelectorAll('.shop-tabs button').forEach(b => b.addEventListener('click', () => { shopCat = b.dataset.category; document.querySelectorAll('.shop-tabs button').forEach(x => x.classList.toggle('active', x === b)); renderShop(); }));
$('checkout').addEventListener('click', checkout);
$('viewBasket').addEventListener('click', () => document.querySelector('.shop-side').scrollIntoView({ behavior: 'smooth' }));
$('btnElectronics').addEventListener('click', () => { $('elecMessage').textContent = state.clear ? '液タブは購入済み。ゲームクリア！' : `いまの所持金は ${yen(state.money)}。`; $('clearLinks').style.display = state.clear ? '' : 'none'; $('elecModal').classList.remove('hidden'); });
$('elecClose').addEventListener('click', () => $('elecModal').classList.add('hidden'));
$('buyTablet').addEventListener('click', () => { if (state.clear) { $('clearLinks').style.display = ''; return; } if (state.money < 100000) { $('elecMessage').textContent = `お金が足りない（あと ${yen(100000 - state.money)}）。消しカスをまとめて捨てて稼ごう。`; return; } state.money -= 100000; state.clear = true; $('elecMessage').textContent = '液晶ペンタブレットを購入した！'; $('clearLinks').style.display = ''; message('ゲームクリア！液タブを手に入れた。'); renderAll(); save(); });
$('help').addEventListener('click', () => $('helpModal').classList.remove('hidden'));
$('helpClose').addEventListener('click', () => $('helpModal').classList.add('hidden'));
$('helpStart').addEventListener('click', () => $('helpModal').classList.add('hidden'));
$('undo').addEventListener('click', () => { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); syncUndoBtns(); });
$('redo').addEventListener('click', () => { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); syncUndoBtns(); });
$('download').addEventListener('click', downloadPNG);
$('newPaper').addEventListener('click', newPaper);
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('redo') : $('undo')).click(); } });
renderAll(); loadImages(); syncUndoBtns();
if (state.clear) message('液タブ購入済み（ゲームクリア）。自由に描いてね。');
