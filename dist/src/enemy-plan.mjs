import {buffActive,buffLayers} from './buffs.mjs';

// A plan is data, bound to identities AND positions. It is never recalculated
// during the player's actions or on the enemy's turn.
export function createEnemyPlan(g){
 const slots=[...g.sides.ai.slots],operations=[];
 const living=id=>id&&g.units[id]?.hp>0;
 const add=(from,to)=>{const incoming=slots[from-1],outgoing=slots[to-1];operations.push({type:outgoing?'exchange':'reinforce',from,to,incoming,outgoing:outgoing||null});[slots[from-1],slots[to-1]]=[slots[to-1],slots[from-1]];};
 if(!slots.slice(0,3).some(living)){
  const from=slots.findIndex((id,i)=>i>=3&&living(id))+1;
  if(from>3)add(from,1);
 }else{
  // Initial deterministic policy: rescue one critically wounded front unit.
  // This policy is deliberately small; it is not a new product rule.
  const to=slots.findIndex((id,i)=>i<3&&living(id)&&g.units[id].hp<=g.units[id].maxHp/3)+1;
  if(to){const from=slots.findIndex((id,i)=>i>=3&&living(id)&&g.units[id].hp>g.units[slots[to-1]].hp)+1;if(from>3)add(from,to);}
 }
 return {version:1,preparedAt:g.sideTurns?.player||0,operations};
}
export function validPlanOperation(g,op){
 if(!op||!['exchange','reinforce'].includes(op.type)||![4,5,6].includes(op.from)||![1,2,3].includes(op.to))return false;
 const slots=g.sides.ai.slots;
 return slots[op.from-1]===op.incoming&&g.units[op.incoming]?.hp>0&&
  (op.type==='exchange'?slots[op.to-1]===op.outgoing&&g.units[op.outgoing]?.hp>0:!slots[op.to-1]&&!op.outgoing);
}
export function validEnemyPlan(plan){
 return plan?.version===1&&Number.isInteger(plan.preparedAt)&&plan.preparedAt>=0&&Array.isArray(plan.operations)&&plan.operations.length<=2&&plan.operations.every(op=>
  op&&['exchange','reinforce'].includes(op.type)&&[4,5,6].includes(op.from)&&[1,2,3].includes(op.to)&&typeof op.incoming==='string'&&!!op.incoming&&
  (op.type==='exchange'?typeof op.outgoing==='string'&&!!op.outgoing:op.outgoing===null));
}
// Generic preparation badges: active marker Buffs and conditional own-turn-start
// skills. No role names, level IDs or hardcoded retaliation counters.
export const POWER_ATTACK_ICON='assets/status/powerful-attack-warning.png';
const safeIcon=path=>/^assets\/(?:[\w-]+\/)*[\w-]+\.(png|webp|jpg|svg)$/.test(path||'')?path:'';
const readyRule=(r,u,position)=>(r.active_zone||'battlefield')==='any'||((r.active_zone||'battlefield')==='battlefield'?position<=3:position>3);
const readyConditions=(r,u)=>(r.conditions||[]).every(c=>{const n=buffLayers(u,c.buff);return c.compare==='gte'?n>=c.layers:c.compare==='eq'?n===c.layers:n<c.layers;});
function attackPreparation(definition,values,u,position){
 return definition.rules?.some(r=>r.event==='turn_start'&&r.turn==='own'&&readyRule(r,u,position)&&readyConditions(r,u)&&r.effects.some(e=>
  (values?.[e.amount]||0)>0&&(e.op==='deal_damage'||e.op==='apply_buff'&&e.buff?.kind==='attack')));
}
export const preparationIcon=(definition,values,u,position)=>safeIcon(definition.icon)||(attackPreparation(definition,values,u,position)?POWER_ATTACK_ICON:'');
const badgeIcon=preparationIcon;
export function preparationBadges(g,id,position){
 const u=g.units[id];if(!u||u.hp<=0)return [];
 const badges=[];
 for(const b of u.buffs||[])if(b.stacks>0&&b.definition.kind==='marker'&&buffActive(b,position))badges.push({label:b.definition.name,icon:badgeIcon(b.definition,b.definition.values||b.definition.levels?.[b.level||1],u,position),stacks:b.stacks});
 for(const s of u.skills||[])if(s.definition.rules?.some(r=>r.event==='turn_start'&&r.turn==='own'&&r.conditions?.length&&
  ((r.active_zone||'battlefield')==='any'||((r.active_zone||'battlefield')==='battlefield'?position<=3:position>3))&&
  r.conditions.every(c=>{const n=buffLayers(u,c.buff);return c.compare==='gte'?n>=c.layers:c.compare==='eq'?n===c.layers:n<c.layers;})))badges.push({label:s.definition.name,icon:badgeIcon(s.definition,s.definition.levels?.[s.level],u,position),stacks:1});
 return badges.filter((b,i)=>badges.findIndex(x=>x.label===b.label)===i);
}
