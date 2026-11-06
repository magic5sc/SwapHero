import {createFrame,clearFrame,createFx,composite} from '../vendor/pixelfx/src/core/index.js';
import * as slash from '../vendor/pixelfx/src/fx/melee/sword-slash.js';
import * as fireball from '../vendor/pixelfx/src/fx/fire/fireball.js';
import * as blast from '../vendor/pixelfx/src/fx/explosions/small-explosion.js';
import * as frost from '../vendor/pixelfx/src/fx/ice/frost-nova.js';
import * as heal from '../vendor/pixelfx/src/fx/holy/heal.js';
import * as shield from '../vendor/pixelfx/src/fx/holy/divine-shield.js';
import {sequences,frameAt,renderBounds} from './sequence-art.mjs';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d',{willReadFrequently:true});
ctx.imageSmoothingEnabled=false;
const presets=[
 {id:'slash',name:'剑刃斩击',icon:'⚔',sub:'原地 · 目标刀光',duration:2.5,hit:.66,desc:'出演角色原地挥击 → 上方目标出现刀光 → 目标闪白并向后退 → 目标恢复站位。出演角色全程保持原位。'},
 {id:'fireball',name:'火球冲击',icon:'✹',sub:'飞行 · 命中与烟尘',duration:6.8,hit:1.2,desc:'原地释放 → 火球向上飞向目标 → 命中爆炸 → 烟尘消散。保留较长的烟尘尾段，方便观察完整效果。'},
 {id:'frost',name:'冰霜新星',icon:'❄',sub:'范围 · 冰晶与光环',duration:4.4,hit:.92,desc:'角色原地准备 → 上方目标脚下冰环展开 → 目标受击后退 → 冰晶融化。'},
 {id:'heal',name:'治愈之光',icon:'✦',sub:'恢复 · 贴身光效',duration:2.9,hit:.9,desc:'脚下花瓣绽放 → 治疗光环向上扫过 → 光点消散。贴身染色采用当前项目角色的轮廓。'},
 {id:'shield',name:'圣光护盾',icon:'◇',sub:'防护 · 环绕与淡出',duration:4,hit:.6,desc:'护盾亮起 → 光弧环绕角色 → 护盾淡出。可暂停检查人物前后的遮挡关系。'}
];
const palettes={ice:['#172449','#284e92','#418cd4','#8bd8f4','#d7f8ff','#ffffff'],gold:['#3b202a','#8b4530','#d48438','#ffd071','#fff0bc','#ffffff'],green:['#102e2a','#286544','#62a953','#afe58b','#e8ffd4','#ffffff']};
let selected=presets[0],time=0,playing=false,last=0,rig='temple_swordsman',instances=[],images={},actor,ready=false;
const f=createFrame(320,240),off=document.createElement('canvas');off.width=320;off.height=240;const oc=off.getContext('2d'),rgba=oc.createImageData(320,240);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
for(const p of presets){const b=document.createElement('button');b.type='button';b.dataset.preset=p.id;b.innerHTML=`<span class="icon">${p.icon}</span><b>${p.name}</b><small>${p.sub}</small>`;b.onclick=()=>{selected=p;restart();};$('effects').append(b);}
function sprite(context,key,motion,t,x,y,flip=false,height=100){const b=renderBounds[key],im=images[key][motion],i=frameAt(motion,Math.max(0,t)*1000,key),w=height*b.width/b.height;context.save();context.translate(x,y);if(flip)context.scale(-1,1);context.imageSmoothingEnabled=false;context.drawImage(im,i*192+b.x,b.y,b.width,b.height,-w/2,-height,w,height);context.restore();}
function makeActor(){const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');sprite(g,rig,'idle',0,40,55,false,50);const d=g.getImageData(0,0,80,60).data,mask=new Uint8Array(4800),pixels=new Uint32Array(4800);for(let i=0;i<4800;i++){mask[i]=d[i*4+3]>80?1:0;if(mask[i])pixels[i]=(255<<24)|(d[i*4+2]<<16)|(d[i*4+1]<<8)|d[i*4];}return {mask:{w:80,h:60,data:mask},pixels,x:-40,y:-55,w:80,h:60,head:{x:0,y:-45},chest:{x:0,y:-27}};}
function resetEffects(){if(!ready)return;actor=makeActor();const base={seed:12,actor,...(palettes[$('palette').value]?{palette:palettes[$('palette').value]}:{})};const add=(mod,start,x,y,extra={},end=start+mod.meta.duration)=>({fx:createFx(mod,{...base,x,y,...extra}),start,end,mod});
 if(selected.id==='slash')instances=[add(slash,.6,154,95)];
 if(selected.id==='fireball')instances=[add(fireball,.55,160,170,{angle:-Math.PI/2},1.2),add(blast,1.2,160,95,{size:.55})];
 if(selected.id==='frost')instances=[add(frost,.5,160,95,{reach:72})];
 if(selected.id==='heal')instances=[add(heal,.5,160,165)];
 if(selected.id==='shield')instances=[add(shield,.5,160,165,{},3.5)];
}
function syncEffects(){for(const q of instances){const target=clamp(time-q.start,0,q.end-q.start);while(target-q.fx.t>1e-7)q.fx.update(Math.min(1/120,target-q.fx.t));if(q.mod===fireball)q.fx.options.y=170-100*clamp((time-.55)/.65);}}
function layer(which){clearFrame(f);for(const q of instances){if(time<q.start||time>=q.end)continue;q.fx.draw(f,which);}composite(f,rgba.data);oc.putImageData(rgba,0,0);ctx.save();if(selected.id==='shield')ctx.globalAlpha=clamp((time-.5)/.2)*clamp((3.5-time)/.35);ctx.drawImage(off,0,0,640,480);ctx.restore();}
function draw(){if(!ready)return;syncEffects();ctx.clearRect(0,0,640,480);ctx.save();if($('mirror').checked){ctx.translate(640,0);ctx.scale(-1,1);}const support=['heal','shield'].includes(selected.id),hit=time-selected.hit;
 const sourceY=support?330:390,targetY=190-(support?0:14*Math.sin(clamp(hit/.4)*Math.PI));
 ctx.fillStyle='#271a3260';for(const py of support?[sourceY]:[sourceY,targetY]){ctx.beginPath();ctx.ellipse(320,py+3,36,7,0,0,Math.PI*2);ctx.fill();}
 if($('show-fx').checked)layer('back');
 const attack=!support&&time<1.35,attackDuration=sequences[rig].timings.attack.reduce((a,b)=>a+b,0)/1000;
 sprite(ctx,rig,attack?'attack':'idle',support?0:attack?time*attackDuration/1.35:time,320,sourceY);
 if(!support){ctx.save();if(hit>=0&&hit<.14)ctx.filter='brightness(2)';sprite(ctx,'temple_swordsman','idle',time,320,targetY,true);ctx.restore();}
 if($('show-fx').checked)layer('front');ctx.restore();
 $('timeline').value=time;$('clock').textContent=time.toFixed(2)+' s';$('phase').textContent=time>=selected.duration?'播放结束':time<.5?'准备':time<selected.hit?'释放':time<selected.hit+.22?(support?'生效':'命中'):'收尾';
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

