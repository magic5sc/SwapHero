import {BUFF_EVENTS,buffActive,buffLayers,grantBuff,removeBuff,consumeShield,syncBuffs,expireBuffs,leaveBuffs} from './buffs.mjs';
import {reserveBehind,SLOT_COUNT} from './formation.mjs';
import {damageAmount} from './content.mjs';
export const otherSide=side=>side==='player'?'ai':'player';
export function locate(g,id){for(const side of ['player','ai']){const index=g.sides[side].slots.indexOf(id);if(index>=0)return {side,position:index+1};}return null;}
const alive=(g,id)=>!!g.units[id]&&g.units[id].hp>0;
export function updateAttack(unit){syncBuffs(unit);}
export function refreshPositions(g){for(const side of ['player','ai'])g.sides[side].slots.forEach((id,i)=>{if(id){g.units[id].position=i+1;syncBuffs(g.units[id]);}});}
// Collect lifecycle notifications after one atomic state change. No callback is
// stored in a save. Reverse insertion preserves notification order on the stack.
function mutateBuff(g,u,change){
 const events=[];const value=change((type,b,extra)=>events.push({type,b,extra}));
 const where=locate(g,u.id);if(where)for(const {type,b,extra} of events.reverse())collectEvent(g,{type,unit:u.id,...where,buffId:b.id,buffInstanceId:b.instanceId,...extra},{buff:b});
 return value;
}
export function onLeave(g,id){mutateBuff(g,g.units[id],notify=>leaveBuffs(g.units[id],{notify}));}
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
 if(effect.target==='front_sides'){if(!anchor)return [];return [anchor.position-1,anchor.position+1].filter(p=>p>=1&&p<=3).map(p=>g.sides[otherSide(anchor.side)].slots[p-1]).filter(Boolean);}
 if(effect.target==='all_allies')return (g.sides[owner?.side||event.side]?.slots||[]).filter((id,i)=>id&&(effect.zone==='any'||(effect.zone==='bench'?i>=3:i<3)));
 if(effect.target==='all_enemies')return (g.sides[otherSide(owner?.side||event.side)]?.slots||[]).filter((id,i)=>id&&(effect.zone==='any'||(effect.zone==='bench'?i>=3:i<3)));
 if(effect.target==='self')return [ownerId];
 if(effect.target==='other_allies')return (g.sides[owner?.side||event.side]?.slots||[]).filter((id,i)=>id&&id!==ownerId&&(effect.zone==='any'||(effect.zone==='bench'?i>=3:i<3)));
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
// Capture event context and level when triggered; each result reads current grid occupants.
// Push non-active side 6→1, active side 6→1; reverse skill/rule list order.
export function collectEvent(g,event,{buff:changedBuff}={}){
 if(BUFF_EVENTS.includes(event.type)&&!changedBuff)return;
 g.stack??=[];g.trace??=[];g.trace.push({type:'event',...event});
 const order=[otherSide(g.turn),g.turn];
 for(const side of order)for(let position=SLOT_COUNT;position>=1;position--){
  const id=g.sides[side].slots[position-1];if(!id)continue;
  if(changedBuff&&event.unit!==id)continue;
  const field=position<=3,ownExit=event.type==='unit_leave'&&event.unit===id;

  if(!alive(g,id)&&!(['damage_taken','unit_defeated'].includes(event.type)&&event.unit===id))continue;
  // Skills first, then Buff instances in acquisition order. One listener per
  // merged instance, not per stack; independent instances each get a listener.
  const asBinding=b=>({buff:b,definition:{skill_id:b.skillId,name:b.definition.name,values:b.definition.values||b.definition.levels?.[b.level||1]||{},rules:b.definition.rules,buffs:b.definitions||{}}});
  const skills=changedBuff?(changedBuff.definition.rules?.length?[asBinding(changedBuff)]:[]):[...(g.units[id].skills||[]),...(g.units[id].buffs||[]).filter(b=>b.definition.rules?.length&&buffActive(b,ownExit?event.position:position)).map(asBinding)];
  for(let si=skills.length-1;si>=0;si--){const binding=skills[si],definition=binding.definition;
   for(let ri=definition.rules.length-1;ri>=0;ri--){const rule=definition.rules[ri];
    if(rule.event!==event.type)continue;
    const zone=rule.active_zone||definition.active_zone||'battlefield';
    if(zone!=='any'&&(zone==='battlefield'?!field&&!ownExit:field||ownExit))continue;
    if(rule.turn&&rule.turn!=='any'&&((event.activeSide||g.turn)===side)!==(rule.turn==='own'))continue;
    if(rule.entry&&rule.entry!=='any'&&(event.exchange?'exchange':'reinforce')!==rule.entry)continue;
    if(rule.damageType&&rule.damageType!=='any'&&event.damageType!==rule.damageType)continue;
    if(rule.removalReason&&rule.removalReason!=='any'&&event.reason!==rule.removalReason)continue;
    if((rule.conditions||[]).some(c=>{const n=changedBuff&&c.buff===changedBuff.id?changedBuff.stacks:buffLayers(g.units[id],c.buff);return !(c.compare==='gte'?n>=c.layers:c.compare==='eq'?n===c.layers:n<c.layers);}))continue;
    if(rule.exchangeOnly&&!event.exchange)continue;
    if(rule.subject==='self'&&event.unit!==id)continue;
    if(rule.subject==='other_ally'&&(event.side!==side||event.unit===id))continue;
    const key=definition.skill_id+':'+ri;
    if(rule.every){const counters=g.units[id].triggerCounts??={};counters[key]=(counters[key]||0)+1;if(counters[key]%rule.every)continue;}
    const pending=rule.delayOwnTurns!==undefined;
    const queue=pending?(g.pendingEffects??=[]):g.stack;
    if(pending)g.log.push(`${g.units[id].name} · ${definition.name}：蓄力，将在保留行动机会后生效`);
    const values=definition.values||definition.levels[binding.level];
    queue.push({...(pending?{due:(g.sideTurns?.[side]||0)+rule.delayOwnTurns+1}:{}),source:id,instigator:binding.buff?.source||id,buffId:binding.buff?.id,buffInstanceId:binding.buff?.instanceId,buffs:structuredClone(definition.buffs||{}),side,skillId:definition.skill_id,name:definition.name,event:structuredClone(event),level:binding.level,position,skillIndex:si,ruleIndex:ri,effects:rule.effects.map(e=>({...structuredClone(e),value:e.amount===null?null:values[e.amount],grid:true}))});
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
 const events=[];for(const side of [otherSide(g.turn),g.turn])for(let position=SLOT_COUNT;position>=1;position--){const unit=g.sides[side].slots[position-1];if(unit)events.push({type,unit,side,position,activeSide:g.turn});}
 collectEvents(g,events);
}
export function applyDamage(g,sourceId,targetId,amount,type='skill'){
 const where=locate(g,targetId);if(!where||!alive(g,targetId))return 0;
 const u=g.units[targetId];let damage=damageAmount(u,amount,type);
 const absorbed=type==='health_loss'?0:mutateBuff(g,u,notify=>consumeShield(u,damage,{notify}));if(absorbed){damage-=absorbed;g.log.push(`${u.name} 护盾吸收 ${absorbed} 伤害`);}
 const actual=Math.min(u.hp,damage);u.hp-=actual;
 if(actual>0)collectEvent(g,{type:'damage_taken',unit:targetId,side:where.side,position:where.position,source:sourceId,amount:actual,damageType:type});
 updateState(g);return actual;
}
function execute(g,job,e){
 refreshPositions(g);
 const chosen=e.grid?targets(g,job.source,job.event||{unit:job.source,side:job.side,position:job.position},e):e.targets;
 for(const id of chosen){if(g.winner||g.error)break;const where=locate(g,id);if(!where||!alive(g,id)||(e.zone==='battlefield'&&where.position>3)||(e.zone==='bench'&&where.position<=3))continue;
  const u=g.units[id];
  if(e.op==='apply_buff'){const definition=job.buffs?.[e.buff.id]||e.buff;const applied=mutateBuff(g,u,notify=>grantBuff(u,definition,{source:job.instigator||job.source,skillId:job.skillId,value:e.value,stacks:e.stacks,definitions:job.buffs||{},notify}));g.log.push(applied?`${u.name} 获得 ${definition.name} ${e.stacks}层`:`${u.name} 的 ${definition.name} 已满层，本次施加被拒绝`);}
  else if(e.op==='remove_buff'){mutateBuff(g,u,notify=>removeBuff(u,e.buff.id,e.value,{notify}));g.log.push(`${u.name} 移除 ${e.buff.name} ${e.value}层`);}
  else if(e.op==='heal'){const actual=Math.min(e.value,u.maxHp-u.hp);u.hp+=actual;g.log.push(`${job.name}：${u.name} 恢复 ${actual} 生命`);if(actual>0)collectEvent(g,{type:'healed',unit:id,side:where.side,position:where.position,source:job.instigator||job.source,amount:actual});}
  else if(e.op==='deal_damage'){const actual=applyDamage(g,job.instigator||job.source,id,e.value,'skill');g.log.push(`${job.name}：${u.name} 受到 ${actual} 技能伤害`);}
  else if(e.op==='modify_attack'){u.baseAttack??=u.attack;u.modifiers??=[];if(e.refresh)u.modifiers=u.modifiers.filter(m=>m.source!==job.source||m.skillId!==job.skillId);u.modifiers.push({source:job.source,skillId:job.skillId,amount:e.value,duration:e.duration,...(e.duration==='owner_turns'?{remaining:e.turns}: {})});updateAttack(u);g.log.push(`${job.name}：${u.name} 攻击 ${e.value>=0?'+':''}${e.value}`);}
  else if(e.op==='set_shield'){u.shield=e.value;g.log.push(`${job.name}：${u.name} 护盾刷新至 ${e.value}`);}
  else if(e.op==='swap_positions'){const source=locate(g,job.source);if(!source||source.side!==where.side||source.position>3||where.position>3||!alive(g,job.source))continue;const slots=g.sides[source.side].slots;[slots[source.position-1],slots[where.position-1]]=[slots[where.position-1],slots[source.position-1]];g.log.push(`${job.name}：${source.position} 与 ${where.position} 号位交换`);}
  refreshPositions(g);updateState(g);
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
  const job=g.stack.pop();g.trace??=[];g.trace.push({type:'resolve',source:job.source,skillId:job.skillId,...(job.buffId?{buffId:job.buffId,buffInstanceId:job.buffInstanceId,instigator:job.instigator}:{})});g.log.push(`✦ ${g.units[job.source]?.name||job.source} · ${job.name}`);
  for(const e of job.effects){execute(g,job,e);if(g.winner||g.error)break;}
 }
 settleOutcome(g);
 if(g.winner)g.stack=[];
}

// Serializable timers are advanced by the rules, never by animation.
export function finishOwnerTurn(g,side){
 for(const id of g.sides[side].slots.filter(Boolean)){
  const u=g.units[id];mutateBuff(g,u,notify=>expireBuffs(u,{ownerEnd:true,notify}));for(const m of u.modifiers||[])if(m.duration==='owner_turns')m.remaining--;
  u.modifiers=(u.modifiers||[]).filter(m=>m.duration!=='owner_turns'||m.remaining>0);updateAttack(u);
 }
}
export function beginOwnerTurn(g,side){
 refreshPositions(g);collectPhase(g,'turn_start');drainStack(g);
 g.sideTurns??={player:0,ai:0};g.sideTurns[side]++;
 const due=(g.pendingEffects||[]).filter(j=>j.side===side&&j.due<=g.sideTurns[side]);
 g.pendingEffects=(g.pendingEffects||[]).filter(j=>!due.includes(j));
 for(const job of due)if(alive(g,job.source)&&locate(g,job.source)?.position<=3)g.stack.push(job);
 drainStack(g);
}
export function unitStatus(g,u){
 const tags=[];const shield=(u.shield||0)+(u.buffShield||0);if(shield>0)tags.push('护盾 '+shield);
 for(const b of u.buffs||[])if(b.definition.kind!=='shield')tags.push(b.definition.name+' '+b.stacks+'层'+(b.remaining!==undefined?' / 剩'+b.remaining+'己方回合':''));
 for(const m of u.modifiers||[])if(m.duration==='owner_turns')tags.push('加攻剩 '+m.remaining+' 己方回合');
 for(const b of u.skills||[])for(const [i,r] of b.definition.rules.entries())if(r.every)tags.push('受伤计数 '+((u.triggerCounts?.[b.definition.skill_id+':'+i]||0)%r.every)+'/'+r.every);
 for(const j of g.pendingEffects||[])if(j.source===u.id)tags.push('蓄力：保留 '+Math.max(0,j.due-(g.sideTurns?.[j.side]||0)-1)+' 次己方回合后攻击＋'+j.effects.map(e=>e.value).join('/'));
 return tags.join(' · ');
}

export function finishBuffTurn(g){for(const u of Object.values(g.units))mutateBuff(g,u,notify=>expireBuffs(u,{turnEnd:true,notify}));}
