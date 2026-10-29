import {validateCatalog,publicationIssues} from './content.mjs';
export const DRAFT_KEY='swaphero.editor.draft.v1',PLAY_KEY='swaphero.editor.play.v1';
export const events={unit_enter:'单位进场',unit_leave:'单位离场',attack_declared:'宣布攻击',before_damage:'伤害准备',damage_taken:'受到伤害',healed:'获得治疗',attack_end:'攻击阶段结束（双方）',turn_end:'回合结束（双方）'};
export const ops={heal:'恢复生命',deal_damage:'技能伤害',modify_attack:'增加／减少攻击',swap_positions:'场上交换位置'};
export const targets={self:'自身',opposing_unit:'对位敌人',other_allies:'其他友军',lower_ally:'下方友军（1→2→3→1）',rear_ally:'己方战线后方的备战单位',rear_enemy:'敌方战线后方的备战单位'};
export const durations={battle:'本场永久',turn:'当前回合结束前',on_field:'目标留在场上期间'};
export function newId(prefix,list,key){let n=1;while(list.some(x=>x[key]===`${prefix}_${n}`))n++;return `${prefix}_${n}`;}
export function makeSkill(id){return {skill_id:id,name:'新技能',status:'specified',active_zone:'battlefield',passive:null,rules:[],levels:{'1':{amount:1}},stacking:'single_instance',unload_policy:'remove_passive_and_listeners',blockers:[]};}
export function makeCard(id){return {card_id:id,name:'新卡牌',attack:1,health:6,category:'character',status:'specified',blockers:[],slots:[{slot_id:'origin',type:'innate',capacity:1},{slot_id:'skill_1',type:'skill',capacity:1},{slot_id:'skill_2',type:'skill',capacity:1}],skills:[],source_text:'',element:null};}
export function editorIssues(data){
 try{const errors=validateCatalog(data);if(errors.length)return errors;
 const supported=new Set(['skill_id','name','status','active_zone','passive','rules','levels','stacking','unload_policy','blockers']);
 for(const s of data.skills){for(const k of Object.keys(s))if(!supported.has(k))errors.push(`${s.name}：未支持的技能字段 ${k}`);
 for(const r of s.rules)for(const e of r.effects){if(e.op==='swap_positions'&&!(e.target==='lower_ally'&&e.zone==='battlefield'))errors.push(`${s.name}：换位仅支持场上下方友军`);if(e.op!=='modify_attack'&&e.duration!==null)errors.push(`${s.name}：仅攻击变化支持持续时间`);}}
 return errors;
 }catch(e){return ['数据结构有误：'+e.message];}
}
export function makePlaySnapshot(catalog,team){const errors=editorIssues(catalog);if(errors.length)throw Error(errors.join('；'));if(!Array.isArray(team)||team.length!==6||new Set(team).size!==6)throw Error('请选择6张不同卡牌组成测试队伍');for(const id of team){const issues=publicationIssues(catalog,id);if(issues.length)throw Error(`${id}：${issues.join('；')}`);}const copy=structuredClone(catalog);copy.version='editor-'+new Date().toISOString();return {catalog:copy,team:[...team]};}
export function forkSkill(data,card,ref){const skill=data.skills.find(s=>s.skill_id===ref.skill_id);const clone=structuredClone(skill);clone.skill_id=newId('custom_skill',data.skills,'skill_id');clone.name+=' · 副本';data.skills.push(clone);ref.skill_id=clone.skill_id;return clone;}
