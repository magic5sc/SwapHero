import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assetLibrary,artIssues,resolveArt} from '../dist/src/art-assets.mjs';
import {frameAt} from '../dist/src/sequence-art.mjs';
test('existing saved libraries offer temple swordsman without overwriting drafts',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../dist/data/releases/cards-0.3.2.json',import.meta.url)));
 const old=JSON.stringify(d);assert.ok(assetLibrary(d).characters.some(a=>a.asset_id==='temple_swordsman'));assert.equal(JSON.stringify(d),old);
 d.cards[0].art_id='temple_swordsman';assert.deepEqual(artIssues(d),[]);assert.equal(resolveArt(d,d.cards[0]).character.renderer,'sequence_builtin');
});
test('sequence timing loops idle and holds attack last frame',()=>{
 assert.equal(frameAt('idle',2000),0);assert.equal(frameAt('attack',640),4);assert.equal(frameAt('attack',9999),7);
});
