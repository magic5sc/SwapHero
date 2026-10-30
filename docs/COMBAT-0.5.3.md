# Combat 0.5.3 — 2026-10-30

Confirmed Wiki: https://app.notion.com/p/406e7ee349ad81c2a7ecfdc573c7c606

- score_5 uses opposing-lane attacks and scores on an empty opposing lane.
- elimination uses target priorities 1,2,3 / 2,1,3 / 3,2,1. Targets are re-evaluated at damage time. No reserve attacks and no empty-lane score gain.
- Attack mode is derived from victoryCondition, so existing saves/configurations need no extra field or migration. Skill opposing_unit and circular neighbour targeting remain unchanged.
- Mandatory reinforcement only when the field is empty, a reserve exists and AP remain. Optional reinforcement still costs 1 AP. Both sides retain 2 AP and the entering-unit attack restriction.
- Basic AI uses the shared mandatory rule, retains reserves when it has a front unit; advanced optional swap tactics remain outside this change.
- Replay frames carry targetId/targetLane for target outline, impact, particle and defeat rendering.
- Retains and includes the previous chapter-map bounds fix in GitHub synchronization.

Validation: node --test test/*.test.mjs: 106 passed. New cases cover both sides/all occupancy masks, goal binding, damage-time retargeting after before_damage and lethal attacks, no reserve damage, voluntary reinforcement, empty-field enforcement and entry-effect death, AI and single-unit off-lane combat. Existing full-chapter and save round-trip tests pass.
Browser/phone visual verification unavailable: browser runtime fails with CreateProcessSecurityEnvironment 0x80070002. Do not mark visual acceptance complete.
