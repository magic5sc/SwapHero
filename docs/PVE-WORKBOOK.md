# 远征配置工作簿

快速写对白使用 `dialogue-editor.html`：按句编辑、自动ID/句序、导出重写Excel，AI辅助任务仅需目标与可选备注。任务包与候选审核接口详见 [对话工坊说明](DIALOGUE-STUDIO.md)。无关附加工作表会保留，编译器忽略它们；直接在线模型生成尚未接入。

技能结构已迁移为11表，旧单行技能工作簿仍可导入。技能、技能效果、结果操作、Buff和Buff效果的字段规范见 [技能配置](SKILL-SCHEMA.md)。包含 Dialogue、DialogueLine 及角色默认立绘、章节/节点/关卡的六处对话入口；详见 [对话配置与恢复](DIALOGUE.md)。图片资源 ID 当前填写已发布的 `assets/...` 图片路径，与战场角色美术 ID 分开。工坊支持搜索、引用预览/跳转、逐句编辑和反向引用查看。
正式源是 `dist/config/SwapHero.xlsx`。Excel 或开发端 `config-editor.html` 均可编辑；编辑器导出的同名文件需替换项目工作簿，提交后供发布使用。在线编辑器支持选技能、六格摆怪、新增/复制、试玩及导入导出。试玩独立于远征存档。

| 工作表 | 填写方式 |
| --- | --- |
| Skill | 每行一个技能整体，包含名称、说明、技能栏和品质。 |
| SkillEffect | 每行一个技能效果，关联SkillID，填写监听范围、触发时机、条件和结果组。 |
| EffectResult | 每行一个结果操作，按组内顺序执行，数值独立按等级配置。 |
| Buff | 状态类型、层数、持续时间、离场处理；数值合并、时长刷新、满层处理、护盾补充分开配置。 |
| BuffEffect | 每行一个Buff自带效果，关联BuffID；其余触发字段与SkillEffect相同，复用EffectResult。 |
| Character | 每行一个角色模板，可使用相同技能ID。初始技能用 SkillID@等级，可学习技能、技能栏用英文逗号分隔。类型 hero / ally / enemy。 |
| Level | 六列前左、前中、前右、备左、备中、备右对应玩家屏幕方向。空白保留空位。胜利规则 elimination / score_5；背景为发布资源下的 assets/ 相对路径；界面标题可留空。 |
| Node | 每行一个候选，同一 NodeID 可以重复。起止层为从1开始的闭区间，空白不限。正整数权重只在当前池、当前层的有效行内比较。 |
| Chapter | 各节点列填写 NodeID。Boss 在普通层数之后一层。地图背景填写 assets/ 相对图片路径。 |

技能奖励按接收者实例及技能去重，显示接收者和替换效果。现有经济和商店参数在单独的 economy.json。进行中周目读取原内容快照，新开周目使用最新工作簿。

发布前在仓库根目录运行 `node scripts/compile-pve.mjs`，然后 `node --test test/*.test.mjs`。生成文件通过校验才被替换。`node scripts/compile-pve.mjs --check` 可检查工作簿和已提交 JSON 是否一致；build-client 构建会自动转换。工作簿与生成文件一起提交。
