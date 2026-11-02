import fs from 'node:fs';
import XLSX from '../dist/vendor/xlsx/xlsx.min.js';
import {columns,compileTables} from '../dist/src/workbook.mjs';
const wb=XLSX.read(fs.readFileSync('dist/config/SwapHero.xlsx'),{type:'buffer'});
if(wb.SheetNames.length!==5)throw Error('工作簿需要五张表');
const tables=Object.fromEntries(Object.keys(columns).map(name=>[name,XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''})]));
const result=compileTables(tables,JSON.parse(fs.readFileSync('dist/config/economy.json')));
for(const [name,items,col] of [['Level',result.levels,'场景背景'],['Chapter',result.chapters,'地图背景']]){
 items.forEach((item,i)=>{if(item.background&&!fs.existsSync('dist/'+item.background))throw Error(name+' 第'+(i+2)+'行 ['+col+'] 缺少图片 '+item.background);});
}
const output=JSON.stringify(result,null,2)+'\n',path='dist/data/pve-test.json';
if(process.argv.includes('--check')){
 if(fs.readFileSync(path,'utf8')!==output)throw Error('生成数据过期；运行 node scripts/compile-pve.mjs');
}else{fs.writeFileSync(path+'.tmp',output);fs.renameSync(path+'.tmp',path);}
console.log('五表校验通过，'+result.skills.length+' 个技能，'+result.cards.length+' 个角色，'+result.levels.length+' 个关卡');
