# 教团弓手：程序化箭雨

用途：七支木杆钢头箭从目标左上方加速落下，在单格身体中心附近依次命中，短促金色火花后消散。不是范围伤害，装饰性多箭不增加规则伤害次数。纯代码绘制，无图片和序列帧。

模块：`dist/vendor/pixelfx/src/fx/projectiles/arrow-rain.js`。使用现有 PixelFX 核心，`meta` / `draw(p,t,o)` 接口；支持 palette、seed 及运行时 angle/flip。局部 `(0,0)` 是第一支箭的精确落点，其余六箭落点位于约 ±20 × ±7 像素的小范围。画布 128×160，origin=(78,120)。目标身体中心或空格中心由调用端提供，施法者无需整体位移。

`timing` 秒：release=0、hit=0.38、lastHit=0.56、end=1.25。调用端使用 `timing.hit` 对齐受击表现；这不改变规则伤害结算。游戏使用自己的角色动画和受击表现，不使用上游 stock character act。

## 制作流程与检查（2026-11-11）

阅读 PixelFX 官方 `skills/pixelfx/SKILL.md` 与 `docs/AUTHORING.md`，完整上游仓库提交 `044e12a45dc9cc312cec50ee606dfc98afe5adc2`。先渲染并查看 fire/torch 确认工具正常，运行 list arrow / rain，查看并阅读 projectiles/arrow 与 arcane/star-fall 的渲染和实现。单箭循环不能直接表达单格多箭落下，星雨造型不符，故建立原创模块；复用现有 painter 和 Rng，不拷贝参考效果源码。

在完整上游运行 `node tools/new.mjs projectiles/arrow-rain`，完成三轮 render/view/refine：第一轮确定七箭快速下落与命中；第二轮修复随机数消费位置造成的轨迹不连续，改冷色钢头并缩短白闪；第三轮分层分散横向落点、减弱辉光，加入低透明度落尘，避免一团重叠。最终 `node tools/render.mjs projectiles/arrow-rain --all` 检查全部39帧，`node tools/check.mjs projectiles/arrow-rain`：1 pass，0 fail，0 warnings。

项目自动测试覆盖确定性、种子/调色有效、过程可见、结束空帧和第一箭精确锚点。正式对局演出、两侧和空格、手机模拟布局由集成验收另行记录，不等同手机实机或用户美术验收。

## 正式配置与集成验证

`SwapHero.xlsx` 新增 `cult_archer`（教团弓手，攻击1、生命6、普通可招募角色，复用 `temple_archer` 美术）和一级固定技能 `cult_archer_rain`。用户于2026-11-11明确：仅己方回合结束、备战区触发；对方对应战场空位仍显示箭雨，自己播放施法动作。双方本地备战4/5/6对应敌方战场3/2/1，不转攻其他目标，也不攻击敌方备战。对称位取结算时实际位置。

`effects.mjs` 以临时 WeakMap 观察器输出该技能的真实结算前后快照和空格落点，不写入存档，不延迟规则结算。`app.mjs` 合并普通攻击与技能演出顺序；弓手原位播放既有射箭动作，730ms释放，箭雨第一箭落点切换伤害/击溃快照。装饰七箭只结算一次1点技能伤害。空位仅演出，不扣血、不转移目标。既有进行中周目保持原配置快照，需新周目招募，配置工坊可直接查看新角色。

验证：正式/教学两份工作簿编译与一致性检查通过；全套240项Node测试通过（含18项新增角色规则、2项箭雨及3项演出测试）；game-only构建保留箭雨与所需依赖。Chrome桌面1200宽与390×844 iframe窄屏真实战斗检查双方三条路线、空格、致死移除与结束后恢复操作；Canvas可见像素与落点检测通过，无横向溢出。手机实机与用户美术验收未进行。未修改教学内容、既有普攻特效或旧存档。
