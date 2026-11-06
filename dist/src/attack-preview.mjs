import {canAttack} from './content.mjs';
import {ATTACK_ORDER,combatTarget} from './match-rules.mjs';

export function attackPreviewLinks(view){
 if(view.phase!=='action'||view.turn!=='player'||view.winner||view.error)return [];
 return ATTACK_ORDER.flatMap(from=>{
  const unit=view.units[view.sides.player.slots[from-1]];
  const target=unit&&canAttack(unit)&&combatTarget(view,'player',from);
  return target?[{from,to:target.position,attacker:unit.name,target:view.units[target.id].name}]:[];
 });
}

function element(tag,attrs,parent){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
 parent.append(node);
 return node;
}

function drawArrow(svg,x,y,tx,ty,across,scale){
 const dx=tx-x,dy=ty-y;
 const d=across
  ? `M ${x},${y} C ${x+dx*.08},${y+dy*.73} ${tx-dx*.30},${ty-dy*.54} ${tx},${ty}`
  : `M ${x},${y} Q ${x-14*scale},${(y+ty)/2} ${tx},${ty}`;
 const guide=element('path',{d,fill:'none',stroke:'none'},svg);
 const length=guide.getTotalLength();
 const point=(distance,lateral=0)=>{
  const at=Math.max(0,Math.min(length,distance));
  const p=guide.getPointAtLength(at);
  const a=guide.getPointAtLength(Math.max(0,at-.6));
  const b=guide.getPointAtLength(Math.min(length,at+.6));
  const tangent=Math.hypot(b.x-a.x,b.y-a.y)||1;
  return `${p.x-(b.y-a.y)/tangent*lateral},${p.y+(b.x-a.x)/tangent*lateral}`;
 };
 const group=element('g',{class:'attack-preview-arrow'},svg);
 const facet=(points,fill,stroke='#67151f',width=.7)=>
  element('polygon',{points:points.join(' '),fill,stroke,'stroke-width':width,'stroke-linejoin':'round'},group);
 const head=Math.min((across?26:17)*scale,length*.48);
 const shaft=length-head*.68;
 const count=Math.max(2,Math.round(shaft/((across?19:11)*scale)));
 const step=shaft/count;
 for(let i=0;i<count;i++){
  const at=i*step,stop=at+step*.79;
  const w=((across?2.3:1.8)+(across?3.5:1.7)*(i+1)/count)*scale;
  const a=point(at,w*.72),b=point(at,-w*.72);
  const c=point(stop,-w),tip=point(stop+Math.min(1.8*scale,step*.2)),e=point(stop,w);
  facet([a,b,c,tip,e],'#ad2538');
  facet([b,c,tip,point(at)],'#df4654','none',0);
 }
 const tip=guide.getPointAtLength(length),neck=guide.getPointAtLength(Math.max(0,length-2));
 const tangent=Math.hypot(tip.x-neck.x,tip.y-neck.y)||1;
 const ux=(tip.x-neck.x)/tangent,uy=(tip.y-neck.y)/tangent;
 const vertex=(back,side)=>`${tip.x-ux*back-uy*side},${tip.y-uy*back+ux*side}`;
 const wing=(across?11:7.5)*scale;
 const nose=vertex(0,0),left=vertex(head,-wing),right=vertex(head,wing),crease=vertex(head*.59,0);
 facet([nose,left,crease,right],'#9d1b2a','#681823',1);
 facet([nose,left,crease],'#ed4a55','none',0);
 facet([nose,crease,right],'#b42637','none',0);
 element('path',{d:`M ${vertex(2,0)} L ${vertex(head*.54,0)}`,stroke:'#fb7278','stroke-width':.8,opacity:.65},group);
 guide.remove();
 return group;
}

export function drawAttackPreview(board,view){
 board.querySelector('.attack-preview-lines')?.remove();
 if(!view)return;
 const links=attackPreviewLinks(view);
 const bounds=board.getBoundingClientRect();
 if(!links.length||!bounds.width||!bounds.height)return;
 const scale=Math.min(1,Math.max(.55,bounds.width/650));
 const rect=(side,slot,part)=>board.querySelector(`[data-side="${side}"][data-slot="${slot}"] ${part}`)?.getBoundingClientRect();
 const svg=element('svg',{class:'attack-preview-lines',viewBox:`0 0 ${bounds.width} ${bounds.height}`,role:'img'},board);
 const labels=[];
 for(const {from,to,attacker,target} of links){
  const source=rect('player',from,'.unit-sprite');
  const enemy=rect('ai',to,'.unit-sprite');
  const stats=rect('ai',to,'.stats');
  if(!source?.width||!enemy?.width||!stats?.width)continue;
  const a=source.left+source.width/2,t=enemy.left+enemy.width/2;
  const side=Math.abs(t-a)<1?0:Math.sign(t-a);
  const x=a+side*source.width*.42-bounds.left;
  const y=source.top+Math.min((side?26:13)*scale,source.height*.36)-bounds.top;
  const tx=(side?(side<0?stats.right+12*scale:stats.left-12*scale):t)-bounds.left;
  const ty=(side?stats.top-9*scale:stats.bottom+5*scale)-bounds.top;
  const arrow=drawArrow(svg,x,y,tx,ty,side!==0,scale);
  arrow.dataset.from=from;
  arrow.dataset.to=to;
  labels.push(`${from}号位${attacker}预计攻击对手${to}号位${target}`);
 }
 if(labels.length)svg.setAttribute('aria-label','普攻预览：'+labels.join('；'));
 else svg.remove();
}
