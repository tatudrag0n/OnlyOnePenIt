// inventory.js
import { state } from './state.js';

export function hasItem(key, sub=null){
  if(sub) return (state.inventory[key][sub]||0) > 0;
  return (state.inventory[key]||0) > 0;
}

export function consumeItem(key, sub=null, n=1){
  if(sub){ if((state.inventory[key][sub]||0)<n) return false; state.inventory[key][sub]-=n; return true; }
  if((state.inventory[key]||0)<n) return false; state.inventory[key]-=n; return true;
}

export function addItem(key, sub=null, n=1){
  if(sub){ state.inventory[key][sub] = (state.inventory[key][sub]||0)+n; }
  else { state.inventory[key] = (state.inventory[key]||0)+n; }
}

export const PRICES = {
  pencil: { H:50, HB:50, B:50, '2B':50 },
  mech: 100, // body? spec: mechanical pencil initial free; refill lead sold separately. body price not specified? assume 100? Spec says 替芯. Mechanical pencil initial. Store sells シャーペン? "文房具屋... シャーペン" not in list? It lists 鉛筆,シャーペン? Actually list: 鉛筆、シャーペン、普通の消しゴム... yes. Price for shapen not specified. Use 100.
  refillLead: 100, // 20-pack
  coloredRefill: 100, // 15-pack
  eraserNormal: 30,
  eraserHard: 50,
  eraserSuper: 100,
  eraserColor: 50,
  eraserPen: 100, // unlock? "100円で解放" maybe tool unlock. We'll treat as item price 100
  eraserElectric: 200,
  penRefill: 100,
  electricRefill: 100,
  coloredPencil: 100,
  ballpoint: 100,
  brush: 100,
  paint: 100,
  palette: 100,
  bucket: 100,
  correctionTape: 100,
  correctionFluid: 200,
  ruler: 0, // not priced? store sells. assume 50? 
  compass: 0,
  paperA: 100, // 100 sheets
  paperCustom: 2000,
};

export function inventorySummary(){
  const inv = state.inventory;
  let lines = [];
  lines.push(`鉛筆: H${inv.pencil.H} HB${inv.pencil.HB} B${inv.pencil.B} 2B${inv.pencil['2B']}`);
  lines.push(`シャーペン本体: ${inv.mech}`);
  lines.push(`替芯: H${inv.refillLead.H} HB${inv.refillLead.HB} B${inv.refillLead.B} 2B${inv.refillLead['2B']}`);
  lines.push(`色替芯: 赤${inv.coloredRefill.red} 青${inv.coloredRefill.blue} 緑${inv.coloredRefill.green} 黄${inv.coloredRefill.yellow}`);
  lines.push(`消しゴム: 普通${inv.eraser.normal} かたい${inv.eraser.hard} すごい${inv.eraser.super} 色鉛筆用${inv.eraser.color} ペン型${inv.eraser.pen} 電動${inv.eraser.electric}`);
  lines.push(`ペン型替え: ${inv.penRefill} 電動替え: ${inv.electricRefill}`);
  const cp = inv.coloredPencil; lines.push(`色鉛筆: 赤${cp.red}青${cp.blue}黄${cp.yellow}緑${cp.green}橙${cp.orange}桃${cp.pink}白${cp.white}金${cp.gold}銀${cp.silver}`);
  const bp = inv.ballpoint; lines.push(`ボールペン: 赤${bp.red}青${bp.blue}橙${bp.orange}緑${bp.green}黒${bp.black}`);
  const br = inv.brush; lines.push(`筆: 太${br.thick}細${br.thin}平${br.flat}`);
  const pa = inv.paint; lines.push(`絵の具: 赤${pa.red}青${pa.blue}黄${pa.yellow}白${pa.white}`);
  lines.push(`パレット:${inv.palette} バケツ:${inv.bucket} 定規:${inv.ruler} コンパス:${inv.compass}`);
  lines.push(`修正テープ:${inv.correctionTape} 修正液:${inv.correctionFluid}`);
  return lines.join('\n');
}
