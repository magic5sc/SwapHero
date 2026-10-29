// node scripts/publish-content.mjs <source directory> <new content version>
import fs from 'node:fs';import path from 'node:path';
import {importSourceFiles,createRelease} from '../dist/src/content-package.mjs';
const source=process.argv[2]||'content',version=process.argv[3];if(!version)throw Error('用法：node scripts/publish-content.mjs content cards-0.2.1');
const files={};const m=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));for(const name of ['manifest.json',...m.card_files,...m.skill_files,m.team_file]){if(!/^(manifest\.json|(?:cards|skills|teams)\/[a-z][a-z0-9_]*\.json)$/.test(name))throw Error('非法源文件路径');files[name]=fs.readFileSync(path.join(source,name),'utf8');}
const {catalog,team}=importSourceFiles(files);const release=createRelease(catalog,team,version);const text=JSON.stringify(release,null,2)+'\n';
// Default official roster retains its second preset when all references exist.
const b=['wan_shi','sheng_wei','jie_de','jian_yan','ming_shou','wu_shang'];if(b.every(id=>catalog.cards.some(c=>c.card_id===id)))release.teams.push({team_id:'alternate',cards:b});
for(const folder of ['content/releases','dist/data/releases'])if(fs.existsSync(path.join(folder,version+'.json')))throw Error('该版本已存在，请使用新的版本号；历史发布包不允许覆盖');
for(const folder of ['content/releases','dist/data/releases']){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,version+'.json'),JSON.stringify(release,null,2)+'\n');}
fs.writeFileSync('dist/data/current.json',JSON.stringify({file:'releases/'+version+'.json'},null,2)+'\n');console.log('内容发布包已生成：'+version+'；网页部署后生效');
