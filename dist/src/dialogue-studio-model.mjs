import * as XLSXModule from '../vendor/xlsx/xlsx.min.js';
import {columns,normalizeTables,compileTables} from './workbook.mjs';
const XLSX=globalThis.XLSX||XLSXModule.default||XLSXModule;
export const STUDIO_KEY='swaphero.dialogue.studio.v1';
export const hooks={Chapter:['章节开场对话ID','章节结束对话ID'],Node:['节点遭遇对话ID'],Level:['战前对话ID','胜利对话ID','失败对话ID']};
const clone=x=>structuredClone(x);
const objectRows=(tables,sheet)=>tables[sheet].slice(1).map((row,i)=>({...Object.fromEntries(tables[sheet][0].map((key,j)=>[key,row[j]??''])),rowIndex:i+2}));
const col=(tables,sheet,key)=>tables[sheet][0].indexOf(key);
export function put(tables,sheet,rowIndex,key,value){
 let j=col(tables,sheet,key);if(j<0){j=tables[sheet][0].length;tables[sheet][0].push(key);}
 const row=tables[sheet][rowIndex-1];if(!row)throw Error('工作表行不存在');while(row.length<j)row.push('');row[j]=value;
}
export function readWorkbook(bytes,config){
 const workbook=XLSX.read(bytes,{type:'array',cellStyles:true,cellNF:true});
 for(const name of ['Skill','Character','Level','Node','Chapter'])if(!workbook.Sheets[name])throw Error('缺少 '+name+' 工作表');
 if(!!workbook.Sheets.Dialogue!==!!workbook.Sheets.DialogueLine)throw Error('Dialogue 与 DialogueLine 必须同时存在');
 const originalTables=Object.fromEntries(Object.keys(columns).filter(n=>workbook.Sheets[n]).map(n=>[n,XLSX.utils.sheet_to_json(workbook.Sheets[n],{header:1,defval:''})]));
 const tables=normalizeTables(originalTables);
 if(originalTables.Skill[0].includes('触发时机')){tables.Skill=originalTables.Skill;for(const n of ['SkillEffect','EffectResult','Buff'])delete tables[n];}
 compileTables(tables,config);
 return {workbook,tables,config:clone(config)};
}
export function revision(doc){let hash=2166136261;for(const c of JSON.stringify(doc.tables))hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
export const characters=doc=>objectRows(doc.tables,'Character').map(r=>({id:r.CharacterID,name:r.名称,role:r.类型,portrait:r.默认对话立绘ID||'',source:r}));
export function listDialogues(doc){return objectRows(doc.tables,'Dialogue').map(r=>({id:r.DialogueID,name:r.编辑器名称,skip:['true','1'].includes(String(r.允许跳过).toLowerCase()),notes:r.细节备注||'',goal:r.AI任务目标||'',rowIndex:r.rowIndex}));}
export function getDialogue(doc,id){
 const d=listDialogues(doc).find(d=>d.id===id);if(!d)throw Error('对话不存在');
 return {...d,lines:objectRows(doc.tables,'DialogueLine').filter(r=>r.DialogueID===id).sort((a,b)=>Number(a.句序)-Number(b.句序)).map(r=>({order:Number(r.句序),text:r.正文,character:r.说话角色ID||'',name:r.显示名覆盖||'',portrait:r.立绘ID覆盖||'',side:['右','right'].includes(r.站位)?'right':'left',backgroundAction:r.背景操作==='显示图片'?'image':r.背景操作==='恢复原场景'?'scene':'',background:r.背景图ID||'',notes:r.细节备注||'',source:clone(doc.tables.DialogueLine[r.rowIndex-1])}))};
}
export function locations(doc){
 return Object.entries(hooks).flatMap(([sheet,fields])=>objectRows(doc.tables,sheet).flatMap(r=>fields.map(field=>({sheet,rowIndex:r.rowIndex,field,id:r[sheet+'ID'],label:`${r.名称||r[sheet+'ID']} · ${field.replace('对话ID','')}${sheet==='Node'?' · 候选行'+r.rowIndex:''}`,dialogueId:r[field]||''}))));
}
export function setBinding(doc,location,id){
 const target=locations(doc).find(l=>l.sheet===location.sheet&&l.rowIndex===location.rowIndex&&l.field===location.field);
 if(!target)throw Error('未知挂载位置');if(id&&!listDialogues(doc).some(d=>d.id===id))throw Error('未知对话');
 put(doc.tables,target.sheet,target.rowIndex,target.field,id);
}
export function nextId(doc){const ids=new Set(listDialogues(doc).map(d=>d.id));let n=1;while(ids.has('dlg_'+String(n).padStart(4,'0')))n++;return 'dlg_'+String(n).padStart(4,'0');}
export function createDialogue(doc){
 const id=nextId(doc);doc.tables.Dialogue.push(doc.tables.Dialogue[0].map(k=>({DialogueID:id,编辑器名称:'新对话',允许跳过:true}[k]??'')));
 writeDialogue(doc,{id,name:'新对话',skip:true,notes:'',goal:'',lines:[{text:'',character:'',side:'left'}]});return id;
}
export function writeDialogue(doc,d){
 if(!/^[a-z][a-z0-9_]*$/.test(d.id))throw Error('对话ID格式无效');
 let found=listDialogues(doc).find(x=>x.id===d.id);
 if(!found){doc.tables.Dialogue.push(doc.tables.Dialogue[0].map(()=>''));found={rowIndex:doc.tables.Dialogue.length};}
 for(const [key,value] of Object.entries({DialogueID:d.id,编辑器名称:d.name,允许跳过:d.skip??true,细节备注:d.notes||'',AI任务目标:d.goal||''}))put(doc.tables,'Dialogue',found.rowIndex,key,value);
 const j=col(doc.tables,'DialogueLine','DialogueID'),old=doc.tables.DialogueLine;
 const previous=old.slice(1).filter(r=>r[j]===d.id).sort((a,b)=>Number(a[col(doc.tables,'DialogueLine','句序')])-Number(b[col(doc.tables,'DialogueLine','句序')]));
 let first=old.findIndex((r,i)=>i&&r[j]===d.id);if(first<0)first=old.length;
 const remaining=old.filter((r,i)=>!i||r[j]!==d.id);
 if(!remaining[0].includes('细节备注'))remaining[0].push('细节备注');
 const generated=d.lines.map((l,i)=>{
  const values={DialogueID:d.id,句序:(i+1)*10,正文:l.text,说话角色ID:l.character||'',显示名覆盖:l.name||'',立绘ID覆盖:l.portrait||'',站位:l.side==='right'?'右':'左',背景操作:l.backgroundAction==='image'?'显示图片':l.backgroundAction==='scene'?'恢复原场景':'',背景图ID:l.background||'',细节备注:l.notes||''};
  return remaining[0].map((k,j)=>Object.hasOwn(values,k)?values[k]:l.source?.[j]??previous[i]?.[j]??'');
 });
 remaining.splice(Math.min(first,remaining.length),0,...generated);doc.tables.DialogueLine=remaining;
}
export function removeDialogue(doc,id){
 const refs=locations(doc).filter(l=>l.dialogueId===id);if(refs.length)throw Error('请先解除 '+refs.length+' 处引用');
 for(const name of ['Dialogue','DialogueLine']){const j=col(doc.tables,name,'DialogueID');doc.tables[name]=doc.tables[name].filter((r,i)=>!i||r[j]!==id);}
}
export function encodeWorkbook(doc){
 compileTables(doc.tables,doc.config);
 const out=clone(doc.workbook);
 for(const name of ['Dialogue','DialogueLine']){
  const old=out.Sheets[name],sheet=XLSX.utils.aoa_to_sheet(doc.tables[name]);
  if(old?.['!cols'])sheet['!cols']=clone(old['!cols']);
  sheet['!autofilter']={ref:sheet['!ref']};out.Sheets[name]=sheet;
  if(!out.SheetNames.includes(name))out.SheetNames.push(name);
 }
 // Patch changed cells in the existing sheets; leave formulas, other worksheets
 // and untouched cell metadata intact instead of reconstructing the workbook.
 for(const name of ['Skill','Character','Level','Node','Chapter']){
  const sheet=out.Sheets[name],original=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
  doc.tables[name].forEach((row,i)=>row.forEach((value,j)=>{
   if(value===(original[i]?.[j]??''))return;
   const address=XLSX.utils.encode_cell({r:i,c:j}),old=sheet[address];
   sheet[address]={...old,v:value,t:typeof value==='number'?'n':typeof value==='boolean'?'b':'s'};delete sheet[address].f;
   const range=XLSX.utils.decode_range(sheet['!ref']||'A1');range.e.r=Math.max(range.e.r,i);range.e.c=Math.max(range.e.c,j);sheet['!ref']=XLSX.utils.encode_range(range);
  }));
 }
 return XLSX.write(out,{type:'array',bookType:'xlsx',compression:true,cellStyles:true});
}
export function makeTask(doc,selected,goal,notes,requestId){
 if(typeof goal!=='string'||!goal.trim())throw Error('请填写“要写什么”');if(goal.length>8000||notes.length>16000)throw Error('任务说明过长');
 const all=listDialogues(doc),assets=new Set();
 for(const rows of Object.values(doc.tables))for(const row of rows.slice(1))for(const v of row)if(typeof v==='string'&&v.startsWith('assets/'))assets.add(v);
 return {format:'swaphero.dialogue-task',version:1,requestId,baseRevision:revision(doc),goal:goal.trim(),notes,selectedDialogue:selected?getDialogue(doc,selected):null,
  context:{characters:characters(doc),locations:locations(doc),dialogues:all.map(d=>getDialogue(doc,d.id)),assets:[...assets],projectSources:[{name:'项目入口',url:'https://app.notion.com/p/407e7ee349ad815f9d78ed0642f5ac0e'},{name:'对话设计',url:'https://app.notion.com/p/40ce7ee349ad811286aef55d07594a79'},{name:'现行规则',url:'https://app.notion.com/p/406e7ee349ad81c2a7ecfdc573c7c606'}],constraints:['保留角色ID和六处挂载字段，只生成线性对白；不改变战斗规则。','右侧立绘由播放器自动镜像，不要预先翻转素材。','角色数值、技能和名称不证明性格或世界观。缺失资料列入questions，建议不得冒充已确认设定。','任务包未自动读取Wiki正文；获授权后核对项目来源，不把链接当成已读内容。','未提供的立绘和背景不得虚构资源路径；可用旁白或保留空值。','只返回候选JSON，不直接覆盖Excel；后续由用户审阅应用。']},
  responseFormat:{format:'swaphero.dialogue-result',version:1,requestId,baseRevision:revision(doc),dialogues:[{id:selected||nextId(doc),name:'对话名称',skip:true,notes:'',goal:goal.trim(),lines:[{character:'',text:'台词',side:'left',name:'',portrait:'',backgroundAction:'',background:'',notes:''}],bindings:[]}],questions:[]}};
}
export function stageResult(doc,task,result){
 if(!task||task.baseRevision!==revision(doc))throw Error('任务基于旧工作簿，请重新整理AI任务');
 if(typeof result==='string'){if(result.length>1500000)throw Error('候选结果过大');result=JSON.parse(result);}
 if(result?.format!=='swaphero.dialogue-result'||result.version!==1||result.requestId!==task.requestId||result.baseRevision!==task.baseRevision||!Array.isArray(result.dialogues)||!result.dialogues.length||result.dialogues.length>100)throw Error('AI结果格式或任务版本不匹配');
 const next={...doc,tables:clone(doc.tables)},seen=new Set(),allowed=new Set(task.context.assets),changes=[];
 for(const d of result.dialogues){
  if(!d||seen.has(d.id)||typeof d.name!=='string'||!d.name.trim()||typeof d.skip!=='boolean'||!Array.isArray(d.lines)||!d.lines.length||d.lines.length>300||d.bindings!==undefined&&!Array.isArray(d.bindings))throw Error('候选对话重复或缺少名称/台词');
  seen.add(d.id);
  for(const l of d.lines){if(typeof l.text!=='string'||!l.text.trim()||l.text.length>12000||!['left','right'].includes(l.side)||!['','image','scene'].includes(l.backgroundAction||''))throw Error('候选台词或站位无效');for(const key of ['portrait','background'])if(l[key]&&!allowed.has(l[key]))throw Error('候选引用了未提供的图片 '+l[key]);}
  const old=listDialogues(doc).find(x=>x.id===d.id);changes.push({id:d.id,name:d.name,kind:old?'更新':'新增',before:old?getDialogue(doc,d.id):null,after:clone(d)});writeDialogue(next,d);
 }
 const bindingTargets=new Set();
 for(const d of result.dialogues)for(const binding of d.bindings||[]){const key=JSON.stringify([binding.sheet,binding.rowIndex,binding.field]);if(bindingTargets.has(key))throw Error('多个候选争用同一挂载位置');bindingTargets.add(key);setBinding(next,binding,d.id);}
 compileTables(next.tables,next.config);
 return {baseRevision:revision(doc),tables:next.tables,changes,questions:Array.isArray(result.questions)?result.questions.map(String).slice(0,100):[]};
}
export function applyStaged(doc,staged){if(!staged||revision(doc)!==staged.baseRevision)throw Error('工作簿已变化，候选已过期，请重新生成或导入');compileTables(staged.tables,doc.config);doc.tables=clone(staged.tables);}
export function taskText(task){return '请根据以下SwapHero任务包生成线性对话。缺失背景请列questions，勿擅自确认世界观。严格返回responseFormat结构的JSON，requestId和baseRevision必须原样保留。可在dialogues中返回多段；不需要的bindings填空数组。\n\n'+JSON.stringify(task,null,2);}
