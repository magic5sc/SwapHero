import {refreshPositions,onLeave,finishBuffTurn} from './effects.mjs';
import { normalizeVictoryCondition, combatTarget, ATTACK_ORDER } from './match-rules.mjs';
import {createEnemyPlan,validEnemyPlan,validPlanOperation} from './enemy-plan.mjs';
import { canAttack, createUnit } from './content.mjs';
import { beginOwnerTurn, finishOwnerTurn, collectEvent, collectEvents, collectPhase, drainStack, applyDamage, expireModifiers, otherSide } from './effects.mjs';
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
  return { ruleVersion:2,units, sides, victoryCondition, phase: 'deployment', turn: 'player', actionPoints: 0, winner: null,stack:[],trace:[],contentVersion:catalog?.version||'placeholder',log: [catalog?'技能试验队：顽石、冥守及4张机制测试卡；非正式平衡队伍。':'临时基础卡，无技能；用于验证基础流程。'] };
}
export function prepareEnemyPlan(g){if(g.mode==='pve'&&!g.winner&&!g.error&&g.phase==='action'&&g.turn==='player')g.enemyPlan=createEnemyPlan(g);}
// Old saves used screen-based enemy indices. Preserve their visible positions.
export function upgradeBattle(g){
 if(!g.ruleVersion){const s=g.sides.ai.slots;g.sides.ai.slots=[s[2],s[1],s[0],s[5],s[4],s[3]];g.ruleVersion=2;refreshPositions(g);}
 if(g.mode==='pve'&&!g.enemyPlan)prepareEnemyPlan(g);
 return g;
}
function requireTurn(g, side) { if (g.phase !== 'action' || g.turn !== side || g.winner || g.error || g.stack?.length) throw Error('当前不能操作'); }
export function deploy(g, a, b) { if (g.phase !== 'deployment') throw Error('不在布阵阶段'); g.sides.player.slots = deploySwap(g.sides.player.slots, a, b); }
export function start(g) { if (g.phase !== 'deployment') throw Error('已经开始');upgradeBattle(g); g.phase = 'action'; g.turn = 'player'; g.actionPoints = 2; beginOwnerTurn(g,'player');prepareEnemyPlan(g); }
export function rearrange(g, side, a, b) { requireTurn(g, side); g.sides[side].slots = swapBench(g.sides[side].slots, a, b); }
export function move(g, side, from, to) {
  requireTurn(g, side);
  const s = g.sides[side];
  const r = s.slots[to - 1] === null ? reinforce(s.slots, g.actionPoints, from, to) : exchange(s.slots, g.actionPoints, from, to);
  s.slots = r.slots; g.actionPoints = r.actionPoints; g.units[r.cannotAttackThisTurn].disabled = true;
  g.log.push(`${side === 'player' ? '玩家' : '对手'}：${from} → ${to}`);
  refreshPositions(g);
  for(const event of r.events){collectEvent(g,{type:event.type==='enter'?'unit_enter':'unit_leave',unit:event.unit,side,position:event.position,exchange:r.events.some(e=>e.type==='exit')});if(event.type==='exit'){expireModifiers(g,'on_field',event.unit);onLeave(g,event.unit);}}
  drainStack(g);
}
export function resolveLane(g, side, lane, attackerId, outcome = null) {
  const attacker = g.units[attackerId], own = g.sides[side];
  if (g.winner||g.error||!attacker || !canAttack(attacker) || own.slots[lane - 1] !== attackerId) return false;
  const targetId = combatTarget(g,side,lane)?.id;
  if (!targetId) {
    if(g.victoryCondition==='elimination'){g.log.push(`${attacker.name} 攻击空路，无目标`);return true;}
    own.score++; g.log.push(`${attacker.name} 攻击空路，获得1分`);
    if (g.victoryCondition === 'score_5' && own.score >= 5) {g.winner = side;g.phase='finished';}
  } else {
    const damage=applyDamage(g,attackerId,targetId,Math.max(0,attacker.attack),'combat');
    if(outcome)outcome.damage=damage;
    g.log.push(`${attacker.name} 对 ${g.units[targetId].name} 造成 ${damage} 点伤害`);
  }
  return true;
}
function signalAttackers(g,side,attacks,type){const events=[];for(const {lane,id} of attacks){if(g.sides[side].slots[lane-1]===id&&canAttack(g.units[id]))events.push({type,unit:id,side,position:lane});}collectEvents(g,events);drainStack(g);}
export function endTurn(g, side, onAttack = null, onAttackSettled = null) {
  requireTurn(g, side);
  if (mustReinforce(g.sides[side].slots, g.actionPoints)) throw Error('请先完成强制补位');
  g.actionPoints = 0; g.phase = 'attack';
  const attacks = ATTACK_ORDER.map(lane => ({lane, id:g.sides[side].slots[lane - 1]})).filter(x => x.id && canAttack(g.units[x.id]));
  g.attackStep='declare';signalAttackers(g,side,attacks,'attack_declared');
  if(!g.winner&&!g.error){g.attackStep='prepare';const events=[];for(const {lane,id} of attacks){if(g.sides[side].slots[lane-1]!==id||!canAttack(g.units[id]))continue;const target=combatTarget(g,side,lane);if(target)events.push({type:'before_damage',unit:target.id,side:otherSide(side),position:target.position,source:id});}collectEvents(g,events);drainStack(g);}
  if(!g.winner&&!g.error){
   g.attackStep='damage';
   for(const {lane,id} of attacks){
    const before=onAttack?structuredClone(g):null;
    const outcome=onAttack?{}:null;
    const target=combatTarget(g,side,lane);
    const attacked=resolveLane(g,side,lane,id,outcome);
    if(g.mode==='pve')drainStack(g);
    if(attacked&&onAttack)onAttack({side,lane,attackerId:id,targetId:target?.id??null,targetLane:target?.position??null,damage:outcome.damage??0,before,after:structuredClone(g)});
    if(g.winner||g.error)break;
   }
   drainStack(g);
  }
  if(!g.winner&&!g.error){g.attackStep='end';collectPhase(g,'attack_end');drainStack(g);}
  onAttackSettled?.(g);
  if(!g.winner&&!g.error){collectPhase(g,'turn_end');drainStack(g);}
  expireModifiers(g,'turn');finishBuffTurn(g);finishOwnerTurn(g,side);drainStack(g);
  for (const id of g.sides[side].slots.filter(Boolean)) g.units[id].disabled = false;
  delete g.attackStep;
  if (g.winner) {g.stack=[];g.phase = 'finished'; return;}
  if(g.error)return;
  g.turn = otherSide(side); g.phase = 'action'; g.actionPoints = 2;beginOwnerTurn(g,g.turn);prepareEnemyPlan(g);
}
export function playAI(g, onAttack = null, onMove = null) {
  requireTurn(g, 'ai');
  const perform=(from,to)=>{const before=onMove?structuredClone(g):null;move(g,'ai',from,to);onMove?.({before,after:structuredClone(g),from,to});};
  const reinforceRequired=()=>{while (!g.winner&&!g.error&&mustReinforce(g.sides.ai.slots, g.actionPoints)) {
    const slots = g.sides.ai.slots, from = slots.findIndex((u,i) => i >= 3 && u) + 1, to = slots.findIndex((u,i) => i < 3 && !u) + 1;
    perform(from,to);
  }};
  if(g.mode==='pve'){
   const plan=g.enemyPlan;
   if(plan&&!validEnemyPlan(plan))throw Error('敌方计划存档无效');
   // A pre-release save on the AI turn has no published plan: only default
   // reinforcement is allowed; never invent a new voluntary plan here.
   for(const op of plan?.operations||[]){
    if(g.winner||g.error||g.actionPoints<=0)break;
    if(validPlanOperation(g,op)){
     if(op.type==='exchange')reinforceRequired();
     if(!g.winner&&!g.error&&g.actionPoints>0&&validPlanOperation(g,op))perform(op.from,op.to);
    }else g.log.push('敌方计划操作已失效，跳过');
   }
   delete g.enemyPlan;
  }
  reinforceRequired();
  if(!g.winner&&!g.error)endTurn(g, 'ai', onAttack);
}
