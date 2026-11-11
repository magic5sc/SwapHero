import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables} from '../dist/src/workbook.mjs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {damageAmount} from '../dist/src/content.mjs';
import {start} from '../dist/src/battle.mjs';
import {applyDamage,drainStack,refreshPositions} from '../dist/src/effects.mjs';
const wb=XLSX.read(fs.readFileSync('dist/config/SwapHero.xlsx'),{type:'buffer'});
const tables=Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})]));
const pack=compileTables(tables,JSON.parse(fs.readFileSync('dist/config/economy.json')));
function game(){const g=createLevelBattle(pack,'holy_champion_test');start(g);return g;}
test('holy champion source workbook compiles to shipped 3/20 enemy, fixed skills and existing knight art',()=>{
 assert.deepEqual(pack,JSON.parse(fs.readFileSync('dist/data/pve-test.json')));
 const c=pack.cards.find(c=>c.card_id==='holy_champion');
 assert.equal(c.name,'圣教冠军');assert.equal(c.attack,3);assert.equal(c.health,20);assert.equal(c.role,'enemy');assert.equal(c.art_id,'temple_knight');assert.ok(!pack.recruits.includes(c.card_id));
 assert.deepEqual(c.skills.map(s=>s.skill_id),['holy_champion_domain','holy_champion_creed']);
 for(const id of c.skills.map(s=>s.skill_id))assert.deepEqual(Object.keys(pack.skills.find(s=>s.skill_id===id).levels),['1']);
 assert.ok(!pack.nodes.some(n=>n.level==='holy_champion_test'),'isolated test does not enter campaign pools');
 assert.equal(pack.levels.find(l=>l.id==='gate').slots[0],'test_boss');
});
test('official champion fixture computes armor from both zones and drops it immediately as allies die',()=>{
 const g=game(),u=g.units['ai-2'];
 assert.equal(damageAmount(u,6,'combat',g),4);
 applyDamage(g,'player-2','ai-1',99,'skill');drainStack(g);
 assert.equal(damageAmount(u,6,'combat',g),5);
 applyDamage(g,'player-2','ai-5',99,'skill');drainStack(g);
 assert.equal(damageAmount(u,6,'combat',g),6);
 assert.equal(u.attack,3,'others killing allies does not grant creed');
});
test('official creed stacks each credited kill and persists through bench exchange and JSON restore',()=>{
 let g=game();applyDamage(g,'ai-2','player-1',99,'combat');drainStack(g);assert.equal(g.units['ai-2'].attack,4);
 applyDamage(g,'ai-2','player-3',99,'skill');drainStack(g);assert.equal(g.units['ai-2'].attack,5);
 g.sides.ai.slots[1]=null;g.sides.ai.slots[3]='ai-2';refreshPositions(g);
 g=JSON.parse(JSON.stringify(g));refreshPositions(g);assert.equal(g.units['ai-2'].attack,5);
 assert.equal(damageAmount(g.units['ai-2'],6,'combat',g),6,'standard armor inactive on bench');
 g.sides.ai.slots[3]=null;g.sides.ai.slots[1]='ai-2';refreshPositions(g);
 assert.equal(damageAmount(g.units['ai-2'],6,'combat',g),4);assert.equal(g.units['ai-2'].attack,5);
});
