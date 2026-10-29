// Match goals are exclusive until combination rules are confirmed.
export const VICTORY_CONDITIONS = Object.freeze({score_5:'获得5点胜利点',elimination:'消灭敌方全部单位'});
export function normalizeVictoryCondition(value='score_5') {
  if (!Object.hasOwn(VICTORY_CONDITIONS,value)) throw Error('不支持的胜利条件');
  return value;
}
export const victoryLabel = value => VICTORY_CONDITIONS[normalizeVictoryCondition(value)];
