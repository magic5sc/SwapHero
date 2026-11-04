import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables,normalizeTables} from '../dist/src/workbook.mjs';
import {grantBuff,removeBuff,expireBuffs,consumeShield,buffLayers} from '../dist/src/buffs.mjs';
import {collectPhase,collectEvent,drainStack,applyDamage,refreshPositions} from '../dist/src/effects.mjs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {start,move} from '../dist/src/battle.mjs';
import {validateCatalog} from '../dist/src/content.mjs';
import {describeSkill} from '../dist/src/skill-text.mjs';
const base={id:'poison',name:'中毒',kind:'marker',active_zone:'any',stacking:'add',scope:'source_skill',max_stacks:3,duration:'owner_turns',turns:3,leave:'keep',value_policy:'keep',duration_refresh:'keep',overflow:'apply',shield_refresh:'keep'};
const apply=(u,b,extra={})=>grantBuff(u,b,{source:'caster',skillId:'skill',value:1,...extra});
const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'});
const tables=()=>normalizeTables(Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})])));
const compile=t=>compileTables(t,null,{levelOnly:true});
const put=(t,n,i,k,v)=>t[n][i][t[n][0].indexOf(k)]=v;
const add=(t,n,r)=>t[n].push(t[n][0].map(k=>r[k]??''));
function poisonTables(){
 const t=tables();
 add(t,'Buff',{BuffID:'poison',名称:'中毒',类型:'marker',生效区域:'any',叠加方式:'add',合并范围:'source_skill',最大层数:3,持续时间:'owner_turns',持续回合:3,离场处理:'keep',数值合并:'keep',时长刷新:'keep',满层处理:'reject',护盾补充:'keep'});
 add(t,'BuffEffect',{EffectID:'poison_tick',BuffID:'poison',顺序:1,监听区域:'any',触发时机:'turn_start',触发主体:'self',回合归属:'own',入场原因:'any',伤害类型:'any',ResultGroupID:'poison_tick',移除原因:'any'});
 add(t,'EffectResult',{ResultGroupID:'poison_tick',顺序:1,操作:'deal_damage',目标:'self',目标区域:'any',数值:1});
 // The hero grants a state to another unit; that unit needs no skill listener.
 add(t,'SkillEffect',{EffectID:'poison_cast',SkillID:'tutorial_arrival',顺序:2,监听区域:'battlefield',触发时机:'healed',触发主体:'self',回合归属:'any',入场原因:'any',伤害类型:'any',ResultGroupID:'poison_cast'});
 add(t,'EffectResult',{ResultGroupID:'poison_cast',顺序:1,操作:'apply_buff',目标:'opposing_unit',目标区域:'battlefield',BuffID:'poison',层数:1,等级1:0,等级2:0,等级3:0});
 return t;
}
function poisoned(t=poisonTables(),level=1){const g=createLevelBattle(compile(t),'tutorial_01');start(g);g.units['ai-2'].skills=[];g.units['player-2'].skills[0].level=level;collectEvent(g,{type:'healed',unit:'player-2',side:'player',position:2});drainStack(g);return g;}
test('stack count, magnitude, duration and cap rejection are independent',()=>{
 const u={attack:10};const b={...base,kind:'attack'};
 apply(u,b);expireBuffs(u,{ownerEnd:true});apply(u,b,{value:3});assert.equal(u.attack,12);assert.equal(u.buffs[0].remaining,2);
 apply(u,{...b,value_policy:'replace',duration_refresh:'refresh'},{value:3});assert.equal(u.attack,19);assert.equal(u.buffs[0].remaining,3);
 expireBuffs(u,{ownerEnd:true});const before=structuredClone(u);
 assert.equal(apply(u,{...b,overflow:'reject',duration_refresh:'refresh'},{value:9}),false);assert.deepEqual(u,before);
});
test('max and min magnitude policies have explicit meaning for negative modifiers',()=>{
 for(const [policy,expected] of [['keep',9],['replace',7],['max',9],['min',7]]){
  const u={attack:10},b={...base,kind:'attack',stacking:'refresh',value_policy:policy};apply(u,b,{value:-1});apply(u,b,{value:-3});assert.equal(u.attack,expected);
 }
});
test('shield keep, add and reset differ; adding at cap does not refill',()=>{
 for(const [policy,expected] of [['keep',1],['add',3],['reset',4]]){
  const u={attack:0},b={...base,kind:'shield',shield_refresh:policy,max_stacks:2};apply(u,b,{value:2});consumeShield(u,1);apply(u,b,{value:2});assert.equal(u.buffShield,expected);
  consumeShield(u,1);const before=u.buffShield;apply(u,b,{value:2});assert.equal(u.buffShield,policy==='reset'?4:before);
 }
 const u={attack:0},b={...base,kind:'shield',stacking:'refresh',value_policy:'replace',shield_refresh:'keep'};apply(u,b,{value:5});apply(u,b,{value:2});assert.equal(u.buffShield,2);
});
test('independent applications retain separate values, timers and stable instance IDs',()=>{
 const u={attack:10},b={...base,kind:'attack',stacking:'independent'};apply(u,b);expireBuffs(u,{ownerEnd:true});apply(u,b,{value:3});assert.equal(u.attack,14);assert.deepEqual(u.buffs.map(b=>b.remaining),[2,3]);assert.notEqual(u.buffs[0].instanceId,u.buffs[1].instanceId);
 const copy=JSON.parse(JSON.stringify(u));removeBuff(copy,'poison',1);apply(copy,b);assert.equal(new Set(copy.buffs.map(b=>b.instanceId)).size,2);
});
test('Buff ticks on skill-free target after original caster leaves and save reloads',()=>{
 let g=poisoned(undefined,2);const target='ai-2';assert.equal(g.units[target].buffs[0].level,undefined);assert.equal(g.units[target].buffs[0].definition.levels,undefined);
 g.units['player-2'].skills=[];g.sides.player.slots[1]=null;g.sides.player.slots[3]='player-2';refreshPositions(g);g=JSON.parse(JSON.stringify(g));
 g.turn='player';collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units[target].hp,7);
 g.turn='ai';collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units[target].hp,6);
 assert.equal(g.trace.findLast(e=>e.type==='damage_taken').source,'player-2');assert.ok(g.trace.some(e=>e.buffId==='poison'));
});
test('merged stacks trigger once, independent instances trigger separately',()=>{
 for(const [stacking,expected] of [['add',6],['independent',5]]){
  const t=poisonTables();put(t,'Buff',t.Buff.length-1,'叠加方式',stacking);const g=poisoned(t);
  collectEvent(g,{type:'healed',unit:'player-2',side:'player',position:2});drainStack(g);assert.equal(buffLayers(g.units['ai-2'],'poison'),2);
  g.turn='ai';collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units['ai-2'].hp,expected);
 }
});
test('removal stops future listening but collected results finish',()=>{
 const g=poisoned(),u=g.units['ai-2'];g.turn='ai';collectPhase(g,'turn_start');removeBuff(u,'poison',3);drainStack(g);assert.equal(u.hp,6);
 collectPhase(g,'turn_start');drainStack(g);assert.equal(u.hp,6);
});
test('expiry stops Buff listeners and reserve inhibition preserves timer policy',()=>{
 const t=poisonTables();put(t,'Buff',t.Buff.length-1,'生效区域','battlefield');put(t,'Buff',t.Buff.length-1,'离场处理','pause');const g=poisoned(t),u=g.units['ai-2'];
 g.sides.ai.slots[1]=null;g.sides.ai.slots[4]=u.id;refreshPositions(g);g.turn='ai';collectPhase(g,'turn_start');drainStack(g);expireBuffs(u,{ownerEnd:true});assert.equal(u.hp,7);assert.equal(u.buffs[0].remaining,3);
 g.sides.ai.slots[4]=null;g.sides.ai.slots[1]=u.id;refreshPositions(g);for(let i=0;i<3;i++)expireBuffs(u,{ownerEnd:true});collectPhase(g,'turn_start');drainStack(g);assert.equal(u.hp,7);
});
test('Buff can create another behavioral Buff, including self references, without cyclic save data',()=>{
 const g=createLevelBattle(compile(tables()),'tutorial_01');start(g);const u=g.units['ai-2'];applyDamage(g,'player-2',u.id,1);drainStack(g);const b=u.buffs[0];b.stacks=3;u.skills=[];
 g.turn='ai';collectPhase(g,'turn_end');drainStack(g);assert.equal(buffLayers(u,'tutorial_retaliation_ready'),1);
 const restored=JSON.parse(JSON.stringify(g));collectPhase(restored,'turn_start');drainStack(restored);assert.equal(restored.units[u.id].attack,3);
 const t=poisonTables();put(t,'EffectResult',t.EffectResult.length-2,'操作','apply_buff');put(t,'EffectResult',t.EffectResult.length-2,'BuffID','poison');put(t,'EffectResult',t.EffectResult.length-2,'层数',1);
 assert.doesNotThrow(()=>JSON.stringify(compile(t)));assert.doesNotThrow(()=>describeSkill(compile(t).skills[0]));
});
test('leaving Buff can trigger once before remove-on-exit cleanup',()=>{
 const g=poisoned(),u=g.units['player-2'];u.hp=3;
 const b={...base,active_zone:'battlefield',leave:'remove',levels:{1:{n:1}},rules:[{event:'unit_leave',subject:'self',active_zone:'battlefield',effects:[{op:'heal',target:'self',zone:'any',amount:'n',duration:null,grid:true}]}]};apply(u,b);move(g,'player',5,2);assert.equal(u.hp,4);assert.equal(buffLayers(u,'poison'),0);
});
test('Buff configuration validates unreferenced listeners and policy enums too',()=>{
 for(const edit of [t=>put(t,'Buff',1,'时长刷新','wrong'),t=>put(t,'Buff',1,'满层处理',''),t=>put(t,'BuffEffect',1,'BuffID','missing'),t=>put(t,'BuffEffect',1,'触发时机','wrong'),t=>put(t,'BuffEffect',1,'触发主体','enemy'),t=>t.BuffEffect.push([...t.BuffEffect[1]])]){
  const t=poisonTables();edit(t);assert.throws(()=>compile(t));
 }
 const p=compile(poisonTables());p.buffs.poison.rules[0].event='wrong';assert.ok(validateCatalog(p).length);
});
test('missing old policy columns migrate with legacy behavior without changing input',()=>{
 const t=tables();for(const key of ['数值合并','时长刷新','满层处理','护盾补充']){const i=t.Buff[0].indexOf(key);for(const r of t.Buff)r.splice(i,1);}delete t.BuffEffect;
 t.Buff.push(['','','']);const before=structuredClone(t),n=normalizeTables(t);assert.deepEqual(t,before);assert.equal(n.Buff[1][n.Buff[0].indexOf('护盾补充')],'reset');assert.equal(n.BuffEffect.length,1);assert.ok(n.Buff.at(-1).every(v=>v===''));
});
test('newly granted Buff waits for the next phase batch; looping reactions pause safely',()=>{
 const t=poisonTables();put(t,'SkillEffect',t.SkillEffect.length-1,'触发时机','turn_start');const g=createLevelBattle(compile(t),'tutorial_01');start(g);g.units['ai-2'].skills=[];
 // Clear any start-generated state and collect a fresh simultaneous batch.
 g.units['ai-2'].buffs=[];g.turn='ai';collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units['ai-2'].hp,7);assert.equal(buffLayers(g.units['ai-2'],'poison'),1);
 collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units['ai-2'].hp,6);
 const h=poisoned(),u=h.units['ai-2'];u.maxHp=100;u.hp=99;u.buffs[0].definition.rules=[
  {event:'damage_taken',subject:'self',active_zone:'any',effects:[{op:'heal',target:'self',zone:'any',amount:'n',duration:null,grid:true}]},
  {event:'healed',subject:'self',active_zone:'any',effects:[{op:'deal_damage',target:'self',zone:'any',amount:'n',duration:null,damage_type:'skill',grid:true}]}
 ];u.buffs[0].definition.values={n:1};applyDamage(h,'player-2',u.id,1);drainStack(h);assert.match(h.error,/256/);assert.equal(h.phase,'error');
});
