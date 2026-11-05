import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start,move,endTurn,playAI,upgradeBattle} from '../dist/src/battle.mjs';
import {combatTarget,displayPositions} from '../dist/src/match-rules.mjs';
import {createEnemyPlan,preparationBadges,validEnemyPlan,POWER_ATTACK_ICON} from '../dist/src/enemy-plan.mjs';
import {grantBuff} from '../dist/src/buffs.mjs';
import {collectEvent,drainStack,refreshPositions} from '../dist/src/effects.mjs';
import fs from 'node:fs';
import {createTurnPlanFixture} from '../dist/src/turn-plan-lab.mjs';
import {newRun,enterNode,availableNodes,encodeRun,decodeRun} from '../dist/src/pve.mjs';
const game=()=>{const g=createGame(null,null,{victoryCondition:'elimination'});g.mode='pve';for(const u of Object.values(g.units))u.attack=0;return g;};
test('both perspectives attack own left to right and hit mirrored opposing grids',()=>{
 for(const side of ['player','ai']){const g=game();start(g);g.turn=side;const enemy=side==='player'?'ai':'player';const frames=[];endTurn(g,side,f=>frames.push(f));assert.deepEqual(frames.map(f=>[f.lane,f.targetLane]),[[1,3],[2,2],[3,1]]);for(let p=1;p<=3;p++)assert.equal(combatTarget(g,side,p).id,enemy+'-'+(4-p));}
 assert.deepEqual(displayPositions('ai'),[3,2,1]);assert.deepEqual(displayPositions('player'),[1,2,3]);
});
test('player exchanges resolve immediately and do not start attacks before ending',()=>{
 const g=game();start(g);const hp=g.units['ai-3'].hp;move(g,'player',4,1);assert.equal(g.sides.player.slots[0],'player-4');assert.equal(g.turn,'player');assert.equal(g.phase,'action');assert.equal(g.actionPoints,1);assert.equal(g.units['player-4'].disabled,true);assert.equal(g.units['ai-3'].hp,hp);
});
test('plan is generated after player start effects and stays fixed through player moves and saves',()=>{
 const g=game();g.units['ai-1'].hp=3;
 g.units['player-1'].skills=[{level:1,definition:{skill_id:'open',name:'开场',levels:{1:{n:1}},rules:[{event:'turn_start',turn:'own',subject:'self',effects:[{op:'deal_damage',target:'all_enemies',zone:'battlefield',amount:'n',damage_type:'skill'}]}]}}];
 start(g);assert.equal(g.units['ai-1'].hp,2);const plan=structuredClone(g.enemyPlan);assert.equal(plan.operations[0].outgoing,'ai-1');move(g,'player',4,1);assert.deepEqual(g.enemyPlan,plan);const saved=JSON.parse(JSON.stringify(g));upgradeBattle(saved);assert.deepEqual(saved.enemyPlan,plan);
});
test('published voluntary exchange is executed, AP charged, incoming cannot attack',()=>{
 const g=game();g.units['ai-1'].hp=2;start(g);endTurn(g,'player');const moves=[],attacks=[];playAI(g,f=>attacks.push(f),m=>moves.push(m));assert.equal(moves.length,1);assert.equal(moves[0].after.actionPoints,1);assert.equal(g.sides.ai.slots[0],'ai-4');assert.ok(!attacks.some(f=>f.lane===1));assert.equal(g.turn,'player');assert.ok(validEnemyPlan(g.enemyPlan));
});
test('invalid operation is skipped and a subsequent legal operation still executes',()=>{
 const g=game();start(g);g.enemyPlan.operations=[{type:'exchange',from:4,to:1,incoming:'ai-4',outgoing:'ai-1'},{type:'exchange',from:5,to:2,incoming:'ai-5',outgoing:'ai-2'}];g.sides.ai.slots[0]=null;g.units['ai-1'].hp=0;endTurn(g,'player');const moves=[];playAI(g,null,m=>moves.push(m));assert.equal(moves.length,1);assert.equal(g.sides.ai.slots[1],'ai-5');assert.equal(g.sides.ai.slots[3],'ai-4');assert.ok(g.log.includes('敌方计划操作已失效，跳过'));
});
test('a different occupant in a planned slot never substitutes for the bound role',()=>{
 const g=game();g.units['ai-1'].hp=2;start(g);[g.sides.ai.slots[0],g.sides.ai.slots[1]]=[g.sides.ai.slots[1],g.sides.ai.slots[0]];endTurn(g,'player');playAI(g);assert.equal(g.sides.ai.slots[0],'ai-2');assert.equal(g.sides.ai.slots[3],'ai-4');
});
test('default mandatory reinforcement survives an empty or invalidated plan',()=>{
 for(const invalid of [false,true]){const g=game();start(g);if(invalid)g.enemyPlan.operations=[{type:'exchange',from:4,to:1,incoming:'ai-4',outgoing:'ai-1'}];for(let p=0;p<3;p++){g.units[g.sides.ai.slots[p]].hp=0;g.sides.ai.slots[p]=null;}endTurn(g,'player');const moves=[];playAI(g,null,m=>moves.push(m));assert.equal(moves.length,1);assert.equal(g.sides.ai.slots.slice(0,3).filter(Boolean).length,1);assert.equal(moves[0].after.actionPoints,1);}
});
test('no fresh voluntary planning on enemy turn, including old save missing a plan',()=>{
 const g=game();start(g);assert.equal(g.enemyPlan.operations.length,0);g.units['ai-1'].hp=1;endTurn(g,'player');playAI(g);assert.equal(g.sides.ai.slots[0],'ai-1');
 const h=game();start(h);endTurn(h,'player');delete h.enemyPlan;h.units['ai-1'].hp=1;upgradeBattle(h);playAI(h);assert.equal(h.sides.ai.slots[0],'ai-1');
});
test('legacy layout upgrade preserves screen positions, rear pairs and is idempotent',()=>{
 const g=game();delete g.ruleVersion;const original=[...g.sides.ai.slots];upgradeBattle(g);assert.deepEqual(g.sides.ai.slots,[original[2],original[1],original[0],original[5],original[4],original[3]]);const once=JSON.stringify(g);upgradeBattle(g);assert.equal(JSON.stringify(g),once);
});
test('skill opposing and implicit enemy rear use mirrored grids; explicit rear is enemy-local',()=>{
 for(const [target,field_position,expected] of [['opposing_unit',undefined,'ai-3'],['rear_enemy',undefined,'ai-6'],['rear_enemy',1,'ai-4']]){
 const g=game();start(g);g.units['player-1'].skills=[{level:1,definition:{skill_id:'hit',name:'test',levels:{1:{n:1}},rules:[{event:'healed',subject:'self',effects:[{op:'deal_damage',target,field_position,zone:target==='opposing_unit'?'battlefield':'bench',amount:'n',damage_type:'skill'}]}]}}];const hp=g.units[expected].hp;collectEvent(g,{type:'healed',unit:'player-1',side:'player',position:1});drainStack(g);assert.equal(g.units[expected].hp,hp-1);
 }
});
test('generic active marker Buffs supply preparation badges and survive serialization',()=>{
 const g=game();const b={id:'ready',name:'防守反击准备',kind:'marker',active_zone:'battlefield',stacking:'refresh',scope:'buff',max_stacks:1,duration:'battle',leave:'keep'};grantBuff(g.units['ai-2'],b,{source:'ai-2',skillId:'test',value:0});refreshPositions(g);assert.equal(preparationBadges(g,'ai-2',2)[0].label,b.name);const saved=JSON.parse(JSON.stringify(g));assert.deepEqual(preparationBadges(saved,'ai-2',2),preparationBadges(g,'ai-2',2));assert.deepEqual(preparationBadges(g,'ai-2',5),[]);
});
test('malformed plan is rejected before enemy actions and plan generation is pure',()=>{
 const g=game();start(g);const saved=JSON.stringify(g);createEnemyPlan(g);assert.equal(JSON.stringify(g),saved);g.enemyPlan.operations=[{from:1}];assert.equal(validEnemyPlan(g.enemyPlan),false);g.turn='ai';assert.throws(()=>playAI(g),/计划存档无效/);
});
test('dedicated disposable fixture leaves published pack unchanged and advertises a real exchange',()=>{
 const p=JSON.parse(fs.readFileSync('dist/data/tutorial.json'));const before=JSON.stringify(p);const g=createTurnPlanFixture(p,'tutorial_01');start(g);assert.equal(g.enemyPlan.operations.length,1);assert.equal(g.enemyPlan.operations[0].incoming,'qa-enemy-reserve');assert.equal(JSON.stringify(p),before);
});
test('adventure roundtrip keeps the announced plan and rejects malformed saved plans',()=>{
 const p=JSON.parse(fs.readFileSync('dist/data/pve-test.json'));const r=newRun(p,'plan-save');enterNode(r,availableNodes(r)[0]);start(r.battle);const plan=structuredClone(r.battle.enemyPlan);assert.deepEqual(decodeRun(encodeRun(r)).battle.enemyPlan,plan);r.battle.enemyPlan.operations=[{type:'exchange',from:1}];assert.throws(()=>encodeRun(r),/计划存档无效/);
});
test('teaching charge keeps text while actual ready state uses the powerful attack icon',()=>{
 const pack=JSON.parse(fs.readFileSync('dist/data/tutorial.json')),g=createTurnPlanFixture(pack,'tutorial_01');start(g);
 const u=g.units['ai-2'];grantBuff(u,pack.buffs.tutorial_retaliation_charge,{source:u.id,skillId:'test',value:0,definitions:pack.buffs});assert.equal(preparationBadges(g,u.id,2).find(b=>b.label==='蓄力').icon,'');
 grantBuff(u,pack.buffs.tutorial_retaliation_ready,{source:u.id,skillId:'test',value:0,definitions:pack.buffs});assert.equal(preparationBadges(g,u.id,2).find(b=>b.label==='反击准备').icon,POWER_ATTACK_ICON);
 const ready=u.buffs.find(b=>b.id==='tutorial_retaliation_ready');ready.definition.icon='assets/status/custom.png';assert.equal(preparationBadges(g,u.id,2).find(b=>b.label==='反击准备').icon,ready.definition.icon);
 ready.definition.icon='https://external.example/tracker.png';assert.equal(preparationBadges(g,u.id,2).find(b=>b.label==='反击准备').icon,POWER_ATTACK_ICON);
 ready.definition.rules[0].conditions[0].layers=2;assert.equal(preparationBadges(g,u.id,2).find(b=>b.label==='反击准备').icon,'');
});
