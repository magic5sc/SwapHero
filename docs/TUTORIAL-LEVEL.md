# Teaching level: table-driven configuration

Source: `dist/config/Tutorial.xlsx`. Skill/Buff definitions are split across five sheets; Character and Level complete the workbook.
SwapHero.xlsx is also migrated; existing Character, Level, Chapter, Node and dialogue values are retained. This content
is an isolated test, not a replacement of the adventure's first encounter.

Run `node scripts/compile-tutorial.mjs` to produce `dist/data/tutorial.json`.
Use `--check` to verify source/output consistency. `tutorial.html` selects a
LevelID (initial example `tutorial_01`), downloads the workbook, or imports an
edited workbook for immediate testing. Import is in-memory, never publication.
No adventure/editor save is read or written. Refresh starts a fresh test.

## Skill effects and Buffs

See [skill schema](SKILL-SCHEMA.md). The source now has Skill, SkillEffect,
EffectResult, Buff, BuffEffect, Character and Level. Chapter/Node remain unnecessary.
Every skill owns multiple effects; each effect has a trigger, conditions and an
ordered result group. Result operations grant/remove Buffs, heal, damage or move.
The soldier's skill accumulates charge on damage. Charge's BuffEffect converts
three layers to a ready Buff at its turn end; ready's BuffEffect consumes ready
to grant attack at its next turn start. The behavior travels with each Buff.
No newly configured skill uses a hidden counter or delayed execution queue.
Player initial positions still live in Level's 我方六格 columns.

## Confirmed example

Hero 1/6, swap-entry attack +1 for three own turns (refresh); mercenary 0/10,
swap-entry shield 2 and damage armor 1; soldier 0/7, every three damage events
uses charge/ready Buffs to grant attack +3 on the fourth enemy turn, expiring at that turn end.
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
