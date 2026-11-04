import {columns,positions,compileTables,normalizeTables} from './workbook.mjs';
import {playDialogue} from './dialogue-player.mjs';
const $=id=>document.getElementById(id);
const names={Skill:'技能',SkillEffect:'技能效果',EffectResult:'结果操作',Buff:'Buff',BuffEffect:'Buff效果',Character:'角色',Level:'关卡',Node:'节点',Chapter:'章节',Dialogue:'对话',DialogueLine:'台词'};
const help={Skill:'技能的名称、装配和品质。触发行为在技能效果表配置。',SkillEffect:'每行一个效果：所属技能、监听范围、时机、条件和结果组。',EffectResult:'同一结果组可有多行，按顺序执行。等级列是该操作的数值。',Buff:'持续状态：层数、叠加、持续时间和离场规则。',Character:'多个 ID 用英文逗号分隔，初始技能写作 SkillID@等级。',Level:'从敌方视角配置时仍按屏幕左、中、右填写。上排为备战，下排为战场。',Node:'相同 NodeID 的行属于同一候选池。层数从 1 开始，留空表示不限。',Chapter:'普通、精英与 Boss 分别引用节点池。'};
help.Dialogue='每段一个唯一入口。预览不会修改远征存档。';help.DialogueLine='句序按数值排序，可用10、20、30插句。首句背景留空时为透明叠加。图片资源 ID 使用 assets/ 下已发布图片路径。';
let sheet='Level',index=1,tables,workbook,config,dirty=false;
help.Buff='叠层、数值合并、时长刷新、满层处理、护盾补充分开配置。旧配置默认行为保持。';
help.BuffEffect='行为随Buff附着到持有者；self和己方均指持有者。结果数值继承首次获得时的技能等级，不按层数自动倍增。';
const message=text=>{$('status').textContent=text;};
function load(bytes){
 const next=XLSX.read(bytes,{type:'array'});
 const parsed={};
 for(const key of Object.keys(columns)){if(next.Sheets[key])parsed[key]=XLSX.utils.sheet_to_json(next.Sheets[key],{header:1,defval:''});}
 for(const key of ['Skill','Character','Level','Node','Chapter'])if(!parsed[key])throw Error('缺少 '+key+' 工作表');
 if(!!next.Sheets.Dialogue!==!!next.Sheets.DialogueLine)throw Error('Dialogue 与 DialogueLine 必须同时存在');
 tables=normalizeTables(parsed);workbook=next;for(const name of Object.keys(columns))if(!workbook.SheetNames.includes(name))workbook.SheetNames.push(name);index=1;dirty=false;render();message('已载入工作簿');
}
function ids(name){return [...new Set(tables[name].slice(1).map(row=>row[tables[name][0].indexOf(columns[name].split(' ')[0])]).filter(Boolean))];}
function options(key){
 if(key==='SkillID'&&sheet==='SkillEffect')return ids('Skill');
 if(key==='BuffID'&&sheet!=='Buff'||key==='条件BuffID')return ids('Buff');
 if(key==='ResultGroupID'&&['SkillEffect','BuffEffect'].includes(sheet))return ids('EffectResult');
 const buffChoices={数值合并:['replace','keep','max','min'],时长刷新:['refresh','keep'],满层处理:['apply','reject'],护盾补充:['reset','add','keep']};if(buffChoices[key])return buffChoices[key];
 const choices={监听区域:['battlefield','bench','any'],生效区域:['battlefield','bench','any'],触发时机:['passive','unit_enter','unit_leave','turn_start','turn_end','attack_declared','before_damage','damage_taken','healed','unit_defeated','attack_end'],触发主体:['self','other_ally'],回合归属:['own','opponent','any'],入场原因:['any','exchange','reinforce'],伤害类型:['any','combat','skill','health_loss'],比较:['gte','eq','lt'],操作:['apply_buff','remove_buff','heal','deal_damage','swap_positions'],目标:['self','opposing_unit','front_sides','lower_ally','rear_ally','rear_enemy','all_enemies','all_allies','other_allies'],目标区域:['battlefield','bench','any'],叠加方式:['add','refresh','max','independent'],合并范围:['buff','source_skill'],持续时间:['battle','turn','owner_turns'],离场处理:['keep','remove','pause']};
 if(choices[key])return choices[key];if(sheet==='Buff'&&key==='类型')return ['marker','attack','shield','armor','damage_armor','agile','combat_damage_immunity'];
 if(key.endsWith('对话ID')||key==='DialogueID'&&sheet==='DialogueLine')return ids('Dialogue');
 if(key==='说话角色ID')return ids('Character');
 if(['默认对话立绘ID','立绘ID覆盖','背景图ID'].includes(key))return [...new Set(Object.values(tables).flatMap(rows=>rows.slice(1).flatMap(r=>r.filter(v=>typeof v==='string'&&v.startsWith('assets/')))))];
 if(key==='站位')return ['左','右'];if(key==='背景操作')return ['沿用上一句','显示图片','恢复原场景'];if(key==='允许跳过')return ['true','false'];
 if(positions.includes(key))return ids('Character');
 if(sheet==='Node'&&key==='LevelID')return ids('Level');
 if(['普通节点','精英节点','Boss节点'].includes(key))return ids('Node');
 return ({类型:['hero','ally','enemy'],胜利规则:['elimination','score_5'],品质:['common','rare','epic','legendary'],开放:['true','false'],精英限定:['true','false'],常驻能力:['agile','armor','combat_damage_immunity']})[key];
}
function field(parent,key,row){
 const col=tables[sheet][0].indexOf(key),choices=options(key);
 const label=document.createElement('label');label.textContent=key;parent.append(label);
 const input=document.createElement(key==='正文'?'textarea':'input');
 const value=String(row[col]??'');
 if(choices){const list=document.createElement('datalist');list.id='choices-'+key;for(const v of new Set(['',...choices,value]))list.append(new Option(v||'—',v));label.append(list);input.setAttribute('list',list.id);}
 input.value=value;
 input.oninput=()=>{row[col]=input.value;dirty=true;message('有待导出的修改');refreshRows();};
 label.append(input);
 if(key==='背景图ID')input.disabled=row[tables[sheet][0].indexOf('背景操作')]!=='显示图片';
 if(key==='背景操作')input.addEventListener('change',()=>{if(input.value!=='显示图片')row[tables[sheet][0].indexOf('背景图ID')]='';render();});
 if(key.endsWith('对话ID')){
  const preview=document.createElement('button');preview.type='button';preview.textContent='预览对话';preview.onclick=()=>previewDialogue(input.value);label.append(preview);
  const jump=document.createElement('button');jump.type='button';jump.textContent='编辑对话';jump.onclick=()=>{const i=tables.Dialogue.findIndex((r,i)=>i&&r[0]===input.value);if(i>0){sheet='Dialogue';index=i;render();}};label.append(jump);
 }
 if(sheet==='Character'&&['初始技能','可学技能'].includes(key)){
  const picker=document.createElement('select');picker.setAttribute('aria-label','添加'+key);
  picker.add(new Option('选择技能以追加',''));
  for(const id of ids('Skill'))picker.add(new Option(id,id));
  picker.onchange=()=>{if(!picker.value)return;const values=input.value.split(',').filter(Boolean);
   if(!values.some(v=>v.split('@')[0]===picker.value))values.push(picker.value+(key==='初始技能'?'@1':''));
   input.value=values.join(',');input.oninput();picker.value='';};
  label.append(picker);
 }
}
function refreshRows(){
 const list=$('rows');list.replaceChildren();tables[sheet].slice(1).forEach((r,i)=>list.add(new Option(r.slice(0,2).join(' · '),i+1)));list.value=index;filterRows();
}
function render(){
 $('tabs').replaceChildren();
 for(const [id,label] of Object.entries(names)){
  const b=document.createElement('button');b.textContent=label+'表';b.setAttribute('aria-pressed',String(id===sheet));b.onclick=()=>{sheet=id;index=1;render();};$('tabs').append(b);
 }
 refreshRows();$('title').textContent=names[sheet]+'配置';$('help').textContent=help[sheet];
 const parent=$('form');parent.replaceChildren();const row=tables[sheet][index];if(!row)return;
 const group=document.createElement('div');group.className='fields';parent.append(group);
 for(const key of tables[sheet][0])if(sheet!=='Level'||!positions.includes(key))field(group,key,row);
 if(['Dialogue','DialogueLine'].includes(sheet)){
  const id=row[tables[sheet][0].indexOf('DialogueID')],preview=document.createElement('button');preview.textContent='预览整段对话';preview.onclick=()=>previewDialogue(id);parent.append(preview);
  if(sheet==='Dialogue'){
   const refs=document.createElement('p'),used=[];
   for(const [name,rows] of Object.entries(tables))if(!['Dialogue','DialogueLine'].includes(name))rows.slice(1).forEach((r,i)=>rows[0].forEach((key,j)=>{if(key.endsWith('对话ID')&&r[j]===id)used.push(name+' 第'+(i+2)+'行 '+key);}));
   refs.textContent='引用位置：'+(used.join('；')||'无');parent.append(refs);
   const lines=document.createElement('button');lines.textContent='编辑本段台词';lines.onclick=()=>{sheet='DialogueLine';index=Math.max(1,tables.DialogueLine.findIndex((r,i)=>i&&r[0]===id));$('search').value=id;render();};parent.append(lines);
  }
 }
 if(sheet==='Level'){const formation=document.createElement('div');formation.className='formation';parent.append(formation);for(const key of [...positions.slice(3),...positions.slice(0,3)])field(formation,key,row);
  const play=document.createElement('button');play.textContent='试玩当前布局';parent.append(play);
  play.onclick=()=>{try{
   const pack=compileTables(tables,config),id=row[tables.Level[0].indexOf('LevelID')];
   localStorage.setItem('swaphero.level.preview',JSON.stringify({pack,id}));window.open('playtest.html?mode=level','_blank','noopener');
  }catch(e){message(e.message);}};
 }
}
$('rows').onchange=e=>{index=Number(e.target.value);render();};
function add(copy){const list=tables[sheet];list.push(copy&&list[index]?[...list[index]]:list[0].map(()=>''));index=list.length-1;dirty=true;render();}
$('add').onclick=()=>add(false);$('copy').onclick=()=>add(true);
$('remove').onclick=()=>{if(tables[sheet][index]&&confirm('删除当前记录？')){tables[sheet].splice(index,1);index=Math.max(1,index-1);dirty=true;render();}};
$('validate').onclick=()=>{try{compileTables(tables,config);message('工作簿数据及引用校验通过');}catch(e){message(e.message);}};
$('export').onclick=()=>{try{
 compileTables(tables,config);
 for(const [name,rows] of Object.entries(tables)){
  const previous=workbook.Sheets[name],next=XLSX.utils.aoa_to_sheet(rows);next['!cols']=previous?.['!cols']||rows[0].map(()=>({wch:22}));next['!autofilter']={ref:next['!ref']};workbook.Sheets[name]=next;
 }
 XLSX.writeFile(workbook,'SwapHero.xlsx',{compression:true});dirty=false;message('已导出工作簿。将文件纳入项目后，发布时会从该版本转换。');
 }catch(e){message(e.message);}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{try{const file=e.target.files[0];if(!file||dirty&&!confirm('替换未导出的修改？'))return;if(file.size>5000000)throw Error('工作簿超过 5 MB');load(await file.arrayBuffer());}catch(err){message(err.message);}finally{e.target.value='';}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function previewDialogue(id){try{if(!id)throw Error('请先填写对话 ID');const pack=compileTables(tables,config);await playDialogue(id,{run:{pack,chapter:0,current:'preview'},phase:'before'});}catch(e){message(e.message);}}
function filterRows(){const q=$('search').value.trim().toLowerCase();for(const o of $('rows').options)o.hidden=!!q&&!o.textContent.toLowerCase().includes(q);}
$('search').oninput=filterRows;
try{const [book,economy]=await Promise.all([fetch('config/SwapHero.xlsx'),fetch('config/economy.json')]);config=await economy.json();load(await book.arrayBuffer());}catch(e){message(e.message);}
