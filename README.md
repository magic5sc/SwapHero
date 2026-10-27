# SwapHero

网页玩家对 AI 的开发测试版，当前使用无技能、低攻高血的占位卡；正式能力与部分规则尚未实现。

在项目目录运行 `python3 -m http.server 8000`，浏览器访问 http://localhost:8000。需 Python 3；浏览器及移动端尚待实际验收。

运行测试：`node --test test/*.test.mjs`。

- `src/formation.mjs`：编队和换位规则。
- `src/battle.mjs`：基础回合、伤害和简易 AI。
- `src/app.mjs`、`index.html`、`style.css`：网页界面。
- Wiki：https://app.notion.com/p/338e7ee349ad8038a7e2c04c97239345
- 待办：https://app.notion.com/p/406e7ee349ad81dba957ccd117266405
