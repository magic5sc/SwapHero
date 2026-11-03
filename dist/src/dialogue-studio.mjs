import {compileTables} from './workbook.mjs';
import {playDialogue,isDialoguePlaying} from './dialogue-player.mjs';
import {STUDIO_KEY,readWorkbook,listDialogues,getDialogue,characters,locations,setBinding,createDialogue,writeDialogue,removeDialogue,encodeWorkbook,makeTask,stageResult,applyStaged,taskText,revision} from './dialogue-studio-model.mjs';
const $=id=>document.getElementById(id);
let doc=null,sourceBytes=null,selected='',config=null,dirty=false,task=null,staged=null;
const msg=text=>{$('status').textContent=text;};
const aiMsg=text=>{$('ai-state').textContent=text;};
const encodeBytes=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
const decodeBytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function persist(){
 try{localStorage.setItem(STUDIO_KEY,JSON.stringify({version:1,source:encodeBytes(sourceBytes),tables:doc.tables,selected,task}));$('draft-state').textContent=dirty?'独立草稿已保存 · 待导出 Excel':'独立草稿已保存';}catch(e){msg('浏览器草稿保存失败，请及时导出 Excel：'+e.message);}
}
function changed(){dirty=true;persist();if(staged)$('apply-proposal').disabled=staged.baseRevision!==revision(doc);}
function current(){return getDialogue(doc,selected);}
function mutate(fn){try{const d=current();fn(d);writeDialogue(doc,d);changed();renderList();return d;}catch(e){msg(e.message);}}
function renderList(){
 const q=$('search-dialogues').value.toLowerCase(),list=$('dialogue-list');list.replaceChildren();
 for(const d of listDialogues(doc).filter(d=>(d.name+' '+d.id).toLowerCase().includes(q))){
  const b=document.createElement('button');b.className='dialogue-item';b.setAttribute('aria-pressed',String(d.id===selected));
  const name=document.createElement('strong');name.textContent=d.name||'未命名对话';const id=document.createElement('small');id.textContent=d.id;b.append(name,id);
  b.onclick=()=>{selected=d.id;persist();render();};list.append(b);
 }
}
function renderBindings(){
 const select=$('bind-location');select.replaceChildren(new Option('选择位置并关联…',''));
 const all=locations(doc);all.forEach((l,i)=>select.add(new Option(l.label+(l.dialogueId?'（当前 '+l.dialogueId+'）':''),String(i))));
 const chips=$('bindings');chips.replaceChildren();
 for(const l of all.filter(l=>l.dialogueId===selected)){const b=document.createElement('button');b.className='chip';b.textContent=l.label+' ×';b.title='解除这处引用';b.onclick=()=>{setBinding(doc,l,'');changed();renderBindings();};chips.append(b);}
}
function renderLines(d){
 const list=$('line-list');list.replaceChildren();
 d.lines.forEach((line,i)=>{
  const card=document.createElement('article');card.className='line-card';
  const tools=document.createElement('div');tools.className='line-tools';const number=document.createElement('span');number.className='number';number.textContent=String(i+1).padStart(2,'0');tools.append(number);
  const speaker=document.createElement('select');speaker.setAttribute('aria-label','第'+(i+1)+'句说话角色');speaker.add(new Option('旁白',''));for(const c of characters(doc))speaker.add(new Option(c.name,c.id));speaker.value=line.character;tools.append(speaker);
  speaker.onchange=()=>{mutate(d=>{d.lines[i].character=speaker.value;const first=d.lines.find(l=>l.character)?.character;if(speaker.value&&!line.character)d.lines[i].side=speaker.value===first?'left':'right';});render();};
  const spacer=document.createElement('span');spacer.className='spacer';tools.append(spacer);
  for(const [label,title,disabled,action] of [['↑','上移',i===0,d=>{[d.lines[i-1],d.lines[i]]=[d.lines[i],d.lines[i-1]];}],['↓','下移',i===d.lines.length-1,d=>{[d.lines[i+1],d.lines[i]]=[d.lines[i],d.lines[i+1]];}],['×','删除',d.lines.length===1,d=>d.lines.splice(i,1)]]){
   const b=document.createElement('button');b.textContent=label;b.title=title;b.setAttribute('aria-label',title+'第'+(i+1)+'句');b.disabled=disabled;b.onclick=()=>{mutate(action);render();};tools.append(b);
  }
  const text=document.createElement('textarea');text.value=line.text;text.placeholder='写下这句台词…';text.setAttribute('aria-label','第'+(i+1)+'句台词');text.oninput=()=>mutate(d=>d.lines[i].text=text.value);
  const visual=document.createElement('p');visual.className='visual-summary';visual.textContent=[line.character?(line.side==='right'?'右侧 · 自动镜像':'左侧'):'旁白',line.name?'显示名：'+line.name:'',line.portrait?'立绘覆盖：'+line.portrait:'',line.backgroundAction==='image'?'背景：'+line.background:line.backgroundAction==='scene'?'恢复原场景':'沿用背景'].filter(Boolean).join(' · ');
  const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='细节备注（可选）';const note=document.createElement('textarea');note.value=line.notes;note.placeholder='补充这句的语气、表情或画面要求，供AI参考';note.setAttribute('aria-label','第'+(i+1)+'句细节备注');note.oninput=()=>mutate(d=>d.lines[i].notes=note.value);detail.append(summary,note);
  card.append(tools,text,visual,detail);list.append(card);
 });
}
function render(){
 renderList();const exists=listDialogues(doc).some(d=>d.id===selected);
 for(const id of ['dialogue-name','dialogue-notes','add-line','preview-dialogue','assist','delete-dialogue','bind-location'])$(id).disabled=!exists;
 if(!exists){$('dialogue-name').value='';$('dialogue-id').textContent='新建一段对话，开始写作';$('line-list').replaceChildren();$('bindings').replaceChildren();return;}
 const d=current();$('dialogue-name').value=d.name;$('dialogue-id').textContent=d.id+' · '+d.lines.length+'句'+(d.skip?'':' · 不可整段跳过');$('dialogue-notes').value=d.notes;renderLines(d);renderBindings();
}
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function preview(id,tables=doc.tables){
 const pack=compileTables(tables,doc.config);await playDialogue(id,{run:{pack,chapter:0,current:'studio-preview'},phase:'before'});
}
function prepare(){
 if(!selected)throw Error('请先选择或新建一段对话');
 const d=current();d.goal=$('ai-goal').value;d.notes=$('ai-notes').value;writeDialogue(doc,d);changed();$('dialogue-notes').value=d.notes;
 task=makeTask(doc,selected,d.goal,d.notes,crypto.randomUUID());staged=null;$('proposal').hidden=true;persist();
 $('task-summary').textContent=`任务：${task.goal}\n备注：${task.notes||'无'}\n角色 ${task.context.characters.length} 个 · 对话 ${task.context.dialogues.length} 段 · 使用位置 ${task.context.locations.length} 处 · 图片 ${task.context.assets.length} 项\n当前：${task.selectedDialogue.name} (${selected})\n缺失资料会要求AI列为待确认；所有结果先审阅。`;
 aiMsg('任务已整理。可以复制或下载后交给 Codex；网页没有发起在线模型请求。');return task;
}
function ensureTask(){return task&&task.baseRevision===revision(doc)&&task.goal===$('ai-goal').value.trim()&&task.notes===$('ai-notes').value?task:prepare();}
function stage(input){
 if(typeof input==='string')input=input.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/,'$1');
 const result=stageResult(doc,task,input);staged=result;$('proposal').hidden=false;$('apply-proposal').disabled=false;
 const list=$('proposal-list');list.replaceChildren();
 for(const change of result.changes){
  const card=document.createElement('article');card.className='proposal-card';const title=document.createElement('h3');title.textContent=change.kind+' · '+change.name+' ('+change.id+') · '+(change.after.skip?'可跳过':'不可跳过');card.append(title);
  if(change.before){const old=document.createElement('p');old.className='before';old.textContent='原文：'+change.before.lines.map(l=>l.text).join(' / ');card.append(old);}
  for(const l of change.after.lines){const p=document.createElement('p');p.textContent=(l.name||characters(doc).find(c=>c.id===l.character)?.name||'旁白')+'：'+l.text+' '+[l.character?(l.side==='right'?'右侧':'左侧'):'',l.portrait?'立绘 '+l.portrait:'',l.backgroundAction==='image'?'背景 '+l.background:l.backgroundAction==='scene'?'恢复原场景':'',l.notes||''].filter(Boolean).map(t=>'〔'+t+'〕').join('');card.append(p);}
  if(change.after.notes){const note=document.createElement('p');note.textContent='细节备注：'+change.after.notes;card.append(note);}
  for(const binding of change.after.bindings||[]){const old=locations(doc).find(l=>l.sheet===binding.sheet&&l.rowIndex===binding.rowIndex&&l.field===binding.field),p=document.createElement('p');p.className='warning';p.textContent='关联 '+old.label+(old.dialogueId?'，原引用 '+old.dialogueId:'');card.append(p);}
  const play=document.createElement('button');play.textContent='预览这段候选';play.onclick=()=>preview(change.id,result.tables).catch(e=>aiMsg(e.message));card.append(play);list.append(card);
 }
 $('proposal-questions').textContent=result.questions.length?'待确认：'+result.questions.join('；'):'未列出待确认项。请仍检查是否符合已确认设定。';aiMsg('候选校验通过，尚未写入工作簿。审阅后再点击应用。');return {status:'staged',dialogues:result.changes.map(c=>({id:c.id,name:c.name,kind:c.kind})),questions:result.questions};
}
$('dialogue-name').oninput=()=>mutate(d=>d.name=$('dialogue-name').value);
$('dialogue-notes').oninput=()=>mutate(d=>d.notes=$('dialogue-notes').value);
$('search-dialogues').oninput=renderList;
$('new-dialogue').onclick=()=>{if(!doc)return;selected=createDialogue(doc);changed();render();$('dialogue-name').focus();};
$('add-line').onclick=()=>{mutate(d=>d.lines.push({text:'',character:d.lines.at(-1)?.character||'',side:d.lines.at(-1)?.side||'left'}));render();$('line-list').lastElementChild?.querySelector('textarea')?.focus();};
$('delete-dialogue').onclick=()=>{try{if(!confirm('删除当前对话？浏览器草稿会更新，原Excel文件不受影响。'))return;removeDialogue(doc,selected);selected=listDialogues(doc)[0]?.id||'';changed();render();}catch(e){msg(e.message);}};
$('bind-location').onchange=()=>{try{if($('bind-location').value==='')return;const target=locations(doc)[Number($('bind-location').value)];if(target.dialogueId&&target.dialogueId!==selected&&!confirm('此位置已引用 '+target.dialogueId+'，改为当前对话？'))return;setBinding(doc,target,selected);changed();renderBindings();}catch(e){msg(e.message);}};
$('preview-dialogue').onclick=()=>preview(selected).catch(e=>msg(e.message));
$('export-book').onclick=()=>{try{download(encodeWorkbook(doc),'SwapHero.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');dirty=false;persist();msg('已导出更新后的 Excel。工作簿纳入项目并发布后，游戏才会使用新对话。');}catch(e){msg('不能导出：'+e.message);}};
$('open-book').onclick=()=>$('book-file').click();
$('book-file').onchange=async()=>{try{const file=$('book-file').files[0];if(!file)return;if(file.size>5000000)throw Error('Excel超过5MB');if(dirty&&!confirm('用新Excel替换当前草稿？建议先导出当前修改。'))return;const bytes=new Uint8Array(await file.arrayBuffer()),next=readWorkbook(bytes,config);doc=next;sourceBytes=bytes;selected=listDialogues(doc)[0]?.id||'';task=null;staged=null;dirty=false;persist();render();msg('已读取 '+file.name+'，其他工作表及原始文件保持。');}catch(e){msg(e.message);}finally{$('book-file').value='';}};
$('assist').onclick=()=>{const d=current();$('ai-goal').value=d.goal;$('ai-notes').value=d.notes;$('proposal').hidden=!staged;if(staged)$('apply-proposal').disabled=staged.baseRevision!==revision(doc);$('ai-panel').showModal();};
$('ai-goal').oninput=()=>mutate(d=>d.goal=$('ai-goal').value);
$('ai-notes').oninput=()=>{mutate(d=>d.notes=$('ai-notes').value);$('dialogue-notes').value=$('ai-notes').value;};
$('close-ai').onclick=()=>$('ai-panel').close();
$('prepare-task').onclick=()=>{try{prepare();}catch(e){aiMsg(e.message);}};
$('copy-task').onclick=async()=>{try{await navigator.clipboard.writeText(taskText(ensureTask()));aiMsg('已复制完整任务包。交给Codex生成后，可粘贴候选JSON回来。');}catch(e){aiMsg('复制失败：'+e.message+'，也可以下载任务包。');}};
$('download-task').onclick=()=>{try{download(taskText(ensureTask()),'SwapHero-dialogue-task.txt','text/plain;charset=utf-8');aiMsg('已下载含上下文和返回格式的任务包。');}catch(e){aiMsg(e.message);}};
$('stage-json').onclick=()=>{try{stage($('result-json').value);}catch(e){aiMsg('候选未应用：'+e.message);}};
$('open-result').onclick=()=>$('result-file').click();
$('result-file').onchange=async()=>{try{const file=$('result-file').files[0];if(!file)return;if(file.size>1500000)throw Error('候选文件超过1.5MB');const text=await file.text();$('result-json').value=text;stage(text);}catch(e){aiMsg(e.message);}finally{$('result-file').value='';}};
$('apply-proposal').onclick=()=>{try{applyStaged(doc,staged);selected=staged.changes[0].id;staged=null;task=null;changed();render();$('proposal').hidden=true;aiMsg('候选已应用到独立草稿。请预览，再导出Excel。');}catch(e){aiMsg('未应用：'+e.message);}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function registerAI(){
 const registry=document.modelContext;if(typeof registry?.registerTool!=='function')return;
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 try{
  await registry.registerTool({name:'swaphero_dialogue_task',description:'读取用户已在对话工坊整理的AI任务与工作簿上下文。没有整理任务时返回错误，不自行臆造需求。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){if(!task||task.baseRevision!==revision(doc))throw Error('请用户先在AI辅助中整理当前任务');return task;}},{signal:lifecycle.signal});
  await registry.registerTool({name:'swaphero_dialogue_stage',description:'校验并展示AI候选供用户审阅；不应用到工作簿、不导出文件。用户须点击应用后才修改草稿。',inputSchema:{type:'object',properties:{result:{type:'object'}},required:['result'],additionalProperties:false},execute(input){if(isDialoguePlaying())throw Error('请先结束预览');if(!input||!input.result)throw Error('缺少result');if(!$('ai-panel').open)$('ai-panel').showModal();return stage(input.result);}},{signal:lifecycle.signal});
 }catch(e){aiMsg('浏览器AI接口不可用；仍可复制任务包并导入结果。');}
}
try{
 const [book,economy]=await Promise.all([fetch('config/SwapHero.xlsx'),fetch('config/economy.json')]);if(!book.ok||!economy.ok)throw Error('工作簿或经济配置加载失败');config=await economy.json();sourceBytes=new Uint8Array(await book.arrayBuffer());doc=readWorkbook(sourceBytes,config);selected=listDialogues(doc)[0]?.id||'';
 try{const raw=localStorage.getItem(STUDIO_KEY);if(raw){const saved=JSON.parse(raw);if(saved.version!==1||typeof saved.source!=='string'||!saved.tables)throw Error('不支持的独立草稿');const bytes=decodeBytes(saved.source),restored=readWorkbook(bytes,config);for(const key of Object.keys(restored.tables))if(!Array.isArray(saved.tables[key])||!Array.isArray(saved.tables[key][0]))throw Error('草稿表结构损坏');restored.tables=saved.tables;listDialogues(restored).forEach(d=>getDialogue(restored,d.id));doc=restored;sourceBytes=bytes;selected=listDialogues(doc).some(d=>d.id===saved.selected)?saved.selected:listDialogues(doc)[0]?.id||'';task=saved.task||null;dirty=true;msg('已恢复独立对话草稿，不影响远征存档。');}else msg('已读取当前发布工作簿。编辑后导出 Excel；原文件不会自动覆盖。');}catch(e){msg('原独立草稿未覆盖：'+e.message+'。已读取发布工作簿，可另行导出。');}
 render();await registerAI();
}catch(e){msg(e.message);for(const b of document.querySelectorAll('button'))b.disabled=true;}
