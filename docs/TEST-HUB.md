# Dedicated browser test entry

Enemy-plan fixture: `tutorial.html?level=tutorial_01&scenario=enemy-plan`.
This disposable battle adds a TEST reserve and wounds its enemy front unit;
start deployment to see a real dashed exchange plan, then End Turn to execute it.
It does not write adventure/editor saves or modify either workbook. The regular
teaching entry still tests charge/ready overhead markers and the seven-round path.

Open `tests.html` on the existing Site. It groups the existing duel/skill lab,
card editor and configured playtest, particle previews (slash and fireball),
seven-sheet workshop, published card library, and full PvE route. The card editor
and workshop link back to the hub. Playtest is reached through its owning editor
so it has a valid snapshot rather than a broken direct link.

The new dialogue lab uses the production player and flow helpers with copied test
content. Seven scenarios cover typing/keyboard, inherited backgrounds, left/right
speaker defaults and overrides, narration, unskippable segments, normal victory,
Boss ending and defeat. The TEST SVG silhouettes are interface test fixtures;
they are not approved characters, production portraits or animation assets.

The lab stores only `swaphero.qa.dialogue.v1`, with its own pack snapshot, active
line, scene, workflow step, click probe and continuation count. Refresh resumes the
current dialogue without drawing another encounter or awarding rewards twice.
Workflow scenarios explicitly simulate the combat outcome; they do not claim to
test actual battle presentation. The completed state is not an owner acceptance
badge. Restarting replaces only this disposable lab checkpoint.

Legacy entry links retain their existing storage behavior: PvE uses the adventure
save, editors use drafts, and particle preview adjustments are temporary. The hub
does not automatically open or change those states. No test silently rewrites the
workbook or official cards. Game-only builds exclude the hub, its model, UI and
TEST silhouettes; the developer build and existing unified Site include them.

Run `node scripts/compile-pve.mjs --check` and `node --test test/*.test.mjs`.
The hub model tests validate fixtures, source isolation, all scenarios, mid-result
reload, inherited backgrounds, final-state idempotence and corrupt checkpoint
rejection. Browser and device QA scope is recorded separately in the Wiki.
