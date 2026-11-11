import test from 'node:test';
import assert from 'node:assert/strict';
import * as arrows from '../dist/vendor/pixelfx/src/fx/projectiles/arrow-rain.js';
import {createFx,createFrame} from '../dist/vendor/pixelfx/src/core/index.js';
const frameAt=(t,options={})=>{const f=createFrame(128,160),fx=createFx(arrows,{x:78,y:120,...options});fx.update(t);fx.draw(f);return f;};
test('arrow rain is deterministic, palette-aware and ends empty',()=>{
 assert.deepEqual(frameAt(.43),frameAt(.43));
 assert.notDeepEqual(frameAt(.43),frameAt(.43,{seed:42}));
 assert.notDeepEqual(frameAt(.43),frameAt(.43,{palette:['#123456','#ffffff']}));
 for(const t of [.1,.3,.43,.6,.9])assert.ok(frameAt(t).color.some(Boolean));
 for(const t of [0,arrows.timing.end,2]){const f=frameAt(t);assert.ok(f.color.every(x=>x===0));assert.ok(f.light.every(x=>x===0));}
 assert.equal(arrows.meta.duration,arrows.timing.end);
 assert.ok(arrows.timing.hit<arrows.timing.lastHit&&arrows.timing.lastHit<arrows.timing.end);
});
test('first arrow tip arrives at the exact target anchor at hit time',()=>{
 const f=frameAt(arrows.timing.hit);
 assert.ok(f.color[120*128+78]);
 const moved=frameAt(arrows.timing.hit,{x:68,y:110});
 assert.ok(moved.color[110*128+68]);
});
