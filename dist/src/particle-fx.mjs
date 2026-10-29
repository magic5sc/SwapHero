import {createFireball,drawFireball} from './fireball-fx.mjs';
// Cosmetic, deterministic 128px particle simulation. No game-state dependencies.
export const SLASH_DEFAULTS={renderer:'particles',preset:'slash',color:'#fff2ab',duration_ms:420,angle_deg:-45,particle_count:14};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function createSlash(options={},seed=19){
 const o={...SLASH_DEFAULTS,...options};
 o.duration_ms=clamp(Number(o.duration_ms)||420,100,3000);
 o.angle_deg=clamp(Number(o.angle_deg)||0,-180,180);
 o.particle_count=clamp(Math.round(Number(o.particle_count)||0),0,48);
 let state=seed>>>0; const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const a=o.angle_deg*Math.PI/180;
 const particles=Array.from({length:o.particle_count},(_,i)=>{
  const theta=a+(i%2?1:-1)*(0.6+rand()*1.8);
  const speed=55+rand()*80;
  return {vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,life:.42+rand()*.48,size:1+Math.floor(rand()*2),delay:rand()*.045};
 });
 return {options:o,axis:{x:Math.cos(a),y:Math.sin(a)},particles};
}
export function sampleSlash(sim,ms){
 const t=ms/sim.options.duration_ms;
 if(t<0||t>=1)return {t,halfLength:0,width:0,flash:0,particles:[]};
 return {t,halfLength:48*Math.min(1,t/.08),width:Math.max(0,4*(1-t/.55)),
 flash:Math.max(0,1-t/.28),particles:sim.particles.flatMap(p=>{
 const age=t-p.delay;if(age<0||age>=p.life)return [];
 const seconds=age*.42,drag=(1-Math.exp(-3*seconds))/3;
 return [{x:64+p.vx*drag,y:64+p.vy*drag+20*seconds*seconds,
 size:Math.max(1,Math.ceil(p.size*(1-age/p.life))),hot:age<.16}];
 })};
}
export function drawSlash(ctx,sim,ms){
 const f=sampleSlash(sim,ms),a=sim.axis;
 ctx.clearRect(0,0,128,128);
 if(f.t<0||f.t>=1)return;
 // Rasterize a symmetric tapered straight streak. Every pixel's width depends
 // solely on distance along the same fixed axis, so there is no curved tail.
 for(let y=8;y<120;y++)for(let x=8;x<120;x++){
  const dx=x-63.5,dy=y-63.5,u=dx*a.x+dy*a.y,v=-dx*a.y+dy*a.x;
  const w=f.width*Math.max(0,1-Math.abs(u)/(f.halfLength||1));
  if(w>0&&Math.abs(u)<f.halfLength&&Math.abs(v)<w){
   ctx.fillStyle=Math.abs(v)<w*.46?'#fffef0':Math.abs(v)<w*.8?sim.options.color:'#eea43c';
   ctx.fillRect(x,y,1,1);
  }
 }
 if(f.flash>0){
  const r=Math.ceil(12*f.flash);
  ctx.fillStyle=sim.options.color;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)
   if(Math.abs(x)*Math.abs(y)<r*.55&&Math.abs(x)+Math.abs(y)<r+2)ctx.fillRect(64+x,64+y,1,1);
  ctx.fillStyle='#fffef0';ctx.fillRect(62,62,4,4);
 }
 for(const p of f.particles){ctx.fillStyle=p.hot?'#fffef0':sim.options.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}
}
export function makeParticleEffect(options={}){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=128;canvas.className='asset-fx particle-fx';
 canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'absolute',left:'50%',top:'42%',width:'min(100%, 256px)',height:'auto',aspectRatio:'1',transform:'translate(-50%, -50%)',pointerEvents:'none',imageRendering:'pixelated',animation:'none',border:'0',boxShadow:'none',zIndex:'9'});
 const ctx=canvas.getContext('2d'),sim=options.preset==='fireball'?createFireball(options):createSlash(options);
 const draw=options.preset==='fireball'?drawFireball:drawSlash;
 if(!ctx)return canvas;
 let start,raf,dead=false,connected=false;
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const stop=()=>{dead=true;cancelAnimationFrame(raf);canvas.remove();};
 canvas.dispose=stop;
 function frame(now){
  if(dead)return;
  if(!canvas.isConnected){if(connected)return stop();raf=requestAnimationFrame(frame);return;}
  connected=true;start??=now;
  const ms=now-start;
  if(document.hidden||ms>=sim.options.duration_ms)return stop();
  draw(ctx,sim,reduced?80:ms);
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 // Also release effects that were created but never mounted.
 setTimeout(stop,sim.options.duration_ms+1000);
 return canvas;
}
