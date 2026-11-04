import {buffValue} from './buffs.mjs';
import {artIssues,resolveArt} from './art-assets.mjs';
// Content definitions are data; no executable expressions or card-name branches.
const PASSIVES = new Set(['agile','armor','combat_damage_immunity','damage_armor']);
const EVENTS = new Set(['passive','turn_start','unit_enter','unit_leave','attack_declared','before_damage','damage_taken','unit_defeated','healed','attack_end','turn_end']);
const OPS = new Set(['heal','deal_damage','modify_attack','swap_positions','set_shield','apply_buff','remove_buff']);
const TARGETS = new Set(['self','opposing_unit','all_enemies','other_allies','lower_ally','rear_ally','rear_enemy','front_sides','all_allies']);
const fail = message => { throw Error(message); };
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const integer = (x,min) => Number.isInteger(x) && x >= min;
const idPattern = /^[a-z][a-z0-9_]*$/;
function validBuff(b){return object(b)&&typeof b.id==='string'&&idPattern.test(b.id)&&typeof b.name==='string'&&b.name.length>0&&['marker','attack','shield','armor','damage_armor','agile','combat_damage_immunity'].includes(b.kind)&&['battlefield','bench','any'].includes(b.active_zone)&&['add','refresh','max','independent'].includes(b.stacking)&&['buff','source_skill'].includes(b.scope)&&integer(b.max_stacks,1)&&['battle','turn','owner_turns'].includes(b.duration)&&['keep','remove','pause'].includes(b.leave)&&(b.duration!=='owner_turns'||integer(b.turns,1))&&(b.value_policy===undefined||['replace','keep','max','min'].includes(b.value_policy))&&(b.duration_refresh===undefined||['refresh','keep'].includes(b.duration_refresh))&&(b.overflow===undefined||['apply','reject'].includes(b.overflow))&&(b.shield_refresh===undefined||['reset','add','keep'].includes(b.shield_refresh));}
export function validateCatalog(data) {
  const errors=[];
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  if(!object(data)||data.schema_version!==1||!Array.isArray(data.cards)||!Array.isArray(data.skills)) return ['配置必须包含schema_version=1、cards和skills数组'];
  errors.push(...artIssues(data));
  check(typeof data.version==='string'&&data.version.length>0,'缺少内容版本');
  for(const [list,key] of [[data.cards,'card_id'],[data.skills,'skill_id']]) {
    const seen=new Set();
    for(const item of list){ if(!object(item)){errors.push('记录必须是对象');continue;} check(typeof item[key]==='string'&&idPattern.test(item[key]),`非法${key}`);check(!seen.has(item[key]),`重复ID ${item[key]}`);seen.add(item[key]);check(typeof item.name==='string'&&item.name.length>0,`${item[key]}缺名称`);check(['draft','specified'].includes(item.status),`${item[key]}状态非法`);check(Array.isArray(item.blockers)&&item.blockers.every(x=>typeof x==='string'),`${item[key]}缺blockers`); }
  }
  const listeners=[...data.skills.filter(object)];
  for(const registry of [data.buffs,...listeners.map(s=>s.buffs)].filter(Boolean)){
    check(object(registry),'Buff定义集合必须是对象');
    for(const [id,b] of Object.entries(registry)){
      check(validBuff(b)&&b.id===id,`${id} Buff定义非法`);
      if(!object(b)||b.rules===undefined)continue;
      check(Array.isArray(b.rules)&&b.rules.every(r=>r?.event!=='passive'),`${id} Buff效果不支持passive`);
      listeners.push({skill_id:id,name:b.name,levels:b.levels,rules:b.rules,buffs:registry,status:'specified',active_zone:'battlefield',stacking:'single_instance',unload_policy:'remove_passive_and_listeners',passive:null});
    }
  }
  for(const s of listeners) {
    check(object(s.levels)&&Object.keys(s.levels).length>0,`${s.skill_id}缺等级`);
    for(const [level,params] of Object.entries(s.levels||{})){check(/^[1-9]\d*$/.test(level)&&object(params),`${s.skill_id}等级格式非法`);for(const value of Object.values(object(params)?params:{}))check(Number.isFinite(value),`${s.skill_id}参数必须为有限数值`);}
    check(s.active_zone==='battlefield',`${s.skill_id}作用区域不支持`);
    check(s.stacking==='single_instance'&&s.unload_policy==='remove_passive_and_listeners',`${s.skill_id}叠加或卸载策略不支持`);
    check(s.passive===null||PASSIVES.has(s.passive),`${s.skill_id}未知常驻能力`);
    check(Array.isArray(s.rules),`${s.skill_id}缺规则数组`);
    if(['armor','damage_armor'].includes(s.passive))for(const p of Object.values(s.levels||{}))check(integer(p.amount,0),`${s.skill_id}护甲必须为非负整数`);
    for(const rule of Array.isArray(s.rules)?s.rules:[]) {
      if(!object(rule)){errors.push('规则必须是对象');continue;}check(Object.keys(rule).every(k=>['event','subject','effects','every','delayOwnTurns','exchangeOnly','id','active_zone','turn','entry','damageType','conditions'].includes(k)),`${s.skill_id}含未支持的规则字段`);
      check(rule.every===undefined||integer(rule.every,1),`${s.skill_id}触发次数无效`);check(rule.delayOwnTurns===undefined||integer(rule.delayOwnTurns,0),`${s.skill_id}延迟回合无效`);check(rule.exchangeOnly===undefined||typeof rule.exchangeOnly==='boolean',`${s.skill_id}交换条件无效`);check(!rule.exchangeOnly||rule.event==='unit_enter',`${s.skill_id}交换条件仅用于入场`);check(EVENTS.has(rule.event),`${s.skill_id}未知事件`);check(['self','other_ally'].includes(rule.subject),`${s.skill_id}未知主体`);if(['passive','turn_start','attack_end','turn_end'].includes(rule.event))check(rule.subject==='self',`${s.skill_id}阶段事件只支持self主体`);
      if(rule.active_zone!==undefined)check(['battlefield','bench','any'].includes(rule.active_zone),`${s.skill_id}监听区域非法`);
      if(rule.turn!==undefined)check(['own','opponent','any'].includes(rule.turn),`${s.skill_id}回合归属非法`);
      if(rule.entry!==undefined)check(['exchange','reinforce','any'].includes(rule.entry),`${s.skill_id}入场原因非法`);
      if(rule.damageType!==undefined)check(['combat','skill','health_loss','any'].includes(rule.damageType),`${s.skill_id}伤害类型非法`);
      if(rule.conditions!==undefined)check(Array.isArray(rule.conditions)&&rule.conditions.every(c=>object(c)&&s.buffs?.[c.buff]&&['gte','eq','lt'].includes(c.compare)&&integer(c.layers,0)),`${s.skill_id}条件非法`);
      check(Array.isArray(rule.effects)&&rule.effects.length>0,`${s.skill_id}缺效果`);
      for(const e of Array.isArray(rule.effects)?rule.effects:[]) {
        if(!object(e)){errors.push('效果必须是对象');continue;}check(Object.keys(e).every(k=>['op','target','amount','duration','zone','damage_type','field_position','turns','refresh','grid','buff','stacks'].includes(k)),`${s.skill_id}含未支持的效果字段`);
        if(['apply_buff','remove_buff'].includes(e.op)){check(validBuff(e.buff),`${s.skill_id}Buff定义非法`);if(e.op==='apply_buff')check(integer(e.stacks,1),`${s.skill_id}Buff层数非法`);}
        check(OPS.has(e.op),`${s.skill_id}未知效果`);check(e.target===null||TARGETS.has(e.target),`${s.skill_id}未知目标`);
        check(e.duration===null||['battle','turn','on_field','owner_turns'].includes(e.duration),`${s.skill_id}未知持续时间`);check(e.zone===null||['battlefield','any','bench'].includes(e.zone),`${s.skill_id}未知区域`);
        check(e.duration!=='owner_turns'||integer(e.turns,1),`${s.skill_id}持续回合无效`);check(e.refresh===undefined||typeof e.refresh==='boolean',`${s.skill_id}刷新配置无效`);
        if(['rear_ally','rear_enemy'].includes(e.target)) {
          check(e.zone==='bench',`${s.skill_id}后方目标必须选择仅备战区`);
          check(e.field_position===undefined||e.field_position===null||[1,2,3].includes(e.field_position),`${s.skill_id}战线必须为1、2、3或自身所在战线`);
          check(e.op!=='swap_positions',`${s.skill_id}场上换位不能用于备战目标`);
        } else check(e.field_position===undefined||e.field_position===null,`${s.skill_id}仅后方目标支持指定战线`);
        if(s.status==='specified'){check(e.target!==null&&e.zone!==null,`${s.skill_id}目标未闭合`);if(e.op==='modify_attack')check(e.duration!==null,`${s.skill_id}持续时间未闭合`);}
        if(e.op!=='swap_positions')for(const p of Object.values(s.levels||{})){check(typeof e.amount==='string'&&Number.isFinite(p[e.amount]),`${s.skill_id}缺效果参数`);if(e.op!=='modify_attack'&&!(e.op==='apply_buff'&&e.buff?.kind==='attack'))check(integer(p[e.amount],0),`${s.skill_id}效果量必须为非负整数`);}
        if(e.op==='deal_damage')check(e.damage_type==='skill',`${s.skill_id}伤害类型不支持`);
      }
    }
  }
  for(const c of data.cards.filter(object)) {
    check(integer(c.attack,0)&&integer(c.health,1),`${c.card_id}攻血非法`);check(['character','test'].includes(c.category),`${c.card_id}类别非法`);
    check(Array.isArray(c.slots)&&Array.isArray(c.skills),`${c.card_id}缺槽位或装配`);
    const slots=new Map();for(const slot of Array.isArray(c.slots)?c.slots:[]){if(!object(slot)){errors.push('槽位必须是对象');continue;}check(!slots.has(slot.slot_id)&&idPattern.test(slot.slot_id)&&slot.capacity===1&&['innate','skill'].includes(slot.type),`${c.card_id}槽位非法`);slots.set(slot.slot_id,slot);}
    const used=new Set(),skills=new Set();for(const ref of Array.isArray(c.skills)?c.skills:[]){if(!object(ref)){errors.push('装配必须是对象');continue;}const s=data.skills.find(x=>x?.skill_id===ref.skill_id);check(slots.has(ref.slot_id)&&!used.has(ref.slot_id),`${c.card_id}槽位不存在或重复`);used.add(ref.slot_id);check(!skills.has(ref.skill_id),`${c.card_id}同技能重复装配`);skills.add(ref.skill_id);check(s&&integer(ref.level,1)&&object(s.levels?.[ref.level]),`${c.card_id}技能或等级不存在`);}
  }
  return errors;
}
export function publicationIssues(data,cardId) {
  const errors=validateCatalog(data);if(errors.length)return errors;
  const c=data.cards.find(c=>c.card_id===cardId);if(!c)return ['卡牌不存在'];
  const issues=[...c.blockers];if(c.status!=='specified')issues.push('卡牌尚为草稿');
  for(const ref of c.skills){const s=data.skills.find(s=>s.skill_id===ref.skill_id);issues.push(...s.blockers);if(s.status!=='specified')issues.push(`${s.name}尚为草稿`);}
  return [...new Set(issues)];
}
export function createUnit(data,cardId,instanceId) {
  const issues=publicationIssues(data,cardId);if(issues.length)fail(issues.join('；'));
  if(typeof instanceId!=='string'||!instanceId)fail('缺单位实例ID');
  const c=data.cards.find(c=>c.card_id===cardId);
  return {id:instanceId,cardId,art:resolveArt(data,c),name:c.name,attack:c.attack,baseAttack:c.attack,modifiers:[],hp:c.health,maxHp:c.health,disabled:false,contentVersion:data.version,slots:structuredClone(c.slots),skills:c.skills.map(r=>({slotId:r.slot_id,level:r.level,definition:structuredClone(data.skills.find(s=>s.skill_id===r.skill_id))}))};
}
// Derived passives leave no cached bonuses behind when a skill is removed.
export function passiveValue(unit,keyword){
 const pos=unit.position??1;
 return buffValue(unit,keyword,pos)+(unit.skills||[]).reduce((n,s)=>{
  if(s.definition.passive===keyword)n+=['armor','damage_armor'].includes(keyword)?s.definition.levels[s.level].amount:1;
  for(const r of s.definition.rules||[])if(r.event==='passive'&&(r.active_zone==='any'||(r.active_zone==='bench'?pos>3:pos<=3)))for(const e of r.effects)if(e.buff?.kind===keyword)n+=['armor','damage_armor'].includes(keyword)?s.definition.levels[s.level][e.amount]*e.stacks:1;
  return n;
 },0);
}
export function canAttack(unit){return unit.hp>0&&(!unit.disabled||passiveValue(unit,'agile')>0);}
export function damageAmount(target,amount,type='combat'){
  if(!Number.isFinite(amount)||amount<0||!['combat','skill','health_loss'].includes(type))fail('非法伤害');
  if(type==='health_loss')return amount;
  if(type==='combat'&&passiveValue(target,'combat_damage_immunity'))return 0;
  return Math.max(0,amount-passiveValue(target,'damage_armor')-(type==='combat'?passiveValue(target,'armor'):0));
}
export function replaceSkill(unit,slotId,definition,level,{phase,stackEmpty}={}){
  if(!['outside_battle','deployment'].includes(phase)||stackEmpty!==true)fail('当前不能替换技能');
  const slot=unit.slots?.find(s=>s.slot_id===slotId);if(!slot||slot.type!=='skill')fail('只能替换可装配技能槽');
  const testCard={card_id:'test',name:'test',category:'test',attack:0,health:1,status:'specified',blockers:[],slots:[slot],skills:[{slot_id:slotId,skill_id:definition?.skill_id,level}]};
  const data={schema_version:1,version:unit.contentVersion,cards:[testCard],skills:[definition]};const issues=publicationIssues(data,'test');if(issues.length)fail(issues.join('；'));
  if(unit.skills.some(s=>s.slotId!==slotId&&s.definition.skill_id===definition.skill_id))fail('同技能重复装配');
  const next=structuredClone(unit);next.skills=next.skills.filter(s=>s.slotId!==slotId);next.skills.push({slotId,level,definition:structuredClone(definition)});return next;
}
