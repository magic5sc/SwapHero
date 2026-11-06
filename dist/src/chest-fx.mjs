import {clearFrame, composite, createFrame, createFx} from '../vendor/pixelfx/src/core/index.js';
import * as chestOpen from '../vendor/pixelfx/src/fx/pickups/chest-open.js';

const silverPalette=['#141722','#2d3448','#47536a','#687991','#92a4bb','#bacbe0','#e0eeff','#ffffff'];
const {duration,fps}=chestOpen.meta;
const frameStep=1/fps, lastFrame=Math.round(duration*fps);

export function mountChestFx(button, rare) {
 const canvas=document.createElement('canvas');
 const [width,height]=chestOpen.meta.size, [x,y]=chestOpen.meta.origin;
 canvas.width=width;
 canvas.height=height;
 canvas.className='loot-chest-fx';
 canvas.setAttribute('aria-hidden','true');
 const context=canvas.getContext('2d');
 if(!context)return null;
 const frame=createFrame(width,height), image=context.createImageData(width,height);
 const fx=createFx(chestOpen,rare?{x,y,palette:silverPalette}:{x,y});
 function draw(){
  clearFrame(frame);
  fx.draw(frame);
  composite(frame,image.data);
  context.putImageData(image,0,0);
 }
 draw();
 button.append(canvas);
 button.classList.add('has-chest-fx');

 return function play(){
  return new Promise((resolve,reject)=>{
   const start=performance.now();
   let renderedFrame=0;
   function tick(now){
    if(!button.isConnected){resolve();return;}
    const elapsed=Math.max(0,now-start)/1000;
    const nextFrame=Math.min(lastFrame,Math.floor(elapsed*fps));
    try{
     if(nextFrame>renderedFrame){
      // Match the gallery's sampling cadence. PixelFX substeps the simulation internally.
      while(renderedFrame<nextFrame){fx.update(frameStep);renderedFrame++;}
      draw();
     }
    }catch(error){reject(error);return;}
    if(renderedFrame===lastFrame)resolve();
    else requestAnimationFrame(tick);
   }
   requestAnimationFrame(tick);
  });
 };
}
