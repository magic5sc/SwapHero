export const timings={idle:[400,300,300,400,300,300],attack:[180,100,140,220,60,130,160,250]};
export const sequences={temple_swordsman:{folder:'temple-swordsman',timings},temple_archer:{folder:'temple-archer',timings:{idle:[400,300,300,400,300,300],attack:[150,140,180,260,80,130,180,200]}}};
export function frameAt(motion,elapsed,rig='temple_swordsman'){const times=sequences[rig].timings[motion],total=times.reduce((a,b)=>a+b,0);let t=motion==='idle'?elapsed%total:Math.min(elapsed,total-1);for(let i=0;i<times.length;i++){if(t<times[i])return i;t-=times[i];}return times.length-1;}
const states=new Map(),images={};let running=false;
export function mountSequence(node,rig='temple_swordsman'){
 if(!sequences[rig])throw new Error('Unsupported character sequence');
 node.dataset.sequence=rig;node.style.backgroundImage='none';
 const canvas=document.createElement('canvas');canvas.width=canvas.height=192;canvas.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated';node.append(canvas);
 if(!images[rig]){images[rig]={};for(const motion of ['idle','attack']){const im=new Image();im.src=new URL('../assets/characters/'+sequences[rig].folder+'/'+motion+'-sheet.png',import.meta.url);images[rig][motion]=im;}}
 if(!running){running=true;requestAnimationFrame(tick);}
}
function tick(now){requestAnimationFrame(tick);if(document.hidden)return;
 for(const node of document.querySelectorAll('[data-sequence]')){
  const rig=node.dataset.sequence,key=node.dataset.instance?rig+':'+node.dataset.instance:node;let s=states.get(key);if(!s){s={start:now,attack:false,until:0};states.set(key,s);}s.seen=now;
  const active=!!node.closest('.perform-attack');if(active&&!s.attack){s.start=now;s.until=now+sequences[rig].timings.attack.reduce((a,b)=>a+b,0);}s.attack=active;
  const motion=now<s.until?'attack':'idle',im=images[rig]?.[motion];if(!im?.complete||!im.naturalWidth)continue;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const index=reduce?0:frameAt(motion,now-s.start,rig);
  const c=node.querySelector('canvas'),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,192,192);ctx.drawImage(im,index*192,0,192,192,0,0,192,192);node.dataset.animation=motion;
 }
 for(const [key,s] of states)if(now-s.seen>10000)states.delete(key);
}
