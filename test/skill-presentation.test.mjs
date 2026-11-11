import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {skillTarget,arrowRainCastMs} from '../dist/src/skill-presentation.mjs';
const rect=(left,top,width,height)=>({getBoundingClientRect:()=>({left,top,width,height})});
test('arrow rain anchors to actual target sprite and scales down on narrow layouts',()=>{
 const sprite=rect(30,20,40,60),slot={...rect(10,0,80,80),dataset:{unitId:'enemy'},querySelector:()=>sprite};let selector;
 const root={querySelector:s=>(selector=s,slot)};
 assert.deepEqual(skillTarget(root,{targetSide:'ai',targetPosition:3,targetId:'enemy'}),{point:{x:50,y:50},scale:.65});
 assert.equal(selector,'[data-side="ai"][data-slot="3"]');assert.equal(arrowRainCastMs,730);
});
test('empty enemy slot receives arrow rain at its own center, not another occupant',()=>{
 const slot={...rect(80,40,100,130),dataset:{},querySelector:()=>{throw Error('empty slot cannot have a target sprite');}};
 assert.deepEqual(skillTarget({querySelector:()=>slot},{targetSide:'player',targetPosition:1,targetId:null}),{point:{x:130,y:105},scale:1});
 assert.equal(skillTarget({querySelector:()=>null},{}),null);
});
test('battle captures player and AI skill frames with the existing locked playback flow',()=>{
 const source=readFileSync(new URL('../dist/src/app.mjs',import.meta.url),'utf8');
 assert.match(source,/withEffectObserver\(sim,e=>frames.push\(e\),\(\)=>endTurn/);
 assert.match(source,/withEffectObserver\(sim,e=>frames.push\(e\),\(\)=>playAI/);
 assert.match(source,/if\(f.kind==='skill'\)/);
 assert.match(source,/lane:f.sourcePosition/);
 const presenter=readFileSync(new URL('../dist/src/skill-presentation.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(presenter,/\.animate\(|localStorage|sessionStorage/);
 assert.match(presenter,/finally\{cancelAnimationFrame\(raf\);canvas.remove\(\);\}/);
});
