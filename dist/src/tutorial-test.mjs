import {openAdventureBattle} from './app.mjs';
import {createLevelBattle} from './level-test.mjs';
import {compileTables} from './workbook.mjs';
const $=id=>document.getElementById(id);
let pack;
const status=text=>$('tutorial-status').textContent=text;
function launch(){try{
 const battle=createLevelBattle(pack,$('level-id').value);
 openAdventureBattle(battle,{label:'教学关测试',exitLabel:'返回教学测试',onChange:()=>{},onVictory:()=>false,onExit:()=>{location.href='tutorial.html?level='+encodeURIComponent($('level-id').value);}});
 $('back-home').textContent='返回教学测试';
}catch(e){status(e.message);}}
function accept(next){if(!next.levels?.length)throw Error('工作簿没有关卡');pack=next;$('level-id').replaceChildren(...pack.levels.map(l=>new Option(l.name+' · '+l.id,l.id)));const id=new URLSearchParams(location.search).get('level');if(pack.levels.some(l=>l.id===id))$('level-id').value=id;$('tutorial-start').disabled=false;status('配置已载入。可直接开始，或导入修改后的三表 Excel。');}
$('tutorial-start').onclick=launch;
$('tutorial-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});const tables=Object.fromEntries(wb.SheetNames.map(n=>[n,window.XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})]));accept(compileTables(tables,null,{levelOnly:true}));}catch(err){status('导入失败：'+err.message);}};
try{const r=await fetch('data/tutorial.json',{cache:'no-store'});if(!r.ok)throw Error('教学配置读取失败');accept(await r.json());}catch(e){status(e.message);}
