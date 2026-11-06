// Original SwapHero effect. PixelFX painter and random helper: MIT.
import { fit, Rng, TAU, sparkle } from '../../core/index.js';
export const timing = { release: .45, hit: 1.1, end: 2.8 };
export const meta = {
 name:'Spiral photon spear', desc:'Double helix light spear and photon starburst.',
 tags:['holy','spear','spiral','photon','one-shot'], size:[192,256], origin:[96,185],
 duration:timing.end, loop:false, fps:30, bg:'dark',
 options:{palette:['#12324d','#186e91','#28b8cd','#75eaff','#d2fcff','#ffffff'],seed:17,distance:100}
};
const sat=x=>Math.max(0,Math.min(1,x));
export function draw(p,t,o){
 if(t<0||t>=timing.end)return;
 const C=fit(o.palette,6), R=new Rng(o.seed), {hit,release}=timing;
 if(t<release){
  const q=t/release,r=19*(1-q)+3;
  p.ring(0,0,r,1,C[3],q);p.glow(0,0,22,C[2],q*.35);
  for(let i=0;i<8;i++){const a=i*TAU/8+t*4;p.line(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*(r+3),Math.sin(a)*(r+3),C[4],q);}
  sparkle(p,0,0,5*q,C[5],C[3],q);
 }
 if(t>=release&&t<hit){
  const u=(t-release)/(hit-release),y=-o.distance*u,L=48,fade=sat((t-release)/.06);
  // Receding spiral halves are behind the shaft; near halves cross its white core.
  for(let pass=0;pass<2;pass++){
   if(pass===1){
    p.beam(0,y+8,0,y+L,2,C[3],fade);p.line(0,y+3,0,y+L-5,C[5],fade);
    p.poly([[0,y],[-6,y+14],[0,y+10],[6,y+14]],C[4],fade);p.line(0,y+1,0,y+10,C[5],fade);
   }
   for(let strand=0;strand<2;strand++)for(let j=9;j<L;j++){
    const a=j*.35-t*21+strand*Math.PI,b=(j+1)*.35-t*21+strand*Math.PI;
    if((Math.cos(a)>0?1:0)!==pass)continue;
    const radius=9*Math.sin(Math.PI*(j-5)/(L+5));
    p.line(Math.sin(a)*radius,y+j,Math.sin(b)*radius,y+j+1,C[pass?4:2],fade);
   }
  }
  p.glow(0,y+15,19,C[2],.35*fade);
  for(let i=0;i<14;i++){const age=(u*2+i/14)%1,x=R.range(-6,6);p.dot(x,y+L+age*15,C[3],(1-age)*fade);}
 }
 const e=t-hit;
 if(e>=0){
  const k=sat(1-e/1.45),fast=1-Math.exp(-e*8),y=-o.distance;
  p.glow(0,y,42,C[2],.75*k*k);
  if(e<.09){sparkle(p,0,y,27*(1-e/.12),C[5],C[3],1);p.circle(0,y,5,C[5]);}
  if(e<.26){for(let i=0;i<8;i++){const a=i*TAU/8+.17, r=8+36*(1-Math.exp(-e*22));p.beam(Math.cos(a)*r*.25,y+Math.sin(a)*r*.25,Math.cos(a)*r,y+Math.sin(a)*r,2,C[4],1-e/.26);}}
  if(e<.8){p.ring(0,y,4+46*fast,1.5,C[3],Math.pow(1-e/.8,1.3));p.glowRing(0,y,4+46*fast,5,C[2],.25*(1-e/.8));}
  for(let i=0;i<42;i++){
   const a=R.range(0,TAU),speed=R.range(70,165),life=R.range(.45,1.45),delay=R.range(0,.08),age=e-delay;
   if(age<0||age>=life)continue;
   const d=speed*(1-Math.exp(-age*3))/3,x=Math.cos(a)*d,py=y+Math.sin(a)*d,alpha=Math.pow(1-age/life,1.5),tail=2+7*Math.exp(-age*7);
   p.line(x,py,x-Math.cos(a)*tail,py-Math.sin(a)*tail,C[2],alpha);
   p.dot(x,py,C[4],alpha);p.light(x,py,C[3],alpha*.5);
   if(i%6===0)sparkle(p,x,py,2*alpha,C[5],C[3],alpha);
  }
 }
}


