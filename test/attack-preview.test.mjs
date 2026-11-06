import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start} from '../dist/src/battle.mjs';
import {attackPreviewLinks} from '../dist/src/attack-preview.mjs';

test('player preview skips a disabled attacker and follows mirrored targeting for each goal',()=>{
 const state=createGame(null,null,{victoryCondition:'elimination'});
 state.sides.ai.slots[0]=null;
 start(state);
 state.units[state.sides.player.slots[1]].disabled=true;
 const pairs=()=>attackPreviewLinks(state).map(({from,to})=>[from,to]);
 assert.deepEqual(pairs(),[[1,3],[3,2]]);
 state.victoryCondition='score_5';
 assert.deepEqual(pairs(),[[1,3]]);
 state.units[state.sides.ai.slots[2]].hp=0;
 assert.deepEqual(pairs(),[]);
});

test('attack preview is limited to the player action phase',()=>{
 const state=createGame();
 assert.deepEqual(attackPreviewLinks(state),[]);
 start(state);
 assert.equal(attackPreviewLinks(state).length,3);
 for(const changes of [{turn:'ai'},{phase:'attack'},{winner:'player'},{error:'stopped'}]){
  assert.deepEqual(attackPreviewLinks({...state,...changes}),[]);
 }
});
