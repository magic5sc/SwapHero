import {artForUnit,makeSprite,makeAttackEffect} from './art.mjs';
import {resolveArt} from './art-assets.mjs';
import {DEFAULT_ASSETS,assetLibrary,artIssues} from './art-assets.mjs';
import {loadPublishedCatalog} from './release-loader.mjs';
import {normalizeDocument,createRelease,sourceFiles,importSourceFiles} from './content-package.mjs';
import {zipFiles,unzipFiles} from './source-zip.mjs';
import {loadWorkspace,saveWorkspace,previousWorkspace,HISTORY} from './editor-storage.mjs';
import {events,ops,targets,durations,DRAFT_KEY,PLAY_KEY,newId,makeCard,makeSkill,editorIssues,makePlaySnapshot,forkSkill} from './editor-model.mjs';
const $=id=>document.getElementById(id);
const node=(tag,parent,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;parent?.append(e);return e;};
let data,official,current,team=[],dirty=false;
const card=()=>data.cards.find(c=>c.card_id===current);
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function field(parent,label,value,change,options=null,type='text'){
 const wrap=node('label',parent,undefined,'field');node('span',wrap,label);const input=node(options?'select':type==='textarea'?'textarea':'input',wrap);
 if(options){for(const [v,t] of Object.entries(options)){const o=node('option',input,t);o.value=v;}}else if(type!=='textarea')input.type=type;
 input.setAttribute('aria-label',label);input.value=value??'';input.addEventListener(options?'change':'input',()=>{change(type==='number'?(input.value===''?NaN:Number(input.value)):input.value);touch();});return input;
}
function parameter(parent,label,s,level,key){const input=field(parent,label,s.levels[level][key],v=>s.levels[level][key]=v,null,'number');input.dataset.skill=s.skill_id;input.dataset.level=level;input.dataset.parameter=key;return input;}
function button(parent,label,fn,cls='tiny'){const b=node('button',parent,label,cls);b.type='button';b.onclick=()=>{try{fn();}catch(e){message(e.message,true);}};return b;}
function touch(){for(const input of document.querySelectorAll('[data-parameter]')){const sk=data.skills.find(s=>s.skill_id===input.dataset.skill);const value=sk?.levels?.[input.dataset.level]?.[input.dataset.parameter];if(input!==document.activeElement)input.value=value??'';}dirty=true;$('dirty').textContent='未保存';renderList();renderPreview();}
function moveItem(array,index,delta){const next=index+delta;if(next<0||next>=array.length)return;[array[index],array[next]]=[array[next],array[index]];touch();renderForm();}
function renderList(){
 $('card-count').textContent=data.cards.length+' 张';const q=$('search').value.toLowerCase();$('card-list').replaceChildren();
 for(const c of data.cards.filter(c=>(c.name+' '+c.card_id).toLowerCase().includes(q))){const b=button($('card-list'),'',()=>{current=c.card_id;render();},c.card_id===current?'active':'');node('span',b,c.name);node('small',b,`${c.attack} / ${c.health}`);}
 $('team-count').textContent=team.length+' / 6';$('team').replaceChildren();for(const c of data.cards){const l=node('label',$('team'));const input=node('input',l);input.type='checkbox';input.checked=team.includes(c.card_id);node('span',l,(input.checked?(team.indexOf(c.card_id)+1)+'. ':'')+c.name);input.onchange=()=>{if(input.checked){if(team.length===6){input.checked=false;message('队伍已满，请先取消一张。',true);return;}team.push(c.card_id);}else team=team.filter(id=>id!==c.card_id);touch();};}
}
function renderPreview(){renderReferencePreviews();const c=card();$('preview').replaceChildren();if(c){const art=resolveArt(data,c);const stage=node('div',$('preview'),undefined,'card art-preview');stage.append(makeSprite('editor-character',artForUnit({id:c.card_id,art})));button($('preview'),'预览攻击',()=>{stage.classList.remove('perform-attack');void stage.offsetWidth;stage.classList.add('perform-attack');if(art.attackEffect)stage.append(makeAttackEffect(art.attackEffect));setTimeout(()=>{stage.classList.remove('perform-attack');stage.querySelectorAll('.asset-fx').forEach(e=>e.remove());},1300);});node('h3',$('preview'),c.name);node('div',$('preview'),`攻击 ${c.attack}　生命 ${c.health}`,'stats');for(const ref of c.skills){const s=data.skills.find(s=>s.skill_id===ref.skill_id);if(!s)continue;const p=node('p',$('preview'));node('strong',p,`${s.name} · Lv.${ref.level}`);if(s.passive)node('div',p,({agile:'敏捷：换入当回合可攻击',armor:'护甲：战斗伤害减少 '+s.levels?.[ref.level]?.amount,combat_damage_immunity:'不受战斗伤害'})[s.passive]||s.passive);for(const r of s.rules)node('div',p,`${r.subject==='self'?'自身':'其他友军'} · ${events[r.event]||r.event}：`+r.effects.map(e=>`${targets[e.target]||'未设目标'}${['rear_ally','rear_enemy'].includes(e.target)?'（'+(e.field_position||'自身所在')+'战线）':''}${e.target==='other_allies'?(e.zone==='any'?'（含后备）':'（仅前排）'):''}，${ops[e.op]||e.op}${e.amount?' '+s.levels?.[ref.level]?.[e.amount]:''}${e.duration?'，'+durations[e.duration]:''}`).join('；'));}if(!c.skills.length)node('p',$('preview'),'无技能');}
 const errors=editorIssues(data);$('issues').replaceChildren();if(!errors.length)node('li',$('issues'),'结构校验通过；试玩还会检查队伍及草稿状态。');else for(const e of errors)node('li',$('issues'),e,'error');
}
function renderReferencePreviews(){
 const c=card();if(!c)return;const art=resolveArt(data,c);
 for(const kind of ['character','effect']){
 const host=$('reference-'+kind);if(!host)continue;
 host.replaceChildren();const isCharacter=kind==='character';
 const stage=node('div',host,undefined,'card reference-stage');
 stage.setAttribute('role','img');stage.setAttribute('aria-label',isCharacter?'所选角色动画预览':'所选攻击特效预览');
 if(isCharacter)stage.append(makeSprite('editor-character',artForUnit({id:c.card_id,art})));
 else if(!art.attackEffect)node('span',stage,'未选择特效','muted');
 const caption=node('div',host,isCharacter?(art.character?.name||'默认占位'):(art.attackEffect?.name||'无特效'),'reference-caption');
 const controls=node('div',host,undefined,'actions');
 let timer;
 const stop=()=>{clearTimeout(timer);stage.classList.remove('perform-attack');stage.querySelectorAll('.asset-fx').forEach(e=>e.remove());};
 const play=()=>{stop();if(isCharacter){void stage.offsetWidth;stage.classList.add('perform-attack');}else if(art.attackEffect)stage.append(makeAttackEffect(art.attackEffect));timer=setTimeout(stop,isCharacter?1300:art.attackEffect?.duration_ms||1000);};
 if(isCharacter)button(controls,'播放待机',stop);
 const b=button(controls,isCharacter?'播放攻击':'播放特效',play);b.disabled=!isCharacter&&!art.attackEffect;
 button(controls,'放大 / 缩小',()=>stage.classList.toggle('expanded'));
 if(!isCharacter&&art.attackEffect)play();
 }
}
function renderForm(){const c=card();$('card-form').replaceChildren();$('skills').replaceChildren();if(!c)return;
 node('code',$('card-form'),'稳定 ID：'+c.card_id);const fields=node('div',$('card-form'),undefined,'fields');
 const references=node('div',fields,undefined,'asset-reference-grid');
 for(const kind of ['character','effect']){
 const box=node('section',references,undefined,'asset-reference');
 const isCharacter=kind==='character';
 field(box,isCharacter?'引用角色':'攻击特效',isCharacter?c.art_id||'':c.attack_effect_id||'',v=>{if(isCharacter)c.art_id=v||null;else c.attack_effect_id=v||null;},{'':isCharacter?'默认占位':'无',...Object.fromEntries((isCharacter?assetLibrary(data).characters:assetLibrary(data).effects).map(a=>[a.asset_id,a.name]))});
 const host=node('div',box);host.id='reference-'+kind;
 }
 renderReferencePreviews();
 field(fields,'卡牌名称',c.name,v=>c.name=v);field(fields,'元素 / 属性',c.element,v=>c.element=v||null);
 field(fields,'攻击力（非负整数）',c.attack,v=>c.attack=v,null,'number');field(fields,'最大生命（正整数）',c.health,v=>c.health=v,null,'number');
 field(fields,'内容状态',c.status,v=>c.status=v,{specified:'可用定义',draft:'草稿（禁止试玩）'});field(fields,'卡牌类别',c.category,v=>c.category=v,{character:'角色',test:'测试卡'});
 field(fields,'原始卡面文案 / 备注',c.source_text,v=>c.source_text=v,null,'textarea');field(fields,'待确认项（每行一条）',c.blockers.join('\n'),v=>c.blockers=v.split('\n').filter(Boolean),null,'textarea');
 for(const slot of c.slots){const box=node('section',$('skills'),undefined,'slot');const title=node('div',box,undefined,'rule-title');node('h3',title,slot.type==='innate'?'固有技能':`技能槽 · ${slot.slot_id}`);
 button(title,'移除槽位',()=>{if(!confirm('移除槽位及当前装配？技能定义会保留。'))return;c.skills=c.skills.filter(r=>r.slot_id!==slot.slot_id);c.slots=c.slots.filter(s=>s!==slot);touch();renderForm();},'tiny danger');
 const ref=c.skills.find(r=>r.slot_id===slot.slot_id);field(box,'装配技能',ref?.skill_id||'',v=>{c.skills=c.skills.filter(r=>r.slot_id!==slot.slot_id);if(v){const sk=data.skills.find(s=>s.skill_id===v);c.skills.push({slot_id:slot.slot_id,skill_id:v,level:Number(Object.keys(sk.levels)[0])});}renderForm();},{'':'无技能',...Object.fromEntries(data.skills.map(s=>[s.skill_id,s.name+' · '+s.skill_id]))});
 const actions=node('div',box,undefined,'actions');button(actions,'＋ 创建并装配',()=>{const s=makeSkill(newId('custom_skill',data.skills,'skill_id'));data.skills.push(s);c.skills=c.skills.filter(r=>r.slot_id!==slot.slot_id);c.skills.push({slot_id:slot.slot_id,skill_id:s.skill_id,level:1});touch();renderForm();});
 if(!ref)continue;const s=data.skills.find(s=>s.skill_id===ref.skill_id);if(!s)continue;
 button(actions,'独立副本',()=>{forkSkill(data,c,ref);touch();renderForm();});const users=data.cards.filter(c=>c.skills.some(r=>r.skill_id===s.skill_id));node('p',box,'共享于：'+users.map(c=>c.name).join('、'),'muted');
 const sf=node('div',box,undefined,'fields');field(sf,'技能名称',s.name,v=>s.name=v);field(sf,'装配等级',String(ref.level),v=>{ref.level=Number(v);renderForm();},Object.fromEntries(Object.keys(s.levels).map(l=>[l,'等级 '+l])));
 field(sf,'常驻能力（可与触发技能共存）',s.passive||'',v=>{s.passive=v||null;if(v==='armor')for(const p of Object.values(s.levels))p.amount??=1;renderForm();},{'':'无',agile:'敏捷',armor:'护甲',combat_damage_immunity:'战斗伤害免疫'});
 field(sf,'技能状态',s.status,v=>s.status=v,{specified:'可用定义',draft:'草稿'});field(sf,'待确认项（每行一条）',s.blockers.join('\n'),v=>s.blockers=v.split('\n').filter(Boolean),null,'textarea');
 const levelBox=node('div',box,undefined,'levels');node('strong',levelBox,'等级 '+ref.level+' · 数值参数');const params=s.levels[ref.level];const pf=node('div',levelBox,undefined,'fields');for(const key of Object.keys(params))parameter(pf,key,s,ref.level,key);
 const la=node('div',levelBox,undefined,'actions');button(la,'＋ 等级',()=>{const level=Math.max(...Object.keys(s.levels).map(Number))+1;s.levels[level]=structuredClone(params);ref.level=level;touch();renderForm();});button(la,'移除当前等级',()=>{if(Object.keys(s.levels).length===1)throw Error('至少保留一个等级');if(data.cards.some(c=>c.skills.some(r=>r!==ref&&r.skill_id===s.skill_id&&r.level===ref.level)))throw Error('其他卡牌正在使用此等级');delete s.levels[ref.level];ref.level=Number(Object.keys(s.levels)[0]);touch();renderForm();});
 for(const [ri,r] of s.rules.entries()){
 const rb=node('div',box,undefined,'rule');const rt=node('div',rb,undefined,'rule-title');node('strong',rt,'触发规则 '+(ri+1));const ra=node('div',rt,undefined,'actions');button(ra,'↑',()=>moveItem(s.rules,ri,-1));button(ra,'↓',()=>moveItem(s.rules,ri,1));button(ra,'删除规则',()=>{s.rules.splice(ri,1);touch();renderForm();});
 const rf=node('div',rb,undefined,'fields');field(rf,'触发时机',r.event,v=>{r.event=v;if(['attack_end','turn_end'].includes(v))r.subject='self';renderForm();},events);field(rf,'事件主体',r.subject,v=>r.subject=v,['attack_end','turn_end'].includes(r.event)?{self:'自身（阶段结束）'}:{self:'自身',other_ally:'其他己方单位'});
 for(const [ei,e] of r.effects.entries()){
 const eb=node('div',rb,undefined,'effect');const et=node('div',eb,undefined,'rule-title');node('strong',et,'效果 '+(ei+1));const ea=node('div',et,undefined,'actions');button(ea,'↑',()=>moveItem(r.effects,ei,-1));button(ea,'↓',()=>moveItem(r.effects,ei,1));button(ea,'删除效果',()=>{r.effects.splice(ei,1);touch();renderForm();});
 const ef=node('div',eb,undefined,'fields');field(ef,'效果类型',e.op,v=>{e.op=v;e.damage_type=v==='deal_damage'?'skill':null;e.duration=v==='modify_attack'?'battle':null;if(v==='swap_positions'){e.amount=null;e.target='lower_ally';e.zone='battlefield';}else if(!e.amount){e.amount='value_'+ri+'_'+ei;for(const p of Object.values(s.levels))p[e.amount]=1;}renderForm();},ops);
 field(ef,'目标范围',e.target,v=>{e.target=v;delete e.field_position;if(['rear_ally','rear_enemy'].includes(v))e.zone='bench';else if(e.zone==='bench')e.zone='battlefield';renderForm();},e.op==='swap_positions'?{lower_ally:targets.lower_ally}:targets);
 field(ef,'目标所在区域',e.zone,v=>e.zone=v,['rear_ally','rear_enemy'].includes(e.target)?{bench:'仅备战区'}:e.op==='swap_positions'?{battlefield:'仅前排'}:{battlefield:'仅前排',any:'前排和后备（对位/下方仍仅前排）'});
 if(['rear_ally','rear_enemy'].includes(e.target))field(ef,'对应战线',String(e.field_position??''),v=>{e.field_position=v===''?null:Number(v);},{'':'自身所在战线','1':'1号战线','2':'2号战线','3':'3号战线'});
 if(e.op==='modify_attack')field(ef,'持续时间',e.duration,v=>e.duration=v,durations);
 if(e.op!=='swap_positions'){
 field(ef,'数值参数（同名共享）',e.amount,v=>{e.amount=v;renderForm();},Object.fromEntries(Object.keys(params).map(k=>[k,k])));parameter(ef,'当前等级数值（减攻填负数）',s,ref.level,e.amount);button(eb,'使用独立数值',()=>{const key='value_'+Date.now();for(const p of Object.values(s.levels))p[key]=p[e.amount]??1;e.amount=key;touch();renderForm();});
 }
 }
 button(rb,'＋ 添加效果',()=>{const key='value_'+Date.now();for(const p of Object.values(s.levels))p[key]=1;r.effects.push({op:'heal',target:'self',amount:key,duration:null,zone:'battlefield',damage_type:null});touch();renderForm();});
 }
 button(box,'＋ 添加触发规则',()=>{const key='value_'+Date.now();for(const p of Object.values(s.levels))p[key]=1;s.rules.push({event:'unit_enter',subject:'self',effects:[{op:'heal',target:'self',amount:key,duration:null,zone:'battlefield',damage_type:null}]});touch();renderForm();});
 node('p',box,'生效区域：场上（自身离场例外） · 单实例 · 卸载移除监听和常驻能力','muted');
 }
}
function render(){renderList();renderForm();renderPreview();renderAssets();}
function renderAssets(){let host=document.getElementById('art-manager');if(!host){host=node('section',document.querySelector('main')||document.body,undefined,'panel');host.id='art-manager';}host.replaceChildren();node('h2',host,'美术资产库');node('p',host,'角色包含待机与攻击动画；卡牌只保存稳定ID引用。当前支持内置Spine骨骼、剑士、弓手与骑士序列帧与参数化像素特效。修改JSON可新增或复制资产定义，暂不支持上传外部Spine文件。');const input=node('textarea',host);input.style.cssText='width:100%;min-height:240px';input.setAttribute('aria-label','美术资产库JSON');input.value=JSON.stringify(assetLibrary(data),null,2);button(host,'应用资产库',()=>{const candidate=JSON.parse(input.value);const errors=artIssues({...data,art_assets:candidate});if(errors.length)throw Error(errors.join('；'));data.art_assets=candidate;touch();render();message('资产库已应用到草稿，请保存或导出。');});}

function save(){const errors=editorIssues(data);if(errors.length)throw Error('请先修复配置错误（可导出JSON保留草稿）：'+errors.join('；'));saveWorkspace(localStorage,{catalog:data,team});renderBackups();dirty=false;$('dirty').textContent='已保存到此浏览器';message('草稿已保存。可以继续编辑，或选择6张卡后试玩。');}
function adopt(next){const doc=normalizeDocument(next);const errors=editorIssues(doc.catalog);if(errors.length)throw Error(errors.join('\n'));if(!confirm('用导入配置替换当前编辑草稿？请先导出需要保留的修改。'))return;data=doc.catalog;team=doc.team;current=data.cards[0].card_id;touch();render();message('已导入到草稿，原文件未修改。请保存或生成新的发布版本。');}
function download(payload,name,type='application/json'){const blob=new Blob([typeof payload==='string'||payload instanceof Uint8Array?payload:JSON.stringify(payload,null,2)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderBackups(){const select=$('backup-list');select.replaceChildren();let list=[];try{list=JSON.parse(localStorage.getItem(HISTORY)||'[]');}catch{}for(let i=list.length-1;i>=0;i--){const option=node('option',select,new Date(list[i].at).toLocaleString());option.value=i;}select.disabled=!list.length;}
$('search').oninput=renderList;$('save').onclick=()=>{try{save();}catch(e){message('保存失败：'+e.message,true);}};
$('add-card').onclick=()=>{const c=makeCard(newId('custom_card',data.cards,'card_id'));data.cards.push(c);current=c.card_id;touch();render();};
$('copy-card').onclick=()=>{const c=structuredClone(card());c.card_id=newId('custom_card',data.cards,'card_id');c.name+=' · 副本';data.cards.push(c);for(const r of c.skills)forkSkill(data,c,r);current=c.card_id;touch();render();};
$('add-slot').onclick=()=>{card().slots.push({slot_id:newId('skill',card().slots,'slot_id'),type:'skill',capacity:1});touch();renderForm();};
$('export').onclick=()=>{download({catalog:data,team},'swaphero-draft.json');message('草稿JSON已导出，可在新版编辑器导入。');};
$('export-source').onclick=()=>{try{download(zipFiles(sourceFiles(data,team)),'swaphero-source.zip','application/zip');message('源文件ZIP已导出：manifest.json、cards/、skills/、teams/。可直接解压进项目content目录。');}catch(e){message(e.message,true);}};
$('export-release').onclick=()=>{try{const version=$('release-version').value.trim();const release=createRelease(data,team,version);download(release,version+'.json');message('游戏发布包已导出，需提交项目并部署后才影响正式游戏。');}catch(e){message('发布校验失败：'+e.message,true);}};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5_000_000)throw Error('配置文件应小于5MB');adopt(file.name.toLowerCase().endsWith('.zip')?importSourceFiles(unzipFiles(new Uint8Array(await file.arrayBuffer()))):JSON.parse(await file.text()));}catch(err){message('导入失败：'+err.message,true);}finally{e.target.value='';}};
$('recover').onclick=()=>{try{adopt(previousWorkspace(localStorage,Number($('backup-list').value)));}catch(e){message(e.message,true);}};
$('refresh-json').onclick=()=>{$('raw').value=JSON.stringify(data,null,2);};$('apply-json').onclick=()=>{try{adopt(JSON.parse($('raw').value));}catch(e){message('应用失败：'+e.message,true);}};
$('restore').onclick=()=>{if(!confirm('恢复官方初始配置？请先导出需要保留的修改。'))return;data=structuredClone(official);current=data.cards[0].card_id;team=data.cards.slice(0,6).map(c=>c.card_id);touch();render();message('已恢复到草稿，请保存。');};
$('play').onclick=()=>{try{const snapshot=makePlaySnapshot(data,team);save();localStorage.setItem(PLAY_KEY,JSON.stringify(snapshot));location.href='playtest.html';}catch(e){message('无法试玩：'+e.message,true);}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{official=await loadPublishedCatalog();data=structuredClone(official);try{const saved=loadWorkspace(localStorage);if(saved){data=saved.catalog;team=saved.team;message('已恢复工作区；旧版草稿会自动迁移，原始数据保留。');}}catch(e){message('工作区读取失败，原数据未覆盖：'+e.message,true);}if(!team.length)team=data.cards.slice(0,6).map(c=>c.card_id);current=data.cards[0].card_id;render();renderBackups();$('release-version').value=data.content_version||data.version;$('raw').value=JSON.stringify(data,null,2);}catch(e){message(e.message,true);}
