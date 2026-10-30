// Match goals are exclusive until combination rules are confirmed.
export const VICTORY_CONDITIONS = Object.freeze({score_5:'获得5点胜利点',elimination:'消灭敌方全部单位'});
export function normalizeVictoryCondition(value='score_5') {
  if (!Object.hasOwn(VICTORY_CONDITIONS,value)) throw Error('不支持的胜利条件');
  return value;
}
export const victoryLabel = value => VICTORY_CONDITIONS[normalizeVictoryCondition(value)];

// Derived from the goal, never a separately configurable saved setting.
export const attackLabel = goal => normalizeVictoryCondition(goal)==='elimination'?'对位优先，空位转攻':'只攻击对位，空位得分';
export function combatTarget(g, side, lane) {
  if (![1,2,3].includes(lane)) throw Error('Invalid attack lane');
  const enemy = g.sides[side==='player'?'ai':'player'];
  const order = normalizeVictoryCondition(g.victoryCondition)==='elimination' ? {1:[1,2,3],2:[2,1,3],3:[3,2,1]}[lane] : [lane];
  for (const position of order) {
    const id=enemy.slots[position-1];
    if(id && g.units[id]?.hp>0) return {id,position};
  }
  return null;
}
