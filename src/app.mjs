import { createGame, deploy, start, rearrange, move, endTurn, playAI } from './battle.mjs';
let g = createGame(), selected = null;
const el = id => document.getElementById(id);
function show() {
  el('status').textContent = g.winner ? `${g.winner === 'player' ? '玩家' : '对手'}获胜` : `${g.phase === 'deployment' ? '布阵阶段' : g.turn === 'player' ? '玩家回合' : '对手回合'} · 行动点 ${g.actionPoints} · 玩家 ${g.sides.player.score} : ${g.sides.ai.score} 对手`;
  el('hint').textContent = selected ? `已选择 ${selected} 号位置，请选择目标位置。` : g.phase === 'deployment' ? '点击两个己方位置交换布阵。' : '选择己方场下单位，再选择场上位置补位或替换；也可选择另一场下单位互换。';
  el('board').replaceChildren();
  for (const side of ['ai','player']) {
    const section = document.createElement('section'); const h = document.createElement('h2'); h.textContent = side === 'player' ? '我方' : '对手'; section.append(h);
    for (const [label, indexes] of [['场上',[1,2,3]],['场下',[4,5,6,7,8]]]) {
      const title=document.createElement('h3'); title.textContent=label; section.append(title); const row=document.createElement('div'); row.className='row';
      for (const p of indexes) { const id=g.sides[side].slots[p-1], u=g.units[id]; const b=document.createElement('button'); b.className='card'; b.disabled=side==='ai'||g.phase==='finished'; b.textContent=u ? `${p} · ${u.name}\n攻击 ${u.attack} · 生命 ${u.hp}/${u.maxHp}${u.disabled?'\n本回合无法攻击':''}` : `${p} · 空位`; if(side==='player') b.onclick=()=>choose(p); row.append(b); } section.append(row);
    } el('board').append(section);
  }
  el('start').hidden=g.phase!=='deployment'; el('end').hidden=g.phase!=='action'||g.turn!=='player';
  el('log').replaceChildren(...g.log.slice(-20).reverse().map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
}
function run(fn){try{fn();}catch(e){alert(e.message);}show();}
function choose(p){if(selected===null){selected=p;show();return;} const a=selected;selected=null;run(()=>{if(g.phase==='deployment') deploy(g,a,p); else if(a>=4&&p>=4) rearrange(g,'player',a,p); else move(g,'player',a,p);});}
el('start').onclick=()=>run(()=>{selected=null;start(g);});
el('end').onclick=()=>run(()=>{selected=null;endTurn(g,'player');if(g.phase==='action'&&g.turn==='ai')playAI(g);});
el('reset').onclick=()=>{g=createGame();selected=null;show();};show();
