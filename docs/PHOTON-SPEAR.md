# 螺旋光矛与光子爆炸
独立入口：`dist/photon-spear.html`；测试台顶部按钮与功能卡片可进入。旧横向、纵向预览保持。
原创特效：`dist/vendor/pixelfx/src/fx/holy/spiral-photon-spear.js`；沿用 PixelFX 核心 MIT 绘制器，不使用生成图片或序列帧。
0–0.45秒聚光，0.45–1.10秒双螺旋光矛向上飞行；1.10秒目标胸前爆炸，白色核心、八向放射、扩散环与42个种子固定的碎光，2.8秒前消散。
页面控制器 `dist/src/photon-spear.mjs` 读取同一 timing；攻击者脚点固定(320,390)，目标脚点(320,190)，受击向上14像素再恢复。正式技能、配置和存档不变，game-only排除本页。
## 制作与复现
在完整 patch-gg/pixelfx 仓库运行：
```sh
node tools/new.mjs holy/spiral-photon-spear
# 将项目特效代码复制覆盖到 src/fx/holy/spiral-photon-spear.js
node tools/render.mjs holy/spiral-photon-spear --all
node tools/check.mjs holy/spiral-photon-spear
```
已执行创建、三轮以上渲染/视觉修订和最终check（1通过，0失败，0警告）。未导出图集，页面实时绘制代码。
Chrome检查：入口、飞行/命中/消散、倒拖同刻像素一致、逐帧、换色、换角色、390px无溢出、无资源错误通过。202项Node回归通过。手机实机与负责人美术验收待完成。


当前入口已合并到 pixelfx-vertical.html?effect=spear，原独立链接自动跳转。飞行距离与命中中心依据实际角色轮廓和格位测量，不再使用固定舞台坐标。详见 PIXELFX-PREVIEW.md 的锚点修正记录。
