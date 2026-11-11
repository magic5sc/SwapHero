// Original SwapHero arrow volley; PixelFX painter and seeded random helper: MIT.
// Reference choreography: projectiles/arrow and arcane/star-fall; no sprite images.
import { fit, Rng, sparkle } from '../../core/index.js';
export const timing = { release: 0, hit: .38, lastHit: .56, end: 1.25 };
export const meta = {
 name:'Arrow rain', desc:'A tight fan of seven steel-tipped arrows falls onto one target, with brief golden impact sparks.',
 tags:['arrow','rain','bow','impact','one-shot'], size:[128,160], origin:[78,120],
 duration:timing.end, loop:false, fps:30, bg:'dark',
 options:{palette:['#3a2418','#895a32','#c59b54','#b3d4e7','#ffffff'],seed:19}
};
const clamp=x=>Math.max(0,Math.min(1,x));
function arrow(p,x,y,C,a){
 // Tip points down and right, shaft and paired feather barbs remain recognisable at 1x.
 p.line(x-8,y-22,x-1,y-3,C[1],a);
 p.line(x-7,y-22,x,y-3,C[2],a);
 p.poly([[x,y],[x-5,y-6],[x-1,y-5],[x+1,y-9]],C[3],a);
 p.line(x,y,x-1,y-5,C[4],a);
 p.line(x-8,y-20,x-13,y-22,C[3],a);p.line(x-7,y-18,x-12,y-20,C[2],a);
 p.line(x-7,y-20,x-5,y-25,C[3],a);p.line(x-6,y-18,x-4,y-23,C[2],a);
}
export function draw(p,t,o){
 if(t<0||t>=timing.end)return;
 const C=fit(o.palette,5),R=new Rng(o.seed);
 for(let i=0;i<7;i++){
  const x=i===0?0:([-18,6,-6,18,-12,12][i-1]+R.range(-2,2)),y=i===0?0:R.range(-7,7),hit=timing.hit+i*.03,h=72+R.range(-6,6);
  const sparks=Array.from({length:5},()=>({angle:R.range(-Math.PI,0),speed:R.range(25,65)}));
  const q=clamp((t-i*.03)/timing.hit),e=q*q;
  if(t>=i*.03&&t<hit){const ax=x-(1-e)*h*.34,ay=y-(1-e)*h;arrow(p,ax,ay,C,clamp(q*5));p.line(ax-10,ay-28,ax-13,ay-37,C[3],.35*q);}
  const age=t-hit;
  if(age>=0&&age<.48){
   const a=Math.pow(1-age/.48,1.6);
   arrow(p,x,y,C,a);
   if(age<.08)sparkle(p,x,y,7*(1-age/.08),C[4],C[2],1-age/.08);
   p.glow(x,y,12,C[2],.22*a*a);
   p.disc(x,y+2,2+age*8,C[1],.16*a);
   for(let j=0;j<5;j++){
    const {angle,speed}=sparks[j],d=speed*age;
    const sx=x+Math.cos(angle)*d,sy=y+Math.sin(angle)*d+65*age*age;
    p.line(sx,sy,sx-Math.cos(angle)*2,sy-Math.sin(angle)*2,C[2],a);p.dot(sx,sy,C[4],a);
   }
  }
 }
}
