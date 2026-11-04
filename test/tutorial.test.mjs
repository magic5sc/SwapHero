import {buffLayers} from '../dist/src/buffs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables} from '../dist/src/workbook.mjs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {start,move,endTurn,playAI} from '../dist/src/battle.mjs';
import {applyDamage,drainStack} from '../dist/src/effects.mjs';
const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'});
const tables=()=>Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})]));
const pack=()=>compileTables(tables(),null,{levelOnly:true});
const game=()=>{const g=createLevelBattle(pack(),'tutorial_01');start(g);return g;};
const round=g=>{endTurn(g,'player');if(!g.winner)playAI(g);};
test('skill-effects source reaches level ID without chapters, nodes, or hardcoded roster',()=>{
 assert.deepEqual(new Set(wb.SheetNames),new Set(['Skill','SkillEffect','EffectResult','Buff','BuffEffect','Character','Level']));assert.deepEqual(pack(),JSON.parse(fs.readFileSync('dist/data/tutorial.json')));
 const t=tables(),row=t.Character[1];row[t.Character[0].indexOf('攻击')]=4;
 assert.equal(createLevelBattle(compileTables(t,null,{levelOnly:true}),'tutorial_01').units['player-2'].attack,4);
 assert.throws(()=>createLevelBattle(pack(),'missing'),/找不到关卡/);
 t.Level[1][t.Level[0].indexOf('我方备中')]='missing';assert.throws(()=>compileTables(t,null,{levelOnly:true}),/我方备中/);
});
test('real seven-round teaching battle: windup, zero-loss block, 2+2 finish',()=>{
 let g=game();const hp=[];
 for(let r=1;r<=7;r++){
  if(r===4){assert.equal(buffLayers(g.units['ai-2'],'tutorial_retaliation_ready'),1);assert.equal(g.units['ai-2'].attack,0);move(g,'player',5,2);assert.equal(g.units['player-5'].buffShield,2);}
  if(r===5)move(g,'player',5,2);
  round(g);hp.push(g.units['ai-2'].hp);
  if(r===3){assert.equal(g.units['player-2'].hp,6);g=JSON.parse(JSON.stringify(g));}
  if(r===4){assert.equal(g.units['player-5'].hp,10);assert.equal(g.units['player-5'].buffShield,0);assert.equal(g.units['ai-2'].attack,0);}
 }
 assert.deepEqual(hp,[6,5,4,4,4,2,0]);assert.equal(g.winner,'player');assert.equal(g.units['player-2'].hp,6);
});
test('no swap receives predictable retaliation; zero damage never advances counter',()=>{
 const g=game();applyDamage(g,'player-5','ai-2',0);drainStack(g);assert.equal(buffLayers(g.units['ai-2'],'tutorial_retaliation_charge'),0);
 for(let i=0;i<3;i++)round(g);assert.equal(g.units['player-2'].hp,6);
 round(g);assert.equal(g.units['player-2'].hp,3);assert.equal(g.units['ai-2'].attack,0);
});
test('refresh does not stack, counts own turns on bench, and reinforcement is not exchange',()=>{
 const g=game();move(g,'player',5,2);move(g,'player',5,2);assert.equal(g.units['player-2'].attack,2);
 round(g);move(g,'player',5,2);move(g,'player',5,2);assert.equal(g.units['player-2'].attack,2);assert.equal(g.units['player-5'].buffShield,2);
 round(g);move(g,'player',5,2);round(g);round(g);assert.equal(g.units['player-2'].attack,1);
 const h=game();move(h,'player',5,1);assert.equal(h.units['player-5'].buffShield,undefined);
});
test('armor reduces skill damage before shield, health loss bypasses both',()=>{
 const g=game();move(g,'player',5,2);assert.equal(applyDamage(g,'ai-2','player-5',3,'skill'),0);assert.equal(g.units['player-5'].buffShield,0);
 assert.equal(applyDamage(g,'ai-2','player-5',2,'health_loss'),2);
});
