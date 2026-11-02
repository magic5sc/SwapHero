import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables} from '../dist/src/workbook.mjs';
import {newRun,availableNodes,enterNode,candidates,claimReward,encodeRun,decodeRun} from '../dist/src/pve.mjs';
const book=XLSX.read(fs.readFileSync('dist/config/SwapHero.xlsx'),{type:'buffer'});
const rows=()=>Object.fromEntries(book.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(book.Sheets[n],{header:1,defval:''})]));
const economy=JSON.parse(fs.readFileSync('dist/config/economy.json'));
test('published JSON matches the workbook, invalid rear position reports sheet row and column',()=>{
 const t=rows();assert.deepEqual(compileTables(t,economy),JSON.parse(fs.readFileSync('dist/data/pve-test.json')));
 t.Level[1][7]='missing';assert.throws(()=>compileTables(t,economy),/Level 第2行 \[备右\]/);
});
test('configured lane gaps, duplicate enemy instances and victory mode survive encounter and reload',()=>{
 const t=rows();t.Level[1].splice(2,7,'test_guard','','','','','test_guard','score_5');
 const r=newRun(compileTables(t,economy),'lane');enterNode(r,availableNodes(r)[0]);const b=r.battle;
 assert.deepEqual(b.sides.ai.slots,['enemy-1',null,null,null,null,'enemy-6']);
 b.units['enemy-1'].hp--;assert.notEqual(b.units['enemy-1'].hp,b.units['enemy-6'].hp);
 assert.equal(decodeRun(encodeRun(r)).battle.victoryCondition,'score_5');
});
test('skill reward recipient is fixed on the card, saved, and granted separately to two characters',()=>{
 const r=newRun(compileTables(rows(),economy),'shared');
 enterNode(r,availableNodes(r)[0]);r.battle=null;
 function grant(item){r.status='reward';r.room.resolved=false;r.room.choices=[item];claimReward(r,0);}
 grant(candidates(r).find(c=>c.id===r.pack.recruits[0]));
 const options=candidates(r).filter(c=>c.id==='shared_agility');assert.equal(options.length,2);
 grant(options[0]);assert.deepEqual(candidates(r).filter(c=>c.id==='shared_agility'),[options[1]]);
 r.status='reward';r.room.resolved=false;r.room.choices=[options[1]];
 const restored=decodeRun(encodeRun(r));claimReward(restored,0);assert.ok(restored.team.every(u=>u.skills.some(s=>s.definition.skill_id==='shared_agility')));
 assert.doesNotThrow(()=>encodeRun(restored));
});
test('overlapping node rows draw reproducibly by relative weight, within layer limits',()=>{
 const t=rows(),pack=compileTables(t,economy);
 const picks=[];
 for(let i=0;i<100;i++){
  const r=newRun(pack,String(i));enterNode(r,availableNodes(r)[0]);
  assert.equal(r.battle.levelId,'scout');r.status='map';
  const next=availableNodes(r)[0];r.map.nodes.find(n=>n.id===next).type='combat';
  const duplicate=structuredClone(r);enterNode(r,next);enterNode(duplicate,next);
  assert.equal(r.battle.levelId,duplicate.battle.levelId);picks.push(r.battle.levelId);
 }
 const flank=picks.filter(id=>id==='scout_flank').length;
 assert.ok(flank>0&&flank<50);
});
