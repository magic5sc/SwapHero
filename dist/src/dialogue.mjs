// Serializable dialogue progress, independent of DOM and combat resolution.
export const dialogueAsset = value => !value || /^assets\/(?:[\w-]+\/)*[\w-]+\.(png|webp|jpg|svg)$/.test(value);
export function validateDialogues(pack){
 const all=pack.dialogues||[],ids=new Set();
 if(!Array.isArray(all))throw Error('对话配置无效');
 for(const d of all){
  if(!d||typeof d.id!=='string'||ids.has(d.id)||typeof d.skip!=='boolean'||!Array.isArray(d.lines)||!d.lines.length)throw Error('对话入口重复或缺少台词');
  ids.add(d.id);const orders=new Set();
  for(const l of d.lines){
   if(!Number.isSafeInteger(l.order)||l.order<0||orders.has(l.order)||typeof l.text!=='string'||!l.text.trim()||!['left','right'].includes(l.side)||!['','image','scene'].includes(l.backgroundAction)||!dialogueAsset(l.portrait)||!dialogueAsset(l.background)||((l.backgroundAction==='image')!==!!l.background)||l.character&&!pack.cards.some(c=>c.card_id===l.character))throw Error('对话 '+d.id+' 台词无效');
   orders.add(l.order);
  }
 }
 for(const c of pack.cards)if(!dialogueAsset(c.dialoguePortrait))throw Error('角色对话立绘无效');
 for(const [items,keys] of [[pack.chapters,['openingDialogue','endingDialogue']],[pack.nodes||[],['dialogue']],[pack.levels||[],['beforeDialogue','victoryDialogue','defeatDialogue']]])for(const item of items)for(const key of keys)if(item[key]&&!ids.has(item[key]))throw Error('未知对话 '+item[key]);
}
export const dialogueKey=(r,phase)=>`${r.chapter}:${phase==='opening'?'chapter':r.current}:${phase}`;
export function beginDialogue(r,id,phase){
 if(!id)return null;
 const key=dialogueKey(r,phase);r.dialogueProgress??={done:[],active:null};
 if(r.dialogueProgress.done.includes(key))return null;
 const d=r.pack.dialogues?.find(d=>d.id===id);if(!d)throw Error('未知对话 '+id);
 if(r.dialogueProgress.active){if(r.dialogueProgress.active.key!==key)throw Error('另一段对话尚未结束');return r.dialogueProgress.active;}
 return r.dialogueProgress.active={id,key,phase,index:0};
}
export function dialogueFrame(pack,active){
 const d=pack.dialogues.find(d=>d.id===active.id),lines=[...d.lines].sort((a,b)=>a.order-b.order),line=lines[active.index];
 let background='';for(const l of lines.slice(0,active.index+1)){if(l.backgroundAction==='image')background=l.background;if(l.backgroundAction==='scene')background='';}
 const character=pack.cards.find(c=>c.card_id===line.character);
 return {...line,background,name:line.name||character?.name||'',portrait:line.portrait||character?.dialoguePortrait||'',skip:d.skip,last:active.index===lines.length-1};
}
export function advanceDialogue(r,skip=false){
 const a=r.dialogueProgress?.active;if(!a)return;
 const frame=dialogueFrame(r.pack,a);if(skip&&!frame.skip)throw Error('本段不允许跳过');
 if(skip||frame.last){r.dialogueProgress.done.push(a.key);r.dialogueProgress.active=null;}else a.index++;
}
export function validateDialogueProgress(r){
 const p=r.dialogueProgress;if(p===undefined)return;
 if(!p||!Array.isArray(p.done)||p.done.some(k=>typeof k!=='string')||new Set(p.done).size!==p.done.length)throw Error('对话进度损坏');
 const a=p.active;if(!a)return;
 const d=r.pack.dialogues?.find(d=>d.id===a.id);
 if(!d||!['opening','node','before','victory','defeat','ending'].includes(a.phase)||a.key!==dialogueKey(r,a.phase)||p.done.includes(a.key)||!Number.isInteger(a.index)||a.index<0||a.index>=d.lines.length)throw Error('对话断点损坏');
 const expected={opening:r.pack.chapters[r.chapter].openingDialogue,node:r.room?.dialogue,before:r.pack.levels?.find(l=>l.id===r.battle?.levelId)?.beforeDialogue,victory:r.pack.levels?.find(l=>l.id===r.battle?.levelId)?.victoryDialogue,defeat:r.pack.levels?.find(l=>l.id===r.battle?.levelId)?.defeatDialogue,ending:r.pack.chapters[r.chapter].endingDialogue};
 if(expected[a.phase]!==a.id||a.phase==='opening'&&r.status!=='map'||['before','victory','defeat','ending'].includes(a.phase)&&r.status!=='battle')throw Error('对话接续阶段损坏');
 if(a.phase==='before'&&r.battle?.phase!=='deployment'||a.phase==='node'&&!['battle','room'].includes(r.status)||['victory','ending'].includes(a.phase)&&r.battle?.winner!=='player'||a.phase==='defeat'&&r.battle?.winner!=='ai'||a.phase==='ending'&&r.room?.type!=='boss')throw Error('对话触发时机损坏');
 if(a.scroll&&(!Number.isFinite(a.scroll.top)||!Number.isFinite(a.scroll.left)||a.scroll.top<0||a.scroll.left<0))throw Error('对话场景位置损坏');
}
