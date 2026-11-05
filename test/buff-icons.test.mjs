import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Test the pointer/timer contract without a browser or battle mutations.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.style={};this.scrollLeft=0;this.textContent='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){delete this.attrs[k];}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 setPointerCapture(){}
 getBoundingClientRect(){return {left:100,top:100,bottom:132,width:32,height:32};}
}
const listeners={},body=new Element('body');
const find=(node,id)=>node.id===id?node:node.children.map(n=>find(n,id)).find(Boolean);
globalThis.document={body,createElement:tag=>new Element(tag),getElementById:id=>find(body,id),addEventListener:(type,fn)=>{listeners[type]=fn;}};
globalThis.window={addEventListener:()=>{}};globalThis.innerWidth=1280;globalThis.innerHeight=720;
const {createBuffBar,hideBuffInfo}=await import('../dist/src/buff-icons.mjs');
const {createLevelBattle}=await import('../dist/src/level-test.mjs');
const pack=JSON.parse(fs.readFileSync('dist/data/tutorial.json'));
const setup=(options={})=>{hideBuffInfo();body.children=[];const g=createLevelBattle(pack,'tutorial_01');const bar=createBuffBar(g,g.units['player-5'],5,options);body.append(bar);return {g,bar,icon:bar.children[0]};};
const event=(type='touch',x=0,y=0)=>({pointerId:1,pointerType:type,clientX:x,clientY:y,stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;}});
test('short touch stays icon-only; 500ms long press opens specific details without changing battle',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {g,icon}=setup();const before=JSON.stringify(g);const e=event();icon.onpointerdown(e);assert.equal(e.stopped,true);t.mock.timers.tick(499);assert.equal(document.getElementById('buff-popover'),undefined);icon.onpointerup(e);t.mock.timers.tick(10);assert.equal(document.getElementById('buff-popover'),undefined);
 icon.onpointerdown(event());t.mock.timers.tick(500);assert.equal(document.getElementById('buff-popover').children[0].textContent,'护甲');icon.onpointerup(event());assert.ok(document.getElementById('buff-popover'));assert.equal(icon.textContent,'');assert.equal(JSON.stringify(g),before);hideBuffInfo();
});
test('movement and pointer cancellation cancel long press, and click never bubbles into exchange',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {icon,bar}=setup();icon.onpointerdown(event());icon.onpointermove(event('touch',20));t.mock.timers.tick(600);assert.equal(document.getElementById('buff-popover'),undefined);assert.equal(bar.scrollLeft,-20);icon.onpointerup(event());
 icon.onpointerdown(event());icon.onpointercancel(event());t.mock.timers.tick(600);assert.equal(document.getElementById('buff-popover'),undefined);const click=event();icon.onclick(click);assert.ok(click.stopped&&click.prevented);hideBuffInfo();
});
test('mouse hover, keyboard and outside dismissal share one tooltip and respect action lock',()=>{
 let locked=false;const {icon}=setup({isLocked:()=>locked});icon.onpointerenter(event('mouse'));assert.ok(document.getElementById('buff-popover'));assert.equal(icon.getAttribute('title'),null);icon.onpointerleave(event('mouse'));assert.equal(document.getElementById('buff-popover'),undefined);
 icon.onkeydown({...event(),key:'Enter'});assert.ok(document.getElementById('buff-popover'));icon.onkeydown({...event(),key:'Escape'});assert.equal(document.getElementById('buff-popover'),undefined);
 locked=true;icon.onpointerenter(event('mouse'));assert.equal(document.getElementById('buff-popover'),undefined);locked=false;icon.onpointerenter(event('mouse'));listeners.pointerdown({target:{closest:()=>null}});assert.equal(document.getElementById('buff-popover'),undefined);assert.equal(icon.getAttribute('aria-describedby'),null);
});
