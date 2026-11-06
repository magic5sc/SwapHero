// Separate artifacts without changing the currently unified hosted preview.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';
const mode=process.argv[2],out=process.argv[3];if(!['game','developer'].includes(mode)||!out)throw Error('用法：node scripts/build-client.mjs game|developer <new-output-directory>');if(fs.existsSync(out))throw Error('输出目录已存在，请使用新目录');
execFileSync(process.execPath,['scripts/compile-tutorial.mjs'],{stdio:'inherit'});
const excluded=new Set(['tutorial.html','src/tutorial-test.mjs','src/level-test.mjs','data/tutorial.json','dialogue-editor.html','dialogue-editor.css','src/dialogue-studio.mjs','src/dialogue-studio-model.mjs','tests.html','test-hub.css','src/test-hub.mjs','src/test-hub-model.mjs','assets/dialogue/qa-left.svg','assets/dialogue/qa-right.svg','config-editor.html','config','vendor/xlsx','src/workbook.mjs','src/config-editor.mjs','editor.html','editor.css','playtest.html','src/editor.mjs','src/editor-model.mjs','src/editor-storage.mjs','src/source-zip.mjs','src/playtest.mjs','data/skill-lab.json']);
execFileSync(process.execPath,['scripts/compile-pve.mjs'],{stdio:'inherit'});
excluded.add('src/turn-plan-lab.mjs');
for(const p of ['pixelfx-vertical.html','pixelfx-vertical.css','src/pixelfx-vertical.mjs','pixelfx-preview.html','pixelfx-preview.css','src/pixelfx-preview.mjs','vendor/pixelfx'])excluded.add(p);
fs.cpSync('dist',out,{recursive:true,filter:src=>mode==='developer'||!excluded.has(path.relative('dist',src).split(path.sep).join('/'))});console.log(mode+' artifact: '+out);
