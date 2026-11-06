import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start} from '../dist/src/battle.mjs';
import {forecastPlayerAttack} from '../dist/src/attack-preview.mjs';

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
