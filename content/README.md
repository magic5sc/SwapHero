# 卡牌开发与发布

编辑器入口 /editor.html；正式游戏 /；开发试玩 /playtest.html。
当前同站点分入口，不构成权限隔离。正式游戏不读取编辑器 localStorage，也不显示开发入口。

## 内容来源

manifest.json、cards/、skills/、teams/ 为可版本控制的源文件；releases/ 为不可覆盖的发布快照。
编辑器的“源文件 ZIP”包含上述源文件，支持重新导入；ZIP 使用 STORE 格式，仅保证本编辑器导出的包可回读。解压源包到 content/ 时保留已有 releases/。
正式游戏通过 dist/data/current.json 指向 dist/data/releases/ 的发布 JSON。
浏览器仅存工作草稿和最近10次保存前的历史。旧 swaphero.editor.draft.v1 自动迁移，保留原键与原始备份。清空浏览器、换设备或更换域名需通过外部文件恢复；没有云同步。

## 发布（仓库根目录运行）

1. 编辑、保存、试玩，导出源文件 ZIP 并纳入版本控制。
2. 从源文件生成新版本：`node scripts/publish-content.mjs content cards-0.2.1`。
   或从编辑器导出游戏发布 JSON，再执行 `node scripts/install-release.mjs /path/to/cards-0.2.1.json`。该路径只安装发布包，不回写源定义，源 ZIP 需另行保管。
3. 运行 `node --test test/*.test.mjs`，提交源文件与发布包、部署站点。编辑器导出本身不会更新线上内容。

旧版本不可覆盖。回滚时将 dist/data/current.json 的 file 改为已存在并通过校验的 releases/<旧版本>.json，然后提交部署；保留新旧发布文件。

## 双端打包

`node scripts/build-client.mjs game /new/path/game` 生成不含编辑器和试玩页的玩家包。
`node scripts/build-client.mjs developer /new/path/developer` 生成含试玩的开发包。
输出目录必须不存在。当前托管仍为同一私人站点；独立域名和开发端鉴权未实施。

## 兼容约定

schema_version 控制结构；content_version 标识内容快照；requires.engine_api 与 capabilities 声明运行需求。
已支持旧裸 catalog、{catalog,team} 草稿及当前源包/发布包；未知结构或能力明确拒绝并保留原始文件，不静默丢字段。未来 schema 升级必须新增迁移与回归测试，不能承诺未知未来引擎直接兼容。
稳定 card_id/skill_id 不随显示名称修改。对局使用数据副本，草稿编辑不热改正在运行的对局。

完整最新 UI 在站点源仓库；公开 GitHub 尚有历史 UI 分歧，合并前须比对，不能覆盖浮岛美术、Spine 或新编辑器。

## 美术资产库（2026-10-29）

资产定义放在 `manifest.json` 的 `catalog_meta.art_assets`，会随源 ZIP 和发布 JSON 保留；正式图片、Spine JSON/atlas/runtime 在 dist/assets 和 dist/vendor 中，由程序发布管理。源 ZIP 不包含图片或骨骼二进制素材，跨工程迁移还需复制对应资源目录。

角色和特效分开登记。稳定 asset_id 不随名称修改；角色 animations 至少包含 idle、attack。卡牌用 art_id 引用角色、attack_effect_id 引用攻击特效，null 表示旧占位/无特效。对局开局复制资产定义，编辑草稿不热改已开局对局。

```json
{
  "schema_version": 1,
  "characters": [{"asset_id":"knight","name":"蓝披风剑士","type":"character","renderer":"spine_builtin","rig":"knight","animations":{"idle":"idle","attack":"attack"}}],
  "effects": [{"asset_id":"pixel_slash","name":"像素斩击","type":"effect","renderer":"css","preset":"slash","color":"#fff2ab","duration_ms":350}]
}
```

编辑器卡牌基本字段增加“引用角色”“攻击特效”，右侧可预览攻击；页面底部“美术资产库”可编辑完整 JSON，新增/复制/改名角色定义与特效参数。应用后保存草稿或导出；被卡牌引用的资产不可直接删到悬空。现有旧草稿保持原设置，不自动强塞角色绑定。

当前 renderer 支持已注册6种 spine_builtin 骨骼（knight/moon-mage/sun-mage/captain/penguin/dragon），动画映射可使用其 idle/attack/hit/enter/exit/defeat。用户需求仅暴露待机与攻击槽；其余运行演出保留。特效支持 CSS 参数化 slash/burst，颜色和100–3000ms时长。尚未实现外部Spine素材上传、通用路径加载、特效序列帧/Spine加载、资源文件浏览器或云上传。后续增加渲染器须同时扩展验证、资源加载、打包和兼容测试，不接受只填写路径却假装已经生效。

当前8张官方卡配置了占位角色与pixel_slash，数值/技能未变；只用于验证引用生效，不代表最终美术装配已验收。

## 刀光命中粒子（2026-10-29）
特效 pixel_slash 使用 particles 渲染器，128×128 Canvas，duration_ms、color、angle_deg（-180～180）、particle_count（0～48）可配置。旧 css/slash 定义仍兼容粒子播放，不改旧草稿。effects.html 可慢放、逐帧、调参及复制定义；调整不会自动写入卡牌数据。命中特效在受击者扣血阶段播放；规则结算不变。

小火球命中资产 pixel_fireball_hit：particles/fireball，默认480ms与18火星。独立火焰团、火星及烟粒；effects.html?preset=fireball直接预览。未更改现有卡牌引用；旧草稿需将复制的定义添加到effects数组，再选择该特效。
