import test from 'node:test';import assert from 'node:assert/strict';import {sample,displacement,duration,hitTime,routes} from '../dist/src/attack-motion-model.mjs';import {readFileSync} from 'node:fs';
test('preview has straight, near diagonal and far diagonal fixtures',()=>{assert.deepEqual(Object.values(routes).map(r=>[r.from,r.to]),[[0,0],[0,1],[0,2]]);});
test('both motion modes preserve target direction and return exactly home',()=>{for(const mode of ['short','card'])for(const x of [0,100,300]){const d=displacement({x:0,y:200},{x,y:0},mode,100);assert.ok(d.y<0);assert.ok(Math.abs(d.x*(-200)-d.y*x)<1e-8);assert.equal(sample(0).travel,0);assert.equal(sample(duration).travel,0);assert.equal(sample(hitTime).travel,1);}});
test('short lunge is capped and collision approaches target without passing it',()=>{assert.ok(Math.abs(Math.hypot(...Object.values(displacement({x:0,y:200},{x:300,y:0},'short')))-80)<1e-8);const d=displacement({x:0,y:200},{x:0,y:0},'card',100);assert.equal(d.y,-158);});
test('damage switches only at impact and preview does not persist or import battle',()=>{assert.equal(sample(hitTime-.001).hit,false);assert.equal(sample(hitTime).hit,true);const s=readFileSync(new URL('../dist/src/attack-motion.mjs',import.meta.url),'utf8');assert.doesNotMatch(s,/localStorage|sessionStorage|battle\.mjs|indexedDB/);});

import {targetEffectAngle,slashElapsed,slashContact} from '../dist/src/attack-motion-fx.mjs';
test('target slash follows actual attack direction; self effects stay unrotated',()=>{
 const from={x:0,y:100};
 assert.equal(targetEffectAngle(from,{x:0,y:0}),-Math.PI/2);
 assert.equal(targetEffectAngle(from,{x:100,y:0}),-Math.PI/4);
 assert.equal(targetEffectAngle(from,{x:100,y:0},'self'),0);
 assert.ok(Number.isFinite(slashContact.x)&&Number.isFinite(slashContact.y));
});
test('existing slash contact at 0.06 seconds matches preview hit time',()=>{
 assert.ok(Math.abs(slashElapsed(.48,.48)-.06)<1e-8);
 assert.ok(slashElapsed(0,.48)<0);
});
