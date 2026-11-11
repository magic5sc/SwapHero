import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createUnit} from '../dist/src/content.mjs';
import {createGame,endTurn} from '../dist/src/battle.mjs';
import {collectPhase,drainStack,withEffectObserver,refreshPositions} from '../dist/src/effects.mjs';
const pack=JSON.parse(fs.readFileSync('dist/data/pve-test.json'));
function setup(side='player',position=4,{empty=false,lethal=false}={}){
 const g=createGame();g.mode='pve';g.phase='action';g.turn=side;g.actionPoints=0;
 for(const u of Object.values(g.units)){u.attack=0;u.skills=[];}
 const id=side+'-'+position;g.units[id]=createUnit(pack,'cult_archer',id);
 const enemy=side==='player'?'ai':'player',targetPosition=4-((position-1)%3+1),target=enemy+'-'+targetPosition;
 if(empty)g.sides[enemy].slots[targetPosition-1]=null;
 if(lethal)g.units[target].hp=1;
 refreshPositions(g);return {g,id,target,targetPosition,enemy};
}
function phase(g,type='turn_end'){const frames=[];withEffectObserver(g,f=>frames.push(f),()=>{collectPhase(g,type);drainStack(g);});return frames;}
test('cult archer workbook config is recruitable 1/6 with existing archer art and fixed level-1 own bench skill',()=>{
 const c=pack.cards.find(c=>c.card_id==='cult_archer'),s=pack.skills.find(s=>s.skill_id==='cult_archer_rain');
 assert.equal(c.name,'教团弓手');assert.equal(c.attack,1);assert.equal(c.health,6);assert.equal(c.art_id,'temple_archer');assert.ok(pack.recruits.includes(c.card_id));assert.equal(s.rules[0].turn,'own');assert.equal(s.rules[0].active_zone,'bench');assert.deepEqual(Object.keys(s.levels),['1']);
});
for(const side of ['player','ai'])for(const p of [4,5,6]){
 test(`${side} reserve ${p} hits only mirrored enemy field on own end`,()=>{const {g,id,target,targetPosition,enemy}=setup(side,p),hp=g.units[target].hp;const frames=phase(g);assert.equal(g.units[target].hp,hp-1);assert.equal(frames.length,1);assert.equal(frames[0].source,id);assert.equal(frames[0].targetId,target);assert.equal(frames[0].targetPosition,targetPosition);assert.equal(frames[0].targetSide,enemy);assert.equal(frames[0].damage,1);assert.equal(frames[0].before.units[target].hp,hp);assert.equal(frames[0].after.units[target].hp,hp-1);g.turn=enemy;assert.equal(phase(g).length,0);assert.equal(g.units[target].hp,hp-1);});
 test(`${side} reserve ${p} empty target still emits arrow rain without retargeting or damage`,()=>{const {g,targetPosition}=setup(side,p,{empty:true}),hp=Object.fromEntries(Object.values(g.units).map(u=>[u.id,u.hp]));const [f]=phase(g);assert.equal(f.targetId,null);assert.equal(f.targetPosition,targetPosition);assert.equal(f.damage,0);assert.deepEqual(Object.fromEntries(Object.values(g.units).map(u=>[u.id,u.hp])),hp);});
}
test('front-row archer does not cast; start and attack-end phases do not cast',()=>{for(const p of [1,2,3]){const {g}=setup('player',p);assert.equal(phase(g).length,0);}const {g}=setup();assert.equal(phase(g,'turn_start').length,0);assert.equal(phase(g,'attack_end').length,0);});
test('target is current occupant and source current lane, not trigger snapshot',()=>{const {g}=setup();collectPhase(g,'turn_end');[g.sides.player.slots[3],g.sides.player.slots[5]]=[g.sides.player.slots[5],g.sides.player.slots[3]];const hp=g.units['ai-1'].hp;drainStack(g);assert.equal(g.units['ai-1'].hp,hp-1);});
test('lethal arrow damage removes unit immediately, observer snapshots retain the hit and scope never persists',()=>{const {g,target}=setup('player',4,{lethal:true});const [f]=phase(g);assert.equal(f.damage,1);assert.equal(f.before.units[target].hp,1);assert.equal(f.after.units[target].hp,0);assert.ok(!g.sides.ai.slots.includes(target));assert.doesNotThrow(()=>structuredClone(g));assert.equal(phase(g).length,1);});
test('endTurn casts after ordinary attacks and before turn ownership switches',()=>{const {g}=setup();const order=[];withEffectObserver(g,f=>order.push(f.kind),()=>endTurn(g,'player',()=>order.push('attack')));assert.deepEqual(order,['attack','attack','attack','skill']);assert.equal(g.turn,'ai');});
test('empty entire enemy battlefield still casts at its paired square while enemy reserves remain',()=>{const {g}=setup();g.sides.ai.slots.splice(0,3,null,null,null);const [f]=phase(g);assert.equal(f.targetId,null);assert.equal(f.targetPosition,3);assert.equal(f.damage,0);assert.equal(g.winner,null);});
