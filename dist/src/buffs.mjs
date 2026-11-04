// Serializable unit-owned states. Definitions are captured with the granted state.
export const buffActive=(b,position)=>b.definition.active_zone==='any'||(b.definition.active_zone==='battlefield'?position<=3:position>3);
export const buffLayers=(u,id)=> (u.buffs||[]).filter(b=>b.id===id).reduce((n,b)=>n+b.stacks,0);
export function buffValue(u,kind,position=u.position??1){return (u.buffs||[]).filter(b=>b.definition.kind===kind&&buffActive(b,position)).reduce((n,b)=>n+b.value*b.stacks,0);}
export function syncBuffs(u){
 u.baseAttack??=u.attack;u.attack=Math.max(0,u.baseAttack+(u.modifiers||[]).reduce((n,m)=>n+m.amount,0)+buffValue(u,'attack'));
 if(u.buffs?.some(b=>b.definition.kind==='shield')||u.buffShield!==undefined){u.buffShield=(u.buffs||[]).filter(b=>b.definition.kind==='shield'&&buffActive(b,u.position??1)).reduce((n,b)=>n+b.remainingShield,0);}
}
export function grantBuff(u,definition,{source,skillId,value,stacks=1}){
 u.buffs??=[];const scope=definition.scope;
 let b=definition.stacking==='independent'?null:u.buffs.find(b=>b.id===definition.id&&(scope==='buff'||b.source===source&&b.skillId===skillId));
 if(!b){b={id:definition.id,definition:structuredClone(definition),source,skillId,value,stacks:0};u.buffs.push(b);}
 if(definition.stacking==='max'){b.value=Math.max(b.value,value);b.stacks=Math.max(b.stacks,stacks);}else{b.value=value;b.stacks=definition.stacking==='add'?b.stacks+stacks:stacks;}
 b.stacks=Math.min(definition.max_stacks,b.stacks);
 if(definition.duration==='owner_turns')b.remaining=definition.turns;
 if(definition.kind==='shield')b.remainingShield=b.value*b.stacks;
 syncBuffs(u);
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
