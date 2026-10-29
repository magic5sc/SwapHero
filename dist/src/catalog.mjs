import {loadPublishedCatalog} from './release-loader.mjs';
import {validateCatalog,publicationIssues} from './content.mjs';
const root=document.getElementById('catalog-list'),status=document.getElementById('catalog-status');
try{
 const data=await loadPublishedCatalog();const errors=validateCatalog(data);if(errors.length)throw Error(errors.join('；'));
 status.textContent=`配置 ${data.version} · ${data.cards.length} 张 · 数据校验通过；8张已确认，可使用营地第一批卡牌预设A/B`;
 for(const card of data.cards){const item=document.createElement('article');item.className='command-panel';const heading=document.createElement('h2');heading.textContent=`${card.name} · ${card.attack}攻 / ${card.health}血`;item.append(heading);const original=document.createElement('p');original.textContent=card.source_text;item.append(original);const issues=document.createElement('p');const pending=publicationIssues(data,card.card_id);issues.textContent=pending.length?'待完成：'+pending.join('；'):'技能已接入，可在第一批卡牌预设A/B验证；美术与平衡待验收';item.append(issues);const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='查看卡牌与技能配置';const pre=document.createElement('pre');pre.textContent=JSON.stringify({card,skills:card.skills.map(r=>data.skills.find(s=>s.skill_id===r.skill_id))},null,2);details.append(summary,pre);item.append(details);root.append(item);}
}catch(error){status.textContent=`配置错误：${error.message}`;}
