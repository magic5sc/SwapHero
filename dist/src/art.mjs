import {makeParticleEffect} from './particle-fx.mjs';
import './spine-art.mjs';
// Cosmetic assets only. Unit statistics and rules stay in battle.mjs.
export const atlasURL = 'assets/sky-islands/heroes-atlas.png';
export const heroArt = [
  {key:'knight',label:'蓝披风剑士',x:0,y:0},
  {key:'moon-mage',label:'银发法师',x:50,y:0},
  {key:'sun-mage',label:'红帽法师',x:100,y:0},
  {key:'captain',label:'红发船长',x:0,y:100},
  {key:'penguin',label:'皇冠企鹅',x:50,y:100},
  {key:'dragon',label:'赤翼幼龙',x:100,y:100}
];
export function artForUnit(id){if(typeof id==='object'){if(id.art?.character){const c=id.art.character;return {...heroArt.find(a=>a.key===c.rig),animations:c.animations};}id=id.id;}return heroArt[(Number(String(id).match(/\d+/)?.[0]||1)-1)%heroArt.length];}
export function makeSprite(className, art){
  const sprite=document.createElement('span');
  sprite.className='atlas-sprite '+className;
  sprite.style.backgroundPosition=art.x+'% '+art.y+'%';
  sprite.dataset.art=art.key; if(art.animations){sprite.dataset.idle=art.animations.idle;sprite.dataset.attack=art.animations.attack;}
  sprite.setAttribute('aria-hidden','true');
  return sprite;
}
export function hydrateArt(){
  document.querySelectorAll('[data-hero]').forEach(host=>{
    const art=heroArt[Number(host.dataset.hero)];
    host.append(makeSprite('menu-sprite',art));
    host.setAttribute('role','img');host.setAttribute('aria-label',art.label);
  });
}

export function makeAttackEffect(effect){if(['slash','fireball'].includes(effect.preset))return makeParticleEffect(effect);const e=document.createElement('span');e.className='asset-fx asset-fx-'+effect.preset;e.style.setProperty('--fx-color',effect.color);e.style.setProperty('--fx-duration',effect.duration_ms+'ms');e.setAttribute('aria-hidden','true');return e;}
