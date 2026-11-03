import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cases,createSession,decodeSession,advanceSession,TEST_KEY} from '../dist/src/test-hub-model.mjs';
import {beginDialogue,advanceDialogue,dialogueFrame} from '../dist/src/dialogue.mjs';
import {encodeRun} from '../dist/src/pve.mjs';
const pack=JSON.parse(fs.readFileSync('dist/data/pve-test.json','utf8'));
const complete=s=>async(id,phase)=>{if(beginDialogue(s.run,id,phase))while(s.run.dialogueProgress.active)advanceDialogue(s.run);};
test('all hub fixtures validate and use published test assets without mutating source pack',async()=>{
 const original=JSON.stringify(pack);
 for(const scenario of Object.keys(cases)){
  const s=createSession(pack,scenario);assert.doesNotThrow(()=>encodeRun(s.run));
  for(const c of s.run.pack.cards)if(c.dialoguePortrait)assert.ok(fs.existsSync('dist/'+c.dialoguePortrait));
  await advanceSession(s,complete(s));assert.equal(s.finished,true);assert.equal(s.continuations,1);assert.deepEqual(decodeSession(JSON.stringify(s)),s);
 }
 assert.equal(JSON.stringify(pack),original);assert.notEqual(TEST_KEY,'swaphero.adventure.v1');
});
test('every workflow checkpoint resumes once without replaying completed phases or rewards',async()=>{
 for(const scenario of ['victory','boss','defeat']){
  let s=createSession(pack,scenario),played=[];
  await assert.rejects(advanceSession(s,async(id,phase)=>{
   if(phase===(scenario==='defeat'?'defeat':'victory')){beginDialogue(s.run,id,phase);advanceDialogue(s.run);throw Error('reload');}
   played.push(phase);await complete(s)(id,phase);
  }),/reload/);
  const captured=JSON.stringify(s);s=decodeSession(captured);const expected=dialogueFrame(s.run.pack,s.run.dialogueProgress.active).text;assert.ok(expected.includes('刷新'));
  await advanceSession(s,async(id,phase)=>{played.push(phase);await complete(s)(id,phase);});
  assert.deepEqual(played,scenario==='boss'?['opening','node','before','victory','ending']:['opening','node','before',scenario==='defeat'?'defeat':'victory']);
  assert.equal(s.continuations,1);const stable=JSON.stringify(s);
  await advanceSession(s,()=>assert.fail('finished session replayed'));assert.equal(JSON.stringify(s),stable);
  assert.equal(s.run.status,scenario==='boss'?'chapter_complete':scenario==='defeat'?'failed':'reward');
  assert.equal(s.run.gold,pack.config.initialGold+(scenario==='victory'?pack.config.combatGold:0));
 }
});
test('background inheritance survives dedicated test save and malformed progress is rejected',()=>{
 const s=createSession(pack,'background');beginDialogue(s.run,'qa_background','opening');advanceDialogue(s.run);advanceDialogue(s.run);
 const restored=decodeSession(JSON.stringify(s));assert.equal(dialogueFrame(restored.run.pack,restored.run.dialogueProgress.active).background,'assets/sky-islands/sky-arena.png');
 restored.run.dialogueProgress.active.index=99;assert.throws(()=>decodeSession(JSON.stringify(restored)),/断点/);
 assert.throws(()=>decodeSession('{}'),/无效/);assert.throws(()=>createSession(pack,'missing'),/未知/);
});
