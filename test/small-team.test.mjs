import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start,move,endTurn,playAI,resolveLane} from '../dist/src/battle.mjs';
import {combatTarget} from '../dist/src/match-rules.mjs';
import {mustReinforce,reinforce} from '../dist/src/formation.mjs';
const fresh=(goal='elimination')=>{const g=createGame(null,null,{victoryCondition:goal});start(g);return g;};
test('both sides search all eight occupancy masks with fixed physical priorities',()=>{
 for(const side of ['player','ai'])for(const lane of [1,2,3])for(let mask=0;mask<8;mask++){
  const g=fresh(),enemy=side==='player'?'ai':'player';
  g.sides[enemy].slots=[1,2,3].map(p=>mask&(1<<(p-1))?enemy+'-'+p:null).concat([enemy+'-4',enemy+'-5',enemy+'-6']);
  const expected=({1:[1,2,3],2:[2,1,3],3:[3,2,1]}[lane]).find(p=>mask&(1<<(p-1)));
  assert.equal(combatTarget(g,side,lane)?.position,expected);
  const hp=expected?g.units[enemy+'-'+expected].hp:null;
  resolveLane(g,side,lane,side+'-'+lane);
  if(expected)assert.equal(g.units[enemy+'-'+expected].hp,hp-g.units[side+'-'+lane].attack);
  assert.equal(g.units[enemy+'-4'].hp,16);assert.equal(g.sides[side].score,0);
 }
});
test('score mode never redirects even with occupied neighbours',()=>{
 const g=fresh('score_5');g.sides.ai.slots[1]=null;
 resolveLane(g,'player',2,'player-2');assert.equal(g.sides.player.score,1);
 assert.equal(g.units['ai-1'].hp,10);assert.equal(g.units['ai-3'].hp,14);
});
test('later attackers reselect after an earlier attacker kills their shared target',()=>{
 const g=fresh();g.sides.ai.slots[2]=null;g.units['ai-2'].hp=1;g.units['player-3'].attack=1;
 const frames=[];endTurn(g,'player',f=>frames.push(f));
 assert.deepEqual(frames.map(f=>[f.lane,f.targetLane]),[[3,2],[2,1],[1,1]]);
 assert.equal(g.units['ai-1'].hp,7);
});
test('before damage is emitted for redirected target and damage reselects after its effect',()=>{
 const g=fresh();g.sides.player.slots=['player-1',null,null,'player-4',null,null];g.sides.ai.slots[0]=null;
 g.units['ai-2'].hp=1;
 g.units['ai-2'].skills=[{level:1,definition:{skill_id:'self_hit',name:'test',levels:{1:{amount:1}},rules:[{event:'before_damage',subject:'self',effects:[{op:'deal_damage',target:'self',amount:'amount',zone:'battlefield'}]}]}}];
 const frames=[];endTurn(g,'player',f=>frames.push(f));
 assert.ok(g.trace.some(e=>e.type==='before_damage'&&e.unit==='ai-2'&&e.position===2));
 assert.equal(frames[0].targetLane,3);assert.equal(frames[0].targetId,'ai-3');assert.equal(g.units['ai-3'].hp,13);
});
test('an empty front does not expose reserves or award elimination score',()=>{
 const g=fresh();g.sides.ai.slots.splice(0,3,null,null,null);const frames=[];
 endTurn(g,'player',f=>frames.push(f));assert.equal(g.winner,null);assert.equal(g.sides.player.score,0);
 assert.ok(frames.every(f=>f.targetId===null&&f.targetLane===null));assert.equal(g.units['ai-4'].hp,16);
});
test('one front unit permits ending, exchanging or optional paid reinforcement in both modes',()=>{
 for(const goal of ['score_5','elimination']){
  const g=fresh(goal);g.sides.player.slots[1]=g.sides.player.slots[2]=null;
  assert.equal(mustReinforce(g.sides.player.slots,2),false);
  move(g,'player',4,1);move(g,'player',5,3);assert.equal(g.actionPoints,0);
  assert.equal(g.units['player-5'].disabled,true);endTurn(g,'player');assert.equal(g.turn,'ai');
  const h=fresh(goal);h.sides.player.slots[1]=null;endTurn(h,'player');assert.equal(h.turn,'ai');
 }
});
test('empty front requires only one reinforcement; no AP or reserves means no mandate',()=>{
 const g=fresh();g.sides.player.slots.splice(0,3,null,null,null);
 assert.throws(()=>endTurn(g,'player'),/强制补位/);move(g,'player',4,3);
 assert.equal(g.actionPoints,1);endTurn(g,'player');assert.equal(g.turn,'ai');
 assert.equal(mustReinforce([null,null,null,'r',null,null],0),false);
 assert.equal(mustReinforce(Array(6).fill(null),2),false);
 assert.throws(()=>reinforce([null,null,null,'r',null,null],-1,4,1));
});
test('entry effect killing the only front unit restores mandatory reinforcement',()=>{
 const g=fresh();g.mode='pve';g.sides.player.slots.splice(0,3,null,null,null);
 g.units['player-4'].hp=1;g.units['player-4'].skills=[{level:1,definition:{skill_id:'entry_hit',name:'test',levels:{1:{amount:1}},rules:[{event:'unit_enter',subject:'self',effects:[{op:'deal_damage',target:'self',amount:'amount',zone:'battlefield'}]}]}}];
 move(g,'player',4,1);assert.equal(g.actionPoints,1);assert.throws(()=>endTurn(g,'player'),/强制补位/);
 move(g,'player',5,2);endTurn(g,'player');assert.equal(g.turn,'ai');
});
test('AI retains reserves when a front unit exists in both modes',()=>{
 for(const goal of ['score_5','elimination']){const g=fresh(goal);g.turn='ai';g.sides.ai.slots[1]=g.sides.ai.slots[2]=null;
 playAI(g);assert.equal(g.sides.ai.slots[3],'ai-4');assert.equal(g.sides.ai.slots.slice(0,3).filter(Boolean).length,1);assert.equal(g.turn,'player');}
});
test('single units in different lanes finish by ordinary combat without skills',()=>{
 const g=fresh();g.sides.player.slots=['player-1',null,null,null,null,null];g.sides.ai.slots=[null,null,'ai-3',null,null,null];
 g.units['player-1'].attack=5;for(let i=0;i<20&&!g.winner;i++){if(g.turn==='player')endTurn(g,'player');else playAI(g);}
 assert.equal(g.winner,'player');assert.equal(g.phase,'finished');
});
