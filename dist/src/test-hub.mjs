import {playDialogue,isDialoguePlaying} from './dialogue-player.mjs';
import {cases,TEST_KEY,createSession,decodeSession,advanceSession} from './test-hub-model.mjs';
import {dialogueFrame} from './dialogue.mjs';
const $=id=>document.getElementById(id);
let pack=null,session=null,busy=false,error='';
function render(){
 $('resume').disabled=!session||session.finished||busy;$('restart').disabled=!session||busy;
 for(const b of $('cases').children){b.disabled=!pack||busy;b.setAttribute('aria-pressed',String(b.dataset.case===session?.scenario));}
 $('test-scene').classList.toggle('battle-scene',session?.scene==='battle');$('scene-label').textContent=session?.scene==='battle'?'战场场景 · 流程模拟':'地图场景';
 $('scene-probe').textContent='场景按钮 · 点击 '+(session?.sceneClicks||0)+' 次';
 const a=session?.run.dialogueProgress?.active;
 $('status').textContent=error||(!session?'选择右侧用例开始测试':session.finished?'测试已结束 · '+cases[session.scenario].name:'测试中 · '+cases[session.scenario].name);
 $('detail').textContent=session?`${a?'当前对白 '+a.id+' · 句序 '+dialogueFrame(session.run.pack,a).order:'流程步骤 '+session.step} ｜ 完成接续 ${session.continuations} 次 ｜ 场景按钮 ${session.sceneClicks} 次${session.finished?' ｜ 结果 '+session.run.status+' · 金币 '+session.run.gold:''}`:'测试结果不会自动标记为人工验收通过。';
}
function save(){
 try{localStorage.setItem(TEST_KEY,JSON.stringify(session));error='';}catch(e){error='测试断点保存失败：'+e.message;}
 render();
}
async function play(restored=false){
 if(!session||busy||session.finished)return;busy=true;render();
 let restoreNext=restored;
 try{await advanceSession(session,(id,phase)=>{const resume=restoreNext;restoreNext=false;return playDialogue(id,{run:session.run,phase,save,restored:resume});},save);}catch(e){error='测试暂停：'+e.message;}
 finally{busy=false;render();}
}
for(const [id,c] of Object.entries(cases)){
 const b=document.createElement('button');b.className='case-button';b.dataset.case=id;b.disabled=true;
 const title=document.createElement('strong');title.textContent=c.name;const detail=document.createElement('small');detail.textContent=c.description;b.append(title,detail);
 b.onclick=()=>{if(busy)return;error='';session=createSession(pack,id);save();play();};$('cases').append(b);
}
$('resume').onclick=()=>play(true);
$('restart').onclick=()=>{if(!session||busy)return;session=createSession(pack,session.scenario);save();play();};
$('scene-probe').onclick=()=>{if(isDialoguePlaying()||busy)return;if(session){session.sceneClicks++;save();}else{$('status').textContent='先选择一个测试用例，再检查底层按钮是否穿透。';}};
try{
 const response=await fetch('data/pve-test.json');if(!response.ok)throw Error('测试内容加载失败');pack=await response.json();
 const raw=localStorage.getItem(TEST_KEY);if(raw){try{session=decodeSession(raw);}catch(e){error='原测试断点保留但未载入：'+e.message;}}
 render();if(session&&!session.finished)await play(true);
}catch(e){error=e.message;render();}
