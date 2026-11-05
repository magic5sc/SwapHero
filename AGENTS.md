# SwapHero AI development entry

Project details and AI entry: https://app.notion.com/p/407e7ee349ad815f9d78ed0642f5ac0e
Planning: https://app.notion.com/p/407e7ee349ad81c1b694e182eb04a519
Art: https://app.notion.com/p/407e7ee349ad81019a3fc5d0d5072e57
Programming: https://app.notion.com/p/407e7ee349ad81549193ea30c3beec3e
Detailed programming guide: https://app.notion.com/p/407e7ee349ad81fa94bdde2abcc25750

Before project work, read the project details entry, the relevant planning, art and/or programming pages, and task-relevant current Wiki sources when Notion access is available. If it is unavailable, state what could not be verified; do not invent product rules.

Code source: https://github.com/magic5sc/SwapHero. Read the current repository and instructions before changes. V1 is a browser-based local player-versus-AI game, with desktop mouse and mobile touch support; multiplayer is later. Official first-batch cards and separate testing cards exist; incomplete mechanics remain marked explicitly. Preserve confirmed rules and distinguish unconfirmed rules from temporary implementation decisions.

Rules: https://app.notion.com/p/406e7ee349ad81c2a7ecfdc573c7c606
Owner and developer TODO: https://app.notion.com/p/406e7ee349ad81dba957ccd117266405
Architecture: https://app.notion.com/p/406e7ee349ad810b8037c980ff2423f9

Run relevant checks, currently `node --test test/*.test.mjs`. Report what was actually tested and any limits. After changes, maintain the Wiki's separate owner/developer TODOs, implementation record and continuation prompt. For web changes, update the existing public test site through the supported workflow, preserving access. Follow the current user's instructions and runtime permissions.

## Project-specific rules and status

- V1 is a browser-based local player-versus-AI battle; online multiplayer is later. Use the permitted low-attack, high-health, ability-free placeholder cards until card ambiguities are resolved.
- Each side has three field positions and three corresponding reserve positions (1↔4, 2↔5, 3↔6); exchanges may cross lanes. Both sides number their own left-to-right positions 1→2→3. Player-screen enemy rows render 3,2,1 (reserve 6,5,4); opposing lanes are 1↔3, 2↔2, 3↔1.
- Player acts first. When a side has no field unit, a reserve unit and action points, it must reinforce one unit before ending its turn. With any field unit present, further reinforcement is optional. Each reinforcement costs one point; leave remaining vacancies when points run out. Bench swaps cost no points and do not emit entry/exit triggers.
- Units entering the field cannot attack that turn, except those with agility. Attacks resolve in each side's local position order 1→2→3; score_5 attacks only the mirrored opposing lane. Elimination enemy-local search priorities for attackers 1/2/3 are 3→2→1 / 2→3→1 / 1→2→3 at damage resolution, never to reserves.
- Match goals are configurable: five victory points or eliminating all enemy units, including reserves; the agreed all-units-defeated loss and no-progress draw must be handled according to the current confirmed Wiki rules. Automatic draw and complex effects are not complete.
- Attack and hit presentation are sequential. After each unit's attack, a target at 0 HP dies and disappears immediately; do not keep dead cards until the phase or both sides finish attacking. Preserve full effect-chain settlement and subsequent target rechecks.
- Current prototype has basic AI and a partial event/ability system. Prioritize verifying a complete placeholder match, action/animation lock, swapping and desktop/mobile input. Do not report unexecuted browser or device tests as passed.

Read current Wiki state before development; this file is a concise fallback, not proof that unresolved rules are settled.

## Current source layout

## Automatic version delivery

After each version passes relevant checks, commit and sync the complete source, required assets, configuration, tests and documentation to https://github.com/magic5sc/SwapHero without asking again for routine submission approval. Check the remote head and preserve existing history and concurrent work; never force overwrite. Do not commit credentials or temporary files. A local or Sites source commit is not GitHub delivery: verify the remote commit and report its link. Publish web versions to the existing public Site and verify deployment separately; document-only changes need no redeployment. Report any failed step accurately.

Serve dist/, edit dist/src/, run node --test test/*.test.mjs. The dist/ tree retains the deployed art/editor/effects; do not restore the old root-level browser files. Current rules support six slots and the rear_ally/rear_enemy skill targets; see README.md. No arbitrary multi-goal combinations are implemented.


## PvE 0.5.0

Current primary flow is PvE with one playable test chapter and a three-chapter
framework. Read docs/PVE-0.5.0.md and current Wiki. Latest owner decision on
2026-10-30: **simultaneous defeat is a player loss**, after the full effect chain.
This overrides older Wiki victory statements. Do not implement artifacts or meta
progression beyond its unavailable entry. Keep the separate test content pack,
editor data, official cards, existing art and single-match duel route intact.

## Tabletop presentation 0.6.0

The 2026-11-06 reference-led pastel UI supersedes the wood/leather/parchment
surface styling; see docs/PASTEL-UI.md. Preserve the live art, transition/input
logic and save boundaries from the tabletop implementation.

Keep live character references, animation rigs, cards and save data separate from UI concept art. Preview cutouts are art-document references only; never substitute them for current game characters without explicit approval. See docs/TABLETOP-0.6.0.md.

## PvE Excel source
For each release run `node scripts/compile-pve.mjs` before tests/build or Sites packaging. Commit the source workbook and generated data together. The workbook and schema guide are linked in docs/PVE-WORKBOOK.md.

## Enemy plans and mirrored turns
Buff presentation is icon-only on the board; use docs/BUFF-DISPLAY.md. Names and
details appear on mouse hover, keyboard inspection or a 500ms touch/pen hold.
Keep icon input isolated from card drag/inspection and preserve instance/source
details, inactive zones, legacy states, safe icon paths and animation locks.
See docs/TURN-PLAN.md. Exchanges resolve immediately in the owner's action phase;
manual end starts the owner's automatic attacks. In PvE, prepare and persist the
enemy plan after player turn-start effects settle, before player control. Execute
that frozen identity-and-slot-bound plan on the AI turn; skip invalid operations
and continue legal later ones. Default mandatory reinforcement still applies.
Never replan on the AI turn. ruleVersion=2 upgrades legacy enemy slot layouts once.
The test hub's explicit enemy-plan scenario is disposable and never edits saves.

## Standalone teaching level configuration
Run `node scripts/compile-tutorial.mjs` for `dist/config/Tutorial.xlsx` as well.
It uses Skill/SkillEffect/EffectResult/Buff/BuffEffect plus Character/Level, with no chapter/node dependency. Buffs carry their own event listeners; stack, magnitude, duration-refresh, cap and shield policies are separate. See docs/SKILL-SCHEMA.md for the current skill schema. Keep its
test entry `tutorial.html` and imports isolated from adventure/editor saves.
See docs/TUTORIAL-LEVEL.md for generic columns and the seven-turn acceptance path.

## Dialogue system
Seven-sheet workbook with backwards-compatible five-sheet loading. See docs/DIALOGUE.md.
Keep dialogue portraits separate from battle art; preserve all six dialogue hooks,
stable node picks, saved trigger/line progress and settlement after the last animation.
The included narrator text is test content; approved story portraits remain separate.

## Dedicated test entry
Use `dist/tests.html` for existing feature entry points and the isolated dialogue
lab; see docs/TEST-HUB.md. The lab uses only `swaphero.qa.dialogue.v1`; never
replace the adventure save or editor drafts with a test session. TEST silhouettes
are interface fixtures, not approved character assets. Game-only builds exclude
the test hub; the unified Site and developer build include it.
Every code delivery must repeat the clickable game URL and relevant test/editor
URLs in its final reply, even when the addresses are unchanged.

## Dialogue authoring
`dist/dialogue-editor.html` is the quick Excel authoring page; see
docs/DIALOGUE-STUDIO.md for the AI task/result and browser-agent interfaces.
Preserve unrelated sheets/formulas/custom columns. AI results stage on a copy and
must not silently apply, publish, invent lore or expose model credentials. The
current page has no standalone model backend. Keep its independent draft key and
exclude authoring assets from game-only builds.
