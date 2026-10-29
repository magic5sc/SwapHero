import { victoryLabel } from './match-rules.mjs';
import { loadPublishedCatalog } from './release-loader.mjs';
import { canAttack } from './content.mjs';
import { artForUnit, makeSprite, makeAttackEffect, hydrateArt } from './art.mjs';
import { createGame, deploy, start, rearrange, move, endTurn, playAI } from './battle.mjs';
import { mustReinforce } from './formation.mjs';
const selectedGoal=()=>document.getElementById('victory-condition')?.value||'score_5';
let activeCatalog=null,activeTeam=null,rosterLabel=null;
let labCatalog=null, useSkillLab=false, inspectedId=null, skillPulses=new Map();
let g = createGame(), selected = null, feedback = '', animationPositions = [];
let drag = null, suppressClick = false, playing = false, visual = null, effect = null;
const el = id => document.getElementById(id);
const add = (parent, tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; parent.append(node); return node; };

function renderDetail(detail,chosen){ detail.replaceChildren(); if(chosen){ detail.append(makeSprite('detail-sprite',artForUnit(chosen)));add(detail,'h3','',chosen.name);add(detail,'p','', '攻击 '+chosen.attack+' · 生命 '+chosen.hp+' / '+chosen.maxHp);add(detail,'small','',chosen.disabled&&!canAttack(chosen)?'本回合无法攻击':(chosen.skills?.length?'技能已装配 · 外观为占位':'无技能')); for(const binding of chosen.skills||[]){add(detail,'p','skill-description',binding.definition.name+'：'+(binding.definition.passive==='armor'?'每次战斗伤害减少'+binding.definition.levels[binding.level].amount:binding.definition.passive==='agile'?'换入当回合可攻击':binding.definition.passive==='combat_damage_immunity'?'不受战斗伤害':binding.definition.rules.map(r=>(r.subject==='other_ally'?'其他己方单位':'自身')+({unit_enter:'进场时',unit_leave:'离场时',attack_declared:'宣布攻击时',before_damage:'将受伤时',damage_taken:'受到伤害时',healed:'获得治疗时',attack_end:'攻击阶段结束时',turn_end:'回合结束时'}[r.event]||r.event)+'，'+r.effects.map(e=>({self:'对自身',opposing_unit:'对对位敌人',other_allies:'对其他友方',lower_ally:'对下方友军',rear_ally:'对己方'+(e.field_position||'自身所在')+'战线后方备战单位',rear_enemy:'对敌方'+(e.field_position||'自身所在')+'战线后方备战单位'}[e.target]||'')+({heal:'恢复生命',deal_damage:'造成技能伤害',modify_attack:'攻击变化',swap_positions:'与下方友军换位'}[e.op]||e.op)+(e.amount?' '+binding.definition.levels[binding.level][e.amount]:'')+(e.duration==='battle'?'（本场永久）':'')+(e.target==='other_allies'?(e.zone==='any'?'（包含后备）':'（仅场上，不含后备）'):'')).join('，')).join('；')));}}else {add(detail,'p','','选择我方单位查看信息');}}
let press=null;
function hideCardInfo(){document.getElementById('card-popover')?.remove();}
function showCardInfo(id,anchor){
 const unit=(visual||g).units[id];if(!unit||drag?.active)return;
 hideCardInfo();const popup=add(document.body,'aside','card-popover');popup.id='card-popover';popup.setAttribute('role','tooltip');renderDetail(popup,unit);
 const rect=anchor.getBoundingClientRect(),box=popup.getBoundingClientRect();
 popup.style.left=Math.max(8,Math.min(rect.left,innerWidth-box.width-8))+'px';
 popup.style.top=Math.max(8,Math.min(rect.top-box.height-10>=8?rect.top-box.height-10:rect.bottom+10,innerHeight-box.height-8))+'px';
}
function beginInspect(e,id,anchor){
 if(e.pointerType==='mouse'||!id)return;
 clearTimeout(press?.timer);hideCardInfo();
 const pending={id:e.pointerId,x:e.clientX,y:e.clientY,timer:null};press=pending;
 pending.timer=setTimeout(()=>{if(press===pending){drag=null;showCardInfo(id,anchor);}},500);
}
document.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8){clearTimeout(press.timer);press=null;hideCardInfo();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.card'))hideCardInfo();},true);
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{clearTimeout(press?.timer);press=null;});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.card'))e.preventDefault();});
window.addEventListener('resize',hideCardInfo);window.addEventListener('scroll',hideCardInfo,true);
function card(side, p) {
  const view = visual || g; const id = view.sides[side].slots[p-1], u = view.units[id], isPlayer = side === 'player';
  const b = document.createElement(isPlayer ? 'button' : 'div');
  b.className = `card ${side} ${side==='ai'?'enemy':''} ${u ? '' : 'empty'} ${isPlayer && selected === p ? 'selected' : ''}`;
  if(isPlayer) { b.type='button'; b.dataset.position=p; b.disabled=(g.phase==='finished'||g.phase==='error')||playing; b.onclick=e=>e.preventDefault(); b.onpointerdown=e=>{beginInspect(e,id,b);beginDrag(e,p,b);};  if(animationPositions.includes(p)) b.classList.add('swap-arrival'); }
  if(u && u.hp===0) b.classList.add('pending-defeat'); if(effect?.lane===p && effect.side===side && effect.stage==='attack') b.classList.add('perform-attack'); if(effect?.lane===p && effect.side!==side && effect.hit){b.classList.add('perform-hit');add(b,'span','damage-float',`−${effect.damage}`);} const pos=add(b,'div','card-top'); add(pos,'span','pos',p<=3?String(p):`${p-3}后`); if(u?.disabled&&!canAttack(u))add(pos,'span','disabled-label','无法攻击');
  if(!u){add(b,'div','empty-mark','＋');add(b,'div','empty-label','空位置');b.setAttribute('aria-label',`${side==='player'?'我方':'对手'} ${p<=3?p+'号战场格':(p-3)+'号战线后方备战格'}，空位`);return b;}
  if(!isPlayer){b.tabIndex=0;b.onpointerdown=e=>beginInspect(e,id,b);}
  b.onpointerenter=e=>{if(e.pointerType==='mouse'&&!drag)showCardInfo(id,b);};
  b.onpointerleave=e=>{if(e.pointerType==='mouse')hideCardInfo();};
  b.onkeydown=e=>{if(e.key==='Escape')hideCardInfo();};

  if(skillPulses.has(id)){const delta=skillPulses.get(id);b.classList.add('skill-pulse');add(b,'span','damage-float',delta>0?'+'+delta:String(delta));}
  if(effect?.stage==='impact' && effect.hit && effect.lane===p && effect.side!==side && effect.attackEffect)b.append(makeAttackEffect(effect.attackEffect));
  b.dataset.unitId=id; const sprite=makeSprite('unit-sprite',artForUnit(u));sprite.dataset.instance=id;b.append(sprite);
  add(b,'div','card-name',u.name); add(b,'div','card-sub',(u.skills||[]).map(s=>s.definition.name).join(' · ')||'无技能');
  const stats=add(b,'div','stats');add(stats,'span','attack',`⚔ ${u.attack}`);add(stats,'span','health',`♥ ${u.hp} / ${u.maxHp}`);
  const track=add(b,'div','hp-track');const bar=add(track,'div','hp-fill');bar.style.width=`${Math.max(0,u.hp/u.maxHp*100)}%`;
  b.setAttribute('aria-label',`${isPlayer?'我方':'对手'} ${p<=3?p+'号战场格':(p-3)+'号战线后方备战格'} ${u.name} 攻击 ${u.attack} 生命 ${u.hp} / ${u.maxHp}${u.disabled&&!canAttack(u)?' 本回合无法攻击':''}`);return b;
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
  el('deployment-goal').value=view.victoryCondition;el('deployment-goal-wrap').hidden=g.phase!=='deployment'||playing;
  el('battle-goal').textContent='本局目标：'+victoryLabel(view.victoryCondition);
  el('victory-condition').disabled=playing;
  el('phase').textContent=g.error?'结算已暂停':playing ? '攻击表演中' : g.winner ? (g.winner==='player'?'我方胜利':'对手胜利') : g.phase==='deployment'?'布阵阶段':g.turn==='player'?'你的回合':'对手回合';
  el('ap').textContent=playing?'请稍候':g.winner?'对局结束':g.phase==='deployment'?'调整你的队伍':`行动点 ${g.actionPoints} / 2`;
  const required=g.phase==='action'&&g.turn==='player'&&mustReinforce(g.sides.player.slots,g.actionPoints);
  el('hint').textContent=g.winner?'本场对战结束，可重新开始。':g.phase==='deployment'?'拖拽我方卡牌调整位置，完成后点击完成布阵。':required?'请拖拽后备卡到前排空位补位。':'拖拽后备卡到前排替换；后备之间也可拖拽互换。悬停或长按查看详情。';
  el('feedback').textContent=g.error||feedback;
  const lanes=el('lanes');lanes.replaceChildren();for(const [side,label] of [['ai','对手战场'],['player','我方战场']]){const field=add(lanes,'div','field');add(field,'div','field-title',label);const row=add(field,'div','field-row');for(const p of [1,2,3])row.append(card(side,p));}
  for(const side of ['ai','player']){const container=el(side==='ai'?'enemy-bench':'player-bench');container.replaceChildren();for(let p=4;p<=6;p++)container.append(card(side,p));el(side==='ai'?'enemy-count':'reserve-count').textContent=`${g.sides[side].slots.slice(3).filter(Boolean).length} / 3`;}
  el('start').hidden=g.phase!=='deployment'||playing;el('end').hidden=playing||g.phase!=='action'||g.turn!=='player';el('end').disabled=required;el('cancel').hidden=selected===null||playing;el('reset').disabled=playing;
  document.querySelector('.notice').textContent=rosterLabel?rosterLabel+' · 外观仅为占位，卡牌效果按配置执行。':useSkillLab?'技能试验队 · 顽石、冥守与4张机制测试卡；外观仅为占位。':'测试版本 · 使用无技能占位卡；角色外观不代表正式卡牌能力。';
  if(g.winner&&!document.querySelector('.result-overlay')){const overlay=add(document.body,'div','result-overlay');overlay.dataset.winner=g.winner;add(overlay,'strong','',g.winner==='player'?'胜 利':'败 北');const close=add(overlay,'button','primary','返回战场');close.onclick=()=>{overlay.hidden=true;};}
  el('log').replaceChildren(...g.log.slice(-30).reverse().map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
}
function run(fn){try{fn();feedback='';}catch(e){feedback=e.message;}show();}
function performMove(a,p){const before=structuredClone(g);run(()=>{if(g.phase==='deployment')deploy(g,a,p);else if(a>=4&&p>=4)rearrange(g,'player',a,p);else move(g,'player',a,p);inspectedId=before.sides.player.slots[a-1];selected=null;animationPositions=[a,p];});skillPulses=new Map(Object.values(g.units).filter(u=>before.units[u.id]&&u.hp!==before.units[u.id].hp).map(u=>[u.id,u.hp-before.units[u.id].hp]));show();setTimeout(()=>{skillPulses.clear();if(!playing)show();},700);if(animationPositions.length)setTimeout(()=>{animationPositions=[];},500);}
el('start').onclick=()=>run(()=>{selected=null;start(g);});el('end').onclick=async()=>{
  if(playing)return; selected=null;const frames=[];let sim=structuredClone(g);
  try { endTurn(sim,'player',e=>frames.push(e));  }
  catch(e){feedback=e.message;show();return;}
  playing=true; const wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(const side of ['player','ai']) {
    if(side==='ai' && sim.phase==='action' && sim.turn==='ai'){ visual=structuredClone(sim);effect=null;show();el('phase').textContent='对手换人阶段';await wait(650);playAI(sim,e=>frames.push(e));const first=frames.find(x=>x.side==='ai');visual=first?structuredClone(first.before):structuredClone(sim);show();el('phase').textContent='对手换人阶段';await wait(650); }
    const group=frames.filter(x=>x.side===side); let ghosts=[];
    for(const f of group){
      visual=structuredClone(f.before);for(const x of ghosts){visual.sides[x.side].slots[x.pos]=x.id;visual.units[x.id]=structuredClone(x.unit);}
      const sequenceAttack=f.before.units[f.before.sides[side].slots[f.lane-1]]?.art?.character?.renderer==='sequence_builtin';
      effect={side,lane:f.lane,hit:false,stage:'attack'};show();await wait(sequenceAttack?640:360);
      const targetSide=side==='player'?'ai':'player', target=f.before.sides[targetSide].slots[f.lane-1];
      visual=structuredClone(f.after);for(const x of ghosts){visual.sides[x.side].slots[x.pos]=x.id;visual.units[x.id]=structuredClone(x.unit);}
      if(target && !f.after.sides[targetSide].slots[f.lane-1]){const unit=structuredClone(f.after.units[target]);visual.sides[targetSide].slots[f.lane-1]=target;ghosts.push({side:targetSide,pos:f.lane-1,id:target,unit});}
      effect={side,lane:f.lane,hit:!!target,stage:'impact',attackEffect:f.before.units[f.before.sides[side].slots[f.lane-1]]?.art?.attackEffect,damage:target?f.before.units[target].hp-f.after.units[target].hp:0};show();if(!target){document.body.classList.remove('score-shake');void document.body.offsetWidth;document.body.classList.add('score-shake');const fx=add(document.body,'div','score-burst','胜利点 +1');setTimeout(()=>fx.remove(),800);}await wait(sequenceAttack?600:500);
    }
    if(group.length && ghosts.length){ effect=null; show(); document.querySelectorAll('.pending-defeat').forEach(n=>n.classList.add('perform-defeat')); await wait(400); }
  }
  g=sim;visual=null;effect=null;playing=false;feedback='';show();
};el('reset').onclick=()=>{if(g.phase!=='deployment'&&!g.winner&&!confirm('确定重新开始？当前对局进度将丢失。'))return;document.querySelector('.result-overlay')?.remove();inspectedId=null;g=activeCatalog?createGame(activeCatalog,activeTeam,{victoryCondition:g.victoryCondition}):useSkillLab?createGame(labCatalog,labCatalog.team,{victoryCondition:g.victoryCondition}):createGame(null,null,{victoryCondition:g.victoryCondition});selected=null;feedback='';show();};el('cancel').onclick=()=>{selected=null;feedback='';show();};show();

function beginDrag(e,p,button){
  if(playing || e.button!==0 || (g.phase==='finished'||g.error) || !g.sides.player.slots[p-1] || (g.phase==='action' && p<4)) return;
  drag={id:e.pointerId,p,startX:e.clientX,startY:e.clientY,active:false,button,ghost:null};
  button.setPointerCapture(e.pointerId);
}
document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.active && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8){
    clearTimeout(press?.timer);press=null;hideCardInfo();drag.active=true; drag.ghost=drag.button.cloneNode(true); drag.ghost.className='card player drag-ghost'; drag.ghost.removeAttribute('id'); document.body.append(drag.ghost); drag.button.classList.add('drag-source');
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
el('back-home').onclick=()=>{if(playing)return;el('battle-screen').hidden=true;el('home').hidden=false;};
el('help-toggle').onclick=()=>{el('help').hidden=!el('help').hidden;el('help-toggle').setAttribute('aria-expanded',String(!el('help').hidden));};

hydrateArt();

// Explicit laboratory roster; original card definitions are never silently completed.
if(el('enter-skill-lab'))el('enter-skill-lab').onclick=async()=>{
 const button=el('enter-skill-lab');if(playing)return;button.disabled=true;
 try{if(!labCatalog){const response=await fetch('data/skill-lab.json');if(!response.ok)throw Error('技能配置读取失败');labCatalog=await response.json();}if(g.phase!=='deployment'&&!g.winner&&!confirm('切换为技能试验队并重新开始？'))return;document.querySelector('.result-overlay')?.remove();inspectedId=null;activeCatalog=null;activeTeam=null;rosterLabel=null;g=createGame(labCatalog,labCatalog.team,{victoryCondition:selectedGoal()});useSkillLab=true;selected=null;feedback='技能试验队：顽石、冥守及4张测试卡。鼠标悬停或长按卡牌查看技能。';el('home').hidden=true;el('battle-screen').hidden=false;show();}catch(error){button.textContent='加载失败，点击重试';feedback=error.message;}finally{button.disabled=false;}
};

el('enter-cards').onclick=async()=>{const button=el('enter-cards');if(playing)return;button.disabled=true;try{const catalog=await loadPublishedCatalog();const preset=el('roster-preset').value;const team=(preset==='b'?catalog.teams[1]:catalog.teams[0])?.cards||catalog.teams[0].cards;const next=createGame(catalog,team,{victoryCondition:selectedGoal()});if(g.phase!=='deployment'&&!g.winner&&!confirm('开始新卡牌对局？当前进度将丢失。'))return;activeCatalog=catalog;activeTeam=team;useSkillLab=false;rosterLabel='第一批卡牌预设 '+preset.toUpperCase();g=next;g.log=[rosterLabel+' · '+catalog.version];selected=null;inspectedId=null;document.querySelector('.result-overlay')?.remove();feedback='鼠标悬停或长按双方卡牌查看技能。';el('home').hidden=true;el('battle-screen').hidden=false;show();}catch(e){button.textContent='加载失败，点击重试';feedback=e.message;}finally{button.disabled=false;}};

// Development playtest calls this explicit API; normal game never reads editor storage.
export function startConfiguredGame(snapshot){if(playing)throw Error('请等待表演结束');activeCatalog=structuredClone(snapshot.catalog);activeTeam=[...snapshot.team];useSkillLab=false;rosterLabel='开发端配置测试';g=createGame(activeCatalog,activeTeam,{victoryCondition:snapshot.victoryCondition||selectedGoal()});el('victory-condition').value=g.victoryCondition;g.log=[rosterLabel+' · '+activeCatalog.version];selected=null;inspectedId=null;feedback='正在测试独立配置快照；不会修改正式卡牌。';document.querySelector('.result-overlay')?.remove();el('home').hidden=true;el('battle-screen').hidden=false;show();}
