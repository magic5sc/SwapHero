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

Run relevant checks, currently `node --test test/*.test.mjs`. Report what was actually tested and any limits. After changes, maintain the Wiki's separate owner/developer TODOs, implementation record and continuation prompt. For web changes, update the existing private test site through the supported workflow, preserving access. Follow the current user's instructions and runtime permissions.

## Project-specific rules and status

- V1 is a browser-based local player-versus-AI battle; online multiplayer is later. Use the permitted low-attack, high-health, ability-free placeholder cards until card ambiguities are resolved.
- Each side has three field positions and three corresponding reserve positions (1↔4, 2↔5, 3↔6); exchanges may cross lanes. The prototype presents enemy reserve, enemy field, player field and player reserve vertically. Current left-to-right numbering is not yet a confirmed spatial mapping.
- Player acts first. When a side has a vacant field slot, a reserve unit and action points, it must reinforce before ending its turn. Each reinforcement costs one point; leave remaining vacancies when points run out. Bench swaps cost no points and do not emit entry/exit triggers.
- Units entering the field cannot attack that turn, except those with agility. Agility is implemented; verify current tests. Attacks resolve in position order 3→2→1; damage and empty-lane scoring use the opposing lane at damage resolution.
- Match goals are configurable: five victory points or eliminating all enemy units, including reserves; the agreed all-units-defeated loss and no-progress draw must be handled according to the current confirmed Wiki rules. Automatic draw and complex effects are not complete.
- Attack and hit presentation are sequential; a defeated card's disappearance is visually delayed until the attack presentation ends. Preserve the distinction between animation and rule resolution.
- Current prototype has basic AI and a partial event/ability system. Prioritize verifying a complete placeholder match, action/animation lock, swapping and desktop/mobile input. Do not report unexecuted browser or device tests as passed.

Read current Wiki state before development; this file is a concise fallback, not proof that unresolved rules are settled.

## Current source layout

## Automatic version delivery

After each version passes relevant checks, commit and sync the complete source, required assets, configuration, tests and documentation to https://github.com/magic5sc/SwapHero without asking again for routine submission approval. Check the remote head and preserve existing history and concurrent work; never force overwrite. Do not commit credentials or temporary files. A local or Sites source commit is not GitHub delivery: verify the remote commit and report its link. Publish web versions to the existing private Site and verify deployment separately; document-only changes need no redeployment. Report any failed step accurately.

Serve dist/, edit dist/src/, run node --test test/*.test.mjs. The dist/ tree retains the deployed art/editor/effects; do not restore the old root-level browser files. Current rules support six slots and the rear_ally/rear_enemy skill targets; see README.md. No arbitrary multi-goal combinations are implemented.

