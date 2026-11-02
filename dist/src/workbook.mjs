// Shared by the release compiler and the developer workbook editor.
import {validatePack} from './pve.mjs';
export const columns={
 Skill:'SkillID 名称 说明 技能栏 生效区域 触发时机 触发主体 效果 目标 目标区域 持续时间 常驻能力 等级1 等级2 等级3 品质 精英限定',
 Character:'CharacterID 名称 类型 攻击 生命 美术ID 可用技能栏 初始技能 可学技能 品质 精英限定',
 Level:'LevelID 名称 前左 前中 前右 备左 备中 备右 胜利规则 场景背景 界面标题',
 Node:'NodeID LevelID 权重 起始层 结束层',
 Chapter:'ChapterID 名称 层数 开放 地图背景 普通节点 精英节点 Boss节点'
};
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
  row.check(sheet==='Node'||!ids.has(id),key,'ID 重复');ids.add(id);
  return [row];
 });
}
function num(r,k,min=0){const n=Number(r[k]);r.check(r[k]!==''&&Number.isSafeInteger(n)&&n>=min,k,'需要不小于 '+min+' 的整数');return n;}
function bool(r,k){const v=String(r[k]).toLowerCase();r.check(['true','false','1','0'].includes(v),k,'请填 TRUE 或 FALSE');return ['true','1'].includes(v);}
function asset(r,k){const path=r[k];r.check(!path||/^assets\/(?:[\w-]+\/)*[\w-]+\.(png|webp|jpg|svg)$/.test(path),k,'填写 assets 下的图片路径');return path;}
export function compileTables(tables,config){
 const skillRows=rows(tables,'Skill'),charRows=rows(tables,'Character');
 const skills=skillRows.map(r=>{
  r.check(r.名称,'名称','需要技能名称');r.check(['common','rare','epic','legendary'].includes(r.品质),'品质','未知品质');
  const effect={op:r.效果,target:r.目标,zone:r.目标区域,duration:r.持续时间||null,amount:'amount'};
  if(effect.op==='deal_damage')effect.damage_type='skill';
  r.check(r.常驻能力||r.效果,'效果','需要效果或常驻能力');
  return {skill_id:r.SkillID,name:r.名称,description:r.说明,slot:r.技能栏,quality:r.品质,gold_only:bool(r,'精英限定'),status:'specified',blockers:[],active_zone:r.生效区域,stacking:'single_instance',unload_policy:'remove_passive_and_listeners',passive:r.常驻能力||null,levels:Object.fromEntries([1,2,3].map(i=>[i,{amount:num(r,'等级'+i,-9999)}])),rules:r.效果?[{event:r.触发时机,subject:r.触发主体,effects:[effect]}]:[]};
 });
 const bySkill=new Map(skills.map(s=>[s.skill_id,s]));
 const cards=charRows.map(r=>{
  const slots=split(r.可用技能栏).map(slot_id=>({slot_id,type:'skill',capacity:1}));
  const checkSkill=(id,col)=>{const s=bySkill.get(id);r.check(s,col,'未知技能 '+id);r.check(slots.some(x=>x.slot_id===s.slot),col,'缺少技能栏 '+s.slot);return s;};
  r.check(r.名称,'名称','需要角色名称');r.check(['common','rare','epic','legendary'].includes(r.品质),'品质','未知品质');
  r.check(['hero','ally','enemy'].includes(r.类型),'类型','请选择 hero / ally / enemy');
  const learnable=split(r.可学技能);for(const id of learnable)checkSkill(id,'可学技能');
  const bindings=split(r.初始技能).map(binding=>{const [id,lv='1',...extra]=binding.split('@');const s=checkSkill(id,'初始技能');r.check(!extra.length&&['1','2','3'].includes(lv),'初始技能','格式为 SkillID@等级');return {slot_id:s.slot,skill_id:id,level:Number(lv)};});
  return {card_id:r.CharacterID,name:r.名称,role:r.类型,category:'test',attack:num(r,'攻击'),health:num(r,'生命',1),art_id:r.美术ID||null,quality:r.品质,gold_only:bool(r,'精英限定'),status:'specified',blockers:[],slots,skills:bindings,learnable};
 });
 const levels=rows(tables,'Level').map(r=>{
  const slots=positions.map(k=>{r.check(!r[k]||cards.some(c=>c.card_id===r[k]),k,'未知角色 '+r[k]);return r[k]||null;});
  r.check(slots.some(Boolean),'前左','至少需要一个敌人');r.check(['elimination','score_5'].includes(r.胜利规则),'胜利规则','未知胜利规则');
  return {id:r.LevelID,name:r.名称,slots,victoryCondition:r.胜利规则,background:asset(r,'场景背景'),title:r.界面标题};
 });
 const nodes=rows(tables,'Node').map(r=>{
  r.check(levels.some(l=>l.id===r.LevelID),'LevelID','未知关卡 '+r.LevelID);
  const min=r.起始层===''?1:num(r,'起始层',1),max=r.结束层===''?31:num(r,'结束层',1);
  r.check(min<=max,'结束层','结束层早于起始层');
  return {id:r.NodeID,level:r.LevelID,weight:num(r,'权重',1),min,max};
 });
 const chapters=rows(tables,'Chapter').map(r=>{
  const layers=num(r,'层数',7),available=bool(r,'开放'),pools={combat:r.普通节点,elite:r.精英节点,boss:r.Boss节点};
  for(const [type,col] of [['combat','普通节点'],['elite','精英节点'],['boss','Boss节点']]){
   const id=pools[type];if(!available&&!id)continue;
   for(let floor=type==='boss'?layers+1:type==='elite'?6:1;floor<=(type==='boss'?layers+1:layers);floor++)
    r.check(nodes.some(n=>n.id===id&&n.min<=floor&&floor<=n.max),col,'第'+floor+'层缺少可抽取关卡');
  }
  return {id:r.ChapterID,name:r.名称,layers,available,background:asset(r,'地图背景'),pools};
 });
 const heroes=cards.filter(c=>c.role==='hero');if(heroes.length!==1)throw Error('Character [类型] 必须有一名 hero');
 const pack={schema_version:1,version:'pve-five-tables-v1',cards,skills,hero:heroes[0].card_id,recruits:cards.filter(c=>c.role==='ally').map(c=>c.card_id),chapters,levels,nodes,config};
 try{validatePack(pack);}catch(error){
  const issue=error.message.split('；')[0];
  for(const [sheet,rows,key] of [['Skill',skillRows,'SkillID'],['Character',charRows,'CharacterID']]){
   const row=rows.find(r=>issue.startsWith(r[key])||issue.startsWith(r.名称));
   if(row)row.check(false,key,issue);
  }
  throw error;
 }
 return pack;
}
