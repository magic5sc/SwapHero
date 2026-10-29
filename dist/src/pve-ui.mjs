import {newRun,availableNodes,enterNode,finishBattle,continueChapter,claimReward,buy,service,eventRecruit,leaveRoom,abandonRun,upgradePreview,candidates,QUALITY,encodeRun,decodeRun} from './pve.mjs';
import {openAdventureBattle} from './app.mjs';
import {makeSprite,artForUnit} from './art.mjs';
const root=document.getElementById('adventure'),KEY='swaphero.adventure.v1';
let run=null,pack=null,notice='',storageError='',savedText=null;
const names={combat:'普通战斗',elite:'精英战斗',shop:'商店',event:'未知事件',camp:'营地',boss:'章节 Boss'};
const MAP_ART='assets/chapter-map/';
function mapIcon(parent,type){const image=el('img','map-icon',undefined,parent);image.src=MAP_ART+type+'.svg';image.alt='';image.draggable=false;return image;}
const el=(tag,cls,text,parent=root)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;parent.append(e);return e;};
function button(parent,text,fn,cls='',disabled=false){const b=el('button',cls,text,parent);b.type='button';b.disabled=disabled;b.onclick=()=>act(fn);return b;}
function save(){if(!run)return;try{const raw=encodeRun(run);if(raw!==savedText){localStorage.setItem(KEY,raw);savedText=raw;}storageError='';}catch(e){storageError='保存失败：'+e.message+'。请导出存档备份。';}}
function act(fn){try{notice='';fn();save();}catch(e){notice=e.message;}render();}
function begin(){if(run&&!['failed','demo_complete','completed','abandoned'].includes(run.status)&&!confirm('放弃当前冒险并开始新周目？可先导出存档。'))return;run=newRun(pack,document.getElementById('run-seed')?.value.trim()||String(Date.now()));save();render();}
function showBattle(){root.hidden=true;openAdventureBattle(run.battle,{onChange:b=>{run.battle=b;save();},onExit:b=>{run.battle=b;if(b.winner)finishBattle(run,b);save();document.getElementById('battle-screen').hidden=true;document.querySelector('.result-overlay')?.remove();root.hidden=false;render();}});}
function exportSave(){const blob=new Blob([encodeRun(run)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SwapHero-adventure.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importSave(){const f=document.createElement('input');f.type='file';f.accept='.json,application/json';f.onchange=async()=>{try{const file=f.files[0];if(!file)return;if(file.size>3000000)throw Error('存档超过3MB');const next=decodeRun(await file.text());if(run&&!confirm('用导入的冒险替换当前进度？'))return;run=next;save();notice='存档已恢复，使用存档内的内容版本。';render();}catch(e){notice='导入失败：'+e.message;render();}};f.click();}
function select(parent,items){const s=el('select','',undefined,parent);for(const [value,text] of items){const o=el('option','',text,s);o.value=value;}return s;}
function teamPanel(parent){
 const panel=el('section','pve-team',undefined,parent);el('h2','','远征队伍 '+run.team.length+' / 6',panel);
 el('p','muted','阵亡仍占队伍名额；节点间保留伤亡。',panel);
 const list=el('div','team-list',undefined,panel);
 for(const u of run.team){const box=el('article','pve-unit'+(u.hp===0?' fallen':''),undefined,list);box.append(makeSprite('pve-portrait',artForUnit(u)));el('h3','',u.name,box);el('small','',u.cardId===run.pack.hero?'主角 · 不可离队':u.hp===0?'已阵亡':'队友',box);el('p','',`⚔ ${u.baseAttack}　♥ ${u.hp} / ${u.maxHp}`,box);const hp=el('div','pve-health',undefined,box);hp.setAttribute('role','meter');hp.setAttribute('aria-label',u.name+'生命');hp.setAttribute('aria-valuemin','0');hp.setAttribute('aria-valuemax',String(u.maxHp));hp.setAttribute('aria-valuenow',String(u.hp));el('span','',undefined,hp).style.width=Math.max(0,Math.min(100,u.hp/u.maxHp*100))+'%';for(const s of u.skills)el('p','skill-tag',`${s.definition.name} Lv.${s.level} · ${s.definition.levels[s.level].amount}`,box);}
 if(run.departed.length){const d=el('details','',undefined,panel);el('summary','',`离队档案 · ${run.departed.length} 人`,d);for(const u of run.departed)el('p','',`${u.name} · ${u.hp}/${u.maxHp} · 保留技能和强化，本期不可换回`,d);}
}
function mapPanel(parent){
 const section=el('section','map-panel',undefined,parent);
 const heading=el('div','atlas-heading',undefined,section);el('small','atlas-kicker','EXPEDITION ATLAS',heading);el('h2','',run.pack.chapters[run.chapter].name,heading);
 el('p','muted','沿航图向上探索，选择亮起的下一站。',heading);
 const controls=el('div','atlas-controls',undefined,section);el('span','route-status-key','◇ 当前位置　◉ 可前往　✓ 已探索',controls);
 const scroller=el('div','map-scroll',undefined,section);scroller.tabIndex=0;scroller.setAttribute('aria-label','章节航图，可滚动查看全部路线');
 const map=el('div','route-map',undefined,scroller),step=102,height=(run.map.layers+1)*step+92;map.style.height=height+'px';
 const x=n=>110+n.col*80,y=n=>height-n.row*step-70;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 700 ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('route-lines');svg.setAttribute('aria-hidden','true');map.append(svg);
 const available=availableNodes(run);
 for(const n of run.map.nodes)for(const id of n.next){const to=run.map.nodes.find(x=>x.id===id),line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',String(x(n)));line.setAttribute('y1',String(y(n)));line.setAttribute('x2',String(x(to)));line.setAttribute('y2',String(y(to)));if(run.visited.includes(n.id)&&run.visited.includes(id))line.classList.add('travelled');else if(n.id===run.current&&available.includes(id))line.classList.add('reachable');svg.append(line);}
 for(const n of run.map.nodes){const active=run.status==='map'&&available.includes(n.id),current=run.current===n.id,visited=run.visited.includes(n.id),b=button(map,'',()=>{enterNode(run,n.id);if(run.status==='battle')showBattle();},'map-node '+n.type+(active?' available':'')+(visited?' visited':'')+(current?' current':''),!active);b.style.left=`${x(n)/700*100}%`;b.style.top=y(n)+'px';mapIcon(b,n.type);b.title=`第${n.row+1}层 · ${names[n.type]}`;b.setAttribute('aria-label',b.title+(current?'，当前位置':active?'，可前往':visited?'，已探索':'，未到达'));if(current)b.setAttribute('aria-current','step');el('span','node-label',names[n.type],b);}
 const compass=el('img','atlas-compass',undefined,map);compass.src=MAP_ART+'compass.svg';compass.alt='';
 const focusCurrent=()=>{const n=run.map.nodes.find(n=>n.id===run.current);scroller.scrollTop=y(n||{row:0})-scroller.clientHeight*.75;};
 button(controls,'定位当前路线',focusCurrent,'atlas-locate');
 const legend=el('div','map-legend',undefined,section);for(const t of Object.keys(names)){const item=el('span','legend-item',undefined,legend);mapIcon(item,t);el('span','',names[t],item);}
 requestAnimationFrame(focusCurrent);
}
function rewardDescription(item){if(item.type==='character'){const c=run.pack.cards.find(c=>c.card_id===item.id);return `加入队伍 · 攻击 ${c.attack} / 生命 ${c.health}`;}if(item.type==='skill'){const s=run.pack.skills.find(s=>s.skill_id===item.id),u=run.team.find(u=>u.cardId===s.owner),old=u?.skills.find(b=>b.slotId===s.slot);const effect=s.rules[0].effects[0];return `${u?.name} · ${{attack_declared:'攻击时',unit_enter:'入场时',unit_leave:'离场时'}[s.slot]} · ${{deal_damage:effect.target==='all_enemies'?'所有敌方场上单位技能伤害':'对位技能伤害',heal:'治疗自己',modify_attack:'本回合加攻'}[effect.op]} ${s.levels[1].amount}${old?'；替换并弃置「'+old.definition.name+'」':''}`;}const b=run.pack.config.buffs.find(b=>b.id===item.id);return `本周目永久强化：攻击 +${b.attack} / 最大生命 +${b.hp}（不回复生命）`;}
function rewardCard(parent,item,onClaim,price,disabled=false){const card=el('article','reward-card quality-'+item.quality,undefined,parent);el('small','quality',QUALITY[item.quality]+' · '+{character:'角色',skill:'技能',buff:'数值强化'}[item.type],card);el('h3','',item.name,card);el('p','',rewardDescription(item),card);let target=null,replacement=null;
 if(item.type==='buff')target=select(card,run.team.map(u=>[u.id,u.name]));
 if(item.type==='character'&&run.team.length===6){el('p','muted','队伍已满：选择离队者，成长保留并满血复活。',card);replacement=select(card,[['','选择离队角色'],...run.team.filter(u=>u.cardId!==run.pack.hero).map(u=>[u.id,u.name])]);}
 button(card,disabled?'已售出':price?`购买 · ${price} 金币`:'选择奖励',()=>{if(item.type==='skill'&&run.team.some(u=>u.skills.some(b=>b.slotId===run.pack.skills.find(s=>s.skill_id===item.id).slot)&&u.cardId===run.pack.skills.find(s=>s.skill_id===item.id).owner)&&!confirm('替换后原技能直接弃置，是否继续？'))return;onClaim({targetId:target?.value,replaceId:replacement?.value});},'primary',disabled||!!price&&run.gold<price);
}
function services(parent){const type=run.room.type,c=run.pack.config;el('h3','','治疗、复活与技能升级',parent);if(type!=='shop')el('p','muted',`剩余行动 ${run.room.actions}；每次服务消耗 1 行动`,parent);
 const target=select(parent,run.team.map(u=>[u.id,`${u.name} · ${u.hp}/${u.maxHp}`]));
 const controls=el('div','service-buttons',undefined,parent);
 for(const action of ['heal','revive'])if(type!=='event'||run.room.event==='spring')button(controls,(action==='heal'?'治疗':'复活')+` ${c.healAmount} 生命`+(type==='shop'?` · ${c[action+'Price']} 金币`:''),()=>service(run,action,target.value),'',type!=='shop'&&run.room.actions===0);
 if(type!=='event'||run.room.event==='training')for(const u of run.team)for(const s of u.skills){const change=upgradePreview(s);if(!change.after)continue;const row=el('div','upgrade-row',undefined,parent);el('p','',`${u.name} · ${s.definition.name} Lv.${s.level} → ${s.level+1}　效果数值 ${change.before.amount} → ${change.after.amount}`,row);button(row,type==='shop'?`升级 · ${c.upgradePrice} 金币`:'升级 · 1 行动',()=>service(run,'upgrade',u.id,s.slotId),'',type!=='shop'&&run.room.actions===0);}
}
function roomPanel(parent){const box=el('section','room-panel',undefined,parent),room=run.room;
 if(run.status==='reward'){el('h2','',room.type==='elite'?'金色宝箱 · 三选一':'银色宝箱 · 三选一',box);el('p','muted','奖励已固定，刷新不会重抽。选择一项，或放弃本次奖励。',box);if(room.type==='elite')el('p','muted','本版本暂不提供神器奖励。',box);const grid=el('div','reward-grid',undefined,box);room.choices.forEach((item,i)=>rewardCard(grid,item,options=>claimReward(run,i,options)));button(box,'放弃奖励，继续选路',()=>claimReward(run,null),'ghost');return;}
 if(run.status==='battle'){el('h2','','战斗进行中',box);el('p','','当前战斗已保存，可以继续。若对局无法推进，可保存退出或自行放弃本次冒险。',box);button(box,'继续战斗',showBattle,'primary');return;}
 if(run.status==='chapter_complete'){el('h2','','第一章完成！',box);el('p','','全队已复活并恢复满生命。你已击败本章 Boss。',box);button(box,'查看单章结算',()=>continueChapter(run),'primary');return;}
 if(['failed','demo_complete','completed','abandoned'].includes(run.status)){el('h2','',run.status==='failed'?'远征失败':run.status==='abandoned'?'已结束本次远征':'单章体验完成',box);el('p','',run.status==='failed'?'全队阵亡，本次冒险结束。双方同时全灭也判玩家失败。':run.status==='abandoned'?'本次进度保留，可导出回看。':'第二、三章尚未开放。这是单章完成，不是三章通关。',box);el('p','',`已探索 ${run.visited.length} 个节点 · 剩余 ${run.gold} 金币`,box);el('p','muted','局间养成尚未开放；本版本不带出资源或永久属性。',box);button(box,'开始新的远征',begin,'primary');return;}
 if(run.status!=='room')return;
 el('h2','',names[room.type],box);
 if(room.type==='shop'){
  el('h3','','招募栏',box);if(room.recruit)rewardCard(box,room.recruit,o=>buy(run,'recruit',o),run.pack.config.recruitPrice,room.bought.includes('recruit'));else el('p','','没有符合条件的新角色（离队角色本期不返池）。',box);
  const grid=el('div','reward-grid',undefined,box);room.goods.forEach((item,i)=>rewardCard(grid,item,o=>buy(run,i,o),run.pack.config.skillPrice,room.bought.includes(i)));services(box);
 }else if(room.type==='camp'){el('p','','在风声与篝火旁停留片刻，选择一次休整。',box);services(box);}
 else if(room.event==='wanderer'){
  el('h3','','岔路上的旅人',box);el('p','','一位旅人愿意加入远征，你也可以独自继续。',box);const item=candidates(run,'silver').find(x=>x.type==='character');if(item&&room.actions>0)rewardCard(box,item,o=>eventRecruit(run,o.replaceId));else el('p','','此处已无可招募的旅人。',box);
 }else{el('h3','',room.event==='spring'?'遗迹清泉':'旧日训练场',box);services(box);}
 button(box,'离开，继续选路',()=>leaveRoom(run),'primary');
}
function render(){
 root.replaceChildren();const header=el('header','pve-header');const title=el('div','',undefined,header);el('small','eyebrow','SWAPHERO · 浮岛远征',title);el('h1','','每一次换位，都是新的旅途',title);el('p','muted','冒险航图 · 单章测试版 0.5.2',title);
 const nav=el('nav','',undefined,header);if(run){button(nav,'导出存档',exportSave);button(nav,'新周目',begin);}button(nav,'导入存档',importSave);const link=el('a','ghost','单场对战',nav);link.href='duel.html';
 if(notice||storageError)el('p','pve-alert',notice||storageError);
 if(!pack){el('p','pve-alert','正在读取冒险内容……');return;}
 if(!run){const hero=el('section','adventure-start');el('span','chapter-badge','CHAPTER 01',hero);el('h2','','浮岛遗迹',hero);el('p','','一位主角启程，沿分岔路线寻找伙伴与力量，抵达遗迹深处。',hero);el('p','','战斗之间伤亡保留，谨慎选择下一站。',hero);const label=el('label','','地图种子（可留空）',hero),input=el('input','',undefined,label);input.id='run-seed';input.placeholder='输入种子可重现路线';button(hero,'开始远征',begin,'primary');const note=el('details','',undefined,hero);el('summary','','本版本内容与规则',note);el('p','','使用独立测试角色与数值；3战场＋3备战，单主角开局，最多6人。普通/精英宝箱三选一，商店、事件、营地可招募、恢复和升级。全灭失败；章末全队恢复。神器、局间养成及后两章未开放。',note);return;}
 const status=el('div','expedition-status');el('strong','',run.pack.chapters[run.chapter].name,status);el('span','',`金币 ${run.gold}`,status);el('span','',`路线 ${run.visited.length} / ${run.map.layers+1}`,status);el('small','',`种子 ${run.seed}`,status);
 const layout=el('div','expedition-layout');const main=el('div','expedition-main',undefined,layout);if(run.status!=='map')roomPanel(main);mapPanel(main);teamPanel(layout);
 const footer=el('footer','pve-footer');el('p','muted','测试配置：宝箱混合池三选一，可跳过；营地一次行动；离队角色不返池。存档保存在当前浏览器，可导出后跨设备导入。',footer);button(footer,'局间养成（尚未开放）',()=>{notice='局间养成仅保留入口，资源带出和永久升级规则待定。';},'ghost');
 if(!['failed','demo_complete','completed','abandoned'].includes(run.status))button(footer,'放弃本次远征',()=>{if(confirm('确认放弃本次远征？不会自动获得胜利或资源带出。'))abandonRun(run);},'ghost');
}
try{const response=await fetch('data/pve-test.json');if(!response.ok)throw Error('内容加载失败');pack=await response.json();try{const raw=localStorage.getItem(KEY);if(raw){run=decodeRun(raw);savedText=raw;}}catch(e){notice='原存档未被覆盖：'+e.message;}}catch(e){notice=e.message;}
render();
