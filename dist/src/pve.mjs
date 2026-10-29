import {createUnit,validateCatalog} from './content.mjs';
import {generateMap,seeded,shuffle} from './pve-map.mjs';
import {validateFormation} from './formation.mjs';
const copy=x=>structuredClone(x);
const fail=msg=>{throw Error(msg);};
export const QUALITY={common:'普通',rare:'稀有',epic:'史诗',legendary:'传说'};
export function validatePack(p){const e=validateCatalog(p);if(e.length)fail(e.join('；'));if(!p.chapters?.[0]?.available||!p.config||!p.cards.some(c=>c.card_id===p.hero))fail('冒险内容包不完整');
 const c=p.config;for(const key of ['initialGold','combatGold','eliteGold','healPrice','revivePrice','upgradePrice','recruitPrice','skillPrice','healAmount','campActions'])if(!Number.isInteger(c[key])||c[key]<0)fail('经济配置无效');
 for(const key of ['unknownCombat','unknownShop'])if(!Number.isFinite(c[key])||c[key]<0||c[key]>1)fail('事件概率无效');
 for(const source of ['silver','gold'])if(!Array.isArray(c.weights?.[source])||c.weights[source].length!==4||c.weights[source].some(n=>!Number.isFinite(n)||n<=0))fail('宝箱权重无效');
 if(!Array.isArray(c.buffs)||c.buffs.some(b=>!QUALITY[b.quality]||!Number.isInteger(b.attack)||b.attack<0||!Number.isInteger(b.hp)||b.hp<0))fail('强化配置无效');
 if(!Array.isArray(p.recruits)||p.recruits.some(id=>!p.cards.some(c=>c.card_id===id)))fail('招募配置无效');
 if(p.chapters.some(c=>!Number.isInteger(c.layers)||c.layers<7||c.layers>30||typeof c.available!=='boolean'))fail('章节配置无效');
 for(const s of p.skills)if(!p.cards.some(c=>c.card_id===s.owner&&c.slots.some(slot=>slot.slot_id===s.slot))||!QUALITY[s.quality]||![1,2,3].every(l=>s.levels[l]))fail('冒险技能配置无效');return p;}
export function newRun(pack,seed=String(Date.now())){
 validatePack(pack);const hero=createUnit(pack,pack.hero,'hero');
 return {schemaVersion:1,contentVersion:pack.version,pack:copy(pack),seed:String(seed),chapter:0,status:'map',gold:pack.config.initialGold,team:[hero],departed:[],map:generateMap(seed,pack.chapters[0].layers),current:null,visited:[],room:null,battle:null,unknown:{combat:pack.config.unknownCombat,shop:pack.config.unknownShop},revision:0};
}
export const availableNodes=r=>r.current?r.map.nodes.find(n=>n.id===r.current).next:r.map.nodes.filter(n=>n.row===0).map(n=>n.id);
export const unitMax=u=>u.maxHp;
const rand=(r,suffix)=>seeded(`${r.seed}:${r.chapter}:${r.current}:${suffix}`);
const card=r=>id=>r.pack.cards.find(c=>c.card_id===id);
const skill=r=>id=>r.pack.skills.find(s=>s.skill_id===id);
const ownedSkills=r=>new Set([...r.team,...r.departed].flatMap(u=>u.skills.map(s=>s.definition.skill_id)));
export function candidates(r,source='silver'){
 const all=[],seen=new Set([...r.team,...r.departed].map(u=>u.cardId)),owned=ownedSkills(r);
 for(const id of r.pack.recruits){const c=card(r)(id);if(!seen.has(id)&&(!c.gold_only||source==='gold'))all.push({type:'character',id,quality:c.quality,name:c.name});}
 for(const s of r.pack.skills)if(r.team.some(u=>u.cardId===s.owner)&&!owned.has(s.skill_id)&&(!s.gold_only||source==='gold'))all.push({type:'skill',id:s.skill_id,quality:s.quality,name:s.name});
 for(const b of r.pack.config.buffs)if(!b.gold_only||source==='gold')all.push({type:'buff',id:b.id,quality:b.quality,name:b.name});
 return all;
}
export function rewardChoices(r,source){
 const rng=rand(r,'reward'),pool=candidates(r,source),chosen=[],weights=r.pack.config.weights[source];
 while(pool.length&&chosen.length<3){
  const groups=Object.keys(QUALITY).map((q,i)=>({q,w:pool.some(x=>x.quality===q)?weights[i]:0}));let roll=rng()*groups.reduce((n,g)=>n+g.w,0),quality=groups.find(g=>(roll-=g.w)<0)?.q||groups.find(g=>g.w)?.q;
  const eligible=pool.filter(x=>x.quality===quality),item=eligible[Math.floor(rng()*eligible.length)];chosen.push(item);pool.splice(pool.indexOf(item),1);
 }
 return chosen;
}
function snapshotUnit(u){const n=copy(u);n.attack=n.baseAttack;n.modifiers=[];n.disabled=false;return n;}
function encounter(r,type){
 const row=r.map.nodes.find(n=>n.id===r.current).row;
 const ids=type==='boss'?['test_boss','test_guard','test_guard']:type==='elite'?['test_elite','test_guard']:row<5?['test_scout']:row<10?['test_guard','test_scout']:['test_guard','test_guard','test_scout'];
 const units={},sides={player:{slots:Array(6).fill(null),score:0},ai:{slots:Array(6).fill(null),score:0}};
 r.team.filter(u=>u.hp>0).forEach((u,i)=>{units[u.id]=snapshotUnit(u);sides.player.slots[i]=u.id;});
 ids.forEach((id,i)=>{const uid=`enemy-${i+1}`;units[uid]=createUnit(r.pack,id,uid);sides.ai.slots[i]=uid;});
 return {mode:'pve',units,sides,victoryCondition:'elimination',phase:'deployment',turn:'player',actionPoints:0,winner:null,stack:[],trace:[],contentVersion:r.contentVersion,log:['PvE：消灭全部敌方单位；双方同时全灭玩家失败。'],nodeId:r.current};
}
export function enterNode(r,id){
 if(r.status!=='map'||!availableNodes(r).includes(id))fail('只能进入连线上的下一个节点');
 if(r.team.every(u=>u.hp<=0))fail('全队阵亡，本次冒险已结束');
 r.current=id;r.visited.push(id);const n=r.map.nodes.find(n=>n.id===id);let type=n.type;
 if(type==='event'){
  const rng=rand(r,'unknown'),roll=rng();const previous=r.room?.type;
  type=roll<r.unknown.combat?'combat':roll<r.unknown.combat+r.unknown.shop&&previous!=='shop'?'shop':'event';
  r.unknown.combat=type==='combat'?r.pack.config.unknownCombat:r.unknown.combat+r.pack.config.unknownCombat;
  r.unknown.shop=type==='shop'?r.pack.config.unknownShop:r.unknown.shop+r.pack.config.unknownShop;
 }
 r.room={type,nodeId:id,actions:r.pack.config.campActions,choices:[],bought:[],resolved:false};
 if(['combat','elite','boss'].includes(type)){r.status='battle';r.battle=encounter(r,type);}
 else {r.status='room';if(type==='shop'){
  const rng=rand(r,'shop'),pool=candidates(r,'gold');
  r.room.recruit=shuffle(pool.filter(x=>x.type==='character'),rng)[0]||null;
  r.room.goods=shuffle(pool.filter(x=>x.type==='skill'),rng).slice(0,3);
 }if(type==='event')r.room.event=['spring','wanderer','training'][Math.floor(rand(r,'event')()*3)];}
 r.revision++;return r;
}
export function finishBattle(r,battle){
 if(r.status!=='battle'||battle.nodeId!==r.current||!['player','ai'].includes(battle.winner)||battle.stack.length)fail('战斗尚未完成');
 for(const u of r.team){const result=battle.units[u.id];if(result)u.hp=Math.max(0,Math.min(u.maxHp,result.hp));}
 r.battle=null;r.revision++;
 if(battle.winner!=='player'||r.team.every(u=>u.hp<=0)){r.status='failed';r.room.resolved=true;return;}
 if(r.room.type==='boss'){
  for(const u of r.team)u.hp=u.maxHp;
  r.status='chapter_complete';r.room.resolved=true;return;
 }
 r.gold+=r.room.type==='elite'?r.pack.config.eliteGold:r.pack.config.combatGold;
 r.room.choices=rewardChoices(r,r.room.type==='elite'?'gold':'silver');r.status='reward';
}
export function continueChapter(r){
 if(r.status!=='chapter_complete')fail('尚未完成章节');
 const next=r.pack.chapters[r.chapter+1];
 if(!next?.available){r.status=next?'demo_complete':'completed';return;}
 r.chapter++;r.current=null;r.visited=[];r.room=null;r.map=generateMap(`${r.seed}:${r.chapter}`,next.layers);r.unknown={combat:r.pack.config.unknownCombat,shop:r.pack.config.unknownShop};r.status='map';
}
function applyReward(r,item,targetId,replaceId){
 if(!candidates(r,'gold').some(c=>c.type===item.type&&c.id===item.id))fail('该奖励已不在合法候选池');
 if(item.type==='character'){
  if(r.team.length>=6){const index=r.team.findIndex(u=>u.id===replaceId);if(index<0||r.team[index].cardId===r.pack.hero)fail('队伍已满，请选择非主角离队，或放弃招募');const u=r.team.splice(index,1)[0];u.hp=u.maxHp;r.departed.push(u);}
  r.team.push(createUnit(r.pack,item.id,item.id));
 }else if(item.type==='skill'){
  const s=skill(r)(item.id),u=r.team.find(u=>u.cardId===s.owner);if(!u||!u.slots.some(x=>x.slot_id===s.slot))fail('没有可装配该技能的角色');
  u.skills=u.skills.filter(b=>b.slotId!==s.slot);u.skills.push({slotId:s.slot,level:1,definition:copy(s)});
 }else{
  const u=r.team.find(u=>u.id===targetId),b=r.pack.config.buffs.find(b=>b.id===item.id);if(!u||!b)fail('请选择强化角色');u.baseAttack+=b.attack;u.attack=u.baseAttack;u.maxHp+=b.hp;u.growth??=[];u.growth.push(b.id);
 }
}
export function claimReward(r,index,{targetId,replaceId}={}){
 if(r.status!=='reward'||r.room.resolved)fail('奖励已领取或不在奖励阶段');
 if(index!==null){const item=r.room.choices[index];if(!item)fail('奖励不存在');applyReward(r,item,targetId,replaceId);}
 r.room.resolved=true;r.status='map';r.revision++;
}
function requireRoom(r){if(r.status!=='room'||r.room.resolved)fail('当前不能进行节点操作');}
export function buy(r,index,options={}){
 requireRoom(r);if(r.room.type!=='shop')fail('当前不在商店');
 const item=index==='recruit'?r.room.recruit:r.room.goods[index];if(!item||r.room.bought.includes(index))fail('商品已售出');
 const price=index==='recruit'?r.pack.config.recruitPrice:r.pack.config.skillPrice;if(r.gold<price)fail('金币不足');
 applyReward(r,item,options.targetId,options.replaceId);r.gold-=price;r.room.bought.push(index);r.revision++;
}
export function upgradePreview(binding){return {before:binding.definition.levels[binding.level],after:binding.definition.levels[binding.level+1]||null};}
export function service(r,action,targetId,slotId){
 requireRoom(r);const type=r.room.type,c=r.pack.config,u=r.team.find(u=>u.id===targetId);if(!u)fail('请选择队伍角色');
 if(!['shop','camp','event'].includes(type))fail('该节点不提供服务');
 if(type==='event'&&!((r.room.event==='spring'&&['heal','revive'].includes(action))||(r.room.event==='training'&&action==='upgrade')))fail('事件不提供该服务');
 if(type!=='shop'&&r.room.actions<=0)fail('本节点行动已用完');
 let binding;if(action==='heal'){if(u.hp<=0||u.hp>=u.maxHp)fail('仅可治疗受伤存活角色');}
 else if(action==='revive'){if(u.hp>0)fail('角色没有阵亡');}
 else if(action==='upgrade'){binding=u.skills.find(s=>s.slotId===slotId);if(!binding||binding.level>=3||!upgradePreview(binding).after)fail('技能无法继续升级');}
 else fail('未知服务');
 const price=type==='shop'?c[action+'Price']:0;if(r.gold<price)fail('金币不足');
 if(action==='heal')u.hp=Math.min(u.maxHp,u.hp+c.healAmount);
 if(action==='revive')u.hp=Math.min(u.maxHp,c.healAmount);
 if(action==='upgrade')binding.level++;
 r.gold-=price;if(type!=='shop')r.room.actions--;r.revision++;
}
export function eventRecruit(r,replaceId){requireRoom(r);if(r.room.event!=='wanderer'||r.room.actions<=0)fail('事件已处理');const item=candidates(r,'silver').find(c=>c.type==='character');if(!item)fail('没有合法招募角色');applyReward(r,item,null,replaceId);r.room.actions--;r.revision++;}
export function leaveRoom(r){requireRoom(r);r.room.resolved=true;r.status='map';r.revision++;}
export function abandonRun(r){if(['failed','completed','demo_complete'].includes(r.status))fail('冒险已经结束');r.status='abandoned';r.battle=null;r.revision++;}
export function validateRun(r){
 if(!r||r.schemaVersion!==1)fail('不支持的存档版本，原存档未修改');validatePack(r.pack);
 if(r.contentVersion!==r.pack.version||typeof r.seed!=='string'||!Number.isInteger(r.gold)||r.gold<0||!Number.isInteger(r.chapter)||!r.pack.chapters[r.chapter])fail('存档内容版本或进度损坏');
 if(!['map','room','reward','battle','failed','chapter_complete','demo_complete','completed','abandoned'].includes(r.status))fail('存档阶段无效');
 if(!Array.isArray(r.team)||r.team.length<1||r.team.length>6||!Array.isArray(r.departed)||!r.team.some(u=>u.cardId===r.pack.hero))fail('队伍存档无效');
 const ids=new Set(),cards=new Set(),skills=new Set();for(const u of [...r.team,...r.departed]){
  if(!u||ids.has(u.id)||cards.has(u.cardId)||!r.pack.cards.some(c=>c.card_id===u.cardId)||!Number.isInteger(u.hp)||!Number.isInteger(u.maxHp)||u.hp<0||u.hp>u.maxHp||u.maxHp<1||!Number.isInteger(u.baseAttack)||u.baseAttack<0)fail('角色存档无效');ids.add(u.id);cards.add(u.cardId);
  const slots=new Set();for(const b of u.skills){const s=skill(r)(b.definition?.skill_id);if(!s||s.owner!==u.cardId||slots.has(s.slot)||skills.has(s.skill_id)||b.slotId!==s.slot||![1,2,3].includes(b.level)||!s.levels[b.level]||JSON.stringify(b.definition)!==JSON.stringify(s))fail('技能存档无效');slots.add(s.slot);skills.add(s.skill_id);}
 }
 const expected=generateMap(r.chapter===0?r.seed:`${r.seed}:${r.chapter}`,r.pack.chapters[r.chapter].layers);if(JSON.stringify(expected)!==JSON.stringify(r.map))fail('地图存档损坏');
 let previous=null;for(const id of r.visited){if(!(previous?r.map.nodes.find(n=>n.id===previous)?.next:r.map.nodes.filter(n=>n.row===0).map(n=>n.id)).includes(id))fail('节点路线无效');previous=id;}if(previous!==r.current)fail('当前节点不匹配');
 if(['room','reward','battle','chapter_complete'].includes(r.status)&&r.room?.nodeId!==r.current)fail('节点状态不匹配');
 if(!Array.isArray(r.visited)||!r.unknown||!Number.isFinite(r.unknown.combat)||!Number.isFinite(r.unknown.shop))fail('冒险计数无效');
 if(['room','reward'].includes(r.status)){
  const room=r.room;if(typeof room.resolved!=='boolean'||room.resolved||!['combat','elite','boss','shop','camp','event'].includes(room.type))fail('节点状态无效');
  if(r.status==='reward'&&(!Array.isArray(room.choices)||room.choices.length>3||room.choices.some(item=>!candidates(r,'gold').some(c=>c.id===item.id&&c.type===item.type&&c.quality===item.quality))))fail('奖励存档无效');
  if(r.status==='room'&&(!Number.isInteger(room.actions)||room.actions<0||!Array.isArray(room.bought)))fail('服务存档无效');
  if(room.type==='shop'&&(!Array.isArray(room.goods)||room.goods.some(item=>!r.pack.skills.some(s=>s.skill_id===item.id))||(room.recruit&&!r.pack.recruits.includes(room.recruit.id))))fail('商店存档无效');
 }
 if(r.status==='battle'){
  const b=r.battle;if(!b||b.mode!=='pve'||b.nodeId!==r.current||b.victoryCondition!=='elimination'||!['deployment','action','finished','error'].includes(b.phase)||!['player','ai'].includes(b.turn)||!Number.isInteger(b.actionPoints)||b.actionPoints<0||b.actionPoints>2||b.stack?.length)fail('战斗断点无效');
  const seen=new Set();for(const side of ['player','ai']){validateFormation(b.sides[side].slots);for(const id of b.sides[side].slots.filter(Boolean)){const u=b.units[id];if(!u||seen.has(id)||!Number.isFinite(u.hp)||u.hp<=0||u.hp>u.maxHp)fail('战斗单位无效');if(side==='player'&&!r.team.some(t=>t.id===id))fail('战斗队伍不匹配');seen.add(id);}}
 }
 return r;
}
export function encodeRun(r){validateRun(r);return JSON.stringify({format:'swaphero-adventure',version:1,run:r});}
export function decodeRun(raw){if(typeof raw!=='string'||raw.length>3000000)fail('存档过大或格式错误');const data=JSON.parse(raw);if(data.format!=='swaphero-adventure'||data.version!==1)fail('不是支持的冒险存档');return validateRun(data.run);}
