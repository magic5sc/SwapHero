export const skillColumns={
 Skill:'SkillID 名称 说明 图标 技能栏 品质 精英限定 最大等级',
 SkillEffect:'EffectID SkillID 顺序 监听区域 触发时机 触发主体 回合归属 入场原因 伤害类型 条件BuffID 比较 条件层数 ResultGroupID',
 BuffEffect:'EffectID BuffID 顺序 监听区域 触发时机 触发主体 回合归属 入场原因 伤害类型 条件BuffID 比较 条件层数 ResultGroupID',
 EffectResult:'ResultGroupID 顺序 操作 目标 目标区域 BuffID 层数 等级1 等级2 等级3',
 Buff:'BuffID 名称 类型 生效区域 叠加方式 合并范围 最大层数 持续时间 持续回合 离场处理 图标 数值合并 时长刷新 满层处理 护盾补充'
};
// Missing policy columns mean the original behavior; explicit blank cells are errors.
export function normalizeBuffTables(input){
 const out=structuredClone(input);out.BuffEffect??=[skillColumns.BuffEffect.split(' ')];
 const t=out.Buff;if(t)for(const [key,value] of Object.entries({数值合并:'replace',时长刷新:'refresh',满层处理:'apply',护盾补充:'reset'}))if(!t[0].includes(key)){
  const col=t[0].length;t[0].push(key);for(const r of t.slice(1))if(r.some(v=>v!==''&&v!=null))r[col]=key==='数值合并'&&r[t[0].indexOf('叠加方式')]==='max'?'max':value;
 }
 return out;
}
const objects=table=>(table||[]).slice(1).filter(r=>r.some(v=>v!==''&&v!=null)).map(r=>Object.fromEntries(table[0].map((k,i)=>[k,r[i]??''])));
const table=(name,data)=>[skillColumns[name].split(' '),...data.map(r=>skillColumns[name].split(' ').map(k=>r[k]??''))];
// Upgrade only the known legacy format; unrelated workbook tabs/columns are retained.
export function migrateSkillTables(input){
 if(!input.Skill?.[0]?.includes('触发时机'))return input;
 if(['SkillEffect','EffectResult','Buff'].some(n=>input[n])||input.BuffEffect?.length>1)throw Error('不能混用旧技能列与新技能子表');
 const out=structuredClone(input),skills=[],effects=[],results=[],buffs=[];
 const addBuff=(id,name,kind,r,stack='refresh')=>{buffs.push({BuffID:id,名称:name,类型:kind,生效区域:['marker','attack','shield'].includes(kind)?'any':r.生效区域||'battlefield',叠加方式:stack,合并范围:'source_skill',最大层数:stack==='add'?9999:1,持续时间:r.持续己方回合?'owner_turns':r.持续时间==='on_field'?'battle':r.持续时间||'battle',持续回合:r.持续己方回合||'',离场处理:r.持续时间==='on_field'?'remove':'keep',图标:''});return id;};
 for(const r of objects(input.Skill)){
  const id=r.SkillID;skills.push({SkillID:id,名称:r.名称,说明:r.说明,图标:'',技能栏:r.技能栏,品质:r.品质,精英限定:r.精英限定,最大等级:3});
  const addEffect=(suffix,event,group,extra={})=>effects.push({EffectID:id+'_'+suffix,SkillID:id,顺序:effects.filter(e=>e.SkillID===id).length+1,监听区域:r.生效区域||'battlefield',触发时机:event,触发主体:r.触发主体||'self',回合归属:'any',入场原因:'any',伤害类型:'any',ResultGroupID:group,...extra});
  const addResult=(group,op,target,zone,buff,values,stacks=1)=>results.push({ResultGroupID:group,顺序:results.filter(e=>e.ResultGroupID===group).length+1,操作:op,目标:target,目标区域:zone,BuffID:buff||'',层数:op==='apply_buff'?stacks:'',等级1:values[0],等级2:values[1],等级3:values[2]});
  const vals=[r.等级1,r.等级2,r.等级3];
  if(r.常驻能力){const b=addBuff(id+'_passive',r.名称,r.常驻能力,{...r,持续时间:'battle'});addEffect('passive','passive',id+'_passive');addResult(id+'_passive','apply_buff','self','any',b,vals);}
  if(!r.效果)continue;
  const group=id+'_result';let op=r.效果,buff='';
  if(['modify_attack','set_shield'].includes(op)){buff=addBuff(id+'_buff',r.名称,op==='modify_attack'?'attack':'shield',r,op==='modify_attack'&&!r.刷新不叠加?'independent':'refresh');op='apply_buff';}
  addResult(group,op,r.目标,r.目标区域,buff,vals);
  if(r.每N次触发||r.延后己方回合!==undefined&&r.延后己方回合!==''){
   if(Number(r.延后己方回合)!==1||!r.每N次触发)throw Error(id+' 旧延迟配置需要人工迁移');
   const counter=addBuff(id+'_charge','蓄力','marker',{},'add'),ready=addBuff(id+'_ready','反击准备','marker',{},'add');
   addEffect('charge',r.触发时机,id+'_charge');addResult(id+'_charge','apply_buff','self','any',counter,[0,0,0]);
   addEffect('prepare','turn_end',id+'_prepare',{回合归属:'own',条件BuffID:counter,比较:'gte',条件层数:r.每N次触发});
   addResult(id+'_prepare','remove_buff','self','any',counter,[r.每N次触发,r.每N次触发,r.每N次触发]);addResult(id+'_prepare','apply_buff','self','any',ready,[0,0,0]);
   addEffect('release','turn_start',id+'_release',{回合归属:'own',条件BuffID:ready,比较:'gte',条件层数:1});
   addResult(id+'_release','remove_buff','self','any',ready,[1,1,1]);
   results.find(e=>e.ResultGroupID===group).ResultGroupID=id+'_release';results.find(e=>e.ResultGroupID===id+'_release'&&e.操作!=='remove_buff').顺序=2;
  }else addEffect('trigger',r.触发时机,group,{入场原因:r.仅交换入场===true||String(r.仅交换入场).toLowerCase()==='true'?'exchange':'any'});
 }
 for(const [n,data] of Object.entries({Skill:skills,SkillEffect:effects,EffectResult:results,Buff:buffs}))out[n]=table(n,data);
 return out;
}
export function compileSkillTables({rows,num,bool,tables}){
 const sr=rows(tables,'Skill'),er=rows(tables,'SkillEffect'),ber=rows(tables,'BuffEffect'),rr=rows(tables,'EffectResult'),br=rows(tables,'Buff');
 const enums=(r,k,values)=>r.check(values.includes(r[k]),k,'请选择 '+values.join(' / '));
 const buffs=Object.fromEntries(br.map(r=>{
  enums(r,'类型',['marker','attack','shield','armor','damage_armor','agile','combat_damage_immunity']);enums(r,'生效区域',['battlefield','bench','any']);enums(r,'叠加方式',['add','refresh','max','independent']);enums(r,'合并范围',['buff','source_skill']);enums(r,'持续时间',['battle','turn','owner_turns']);enums(r,'离场处理',['keep','remove','pause']);
  enums(r,'数值合并',['replace','keep','max','min']);enums(r,'时长刷新',['refresh','keep']);enums(r,'满层处理',['apply','reject']);enums(r,'护盾补充',['reset','add','keep']);
  r.check(r.名称,'名称','需要名称');return [r.BuffID,{id:r.BuffID,name:r.名称,kind:r.类型,active_zone:r.生效区域,stacking:r.叠加方式,scope:r.合并范围,max_stacks:num(r,'最大层数',1),duration:r.持续时间,turns:r.持续时间==='owner_turns'?num(r,'持续回合',1):null,leave:r.离场处理,icon:r.图标||'',value_policy:r.数值合并,duration_refresh:r.时长刷新,overflow:r.满层处理,shield_refresh:r.护盾补充}];
 }));
 const usedGroups=new Set(),orders=new Set();
 for(const r of er){r.check(sr.some(s=>s.SkillID===r.SkillID),'SkillID','未知技能');const key=r.SkillID+':'+num(r,'顺序',1);r.check(!orders.has(key),'顺序','同技能效果顺序重复');orders.add(key);usedGroups.add(r.ResultGroupID);}
 for(const r of ber){r.check(buffs[r.BuffID],'BuffID','未知Buff');const key='buff:'+r.BuffID+':'+num(r,'顺序',1);r.check(!orders.has(key),'顺序','同Buff效果顺序重复');orders.add(key);usedGroups.add(r.ResultGroupID);r.check(r.触发时机!=='passive','触发时机','Buff效果使用事件触发，属性由Buff类型提供');}
 const resultOrders=new Set();for(const r of rr){r.check(usedGroups.has(r.ResultGroupID),'ResultGroupID','结果组未被效果引用');const key=r.ResultGroupID+':'+num(r,'顺序',1);r.check(!resultOrders.has(key),'顺序','同组结果顺序重复');resultOrders.add(key);}
 const baseBuffs=structuredClone(buffs);
 function compileEffects(entries,max){
  const s={levels:Object.fromEntries(Array.from({length:max},(_,i)=>[i+1,{}])),rules:[]};
  for(const e of entries.sort((a,b)=>a.顺序-b.顺序)){
   enums(e,'监听区域',['battlefield','bench','any']);enums(e,'回合归属',['own','opponent','any']);enums(e,'入场原因',['exchange','reinforce','any']);enums(e,'伤害类型',['combat','skill','health_loss','any']);
   if(e.入场原因!=='any')e.check(e.触发时机==='unit_enter','入场原因','仅入场事件适用');if(e.伤害类型!=='any')e.check(e.触发时机==='damage_taken','伤害类型','仅受伤事件适用');
   const rule={id:e.EffectID,event:e.触发时机,subject:e.触发主体,active_zone:e.监听区域,turn:e.回合归属,entry:e.入场原因,damageType:e.伤害类型,conditions:[],effects:[]};
   if(e.条件BuffID){e.check(buffs[e.条件BuffID],'条件BuffID','未知Buff');enums(e,'比较',['gte','eq','lt']);rule.conditions.push({buff:e.条件BuffID,compare:e.比较,layers:num(e,'条件层数')});}else e.check(!e.比较&&e.条件层数==='','条件BuffID','填写条件层数前必须指定Buff');
   const group=rr.filter(x=>x.ResultGroupID===e.ResultGroupID).sort((a,b)=>a.顺序-b.顺序);e.check(group.length,'ResultGroupID','未知或空结果组');
   for(const [i,x] of group.entries()){
    enums(x,'操作',['apply_buff','remove_buff','heal','deal_damage','swap_positions']);const key=e.EffectID+'_'+i;for(let lv=1;lv<=max;lv++)s.levels[lv][key]=num(x,'等级'+lv,x.操作==='modify_attack'||x.操作==='apply_buff'&&buffs[x.BuffID]?.kind==='attack'?-9999:0);
    const result={op:x.操作,target:x.目标,zone:x.目标区域,amount:key,duration:null,grid:true};
    if(['apply_buff','remove_buff'].includes(x.操作)){x.check(buffs[x.BuffID],'BuffID','未知Buff');result.buff=structuredClone(baseBuffs[x.BuffID]);if(x.操作==='apply_buff')result.stacks=num(x,'层数',1);}else x.check(!x.BuffID&&x.层数==='','BuffID','该操作不接受Buff或层数字段');
    if(x.操作==='deal_damage')result.damage_type='skill';rule.effects.push(result);
   }
   if(rule.event==='passive'){e.check(rule.subject==='self'&&rule.turn==='any'&&rule.entry==='any'&&rule.damageType==='any'&&rule.conditions.length===0&&rule.effects.every(x=>x.op==='apply_buff'&&['armor','damage_armor','agile','combat_damage_immunity'].includes(x.buff.kind)&&x.target==='self'&&x.buff.duration==='battle'&&x.buff.active_zone===rule.active_zone),'触发时机','常驻仅支持护甲、减伤、敏捷、战斗免疫');}
   s.rules.push(rule);
  }
  return s;
 }
 for(const b of Object.values(buffs))Object.assign(b,compileEffects(ber.filter(e=>e.BuffID===b.id),3));
 const skills=sr.map(r=>{
  r.check(r.名称,'名称','需要技能名称');enums(r,'品质',['common','rare','epic','legendary']);const max=num(r,'最大等级',1);r.check(max<=3,'最大等级','当前支持1至3级');
  const s={skill_id:r.SkillID,name:r.名称,description:r.说明,icon:r.图标||'',slot:r.技能栏,quality:r.品质,gold_only:bool(r,'精英限定'),status:'specified',blockers:[],active_zone:'battlefield',stacking:'single_instance',unload_policy:'remove_passive_and_listeners',passive:null,...compileEffects(er.filter(e=>e.SkillID===r.SkillID),max)};
  r.check(s.rules.length,'SkillID','技能至少需要一个效果');
  const needed=new Set();const visit=rules=>{for(const rule of rules)for(const id of [...rule.conditions.map(c=>c.buff),...rule.effects.filter(e=>e.buff).map(e=>e.buff.id)])if(!needed.has(id)){needed.add(id);visit(buffs[id].rules);}};visit(s.rules);
  s.buffs=Object.fromEntries([...needed].map(id=>[id,buffs[id]]));return s;
 });return {skills,skillRows:sr,buffs};
}
