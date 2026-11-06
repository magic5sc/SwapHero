import {endTurn} from './battle.mjs';
import {mustReinforce} from './formation.mjs';

export function forecastPlayerAttack(view){
 const empty={links:[],losses:[]};
 const player=view.sides.player;
 if(view.phase!=='action'||view.turn!=='player'||view.winner||view.error||view.stack?.length||
    mustReinforce(player.slots,view.actionPoints))return empty;

 const links=[],losses=[];
 const simulation=structuredClone(view);
 endTurn(simulation,'player',({attackerId,targetId,damage})=>{
  if(!targetId)return;
  const from=player.slots.indexOf(attackerId)+1;
  const to=view.sides.ai.slots.indexOf(targetId)+1;
  if(from>0&&from<=3&&to>0&&to<=3)links.push({from,to,damage});
 },settled=>{
  for(const side of ['player','ai']){
   view.sides[side].slots.forEach((id,index)=>{
    const unit=view.units[id];
    if(!unit||unit.hp<=0)return;
    const remaining=Math.max(0,settled.units[id]?.hp??unit.hp);
    if(remaining<unit.hp)losses.push({side,slot:index+1,hp:unit.hp,remaining,maxHp:unit.maxHp});
   });
  }
 });
 return simulation.error?empty:{links,losses};
}

function element(tag,attrs,parent){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
 parent.append(node);
 return node;
}

function drawArrow(svg,{x,y,tx,ty},link,index,scale){
 const group=element('g',{class:'attack-preview-arrow','data-from':link.from,'data-to':link.to},svg);
 const length=Math.hypot(tx-x,ty-y)||1;
 const head=Math.min(10*scale,length*.3);
 const ux=(tx-x)/length,uy=(ty-y)/length;
 const bx=tx-ux*head,by=ty-uy*head;
 element('line',{x1:x,y1:y,x2:bx,y2:by,'stroke-width':3*scale},group);
 const wing=head*.55;
 element('polygon',{points:[[tx,ty],[bx-uy*wing,by+ux*wing],[bx+uy*wing,by-ux*wing]].map(p=>p.join(',')).join(' ')},group);
 const mid=.5+(index%2?.08:-.04);
 const lx=x+(tx-x)*mid,ly=y+(ty-y)*mid;
 const label=String(link.damage),width=Math.max(22,11+label.length*7)*scale,height=18*scale;
 element('rect',{x:lx-width/2,y:ly-height/2,width,height,rx:5*scale},group);
 element('text',{x:lx,y:ly,'font-size':12*scale,'text-anchor':'middle','dominant-baseline':'central'},group).textContent=label;
}

export function drawAttackPreview(board,view){
 board.querySelector('.attack-preview-lines')?.remove();
 board.querySelectorAll('.hp-preview-loss').forEach(node=>node.remove());
 if(!view)return;
 const {links,losses}=forecastPlayerAttack(view);
 const card=(side,slot)=>board.querySelector('[data-side="'+side+'"][data-slot="'+slot+'"]');
 for(const {side,slot,hp,remaining,maxHp} of losses){
  const track=card(side,slot)?.querySelector('.hp-track');
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
 links.forEach((link,index)=>{
  const {from,to,damage}=link;
  const source=rect('player',from,'.unit-sprite'),enemy=rect('ai',to,'.unit-sprite'),stats=rect('ai',to,'.stats');
  if(!source?.width||!enemy?.width||!stats?.width)return;
  const a=source.left+source.width/2,t=enemy.left+enemy.width/2;
  const side=Math.abs(t-a)<1?0:Math.sign(t-a);
  drawArrow(svg,{
   x:a+side*source.width*.42-bounds.left,
   y:source.top+Math.min((side?26:13)*scale,source.height*.36)-bounds.top,
   tx:(side?(side<0?stats.right+12*scale:stats.left-12*scale):t)-bounds.left,
   ty:(side?stats.top-9*scale:stats.bottom+5*scale)-bounds.top,
  },link,index,scale);
  const attacker=view.units[view.sides.player.slots[from-1]];
  const target=view.units[view.sides.ai.slots[to-1]];
  labels.push(from+'号位'+attacker.name+'预计对'+to+'号位'+target.name+'造成 '+damage+' 点伤害');
 });
 if(labels.length)svg.setAttribute('aria-label','普攻预览：'+labels.join('；'));
 else svg.remove();
}
