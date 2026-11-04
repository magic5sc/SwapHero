// Shared by the release compiler and the developer workbook editor.
import {skillColumns,migrateSkillTables,normalizeBuffTables,compileSkillTables} from './skill-tables.mjs';
import {validatePack} from './pve.mjs';
import {validateCatalog} from './content.mjs';
import {dialogueAsset} from './dialogue.mjs';
export const columns={
 ...skillColumns,
 Character:'CharacterID 名称 类型 攻击 生命 美术ID 可用技能栏 初始技能 可学技能 品质 精英限定',
 Level:'LevelID 名称 前左 前中 前右 备左 备中 备右 胜利规则 场景背景 界面标题',
 Node:'NodeID LevelID 权重 起始层 结束层',
 Chapter:'ChapterID 名称 层数 开放 地图背景 普通节点 精英节点 Boss节点',
 Dialogue:'DialogueID 编辑器名称 允许跳过',
 DialogueLine:'DialogueID 句序 正文 说话角色ID 显示名覆盖 立绘ID覆盖 站位 背景操作 背景图ID'
};
export const extensions={Character:['默认对话立绘ID'],Level:['战前对话ID','胜利对话ID','失败对话ID'],Node:['节点遭遇对话ID'],Chapter:['章节开场对话ID','章节结束对话ID']};
export function normalizeTables(tables){
 const out=normalizeBuffTables(migrateSkillTables(tables));
 for(const data of Object.values(out)){if(!data?.[0])continue;while(data[0].length&&data[0].at(-1)===''&&data.slice(1).every(r=>r[data[0].length-1]===''||r[data[0].length-1]==null))data[0].pop();for(let i=1;i<data.length;i++)data[i]=data[i].slice(0,data[0].length);}
 for(const name of ['Dialogue','DialogueLine'])out[name]??=[columns[name].split(' ')];
 for(const [name,keys] of Object.entries(extensions))for(const key of keys)if(!out[name]?.[0]?.includes(key))out[name]?.[0]?.push(key);
 return out;
}
export const positions=['前左','前中','前右','备左','备中','备右'];
const split=v=>String(v||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean);
function rows(tables,sheet){
 const [headers,...data]=tables[sheet]||[];
 for(const key of columns[sheet].split(' '))if(!headers?.includes(key))throw Error(sheet+' 第1行缺少列 '+key);
 if(new Set(headers).size!==headers.length)throw Error(sheet+' 第1行列名重复');
 const ids=new Set();
 return data.flatMap((values,i)=>{
  if(!values.some(v=>v!==null&&v!==undefined&&v!==''))return [];
  const row=Object.fromEntries(headers.map((key,j)=>[key,values[j]??'']));
  row.check=(ok,col,msg)=>{if(!ok)throw Error(sheet+' 第'+(i+2)+'行 ['+col+'] '+msg);};
  const key=columns[sheet].split(' ')[0],id=row[key];
  row.check(typeof id==='string'&&/^[a-z][a-z0-9_]*$/.test(id),key,'ID 只接受小写字母、数字和下划线');
  row.check(['Node','DialogueLine','EffectResult'].includes(sheet)||!ids.has(id),key,'ID 重复');ids.add(id);
  return [row];
 });
}
function num(r,k,min=0){const n=Number(r[k]);r.check(r[k]!==''&&Number.isSafeInteger(n)&&n>=min,k,'需要不小于 '+min+' 的整数');return n;}
function bool(r,k){const v=String(r[k]).toLowerCase();r.check(['true','false','1','0'].includes(v),k,'请填 TRUE 或 FALSE');return ['true','1'].includes(v);}
function asset(r,k){const path=r[k];r.check(!path||/^assets\/(?:[\w-]+\/)*[\w-]+\.(png|webp|jpg|svg)$/.test(path),k,'填写 assets 下的图片路径');return path;}
export function compileTables(tables,config,{assetExists=()=>true,levelOnly=false}={}){
 if(levelOnly)tables={...tables,Node:[columns.Node.split(' ')],Chapter:[columns.Chapter.split(' ')]};
 tables=normalizeTables(tables);
 const {skills,skillRows,buffs}=compileSkillTables({rows,num,bool,tables});
 const charRows=rows(tables,'Character');
 const bySkill=new Map(skills.map(s=>[s.skill_id,s]));
 const cards=charRows.map(r=>{
  const slots=split(r.可用技能栏).map(slot_id=>({slot_id,type:'skill',capacity:1}));
  const checkSkill=(id,col)=>{const s=bySkill.get(id);r.check(s,col,'未知技能 '+id);r.check(slots.some(x=>x.slot_id===s.slot),col,'缺少技能栏 '+s.slot);return s;};
  r.check(r.名称,'名称','需要角色名称');r.check(['common','rare','epic','legendary'].includes(r.品质),'品质','未知品质');
  r.check(['hero','ally','enemy'].includes(r.类型),'类型','请选择 hero / ally / enemy');
  const learnable=split(r.可学技能);for(const id of learnable)checkSkill(id,'可学技能');
  const bindings=split(r.初始技能).map(binding=>{const [id,lv='1',...extra]=binding.split('@');const s=checkSkill(id,'初始技能');r.check(!extra.length&&!!s.levels[lv],'初始技能','格式为 SkillID@等级');return {slot_id:s.slot,skill_id:id,level:Number(lv)};});
  return {card_id:r.CharacterID,name:r.名称,role:r.类型,category:'test',attack:num(r,'攻击'),health:num(r,'生命',1),art_id:r.美术ID||null,quality:r.品质,gold_only:bool(r,'精英限定'),status:'specified',blockers:[],slots,skills:bindings,learnable};
 });
 const dialogues=rows(tables,'Dialogue').map(r=>({id:r.DialogueID,name:r.编辑器名称,skip:bool(r,'允许跳过'),lines:[]}));
 const ref=(r,col)=>{const id=r[col]||'';r.check(!id||dialogues.some(d=>d.id===id),col,'未知对话 '+id);return id;};
 const image=(r,col)=>{const v=r[col]||'';r.check(dialogueAsset(v),col,'填写 assets 下已发布的图片路径作为资源 ID');r.check(!v||assetExists(v),col,'缺少已发布图片 '+v);return v;};
 charRows.forEach((r,i)=>{cards[i].dialoguePortrait=image(r,'默认对话立绘ID');});
 for(const r of rows(tables,'DialogueLine')){
  const d=dialogues.find(d=>d.id===r.DialogueID);r.check(d,'DialogueID','未知对话');
  const order=num(r,'句序');r.check(!d.lines.some(l=>l.order===order),'句序','段内句序重复');
  r.check(typeof r.正文==='string'&&r.正文.trim(),'正文','台词不能为空');
  r.check(!r.说话角色ID||cards.some(c=>c.card_id===r.说话角色ID),'说话角色ID','未知角色');
  const side=r.站位||'左';r.check(['左','右','left','right'].includes(side),'站位','请选择左或右');
  const action=r.背景操作||'';r.check(['','沿用上一句','显示图片','恢复原场景'].includes(action),'背景操作','未知背景操作');
  const background=image(r,'背景图ID');r.check((action==='显示图片')===!!background,'背景图ID','仅显示图片时必须填写背景');
  d.lines.push({order,text:r.正文,character:r.说话角色ID||'',name:r.显示名覆盖||'',portrait:image(r,'立绘ID覆盖'),side:['右','right'].includes(side)?'right':'left',backgroundAction:action==='显示图片'?'image':action==='恢复原场景'?'scene':'',background});
 }
 for(const d of dialogues){const r=rows(tables,'Dialogue').find(r=>r.DialogueID===d.id);r.check(d.lines.length,'DialogueID','对话至少需要一句台词');d.lines.sort((a,b)=>a.order-b.order);}
 const levels=rows(tables,'Level').map(r=>{
  const slots=positions.map(k=>{r.check(!r[k]||cards.some(c=>c.card_id===r[k]),k,'未知角色 '+r[k]);return r[k]||null;});
  r.check(slots.some(Boolean),'前左','至少需要一个敌人');r.check(['elimination','score_5'].includes(r.胜利规则),'胜利规则','未知胜利规则');
  const playerSlots=positions.map(k=>{const key='我方'+k;r.check(!r[key]||cards.some(c=>c.card_id===r[key]),key,'未知角色 '+r[key]);return r[key]||null;});
  if(levelOnly)r.check(playerSlots.slice(0,3).some(Boolean),'我方前中','独立关卡至少需要一名我方前排');
  return {id:r.LevelID,name:r.名称,slots,...(playerSlots.some(Boolean)?{playerSlots}:{}),victoryCondition:r.胜利规则,background:asset(r,'场景背景'),title:r.界面标题,beforeDialogue:ref(r,'战前对话ID'),victoryDialogue:ref(r,'胜利对话ID'),defeatDialogue:ref(r,'失败对话ID')};
 });
 const nodes=rows(tables,'Node').map(r=>{
  r.check(levels.some(l=>l.id===r.LevelID),'LevelID','未知关卡 '+r.LevelID);
  const min=r.起始层===''?1:num(r,'起始层',1),max=r.结束层===''?31:num(r,'结束层',1);
  r.check(min<=max,'结束层','结束层早于起始层');
  return {id:r.NodeID,level:r.LevelID,weight:num(r,'权重',1),min,max,dialogue:ref(r,'节点遭遇对话ID')};
 });
 const chapters=rows(tables,'Chapter').map(r=>{
  const layers=num(r,'层数',7),available=bool(r,'开放'),pools={combat:r.普通节点,elite:r.精英节点,boss:r.Boss节点};
  for(const [type,col] of [['combat','普通节点'],['elite','精英节点'],['boss','Boss节点']]){
   const id=pools[type];if(!available&&!id)continue;
   for(let floor=type==='boss'?layers+1:type==='elite'?6:1;floor<=(type==='boss'?layers+1:layers);floor++)
    r.check(nodes.some(n=>n.id===id&&n.min<=floor&&floor<=n.max),col,'第'+floor+'层缺少可抽取关卡');
  }
  return {id:r.ChapterID,name:r.名称,layers,available,background:asset(r,'地图背景'),pools,openingDialogue:ref(r,'章节开场对话ID'),endingDialogue:ref(r,'章节结束对话ID')};
 });
 const heroes=cards.filter(c=>c.role==='hero');if(heroes.length!==1)throw Error('Character [类型] 必须有一名 hero');
 const pack={schema_version:1,version:'buff-effects-v3',cards,skills,buffs,hero:heroes[0].card_id,recruits:cards.filter(c=>c.role==='ally').map(c=>c.card_id),chapters,levels,nodes,dialogues,config};
 try{if(levelOnly){const errors=validateCatalog(pack);if(errors.length)throw Error(errors.join('；'));}else validatePack(pack);}catch(error){
  const issue=error.message.split('；')[0];
  for(const [sheet,rows,key] of [['Skill',skillRows,'SkillID'],['Character',charRows,'CharacterID']]){
   const row=rows.find(r=>issue.startsWith(r[key])||issue.startsWith(r.名称));
   if(row)row.check(false,key,issue);
  }
  throw error;
 }
 return pack;
}
