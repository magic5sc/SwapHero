import {unitBuffBadges} from './buff-display.mjs';
import {positionPopover} from './popover-position.mjs';
let pending=null,infoAnchor=null;
export function hideBuffInfo(){clearTimeout(pending?.timer);pending=null;infoAnchor?.removeAttribute('aria-describedby');infoAnchor=null;document.getElementById('buff-popover')?.remove();}
const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function showInfo(badge,anchor,onInspect,point){
 onInspect?.();hideBuffInfo();
 const tip=node('aside','buff-popover');tip.id='buff-popover';tip.setAttribute('role','tooltip');
 tip.append(node('strong','buff-name',badge.name));
 for(const line of badge.lines)tip.append(node('p','',line));
 document.body.append(tip);infoAnchor=anchor;anchor.setAttribute('aria-describedby',tip.id);
 positionPopover(tip,point,anchor);
}
export function createBuffBar(g,u,position,{onInspect,isLocked=()=>false}={}){
 const badges=unitBuffBadges(g,u,position);if(!badges.length)return null;
 const bar=node('span','buff-bar');bar.setAttribute('role','group');bar.setAttribute('aria-label','状态图标，可悬停或长按查看');
 for(const badge of badges){
  const mark=node('span','buff-icon'+(badge.active?'':' inactive'));mark.setAttribute('role','button');mark.tabIndex=0;mark.dataset.buffKey=badge.key;mark.setAttribute('aria-label',badge.name+'，悬停或长按查看详情');
  const img=node('img','');img.src=badge.icon;img.alt='';img.draggable=false;img.onerror=()=>{if(img.getAttribute('src')!==badge.fallback)img.src=badge.fallback;};mark.append(img);
  if(badge.count!==null)mark.append(node('span','buff-count',String(badge.count)));
  const open=point=>{if(!isLocked())showInfo(badge,mark,onInspect,point);};
  mark.onpointerenter=e=>{if(e.pointerType==='mouse')open(e);};
  mark.onpointerleave=e=>{if(e.pointerType==='mouse')hideBuffInfo();};
  mark.onpointerdown=e=>{
   e.stopPropagation();if(e.pointerType==='mouse'){e.preventDefault();open(e);return;}
   hideBuffInfo();onInspect?.();if(isLocked())return;
   const press={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:bar.scrollLeft,timer:null};pending=press;
   press.timer=setTimeout(()=>{if(pending===press)open({clientX:press.x,clientY:press.y});},500);
   mark.setPointerCapture(e.pointerId);
  };
  mark.onpointermove=e=>{if(pending&&pending.id===e.pointerId){const dx=e.clientX-pending.x;if(Math.hypot(dx,e.clientY-pending.y)>8){clearTimeout(pending.timer);bar.scrollLeft=pending.scroll-dx;document.getElementById('buff-popover')?.remove();}}else if(e.pointerType==='mouse'&&infoAnchor===mark){const tip=document.getElementById('buff-popover');if(tip)positionPopover(tip,e);}};
  mark.onpointerup=mark.onpointercancel=e=>{e.stopPropagation();clearTimeout(pending?.timer);pending=null;};
  mark.onclick=e=>{e.preventDefault();e.stopPropagation();};
  mark.onblur=hideBuffInfo;
  mark.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();open();}if(e.key==='Escape')hideBuffInfo();};
  bar.append(mark);
 }
 return bar;
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.buff-icon'))hideBuffInfo();},true);
document.addEventListener('contextmenu',e=>{if(e.target.closest('.buff-icon'))e.preventDefault();});
window.addEventListener('resize',hideBuffInfo);window.addEventListener('scroll',hideBuffInfo,true);
