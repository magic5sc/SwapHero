import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start,endTurn} from '../dist/src/battle.mjs';
import {forecastPlayerAttack,forecastEnemyAttack} from '../dist/src/attack-preview.mjs';

test('player preview skips a disabled attacker and follows mirrored targeting for each goal',()=>{
 const state=createGame(null,null,{victoryCondition:'elimination'});
 state.sides.ai.slots[0]=null;
 start(state);
 state.units[state.sides.player.slots[1]].disabled=true;
 const pairs=()=>forecastPlayerAttack(state).links.map(({from,to})=>[from,to]);
 assert.deepEqual(pairs(),[[1,3],[3,2]]);
 state.victoryCondition='score_5';
 assert.deepEqual(pairs(),[[1,3]]);
 state.units[state.sides.ai.slots[2]].hp=0;
 assert.deepEqual(pairs(),[]);
});

test('attack preview is limited to the player action phase',()=>{
 const state=createGame();
 assert.deepEqual(forecastPlayerAttack(state),{links:[],losses:[]});
 start(state);
 assert.equal(forecastPlayerAttack(state).links.length,3);
 for(const changes of [{turn:'ai'},{phase:'attack'},{winner:'player'},{error:'stopped'}]){
  assert.deepEqual(forecastPlayerAttack({...state,...changes}),{links:[],losses:[]});
 }
});

test('forecast uses shield absorption, capped HP damage and live retargeting without mutating the battle',()=>{
 const state=createGame(null,null,{victoryCondition:'elimination'});
 state.sides.ai.slots[0]=null;
 start(state);
 const first=state.units[state.sides.ai.slots[2]];
 const second=state.units[state.sides.ai.slots[1]];
 first.hp=1;
 first.shield=1;
 second.shield=2;
 state.units[state.sides.player.slots[0]].attack=5;
 state.units[state.sides.player.slots[1]].attack=3;
 const snapshot=structuredClone(state);
 assert.deepEqual(forecastPlayerAttack(state),{
  links:[{from:1,to:3,damage:1},{from:2,to:2,damage:1},{from:3,to:2,damage:1}],
  losses:[{side:'ai',slot:2,hp:second.hp,remaining:second.hp-2,maxHp:second.maxHp},{side:'ai',slot:3,hp:1,remaining:0,maxHp:first.maxHp}],
 });
 assert.deepEqual(state,snapshot);
});

test('player preview and live hit report the same HP loss when a hit triggers healing',()=>{
 const state=createGame();
 state.mode='pve';
 state.units['player-1'].attack=4;
 state.units['ai-3'].skills=[{level:1,definition:{skill_id:'recover',name:'恢复',levels:{1:{n:1}},rules:[
  {event:'damage_taken',subject:'self',effects:[{op:'heal',target:'self',zone:'battlefield',amount:'n'}]},
 ]}}];
 start(state);
 const prediction=forecastPlayerAttack(state).links[0];
 const actual=[];
 endTurn(state,'player',frame=>actual.push(frame));
 assert.equal(prediction.damage,3);
 assert.equal(prediction.damage,actual[0].damage);
 assert.equal(prediction.damage,actual[0].before.units['ai-3'].hp-actual[0].after.units['ai-3'].hp);
});

test('incoming forecast uses current enemy attack even when the player forecast defeats that enemy',()=>{
 const state=createGame();
 start(state);
 state.units['ai-3'].hp=1;
 state.units['ai-3'].attack=6;
 state.units['player-1'].shield=2;
 const snapshot=structuredClone(state);
 assert.equal(forecastPlayerAttack(state).losses.find(loss=>loss.slot===3).remaining,0);
 const incoming=forecastEnemyAttack(state);
 assert.deepEqual(incoming.links.find(link=>link.from===3),{from:3,to:1,damage:4});
 assert.equal(incoming.losses.find(loss=>loss.slot===1).remaining,state.units['player-1'].hp-4);
 assert.deepEqual(state,snapshot);
});
