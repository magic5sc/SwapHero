// Serializable unit-owned states. Definitions are captured with the granted state.
export const BUFF_EVENTS=['buff_added','buff_reapplied','buff_stack_changed','buff_overflow','buff_expired','buff_removed','buff_shield_depleted'];
const emit=(notify,type,b,extra={})=>notify?.(type,structuredClone(b),extra);
export const buffActive=(b,position)=>b.definition.active_zone==='any'||(b.definition.active_zone==='battlefield'?position<=3:position>3);
export const buffLayers=(u,id)=> (u.buffs||[]).filter(b=>b.id===id).reduce((n,b)=>n+b.stacks,0);
export function buffValue(u,kind,position=u.position??1){return (u.buffs||[]).filter(b=>b.definition.kind===kind&&buffActive(b,position)).reduce((n,b)=>n+b.value*b.stacks,0);}
export function syncBuffs(u){
 u.baseAttack??=u.attack;u.attack=Math.max(0,u.baseAttack+(u.modifiers||[]).reduce((n,m)=>n+m.amount,0)+buffValue(u,'attack'));
 if(u.buffs?.some(b=>b.definition.kind==='shield')||u.buffShield!==undefined){u.buffShield=(u.buffs||[]).filter(b=>b.definition.kind==='shield'&&buffActive(b,u.position??1)).reduce((n,b)=>n+b.remainingShield,0);}
}
export function grantBuff(u,definition,{source,skillId,value,stacks=1,definitions={},notify}){
 u.buffs??=[];const scope=definition.scope;
 let b=definition.stacking==='independent'?null:u.buffs.find(b=>b.id===definition.id&&(scope==='buff'||b.source===source&&b.skillId===skillId));
 const fresh=!b;
 const full=!!b&&b.stacks>=definition.max_stacks;
 if(full)emit(notify,'buff_overflow',b,{attemptedStacks:stacks,rejected:definition.overflow==='reject'});
 if(full&&definition.overflow==='reject')return false;
 if(!b){u.buffSerial=(u.buffSerial||0)+1;b={instanceId:u.buffSerial,id:definition.id,definition:structuredClone(definition),source,skillId,value,stacks:0,definitions:structuredClone(definitions)};u.buffs.push(b);}
 const oldStacks=b.stacks,oldShield=b.remainingShield||0;
 const policy=definition.value_policy||(definition.stacking==='max'?'max':'replace');
 if(!fresh)b.value=policy==='keep'?b.value:policy==='max'?Math.max(b.value,value):policy==='min'?Math.min(b.value,value):value;
 b.stacks=definition.stacking==='max'?Math.max(b.stacks,stacks):definition.stacking==='add'?b.stacks+stacks:stacks;
 b.stacks=Math.min(definition.max_stacks,b.stacks);
 if(definition.duration==='owner_turns'&&(fresh||definition.duration_refresh!=='keep'))b.remaining=definition.turns;
 if(definition.kind==='shield'){
  const capacity=b.value*b.stacks,policy=definition.shield_refresh||'reset';
  const gained=definition.stacking==='add'?b.stacks-oldStacks:Math.min(stacks,definition.max_stacks);
  b.remainingShield=fresh||policy==='reset'?capacity:Math.min(capacity,oldShield+(policy==='add'?Math.max(0,value*gained):0));
 }
 syncBuffs(u);
 emit(notify,fresh?'buff_added':'buff_reapplied',b,{previousStacks:oldStacks});
 if(b.stacks!==oldStacks)emit(notify,'buff_stack_changed',b,{previousStacks:oldStacks});
 return true;
}
export function removeBuff(u,id,layers,{notify,reason='dispelled'}={}){
 const changes=[];let left=layers;for(const b of u.buffs||[])if(b.id===id&&left>0){const before=b.stacks,n=Math.min(b.stacks,left);b.stacks-=n;left-=n;if(b.definition.kind==='shield')b.remainingShield=Math.min(b.remainingShield,b.value*b.stacks);changes.push([b,before]);}
 u.buffs=(u.buffs||[]).filter(b=>b.stacks>0);syncBuffs(u);
 for(const [b,previousStacks] of changes){emit(notify,'buff_stack_changed',b,{previousStacks,reason});if(!b.stacks)emit(notify,'buff_removed',b,{previousStacks,reason});}
}
export function consumeShield(u,damage,{notify}={}){
 const depleted=[];let left=damage;for(const b of u.buffs||[])if(b.definition.kind==='shield'&&buffActive(b,u.position??1)){const n=Math.min(left,b.remainingShield);b.remainingShield-=n;left-=n;if(n>0&&b.remainingShield===0)depleted.push(b);}
 const legacy=Math.min(left,u.shield||0);if(legacy)u.shield-=legacy;left-=legacy;syncBuffs(u);for(const b of depleted)emit(notify,'buff_shield_depleted',b);return damage-left;
}
function discardBuffs(u,predicate,reason,notify){
 const removed=(u.buffs||[]).filter(predicate);u.buffs=(u.buffs||[]).filter(b=>!removed.includes(b));syncBuffs(u);
 for(const b of removed){const previousStacks=b.stacks;b.stacks=0;emit(notify,'buff_stack_changed',b,{previousStacks,reason});if(reason==='expired')emit(notify,'buff_expired',b,{previousStacks,reason});emit(notify,'buff_removed',b,{previousStacks,reason});}
}
export function leaveBuffs(u,{notify}={}){discardBuffs(u,b=>b.definition.leave==='remove','leave',notify);}
export function expireBuffs(u,{ownerEnd=false,turnEnd=false,notify}={}){
 for(const b of u.buffs||[])if(ownerEnd&&b.definition.duration==='owner_turns'&&!(u.position>3&&b.definition.leave==='pause'))b.remaining--;
 discardBuffs(u,b=>turnEnd&&b.definition.duration==='turn'||b.definition.duration==='owner_turns'&&b.remaining<=0,'expired',notify);
}
