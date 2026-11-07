import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
  links:[{from:1,to:3,attack:5,damage:1},{from:2,to:2,attack:3,damage:1},{from:3,to:2,attack:1,damage:1}],
  losses:[{side:'ai',slot:2,hp:second.hp,remaining:second.hp-2,maxHp:second.maxHp},{side:'ai',slot:3,hp:1,remaining:0,maxHp:first.maxHp}],
 });
 assert.deepEqual(state,snapshot);
});

test('normal attack preview excludes triggered healing',()=>{
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
 assert.equal(prediction.damage,4);
 assert.equal(actual[0].damage,3);
});

test('sweep stays out of the HP forecast and overkill retains the attacker’s full attack value',()=>{
 const pack=JSON.parse(readFileSync(new URL('../dist/data/pve-test.json',import.meta.url),'utf8'));
 const sweep=pack.skills.find(skill=>skill.skill_id==='test_hero_strike');
 const state=createGame(null,null,{victoryCondition:'elimination'});
 state.mode='pve';
 state.sides.ai.slots[2]=null;
 Object.assign(state.units['player-1'],{attack:2});
 Object.assign(state.units['player-2'],{attack:6,skills:[{level:1,definition:sweep}]});
 Object.assign(state.units['player-3'],{attack:2});
 Object.assign(state.units['ai-1'],{hp:12,maxHp:12});
 Object.assign(state.units['ai-2'],{hp:6,maxHp:6});
 start(state);

 const preview=forecastPlayerAttack(state);
 assert.deepEqual(preview.links,[{from:1,to:2,attack:2,damage:2},{from:2,to:2,attack:6,damage:4},{from:3,to:1,attack:2,damage:2}]);
 assert.deepEqual(preview.losses.map(({slot,remaining})=>[slot,remaining]),[[1,10],[2,0]]);

 const live=[];
 endTurn(state,'player',frame=>live.push(frame));
 assert.equal(live[1].damage,3);
 assert.equal(state.units['ai-1'].hp,9);
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
 assert.deepEqual(incoming.links.find(link=>link.from===3),{from:3,to:1,attack:6,damage:4});
 assert.equal(incoming.losses.find(loss=>loss.slot===1).remaining,state.units['player-1'].hp-4);
 assert.deepEqual(state,snapshot);
});
