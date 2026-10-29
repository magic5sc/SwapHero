// Shared wire contract. No DOM, storage or editor dependencies.
import {validateCatalog,publicationIssues} from './content.mjs';
export const ENGINE_API=1;
export const CAPABILITIES=['unit_enter','unit_leave','attack_declared','before_damage','damage_taken','healed','attack_end','turn_end','heal','deal_damage','modify_attack','swap_positions','agile','armor','combat_damage_immunity'];
export function usedCapabilities(catalog){return [...new Set(catalog.skills.flatMap(s=>[...(s.passive?[s.passive]:[]),...s.rules.flatMap(r=>[r.event,...r.effects.map(e=>e.op)])]))].sort();}
export function checkCatalog(catalog){
 if(catalog?.schema_version!==1)throw Error('不支持的数据结构版本 '+catalog?.schema_version+'；原文件未修改，请使用兼容的编辑器或显式迁移程序');
 const issues=validateCatalog(catalog);if(issues.length)throw Error(issues.join('；'));
 const keys=['skill_id','name','status','active_zone','passive','rules','levels','stacking','unload_policy','blockers'];
 for(const s of catalog.skills){for(const key of Object.keys(s))if(!keys.includes(key))throw Error('尚未支持的技能字段：'+key);for(const r of s.rules)for(const e of r.effects){if(e.op==='swap_positions'&&(e.target!=='lower_ally'||e.zone!=='battlefield'))throw Error('换位仅支持场上下方友军');if(e.op!=='modify_attack'&&e.duration!==null)throw Error('仅攻击变化支持持续时间');}}
 if(!catalog.cards.length)throw Error('卡牌库不能为空');
 return catalog;
}
export function checkTeam(catalog,team){if(!Array.isArray(team)||team.length!==6||new Set(team).size!==6||team.some(id=>!catalog.cards.some(c=>c.card_id===id)))throw Error('队伍必须包含6个不同且存在的卡牌ID');return team;}
export function normalizeDocument(input){
 if(!input||typeof input!=='object')throw Error('不是有效的配置文件');
 let catalog,team;
 if(input.format==='swaphero-source'){
  if(input.format_version!==1)throw Error('不支持的源文件包版本');
  catalog={...input.catalog_meta,cards:input.cards,skills:input.skills};team=input.team;
 }else if(input.catalog){catalog=input.catalog;team=input.team;}
 else {catalog=input;team=input.teams?.[0]?.cards;}
 if(catalog.content_version){if(catalog.version&&catalog.version!==catalog.content_version)throw Error('内容版本字段不一致');catalog={...catalog,version:catalog.content_version};}
 checkCatalog(catalog);
 if(catalog.requires){if(catalog.requires.engine_api!==ENGINE_API)throw Error('引擎API版本不兼容');if(!Array.isArray(catalog.requires.capabilities)||catalog.requires.capabilities.some(c=>!CAPABILITIES.includes(c)))throw Error('发布包包含当前引擎不支持的能力');}
 return structuredClone({catalog,team:team??catalog.cards.slice(0,6).map(c=>c.card_id)});
}
export function createRelease(catalog,team,version){
 checkCatalog(catalog);checkTeam(catalog,team);if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(version))throw Error('内容版本请使用1至80位英文字母、数字、点、横线或下划线');
 for(const card of catalog.cards){const issues=publicationIssues(catalog,card.card_id);if(issues.length)throw Error(card.name+'：'+issues.join('；'));}
 const release=structuredClone({...catalog,schema_version:1,version,content_version:version,requires:{engine_api:ENGINE_API,capabilities:usedCapabilities(catalog)},teams:[{team_id:'default',cards:[...team]}]});return release;
}
export function readRelease(input){const {catalog}=normalizeDocument(input);if(!input.content_version||!input.requires)throw Error('缺少发布包版本或引擎要求');const actual=usedCapabilities(catalog);if(actual.some(c=>!input.requires.capabilities.includes(c)))throw Error('能力声明遗漏');if(!Array.isArray(catalog.teams)||!catalog.teams.length)throw Error('发布包缺队伍');for(const t of catalog.teams)checkTeam(catalog,t.cards);for(const c of catalog.cards){const issues=publicationIssues(catalog,c.card_id);if(issues.length)throw Error(c.name+'：'+issues.join('；'));}return structuredClone(catalog);}
export function sourceFiles(catalog,team){checkCatalog(catalog);const {cards,skills,...catalog_meta}=structuredClone(catalog);const files={'manifest.json':JSON.stringify({format:'swaphero-source',format_version:1,catalog_meta,card_files:cards.map(c=>'cards/'+c.card_id+'.json'),skill_files:skills.map(s=>'skills/'+s.skill_id+'.json'),team_file:'teams/default.json'},null,2)};for(const c of cards)files['cards/'+c.card_id+'.json']=JSON.stringify(c,null,2);for(const s of skills)files['skills/'+s.skill_id+'.json']=JSON.stringify(s,null,2);files['teams/default.json']=JSON.stringify({team_id:'default',cards:team},null,2);return files;}
export function importSourceFiles(files){const manifest=JSON.parse(files['manifest.json']||'null');if(manifest?.format!=='swaphero-source'||manifest.format_version!==1)throw Error('源文件清单版本不支持');const get=name=>{if(typeof files[name]!=='string')throw Error('源文件缺失：'+name);return JSON.parse(files[name]);};return normalizeDocument({...manifest,cards:manifest.card_files.map(get),skills:manifest.skill_files.map(get),team:get(manifest.team_file).cards});}
