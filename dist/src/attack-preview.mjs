import {mustReinforce} from './formation.mjs';
import {canAttack} from './content.mjs';
import {applyDamage} from './effects.mjs';
import {ATTACK_ORDER,combatTarget} from './match-rules.mjs';

function playerPlanning(view){
 return view.phase==='action'&&view.turn==='player'&&!view.winner&&!view.error&&!view.stack?.length;
}

function healthLosses(before,after,side){
 return before.sides[side].slots.flatMap((id,index)=>{
  const unit=before.units[id];
  const remaining=after.units[id]?.hp;
  return unit&&remaining<unit.hp?[{side,slot:index+1,hp:unit.hp,remaining:Math.max(0,remaining),maxHp:unit.maxHp}]:[];
 });
}

function forecastNormalAttacks(view,side,targetSide){
 if(!playerPlanning(view))return {links:[],losses:[]};
 const own=view.sides[side];
 if(side==='player'&&mustReinforce(own.slots,view.actionPoints))return {links:[],losses:[]};
 // Forecast each side from the current board independently.
 const simulation=structuredClone(view);
 const links=[];
 let score=own.score;
 for(const from of ATTACK_ORDER){
  const unit=view.units[own.slots[from-1]];
  if(!unit||!canAttack(unit))continue;
  const target=combatTarget(simulation,side,from);
  if(!target){
   if(view.victoryCondition==='score_5'&&++score>=5)break;
   continue;
  }
  const attack=Math.max(0,unit.attack);
  const damage=applyDamage(simulation,unit.id,target.id,attack,'combat',{preview:true});
  links.push({from,to:target.position,attack,damage});
 }
 return {links,losses:healthLosses(view,simulation,targetSide)};
}

export const forecastPlayerAttack=view=>forecastNormalAttacks(view,'player','ai');
export const forecastEnemyAttack=view=>forecastNormalAttacks(view,'ai','player');

function element(tag,attrs,parent){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
 parent.append(node);
 return node;
}

function drawArrow(svg,route,others,index,scale){
 const {x,y,tx,ty,link}=route;
 const group=element('g',{class:'attack-preview-arrow','data-side':link.side,'data-from':link.from,'data-to':link.to},svg);
 const length=Math.hypot(tx-x,ty-y);
 const head=Math.min(10*scale,length*.3);
 const ux=(tx-x)/length,uy=(ty-y)/length;
 const bx=tx-ux*head,by=ty-uy*head;
 const stops=link.side==='ai'?others.flatMap(other=>{
  if(other.link.side!=='player')return [];
  const dx=other.tx-other.x,dy=other.ty-other.y;
  const cross=ux*dy-uy*dx;
  if(Math.abs(cross)<.01)return [];
  const px=other.x-x,py=other.y-y;
  const distance=(px*dy-py*dx)/cross;
  const fraction=(px*uy-py*ux)/cross;
  return distance>0&&distance<length-head&&fraction>0&&fraction<1?[distance]:[];
 }).sort((a,b)=>a-b):[];
 let at=0;
 for(const stop of [...stops,length-head+5*scale]){
  const end=Math.min(stop-5*scale,length-head);
  if(end>at)element('line',{x1:x+ux*at,y1:y+uy*at,x2:x+ux*end,y2:y+uy*end,'stroke-width':3*scale},group);
  at=Math.max(at,stop+5*scale);
 }
 const wing=head*.55;
 element('polygon',{points:[[tx,ty],[bx-uy*wing,by+ux*wing],[bx+uy*wing,by-ux*wing]].map(p=>p.join(',')).join(' ')},group);
 const mid=link.side==='ai'?.33+index*.07:.48+index*.07;
 const lx=x+(tx-x)*mid,ly=y+(ty-y)*mid;
 const label=String(link.attack),width=Math.max(22,11+label.length*7)*scale,height=18*scale;
 element('rect',{x:lx-width/2,y:ly-height/2,width,height,rx:5*scale},group);
 element('text',{x:lx,y:ly,'font-size':12*scale,'text-anchor':'middle','dominant-baseline':'central'},group).textContent=label;
}

export function drawAttackPreview(board,view){
 board.querySelector('.attack-preview-lines')?.remove();
 board.querySelectorAll('.hp-preview-loss').forEach(node=>node.remove());
 board.querySelectorAll('.hp-preview-value:not(:empty)').forEach(node=>{node.textContent='';});
 if(!view)return;
 const player=forecastPlayerAttack(view),enemyForecast=forecastEnemyAttack(view);
 const links=[...player.links.map(link=>({...link,side:'player'})),...enemyForecast.links.map(link=>({...link,side:'ai'}))];
 const losses=[...player.losses,...enemyForecast.losses];
 const card=(side,slot)=>board.querySelector('[data-side="'+side+'"][data-slot="'+slot+'"]');
 for(const {side,slot,hp,remaining,maxHp} of losses){
  const targetCard=card(side,slot);
  const value=targetCard?.querySelector('.hp-preview-value');
  if(value)value.textContent=`(${remaining})`;
  const track=targetCard?.querySelector('.hp-track');
  if(!track||!maxHp)continue;
  const ghost=document.createElement('span');
  ghost.className='hp-preview-loss';
  ghost.style.left=(remaining/maxHp*100)+'%';
  ghost.style.width=((hp-remaining)/maxHp*100)+'%';
  ghost.setAttribute('role','img');
  ghost.setAttribute('aria-label','预计扣除 '+(hp-remaining)+' 点生命');
  track.append(ghost);
 }
 const bounds=board.getBoundingClientRect();
 if(!links.length||!bounds.width||!bounds.height)return;
 const scale=Math.min(1,Math.max(.72,bounds.width/650));
 const rect=(side,slot,part)=>card(side,slot)?.querySelector(part)?.getBoundingClientRect();
 const svg=element('svg',{class:'attack-preview-lines',viewBox:[0,0,bounds.width,bounds.height].join(' '),role:'img'},board);
 const labels=[];
 const routes=links.flatMap(link=>{
  const {from,to,attack,damage,side}=link;
  const outgoing=side==='player';
  const topSlot=outgoing?to:from,bottomSlot=outgoing?from:to;
  const top=rect('ai',topSlot,'.unit-sprite'),bottom=rect('player',bottomSlot,'.unit-sprite'),stats=rect('ai',topSlot,'.stats');
  if(!top?.width||!bottom?.width||!stats?.width)return [];
  const a=bottom.left+bottom.width/2,t=top.left+top.width/2;
  const cross=Math.abs(t-a)<1?0:Math.sign(t-a);
  const px=a+cross*bottom.width*.42-bounds.left;
  const py=bottom.top+Math.min((cross?26:13)*scale,bottom.height*.36)-bounds.top;
  const ex=(cross?(cross<0?stats.right+12*scale:stats.left-12*scale):t)-bounds.left;
  const ey=(cross?stats.top-9*scale:stats.bottom+5*scale)-bounds.top;
  const length=Math.hypot(ex-px,ey-py);
  if(length<1)return [];
  const offset=(outgoing?1:-1)*12*scale;
  const ox=(py-ey)/length*offset,oy=(ex-px)/length*offset;
  const attacker=view.units[view.sides[side].slots[from-1]];
  const target=view.units[view.sides[outgoing?'ai':'player'].slots[to-1]];
  labels.push((outgoing?'我方':'对手')+attacker.name+'攻击力 '+attack+'，预计使'+target.name+'扣除 '+damage+' 点生命');
  return [outgoing?{x:px+ox,y:py+oy,tx:ex+ox,ty:ey+oy,link}:{x:ex+ox,y:ey+oy,tx:px+ox,ty:py+oy,link}];
 });
 for(const route of [...routes].reverse())drawArrow(svg,route,routes,route.link.from-1,scale);
 if(labels.length)svg.setAttribute('aria-label','普攻预览：'+labels.join('；'));
 else svg.remove();
}
