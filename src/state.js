// state.js
export const state = {
  money: 1000,
  paper: { size: 'A4', width: 794, height: 1123, count: 100 },
  currentTool: null,
  toolOptions: {},
  inventory: {
    pencil: { H:0, HB:1, B:0, '2B':0 },        // counts of fresh pencils
    mech: 1,                                      // mechanical pencil bodies
    refillLead: { H:0, HB:10, B:0, '2B':0 },     // counts
    coloredRefill: { red:0, blue:0, green:0, yellow:0 },
    eraser: { normal:2, hard:0, super:0, color:0, pen:0, electric:0 },
    penRefill: 0,      // packs? count of refills
    electricRefill: 0,
    coloredPencil: { red:0, blue:0, yellow:0, green:0, orange:0, pink:0, white:0, gold:0, silver:0 },
    ballpoint: { red:0, blue:0, orange:0, green:0, black:0 },
    brush: { thick:0, thin:0, flat:0 },
    paint: { red:0, blue:0, yellow:0, white:0 },
    palette: 0,
    bucket: 0,
    correctionTape: 0,
    correctionFluid: 0,
    ruler: 0,
    compass: 0,
    unlocked: { penEraser: false, electricEraser: false, palette: false, bucket: false, liquidTab: false },
  },
  // active tool instance state
  active: null, // {kind, ...}
  crumbs: [], // {id, x, y, size, mergedCount}
  electronicsUnlocked: false,
  gameClear: false,
};

export function addMoney(n){ state.money += n; }
export function spend(n){ if(state.money < n) return false; state.money -= n; return true; }

export const PAPER_SIZES = {
  'A4': {w:794,h:1123}, 'A5':{w:561,h:794}, 'A6':{w:397,h:561},
  'B4':{w:938,h:1328}, 'B5':{w:664,h:938}, 'B6':{w:469,h:664},
};

export function newPaper(size){
  const s = PAPER_SIZES[size];
  state.paper.size = size; state.paper.width = s.w; state.paper.height = s.h; state.paper.count -= 1;
  if(state.paper.count < 0){ state.paper.count = 0; }
}
