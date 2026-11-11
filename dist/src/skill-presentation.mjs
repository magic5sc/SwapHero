import {createFrame,clearFrame,createFx,composite} from '../vendor/pixelfx/src/core/index.js';
import * as arrowRain from '../vendor/pixelfx/src/fx/projectiles/arrow-rain.js';
// Casting uses the existing archer's release frame; it never translates the card.
export const arrowRainCastMs=730;
const center=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
export function skillTarget(root,f){
 const slot=root.querySelector(`[data-side="${f.targetSide}"][data-slot="${f.targetPosition}"]`);
 if(!slot)return null;
 const sprite=f.targetId&&slot.dataset.unitId===f.targetId?slot.querySelector('.unit-sprite'):null;
 return {point:center(sprite||slot),scale:Math.max(.65,Math.min(1.2,slot.getBoundingClientRect().height/130))};
}
export async function playArrowRain(root,f,onImpact){
 const initial=skillTarget(root,f);if(!initial){onImpact();return;}
 const slotSelector=`[data-side="${f.targetSide}"][data-slot="${f.targetPosition}"]`,slotCenter=center(root.querySelector(slotSelector));
 const bodyOffset={x:initial.point.x-slotCenter.x,y:initial.point.y-slotCenter.y};
 const canvas=document.createElement('canvas');canvas.className='skill-arrow-rain';canvas.setAttribute('aria-hidden','true');
 canvas.dataset.source=f.source;canvas.dataset.target=f.targetId||'';
 const [width,height]=arrowRain.meta.size,[x,y]=arrowRain.meta.origin;
 canvas.width=width;canvas.height=height;
 canvas.style.cssText='position:fixed;pointer-events:none;z-index:100;image-rendering:pixelated;';
 const ctx=canvas.getContext('2d');if(!ctx){onImpact();return;}
 const frame=createFrame(width,height),rgba=ctx.createImageData(width,height),fx=createFx(arrowRain,{seed:17,x,y});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let hit=false,raf;
 const impact=()=>{if(!hit){hit=true;onImpact();}};
 try{
  await new Promise(resolve=>setTimeout(resolve,reduced?0:arrowRainCastMs));
  document.body.append(canvas);
  await new Promise(resolve=>{
   const start=performance.now();
   const tick=now=>{
    const elapsed=(now-start)/1000,t=reduced?arrowRain.timing.hit:Math.min(elapsed,arrowRain.meta.duration);
    if(elapsed>=(reduced?.16:arrowRain.meta.duration)){impact();resolve();return;}
    if(t>=arrowRain.timing.hit)impact();
    while(t-fx.t>1e-7)fx.update(Math.min(1/120,t-fx.t));
    clearFrame(frame);fx.draw(frame,'back');fx.draw(frame,'front');composite(frame,rgba.data);ctx.putImageData(rgba,0,0);
    // Re-measure to follow viewport changes. Defeated targets retain their last
    // body anchor, while an originally empty target uses its actual empty slot.
    const current=root.querySelector(slotSelector),target=skillTarget(root,f)||initial;
    if(f.targetId&&hit&&current?.dataset.unitId!==f.targetId&&current){const c=center(current);target.point={x:c.x+bodyOffset.x,y:c.y+bodyOffset.y};}
    const {point,scale}=target;
    canvas.style.left=`${point.x-x*scale}px`;canvas.style.top=`${point.y-y*scale}px`;
    canvas.style.width=`${width*scale}px`;canvas.style.height=`${height*scale}px`;
    raf=requestAnimationFrame(tick);
   };tick(start);
  });
 }finally{cancelAnimationFrame(raf);canvas.remove();}
}
