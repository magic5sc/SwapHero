import { normalizeVictoryCondition } from './match-rules.mjs';
import { canAttack, createUnit } from './content.mjs';
import { collectEvent, collectEvents, collectPhase, drainStack, applyDamage, expireModifiers, otherSide } from './effects.mjs';
import { deploySwap, swapBench, reinforce, exchange, mustReinforce } from './formation.mjs';

export function createGame(catalog=null,team=null,options={}) {
  const victoryCondition=normalizeVictoryCondition(options.victoryCondition);
  if(catalog&&(!Array.isArray(team)||team.length!==6||new Set(team).size!==6))throw Error('技能试验队需要六个不同的配置ID');
  const units = {}, sides = {};
  for (const side of ['player', 'ai']) {
    const slots = Array(6).fill(null);
    for (let i = 0; i < 6; i++) {
      const id = `${side}-${i + 1}`;
      units[id] = catalog?createUnit(catalog,team[i],id):{ id, name: `基础卡 ${i + 1}`, attack: i % 2 + 1, hp: 10 + i * 2, maxHp: 10 + i * 2, disabled: false };
      slots[i] = id;
    }
    sides[side] = { slots, score: 0 };
  }
  return { units, sides, victoryCondition, phase: 'deployment', turn: 'player', actionPoints: 0, winner: null,stack:[],trace:[],contentVersion:catalog?.version||'placeholder',log: [catalog?'技能试验队：顽石、冥守及4张机制测试卡；非正式平衡队伍。':'临时基础卡，无技能；用于验证基础流程。'] };
}
function requireTurn(g, side) { if (g.phase !== 'action' || g.turn !== side || g.winner || g.error || g.stack?.length) throw Error('当前不能操作'); }
export function deploy(g, a, b) { if (g.phase !== 'deployment') throw Error('不在布阵阶段'); g.sides.player.slots = deploySwap(g.sides.player.slots, a, b); }
export function start(g) { if (g.phase !== 'deployment') throw Error('已经开始'); g.phase = 'action'; g.turn = 'player'; g.actionPoints = 2; }
export function rearrange(g, side, a, b) { requireTurn(g, side); g.sides[side].slots = swapBench(g.sides[side].slots, a, b); }
export function move(g, side, from, to) {
  requireTurn(g, side);
  const s = g.sides[side];
  const r = s.slots[to - 1] === null ? reinforce(s.slots, g.actionPoints, from, to) : exchange(s.slots, g.actionPoints, from, to);
  s.slots = r.slots; g.actionPoints = r.actionPoints; g.units[r.cannotAttackThisTurn].disabled = true;
  g.log.push(`${side === 'player' ? '玩家' : '对手'}：${from} → ${to}`);
  for(const event of r.events){if(event.type==='exit')expireModifiers(g,'on_field',event.unit);collectEvent(g,{type:event.type==='enter'?'unit_enter':'unit_leave',unit:event.unit,side,position:event.position});}
  drainStack(g);
}
export function resolveLane(g, side, lane, attackerId) {
  const attacker = g.units[attackerId], own = g.sides[side], enemy = g.sides[otherSide(side)];
  if (g.winner||g.error||!attacker || !canAttack(attacker) || own.slots[lane - 1] !== attackerId) return false;
  const targetId = enemy.slots[lane - 1];
  if (!targetId) {
    if(g.mode==='pve'){g.log.push(`${attacker.name} 攻击空路，无目标`);return true;}
    own.score++; g.log.push(`${attacker.name} 攻击空路，获得1分`);
    if (g.victoryCondition === 'score_5' && own.score >= 5) {g.winner = side;g.phase='finished';}
  } else {
    const damage=applyDamage(g,attackerId,targetId,Math.max(0,attacker.attack),'combat');
    g.log.push(`${attacker.name} 对 ${g.units[targetId].name} 造成 ${damage} 点伤害`);
  }
  return true;
}
function signalAttackers(g,side,attacks,type){const events=[];for(const {lane,id} of attacks){if(g.sides[side].slots[lane-1]===id&&canAttack(g.units[id]))events.push({type,unit:id,side,position:lane});}collectEvents(g,events);drainStack(g);}
export function endTurn(g, side, onAttack = null) {
  requireTurn(g, side);
  if (mustReinforce(g.sides[side].slots, g.actionPoints)) throw Error('请先完成强制补位');
  g.actionPoints = 0; g.phase = 'attack';
  const attacks = [3,2,1].map(lane => ({lane, id:g.sides[side].slots[lane - 1]})).filter(x => x.id && canAttack(g.units[x.id]));
  g.attackStep='declare';signalAttackers(g,side,attacks,'attack_declared');
  if(!g.winner&&!g.error){g.attackStep='prepare';const events=[];for(const {lane,id} of attacks){if(g.sides[side].slots[lane-1]!==id||!canAttack(g.units[id]))continue;const target=g.sides[otherSide(side)].slots[lane-1];if(target)events.push({type:'before_damage',unit:target,side:otherSide(side),position:lane,source:id});}collectEvents(g,events);drainStack(g);}
  if(!g.winner&&!g.error){g.attackStep='damage';for (const {lane,id} of attacks) { const before = onAttack ? structuredClone(g) : null;const attacked=resolveLane(g, side, lane, id);if(g.mode==='pve')drainStack(g);if (attacked&&onAttack) onAttack({side, lane, before, after: structuredClone(g)}); if (g.winner||g.error) break; }drainStack(g);}
  if(!g.winner&&!g.error){g.attackStep='end';collectPhase(g,'attack_end');drainStack(g);}
  if(!g.winner&&!g.error){collectPhase(g,'turn_end');drainStack(g);}
  expireModifiers(g,'turn');
  for (const id of g.sides[side].slots.filter(Boolean)) g.units[id].disabled = false;
  delete g.attackStep;
  if (g.winner) {g.stack=[];g.phase = 'finished'; return;}
  if(g.error)return;
  g.turn = otherSide(side); g.phase = 'action'; g.actionPoints = 2;
}
export function playAI(g, onAttack = null) {
  requireTurn(g, 'ai');
  while (!g.winner&&!g.error&&mustReinforce(g.sides.ai.slots, g.actionPoints)) {
    const slots = g.sides.ai.slots, from = slots.findIndex((u,i) => i >= 3 && u) + 1, to = slots.findIndex((u,i) => i < 3 && !u) + 1;
    move(g, 'ai', from, to);
  }
  if(!g.winner&&!g.error)endTurn(g, 'ai', onAttack);
}
