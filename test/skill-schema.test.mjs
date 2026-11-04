import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables,normalizeTables} from '../dist/src/workbook.mjs';
import {migrateSkillTables} from '../dist/src/skill-tables.mjs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {start,move,endTurn,playAI} from '../dist/src/battle.mjs';
import {collectEvent,collectPhase,drainStack,applyDamage,refreshPositions} from '../dist/src/effects.mjs';
import {buffLayers,grantBuff,removeBuff,expireBuffs} from '../dist/src/buffs.mjs';
import {describeSkill} from '../dist/src/skill-text.mjs';
import {validatePack,upgradePreview} from '../dist/src/pve.mjs';
const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'});
const tables=()=>normalizeTables(Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})])));
const compile=t=>compileTables(t,null,{levelOnly:true});
const put=(t,n,i,k,v)=>t[n][i][t[n][0].indexOf(k)]=v;
function game(t=tables()){const g=createLevelBattle(compile(t),'tutorial_01');start(g);return g;}
const marker={id:'charge',name:'蓄力',kind:'marker',active_zone:'any',stacking:'add',scope:'source_skill',max_stacks:99,duration:'battle',turns:null,leave:'keep'};
test('one skill owns multiple triggers and ordered results, independent level amounts',()=>{
 const t=tables();for(const row of t.BuffEffect.slice(1)){const r=[...row];r[1]='tutorial_retaliation';r[2]=r[0].endsWith('_prepare')?2:3;t.SkillEffect.push(r);for(const result of t.EffectResult.slice(1).filter(x=>x[0]===row[12]))for(const lv of [1,2,3])result[t.EffectResult[0].indexOf('等级'+lv)]=result[t.EffectResult[0].indexOf('数值')];}t.BuffEffect=[t.BuffEffect[0]];
 const p=compile(t),s=p.skills.find(s=>s.skill_id==='tutorial_retaliation');
 assert.equal(s.rules.length,3);assert.deepEqual(s.rules[2].effects.map(e=>e.op),['remove_buff','apply_buff']);
 const row=t.EffectResult.findIndex(r=>r[0]==='tutorial_retaliation_release'&&r[2]==='apply_buff');put(t,'EffectResult',row,'等级2',5);
 const changed=compile(t).skills.find(s=>s.skill_id==='tutorial_retaliation');
 assert.equal(changed.levels[2][changed.rules[2].effects[1].amount],5);assert.equal(changed.levels[2][changed.rules[2].effects[0].amount],1);
});
test('conditions snapshot once per event; six charge layers cause one release consuming three',()=>{
 const g=game(),u=g.units['ai-2'],definitions=u.skills[0].definition.buffs;u.skills=[];
 const b=definitions.tutorial_retaliation_charge;grantBuff(u,b,{source:u.id,skillId:'tutorial_retaliation',value:0,stacks:6,definitions});
 g.turn='ai';collectPhase(g,'turn_end');drainStack(g);
 assert.equal(buffLayers(u,b.id),3);assert.equal(buffLayers(u,'tutorial_retaliation_ready'),1);
});
test('bench listeners count only owning turns; removing state makes continuous residence reset explicit',()=>{
 const g=game(),u=g.units['player-5'];u.hp=5;
 u.skills=[{level:1,definition:{skill_id:'rest',name:'休整',levels:{1:{n:2}},rules:[{event:'turn_end',subject:'self',active_zone:'bench',turn:'own',effects:[{op:'heal',target:'self',zone:'bench',amount:'n',duration:null,grid:true}]}]}}];
 g.turn='ai';collectPhase(g,'turn_end');drainStack(g);assert.equal(u.hp,5);
 g.turn='player';collectPhase(g,'turn_end');drainStack(g);assert.equal(u.hp,7);
 grantBuff(u,{...marker,leave:'remove'},{source:u.id,skillId:'rest',value:0,stacks:2});
 // A separate entry effect can remove a reserve counter. No implicit listener reset.
 u.skills[0].definition.rules.push({event:'unit_enter',subject:'self',active_zone:'battlefield',effects:[{op:'remove_buff',target:'self',zone:'any',buff:marker,amount:'n',duration:null,grid:true}]});
 move(g,'player',5,2);assert.equal(buffLayers(u,'charge'),0);
});
test('grid result hits the current occupant, not the unit present when triggered',()=>{
 const g=game(),u=g.units['player-2'];u.skills=[{level:1,definition:{skill_id:'hit',name:'打前方',levels:{1:{n:2}},rules:[{event:'healed',subject:'self',active_zone:'battlefield',effects:[{op:'deal_damage',target:'opposing_unit',zone:'battlefield',amount:'n',duration:null,grid:true}]}]}}];
 g.units.replacement={id:'replacement',name:'接替者',hp:9,maxHp:9,attack:0,skills:[]};g.sides.ai.slots[4]='replacement';
 collectEvent(g,{type:'healed',unit:u.id,side:'player',position:2});[g.sides.ai.slots[1],g.sides.ai.slots[4]]=[g.sides.ai.slots[4],g.sides.ai.slots[1]];refreshPositions(g);drainStack(g);
 assert.equal(g.units.replacement.hp,7);assert.equal(g.units['ai-2'].hp,7);
});
test('ordered results use position after preceding movement; front sides do not wrap',()=>{
 const g=game(),u=g.units['player-2'];g.units.ally={id:'ally',name:'友军',hp:10,maxHp:10,attack:0,skills:[]};g.sides.player.slots[2]='ally';
 for(const i of [1,3]){const id='foe'+i;g.units[id]={id,name:id,hp:10,maxHp:10,attack:0,skills:[]};g.sides.ai.slots[i-1]=id;}
 u.skills=[{level:1,definition:{skill_id:'step',name:'移步',levels:{1:{n:2}},rules:[{event:'healed',subject:'self',active_zone:'battlefield',effects:[{op:'swap_positions',target:'lower_ally',zone:'battlefield',amount:null,grid:true},{op:'deal_damage',target:'front_sides',zone:'battlefield',amount:'n',grid:true}]}]}}];
 collectEvent(g,{type:'healed',unit:u.id,side:'player',position:2});drainStack(g);
 assert.equal(g.sides.player.slots[2],u.id);assert.equal(g.units['ai-2'].hp,5);assert.equal(g.units.foe1.hp,10);assert.equal(g.units.foe3.hp,10);
});
test('Buff sources are independent, refresh restores own shield, removal consumes layers',()=>{
 const g=game(),u=g.units['player-2'],shield={...marker,id:'shield',name:'护盾',kind:'shield',stacking:'refresh',max_stacks:1};
 grantBuff(u,shield,{source:'a',skillId:'s',value:5});grantBuff(u,shield,{source:'b',skillId:'s',value:2});
 assert.equal(u.buffShield,7);applyDamage(g,'ai-2',u.id,4);assert.equal(u.buffShield,3);
 grantBuff(u,shield,{source:'b',skillId:'s',value:2});assert.equal(u.buffShield,3);
 grantBuff(u,marker,{source:'a',skillId:'s',value:0,stacks:5});removeBuff(u,'charge',3);assert.equal(buffLayers(u,'charge'),2);
 const restored=JSON.parse(JSON.stringify(g));assert.equal(restored.units[u.id].buffShield,3);
});
test('Buff lifetime can pause in reserve and negative attack grants are valid',()=>{
 const t=tables();const idx=t.EffectResult.findIndex(r=>r[0]==='tutorial_arrival_result');put(t,'EffectResult',idx,'等级1',-1);assert.doesNotThrow(()=>compile(t));
 const u={attack:3,position:5};grantBuff(u,{...marker,kind:'attack',stacking:'refresh',duration:'owner_turns',turns:2,leave:'pause'},{source:'a',skillId:'s',value:-1});
 assert.equal(u.attack,2);expireBuffs(u,{ownerEnd:true});assert.equal(u.buffs[0].remaining,2);u.position=1;expireBuffs(u,{ownerEnd:true});expireBuffs(u,{ownerEnd:true});assert.equal(u.attack,3);
});
test('invalid ownership, group sequence, Buff references and unsupported timings fail at import',()=>{
 for(const edit of [t=>put(t,'SkillEffect',1,'SkillID','missing'),t=>put(t,'SkillEffect',1,'ResultGroupID','missing'),t=>put(t,'EffectResult',1,'BuffID','missing'),t=>put(t,'SkillEffect',1,'触发时机','future_event'),t=>t.EffectResult.push([...t.EffectResult[1]]),t=>put(t,'SkillEffect',1,'条件层数',3)]){const t=tables();edit(t);assert.throws(()=>compile(t));}
});
test('legacy one-row skill format imports without mutating the supplied data',()=>{
 const t=tables();delete t.SkillEffect;delete t.EffectResult;delete t.Buff;delete t.BuffEffect;
 t.Skill=[['SkillID','名称','说明','技能栏','生效区域','触发时机','触发主体','效果','目标','目标区域','持续时间','常驻能力','等级1','等级2','等级3','品质','精英限定'],['legacy','旧技能','','unit_enter','battlefield','unit_enter','self','heal','self','any','','',1,2,3,'common',false]];
 const before=structuredClone(t),next=migrateSkillTables(t);assert.deepEqual(t,before);assert.equal(next.SkillEffect.length,2);assert.equal(next.EffectResult[1][7],1);assert.deepEqual(migrateSkillTables(next),next);
});
test('multi-effect descriptions show Buff conditions and operations without raw parameter names',()=>{
 const s=compile(tables()).skills.find(s=>s.skill_id==='tutorial_retaliation'),text=describeSkill(s);
 assert.match(text,/蓄力≥3层/);assert.match(text,/移除3层/);assert.match(text,/攻击\+3/);assert.ok(!text.includes('undefined')&&!text.includes('apply_buff'));
});
test('one-level skills are valid in adventure and do not offer an unavailable upgrade',()=>{
 const p=JSON.parse(fs.readFileSync('dist/data/pve-test.json')),s=p.skills[0];delete s.levels[2];delete s.levels[3];assert.doesNotThrow(()=>validatePack(p));assert.equal(upgradePreview({definition:s,level:1}).after,null);
});
