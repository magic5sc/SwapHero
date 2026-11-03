import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {columns,compileTables} from '../dist/src/workbook.mjs';
const wb=XLSX.read(fs.readFileSync('dist/config/SwapHero.xlsx'),{type:'buffer'});
for(const name of ['Skill','Character','Level','Node','Chapter'])if(!wb.Sheets[name])throw Error('缺少 '+name+' 工作表');
if(!!wb.Sheets.Dialogue!==!!wb.Sheets.DialogueLine)throw Error('Dialogue 与 DialogueLine 必须同时存在');
const tables=Object.fromEntries(Object.keys(columns).filter(name=>wb.Sheets[name]).map(name=>[name,XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''})]));
const result=compileTables(tables,JSON.parse(fs.readFileSync('dist/config/economy.json')),{assetExists:path=>fs.existsSync('dist/'+path)});
for(const [name,items,col] of [['Level',result.levels,'场景背景'],['Chapter',result.chapters,'地图背景']]){
 items.forEach((item,i)=>{if(item.background&&!fs.existsSync('dist/'+item.background))throw Error(name+' 第'+(i+2)+'行 ['+col+'] 缺少图片 '+item.background);});
}
const output=JSON.stringify(result,null,2)+'\n',path='dist/data/pve-test.json';
if(process.argv.includes('--check')){
 if(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n')!==output)throw Error('生成数据过期；运行 node scripts/compile-pve.mjs');
}else{fs.writeFileSync(path+'.tmp',output);fs.renameSync(path+'.tmp',path);}
console.log('工作簿校验通过，'+result.skills.length+' 个技能，'+result.cards.length+' 个角色，'+result.levels.length+' 个关卡，'+result.dialogues.length+' 段对话');
