import { deploySwap, swapBench, reinforce, exchange, mustReinforce } from './formation.mjs';

// Placeholder units have no abilities. Each side has six separate instances.
export function createGame() {
  const units = {}, sides = {};
  for (const side of ['player', 'ai']) {
    const slots = Array(8).fill(null);
    for (let i = 0; i < 6; i++) {
      const id = `${side}-${i + 1}`;
      units[id] = { id, name: `基础卡 ${i + 1}`, attack: i % 2 + 1, hp: 10 + i * 2, maxHp: 10 + i * 2, disabled: false };
      slots[i] = id;
    }
    sides[side] = { slots, score: 0 };
  }
  return { units, sides, phase: 'deployment', turn: 'player', actionPoints: 0, winner: null, log: ['临时基础卡，无技能；用于验证基础流程。'] };
}
const other = side => side === 'player' ? 'ai' : 'player';
function requireTurn(g, side) { if (g.phase !== 'action' || g.turn !== side || g.winner) throw Error('当前不能操作'); }
export function deploy(g, a, b) { if (g.phase !== 'deployment') throw Error('不在布阵阶段'); g.sides.player.slots = deploySwap(g.sides.player.slots, a, b); }
export function start(g) { if (g.phase !== 'deployment') throw Error('已经开始'); g.phase = 'action'; g.turn = 'player'; g.actionPoints = 2; }
export function rearrange(g, side, a, b) { requireTurn(g, side); g.sides[side].slots = swapBench(g.sides[side].slots, a, b); }
export function move(g, side, from, to) {
  requireTurn(g, side);
  const s = g.sides[side];
  const r = s.slots[to - 1] === null ? reinforce(s.slots, g.actionPoints, from, to) : exchange(s.slots, g.actionPoints, from, to);
  s.slots = r.slots; g.actionPoints = r.actionPoints; g.units[r.cannotAttackThisTurn].disabled = true;
  g.log.push(`${side === 'player' ? '玩家' : '对手'}：${from} → ${to}`);
}
// A damage-stage lookup uses the current opposite lane, not the declaration-stage target.
export function resolveLane(g, side, lane, attackerId) {
  const attacker = g.units[attackerId], own = g.sides[side], enemy = g.sides[other(side)];
  if (!attacker || attacker.hp <= 0 || attacker.disabled || own.slots[lane - 1] !== attackerId) return;
  const targetId = enemy.slots[lane - 1];
  if (!targetId) {
    own.score++; g.log.push(`${attacker.name} 攻击空路，获得1分`);
    if (own.score >= 5) g.winner = side;
  } else {
    const target = g.units[targetId]; target.hp = Math.max(0, target.hp - attacker.attack);
    g.log.push(`${attacker.name} 对 ${target.name} 造成 ${attacker.attack} 点伤害`);
    if (!target.hp) { enemy.slots[lane - 1] = null; g.log.push(`${target.name} 被击溃`); }
    if (!enemy.slots.some(Boolean)) g.winner = side;
  }
}
export function endTurn(g, side, onAttack = null) {
  requireTurn(g, side);
  if (mustReinforce(g.sides[side].slots, g.actionPoints)) throw Error('请先完成强制补位');
  g.actionPoints = 0; g.phase = 'attack';
  // No abilities are enabled: declaration and pre-damage phases have no effects yet.
  const attacks = [3,2,1].map(lane => ({lane, id:g.sides[side].slots[lane - 1]})).filter(x => x.id && !g.units[x.id].disabled);
  for (const {lane,id} of attacks) { const before = onAttack ? structuredClone(g) : null; resolveLane(g, side, lane, id); if (onAttack) onAttack({side, lane, before, after: structuredClone(g)}); if (g.winner) break; }
  for (const id of g.sides[side].slots.filter(Boolean)) g.units[id].disabled = false;
  if (g.winner) { g.phase = 'finished'; return; }
  g.turn = other(side); g.phase = 'action'; g.actionPoints = 2;
}
export function playAI(g, onAttack = null) {
  requireTurn(g, 'ai');
  while (mustReinforce(g.sides.ai.slots, g.actionPoints)) {
    const slots = g.sides.ai.slots, from = slots.findIndex((u,i) => i >= 3 && u) + 1, to = slots.findIndex((u,i) => i < 3 && !u) + 1;
    move(g, 'ai', from, to);
  }
  endTurn(g, 'ai', onAttack);
}
