import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {compileTables} from '../dist/src/workbook.mjs';
import {readWorkbook,listDialogues,getDialogue,writeDialogue,createDialogue,encodeWorkbook,locations,setBinding,removeDialogue,makeTask,stageResult,applyStaged,revision,put,characters} from '../dist/src/dialogue-studio-model.mjs';
const bytes=fs.readFileSync('dist/config/SwapHero.xlsx'),config=JSON.parse(fs.readFileSync('dist/config/economy.json'));
const fresh=()=>readWorkbook(bytes,config);
const resultFor=t=>({...structuredClone(t.responseFormat),dialogues:[{...structuredClone(t.responseFormat.dialogues[0]),lines:[{character:'',text:'候选测试台词',side:'left',backgroundAction:''}]}]});
test('dialogue edits round-trip through Excel while preserving untouched sheets, formulas and custom columns',()=>{
 const wb=XLSX.read(bytes,{type:'buffer'});XLSX.utils.book_append_sheet(wb,{A1:{t:'s',v:'保留自定义资料'},B1:{t:'n',v:3,f:'1+2'},'!ref':'A1:B1'},'OwnerNotes');
 wb.Sheets.Skill.A1.s={font:{bold:true}};
 const doc=readWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx',cellStyles:true}),config);
 const before=structuredClone(doc.workbook.Sheets.Skill),extra=structuredClone(doc.workbook.Sheets.OwnerNotes);
 const d=getDialogue(doc,listDialogues(doc)[0].id);d.name='快速配置测试';d.notes='克制语气；暂定建议';d.lines[0].text='修改后的台词';d.lines[0].notes='略作停顿';writeDialogue(doc,d);
 const out=XLSX.read(encodeWorkbook(doc),{type:'array',cellStyles:true,cellNF:true});assert.deepEqual(out.Sheets.Skill,before);assert.deepEqual(out.Sheets.OwnerNotes,extra);
 const restored=readWorkbook(encodeWorkbook(doc),config),updated=getDialogue(restored,d.id);assert.equal(updated.name,d.name);assert.equal(updated.notes,d.notes);assert.equal(updated.lines[0].notes,'略作停顿');assert.equal(updated.lines[0].text,'修改后的台词');
});
test('five-sheet workbooks gain dialogues with automatic IDs and line order without changing card content',()=>{
 const wb=XLSX.read(bytes,{type:'buffer'});wb.SheetNames=wb.SheetNames.filter(n=>!['Dialogue','DialogueLine'].includes(n));delete wb.Sheets.Dialogue;delete wb.Sheets.DialogueLine;
 // Legacy tables have no dialogue references.
 for(const name of ['Chapter','Level','Node']){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''});const keep=rows[0].map((key,i)=>key.endsWith('对话ID')?-1:i).filter(i=>i>=0);wb.Sheets[name]=XLSX.utils.aoa_to_sheet(rows.map(r=>keep.map(i=>r[i]??'')));}
 const doc=readWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}),config),cards=compileTables(doc.tables,config).cards,id=createDialogue(doc),d=getDialogue(doc,id);d.lines[0].text='第一句';d.lines.push({text:'第二句',character:'',side:'right'});writeDialogue(doc,d);
 const restored=readWorkbook(encodeWorkbook(doc),config);assert.equal(restored.workbook.SheetNames.length,10);assert.deepEqual(getDialogue(restored,id).lines.map(l=>l.order),[10,20]);assert.deepEqual(compileTables(restored.tables,config).cards,cards);
});
test('binding operations identify duplicate Node candidates by physical row and protect referenced dialogues',()=>{
 const doc=fresh(),first=listDialogues(doc)[0].id,id=createDialogue(doc),d=getDialogue(doc,id);d.lines[0].text='节点专属对白';writeDialogue(doc,d);
 const nodes=locations(doc).filter(l=>l.sheet==='Node');assert.ok(nodes.length>1);setBinding(doc,nodes[0],id);assert.equal(locations(doc).find(l=>l.sheet==='Node'&&l.rowIndex===nodes[0].rowIndex).dialogueId,id);assert.equal(locations(doc).find(l=>l.sheet==='Node'&&l.rowIndex===nodes[1].rowIndex).dialogueId,nodes[1].dialogueId);
 assert.throws(()=>removeDialogue(doc,id),/解除/);setBinding(doc,nodes[0],'');removeDialogue(doc,id);assert.ok(!listDialogues(doc).some(d=>d.id===id));assert.ok(listDialogues(doc).some(d=>d.id===first));
});
test('AI tasks collect current workbook context with only a goal required and no invented character lore',()=>{
 const doc=fresh(),id=listDialogues(doc)[0].id,t=makeTask(doc,id,'铺第一章对白','','request-1');assert.equal(t.baseRevision,revision(doc));assert.ok(t.context.locations.some(l=>l.field==='失败对话ID'));assert.equal(t.context.characters.length,characters(doc).length);assert.ok(t.context.constraints.some(s=>s.includes('性格')));assert.ok(t.context.assets.every(s=>s.startsWith('assets/')));assert.throws(()=>makeTask(doc,id,'','','request-1'),/要写什么/);
});
test('AI candidate staging is atomic, preview-only, and detects stale workbook changes before applying',()=>{
 const doc=fresh(),id=listDialogues(doc)[0].id,t=makeTask(doc,id,'改写对白','','req'),original=JSON.stringify(doc.tables),r=resultFor(t),staged=stageResult(doc,t,r);
 assert.equal(JSON.stringify(doc.tables),original);assert.equal(getDialogue({...doc,tables:staged.tables},id).lines[0].text,'候选测试台词');
 const d=getDialogue(doc,id);d.name+='手动修改';writeDialogue(doc,d);const manual=JSON.stringify(doc.tables);assert.throws(()=>applyStaged(doc,staged),/过期/);assert.equal(JSON.stringify(doc.tables),manual);assert.throws(()=>stageResult(doc,t,r),/旧工作簿/);
});
test('AI batch application supports new and updated dialogues and rejects unknown characters/assets/references',()=>{
 const doc=fresh(),id=listDialogues(doc)[0].id,t=makeTask(doc,id,'写两段','','req'),r=resultFor(t);r.dialogues.push({...structuredClone(r.dialogues[0]),id:'dlg_batch_new',name:'批量新增',bindings:[{sheet:'Level',rowIndex:2,field:'战前对话ID'}]});
 const staged=stageResult(doc,t,r);assert.equal(staged.changes.length,2);applyStaged(doc,staged);assert.equal(locations(doc).find(l=>l.sheet==='Level'&&l.rowIndex===2&&l.field==='战前对话ID').dialogueId,'dlg_batch_new');assert.ok(readWorkbook(encodeWorkbook(doc),config));
 for(const edit of [r=>r.requestId='wrong',r=>r.dialogues[0].lines[0].character='unknown',r=>r.dialogues[0].lines[0].portrait='assets/missing.png',r=>r.dialogues[0].bindings=[{sheet:'Character',rowIndex:2,field:'任意字段'}]]){
  const d=fresh(),task=makeTask(d,id,'测试','','req'),bad=resultFor(task),before=JSON.stringify(d.tables);edit(bad);assert.throws(()=>stageResult(d,task,bad));assert.equal(JSON.stringify(d.tables),before);
 }
});
test('custom dialogue and line columns survive ordinary editing and AI replacement',()=>{
 const doc=fresh(),id=listDialogues(doc)[0].id,d=getDialogue(doc,id);put(doc.tables,'Dialogue',d.rowIndex,'美术备注','保留）；');const lineRow=doc.tables.DialogueLine.findIndex((r,i)=>i&&r[0]===id)+1;put(doc.tables,'DialogueLine',lineRow,'自定义列','保留值');
 const task=makeTask(doc,id,'改写','','req'),staged=stageResult(doc,task,resultFor(task));applyStaged(doc,staged);const restored=readWorkbook(encodeWorkbook(doc),config);
 assert.equal(restored.tables.Dialogue[d.rowIndex-1][restored.tables.Dialogue[0].indexOf('美术备注')],'保留）；');const row=restored.tables.DialogueLine.find((r,i)=>i&&r[0]===id);assert.equal(row[restored.tables.DialogueLine[0].indexOf('自定义列')],'保留值');
});
