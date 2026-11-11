# 圣教冠军

设计来源：[Notion 新卡牌设计](https://app.notion.com/p/408e7ee349ad80aa8110dcbbeb763206)，2026-11-11读取；负责人要求实现该角色。

## 正式配置

- Character ID：`holy_champion`，名称圣教冠军，攻击3、生命20，enemy（Boss内容，不进入招募池）。复用现有 `temple_knight` 骑士造型和既有普攻演出，未生成或替换新美术。
- 虔诚领域：按己方战场和备战区其他存活单位数量动态获得护甲。自己不计入，死亡立即减少；交换场上/备战不影响其他友军数量。沿现有护甲规则只在战场生效、只减普通攻击。
- 炽诚信条：自己每击杀一名敌方单位，获得一个独立的攻击+1 Buff，持续本场、换出保留。实际致死伤害归因，普通攻击/技能均有效，其他单位击杀不触发。保留原施加者的持续Buff沿用同一归因。

Excel 是唯一配置源：`dist/config/SwapHero.xlsx` 的 Character、Skill、SkillEffect、EffectResult、Buff 增加关联行。新“数值来源”列向后兼容，旧表缺列或留空按 fixed。两份工作簿仍使用原编译入口。

## 入口

[直接体验圣教冠军](https://swaphero-play.lamentkddesign.chatgpt.site/tutorial.html?pack=official&level=holy_champion_test) → 开始角色测试 → 完成布阵。

[配置工坊](https://swaphero-play.lamentkddesign.chatgpt.site/config-editor.html) 角色表选择 `holy_champion`；关卡表任意敌方格填入该ID即可。`holy_champion_test` 为独立测试关，未连接章节Node，也未替换现有Boss。旧远征保留旧配置快照。教学Excel不自动增加该角色；官方测试入口显式加载正式配置，导入测试仍仅当前页面生效，不读取或写入远征/编辑器存档。

测试关：敌方冠军＋哨兵＋备战弓手，初始护甲2。可观察随从阵亡后降甲、击杀加攻、既有弓手箭雨。玩家可布阵调整目标。

## 实现与验证

`content.mjs` 动态常驻值；`effects.mjs` 致死归因事件；`skill-tables.mjs` 编译与校验；`buff-display.mjs` 显示即时减伤；`skill-text.mjs` 描述；工坊候选及测试台入口。无角色ID专用战斗规则。

自动测试覆盖双方人数变化、换位、死亡、0护甲、普通/技能伤害区分、预览无副作用、真实击杀/友伤/他杀、连续击杀、备战触发、持续Buff归因、保存恢复、Excel引用及独立关卡。实际测试/提交/发布结果见Wiki当轮交付记录，手机实机和负责人体验不由自动测试代替。
