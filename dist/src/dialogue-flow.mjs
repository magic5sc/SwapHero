import {finishBattle} from './pve.mjs';
export async function playOpening(run,play){await play(run.pack.chapters[run.chapter].openingDialogue,'opening');}
export async function playNode(run,play){await play(run.room?.dialogue,'node');}
export async function playBeforeBattle(run,play){
 if(run.battle?.phase==='deployment')await play(run.pack.levels?.find(l=>l.id===run.battle.levelId)?.beforeDialogue,'before');
}
export async function settleBattle(run,battle,play,save){
 if(run.status!=='battle')return;
 if(!battle.winner||battle.stack.length)throw Error('战斗尚未完成');
 run.battle=battle;save();
 const level=run.pack.levels?.find(l=>l.id===battle.levelId);
 await play(battle.winner==='player'?level?.victoryDialogue:level?.defeatDialogue,battle.winner==='player'?'victory':'defeat');
 if(battle.winner==='player'&&run.room.type==='boss')await play(run.pack.chapters[run.chapter].endingDialogue,'ending');
 finishBattle(run,battle);
 if(run.status==='reward')run.battle=battle;
 save();
}
