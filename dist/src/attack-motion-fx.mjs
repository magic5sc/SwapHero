import {createFrame,clearFrame,createFx,composite} from '../vendor/pixelfx/src/core/index.js';
import * as slash from '../vendor/pixelfx/src/fx/melee/sword-slash.js';
// Existing PixelFX blade-tip anchor, also used by pixelfx-preview.mjs.
export const slashContact={x:6+38.4*Math.cos(.95)*Math.cos(-.38)-38.4*.6*Math.sin(.95)*Math.sin(-.38),y:-26+38.4*Math.cos(.95)*Math.sin(-.38)+38.4*.6*Math.sin(.95)*Math.cos(-.38)};
export const targetEffectAngle=(from,to,placement='target')=>placement==='self'?0:Math.atan2(to.y-from.y,to.x-from.x);
export const slashElapsed=(time,hitTime)=>time-(hitTime-.06);
export function createAttackSlash(canvas){
 const size=256,anchor=size/2,frame=createFrame(size,size),ctx=canvas.getContext('2d'),rgba=ctx.createImageData(size,size);
 canvas.width=canvas.height=size;
 let fx;
 const reset=()=>{fx=createFx(slash,{seed:12,x:anchor-slashContact.x,y:anchor-slashContact.y});};reset();
 return (elapsed,point,angle,scale,visible=true)=>{
  canvas.hidden=!visible||elapsed<0||elapsed>=slash.meta.duration;
  if(canvas.hidden)return;
  if(elapsed<fx.t)reset();
  while(elapsed-fx.t>1e-7)fx.update(Math.min(1/120,elapsed-fx.t));
  if(elapsed>fx.t)fx.update(elapsed-fx.t);
  clearFrame(frame);fx.draw(frame,'back');fx.draw(frame,'front');composite(frame,rgba.data);ctx.putImageData(rgba,0,0);
  // Rotate around the compensated blade tip, never the source character.
  canvas.style.cssText=`left:${point.x}px;top:${point.y}px;width:${size*scale}px;height:${size*scale}px;transform:translate(-50%,-50%) rotate(${angle}rad)`;
 };
}
