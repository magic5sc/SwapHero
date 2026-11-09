import {createAttackSlash,targetEffectAngle} from './attack-motion-fx.mjs';
// Presentation only: the caller supplies the settled frame's target lane.
export function attackVector(from,to){const dx=to.x-from.x,dy=to.y-from.y,d=Math.hypot(dx,dy);const length=Math.min(80,d*.32);return {x:d?dx/d*length:0,y:d?dy/d*length:0};}
export const usesDirectionalSlash=effect=>!effect||effect.preset==='slash';
const center=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
export function prepareNormalAttack(root,{side,lane,targetLane,attackMs,impactMs,attackEffect}){
 const attacker=root.querySelector(`[data-side="${side}"][data-slot="${lane}"]`),targetSide=side==='player'?'ai':'player';
 const target=root.querySelector(`[data-side="${targetSide}"][data-slot="${targetLane}"]`),sprite=attacker?.querySelector('.unit-sprite');
 if(!sprite||!target)return {impact(){},dispose(){}};
 const from=center(attacker),to=center(target),delta=attackVector(from,to),angle=targetEffectAngle(from,to),total=attackMs+impactMs;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Individual translate leaves the sprite renderer's own orientation untouched.
 const animation=!reduced?sprite.animate([{translate:'0px 0px',offset:0},{translate:'0px 0px',offset:attackMs*.25/total},{translate:`${delta.x}px ${delta.y}px`,offset:attackMs/total},{translate:'0px 0px',offset:(attackMs+impactMs*.65)/total},{translate:'0px 0px',offset:1}],{duration:total,easing:'ease-in-out'}):null;
 const oldZ=attacker.style.zIndex;attacker.style.zIndex='20';
 const targetSprite=target.querySelector('.unit-sprite'),fallback=center(targetSprite||target),targetId=target.dataset.unitId;
 let canvas,raf,disposed=false;
 const dispose=()=>{disposed=true;cancelAnimationFrame(raf);animation?.cancel();attacker.style.zIndex=oldZ;canvas?.remove();};
 return {dispose,impact(hit){
  if(!hit||!usesDirectionalSlash(attackEffect))return;
  canvas=document.createElement('canvas');canvas.className='normal-attack-slash';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
  const draw=createAttackSlash(canvas),start=performance.now(),scale=Math.max(.65,Math.min(1.2,target.getBoundingClientRect().height/130));
  const tick=now=>{if(disposed)return;const elapsed=now-start;if(elapsed>=impactMs){canvas.remove();return;}
   const current=root.querySelector(`[data-side="${targetSide}"][data-slot="${targetLane}"]`),live=current?.dataset.unitId===targetId?current.querySelector('.unit-sprite'):null;
   draw(reduced?.1:.06+elapsed/impactMs*.69,live?center(live):fallback,angle,scale);
   raf=requestAnimationFrame(tick);
  };tick(start);
 }};
}
