import {createLevelBattle} from './level-test.mjs';
// Explicit disposable interface fixture, never a workbook or adventure edit.
export function createTurnPlanFixture(pack,levelId){
 const g=createLevelBattle(pack,levelId),id=g.sides.ai.slots[1];
 if(!id)throw Error('轮换测试需要教学关中路敌人');
 const reserve=structuredClone(g.units[id]);reserve.id='qa-enemy-reserve';reserve.name='TEST 后备';reserve.skills=[];reserve.buffs=[];reserve.attack=0;reserve.baseAttack=0;
 g.units[reserve.id]=reserve;g.sides.ai.slots[4]=reserve.id;g.units[id].hp=2;
 g.title='TEST · 敌方轮换预告';g.log.push('一次性界面测试：残血中路敌人与后备；不修改正式Excel或远征存档。');return g;
}
