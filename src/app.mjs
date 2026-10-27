import { createGame, deploy, start, rearrange, move, endTurn, playAI } from './battle.mjs';
import { mustReinforce } from './formation.mjs';
let g = createGame(), selected = null, feedback = '';
const el = id => document.getElementById(id);
const add = (parent, tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; parent.append(node); return node; };
function card(side, p) {
  const id = g.sides[side].slots[p-1], u = g.units[id], isPlayer = side === 'player';
  const b = document.createElement(isPlayer ? 'button' : 'div');
  b.className = `card ${side} ${u ? '' : 'empty'} ${isPlayer && selected === p ? 'selected' : ''}`;
  if(isPlayer) { b.type='button'; b.disabled=g.phase==='finished'; b.onclick=()=>choose(p); b.setAttribute('aria-pressed', String(selected===p)); }
  const pos=add(b,'div','card-top'); add(pos,'span','pos',`${p}号位`); if(u?.disabled)add(pos,'span','disabled-label','无法攻击');
  if(!u){add(b,'div','empty-mark','＋');add(b,'div','empty-label','空位置');b.setAttribute('aria-label',`${side==='player'?'我方':'对手'} ${p}号位，空位`);return b;}
  const emblem=add(b,'div','emblem',String(p)); emblem.setAttribute('aria-hidden','true');
  add(b,'div','card-name',u.name); add(b,'div','card-sub','基础单位 · 无技能');
  const stats=add(b,'div','stats');add(stats,'span','attack',`⚔ ${u.attack}`);add(stats,'span','health',`♥ ${u.hp} / ${u.maxHp}`);
  const track=add(b,'div','hp-track');const bar=add(track,'div','hp-fill');bar.style.width=`${Math.max(0,u.hp/u.maxHp*100)}%`;
  b.setAttribute('aria-label',`${isPlayer?'我方':'对手'} ${p}号位 ${u.name} 攻击 ${u.attack} 生命 ${u.hp} / ${u.maxHp}${u.disabled?' 本回合无法攻击':''}`);return b;
}
function show() {
  el('player-score').textContent=g.sides.player.score;el('enemy-score').textContent=g.sides.ai.score;
  el('phase').textContent=g.winner ? (g.winner==='player'?'我方胜利':'对手胜利') : g.phase==='deployment'?'布阵阶段':g.turn==='player'?'你的回合':'对手回合';
  el('ap').textContent=g.winner?'对局结束':g.phase==='deployment'?'调整你的队伍':`行动点 ${g.actionPoints} / 2`;
  const required=g.phase==='action'&&g.turn==='player'&&mustReinforce(g.sides.player.slots,g.actionPoints);
  el('hint').textContent=g.winner?'本场对战结束，点击右上角重新开始。':selected!==null?`已选择 ${selected} 号位。请选择目标位置，再次点击可取消。`:g.phase==='deployment'?'点击两个我方位置交换；准备好后点击完成布阵。':required?'场上有空位，请先选择一张替补卡，再选择空位补位。':'选择替补卡，再点击场上卡牌替换；两张替补卡之间也可互换。';
  el('feedback').textContent=feedback;
  const lanes=el('lanes');lanes.replaceChildren();for(const p of [1,2,3]){const row=add(lanes,'div','lane');row.append(card('ai',p));const mid=add(row,'div','lane-label');add(mid,'span','lane-number',`0${p}`);add(mid,'span','lane-word','对位');row.append(card('player',p));}
  for(const side of ['ai','player']){const container=el(side==='ai'?'enemy-bench':'player-bench');container.replaceChildren();for(let p=4;p<=8;p++)container.append(card(side,p));el(side==='ai'?'enemy-count':'reserve-count').textContent=`${g.sides[side].slots.slice(3).filter(Boolean).length} / 5`;}
  el('start').hidden=g.phase!=='deployment';el('end').hidden=g.phase!=='action'||g.turn!=='player';el('end').disabled=required;el('cancel').hidden=selected===null;
  el('log').replaceChildren(...g.log.slice(-30).reverse().map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
}
function run(fn){try{fn();feedback='';}catch(e){feedback=e.message;}show();}
function choose(p){if(selected===p){selected=null;feedback='';show();return;}if(selected===null){if(g.phase==='action'&&(p<4||!g.sides.player.slots[p-1])){feedback='请先选择一张场下替补卡。';show();return;}selected=p;feedback='';show();return;}const a=selected;run(()=>{if(g.phase==='deployment')deploy(g,a,p);else if(a>=4&&p>=4)rearrange(g,'player',a,p);else move(g,'player',a,p);selected=null;});}
el('start').onclick=()=>run(()=>{selected=null;start(g);});el('end').onclick=()=>run(()=>{selected=null;endTurn(g,'player');if(g.phase==='action'&&g.turn==='ai')playAI(g);});el('reset').onclick=()=>{if(g.phase!=='deployment'&&!g.winner&&!confirm('确定重新开始？当前对局进度将丢失。'))return;g=createGame();selected=null;feedback='';show();};el('cancel').onclick=()=>{selected=null;feedback='';show();};show();
