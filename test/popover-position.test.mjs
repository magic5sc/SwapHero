import test from 'node:test';
import assert from 'node:assert/strict';
import {popoverPosition} from '../dist/src/popover-position.mjs';
test('popover follows pointer with small clearance rather than card corner',()=>{
 const box={width:300,height:180},viewport={width:1280,height:800};assert.deepEqual(popoverPosition({x:400,y:250},box,viewport),{left:412,top:262});assert.deepEqual(popoverPosition({x:420,y:270},box,viewport),{left:432,top:282});
});
test('screen edges flip and clamp the popup for mouse and long-press coordinates',()=>{
 for(const viewport of [{width:390,height:844},{width:1280,height:720}])for(const x of [0,20,viewport.width-1])for(const y of [0,20,viewport.height-1]){const b={width:300,height:180},p=popoverPosition({x,y},b,viewport);assert.ok(p.left>=8&&p.top>=8);assert.ok(p.left+b.width<=viewport.width-8);assert.ok(p.top+b.height<=viewport.height-8);}
 assert.deepEqual(popoverPosition({x:380,y:830},{width:300,height:180},{width:390,height:844}),{left:68,top:638});
});
