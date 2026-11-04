# Teaching level: table-driven configuration

Source: `dist/config/Tutorial.xlsx`. Only Skill, Character and Level sheets exist.
The original SwapHero.xlsx, Chapter and Node rows remain unchanged. This content
is an isolated test, not a replacement of the adventure's first encounter.

Run `node scripts/compile-tutorial.mjs` to produce `dist/data/tutorial.json`.
Use `--check` to verify source/output consistency. `tutorial.html` selects a
LevelID (initial example `tutorial_01`), downloads the workbook, or imports an
edited workbook for immediate testing. Import is in-memory, never publication.
No adventure/editor save is read or written. Refresh starts a fresh test.

## Optional generic columns

Skill adds `每N次触发` (positive count), `延后己方回合` (number of owning turns
to skip before a queued effect runs at the next owning turn start),
`仅交换入场` (boolean; excludes initial deployment and reinforcement),
`持续己方回合` (positive duration including entry turn) and `刷新不叠加`.
Effects add `set_shield`, refreshing the consumable shield to the level amount.
The `damage_armor` passive reduces combat and skill damage, before shield
absorption; direct health loss bypasses both. Existing `armor` remains combat-only.
Level adds `我方前左/前中/前右/备左/备中/备右`, referencing Character IDs.
Existing sheets with no new columns retain their original generated output.

Runtime counters, pending effects, shield and modifier durations are serializable.
Counter keys are per unit/skill/rule. Zero effective HP damage does not count.
Pending effects only run while their living source is on the battlefield.
Each queued occurrence is independent; attack refresh replaces an existing
modifier from the same source/skill. Content beyond the confirmed single-enemy
example needs its own design review for overlapping delayed effects.

## Confirmed example

Hero 1/6, swap-entry attack +1 for three own turns (refresh); mercenary 0/10,
swap-entry shield 2 and damage armor 1; soldier 0/7, every three damage events
queues attack +3, skip one own turn, expires at the boosted turn's end.
Player center and reserve center; enemy center. Elimination victory.

Expected soldier HP after player/enemy round pairs: 6,5,4,4,4,2,0. Swap reserve
center into center on turns 4 and 5. Soldier attacks for 3 on its fourth turn,
mercenary loses no HP, hero remains at 6 HP. Turn 7 wins. This is the teaching
path, not a claim of unique optimal play: free deployment and earlier exchanges
remain legal. No tutorial-specific restrictions were added.

Validation: full Node suite and workbook compiler checks; game-only build excludes
teaching UI/data and keeps existing adventure behavior. Browser automation could
not launch in this session; desktop visuals, drag interaction, file-picker import
and physical mobile acceptance remain to be checked.

Design: https://app.notion.com/p/40ee7ee349ad8142a210d5c34ec45cb5
