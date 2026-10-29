# PvE single-chapter implementation — 0.5.0

Source: https://app.notion.com/p/408e7ee349ad812ca293ff96d887f9ee
Latest owner decision (2026-10-30): simultaneous defeat now means **player loss**.
Resolve a complete effect/trigger chain before deciding the outcome. This replaces
the earlier simultaneous player victory rule. The owner approved a marked test
content pack and a meta-progression entry only.

## Delivered flow

`index.html` defaults to expedition; `duel.html` retains the prior single-match UI.
The editor and playtest remain separate. A run progresses through map, battle,
reward, service/event rooms, chapter completion, and the single-chapter endpoint.
Three chapter definitions exist; only chapter 1 is available. No second/third
chapter content or artifact system is implemented. Meta progression has an honest
unavailable entry; there is no resource extraction or permanent upgrade economy.

`pve.mjs` owns run transitions, roster/departed records, reward pools, services,
content snapshots and save validation. `pve-map.mjs` generates seeded routes;
`pve-ui.mjs` renders and connects to the existing battle presentation. Combat uses
the existing legality/AP/drag APIs. PvE collects death events before removal and
settles victory only after the effect stack drains; direct combat damage drains
its chain before the next attacker. Legacy duel simultaneous outcomes are unchanged.

## Explicit test configuration (not final design/balance)

`dist/data/pve-test.json` is isolated from published official cards and the editor.
It contains one hero, seven recruitable test companions, explicit three-level
skills, and four enemy templates. Hero sweep targets all enemy **field** units;
this permits solo progress against off-lane enemies without adding normal-attack
penetration or changing swap rules. Death trigger support is available in PvE;
this pack does not include death skills. Other test skills cover entry and exit.

- Map v1: 7 columns and 7 non-crossing paths; retained 15/14/13 route layers plus
  Boss, first combat and last camp, no elites/camps in first 5 layers; no adjacent
  elite/shop/camp pairs. Target whole-map counts: 5 elites, 3 shops, 10–14 unknown,
  6–7 camps including fixed camps. Allocation is best effort under hard constraints;
  this is a project baseline, not an exact reimplementation of Slay the Spire 2.
- Removed treasure probability goes to events: unknown starts combat 10%, shop
  3%, event remainder; missed non-events increment, hit resets, new chapter resets.
  An unknown after a shop cannot resolve to a shop. No treasure/ancient/recruit node.
- Mixed reward pool: up to 3 distinct candidates sampled without replacement;
  fewer if exhausted; skipping allowed. Silver weights 70/23/6/1 and gold
  30/40/23/7 across common/rare/epic/legendary. Gold-only filtering is independent.
- Roster and departed IDs are excluded from recruitment. Equipped skills on both
  active/departed units are excluded globally. Discarded skills re-enter at level 1.
- Growth lasts this run; max-health increases do not heal. Dead members can receive
  growth and upgrades, and still consume roster capacity. Replace only at reward
  or shop/event windows; main hero cannot leave. Departed members recover fully.
- Initial gold 35; combat 15, elite 30; recruit 25, skill 20, heal 15, revive 25,
  upgrade 25. Heal/revive restores up to 12 HP. Camp/event have one action. Shop
  stocks are deterministic, one recruitment slot, no refresh. Boss grants no
  invented loot: only chapter recovery and the explicit single-chapter endpoint.
- No-progress games can be saved and left, resumed or explicitly abandoned; no
  automatic timeout loss/draw is invented. General automatic stall detection and
  its adventure policy remain unresolved. The test hero's sweep helps solo runs.

## Saves and migration

`swaphero.adventure.v1` is separate from editor drafts. Saves carry schema, seed,
content version plus a full immutable content snapshot, map, roster, departed,
node stock/reward state, and stable battle checkpoint. JSON export/import supports
manual cross-device use. This is local browser storage, not cloud synchronization.
Unknown versions and invalid saves are rejected without overwriting original data.
Old editor/duel formats are not reinterpreted as adventure runs. There was no prior
adventure format to migrate. Reward settlement is an atomic state transition;
reload resumes fixed choices and sold/claimed flags, not a fresh roll.

Battle animation does not write intermediate frames: after the action stabilizes,
the state saves. Reload during animation returns to the preceding stable checkpoint.
Storage failure is surfaced; localStorage can still be cleared by browser settings.
No cryptographic anti-cheat or multi-tab synchronization is promised.

## Verification

`node --test test/*.test.mjs`: 94 passing tests at initial implementation validation,
including real legal battles through a complete 16-node chapter and JSON restore at
each transition, 100 seeded maps, lethal retaliation/death chains, roster protection,
departed growth, filters, upgrading, service costs, and reward idempotence.
Browser checks and final delivery references are recorded in Wiki with actual scope.
Mobile hardware/WebGL performance and owner visual/balance acceptance remain pending.
