import {createUnit,validateCatalog} from './content.mjs';
export function createLevelBattle(pack,levelId){
 const errors=validateCatalog(pack);if(errors.length)throw Error(errors.join('；'));
 const level=pack.levels?.find(l=>l.id===levelId);if(!level)throw Error('找不到关卡 '+levelId);
 if(!level.playerSlots?.slice(0,3).some(Boolean))throw Error('关卡没有配置我方前排');
 const units={},sides={};
 for(const [side,layout] of [['player',level.playerSlots],['ai',level.slots]]){
  if(layout?.length!==6)throw Error('关卡站位必须有六格');
  sides[side]={score:0,slots:layout.map((card,i)=>{if(!card)return null;const id=side+'-'+(i+1);units[id]=createUnit(pack,card,id);return id;})};
 }
 return {units,sides,mode:'pve',levelId,background:level.background,title:level.title||level.name,victoryCondition:level.victoryCondition,phase:'deployment',turn:'player',actionPoints:0,winner:null,stack:[],trace:[],log:['独立关卡测试 · '+levelId],contentVersion:pack.version};
}
