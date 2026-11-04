const zones={battlefield:'在战场时',bench:'在备战区时',any:''};
const events={passive:'常驻',unit_enter:'入场时',unit_leave:'离场时',turn_start:'回合开始时',turn_end:'回合结束时',attack_declared:'发起攻击时',before_damage:'将受伤时',damage_taken:'受到有效伤害时',healed:'获得治疗时',unit_defeated:'被击溃时',attack_end:'攻击阶段结束时'};
const targets={self:'自身',opposing_unit:'敌方正前方格',front_sides:'敌方前方左右邻格',lower_ally:'己方下一战场格',rear_ally:'己方本路备战格',rear_enemy:'敌方本路备战格',all_enemies:'敌方目标区域各格',all_allies:'己方目标区域各格',other_allies:'其他己方所在格'};
const kinds={attack:'攻击',shield:'护盾',armor:'战斗减伤',damage_armor:'伤害减免',agile:'敏捷',combat_damage_immunity:'战斗伤害免疫'};
export function describeSkill(s,level=1,seen=new Set()){
 if(!s.rules?.length){const value=s.levels?.[level]?.amount;return s.description||({armor:'战斗减伤 '+value,damage_armor:'伤害减免 '+value,agile:'换入当回合可攻击',combat_damage_immunity:'免疫战斗伤害'}[s.passive]||s.name);}
 const description=s.rules.map(r=>{
  const prefix=[zones[r.active_zone]||'',r.turn==='own'?'己方':r.turn==='opponent'?'敌方':'',r.subject==='other_ally'?'其他友军':'',r.entry==='exchange'||r.exchangeOnly?'交换':'',events[r.event]||r.event].join('');
  const condition=(r.conditions||[]).map(c=>(s.buffs?.[c.buff]?.name||'状态')+({gte:'≥',eq:'=',lt:'<'}[c.compare])+c.layers+'层').join('且');
  const results=r.effects.map(e=>{
   const v=s.levels?.[level]?.[e.amount]??0,t=targets[e.target]||'目标';
   if(e.op==='apply_buff'){const b=e.buff,amount=b.kind==='marker'?`${e.stacks}层`:['agile','combat_damage_immunity'].includes(b.kind)?'':`${kinds[b.kind]||b.name}${v>=0?'+':''}${v}`;const duration=b.duration==='owner_turns'?`，持续${b.turns}个己方回合`:b.duration==='turn'?'，本回合结束移除':'';return `${t}获得「${b.name}」${amount}${duration}`;}
   if(e.op==='remove_buff')return `${t}移除${v}层「${e.buff.name}」`;
   if(e.op==='heal')return `${t}恢复${v}生命`;
   if(e.op==='deal_damage')return `对${t}造成${v}伤害`;
   if(e.op==='swap_positions')return `与${t}交换位置`;
   if(e.op==='modify_attack')return `${t}攻击${v>=0?'+':''}${v}`;
   if(e.op==='set_shield')return `${t}护盾刷新至${v}`;
   return s.description||s.name;
  }).join('，随后');
  return prefix+(condition?'且'+condition:'')+'：'+results;
 }).join('；');
 const attached=[];
 for(const r of s.rules)for(const e of r.effects)if(e.op==='apply_buff'&&!seen.has(e.buff.id)){
  const b=s.buffs?.[e.buff.id];if(!b?.rules?.length)continue;seen.add(b.id);
  attached.push(`「${b.name}」持有期间：`+describeSkill({...b,buffs:s.buffs},level,seen));
 }
 return [description,...attached].join('；');
}
