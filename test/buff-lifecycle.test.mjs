import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {normalizeTables,compileTables} from '../dist/src/workbook.mjs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {start,move,endTurn} from '../dist/src/battle.mjs';
import {collectPhase,drainStack,applyDamage,finishBuffTurn,finishOwnerTurn} from '../dist/src/effects.mjs';
import {BUFF_EVENTS,buffLayers} from '../dist/src/buffs.mjs';
const pack=JSON.parse(fs.readFileSync('dist/data/tutorial.json'));
const base={id:'life',name:'生命周期',kind:'marker',active_zone:'any',stacking:'add',scope:'source_skill',max_stacks:3,duration:'battle',leave:'keep',value_policy:'replace',duration_refresh:'refresh',overflow:'apply',shield_refresh:'reset',values:{n:1},rules:[]};
const effect=(op='heal',target='self',amount='n')=>({op,target,zone:'any',amount,duration:null,grid:true,...(op==='deal_damage'?{damage_type:'skill'}:{})});
const rule=(event,extra={})=>({event,subject:'self',active_zone:'any',turn:'any',entry:'any',damageType:'any',removalReason:'any',conditions:[],effects:[effect()],...extra});
function game(){const g=createLevelBattle(pack,'tutorial_01');start(g);for(const u of Object.values(g.units)){u.skills=[];u.attack=0;u.baseAttack=0;u.maxHp=100;u.hp=30;}return g;}
function operation(g,b,op='apply_buff',value=0,stacks=1,source='ai-2',target='player-2'){
 g.stack.push({source,instigator:source,side:source.startsWith('ai')?'ai':'player',skillId:'test',name:'测试',event:{unit:source,side:'ai',position:2},effects:[{...effect(op),grid:false,targets:[target],buff:b,value,stacks}],buffs:{[b.id]:b}});drainStack(g);
}
const lifecycle=g=>g.trace.filter(e=>BUFF_EVENTS.includes(e.type));
test('first application, accepted reapplication and changed stacks have distinct ordered notifications',()=>{
 const g=game(),b={...base,rules:['buff_added','buff_reapplied','buff_stack_changed'].map(e=>rule(e))};operation(g,b);assert.equal(g.units['player-2'].hp,32);assert.deepEqual(lifecycle(g).map(e=>e.type).sort(),['buff_added','buff_stack_changed']);
 operation(g,b);assert.equal(g.units['player-2'].hp,34);assert.equal(lifecycle(g).filter(e=>e.type==='buff_added').length,1);
 const h=game(),r={...b,stacking:'refresh'};operation(h,r);operation(h,r);assert.equal(h.units['player-2'].hp,33);
});
test('full rejection emits overflow only and does not mutate the Buff; apply can also reapply',()=>{
 for(const overflow of ['reject','apply']){const g=game(),b={...base,max_stacks:1,overflow,rules:['buff_overflow','buff_reapplied'].map(e=>rule(e))};operation(g,b);const before=structuredClone(g.units['player-2'].buffs[0]);g.trace=[];operation(g,b,'apply_buff',9);assert.equal(g.units['player-2'].hp,overflow==='reject'?31:32);assert.equal(lifecycle(g).filter(e=>e.type==='buff_stack_changed').length,0);if(overflow==='reject')assert.deepEqual(g.units['player-2'].buffs[0],before);}
});
test('added result resolves before stack-change result with noncommutative health effects',()=>{
 const g=game();g.units['player-2'].hp=99;
 const b={...base,values:{n:5},rules:[rule('buff_added'),rule('buff_stack_changed',{effects:[effect('deal_damage')]})]};
 operation(g,b);assert.equal(g.units['player-2'].hp,95);
});
test('partial removal changes stacks, final removal fires removed exactly once with reason',()=>{
 const g=game(),b={...base,rules:[rule('buff_removed',{removalReason:'dispelled'}),rule('buff_expired')]};operation(g,b,'apply_buff',0,3);operation(g,b,'remove_buff',1);assert.equal(g.units['player-2'].hp,30);operation(g,b,'remove_buff',9);assert.equal(g.units['player-2'].hp,31);assert.equal(buffLayers(g.units['player-2'],'life'),0);assert.equal(lifecycle(g).filter(e=>e.type==='buff_removed').length,1);assert.equal(lifecycle(g).find(e=>e.type==='buff_removed').reason,'dispelled');
 operation(g,b,'remove_buff',9);assert.equal(g.units['player-2'].hp,31);
});
test('expiry survives serialization, runs without an active instance, and distinguishes early removal',()=>{
 for(const early of [false,true]){let g=game();const b={...base,duration:'owner_turns',turns:1,rules:[rule('buff_expired'),rule('buff_removed',{removalReason:'expired'}),rule('buff_removed',{removalReason:'leave'})]};operation(g,b);g=JSON.parse(JSON.stringify(g));if(early)operation(g,b,'remove_buff',1);else {finishOwnerTurn(g,'player');drainStack(g);}assert.equal(g.units['player-2'].hp,early?30:32);assert.equal(g.units['player-2'].buffs.length,0);}
});
test('exit removal can trigger in reserve even when attribute active zone is battlefield',()=>{
 const g=game(),b={...base,active_zone:'battlefield',leave:'remove',rules:[rule('buff_removed',{removalReason:'leave',active_zone:'bench'})]};operation(g,b);move(g,'player',5,2);assert.equal(g.units['player-2'].hp,31);assert.equal(g.units['player-2'].buffs.length,0);
});
test('shield depletion fires only on positive damage exhausting that instance and rearms after refill',()=>{
 const g=game(),b={...base,kind:'shield',stacking:'refresh',rules:[rule('buff_shield_depleted')]};operation(g,b,'apply_buff',2);applyDamage(g,'ai-2','player-2',1);drainStack(g);assert.equal(g.units['player-2'].hp,30);applyDamage(g,'ai-2','player-2',1);drainStack(g);assert.equal(g.units['player-2'].hp,31);applyDamage(g,'ai-2','player-2',0);drainStack(g);assert.equal(g.units['player-2'].hp,31);operation(g,b,'apply_buff',2);applyDamage(g,'ai-2','player-2',2);drainStack(g);assert.equal(g.units['player-2'].hp,32);operation(g,b,'remove_buff',1);assert.equal(g.units['player-2'].hp,32);
});
test('same-ID instances do not hear one another lifecycle, and own condition reads event snapshot',()=>{
 const g=game(),b={...base,rules:[rule('buff_stack_changed',{conditions:[{buff:'life',compare:'gte',layers:2}]})]};operation(g,b,'apply_buff',0,1,'ai-2');operation(g,b,'apply_buff',0,1,'player-5');assert.equal(g.units['player-2'].hp,30);operation(g,b,'apply_buff',0,1,'ai-2');assert.equal(g.units['player-2'].hp,31);assert.equal(g.units['player-2'].buffs.length,2);
});
test('turn-end expiry chain resolves before outcome, including simultaneous defeat',()=>{
 const g=game();g.sides.player.slots[4]=null;const b={...base,duration:'turn',values:{n:99},rules:[rule('buff_expired',{effects:[effect('deal_damage','all_enemies'),effect('deal_damage')]})]};operation(g,b);endTurn(g,'player');assert.equal(g.units['player-2'].hp,0);assert.equal(g.units['ai-2'].hp,0);assert.equal(g.winner,'ai');assert.equal(g.stack.length,0);
});
test('lifecycle loops use the shared chain limit rather than recursive callbacks',()=>{
 const g=game(),b={...base,stacking:'independent',rules:[rule('buff_added',{effects:[{...effect('apply_buff'),buff:base,stacks:1}]})]};operation(g,b);assert.match(g.error,/256/);
});
test('fixed Buff values compile without levels and lifecycle invalid filters are rejected',()=>{
 const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'}),t=normalizeTables(Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})])));
 const put=(sheet,row,k,v)=>t[sheet][row][t[sheet][0].indexOf(k)]=v;
 put('BuffEffect',1,'触发时机','buff_expired');put('BuffEffect',1,'回合归属','any');
 const p=compileTables(t,null,{levelOnly:true}),b=p.buffs.tutorial_retaliation_charge;assert.ok(b.values);assert.equal(b.levels,undefined);
 put('BuffEffect',1,'触发主体','other_ally');assert.throws(()=>compileTables(t,null,{levelOnly:true}),/生命周期/);put('BuffEffect',1,'触发主体','self');put('BuffEffect',1,'移除原因','leave');assert.throws(()=>compileTables(t,null,{levelOnly:true}),/移除原因/);
});
test('old table with unequal Buff level values requires explicit fixed value, never guesses',()=>{
 const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'}),t=Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})]));
 const c=t.EffectResult[0].indexOf('数值');if(c>=0)for(const row of t.EffectResult)row.splice(c,1);
 const row=t.EffectResult.find(r=>r[0]==='tutorial_retaliation_prepare');row[t.EffectResult[0].indexOf('等级1')]=1;row[t.EffectResult[0].indexOf('等级2')]=2;assert.throws(()=>normalizeTables(t),/Buff没有等级/);
});
test('configuration manual poison CSV compiles and expires after two owner turns',()=>{
 const wb=XLSX.read(fs.readFileSync('dist/config/Tutorial.xlsx'),{type:'buffer'}),t=normalizeTables(Object.fromEntries(wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})])));
 const blocks=[...fs.readFileSync('docs/BUFF-CONFIG.md','utf8').replaceAll('\r\n','\n').matchAll(/```csv\n([\s\S]*?)\n```/g)].map(m=>m[1].split('\n').map(l=>l.split(',')));
 for(const [i,name] of ['Buff','BuffEffect','EffectResult'].entries()){assert.deepEqual(blocks[i][0],t[name][0]);for(const row of blocks[i].slice(1)){assert.equal(row.length,t[name][0].length);t[name].push(row);}}
 const p=compileTables(t,null,{levelOnly:true}),g=game(),b=p.buffs.demo_poison;operation(g,b);g.turn='player';
 for(let i=0;i<2;i++){collectPhase(g,'turn_start');drainStack(g);finishOwnerTurn(g,'player');drainStack(g);}
 assert.equal(g.units['player-2'].hp,28);assert.equal(g.units['ai-2'].hp,28);assert.equal(g.units['player-2'].buffs.length,0);
});
