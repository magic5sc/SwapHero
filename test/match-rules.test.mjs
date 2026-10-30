import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,start,move,endTurn,playAI,resolveLane} from '../dist/src/battle.mjs';
import {reserveBehind,fieldAhead,migrateFormation,validateFormation} from '../dist/src/formation.mjs';
import {collectEvent,drainStack,applyDamage,updateState} from '../dist/src/effects.mjs';
import {validateCatalog} from '../dist/src/content.mjs';
import {editorIssues,makeSkill,makePlaySnapshot} from '../dist/src/editor-model.mjs';
const elimination=()=>createGame(null,null,{victoryCondition:'elimination'});
function bind(g,{target='rear_ally',field_position,op='heal',amount=2}={}) {
 const s=makeSkill('rear_test');s.levels={1:{amount}};s.rules=[{event:'unit_enter',subject:'other_ally',effects:[{op,target,field_position,amount:'amount',duration:op==='modify_attack'?'battle':null,zone:'bench',damage_type:op==='deal_damage'?'skill':null}]}];
 g.units['player-2'].skills=[{slotId:'origin',level:1,definition:s}];return s;
}
test('six positions map three front/reserve pairs and reject removed positions',()=>{
 const g=createGame();assert.equal(g.sides.ai.slots.length,6);assert.equal(g.sides.player.slots.length,6);
 for(let p=1;p<=3;p++){assert.equal(reserveBehind(p),p+3);assert.equal(fieldAhead(p+3),p);}
 assert.throws(()=>fieldAhead(7));assert.throws(()=>reserveBehind(4));
 assert.deepEqual(migrateFormation(['a','b','c','d','e','f',null,null]),['a','b','c','d','e','f']);
 assert.throws(()=>migrateFormation(['a','b','c','d','e','f','g',null]),/重新编队/);
 assert.throws(()=>validateFormation(Array(8).fill(null)));
});
test('cross-lane swaps keep outgoing unit in incoming original reserve and use both AP',()=>{
 const g=createGame();start(g);move(g,'player',4,3);
 assert.equal(g.sides.player.slots[2],'player-4');assert.equal(g.sides.player.slots[3],'player-3');
 assert.equal(g.actionPoints,1);move(g,'player',5,1);assert.equal(g.actionPoints,0);assert.throws(()=>move(g,'player',6,2));
});
test('elimination keeps playing at five points and counts reserve survivors',()=>{
 const g=elimination();start(g);g.sides.ai.slots.splice(0,3,null,null,null);g.sides.player.score=4;
 endTurn(g,'player');assert.equal(g.sides.player.score,4);assert.equal(g.winner,null);assert.equal(g.turn,'ai');
 playAI(g);assert.equal(g.winner,null);assert.equal(g.sides.ai.slots.filter(Boolean).length,3);
});
test('last reserve death wins immediately by skill damage in either goal',()=>{
 for(const victoryCondition of ['score_5','elimination'])for(const targetSide of ['ai','player']){
 const g=createGame(null,null,{victoryCondition});start(g);const side=targetSide==='ai'?'player':'ai';
 g.sides[targetSide].slots=[null,null,null,null,null,`${targetSide}-6`];
 applyDamage(g,`${side}-1`,`${targetSide}-6`,100,'skill');assert.equal(g.winner,side);assert.equal(g.phase,'finished');
 }
});
test('elimination combat kill wins and stops later attacks; empty front is not victory',()=>{
 const g=elimination();start(g);g.sides.ai.slots=[null,null,'ai-3',null,null,null];g.units['ai-3'].hp=1;
 const frames=[];endTurn(g,'player',x=>frames.push(x));assert.equal(g.winner,'player');assert.deepEqual(frames.map(x=>x.lane),[3]);
 const h=elimination();h.sides.ai.slots.splice(0,3,null,null,null);updateState(h);assert.equal(h.winner,null);
});
test('invalid and combined goals are rejected, simultaneous defeat stays unresolved',()=>{
 assert.throws(()=>createGame(null,null,{victoryCondition:['score_5','elimination']}));
 assert.throws(()=>createGame(null,null,{victoryCondition:'unknown'}));
 const g=elimination();for(const u of Object.values(g.units))u.hp=0;updateState(g);assert.equal(g.winner,null);assert.equal(g.phase,'error');
});
test('own rear means current lane, not exchange destination or source',()=>{
 const g=createGame();bind(g);g.units['player-5'].hp=3;start(g);move(g,'player',4,3);
 assert.equal(g.units['player-5'].hp,5);assert.equal(g.sides.player.slots[3],'player-3');
});
test('specified rear lane can heal outgoing unit after cross-lane exchange',()=>{
 const g=createGame();bind(g,{field_position:1});g.units['player-3'].hp=3;start(g);move(g,'player',4,3);
 assert.equal(g.units['player-3'].hp,5);assert.equal(g.sides.player.slots[3],'player-3');
});
test('enemy rear target damages reserve only, no automatic front penetration',()=>{
 const g=createGame();bind(g,{target:'rear_enemy',field_position:3,op:'deal_damage'});start(g);move(g,'player',4,1);
 assert.equal(g.units['ai-6'].hp,18);assert.equal(g.units['ai-3'].hp,14);
 const h=createGame();start(h);h.sides.ai.slots[0]=null;resolveLane(h,'player',1,'player-1');assert.equal(h.units['ai-4'].hp,16);
});
test('rear snapshots do not retarget new occupants; target entering field invalidates job',()=>{
 const g=createGame();bind(g);g.units['player-5'].hp=3;
 collectEvent(g,{type:'unit_enter',unit:'player-1',side:'player',position:1});
 [g.sides.player.slots[4],g.sides.player.slots[0]]=[g.sides.player.slots[0],g.sides.player.slots[4]];
 drainStack(g);assert.equal(g.units['player-5'].hp,3);assert.equal(g.units['player-1'].hp,10);
});
test('empty rear has no target and reserve listeners remain inactive',()=>{
 const g=createGame();bind(g);g.sides.player.slots[4]=null;
 collectEvent(g,{type:'unit_enter',unit:'player-1',side:'player',position:1});assert.deepEqual(g.stack[0].effects[0].targets,[]);drainStack(g);
 [g.sides.player.slots[1],g.sides.player.slots[3]]=[g.sides.player.slots[3],g.sides.player.slots[1]];
 collectEvent(g,{type:'unit_enter',unit:'player-1',side:'player',position:1});assert.equal(g.stack.length,0);
});
test('rear target is configurable, survives editor snapshot and rejects bad lane/zone',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../dist/data/skill-lab.json',import.meta.url)));
 const g=createGame();const skill=bind(g,{field_position:3});catalog.skills.push(skill);
 catalog.cards[0].skills[0]={...catalog.cards[0].skills[0],skill_id:skill.skill_id};
 assert.deepEqual(editorIssues(catalog),[]);const snap=makePlaySnapshot(catalog,catalog.team);
 assert.equal(snap.catalog.skills.at(-1).rules[0].effects[0].field_position,3);
 skill.rules[0].effects[0].field_position=4;assert.ok(validateCatalog(catalog).some(x=>x.includes('战线')));
 skill.rules[0].effects[0].field_position=2;skill.rules[0].effects[0].zone='battlefield';assert.ok(validateCatalog(catalog).some(x=>x.includes('备战区')));
});
test('both goals complete an automatic low-health match using legal reinforcements',()=>{
 for(const victoryCondition of ['score_5','elimination']){
 const g=createGame(null,null,{victoryCondition});for(const u of Object.values(g.units)){u.attack=3;u.hp=2;u.maxHp=2;}start(g);
 for(let turn=0;turn<20&&!g.winner;turn++){
 if(g.turn==='ai')playAI(g);else {while(g.actionPoints>0&&g.sides.player.slots.slice(0,3).includes(null)&&g.sides.player.slots.slice(3).some(Boolean)){
 const s=g.sides.player.slots;move(g,'player',s.findIndex((id,i)=>i>=3&&id)+1,s.findIndex((id,i)=>i<3&&!id)+1);
 }endTurn(g,'player');}}
 assert.equal(g.phase,'finished');assert.ok(g.winner);
 }
});
