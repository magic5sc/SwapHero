import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assetLibrary,artIssues,resolveArt} from '../dist/src/art-assets.mjs';
import {frameAt,sequences} from '../dist/src/sequence-art.mjs';
test('existing saved libraries offer temple swordsman without overwriting drafts',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../dist/data/releases/cards-0.3.2.json',import.meta.url)));
 const old=JSON.stringify(d);assert.ok(assetLibrary(d).characters.some(a=>a.asset_id==='temple_swordsman'));assert.equal(JSON.stringify(d),old);
 d.cards[0].art_id='temple_swordsman';assert.deepEqual(artIssues(d),[]);assert.equal(resolveArt(d,d.cards[0]).character.renderer,'sequence_builtin');
});
test('saved libraries offer archer once, preserve drafts and resolve its own rig',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../dist/data/releases/cards-0.3.2.json',import.meta.url)));
 const old=JSON.stringify(d);const lib=assetLibrary(d);
 assert.equal(lib.characters.filter(a=>a.asset_id==='temple_archer').length,1);
 assert.equal(JSON.stringify(d),old);
 d.art_assets=lib;assert.equal(assetLibrary(d).characters.length,lib.characters.length);
 d.cards[0].art_id='temple_archer';assert.deepEqual(artIssues(d),[]);
 assert.equal(resolveArt(d,d.cards[0]).character.rig,'temple_archer');
 assert.equal(frameAt('attack',729,'temple_archer'),3);
 assert.equal(frameAt('attack',730,'temple_archer'),4);
 assert.equal(frameAt('attack',1320,'temple_archer'),7);
 for(const [rig,config] of Object.entries(sequences))for(const motion of ['idle','attack']){
  const png=fs.readFileSync(new URL(`../dist/assets/characters/${config.folder}/${motion}-sheet.png`,import.meta.url));
  assert.equal(png.readUInt32BE(16),192*config.timings[motion].length,rig);
  assert.equal(png.readUInt32BE(20),192,rig);
 }
});
test('sequence timing loops idle and holds attack last frame',()=>{
 assert.equal(frameAt('idle',2000),0);assert.equal(frameAt('attack',640),4);assert.equal(frameAt('attack',9999),7);
});
test('mounted church knight is available to old drafts with independent timing',()=>{
 const d={cards:[{name:'test',art_id:'temple_knight'}]};
 assert.deepEqual(artIssues(d),[]);
 assert.equal(resolveArt(d,d.cards[0]).character.name,'教会骑士');
 assert.equal(assetLibrary({art_assets:assetLibrary(d)}).characters.filter(a=>a.asset_id==='temple_knight').length,1);
 assert.equal(frameAt('attack',440,'temple_knight'),2);
 assert.equal(frameAt('attack',1260,'temple_knight'),5);
 assert.equal(frameAt('attack',640,'temple_swordsman'),4);
 assert.equal(frameAt('attack',730,'temple_archer'),4);
});
