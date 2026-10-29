// Generates editable Spine 4.3 JSON with real weighted meshes from the existing art.
// Does not rasterize, redraw or modify the source PNG.
import {mkdirSync,writeFileSync} from 'node:fs';
const out='dist/assets/spine';mkdirSync(out,{recursive:true});
const heroes=[['knight',0,0,530,520],['moon-mage',530,0,494,520],['sun-mage',1024,0,512,520],['captain',0,530,560,494],['penguin',580,550,360,460],['dragon',990,530,546,494]];
let atlas='../sky-islands/heroes-atlas.png\nsize: 1536,1024\nformat: RGBA8888\nfilter: Nearest,Nearest\nrepeat: none\npma: false\n';
const rotate=(duration,values)=>values.map((value,i)=>({time:duration*i/(values.length-1),value}));
for(const [key,tx,ty,w,h] of heroes){
 atlas+=`${key}\n  bounds: ${tx},${ty},${w},${h}\n  offsets: 0,0,${w},${h}\n  rotate: false\n`;
 const bones=[{name:'root'},{name:'body',parent:'root',x:0,y:230},{name:'head',parent:'body',x:0,y:140},{name:'weapon',parent:'body',x:120,y:20},{name:'cape',parent:'body',x:-130,y:40},{name:'feet',parent:'root',x:0,y:70}];
 const anchors=[[0,0],[0,230],[0,370],[120,250],[-130,270],[0,70]];
 const uvs=[],vertices=[],triangles=[];const cols=8,rows=8;
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const u=col/cols,v=row/rows,x=(u-.5)*w,y=(1-v)*h;uvs.push(u,v);
  const a=[1,2,3,4,5].map(i=>{const [cx,cy]=anchors[i];let sigmaX=i===2?110:i===5?150:100,sigmaY=i===2?100:i===5?70:130;let weight=Math.exp(-(((x-cx)/sigmaX)**2+((y-cy)/sigmaY)**2));if(key==='dragon'&&i===4)weight*=2;return {i,weight};}).sort((a,b)=>b.weight-a.weight).slice(0,3);
  const sum=a.reduce((s,a)=>s+a.weight,0);vertices.push(a.length);for(const {i,weight} of a)vertices.push(i,+(x-anchors[i][0]).toFixed(3),+(y-anchors[i][1]).toFixed(3),+(weight/sum).toFixed(6));
  if(row<rows&&col<cols){const n=row*(cols+1)+col;triangles.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
 }
 const amp=key==='dragon'?4:key==='penguin'?3:2;
 const animations={
  idle:{bones:{body:{translate:[{time:0,y:0},{time:.8,y:4},{time:1.6,y:0}]},head:{rotate:rotate(1.6,[0,1.5,0,-1,0])},weapon:{rotate:rotate(1.6,[0,amp,0,-amp,0])},cape:{rotate:rotate(1.6,[-amp,amp,-amp])}}},
  attack:{bones:{body:{rotate:rotate(.36,[0,-3,5,0])},head:{rotate:rotate(.36,[0,2,-3,0])},weapon:{rotate:rotate(.36,[0,10,-13,0])},cape:{rotate:rotate(.36,[0,-6,8,0])}}},
  hit:{bones:{body:{rotate:rotate(.45,[0,-7,3,0])},head:{rotate:rotate(.45,[0,5,-2,0])},cape:{rotate:rotate(.45,[0,5,-4,0])}}},
  enter:{bones:{body:{translate:[{time:0,y:-12},{time:.2,y:6},{time:.5,y:0}]},cape:{rotate:rotate(.5,[-9,6,0])},weapon:{rotate:rotate(.5,[7,-3,0])}}},
  exit:{bones:{body:{rotate:rotate(.5,[0,-5,0])},head:{rotate:rotate(.5,[0,4,0])},cape:{rotate:rotate(.5,[0,8,0])}}},
  defeat:{bones:{body:{rotate:rotate(.4,[0,-15,-28]),translate:[{time:0,y:0},{time:.4,y:-35}]},head:{rotate:rotate(.4,[0,5,10])},weapon:{rotate:rotate(.4,[0,15,25])}}}
 };
 const json={skeleton:{spine:'4.3.13',x:-w/2,y:0,width:w,height:h,fps:30,images:'../sky-islands/'},bones,slots:[{name:'character',bone:'root',attachment:key}],skins:[{name:'default',attachments:{character:{[key]:{type:'mesh',path:key,width:w,height:h,uvs,triangles,vertices}}}}],animations};
 writeFileSync(`${out}/${key}.json`,JSON.stringify(json));
}
writeFileSync(`${out}/heroes.atlas`,atlas);
writeFileSync(`${out}/manifest.json`,JSON.stringify({runtime:'4.3.13',method:'weighted mesh on unchanged source atlas',animations:['idle','attack','hit','enter','exit','defeat'],heroes:heroes.map(h=>h[0])},null,2));
