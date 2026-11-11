import {passiveEffectAmount} from './content.mjs';
import {buffActive} from './buffs.mjs';
import {preparationIcon,preparationBadges} from './enemy-plan.mjs';
import {describeSkill} from './skill-text.mjs';
const fallback=kind=>'assets/status/buff-'+({attack:'attack',shield:'shield',armor:'armor',damage_armor:'armor',agile:'agile',combat_damage_immunity:'immune'}[kind]||'marker')+'.svg';
const zoneText=zone=>({battlefield:'仅战场生效',bench:'仅备战区生效',any:'战场和备战区均生效'}[zone]||'仅战场生效');
const sign=n=>n>=0?'+'+n:String(n);
function detail(g,u,b,position){
 const d=b.definition,active=buffActive(b,position),total=b.value*b.stacks;
 const amount={attack:'攻击 '+sign(total),shield:'剩余护盾 '+(b.remainingShield??total)+' / '+total,armor:'普通攻击伤害减免 '+total,damage_armor:'战斗及技能伤害减免 '+total,agile:'换入当回合仍可普通攻击',combat_damage_immunity:'免疫普通攻击伤害'}[d.kind];
 const behavior=d.rules?.length?describeSkill({...d,buffs:b.definitions||{},values:d.values||d.levels?.[b.level||1]||{}},b.level||1):'';
 const duration=b.preview?'条件满足时显示，条件变化后更新':b.passive?'常驻，随技能生效':d.duration==='owner_turns'?'剩余 '+(b.remaining??d.turns)+' 个己方回合':d.duration==='turn'?'本回合结束移除':d.duration==='on_field'?'离场时移除':'持续至本场战斗结束或效果移除';
 const source=g.units[b.source]?.name;
 return {name:d.name,lines:[amount,behavior||(!amount?'用于记录状态层数；关联技能按条件触发。':''),!b.preview?'层数 '+b.stacks:'',duration,zoneText(d.active_zone)+(active?'':'（当前暂不生效）'),!b.passive?({remove:'离场移除',pause:'在备战区暂停计时',keep:'离场保留'}[d.leave]||''):'',source?'来源：'+source:''].filter(Boolean),active};
}
export function unitBuffBadges(g,u,position){
 if(!u||u.hp<=0)return [];
 const states=(u.buffs||[]).filter(b=>b.stacks>0).map(b=>({...b,key:'buff:'+b.instanceId+':'+b.id}));
 for(const [si,s] of (u.skills||[]).entries()){
  if(s.definition.passive)states.push({key:'passive:'+si,source:u.id,passive:true,stacks:1,value:s.definition.levels?.[s.level]?.amount??1,definition:{id:'legacy-passive-'+si,name:s.definition.name,kind:s.definition.passive,active_zone:'battlefield',icon:s.definition.icon}});
  for(const [ri,r] of (s.definition.rules||[]).entries())if(r.event==='passive')for(const [ei,e] of r.effects.entries())if(e.op==='apply_buff')states.push({key:`passive:${si}:${ri}:${ei}`,source:u.id,passive:true,stacks:e.stacks,value:passiveEffectAmount(u,e,s.definition.levels?.[s.level]?.[e.amount]||0,g),definition:{...e.buff,active_zone:r.active_zone||e.buff.active_zone,icon:e.buff.icon||s.definition.icon},definitions:s.definition.buffs});
 }
 for(const [i,m] of (u.modifiers||[]).entries())states.push({key:'modifier:'+i,source:m.source,stacks:1,value:m.amount,remaining:m.remaining,definition:{id:'modifier-'+i,name:'攻击变化',kind:'attack',duration:m.duration,active_zone:'any'}});
 if(u.shield>0)states.push({key:'shield',stacks:1,value:u.shield,remainingShield:u.shield,definition:{id:'legacy-shield',name:'护盾',kind:'shield',active_zone:'any'}});
 for(const badge of preparationBadges(g,u.id,position))if(!states.some(b=>b.definition.name===badge.label)){
  const skill=(u.skills||[]).find(s=>s.definition.name===badge.label);if(skill)states.push({key:'preview:'+skill.definition.skill_id,source:u.id,preview:true,stacks:1,value:0,level:skill.level,definitions:skill.definition.buffs,definition:{...skill.definition,kind:'marker',active_zone:'any',values:skill.definition.levels?.[skill.level]}});
 }
 return states.map(b=>{
  const d=b.definition,values=d.values||d.levels?.[b.level||1];
  const icon=preparationIcon(d,values,u,position)||fallback(d.kind);
  return {key:b.key,icon,fallback:fallback(d.kind),count:b.stacks>1?b.stacks:null,...detail(g,u,b,position)};
 });
}
