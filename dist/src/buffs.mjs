// Serializable unit-owned states. Definitions are captured with the granted state.
export const buffActive=(b,position)=>b.definition.active_zone==='any'||(b.definition.active_zone==='battlefield'?position<=3:position>3);
export const buffLayers=(u,id)=> (u.buffs||[]).filter(b=>b.id===id).reduce((n,b)=>n+b.stacks,0);
export function buffValue(u,kind,position=u.position??1){return (u.buffs||[]).filter(b=>b.definition.kind===kind&&buffActive(b,position)).reduce((n,b)=>n+b.value*b.stacks,0);}
export function syncBuffs(u){
 u.baseAttack??=u.attack;u.attack=Math.max(0,u.baseAttack+(u.modifiers||[]).reduce((n,m)=>n+m.amount,0)+buffValue(u,'attack'));
 if(u.buffs?.some(b=>b.definition.kind==='shield')||u.buffShield!==undefined){u.buffShield=(u.buffs||[]).filter(b=>b.definition.kind==='shield'&&buffActive(b,u.position??1)).reduce((n,b)=>n+b.remainingShield,0);}
}
export function grantBuff(u,definition,{source,skillId,value,stacks=1,level=1,definitions={}}){
 u.buffs??=[];const scope=definition.scope;
 let b=definition.stacking==='independent'?null:u.buffs.find(b=>b.id===definition.id&&(scope==='buff'||b.source===source&&b.skillId===skillId));
 const fresh=!b;
 if(b&&b.stacks>=definition.max_stacks&&definition.overflow==='reject')return false;
 if(!b){u.buffSerial=(u.buffSerial||0)+1;b={instanceId:u.buffSerial,id:definition.id,definition:structuredClone(definition),source,skillId,value,stacks:0,level,definitions:structuredClone(definitions)};u.buffs.push(b);}
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
 return true;
}
export function removeBuff(u,id,layers){
 let left=layers;for(const b of u.buffs||[])if(b.id===id&&left>0){const n=Math.min(b.stacks,left);b.stacks-=n;left-=n;if(b.definition.kind==='shield')b.remainingShield=Math.min(b.remainingShield,b.value*b.stacks);}
 u.buffs=(u.buffs||[]).filter(b=>b.stacks>0);syncBuffs(u);
}
export function consumeShield(u,damage){
 let left=damage;for(const b of u.buffs||[])if(b.definition.kind==='shield'&&buffActive(b,u.position??1)){const n=Math.min(left,b.remainingShield);b.remainingShield-=n;left-=n;}
 const legacy=Math.min(left,u.shield||0);if(legacy)u.shield-=legacy;left-=legacy;syncBuffs(u);return damage-left;
}
export function leaveBuffs(u){u.buffs=(u.buffs||[]).filter(b=>b.definition.leave!=='remove');syncBuffs(u);}
export function expireBuffs(u,{ownerEnd=false,turnEnd=false}={}){
 for(const b of u.buffs||[])if(ownerEnd&&b.definition.duration==='owner_turns'&&!(u.position>3&&b.definition.leave==='pause'))b.remaining--;
 u.buffs=(u.buffs||[]).filter(b=>!(turnEnd&&b.definition.duration==='turn')&&!(b.definition.duration==='owner_turns'&&b.remaining<=0));syncBuffs(u);
}
