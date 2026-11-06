import {clearFrame, composite, createFrame, createFx} from '../vendor/pixelfx/src/core/index.js';
import * as chestOpen from '../vendor/pixelfx/src/fx/pickups/chest-open.js';

const silverPalette=['#141722','#2d3448','#47536a','#687991','#92a4bb','#bacbe0','#e0eeff','#ffffff'];
const step=1/120, speed=1.5;

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

 return async function play(){
  await new Promise((resolve,reject)=>{
   const start=performance.now();
   let steps=0;
   function tick(now){
    if(!button.isConnected){resolve();return;}
    const time=Math.min(chestOpen.meta.duration,Math.max(0,now-start)*speed/1000);
    const next=Math.floor(time/step);
    try{
     if(next>steps){
      while(steps<next){fx.update(step);steps++;}
      draw();
     }
    }catch(error){reject(error);return;}
    if(time>=chestOpen.meta.duration)resolve();
    else requestAnimationFrame(tick);
   }
   requestAnimationFrame(tick);
  });
 };
}
