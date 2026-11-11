# Buff配置手册

适用版本：buff-lifecycle-v4，2026-11-04。以本页说明的现有实现为准；示例是配置用例，不是新增正式卡牌。

同步Wiki：[Buff配置手册](https://app.notion.com/p/40ee7ee349ad816b8bcdfddc3dcca33d)。

## 1. 先明确：Buff没有等级

用户没有定义“Buff效果等级”。上一版实现把首次施加者的技能等级保存在Buff里，用它选择Buff后续效果数值，这是额外引入的规则。本版取消新Buff的这项设计。

- 技能仍有自己的等级。SkillEffect引用的结果读取EffectResult的“等级1／等级2／等级3”。例如技能1级施加攻击+1，2级施加攻击+2，这是技能施加的每层数值不同。
- BuffEffect引用的结果只读取EffectResult的“数值”，不读取技能等级。例如同一个中毒Buff，无论由几级技能施加，每次触发都造成固定1点伤害。
- Buff的层数、每层数值、剩余回合、剩余护盾是不同的运行状态；它们都不是Buff等级。
- Buff自带结果不自动乘层数，也不自动读取施加时的每层数值。要制作不同伤害的中毒变体，当前可以使用不同BuffID；运行时传参、属性公式不在本版能力内。

## 2. 三张表如何连接

Buff每行定义一种状态；BuffEffect每行定义这个状态的一项触发效果；EffectResult每行定义触发后的一步操作。

`Buff.BuffID ← BuffEffect.BuffID`；`BuffEffect.ResultGroupID → EffectResult.ResultGroupID`。

一个Buff可以没有BuffEffect（只提供属性），也可以包含多项效果。一个效果只有一个触发时机和至多一个层数条件，可以对应多步结果。结果组允许复用；实例状态不共享。Buff表不再维护一份效果ID列表。

施加入口通常是已有技能的SkillEffect，通过apply_buff结果给所选格子上的单位挂载Buff。接收者不需要装配施加技能。Buff随单位移动，目前没有格子本身长期挂载的Buff。

正式配置有11张表；教学配置有7张表，只配置到LevelID，不需要Chapter或Node。本次仅增加列，不增加工作表。

## 3. 通用填写规则

- 表头必须保持原样；枚举填下文的英文值，不填中文释义。ID以小写字母开头，后续只用小写字母、数字和下划线，例如 `poison_burst`。
- ID在本表内唯一；EffectResult允许同ResultGroupID多行，但组内顺序不能重复。BuffEffect的EffectID唯一，同BuffID的顺序也不能重复。
- 整行空白会被忽略；部分填空不等于整行空白。数字填整数，0和空白含义不同，不写“3回合”“+2攻”等文字。
- 必填枚举没有“空白代表any”的规则。明确填any。只有下文标注可空的字段才能留空。
- 一次触发先检查条件，再生成有序结果组。条件只检查一次，结果不会因后来条件不满足而自动取消。
- 同结果组按“顺序”从小到大执行，可以用10、20、30留出插入位置。每步使用执行当时的格子占位；新产生的触发在当前结果组执行完后继续处理。

## 4. Buff表：15列逐项说明

| 列 | 怎么填 | 作用、约束与例子 |
| --- | --- | --- |
| BuffID | 必填，唯一ID | 状态类型标识。其他两张表靠它引用，重命名必须同步引用。例：poison_burst。 |
| 名称 | 必填文字 | 战斗状态、日志和说明使用的显示名。例：中毒。 |
| 类型 | 必填，见下一表 | 决定持续属性或护盾机制。每种Buff目前只有一种类型；额外触发行为另配BuffEffect。 |
| 生效区域 | battlefield／bench／any | 单位在战场／备战／任一区域时，持续属性生效；普通战斗事件监听也受此限制。状态不会因区域不符自动消失。自身生命周期事件另按BuffEffect监听区域筛选。 |
| 叠加方式 | add／refresh／max／independent | 只决定实例和层数，详见第5节。不会替代数值合并、时长刷新或护盾补充策略。 |
| 合并范围 | buff／source_skill | buff：相同BuffID合并；source_skill：还必须是相同来源单位、相同来源技能。independent总是新建，合并范围仍需填合法值。 |
| 最大层数 | 必填，整数≥1 | 单个实例的层数上限。多个独立实例的总层数不受这个值共同限制。 |
| 持续时间 | battle／turn／owner_turns | battle本场持续；turn当前任意方回合结束清除；owner_turns按持有者的己方回合末计时。 |
| 持续回合 | owner_turns时必填整数≥1；其他情况留空 | 获得时初始化剩余回合。己方回合中获得且填3，当回合末减为2；第三个己方回合末清除。不是等待完整3轮。 |
| 离场处理 | keep／remove／pause | keep保留且继续计时；remove战场换到备战时整实例移除；pause保留，在备战区暂停owner_turns计时。pause不会暂停turn回合末清除。 |
| 图标 | 可空，资源标识文字 | 预留显示元数据；本版没有Buff图标资源选择器，不保证填入任意路径即显示图片。 |
| 数值合并 | replace／keep／max／min | 重复施加时，每层数值覆盖／保留／取数值较大／较小。首次获得直接使用传入数值。max/min比较带符号数，不比较绝对值。 |
| 时长刷新 | refresh／keep | 重复施加owner_turns时，重置为持续回合／保留剩余回合。首次获得总会初始化；其他持续类型仍填合法值。 |
| 满层处理 | apply／reject | 施加前已满层时，继续应用其他策略／拒绝本次施加。两者都可触发buff_overflow。跨越上限与已经满层的区别见第5节。 |
| 护盾补充 | reset／add／keep | 重复施加时填满新容量／追加本次有效护盾／保留旧余量，均不超过新容量。非shield类型忽略此策略，但仍需填合法值。 |

### 类型与每层数值

| 类型 | 每层数值的用途 |
| --- | --- |
| marker | 只记录层数，例如蓄力、反击准备。施加数值填0。 |
| attack | 每层攻击加减值，可为负整数，最小-9999；总攻击最低为0。 |
| shield | 每层护盾容量，非负整数。容量为每层数值×层数；余量单独扣除。 |
| armor | 每层减少普通战斗伤害的数值；不减少技能伤害或生命流失。 |
| damage_armor | 每层减少战斗伤害和技能伤害的数值；不减少生命流失。 |
| agile | 总有效值大于0时，入场当回合可攻击；通常每层填1。 |
| combat_damage_immunity | 总有效值大于0时，免疫战斗伤害；不免疫技能伤害和生命流失。通常每层填1。 |

护甲及通用减伤先计算，再消耗护盾，剩余伤害扣生命。完全被减免或护盾吸收，不触发damage_taken。生命流失绕过以上防护。

## 5. 叠加策略要分开看

假设已有2层，本次传入3层，上限4：add得到4层；refresh得到3层；max得到3层；independent保留旧2层并新建3层实例。refresh不是“只刷新时间”，它会覆盖层数。

同一实例每层数值只有一个：已有1层、每层+1，再施加1层、每层+3，叠加方式add时，数值合并keep得到2层×1=+2；replace得到2层×3=+6。需要分别保留+1和+3及各自时长，用independent，合计+4。

满层判断发生在施加前。已有2层、上限3、再加5层，截到3层，不触发buff_overflow；已有3层再施加，才触发buff_overflow。reject拒绝这次层数、数值、时长、护盾变化，但配置的溢出结果仍可以执行。apply继续应用策略；refresh甚至可能将满层覆盖为更少层。independent新建实例，不产生已满旧实例的溢出事件。

护盾容量=合并后的每层数值×合并后的层数。首次获得总是填满；重复施加：

- reset：余量设为新容量。首战佣兵用此项，实现每次换入护盾刷新到2。
- add：add叠层模式追加“本次传入每层数值×实际增加层数”，已满层新增0，所以追加0；refresh/max叠层模式追加“本次传入每层数值×本次层数（截到上限）”。
- keep：不主动补盾。无论哪种策略，容量降低后，旧余量最多保留到新容量。

单实例共享时长，暂不支持每一层分别到期。合并后保留首次获得时的行为定义、依赖定义及来源归因；数值和时间按上述独立策略更新。

## 6. BuffEffect表：14列逐项说明

| 列 | 怎么填 | 作用、约束与例子 |
| --- | --- | --- |
| EffectID | 必填，本表唯一ID | 一项触发效果标识。例：poison_expire。 |
| BuffID | 必填，引用Buff表 | 指明哪一种Buff携带这项效果。 |
| 顺序 | 必填，整数≥1 | 同Buff各效果的执行顺序，不得重复。例：10、20。 |
| 监听区域 | battlefield／bench／any | 持有者在哪个区域接收事件。普通事件还需符合Buff生效区域；生命周期只看本列。离场删除时单位已在备战，填bench或any才能接收。 |
| 触发时机 | 必填，见第7节 | 一行一个事件。BuffEffect不能使用passive。 |
| 触发主体 | self／other_ally | 普通事件主体是持有者自己／其他友军。回合开始、回合结束、攻击阶段结束与全部Buff生命周期只允许self。 |
| 回合归属 | own／opponent／any | 相对于持有者所属方筛选当前回合，不是施加者的回合。生命周期必须any。 |
| 入场原因 | exchange／reinforce／any | 只有unit_enter允许exchange或reinforce；其他事件必须any。 |
| 伤害类型 | combat／skill／health_loss／any | 只有damage_taken允许前三项；其他事件必须any。 |
| 条件BuffID | 可空，非空时引用Buff表 | 在持有者身上查询指定状态。一般统计同ID全部实例总层数；生命周期且ID等于本Buff时，读取本次变化实例的层数快照。 |
| 比较 | 有条件时必填gte／eq／lt；无条件留空 | 分别为≥、=、<。只能一个比较条件，不能写表达式。 |
| 条件层数 | 有条件时必填整数≥0；无条件留空 | 例：gte、3表示至少3层。移除或到期事件中本实例层数已经是0；想监听最后移除可用eq、0。 |
| ResultGroupID | 必填，引用非空结果组 | 触发后执行该组全部操作。一个组可以被多个效果复用。 |
| 移除原因 | any／expired／dispelled／leave | 仅buff_removed允许指定后三项；其他时机必须any。expired自然到期；dispelled由remove_buff结果移除；leave由离场处理remove删除。 |

条件是在触发时判断，结果只执行一次。例如6层满足≥3，结果移除3层后剩3层，并不会自动再触发。没有“持续检查直到不满足”规则。

## 7. 触发时机与生命周期边界

### 普通战斗事件

| 枚举 | 何时触发 |
| --- | --- |
| unit_enter | 交换或增援进入战场。初始布阵、战场内换位、备战区内互换不触发。 |
| unit_leave | 战场单位交换离场。保留事件的原战场位置；可接收最后一次离场效果。 |
| turn_start | 一方回合开始，对双方在场及备战单位发阶段事件，再按回合归属和区域筛选。 |
| turn_end | 一方回合结束、持续时间扣减之前，发阶段事件。 |
| attack_declared | 普攻宣布时；主体是攻击者。 |
| before_damage | 普攻伤害前；主体是被攻击者。不是对一切技能伤害的通用拦截事件。 |
| damage_taken | 单位实际损失生命>0时；主体是受伤者。 |
| healed | 单位实际恢复生命>0时；满血治疗不触发。 |
| unit_defeated | PvE单位被击溃时；主体是被击溃者。 |
| attack_end | 一方攻击阶段结束；每单位阶段事件，只允许self。 |

### Buff自身生命周期事件

这些事件只通知发生变化的那个Buff实例，不广播给角色技能、其他Buff或其他同ID实例。全部要求触发主体self，回合归属／入场原因／伤害类型为any。

| 枚举 | 触发条件 | 不会触发的情况 |
| --- | --- | --- |
| buff_added | 首次创建一个实例，状态已加入持有者 | 合并到旧实例；读取存档恢复 |
| buff_reapplied | 重复施加被接受，合并到已有实例，即使层数或数值未改变 | 新建实例；满层reject |
| buff_stack_changed | 实例层数实际改变，包括0变正数、部分移除和归零 | 只补盾、只刷新时长、只改每层数值 |
| buff_overflow | 施加前这个合并实例已经达到上限 | 从未满跨过上限；independent新建 |
| buff_expired | turn回合末清除，或owner_turns剩余回合扣到0 | remove_buff提前移除；离场删除 |
| buff_removed | 整个实例被删除；可按移除原因筛选 | 只移除部分层数；护盾余量归零 |
| buff_shield_depleted | 一次实际护盾吸收使此实例余量从正数降至0 | 0伤害、原本0护盾、减层/降低容量导致归零、删除实例 |

一次状态变更对应的生命周期结果按以下顺序处理：

| 状态变更 | 事件顺序 |
| --- | --- |
| 新建实例 | buff_added，再buff_stack_changed |
| 未满时重复施加 | buff_reapplied；若层数改变，再buff_stack_changed |
| 已满、apply | buff_overflow，再buff_reapplied；若层数改变，再buff_stack_changed |
| 已满、reject | 只有buff_overflow |
| remove_buff移除部分层 | 只有buff_stack_changed |
| remove_buff移除至0 | buff_stack_changed，再buff_removed，原因dispelled |
| 自然到期 | buff_stack_changed，再buff_expired，再buff_removed，原因expired |
| 离场规则删除 | buff_stack_changed，再buff_removed，原因leave |
| 伤害耗尽护盾 | buff_shield_depleted；Buff及层数继续保留 |

注意：上述顺序指同次变更产生的结果组顺序；每组引发的新事件仍按现有堆叠规则，在这组完成后处理。调试trace按入栈记录，可能是反向列表，不能当作结果执行顺序。

自然到期同时包含“到期”和“移除”。若两者都配置相同伤害，会执行两次。只想到期爆炸就只配buff_expired；只想被提前驱散时治疗就配buff_removed＋dispelled。

生命周期读取状态变更后的实例快照；buff_overflow读取本次施加前的满层快照。移除/到期时即使实例已经不在单位身上，仍可用其保存的效果定义触发最后的结果。查询其他BuffID仍读取持有者当前状态。

持续属性区域与生命周期监听分开：一个只在战场提供属性的Buff，离场删除后仍可在备战触发“移除时治疗”，但它的BuffEffect监听区域必须bench或any。

护盾耗尽不等于受伤，也不等于Buff删除。补盾后再次被伤害耗尽，可以再次触发破盾效果。死亡或战斗结束没有额外生成buff_removed；本版不提供复活机制。

回合末先执行turn_end触发链，再批量清理到期状态，再执行到期产生的触发链，然后交接回合。到期效果新施加的Buff不会被当前已完成的清理批次立即再次扣时长。战斗已经结束时不再继续回合推进。

## 8. EffectResult表：12列逐项说明

| 列 | 怎么填 | 作用、约束与例子 |
| --- | --- | --- |
| ResultGroupID | 必填ID，可多行相同 | 对应效果表中的结果组。每个组必须至少被SkillEffect或BuffEffect引用。 |
| 顺序 | 必填，整数≥1，组内唯一 | 执行次序。先移除蓄力再获得攻击Buff，分别填1、2。 |
| 操作 | apply_buff／remove_buff／heal／deal_damage／swap_positions | 具体动作，数值含义见下一表。 |
| 目标 | 必填，见第9节 | 选择格子或self单位。 |
| 目标区域 | battlefield／bench／any | 限制实际接受结果的单位位置。self也受本列限制。 |
| BuffID | apply_buff与remove_buff必填有效ID；其他操作留空 | 要施加或移除的状态。 |
| 层数 | 仅apply_buff必填整数≥1；其他操作留空 | 本次请求施加几层，不是每层数值。remove_buff移除多少层写在数值列。 |
| 等级1 | 结果组被SkillEffect使用时，必填 | 技能1级操作数值；只被BuffEffect使用时留空。 |
| 等级2 | 被最大等级≥2的技能使用时，必填 | 技能2级操作数值，否则可空。 |
| 等级3 | 被最大等级=3的技能使用时，必填 | 技能3级操作数值，否则可空。 |
| 数值 | 结果组被BuffEffect使用时，必填 | 固定操作数值，不随来源技能等级变化；只被SkillEffect使用时留空。 |

| 数值来源 | 可留空或fixed；技能常驻护甲可选other_allies_count | 默认为固定值；动态来源仅适用于SkillEffect常驻护甲，BuffEffect必须fixed。 |

同一组同时被技能和Buff引用时，技能等级列和固定数值列分别填写；两类效果各读自己的列。不要用重复填写三列来表示“Buff等级”。

| 操作 | 读到的数值代表什么 | 其他要求 |
| --- | --- | --- |
| apply_buff | 每层属性数值；marker填0 | 层数列必填。attack允许负数≥-9999，其余非负整数。 |
| remove_buff | 移除层数，整数≥0 | 层数列留空。0不做事；数量不足移除现有层数。按获得顺序消耗持有者所有同ID实例，不只移除来源自身实例。 |
| heal | 生命恢复量，整数≥0 | 不超过最大生命；死亡单位不执行。 |
| deal_damage | 技能伤害量，整数≥0 | 走技能减伤和护盾；不能在此列选择生命流失或普通攻击伤害。 |
| swap_positions | 数值不参与计算，填0通过表格校验 | 将持有者与目标己方战场单位换位；不能换备战或敌方单位，不产生入离场事件。 |

生命周期只限定“谁监听”。结果里的remove_buff仍是按BuffID移除，当前没有“仅移除刚触发的实例”的结果目标参数；来源独立和independent构筑要注意这一点。

## 9. 目标填写对照

| 目标 | 格子选择与区域填写 |
| --- | --- |
| self | 持有者自身单位，是格子目标的明确例外；按实际位置填battlefield／bench／any。 |
| opposing_unit | 持有者当前战场正前方敌方格；填battlefield或any。名字沿用旧枚举，实际不锁定单位。 |
| front_sides | 正前方敌方格的左右邻格，不包含正前方，不跨边缘环绕；填battlefield或any。 |
| lower_ally | 己方循环下一战场格，1→2→3→1；填battlefield或any。 |
| rear_ally | 持有者战线对应的己方备战格；必须bench。 |
| rear_enemy | 持有者战线对应的敌方备战格；必须bench。 |
| all_allies | 己方目标区域全部已占格子。 |
| other_allies | 己方目标区域全部已占格子，排除持有者自己。 |
| all_enemies | 敌方目标区域全部已占格子。 |

每步结果重新读取当前位置和占位。空格跳过；不追踪触发时站在格子上的旧单位。Buff监听和选格锚点是持有者，伤害/治疗的来源归因保留原施加者。没有独立的选格时机或延迟执行时机配置。

需要战线锚点的目标，不适合在普通备战事件中使用。单位自身unit_leave事件可以保留原战场位置；buff_removed离场生命周期发生时已在备战，不能把这个旧战线锚点当作仍然存在。备战状态建议用self或全体区域目标。

## 10. 完整例子：中毒与自然到期爆炸

以下三段CSV分别追加到对应表，列顺序与当前工作簿一致。先添加Buff，再添加BuffEffect和EffectResult；不要覆盖原表。配置完成后，再由已有技能施加 `demo_poison`。

规则：中毒持续2个持有者己方回合；己方回合开始损失1点技能伤害；自然到期对正前方造成2点技能伤害；提前移除不爆炸。合并层数不增加伤害次数。

Buff：

```csv
BuffID,名称,类型,生效区域,叠加方式,合并范围,最大层数,持续时间,持续回合,离场处理,图标,数值合并,时长刷新,满层处理,护盾补充
demo_poison,中毒,marker,any,refresh,source_skill,1,owner_turns,2,keep,,replace,refresh,apply,reset
```

BuffEffect：

```csv
EffectID,BuffID,顺序,监听区域,触发时机,触发主体,回合归属,入场原因,伤害类型,条件BuffID,比较,条件层数,ResultGroupID,移除原因
demo_poison_tick,demo_poison,1,any,turn_start,self,own,any,any,,,,demo_poison_tick,any
demo_poison_expire,demo_poison,2,battlefield,buff_expired,self,any,any,any,,,,demo_poison_burst,any
```

EffectResult：

```csv
ResultGroupID,顺序,操作,目标,目标区域,BuffID,层数,等级1,等级2,等级3,数值,数值来源
demo_poison_tick,1,deal_damage,self,any,,,,,,1,fixed
demo_poison_burst,1,deal_damage,opposing_unit,battlefield,,,,,,2,fixed
```

施加技能的结果组新增一行：操作apply_buff；目标opposing_unit；目标区域battlefield；BuffID=demo_poison；层数=1；等级1／2／3均填0；数值留空。已有SkillEffect引用此组，并按需要配置触发事件。

例如在敌方回合给我方单位施加，之后我方两次回合开始各扣1血，第二次我方回合末到期爆炸。若在我方回合开始之后施加，当回合末已计一次持续时间，可能只经历一次后续回合开始伤害。这是“己方回合末扣时长”的明确规则，不保证固定跳数。

到期时持有者在备战，仍清除中毒，但因爆炸效果监听区域battlefield而不爆炸。如希望备战到期也能造成伤害，可把监听区域改any，并将目标改为all_enemies、区域battlefield；这会改变设计为全体伤害。

## 11. 完整例子：护盾耗尽恢复1血

Buff一行按以下字段填：BuffID=demo_guard；名称=守护盾；类型=shield；生效区域=any；叠加方式=refresh；合并范围=source_skill；最大层数=1；持续时间=battle；持续回合留空；离场处理=keep；图标留空；数值合并=replace；时长刷新=refresh；满层处理=apply；护盾补充=reset。

BuffEffect一行：EffectID=demo_guard_break；BuffID=demo_guard；顺序=1；监听区域=any；触发时机=buff_shield_depleted；触发主体=self；回合归属、入场原因、伤害类型、移除原因均any；条件BuffID、比较、条件层数均空；ResultGroupID=demo_guard_heal。

EffectResult一行：ResultGroupID=demo_guard_heal；顺序=1；操作=heal；目标=self；目标区域=any；BuffID、层数、等级1／2／3均空；数值=1。

施加入口：SkillEffect的unit_enter＋exchange，结果apply_buff、自身、any、demo_guard、1层、技能等级列填2，即可每次交换上场刷新护盾2。破盾后Buff不消失，再次换入补满后可再次破盾治疗。若伤害已经击溃持有者，治疗不复活。

## 12. 首战现有配置怎么读

| 状态 | 核心配置 | 数值来自哪里 |
| --- | --- | --- |
| tutorial_arrival_buff | attack、refresh、1层、owner_turns=3、keep、数值replace、时长refresh | 主角SkillEffect的施加结果，等级列各为1；交换上场获得攻击+1。 |
| tutorial_shield_buff | shield、refresh、1层、battle、keep、护盾reset | 佣兵SkillEffect的施加结果，等级列各为2；交换上场刷新护盾2。 |
| tutorial_retaliation_charge | marker、add，保存受伤次数 | 士兵SkillEffect每次有效受伤施加1层，每层数值0。 |
| tutorial_retaliation_ready | marker，保存反击准备 | 蓄力BuffEffect在己方回合末且蓄力≥3，先移除3层，再施加1层准备。固定数值分别3、0。 |
| tutorial_retaliation_buff | attack、turn | 准备BuffEffect在己方回合开始，先移除1层准备，再获得1层攻击+3。固定数值分别1、3。 |

佣兵常驻护甲1来自SkillEffect的passive装配效果，不是每次入场重新发放的Buff实例，因此不发buff_added。教学没有被改成“到期爆炸”或“破盾治疗”，前述两例仅供策划复用。

## 13. 兼容、排错与当前限制

旧表缺少四项策略列时补入旧行为：数值replace（旧max叠层为max）、时长refresh、满层apply、护盾reset。旧BuffEffect缺移除原因列补any。新表已有这些列却留空，不会自动补默认值。

旧EffectResult缺“数值”列时，只对BuffEffect引用的结果迁移：等级1／2／3完全相同才复制为固定值；不同则报错，要求明确填写，不替策划选择一级或最高级。新生成Buff没有level；旧存档的旧levels只作兼容读取，不作为新的配置入口。

| 症状 | 优先检查 |
| --- | --- |
| 没触发 | 事件是否真的发生、Buff是否还存在、持有者区域、回合归属、层数条件；完全护盾吸收不会产生damage_taken。 |
| 到期不爆炸 | 是否提前移除、是否配成buff_removed＋dispelled、是否在备战却限定battlefield、正前方是否为空。 |
| 到期伤害执行两次 | 是否同时配了buff_expired和buff_removed且没有筛选原因。 |
| 重复施加没有补盾 | 满层reject是否拒绝；护盾补充是否keep；add模式是否实际新增0层。 |
| Buff伤害不随技能升级 | 这是固定“数值”列的预期行为；技能等级只影响技能自己的结果。 |
| 移除后同ID还存在 | 是否只移除部分层，或还有其他来源／独立实例。 |
| 结果数值提示空白 | 技能应填对应等级列；Buff应填数值列。0必须写0，不能留空。 |
| 出现触发链超过256项 | 检查获得时获得自身、重复施加时再次施加、移除时无限重建等循环；系统会暂停，不静默截断。 |

当前不提供：Buff等级、任意公式/条件树、多属性修改项、标签驱散、逐层到期、仅按事件实例移除、格子长期Buff、来源方计时、复活或联网同步。生命周期自身监听已经实现，但不表示完整复刻UE的GE或GAS。

## 14. 导入和验证

正式配置用配置工坊导入、校验并导出；教学7表工作簿从教学测试页导入，再输入LevelID。通用配置工坊仍要求正式配置的章节与节点表，不要用它直接加载7表教学文件。

代码发布时同时编译两份源Excel与生成JSON。自动测试覆盖生命周期、同ID实例隔离、时长、护盾、存档恢复及首战七回合；浏览器交互与手机体验单独验收。

相关入口：[游戏](https://swaphero-play.lamentkddesign.chatgpt.site)、[教学测试](https://swaphero-play.lamentkddesign.chatgpt.site/tutorial.html?level=tutorial_01)、[配置工坊](https://swaphero-play.lamentkddesign.chatgpt.site/config-editor.html)。
