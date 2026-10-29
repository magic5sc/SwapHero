import fs from 'node:fs';
import {readRelease} from '../dist/src/content-package.mjs';
const file=process.argv[2];
if(!file)throw Error('用法：node scripts/install-release.mjs <导出的发布JSON>');
const release=readRelease(JSON.parse(fs.readFileSync(file,'utf8'))),version=release.content_version;
if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(version))throw Error('非法版本号');
const targets=['content/releases','dist/data/releases'];
for(const dir of targets)if(fs.existsSync(`${dir}/${version}.json`))throw Error('版本已存在，禁止覆盖历史，请修改版本号重新导出');
for(const dir of targets){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/${version}.json`,JSON.stringify(release,null,2)+'\n');}
fs.writeFileSync('dist/data/current.json',JSON.stringify({file:`releases/${version}.json`},null,2)+'\n');
console.log(`已安装 ${version}，提交并部署网页后生效；源文件需另行导入 content/`);
