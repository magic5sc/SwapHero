import {describeSkill} from './skill-text.mjs';
import {createBuffBar,hideBuffInfo} from './buff-icons.mjs';
import {positionPopover} from './popover-position.mjs';
import {mountLeather,isTableTransition} from './tabletop.mjs';
import { victoryLabel, attackLabel,displayPositions,opposingPosition } from './match-rules.mjs';
import { loadPublishedCatalog } from './release-loader.mjs';
import { canAttack } from './content.mjs';
import { artForUnit, makeSprite, makeAttackEffect, hydrateArt } from './art.mjs';
import { createGame, deploy, start, rearrange, move, endTurn, playAI,upgradeBattle } from './battle.mjs';
import { mustReinforce } from './formation.mjs';
import {drawAttackPreview} from './attack-preview.mjs';
let adventureHooks=null;mountLeather(document.getElementById('battle-screen'));
const selectedGoal=()=>document.getElementById('victory-condition')?.value||'score_5';
let activeCatalog=null,activeTeam=null,rosterLabel=null;
let labCatalog=null, useSkillLab=false, inspectedId=null, skillPulses=new Map();
let g = createGame(), selected = null, feedback = '', animationPositions = [];
let drag = null, suppressClick = false, playing = false, visual = null, effect = null;
let battlePresentation = 0;
const cardKeys = new WeakMap();
const fieldRows = new Map();
function loadBattle(next){g=next;battlePresentation++;}
const el = id => document.getElementById(id);
const add = (parent, tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; parent.append(node); return node; };

function renderDetail(detail,chosen){
 detail.replaceChildren();if(!chosen){add(detail,'p','','选择我方单位查看信息');return;}
 detail.append(makeSprite('detail-sprite',artForUnit(chosen)));add(detail,'h3','',chosen.name);add(detail,'p','', '攻击 '+chosen.attack+' · 生命 '+chosen.hp+' / '+chosen.maxHp);
 add(detail,'small','',chosen.disabled&&!canAttack(chosen)?'本回合无法攻击':(chosen.skills?.length?'技能已装配 · 外观为占位':'无技能'));
 for(const b of chosen.skills||[])add(detail,'p','skill-description',b.definition.name+'：'+describeSkill(b.definition,b.level));
}
let press=null;
function hideCardInfo(){document.getElementById('card-popover')?.remove();hideBuffInfo();}
function showCardInfo(id,anchor,point){
 const unit=(visual||g).units[id];if(!unit||drag?.active)return;
 hideCardInfo();const popup=add(document.body,'aside','card-popover');popup.id='card-popover';popup.setAttribute('role','tooltip');renderDetail(popup,unit);
 positionPopover(popup,point,anchor);
}
function beginInspect(e,id,anchor){
 if(e.pointerType==='mouse'||!id)return;
 clearTimeout(press?.timer);hideCardInfo();
 const pending={id:e.pointerId,x:e.clientX,y:e.clientY,timer:null};press=pending;
 pending.timer=setTimeout(()=>{if(press===pending){drag=null;showCardInfo(id,anchor,{clientX:pending.x,clientY:pending.y});}},500);
}
document.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8){clearTimeout(press.timer);press=null;hideCardInfo();}});
document.addEventListener('pointermove',e=>{const popup=document.getElementById('card-popover');if(popup&&e.pointerType==='mouse'&&!drag?.active)positionPopover(popup,e);});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.card'))hideCardInfo();},true);
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{clearTimeout(press?.timer);press=null;});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.card'))e.preventDefault();});
window.addEventListener('resize',hideCardInfo);window.addEventListener('scroll',hideCardInfo,true);
window.addEventListener('resize',schedulePlans);
const planStyle=document.createElement('link');planStyle.rel='stylesheet';planStyle.href='turn-plan.css';document.head.append(planStyle);
let planDraw=0;
function schedulePlans(){
 cancelAnimationFrame(planDraw);
 planDraw=requestAnimationFrame(()=>{
  drawEnemyPlan();
  drawAttackPreview(el('lanes').closest('.arena-scene'),playing||drag?.active?null:(visual||g));
 });
}
function drawEnemyPlan(){
 const board=el('lanes')?.closest('.arena-scene');if(!board)return;
 board.querySelector('.enemy-plan-lines')?.remove();
 const view=visual||g;if(playing||view.mode!=='pve'||view.turn!=='player'||view.phase!=='action'||view.winner)return;
 const ops=view.enemyPlan?.operations.filter(op=>op.type==='exchange')||[];if(!ops.length)return;
 const bounds=board.getBoundingClientRect();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('enemy-plan-lines');svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.setAttribute('role','img');
 const labels=[];for(const op of ops){
  const a=board.querySelector(`[data-side="ai"][data-slot="${op.from}"]`),b=board.querySelector(`[data-side="ai"][data-slot="${op.to}"]`);if(!a||!b)continue;
  const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();const path=document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('d',`M ${ar.left+ar.width/2-bounds.left} ${ar.bottom-bounds.top-8} L ${br.left+br.width/2-bounds.left} ${br.top-bounds.top+8}`);svg.append(path);
  labels.push(`${view.units[op.incoming]?.name||'后备'}换入，${view.units[op.outgoing]?.name||'前排'}换出`);
 }svg.setAttribute('aria-label','敌方下回合计划：'+labels.join('；'));board.append(svg);
}
function card(view, side, p, previous) {
  const id = view.sides[side].slots[p-1], u = view.units[id], isPlayer = side === 'player';
  const art = u && artForUnit(u);
  const key = JSON.stringify([battlePresentation,id,art]);
  const b = cardKeys.get(previous)===key ? previous : document.createElement(isPlayer ? 'button' : 'div');
  cardKeys.set(b,key);
  const sprite=b.querySelector('.unit-sprite');
  // Leave the painted sprite connected; the remaining children reflect this snapshot.
  for(const child of [...b.children])if(child!==sprite)child.remove();
  const foreground=document.createDocumentFragment();
  b.className = `card ${side} ${side==='ai'?'enemy':''} ${u ? '' : 'empty'} ${isPlayer && selected === p ? 'selected' : ''}`;
  b.dataset.side=side;b.dataset.slot=p;
  if(isPlayer) { b.type='button'; b.dataset.position=p; b.disabled=(g.phase==='finished'||g.phase==='error')||playing; b.onclick=e=>e.preventDefault(); b.onpointerdown=e=>{beginInspect(e,id,b);beginDrag(e,p,b);};  if(animationPositions.includes(p)) b.classList.add('swap-arrival'); }
  if(effect?.stage==='attack' && effect.targetLane===p && effect.side!==side)b.classList.add('attack-target'); if(u && u.hp===0) b.classList.add('pending-defeat'); if(effect?.lane===p && effect.side===side && effect.stage==='attack') b.classList.add('perform-attack'); if(effect?.targetLane===p && effect.side!==side && effect.hit){b.classList.add('perform-hit');add(foreground,'span','damage-float',`−${effect.damage}`);} const pos=add(foreground,'div','card-top'); add(pos,'span','pos',p<=3?String(p):`${p-3}后`); if(u?.disabled&&!canAttack(u))add(pos,'span','disabled-label','无法攻击');
  if(!u){b.append(foreground);add(b,'div','empty-mark','＋');add(b,'div','empty-label','空位置');b.setAttribute('aria-label',`${side==='player'?'我方':'对手'} ${p<=3?p+'号战场格':(p-3)+'号战线后方备战格'}，空位`);return b;}
  if(!isPlayer){b.tabIndex=0;b.onpointerdown=e=>beginInspect(e,id,b);}
  b.onpointerenter=e=>{if(e.pointerType==='mouse'&&!drag)showCardInfo(id,b,e);};
  b.onpointerleave=e=>{if(e.pointerType==='mouse')hideCardInfo();};
  b.onkeydown=e=>{if(e.key==='Escape')hideCardInfo();};

  if(skillPulses.has(id)){const delta=skillPulses.get(id);b.classList.add('skill-pulse');add(foreground,'span','damage-float',delta>0?'+'+delta:String(delta));}
  if(effect?.stage==='impact' && effect.hit && effect.targetLane===p && effect.side!==side && effect.attackEffect)foreground.append(makeAttackEffect(effect.attackEffect));
  b.insertBefore(foreground,sprite);
  b.dataset.unitId=id;
  if(!sprite){const node=makeSprite('unit-sprite',art);node.dataset.instance=id;b.append(node);}
  const buffBar=createBuffBar(view,u,p,{onInspect:hideCardInfo,isLocked:()=>playing||!!drag?.active});if(buffBar)b.append(buffBar);
  if(side==='ai'&&view.mode==='pve'&&view.turn==='player'&&view.phase==='action'&&!playing){
   for(const op of view.enemyPlan?.operations||[])if(op.type==='exchange'&&(id===op.incoming||id===op.outgoing))add(b,'span','exchange-intent',id===op.incoming?'⇄ 待换入':'⇄ 待换出');
  }
  add(b,'div','card-name',u.name); add(b,'div','card-sub',(u.skills||[]).map(s=>s.definition.name).join(' · ')||'无技能');
  const stats=add(b,'div','stats');add(stats,'span','attack',`⚔ ${u.attack}`);add(stats,'span','health',`♥ ${u.hp} / ${u.maxHp}`);
  const track=add(b,'div','hp-track');const bar=add(track,'div','hp-fill');bar.style.width=`${Math.max(0,u.hp/u.maxHp*100)}%`;
  b.setAttribute('aria-label',`${isPlayer?'我方':'对手'} ${p<=3?p+'号战场格':(p-3)+'号战线后方备战格'} ${u.name} 攻击 ${u.attack} 生命 ${u.hp} / ${u.maxHp}${u.disabled&&!canAttack(u)?' 本回合无法攻击':''}`);return b;
}
function updateSlots(container,view,side,offset=0){
  displayPositions(side).forEach((p,i)=>{
    const previous=container.children[i];
    const next=card(view,side,p+offset,previous);
    if(next===previous)return;
    if(previous)previous.replaceWith(next);
    else container.append(next);
  });
}
function renderBoard(view){
  if(!fieldRows.size){
    const lanes=el('lanes');
    lanes.closest('.arena-scene').classList.add('plan-board');
    for(const [side,label] of [['ai','对手战场 · ← 攻击顺序'],['player','我方战场 · 攻击顺序 →']]){
      const field=add(lanes,'div','field');
      add(field,'div','field-title',label);
      fieldRows.set(side,add(field,'div','field-row'));
    }
  }
  for(const side of ['ai','player']){
    updateSlots(fieldRows.get(side),view,side);
    updateSlots(el(side==='ai'?'enemy-bench':'player-bench'),view,side,3);
    el(side==='ai'?'enemy-count':'reserve-count').textContent=`${g.sides[side].slots.slice(3).filter(Boolean).length} / 3`;
  }
}
function show() {
  hideCardInfo();
  const view=visual||g; const chosenId=inspectedId&&view.units[inspectedId]?inspectedId:selected===null?view.sides.player.slots.find(id=>id&&view.units[id]?.hp>0):view.sides.player.slots[selected-1]; const chosen=view.units[chosenId]; const detail=el('unit-detail'); renderDetail(detail,chosen); el('player-score').textContent=view.sides.player.score;el('enemy-score').textContent=view.sides.ai.score; for(const [side,score] of [['player',view.sides.player.score],['enemy',view.sides.ai.score]]){const dots=el(side+'-dots');dots.replaceChildren(...Array.from({length:5},(_,i)=>{const dot=document.createElement('i');dot.className=i<score?'earned':'';return dot;}));}
  const elimination=view.victoryCondition==='elimination';
  for(const side of ['player','ai']){
    const prefix=side==='ai'?'enemy':'player';
    el(prefix+'-score').textContent=elimination?view.sides[side].slots.filter(id=>id&&view.units[id].hp>0).length:view.sides[side].score;
    el(prefix+'-metric').textContent=elimination?' 存活':' / 5';
    el(prefix+'-dots').hidden=elimination;
  }
  if(adventureHooks&&!playing&&!visual)adventureHooks.onChange(structuredClone(g));
  el('deployment-goal').value=view.victoryCondition;el('deployment-goal-wrap').hidden=g.phase!=='deployment'||playing||!!adventureHooks;
  el('battle-goal').textContent='本局目标：'+victoryLabel(view.victoryCondition)+' · '+attackLabel(view.victoryCondition);
  el('victory-condition').disabled=playing;
  el('phase').textContent=g.error?'结算已暂停':playing ? '攻击表演中' : g.winner ? (g.winner==='player'?'我方胜利':'对手胜利') : g.phase==='deployment'?'布阵阶段':g.turn==='player'?'你的回合':'对手回合';
  el('ap').textContent=playing?'请稍候':g.winner?'对局结束':g.phase==='deployment'?'调整你的队伍':`行动点 ${g.actionPoints} / 2`;
  const required=g.phase==='action'&&g.turn==='player'&&mustReinforce(g.sides.player.slots,g.actionPoints);
  el('hint').textContent=g.winner?'本场对战结束，可重新开始。':g.phase==='deployment'?'拖拽我方卡牌调整位置，完成后点击完成布阵。':required?'场上无人，请拖拽1名后备到前排空位。':'可保留后备，或拖拽到前排补位/替换；后备之间也可拖拽互换。悬停或长按查看详情。';
  el('feedback').textContent=g.error||feedback;
  renderBoard(view);
  schedulePlans();
  el('start').hidden=g.phase!=='deployment'||playing;el('end').hidden=g.phase!=='action';el('end').disabled=playing||g.turn!=='player'||required;el('cancel').hidden=selected===null||playing;el('reset').disabled=playing;el('reset').hidden=!!adventureHooks;
  document.querySelector('.notice').textContent=rosterLabel?rosterLabel+' · 外观仅为占位，卡牌效果按配置执行。':useSkillLab?'技能试验队 · 顽石、冥守与4张机制测试卡；外观仅为占位。':'测试版本 · 使用无技能占位卡；角色外观不代表正式卡牌能力。';
  if(g.winner&&!playing&&!visual&&!document.querySelector('.result-overlay')&&!adventureHooks?.onVictory?.(g)){const overlay=add(document.body,'div','result-overlay');overlay.dataset.winner=g.winner;add(overlay,'strong','',g.winner==='player'?'胜 利':'败 北');const close=add(overlay,'button','primary','返回战场');close.textContent=adventureHooks?.exitLabel||(adventureHooks?(g.winner==='player'?'领取战斗结果':'冒险结算'):'返回战场');close.onclick=()=>{overlay.hidden=true;if(adventureHooks)adventureHooks.onExit(structuredClone(g));};}
  el('log').replaceChildren(...g.log.slice(-30).reverse().map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
}
function run(fn){try{fn();feedback='';}catch(e){feedback=e.message;}show();}
function performMove(a,p){const before=structuredClone(g);run(()=>{if(g.phase==='deployment')deploy(g,a,p);else if(a>=4&&p>=4)rearrange(g,'player',a,p);else move(g,'player',a,p);inspectedId=before.sides.player.slots[a-1];selected=null;animationPositions=[a,p];});skillPulses=new Map(Object.values(g.units).filter(u=>before.units[u.id]&&u.hp!==before.units[u.id].hp).map(u=>[u.id,u.hp-before.units[u.id].hp]));show();setTimeout(()=>{skillPulses.clear();if(!playing)show();},700);if(animationPositions.length)setTimeout(()=>{animationPositions=[];},500);}
el('start').onclick=()=>run(()=>{selected=null;if(g.mode==='pve'&&!g.levelId){const enemies=g.sides.ai.slots.filter(Boolean),positions=[0,1,2].sort((a,b)=>Number(!!g.sides.player.slots[b])-Number(!!g.sides.player.slots[a]));g.sides.ai.slots=Array(6).fill(null);enemies.forEach((id,i)=>g.sides.ai.slots[i<3?opposingPosition(positions[i]+1)-1:i]=id);}start(g);});el('end').onclick=async()=>{
  if(playing)return; selected=null;const frames=[];let sim=structuredClone(g);
  try { endTurn(sim,'player',e=>frames.push(e));  }
  catch(e){feedback=e.message;show();return;}
  playing=true; const wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(const side of ['player','ai']) {
    if(side==='ai' && sim.phase==='action' && sim.turn==='ai'){
      visual=structuredClone(sim);effect=null;show();el('phase').textContent='对手回合 · 执行预告计划';await wait(400);
      const moves=[];playAI(sim,e=>frames.push(e),m=>moves.push(m));
      for(const m of moves){visual=m.before;show();el('phase').textContent='对手交换';await wait(250);visual=m.after;show();el('phase').textContent='对手交换';await wait(450);}
    }
    const group=frames.filter(x=>x.side===side);
    for(const f of group){
      visual=structuredClone(f.before);
      const sequenceAttack=f.before.units[f.before.sides[side].slots[f.lane-1]]?.art?.character?.renderer==='sequence_builtin';
      effect={side,lane:f.lane,targetLane:f.targetLane,hit:false,stage:'attack'};show();await wait(sequenceAttack?640:360);
      const target=f.targetId, targetLane=f.targetLane;
      // This attack's settled state is displayed immediately: never restore a
      // defeated unit as a visual ghost for subsequent attacks or turns.
      visual=structuredClone(f.after);
      effect={side,lane:f.lane,targetLane,hit:!!target,stage:'impact',attackEffect:f.before.units[f.before.sides[side].slots[f.lane-1]]?.art?.attackEffect,damage:target?f.before.units[target].hp-f.after.units[target].hp:0};show();if(!target&&g.victoryCondition==='score_5'){const fx=add(document.body,'div','score-burst','胜利点 +1');setTimeout(()=>fx.remove(),800);}await wait(sequenceAttack?600:500);
    }
  }
  g=sim;visual=null;effect=null;playing=false;feedback='';show();
};el('reset').onclick=()=>{if(g.phase!=='deployment'&&!g.winner&&!confirm('确定重新开始？当前对局进度将丢失。'))return;document.querySelector('.result-overlay')?.remove();inspectedId=null;loadBattle(activeCatalog?createGame(activeCatalog,activeTeam,{victoryCondition:g.victoryCondition}):useSkillLab?createGame(labCatalog,labCatalog.team,{victoryCondition:g.victoryCondition}):createGame(null,null,{victoryCondition:g.victoryCondition}));selected=null;feedback='';show();};el('cancel').onclick=()=>{selected=null;feedback='';show();};show();

function beginDrag(e,p,button){
  if(playing || e.button!==0 || (g.phase==='finished'||g.error) || !g.sides.player.slots[p-1] || (g.phase==='action' && p<4)) return;
  drag={id:e.pointerId,p,startX:e.clientX,startY:e.clientY,active:false,button,ghost:null};
  button.setPointerCapture(e.pointerId);
}
document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.active && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8){
    clearTimeout(press?.timer);press=null;hideCardInfo();drag.active=true; schedulePlans(); drag.ghost=drag.button.cloneNode(true); drag.ghost.className='card player drag-ghost'; drag.ghost.removeAttribute('id'); document.body.append(drag.ghost); drag.button.classList.add('drag-source');
  }
  if(!drag.active)return;
  e.preventDefault();drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  document.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-position]'); if(target&&target!==drag.button)target.classList.add('drop-target');
},{passive:false});
function finishDrag(e,cancelled=false){
 if(!drag||e.pointerId!==drag.id)return;
 const d=drag; drag=null; const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-position]');
 d.ghost?.remove();d.button.classList.remove('drag-source');document.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));
 if(!d.active)return;
 suppressClick=true;setTimeout(()=>{suppressClick=false;},300);
 if(!cancelled&&target&&Number(target.dataset.position)!==d.p){selected=d.p;performMove(d.p,Number(target.dataset.position));}
 else {feedback=cancelled?'拖拽已取消':'请拖到我方可用位置。';show();}
}
document.addEventListener('pointerup',e=>finishDrag(e));document.addEventListener('pointercancel',e=>finishDrag(e,true));

el('victory-condition').onchange=()=>{if(g.phase==='deployment'&&!playing){g.victoryCondition=selectedGoal();show();}};
el('deployment-goal').onchange=()=>{if(g.phase==='deployment'&&!playing){el('victory-condition').value=el('deployment-goal').value;g.victoryCondition=selectedGoal();show();}};
// Navigation preserves the current local match.
el('enter-battle').onclick=()=>el('enter-cards').click();
el('back-home').onclick=()=>{if(playing||isTableTransition())return;if(adventureHooks){adventureHooks.onExit(structuredClone(g));return;}el('battle-screen').hidden=true;el('home').hidden=false;};
el('help-toggle').onclick=()=>{el('help').hidden=!el('help').hidden;el('help-toggle').setAttribute('aria-expanded',String(!el('help').hidden));};

hydrateArt();

// Explicit laboratory roster; original card definitions are never silently completed.
if(el('enter-skill-lab'))el('enter-skill-lab').onclick=async()=>{
 const button=el('enter-skill-lab');if(playing)return;button.disabled=true;
 try{if(!labCatalog){const response=await fetch('data/skill-lab.json');if(!response.ok)throw Error('技能配置读取失败');labCatalog=await response.json();}if(g.phase!=='deployment'&&!g.winner&&!confirm('切换为技能试验队并重新开始？'))return;document.querySelector('.result-overlay')?.remove();inspectedId=null;activeCatalog=null;activeTeam=null;rosterLabel=null;loadBattle(createGame(labCatalog,labCatalog.team,{victoryCondition:selectedGoal()}));useSkillLab=true;selected=null;feedback='技能试验队：顽石、冥守及4张测试卡。鼠标悬停或长按卡牌查看技能。';el('home').hidden=true;el('battle-screen').hidden=false;show();}catch(error){button.textContent='加载失败，点击重试';feedback=error.message;}finally{button.disabled=false;}
};

el('enter-cards').onclick=async()=>{const button=el('enter-cards');if(playing)return;button.disabled=true;try{const catalog=await loadPublishedCatalog();const preset=el('roster-preset').value;const team=(preset==='b'?catalog.teams[1]:catalog.teams[0])?.cards||catalog.teams[0].cards;const next=createGame(catalog,team,{victoryCondition:selectedGoal()});if(g.phase!=='deployment'&&!g.winner&&!confirm('开始新卡牌对局？当前进度将丢失。'))return;activeCatalog=catalog;activeTeam=team;useSkillLab=false;rosterLabel='第一批卡牌预设 '+preset.toUpperCase();loadBattle(next);g.log=[rosterLabel+' · '+catalog.version];selected=null;inspectedId=null;document.querySelector('.result-overlay')?.remove();feedback='鼠标悬停或长按双方卡牌查看技能。';el('home').hidden=true;el('battle-screen').hidden=false;show();}catch(e){button.textContent='加载失败，点击重试';feedback=e.message;}finally{button.disabled=false;}};

// Development playtest calls this explicit API; normal game never reads editor storage.
export function startConfiguredGame(snapshot){if(playing)throw Error('请等待表演结束');activeCatalog=structuredClone(snapshot.catalog);activeTeam=[...snapshot.team];useSkillLab=false;rosterLabel='开发端配置测试';loadBattle(createGame(activeCatalog,activeTeam,{victoryCondition:snapshot.victoryCondition||selectedGoal()}));el('victory-condition').value=g.victoryCondition;g.log=[rosterLabel+' · '+activeCatalog.version];selected=null;inspectedId=null;feedback='正在测试独立配置快照；不会修改正式卡牌。';document.querySelector('.result-overlay')?.remove();el('home').hidden=true;el('battle-screen').hidden=false;show();}

export function openAdventureBattle(battle,hooks){if(playing)throw Error('请等待战斗表演结束');adventureHooks=hooks;loadBattle(upgradeBattle(structuredClone(battle)));const screen=el('battle-screen');
 screen.style.setProperty('--level-texture',/^assets\/(?:[\w-]+\/)*[\w-]+\.(png|jpg|webp|svg)$/.test(g.background)?'url("'+g.background+'")':'url("assets/tabletop/leather.png")');
 screen.querySelector('h1').firstChild.textContent=g.title||'战术对决';
 rosterLabel=hooks.label||'PvE 单章 · 测试内容';selected=null;visual=null;effect=null;inspectedId=null;feedback='';document.querySelector('.result-overlay')?.remove();el('home').hidden=true;el('battle-screen').hidden=false;el('back-home').textContent='保存并返回地图';show();}
