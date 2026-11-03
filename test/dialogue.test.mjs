import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables,normalizeTables} from '../dist/src/workbook.mjs';
import {beginDialogue,advanceDialogue,dialogueFrame} from '../dist/src/dialogue.mjs';
import {playOpening,playNode,playBeforeBattle,settleBattle} from '../dist/src/dialogue-flow.mjs';
import {newRun,enterNode,availableNodes,encodeRun,decodeRun} from '../dist/src/pve.mjs';
const pack=JSON.parse(fs.readFileSync('dist/data/pve-test.json'));
const book=XLSX.read(fs.readFileSync('dist/config/SwapHero.xlsx'),{type:'buffer'});
const tables=()=>Object.fromEntries(book.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(book.Sheets[n],{header:1,defval:''})]));
const set=(t,s,row,k,v)=>t[s][row][t[s][0].indexOf(k)]=v;
function complete(r,id,phase){if(beginDialogue(r,id,phase))while(r.dialogueProgress.active)advanceDialogue(r);}
function battleRun(type='combat'){
 const r=newRun(pack,'dialogue');enterNode(r,availableNodes(r)[0]);r.room.type=type;return r;
}
function won(r,winner='player'){const b=structuredClone(r.battle);b.winner=winner;b.phase='finished';return b;}
test('legacy five-table workbooks compile with empty dialogue configuration',()=>{
 const t=tables();delete t.Dialogue;delete t.DialogueLine;
 for(const name of ['Character','Level','Node','Chapter']){const keep=t[name][0].map((k,i)=>/对话/.test(k)?-1:i).filter(i=>i>=0);t[name]=t[name].map(row=>keep.map(i=>row[i]??''));}
 const p=compileTables(t,pack.config);assert.deepEqual(p.dialogues,[]);assert.equal(p.chapters[0].openingDialogue,'');
 const original=newRun(p);delete original.dialogueProgress;assert.doesNotThrow(()=>decodeRun(encodeRun(original)));
});
test('seven-table Excel export/import preserves dialogue references and line ordering',()=>{
 const t=tables(),w=XLSX.utils.book_new();for(const [name,rows] of Object.entries(t))XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(rows),name);
 const restored=XLSX.read(XLSX.write(w,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 assert.deepEqual(compileTables(Object.fromEntries(restored.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(restored.Sheets[n],{header:1,defval:''})])),pack.config),pack);
 assert.deepEqual(normalizeTables(t),t);
});
test('dialogue compiler reports sheet, row and column for invalid content',()=>{
 for(const [sheet,row,col,value,pattern] of [['DialogueLine',1,'正文','',/DialogueLine 第2行 \[正文\]/],['DialogueLine',1,'说话角色ID','missing',/\[说话角色ID\]/],['DialogueLine',1,'背景操作','显示图片',/\[背景图ID\]/],['Level',1,'战前对话ID','missing',/Level 第2行 \[战前对话ID\]/],['Dialogue',1,'DialogueID','dlg_test_before',/\[DialogueID\]/]]){
  const t=tables();set(t,sheet,row,col,value);assert.throws(()=>compileTables(t,pack.config),pattern);
 }
 const t=tables();t.DialogueLine.push([...t.DialogueLine[1]]);assert.throws(()=>compileTables(t,pack.config),/句序.*重复/);
});
test('background inheritance, speaker defaults and current line restore from snapshot',()=>{
 const r=newRun(pack,'background'),d=r.pack.dialogues[0];r.pack.cards[0].dialoguePortrait='assets/example.webp';
 d.lines=[['', ''],['image','assets/sky-islands/sky-arena.png'],['',''],['scene','']].map(([backgroundAction,background],i)=>({order:10+i*10,text:'测试 '+i,side:i%2?'right':'left',character:r.pack.cards[0].card_id,name:'',portrait:'',backgroundAction,background}));
 beginDialogue(r,d.id,'opening');assert.equal(dialogueFrame(r.pack,r.dialogueProgress.active).background,'');
 advanceDialogue(r);advanceDialogue(r);const restored=decodeRun(encodeRun(r)),f=dialogueFrame(restored.pack,restored.dialogueProgress.active);
 assert.equal(f.text,'测试 2');assert.equal(f.background,'assets/sky-islands/sky-arena.png');assert.equal(f.portrait,'assets/example.webp');
 advanceDialogue(restored);assert.equal(dialogueFrame(restored.pack,restored.dialogueProgress.active).background,'');advanceDialogue(restored);assert.equal(restored.dialogueProgress.active,null);
});
test('same dialogue ID runs once per node trigger, independently across nodes and phases',()=>{
 const r=newRun(pack),id=pack.dialogues[0].id;r.current='node-a';complete(r,id,'node');assert.equal(beginDialogue(r,id,'node'),null);
 r.current='node-b';assert.ok(beginDialogue(r,id,'node'));advanceDialogue(r,true);assert.ok(beginDialogue(r,id,'before'));
});
test('skip policy and invalid dialogue checkpoints reject without mutating the original save',()=>{
 const r=newRun(pack);r.pack.dialogues[0].skip=false;beginDialogue(r,r.pack.dialogues[0].id,'opening');assert.throws(()=>advanceDialogue(r,true),/不允许/);
 const raw=encodeRun(r),bad=JSON.parse(raw);bad.run.dialogueProgress.active.index=999;assert.throws(()=>decodeRun(JSON.stringify(bad)),/断点/);assert.equal(encodeRun(r),raw);
});
test('node choice is fixed before dialogue; resume does not redraw the encounter',async()=>{
 const r=battleRun(),id=pack.dialogues[0].id;r.room.dialogue=id;const battle=structuredClone(r.battle);
 await playNode(r,async(id,phase)=>{beginDialogue(r,id,phase);});const restored=decodeRun(encodeRun(r));
 assert.deepEqual(restored.battle,battle);complete(restored,id,'node');await playBeforeBattle(restored,async(id,phase)=>complete(restored,id,phase));assert.deepEqual(restored.battle,battle);
});
test('victory waits for dialogue, restores before settlement, and awards gold exactly once',async()=>{
 let r=battleRun(),b=won(r),before=r.gold,raw;
 await assert.rejects(settleBattle(r,b,async(id,phase)=>{beginDialogue(r,id,phase);raw=encodeRun(r);throw Error('reload');},()=>{}),/reload/);
 assert.equal(r.status,'battle');assert.equal(r.gold,before);r=decodeRun(raw);
 await settleBattle(r,r.battle,async(id,phase)=>complete(r,id,phase),()=>{});assert.equal(r.status,'reward');assert.equal(r.gold,before+pack.config.combatGold);
 const choices=structuredClone(r.room.choices);await settleBattle(r,b,()=>{throw Error('replayed');},()=>{});assert.deepEqual(r.room.choices,choices);assert.equal(r.gold,before+pack.config.combatGold);
});
test('boss order is victory dialogue, chapter ending, then recovery; defeat waits too',async()=>{
 const r=battleRun('boss'),order=[];r.team[0].hp=1;
 const b=won(r);await settleBattle(r,b,async(id,phase)=>{order.push(phase);assert.equal(r.status,'battle');assert.equal(r.team[0].hp,1);complete(r,id,phase);},()=>{});
 assert.deepEqual(order,['victory','ending']);assert.equal(r.status,'chapter_complete');assert.equal(r.team[0].hp,r.team[0].maxHp);
 const loss=battleRun();await settleBattle(loss,won(loss,'ai'),async(id,phase)=>{assert.equal(phase,'defeat');assert.equal(loss.status,'battle');complete(loss,id,phase);},()=>{});assert.equal(loss.status,'failed');
});
test('chapter opening finishes once; blank entries preserve original flow',async()=>{
 const r=newRun(pack);await playOpening(r,async(id,p)=>complete(r,id,p));assert.equal(beginDialogue(r,pack.chapters[0].openingDialogue,'opening'),null);
 r.pack.chapters[0].openingDialogue='';await playOpening(r,async(id,p)=>assert.equal(beginDialogue(r,id,p),null));
});
