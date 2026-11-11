import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables,normalizeTables} from '../dist/src/workbook.mjs';
import {passiveValue,damageAmount} from '../dist/src/content.mjs';
import {applyDamage,drainStack,refreshPositions,updateState,collectPhase,finishOwnerTurn,finishBuffTurn,beginOwnerTurn,onLeave} from '../dist/src/effects.mjs';
import {unitBuffBadges} from '../dist/src/buff-display.mjs';
import {describeSkill} from '../dist/src/skill-text.mjs';
import {grantBuff} from '../dist/src/buffs.mjs';
const armor={id:'aura',name:'动态护甲',kind:'armor',active_zone:'battlefield',stacking:'refresh',scope:'source_skill',max_stacks:1,duration:'battle',leave:'keep'};
const growth={...armor,id:'growth',name:'击杀成长',kind:'attack',active_zone:'any',stacking:'independent'};
const skill=(id,event,buff,extra={})=>({slotId:id,level:1,definition:{skill_id:id,name:id,active_zone:'battlefield',levels:{1:{amount:1}},rules:[{event,subject:'self',active_zone:event==='passive'?'battlefield':'any',effects:[{op:'apply_buff',target:'self',zone:'any',amount:'amount',duration:null,buff,stacks:1,...extra}]}]}});
function game(side='player'){
 const enemy=side==='player'?'ai':'player';
 const unit=(id,hp=20)=>({id,name:id,hp,maxHp:hp,attack:3,baseAttack:3,skills:[],modifiers:[]});
 const g={mode:'pve',turn:side,phase:'action',units:{champion:unit('champion'),ally:unit('ally'),reserve:unit('reserve'),victim:unit('victim',1),survivor:unit('survivor',100)},sides:{[side]:{slots:['champion','ally',null,'reserve',null,null]},[enemy]:{slots:['victim','survivor',null,null,null,null]}},log:[],stack:[],trace:[]};
 g.units.champion.skills=[skill('aura','passive',armor,{amount_source:'other_allies_count'}),skill('growth','enemy_defeated',growth)];refreshPositions(g);return g;
}
test('dynamic armor counts other living field and reserve allies for either side',()=>{
 for(const side of ['player','ai']){const g=game(side),u=g.units.champion;assert.equal(passiveValue(u,'armor',g),2);assert.equal(damageAmount(u,5,'combat',g),3);assert.equal(damageAmount(u,5,'skill',g),5);assert.equal(damageAmount(u,5,'health_loss',g),5);
 g.units.ally.hp=0;assert.equal(passiveValue(u,'armor',g),1);updateState(g);assert.equal(passiveValue(u,'armor',g),1);
 g.sides[side].slots[3]=null;assert.equal(passiveValue(u,'armor',g),0);
 g.sides[side].slots[4]='ally';g.units.ally.hp=1;assert.equal(passiveValue(u,'armor',g),1);
 g.sides[side].slots[0]=null;g.sides[side].slots[5]='champion';refreshPositions(g);assert.equal(passiveValue(u,'armor',g),0);
 g.sides[side].slots[5]=null;g.sides[side].slots[0]='champion';refreshPositions(g);assert.equal(passiveValue(u,'armor',g),1);
 u.skills=[];assert.equal(passiveValue(u,'armor',g),0);}
});
test('lethal combat and skill damage each credit the actual killer exactly once',()=>{
 for(const side of ['player','ai'])for(const type of ['combat','skill']){const g=game(side),u=g.units.champion;applyDamage(g,'champion','victim',100,type);drainStack(g);assert.equal(u.attack,4);assert.equal(g.trace.filter(e=>e.type==='enemy_defeated').length,1);applyDamage(g,'champion','victim',100,type);drainStack(g);assert.equal(u.attack,4);
 const copy=JSON.parse(JSON.stringify(g));applyDamage(copy,'champion','survivor',1000,type);drainStack(copy);assert.equal(copy.units.champion.attack,5);assert.equal(copy.winner,side);}
});
test('nonlethal damage, another killer, ally deaths, and removed units do not grant growth',()=>{
 for(const action of [g=>applyDamage(g,'champion','survivor',1),g=>applyDamage(g,'ally','victim',1),g=>applyDamage(g,'champion','ally',100),g=>{g.units.victim.hp=0;updateState(g);},g=>{g.sides.player.slots[0]=null;applyDamage(g,'champion','victim',1);}]){const g=game();action(g);drainStack(g);assert.equal(g.units.champion.attack,3);}
});
test('preview damage uses current dynamic armor without triggering kill effects',()=>{
 const g=game();assert.equal(applyDamage(g,'victim','champion',3,'combat',{preview:true}),1);assert.equal(g.units.champion.hp,19);assert.deepEqual(g.trace,[]);
 applyDamage(g,'champion','victim',100,'combat',{preview:true});assert.equal(g.units.champion.attack,3);assert.deepEqual(g.stack,[]);
});
test('kill skill listens from reserve and saved pending kill resolves only once',()=>{
 let g=game();g.sides.player.slots[0]=null;g.sides.player.slots[5]='champion';refreshPositions(g);applyDamage(g,'champion','victim',1,'skill');g=JSON.parse(JSON.stringify(g));drainStack(g);assert.equal(g.units.champion.attack,4);drainStack(g);assert.equal(g.units.champion.attack,4);
});
test('dynamic source compiles from optional Excel column and rejects unsupported use',()=>{
 const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'});const raw=Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})]));const t=normalizeTables(raw);
 const add=(n,r)=>t[n].push(t[n][0].map(k=>r[k]??''));
 if(!t.EffectResult[0].includes('数值来源'))t.EffectResult[0].push('数值来源');
 add('Buff',{BuffID:'test_aura',名称:'动态护甲',类型:'armor',生效区域:'battlefield',叠加方式:'refresh',合并范围:'source_skill',最大层数:1,持续时间:'battle',离场处理:'keep',数值合并:'replace',时长刷新:'refresh',满层处理:'apply',护盾补充:'keep'});
 add('SkillEffect',{EffectID:'test_aura',SkillID:'tutorial_arrival',顺序:99,监听区域:'battlefield',触发时机:'passive',触发主体:'self',回合归属:'any',入场原因:'any',伤害类型:'any',ResultGroupID:'test_aura'});
 add('EffectResult',{ResultGroupID:'test_aura',顺序:1,操作:'apply_buff',目标:'self',目标区域:'any',BuffID:'test_aura',层数:1,等级1:1,等级2:1,等级3:1,数值来源:'other_allies_count'});
 const compile=()=>compileTables(t,null,{levelOnly:true});const compiled=compile();assert.ok(compiled);
 const sourceCol=t.EffectResult[0].indexOf('数值来源');t.EffectResult.at(-1)[sourceCol]='bogus';assert.throws(compile,/数值来源/);
 t.EffectResult.at(-1)[sourceCol]='other_allies_count';t.SkillEffect.at(-1)[t.SkillEffect[0].indexOf('触发时机')]='enemy_defeated';assert.throws(compile,/数值来源/);
});

test('lethal behavioral Buff credits its original instigator rather than its holder',()=>{
 const g=game(),poison={...growth,id:'poison_credit',name:'毒',kind:'marker',values:{amount:1},rules:[{event:'turn_start',subject:'self',active_zone:'any',effects:[{op:'deal_damage',target:'self',zone:'any',amount:'amount',damage_type:'skill',duration:null}]}]};
 grantBuff(g.units.victim,poison,{source:'champion',skillId:'test_poison',value:0,stacks:1,definitions:{}});
 collectPhase(g,'turn_start');drainStack(g);assert.equal(g.units.champion.attack,4);assert.equal(g.trace.find(e=>e.type==='enemy_defeated').unit,'champion');
});

test('dynamic armor badge follows deaths, reserve allies and inactive own reserve position',()=>{
 const g=game(),u=g.units.champion,badge=()=>unitBuffBadges(g,u,u.position).find(b=>b.key==='passive:0:0:0');
 assert.equal(badge().active,true);assert.ok(badge().lines.includes('普通攻击伤害减免 2'));
 g.units.ally.hp=0;updateState(g);assert.ok(badge().lines.includes('普通攻击伤害减免 1'));
 g.sides.player.slots[3]=null;assert.ok(badge().lines.includes('普通攻击伤害减免 0'));
 g.sides.player.slots[3]='reserve';g.sides.player.slots[0]=null;g.sides.player.slots[5]='champion';refreshPositions(g);assert.equal(badge().active,false);assert.ok(badge().lines.some(s=>s.includes('当前暂不生效')));
 g.sides.player.slots[5]=null;g.sides.player.slots[0]='champion';refreshPositions(g);assert.equal(badge().active,true);assert.ok(badge().lines.includes('普通攻击伤害减免 1'));
});
test('skill descriptions distinguish dynamic ally armor and self kill growth',()=>{
 const g=game(),[aura,growth]=g.units.champion.skills;
 const a=describeSkill(aura.definition),b=describeSkill(growth.definition);
 assert.match(a,/己方战场和备战区其他存活单位数×1/);assert.match(a,/在战场时常驻/);
 assert.match(b,/击杀敌方单位时/);assert.match(b,/自身获得/);assert.match(b,/攻击\+1/);assert.doesNotMatch(b,/被击溃时/);
});
test('kill attack growth survives turn ends, reserve exchange and reload within battle',()=>{
 let g=game();applyDamage(g,'champion','victim',1);drainStack(g);assert.equal(g.units.champion.attack,4);
 finishOwnerTurn(g,'player');finishBuffTurn(g);g.turn='ai';beginOwnerTurn(g,'ai');finishOwnerTurn(g,'ai');finishBuffTurn(g);
 g.sides.player.slots[0]=null;g.sides.player.slots[4]='champion';refreshPositions(g);onLeave(g,'champion');assert.equal(g.units.champion.attack,4);
 g=JSON.parse(JSON.stringify(g));g.turn='player';beginOwnerTurn(g,'player');assert.equal(g.units.champion.attack,4);
 g.sides.player.slots[4]=null;g.sides.player.slots[0]='champion';refreshPositions(g);assert.equal(g.units.champion.attack,4);
});
