// Separate artifacts without changing the currently unified hosted preview.
import fs from 'node:fs';import path from 'node:path';
const mode=process.argv[2],out=process.argv[3];if(!['game','developer'].includes(mode)||!out)throw Error('用法：node scripts/build-client.mjs game|developer <new-output-directory>');if(fs.existsSync(out))throw Error('输出目录已存在，请使用新目录');
const excluded=new Set(['editor.html','editor.css','playtest.html','src/editor.mjs','src/editor-model.mjs','src/editor-storage.mjs','src/source-zip.mjs','src/playtest.mjs','data/skill-lab.json']);
fs.cpSync('dist',out,{recursive:true,filter:src=>mode==='developer'||!excluded.has(path.relative('dist',src).split(path.sep).join('/'))});console.log(mode+' artifact: '+out);
