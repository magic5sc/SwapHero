import {createFrame,clearFrame,createFx,composite} from '../vendor/pixelfx/src/core/index.js';
import * as spear from '../vendor/pixelfx/src/fx/holy/spiral-photon-spear.js';
import {sequences,frameAt,renderBounds} from './sequence-art.mjs';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d',{willReadFrequently:true});
ctx.imageSmoothingEnabled=false;
const presets=[{id:'spear',name:'螺旋光矛 · 光子爆炸',icon:'✧',sub:'聚光 → 螺旋飞行 → 光子爆炸',duration:spear.timing.end,hit:spear.timing.hit,desc:'下方角色原地聚光，双螺旋光带缠绕矛身向上飞行；命中上方目标胸前后，白光闪爆、放射光束与碎光向外扩散，目标受击后退。'}];
const palettes={ice:['#172449','#284e92','#418cd4','#8bd8f4','#d7f8ff','#ffffff'],gold:['#3b202a','#8b4530','#d48438','#ffd071','#fff0bc','#ffffff'],green:['#102e2a','#286544','#62a953','#afe58b','#e8ffd4','#ffffff']};
let selected=presets[0],time=0,playing=false,last=0,rig='temple_swordsman',instances=[],images={},actor,ready=false;
const f=createFrame(320,240),off=document.createElement('canvas');off.width=320;off.height=240;const oc=off.getContext('2d'),rgba=oc.createImageData(320,240);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
for(const p of presets){const b=document.createElement('button');b.type='button';b.dataset.preset=p.id;b.innerHTML=`<span class="icon">${p.icon}</span><b>${p.name}</b><small>${p.sub}</small>`;b.onclick=()=>{selected=p;restart();};$('effects').append(b);}
function sprite(context,key,motion,t,x,y,flip=false,height=100){const b=renderBounds[key],im=images[key][motion],i=frameAt(motion,Math.max(0,t)*1000,key),w=height*b.width/b.height;context.save();context.translate(x,y);if(flip)context.scale(-1,1);context.imageSmoothingEnabled=false;context.drawImage(im,i*192+b.x,b.y,b.width,b.height,-w/2,-height,w,height);context.restore();}
function makeActor(){const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');sprite(g,rig,'idle',0,40,55,false,50);const d=g.getImageData(0,0,80,60).data,mask=new Uint8Array(4800),pixels=new Uint32Array(4800);for(let i=0;i<4800;i++){mask[i]=d[i*4+3]>80?1:0;if(mask[i])pixels[i]=(255<<24)|(d[i*4+2]<<16)|(d[i*4+1]<<8)|d[i*4];}return {mask:{w:80,h:60,data:mask},pixels,x:-40,y:-55,w:80,h:60,head:{x:0,y:-45},chest:{x:0,y:-27}};}
function resetEffects(){if(!ready)return;actor=makeActor();const base={seed:12,actor,...(palettes[$('palette').value]?{palette:palettes[$('palette').value]}:{})};const add=(mod,start,x,y,extra={},end=start+mod.meta.duration)=>({fx:createFx(mod,{...base,x,y,...extra}),start,end,mod});
 instances=[add(spear,0,160,170)];
}
function syncEffects(){for(const q of instances){const target=clamp(time-q.start,0,q.end-q.start);while(target-q.fx.t>1e-7)q.fx.update(Math.min(1/120,target-q.fx.t));}}
function layer(which){clearFrame(f);for(const q of instances){if(time<q.start||time>=q.end)continue;q.fx.draw(f,which);}composite(f,rgba.data);oc.putImageData(rgba,0,0);ctx.save();if(selected.id==='shield')ctx.globalAlpha=clamp((time-.5)/.2)*clamp((3.5-time)/.35);ctx.drawImage(off,0,0,640,480);ctx.restore();}
function draw(){if(!ready)return;syncEffects();ctx.clearRect(0,0,640,480);ctx.save();if($('mirror').checked){ctx.translate(640,0);ctx.scale(-1,1);}const support=['heal','shield'].includes(selected.id),hit=time-selected.hit;
 const sourceY=support?330:390,targetY=190-(support?0:14*Math.sin(clamp(hit/.4)*Math.PI));
 ctx.fillStyle='#271a3260';for(const py of support?[sourceY]:[sourceY,targetY]){ctx.beginPath();ctx.ellipse(320,py+3,36,7,0,0,Math.PI*2);ctx.fill();}
 if($('show-fx').checked)layer('back');
 const attack=!support&&time<1.35,attackDuration=sequences[rig].timings.attack.reduce((a,b)=>a+b,0)/1000;
 sprite(ctx,rig,attack?'attack':'idle',support?0:attack?time*attackDuration/1.35:time,320,sourceY);
 if(!support){ctx.save();if(hit>=0&&hit<.14)ctx.filter='brightness(2)';sprite(ctx,'temple_swordsman','idle',time,320,targetY,true);ctx.restore();}
 if($('show-fx').checked)layer('front');ctx.restore();
 $('timeline').value=time;$('clock').textContent=time.toFixed(2)+' s';$('phase').textContent=time>=selected.duration?'播放结束':time<spear.timing.release?'聚光':time<selected.hit?'螺旋飞行':time<selected.hit+.22?(support?'生效':'命中'):'收尾';
}
function restart(){time=0;last=0;playing=ready;resetEffects();$('effect-title').textContent=selected.name;$('description').textContent=selected.desc;$('timeline').max=selected.duration;for(const b of $('effects').children)b.setAttribute('aria-pressed',String(b.dataset.preset===selected.id));$('pause').textContent='暂停';draw();}
function pause(){playing=false;$('pause').textContent='播放';}
function seek(value){pause();time=clamp(value,0,selected.duration);resetEffects();draw();}
$('replay').onclick=restart;$('pause').onclick=()=>{if(time>=selected.duration)return restart();playing=!playing;last=0;$('pause').textContent=playing?'暂停':'播放';};$('step').onclick=()=>seek(time+1/30);$('timeline').oninput=()=>seek(Number($('timeline').value));
$('character').onchange=()=>{rig=$('character').value;restart();};$('palette').onchange=restart;$('mirror').onchange=draw;$('show-fx').onchange=draw;
$('background').onchange=()=>{document.querySelector('.stage').dataset.background=$('background').value;};
document.addEventListener('visibilitychange',()=>{last=0;});
function tick(now){if(!document.hidden&&ready){if(playing&&last){time=Math.min(selected.duration,time+Math.min((now-last)/1000,.1)*Number($('speed').value));if(time>=selected.duration){if($('loop').checked)restart();else pause();}}draw();}last=now;requestAnimationFrame(tick);}
async function init(){try{await Promise.all(Object.entries(sequences).map(async([key,s])=>{images[key]={};await Promise.all(['idle','attack'].map(async motion=>{const im=new Image();im.src=`assets/characters/${s.folder}/${motion}-sheet.png`;await im.decode();images[key][motion]=im;}));}));ready=true;for(const id of ['replay','pause','step','timeline'])$(id).disabled=false;restart();if(matchMedia('(prefers-reduced-motion: reduce)').matches)pause();requestAnimationFrame(tick);}catch(e){$('error').hidden=false;$('error').textContent='素材载入失败，请刷新页面重试。';$('phase').textContent='未能载入';console.error(e);}}
init();

