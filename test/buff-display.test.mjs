import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLevelBattle} from '../dist/src/level-test.mjs';
import {start,move,endTurn,playAI} from '../dist/src/battle.mjs';
import {unitBuffBadges} from '../dist/src/buff-display.mjs';
import {grantBuff} from '../dist/src/buffs.mjs';
import {POWER_ATTACK_ICON} from '../dist/src/enemy-plan.mjs';
const pack=JSON.parse(fs.readFileSync('dist/data/tutorial.json'));
const game=()=>{const g=createLevelBattle(pack,'tutorial_01');start(g);return g;};
test('both sides and reserves show real Buffs, passive abilities and retained inactive states',()=>{
 const g=game();const merc=g.units['player-5'];assert.ok(unitBuffBadges(g,merc,5).some(b=>b.name==='护甲'&&!b.active));
 move(g,'player',5,2);const list=unitBuffBadges(g,merc,2);assert.ok(list.some(b=>b.name==='护甲'&&b.active));const shield=list.find(b=>b.name==='举盾接防');assert.ok(shield.lines.includes('剩余护盾 2 / 2'));assert.ok(shield.icon.endsWith('buff-shield.svg'));
 move(g,'player',5,2);assert.ok(unitBuffBadges(g,merc,5).some(b=>!b.active));
});
test('charge layers are numeric only, readiness preserves approved icon and full behavior in details',()=>{
 const g=game();for(let i=0;i<3;i++){endTurn(g,'player');playAI(g);}const u=g.units['ai-2'];const badge=unitBuffBadges(g,u,2).find(b=>b.name==='反击准备');assert.equal(badge.icon,POWER_ATTACK_ICON);assert.ok(badge.lines.some(s=>s.includes('攻击+3')));assert.ok(!badge.lines.join().includes('tutorial_retaliation_release'));
 endTurn(g,'player');playAI(g);assert.ok(!unitBuffBadges(g,u,2).some(b=>b.name==='反击准备'));
});
test('independent Buff instances retain source, layer, duration and zone without mutating battle',()=>{
 const g=game(),u=g.units['player-2'];const d={id:'test',name:'测试状态',kind:'attack',active_zone:'battlefield',stacking:'independent',scope:'source_skill',max_stacks:4,duration:'owner_turns',turns:3,leave:'pause',icon:'assets/status/buff-attack.svg'};
 for(const source of ['player-2','ai-2'])grantBuff(u,d,{source,skillId:'s',value:-2,stacks:2});const before=JSON.stringify(g),list=unitBuffBadges(g,u,5).filter(b=>b.name==='测试状态');assert.equal(list.length,2);assert.notEqual(list[0].key,list[1].key);assert.ok(list.every(b=>b.count===2&&!b.active&&b.lines.includes('攻击 -4')&&b.lines.includes('剩余 3 个己方回合')));assert.ok(list[0].lines.some(l=>l.includes('主角')));assert.ok(list[1].lines.some(l=>l.includes('教团士兵')));assert.equal(JSON.stringify(g),before);
});
test('legacy modifiers, shields and defeated units are represented consistently',()=>{
 const g=game(),u=g.units['player-2'];u.modifiers=[{amount:2,duration:'owner_turns',remaining:1,source:u.id}];u.shield=4;const badges=unitBuffBadges(g,u,2);assert.ok(badges.some(b=>b.lines.includes('攻击 +2')&&b.lines.includes('剩余 1 个己方回合')));assert.ok(badges.some(b=>b.lines.includes('剩余护盾 4 / 4')));u.hp=0;assert.deepEqual(unitBuffBadges(g,u,2),[]);
});
test('unconfigured icon kinds have published fallback assets and invalid image paths never leak',()=>{
 const g=game(),u=g.units['ai-2'];for(const [i,kind] of ['marker','attack','shield','armor','damage_armor','agile','combat_damage_immunity'].entries())grantBuff(u,{id:'type_'+i,name:kind,kind,active_zone:'any',stacking:'refresh',scope:'buff',max_stacks:1,duration:'battle',leave:'keep',icon:'https://external.invalid/a.png'},{source:u.id,skillId:'s',value:2});for(const b of unitBuffBadges(g,u,2)){assert.ok(b.icon.startsWith('assets/'));assert.ok(fs.existsSync('dist/'+b.icon));}
});
