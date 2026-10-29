import * as webgl from '../vendor/spine/spine-webgl.mjs';
let spine=webgl,backend='webgl';
const root=new URL('../assets/spine/',import.meta.url);
let renderer,context,buffer,definitions,failed=false;
const rigs=new Map();
export function motionFor(node){const card=node.closest('.card');if(card?.classList.contains('perform-defeat'))return 'defeat';if(card?.classList.contains('perform-hit'))return 'hit';if(card?.classList.contains('perform-attack'))return 'attack';if(card?.classList.contains('swap-arrival'))return Number(card.dataset.position)<=3?'enter':'exit';return 'idle';}
async function initialize(){
 buffer=document.createElement('canvas');buffer.width=buffer.height=192;
 context=new spine.ManagedWebGLRenderingContext(buffer,{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false});if(!context.gl){backend='canvas';spine=await import('../vendor/spine/spine-canvas.mjs');buffer=document.createElement('canvas');buffer.width=buffer.height=192;context=buffer.getContext('2d');context.imageSmoothingEnabled=false;renderer=new spine.SkeletonRenderer(context);renderer.triangleRendering=true;}
 else {renderer=new spine.SceneRenderer(buffer,context,false);renderer.camera.position.set(0,260,0);renderer.camera.setViewport(620,620);renderer.camera.update();}
 const [atlasText,manifest]=await Promise.all([fetch(new URL('heroes.atlas',root)).then(r=>r.text()),fetch(new URL('manifest.json',root)).then(r=>r.json())]);
 const image=new Image();image.src=new URL('../sky-islands/heroes-atlas.png',root);await image.decode();
 const atlas=new spine.TextureAtlas(atlasText);const texture=(backend==='webgl'?new spine.GLTexture(context,image,false):new spine.CanvasTexture(image));for(const page of atlas.pages)page.setTexture(texture);
 const loader=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas));definitions=new Map(await Promise.all(manifest.heroes.map(async key=>[key,loader.readSkeletonData(await fetch(new URL(key+'.json',root)).then(r=>r.json()))])));
 document.documentElement.dataset.spine='ready';document.documentElement.dataset.spineBackend=backend;
}
function rig(key,art){let r=rigs.get(key);if(r)return r;const data=definitions.get(art);if(!data)return null;const skeleton=new spine.Skeleton(data);const stateData=new spine.AnimationStateData(data);stateData.defaultMix=.08;const state=new spine.AnimationState(stateData);r={skeleton,state,motion:null,last:0,seen:performance.now()};rigs.set(key,r);return r;}
let lastFrame=0;
function frame(now){requestAnimationFrame(frame);if(failed||!definitions||document.hidden||now-lastFrame<50)return;lastFrame=now;
 try{
 const nodes=document.querySelectorAll('.atlas-sprite');let sequence=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const node of nodes){const rect=node.getBoundingClientRect();if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth)continue;
 const art=node.dataset.art;const id=node.dataset.instance||'display-'+sequence++;const r=rig(id+':'+art,art);if(!r)continue;
 const logical=reduce?'idle':motionFor(node);const motion=node.dataset[logical]||logical;if(r.motion!==motion||r.logical!==logical){r.state.setAnimation(0,motion,logical==='idle');r.motion=motion;r.logical=logical;r.last=now;if(logical==='idle'&&!reduce)r.state.update((Number(id.match(/\d+/)?.[0]||1)%7)*.19);}
 r.seen=now;const dt=reduce?0:Math.min(.1,(now-r.last)/1000);r.last=now;r.state.update(dt);r.state.apply(r.skeleton);r.skeleton.update(dt);r.skeleton.updateWorldTransform(spine.Physics.update);
 if(backend==='webgl'){const gl=context.gl;gl.viewport(0,0,192,192);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);renderer.begin();renderer.drawSkeleton(r.skeleton);renderer.end();}else{context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,192,192);context.setTransform(192/620,0,0,-192/620,96,192*(.5+260/620));renderer.draw(r.skeleton);}
 let canvas=node.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=192;canvas.setAttribute('aria-hidden','true');node.append(canvas);}const ctx=canvas.getContext('2d');ctx.clearRect(0,0,192,192);ctx.drawImage(buffer,0,0);node.classList.add('spine-ready');node.dataset.animation=motion;
 }
 for(const [key,r] of rigs)if(now-r.seen>10000)rigs.delete(key);
 }catch(error){failed=true;document.documentElement.dataset.spine='failed';document.querySelectorAll('.spine-ready').forEach(n=>n.classList.remove('spine-ready'));console.warn('Spine animation fallback',error);}
}
initialize().then(()=>requestAnimationFrame(frame)).catch(error=>{failed=true;document.documentElement.dataset.spine='failed';console.warn('Spine initialization fallback',error);});
