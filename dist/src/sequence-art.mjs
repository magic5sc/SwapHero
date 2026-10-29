export const timings={idle:[400,300,300,400,300,300],attack:[180,100,140,220,60,130,160,250]};
export function frameAt(motion,elapsed){const times=timings[motion],total=times.reduce((a,b)=>a+b,0);let t=motion==='idle'?elapsed%total:Math.min(elapsed,total-1);for(let i=0;i<times.length;i++){if(t<times[i])return i;t-=times[i];}return times.length-1;}
const states=new Map(),images={};let running=false;
export function mountSequence(node){
 node.dataset.sequence='temple_swordsman';node.style.backgroundImage='none';
 const canvas=document.createElement('canvas');canvas.width=canvas.height=192;canvas.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated';node.append(canvas);
 if(!running){running=true;for(const motion of ['idle','attack']){const im=new Image();im.src=new URL('../assets/characters/temple-swordsman/'+motion+'-sheet.png',import.meta.url);images[motion]=im;}requestAnimationFrame(tick);}
}
function tick(now){requestAnimationFrame(tick);if(document.hidden)return;
 for(const node of document.querySelectorAll('[data-sequence]')){
  const key=node.dataset.instance||node;let s=states.get(key);if(!s){s={start:now,attack:false,until:0};states.set(key,s);}s.seen=now;
  const active=!!node.closest('.perform-attack');if(active&&!s.attack){s.start=now;s.until=now+1240;}s.attack=active;
  const motion=now<s.until?'attack':'idle',im=images[motion];if(!im?.complete||!im.naturalWidth)continue;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const index=reduce?0:frameAt(motion,now-s.start);
  const c=node.querySelector('canvas'),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,192,192);ctx.drawImage(im,index*192,0,192,192,0,0,192,192);node.dataset.animation=motion;
 }
 for(const [key,s] of states)if(now-s.seen>10000)states.delete(key);
}
