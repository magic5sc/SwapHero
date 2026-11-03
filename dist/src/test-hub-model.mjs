import {newRun,enterNode,availableNodes,encodeRun,decodeRun} from './pve.mjs';
import {playOpening,playNode,playBeforeBattle,settleBattle} from './dialogue-flow.mjs';
export const TEST_KEY='swaphero.qa.dialogue.v1';
export const cases={
 input:{name:'逐字与键盘',description:'点击一次补全文字，再点推进；空格和回车同样有效。',dialogue:'qa_input'},
 background:{name:'逐句背景切换',description:'原场景 → 浮岛背景 → 沿用图片 → 恢复原场景。第三句刷新，检查图片继承。',dialogue:'qa_background'},
 portrait:{name:'姓名与左右立绘',description:'检查默认姓名、覆盖姓名、左右位置与旁白。图形仅为测试占位，不是游戏人物。',dialogue:'qa_portrait'},
 unskippable:{name:'不可跳过',description:'没有跳过按钮；Esc不能关闭，仍可补全文字和逐句推进。',dialogue:'qa_locked'},
 victory:{name:'普通战胜利链',description:'章节开场 → 节点 → 战前 → 胜利对白 → 生成奖励。检查只结算一次。',result:'player'},
 boss:{name:'Boss胜利链',description:'开场 → 节点 → 战前 → 胜利对白 → 章末对白 → 全队恢复。',result:'player',boss:true},
 defeat:{name:'失败链',description:'开场 → 节点 → 战前 → 失败对白 → 远征失败。',result:'ai'}
};
const line=(order,text,extra={})=>({order,text,character:'',name:'',portrait:'',side:'left',backgroundAction:'',background:'',...extra});
function fixtures(pack){
 const speaker=pack.hero,other=pack.recruits[0];
 return [
  {id:'qa_input',name:'输入测试',skip:true,lines:[line(10,'这是独立的对话测试。文字显示期间点击一次，会立即补全本句；再点击一次才会进入下一句。你也可以使用空格或回车。'),line(20,'第二句。可以快速点击，检查关闭对话的输入不会按到后面的“场景按钮”。'),line(30,'最后一句。关闭后应返回测试台，完成次数只增加一次。')]},
  {id:'qa_background',name:'背景测试',skip:true,lines:[line(10,'第一句：透明叠加，能看见测试场景与场景按钮。'),line(20,'第二句：显示浮岛背景。',{backgroundAction:'image',background:'assets/sky-islands/sky-arena.png'}),line(30,'第三句：沿用上一句背景。在这里刷新页面，应恢复本句、完整文字和浮岛图片。'),line(40,'第四句：恢复原场景。结束或跳过后不应残留对话背景。',{backgroundAction:'scene'})]},
  {id:'qa_portrait',name:'立绘测试',skip:true,lines:[line(10,'左侧测试立绘，姓名来自角色默认配置。',{character:speaker}),line(20,'同一角色、同一立绘：只更新正文，人物不重新加载。',{character:speaker}),line(30,'现在切换到右侧，使用覆盖姓名与另一张测试立绘。',{character:other,name:'右侧测试员',side:'right',portrait:'assets/dialogue/qa-right.svg'}),line(40,'旁白：姓名与立绘应同时隐藏。')]},
  {id:'qa_locked',name:'不可跳过测试',skip:false,lines:[line(10,'这段对话不允许整段跳过。按Esc不会关闭对话。'),line(20,'请正常推进到最后一句。完成后测试台恢复操作。')]},
  ...[['opening','章节开场：背景仍是地图。'],['node','节点遭遇：候选关卡已经固定；这段结束后才切换场景。'],['before','战前：双方位置已确定；这段结束后才继续。'],['victory','胜利：测试模拟已结束战斗表演；这段结束后才能发奖。'],['defeat','失败：这段结束后才结算远征失败。'],['ending','章节结束：必须在Boss胜利对白之后、全队恢复之前播放。']].map(([phase,text])=>({id:'qa_'+phase,name:'流程 '+phase,skip:true,lines:[line(10,text),line(20,'可以在此刷新测试页，确认当前句恢复与后续流程只推进一次。')]}))
 ];
}
export function createSession(source,scenario){
 const choice=cases[scenario];if(!choice)throw Error('未知测试用例');
 const pack=structuredClone(source);pack.version+='-qa';pack.dialogues=fixtures(pack);
 pack.cards.find(c=>c.card_id===pack.hero).dialoguePortrait='assets/dialogue/qa-left.svg';
 for(const c of pack.chapters){c.openingDialogue=choice.dialogue||'qa_opening';c.endingDialogue='qa_ending';}
 for(const n of pack.nodes)n.dialogue='qa_node';
 for(const l of pack.levels){l.beforeDialogue='qa_before';l.victoryDialogue='qa_victory';l.defeatDialogue='qa_defeat';}
 return {format:'swaphero-dialogue-test',version:1,scenario,run:newRun(pack,'dialogue-test'),step:0,scene:'map',finished:false,continuations:0,sceneClicks:0};
}
export function decodeSession(raw){
 if(typeof raw!=='string'||raw.length>3000000)throw Error('测试断点格式错误');
 const s=JSON.parse(raw),choice=cases[s?.scenario];
 if(s?.format!=='swaphero-dialogue-test'||s.version!==1||!choice||!Number.isInteger(s.step)||s.step<0||s.step>(choice.result?4:1)||!['map','battle'].includes(s.scene)||typeof s.finished!=='boolean'||![0,1].includes(s.continuations)||!Number.isSafeInteger(s.sceneClicks)||s.sceneClicks<0)throw Error('测试断点无效');
 decodeRun(encodeRun(s.run));return s;
}
export async function advanceSession(s,play,save=()=>{}){
 if(s.finished)return;
 const choice=cases[s.scenario],r=s.run;
 while(!s.finished){
  save();
  if(s.step===0)await playOpening(r,play);
  else if(s.step===1){if(r.status==='map'){enterNode(r,availableNodes(r)[0]);if(choice.boss)r.room.type='boss';save();}await playNode(r,play);}
  else if(s.step===2){s.scene='battle';save();await playBeforeBattle(r,play);}
  else if(s.step===3){
   if(r.status==='battle'){
    const b=r.battle;if(!b.winner){b.winner=choice.result;b.phase='finished';const loser=choice.result==='player'?'ai':'player';for(const id of b.sides[loser].slots.filter(Boolean))b.units[id].hp=0;b.sides[loser].slots.fill(null);save();}
    await settleBattle(r,b,play,save);
   }
  }
  s.step++;
  if(s.step===(choice.result?4:1)){s.finished=true;s.continuations=1;}
  save();
 }
}
