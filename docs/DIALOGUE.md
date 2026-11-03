# Dialogue system — 2026-11-03

Design: https://app.notion.com/p/40ce7ee349ad811286aef55d07594a79

The source workbook now has seven sheets. Old five-sheet workbooks load with no
dialogue. `Dialogue` defines DialogueID, 编辑器名称 and 允许跳过. `DialogueLine`
contains DialogueID, 句序, 正文, 说话角色ID, 显示名覆盖, 立绘ID覆盖, 站位,
背景操作 and 背景图ID. Numeric line orders sort within each dialogue, and may
have gaps for insertion. Empty character means narration. Left/right positions
accept 左/右. Background actions are blank/沿用上一句, 显示图片, 恢复原场景.

Character has 默认对话立绘ID. Chapter has 章节开场对话ID and 章节结束对话ID;
Node has 节点遭遇对话ID on the actual selected candidate row; Level has
战前对话ID, 胜利对话ID and 失败对话ID. Empty entries continue without a modal.
For this implementation, image resource IDs are published `assets/...` image
paths, separate from combat art IDs. The compiler rejects invalid paths and
missing published images. No preview cutouts or combat sheets become portraits.

`dialogue.mjs` owns serializable progress and validation. `dialogue-player.mjs`
renders a transparent modal over the current scene, with an optional background,
portrait, speaker plaque, typewriter text, continue and optional skip. Clicking
once completes typing, then advances; Space/Enter work too. Background inherits
within a segment, resets at each segment, and clears on close. The same image
element is retained between adjacent lines. Reduced motion displays full text.
The modal locks underlying content, consumes closing input and retains a brief
closing guard. Desktop and mobile styles share a nine-slice SVG parchment box
and name plaque. These are UI assets, independent of character animation rigs.

`dialogue-flow.mjs` connects chapter opening, node selection, pre-deployment,
victory, defeat and chapter ending. Node sampling and the stable encounter save
precede dialogue; pre-battle dialogue follows board opening. The existing combat
UI invokes the outcome hook after the last attack/defeat presentation. Victory
dialogue precedes the chest. Boss victory dialogue precedes chapter ending and
recovery. Defeat dialogue precedes failure. Settlement remains in `finishBattle`.

Runs store completed trigger keys and the active ID, phase, index and map scroll
position. Keys distinguish chapter, node instance and trigger phase; separate
runs own separate progress. Reload restores the original scene, line and inherited
background, displaying the current line fully. Completed triggers persist before
the original continuation runs, making a reload between dialogue and settlement
safe. Legacy content snapshots remain intact; only new runs use new dialogue.
This retains the existing local-storage limits and is not cloud synchronization.

The configuration workshop supports searching IDs, seven-table edits, numeric
insertion/reordering, dialogue references with preview/edit links, reverse-reference
listing, character choices and image paths. Export includes all seven sheets.
Preview uses transient progress and does not read/write adventure saves.

The workbook includes explicitly test-only narrator messages for chapter opening,
pre-battle, ordinary victory, defeat and chapter ending. Final story and approved
half-body portrait art are not supplied in this change. All six engine hooks are
available; node dialogue can be configured per candidate without global changes.

Validation: compiler --check, full Node suite, plus dialogue tests for Excel
round trips, five-table compatibility, invalid rows, inherited background restore,
trigger identity, skip policy, fixed node selection, delayed/idempotent rewards,
Boss ordering and failure. Browser scope and deployment references are recorded
in the Wiki; device testing and owner art/story acceptance remain separate.

Right-side dialogue portraits are horizontally mirrored by the image-only CSS rule
(2026-11-03 owner correction). Left-side portraits, names, dialogue text and
backgrounds retain their orientation, including after line changes and reload.
