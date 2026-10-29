import {reserveBehind,SLOT_COUNT} from './formation.mjs';
import {damageAmount} from './content.mjs';
export const otherSide=side=>side==='player'?'ai':'player';
export function locate(g,id){for(const side of ['player','ai']){const index=g.sides[side].slots.indexOf(id);if(index>=0)return {side,position:index+1};}return null;}
const alive=(g,id)=>!!g.units[id]&&g.units[id].hp>0;
export function updateAttack(unit){unit.baseAttack??=unit.attack;unit.attack=Math.max(0,unit.baseAttack+(unit.modifiers||[]).reduce((sum,m)=>sum+m.amount,0));}
export function expireModifiers(g,duration,unitId=null){for(const u of Object.values(g.units)){if(unitId&&u.id!==unitId)continue;if(u.modifiers){u.modifiers=u.modifiers.filter(m=>m.duration!==duration);updateAttack(u);}}}
export function updateState(g){
 for(const side of ['player','ai'])for(let i=0;i<SLOT_COUNT;i++){const id=g.sides[side].slots[i];if(id&&!alive(g,id)){if(g.mode==='pve')collectEvent(g,{type:'unit_defeated',unit:id,side,position:i+1});g.sides[side].slots[i]=null;g.log.push(`${g.units[id].name} 被击溃`);}}
 if(g.mode==='pve')return;
 const empty=['player','ai'].filter(side=>!g.sides[side].slots.some(id=>id&&alive(g,id)));
 if(empty.length===1)g.winner=otherSide(empty[0]);
 if(empty.length===2){g.error='双方同时全灭的裁决尚未确认，暂停对局';g.phase='error';}
 if(g.winner)g.phase='finished';
}
function targets(g,ownerId,event,effect){
 const owner=locate(g,ownerId),anchor=owner?.position<=3?owner:(event.unit===ownerId?{side:event.side,position:event.position}:null);
 if(effect.target==='all_enemies')return (g.sides[otherSide(owner?.side||event.side)]?.slots||[]).filter((id,i)=>id&&(effect.zone==='any'||i<3));
 if(effect.target==='self')return [ownerId];
 if(effect.target==='other_allies')return (g.sides[owner?.side||event.side]?.slots||[]).filter((id,i)=>id&&id!==ownerId&&(effect.zone==='any'||i<3));
 if(!anchor||anchor.position>3)return [];
 if(['rear_ally','rear_enemy'].includes(effect.target)) {
  const fieldPosition=effect.field_position??anchor.position;
  const side=effect.target==='rear_enemy'?otherSide(anchor.side):anchor.side;
  return [g.sides[side].slots[reserveBehind(fieldPosition)-1]].filter(Boolean);
 }
 if(effect.target==='opposing_unit')return [g.sides[otherSide(anchor.side)].slots[anchor.position-1]].filter(Boolean);
 if(effect.target==='lower_ally')return [g.sides[anchor.side].slots[anchor.position%3]].filter(Boolean);
 return [];
}
// Capture listeners and targets when the signal occurs, before death cleanup.
// Push non-active side 6→1, active side 6→1; reverse skill/rule list order.
export function collectEvent(g,event){
 g.stack??=[];g.trace??=[];g.trace.push({type:'event',...event});
 const order=[otherSide(g.turn),g.turn];
 for(const side of order)for(let position=SLOT_COUNT;position>=1;position--){
  const id=g.sides[side].slots[position-1];if(!id)continue;
  const field=position<=3,ownExit=event.type==='unit_leave'&&event.unit===id;
  if(!field&&!ownExit)continue;
  if(!alive(g,id)&&!(['damage_taken','unit_defeated'].includes(event.type)&&event.unit===id))continue;
  const skills=g.units[id].skills||[];
  for(let si=skills.length-1;si>=0;si--){const binding=skills[si],definition=binding.definition;
   for(let ri=definition.rules.length-1;ri>=0;ri--){const rule=definition.rules[ri];
    if(rule.event!==event.type)continue;
    if(rule.subject==='self'&&event.unit!==id)continue;
    if(rule.subject==='other_ally'&&(event.side!==side||event.unit===id))continue;
    g.stack.push({source:id,side,skillId:definition.skill_id,name:definition.name,level:binding.level,position,skillIndex:si,ruleIndex:ri,effects:rule.effects.map(e=>({...structuredClone(e),value:e.amount===null?null:definition.levels[binding.level][e.amount],targets:targets(g,id,event,e)}))});
   }
  }
 }
}
// One simultaneous batch is sorted by listener ownership, not signal subject.
export function collectEvents(g,events){
 g.stack??=[];const start=g.stack.length;
 for(const event of events)collectEvent(g,event);
 const jobs=g.stack.splice(start);jobs.sort((a,b)=>(a.side===g.turn?1:0)-(b.side===g.turn?1:0)||b.position-a.position||b.skillIndex-a.skillIndex||b.ruleIndex-a.ruleIndex);
 g.stack.push(...jobs);
}
export function collectPhase(g,type){
 const events=[];for(const side of [otherSide(g.turn),g.turn])for(let position=3;position>=1;position--){const unit=g.sides[side].slots[position-1];if(unit)events.push({type,unit,side,position,activeSide:g.turn});}
 collectEvents(g,events);
}
export function applyDamage(g,sourceId,targetId,amount,type='skill'){
 const where=locate(g,targetId);if(!where||!alive(g,targetId))return 0;
 const u=g.units[targetId],actual=Math.min(u.hp,damageAmount(u,amount,type));u.hp-=actual;
 if(actual>0)collectEvent(g,{type:'damage_taken',unit:targetId,side:where.side,position:where.position,source:sourceId,amount:actual,damageType:type});
 updateState(g);return actual;
}
function execute(g,job,e){
 for(const id of e.targets){if(g.winner||g.error)break;const where=locate(g,id);if(!where||!alive(g,id)||(e.zone==='battlefield'&&where.position>3)||(e.zone==='bench'&&where.position<=3))continue;
  const u=g.units[id];
  if(e.op==='heal'){const actual=Math.min(e.value,u.maxHp-u.hp);u.hp+=actual;g.log.push(`${job.name}：${u.name} 恢复 ${actual} 生命`);if(actual>0)collectEvent(g,{type:'healed',unit:id,side:where.side,position:where.position,source:job.source,amount:actual});}
  else if(e.op==='deal_damage'){const actual=applyDamage(g,job.source,id,e.value,'skill');g.log.push(`${job.name}：${u.name} 受到 ${actual} 技能伤害`);}
  else if(e.op==='modify_attack'){u.baseAttack??=u.attack;u.modifiers??=[];u.modifiers.push({source:job.source,skillId:job.skillId,amount:e.value,duration:e.duration});updateAttack(u);g.log.push(`${job.name}：${u.name} 攻击 ${e.value>=0?'+':''}${e.value}`);}
  else if(e.op==='swap_positions'){const source=locate(g,job.source);if(!source||source.side!==where.side||source.position>3||where.position>3||!alive(g,job.source))continue;const slots=g.sides[source.side].slots;[slots[source.position-1],slots[where.position-1]]=[slots[where.position-1],slots[source.position-1]];g.log.push(`${job.name}：${source.position} 与 ${where.position} 号位交换`);}
  updateState(g);
 }
}
export function settleOutcome(g){
 if(g.mode!=='pve'||g.error||g.stack?.length)return;
 const living=side=>g.sides[side].slots.some(id=>id&&g.units[id].hp>0);
 if(!living('player'))g.winner='ai';else if(!living('ai'))g.winner='player';
 if(g.winner)g.phase='finished';
}
export function drainStack(g){
 g.stack??=[];let resolved=0;
 while(g.stack.length&&!g.winner&&!g.error){
  if(++resolved>256){g.error='技能触发链超过256项，疑似循环；已暂停，请重新开始并检查配置';g.phase='error';g.log.push(g.error);break;}
  const job=g.stack.pop();g.trace??=[];g.trace.push({type:'resolve',source:job.source,skillId:job.skillId});g.log.push(`✦ ${g.units[job.source]?.name||job.source} · ${job.name}`);
  for(const e of job.effects){execute(g,job,e);if(g.winner||g.error)break;}
 }
 settleOutcome(g);
 if(g.winner)g.stack=[];
}
