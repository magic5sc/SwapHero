import {beginDialogue,dialogueFrame,advanceDialogue} from './dialogue.mjs';
let activePlayer=false;
export const isDialoguePlaying=()=>activePlayer;
export async function playDialogue(id,{run,phase,save=()=>{},restored=false}={}){
 if(!beginDialogue(run,id,phase))return;
 if(activePlayer)throw Error('对话播放器正在使用');
 activePlayer=true;
 const scroller=document.querySelector('#adventure .map-scroll');
 if(scroller){const a=run.dialogueProgress.active;if(restored&&a.scroll){await new Promise(requestAnimationFrame);scroller.scrollTop=a.scroll.top;scroller.scrollLeft=a.scroll.left;}else a.scroll={top:scroller.scrollTop,left:scroller.scrollLeft};}
 save();
 const overlay=document.createElement('dialog');overlay.className='dialogue-overlay';overlay.tabIndex=-1;overlay.setAttribute('aria-label','角色对话');
 const bg=document.createElement('img');bg.className='dialogue-background';bg.alt='';
 const portrait=document.createElement('img');portrait.className='dialogue-portrait';portrait.alt='';
 const box=document.createElement('section');box.className='dialogue-box';
 const name=document.createElement('div');name.className='dialogue-name';
 const text=document.createElement('p');text.className='dialogue-text';text.setAttribute('aria-live','polite');
 const next=document.createElement('button');next.className='dialogue-next';next.textContent='继续 ▸';
 const skip=document.createElement('button');skip.className='dialogue-skip';skip.textContent='跳过对话';
 box.append(name,text,next);overlay.append(bg,portrait,box,skip);document.body.append(overlay);
 const previousFocus=document.activeElement,locks=[...document.body.children].filter(e=>e!==overlay&&e.tagName!=='SCRIPT').map(e=>[e,e.inert]);locks.forEach(([e])=>e.inert=true);
 let timer=null,complete=false,frame,chars=[],shown=0;
 function fill(){clearInterval(timer);text.textContent=frame.text;complete=true;next.hidden=false;}
 function show(full=false){
  clearInterval(timer);frame=dialogueFrame(run.pack,run.dialogueProgress.active);
  overlay.dataset.side=frame.side;bg.hidden=!frame.background;if(frame.background&&bg.getAttribute('src')!==frame.background)bg.src=frame.background;
  portrait.hidden=!frame.portrait;if(frame.portrait&&portrait.getAttribute('src')!==frame.portrait)portrait.src=frame.portrait;
  name.hidden=!frame.name;name.textContent=frame.name;skip.hidden=!frame.skip;
  chars=Array.from(frame.text);shown=0;text.textContent='';complete=false;next.hidden=true;
  if(full||matchMedia('(prefers-reduced-motion: reduce)').matches)fill();else timer=setInterval(()=>{text.textContent=chars.slice(0,++shown).join('');if(shown>=chars.length)fill();},28);
 }
 try{await new Promise(resolve=>{
  const advance=(e,skipping=false)=>{e.preventDefault();e.stopPropagation();if(e.repeat)return;if(skipping||complete){advanceDialogue(run,skipping);save();if(!run.dialogueProgress.active){resolve();return;}show();}else fill();};
  overlay.onclick=e=>{if(e.target===skip)advance(e,true);else advance(e);};
  overlay.onkeydown=e=>{if([' ','Enter'].includes(e.key))advance(e,e.target===skip);};
  overlay.oncancel=e=>e.preventDefault();overlay.oncontextmenu=e=>e.preventDefault();
  show(restored);overlay.showModal();overlay.focus({preventScroll:true});
 });}finally{
  clearInterval(timer);
  // Retain the modal through the closing input and rapid follow-up clicks.
  overlay.onclick=e=>{e.preventDefault();e.stopPropagation();};overlay.onkeydown=e=>{e.preventDefault();e.stopPropagation();};
  await new Promise(resolve=>setTimeout(resolve,250));overlay.close();overlay.remove();locks.forEach(([e,value])=>e.inert=value);activePlayer=false;
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
}
