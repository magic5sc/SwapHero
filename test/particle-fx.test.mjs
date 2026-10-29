import test from 'node:test';import assert from 'node:assert/strict';
import {createSlash,sampleSlash,drawSlash} from '../dist/src/particle-fx.mjs';
import {artIssues,DEFAULT_ASSETS} from '../dist/src/art-assets.mjs';
test('particle bursts are repeatable, bounded and completely expire',()=>{
 const a=createSlash({},19),b=createSlash({},19);assert.deepEqual(a,b);
 assert.notDeepEqual(a,createSlash({},20));
 for(let ms=0;ms<420;ms+=5)for(const p of sampleSlash(a,ms).particles){assert.ok(p.x>=0&&p.x+p.size<128&&p.y>=0&&p.y+p.size<128);}
 assert.equal(sampleSlash(a,420).particles.length,0);assert.equal(sampleSlash(a,420).width,0);
});
test('straight slash is symmetric around a fixed axis with no stray pixels after expiry',()=>{
 const pixels=[];const ctx={clearRect(){pixels.length=0;},fillRect(x,y,w,h){pixels.push([x,y,w,h]);}};
 const a=createSlash({particle_count:0,angle_deg:0});drawSlash(ctx,a,130);
 assert.ok(pixels.length>50);assert.ok(pixels.every(p=>p[1]>=61&&p[1]<=66));
 drawSlash(ctx,a,420);assert.equal(pixels.length,0);
});
test('particle asset configuration validates and rejects unsupported ranges',()=>{
 const data={cards:[],art_assets:structuredClone(DEFAULT_ASSETS)};assert.deepEqual(artIssues(data),[]);
 data.art_assets.effects[0].particle_count=200;assert.ok(artIssues(data).length);
 data.art_assets.effects[0].particle_count=14;data.art_assets.effects[0].angle_deg=Infinity;assert.ok(artIssues(data).length);
});
