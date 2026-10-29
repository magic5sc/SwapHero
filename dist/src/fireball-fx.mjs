export const FIREBALL_DEFAULTS={renderer:'particles',preset:'fireball',color:'#ff9b32',duration_ms:480,particle_count:18};
export function createFireball(options={},seed=29){
 const o={...FIREBALL_DEFAULTS,...options};
 o.duration_ms=Math.max(100,Math.min(3000,Number(o.duration_ms)||480));
 o.particle_count=Math.max(0,Math.min(48,Math.round(Number(o.particle_count)||0)));
 let s=seed>>>0;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const flames=Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/9+r()*.3;return {x:Math.cos(a),y:Math.sin(a),size:7+r()*5,life:.55+r()*.18};});
 const sparks=Array.from({length:o.particle_count},()=>{const a=r()*Math.PI*2,v=65+r()*55;return {vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.5+r()*.42,size:1+Math.floor(r()*2)};});
 const smoke=Array.from({length:5},()=>({x:(r()-.5)*24,y:(r()-.5)*10,size:3+r()*3}));
 return {options:o,flames,sparks,smoke};
}
export function sampleFireball(sim,ms){
 const t=ms/sim.options.duration_ms;
 if(t<0||t>=1)return {t,flames:[],sparks:[],smoke:[],core:0};
 return {t,core:Math.max(0,1-t/.4),
 flames:sim.flames.flatMap(p=>t>=p.life?[]:[{x:64+p.x*24*(1-Math.exp(-5*t)),y:64+p.y*20*(1-Math.exp(-5*t))-8*t,
 radius:p.size*Math.sin(Math.PI*Math.min(1,t/p.life))+.5,heat:1-t/p.life}]),
 sparks:sim.sparks.flatMap(p=>t>=p.life?[]:[{x:64+p.vx*(1-Math.exp(-2*t))*.36,y:64+p.vy*(1-Math.exp(-2*t))*.36+12*t*t,size:p.size,heat:1-t/p.life}]),
 smoke:sim.smoke.flatMap(p=>t<.28?[]:[{x:64+p.x*(.5+t),y:60+p.y-26*(t-.28),radius:p.size*Math.sin(Math.PI*(t-.28)/.72),shade:t>.7?0:1}])};
}
function blob(ctx,x,y,r,color){
 ctx.fillStyle=color;const cx=Math.round(x),cy=Math.round(y),rr=Math.ceil(r);
 for(let yy=-rr;yy<=rr;yy++)for(let xx=-rr;xx<=rr;xx++)
 if(xx*xx+yy*yy<r*r&&Math.abs(xx)+Math.abs(yy)<r*1.35)ctx.fillRect(cx+xx,cy+yy,1,1);
}
export function drawFireball(ctx,sim,ms){
 ctx.clearRect(0,0,128,128);const f=sampleFireball(sim,ms);if(f.t<0||f.t>=1)return;
 for(const p of f.smoke)blob(ctx,p.x,p.y,p.radius,p.shade?'#78666b':'#a39389');
 for(const p of f.flames){
 blob(ctx,p.x,p.y,p.radius,'#c64632');blob(ctx,p.x,p.y-1,p.radius*.78,sim.options.color);
 if(p.heat>.3)blob(ctx,p.x,p.y-2,p.radius*.46,'#ffe17c');
 }
 if(f.core>0){const radius=5+14*Math.sin(Math.PI*Math.min(1,f.t/.4));blob(ctx,64,64,radius,sim.options.color);blob(ctx,64,63,radius*.7,'#ffe17c');blob(ctx,64,62,radius*.38,'#fff9dd');}
 for(const p of f.sparks){ctx.fillStyle=p.heat>.7?'#fff9dd':p.heat>.35?'#ffe17c':'#e66a30';ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}
}
