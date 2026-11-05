# Mirrored turns and enemy plans

Confirmed 2026-11-05. Source: https://app.notion.com/p/406e7ee349ad81c2a7ecfdc573c7c606

Both sides act on their own turns. Exchanges and complete effect chains resolve
immediately; manual End Turn starts that side's mandatory normal attacks, then
turn-end effects and the opponent's turn. AI ends automatically. AP, entry attack
restriction/agility, free reserve rearrangement and mandatory reinforcement remain.

2026-11-05 owner update: after each unit attacks, a target reduced to 0 HP dies
and disappears immediately. The renderer uses that attack's settled snapshot;
it never restores dead cards until the attack phase or both turns finish.
Damage already removes defeated units from the rule state immediately; later
attacks still recheck live targets, and full triggered chains still settle before
the existing victory/defeat verdict. This supersedes the former delayed-death display.

Each side's own left-to-right is 1,2,3. Player screen rows are enemy 3,2,1 and
player 1,2,3; rear rows follow the same mirror. Opposing slots are 1↔3,2↔2,3↔1.
Attack declaration/preparation/damage use local 1→2→3. Elimination lookup uses
enemy-local priorities 3,2,1 / 2,3,1 / 1,2,3 for attackers 1/2/3, rechecking on
damage. Skills' opposing/front_sides/implicit rear_enemy targets mirror as well.
An explicitly configured rear_enemy field_position means that enemy's local slot;
rear_ally, lower_ally and simultaneous-trigger stack ordering retain their semantics.

After player turn-start effects finish, `prepareEnemyPlan` captures `enemyPlan`.
The serializable plan binds incoming/outgoing unit IDs and source/destination
slots. Player moves never change it. AI checks each operation at execution, skips
invalid ones and continues remaining legal ones without optimizing a new plan.
Mandatory reinforcement still runs if needed, including after an invalid plan or
entry effects creating a vacancy. Moving reinforcement to AI turn-end is NOT adopted.

The initial deterministic AI policy is a temporary implementation choice: plan
one default reinforcement if no front unit exists; otherwise exchange one front
unit at ≤ one-third maximum HP with a healthier reserve, using local slot order.
It is not a promise of optimal AI or a new confirmed combat rule. More complex
multi-operation plans execute with the same validation and existing 2 AP limit.

Enemy exchanges display incoming/outgoing labels and a dashed connecting line;
no exchange produces no exchange prompt. Active marker Buffs supply generic
overhead preparation badges; conditional own-turn-start skills can also supply
them. The teaching level's existing charge/ready Buffs therefore show their state
without role-name or level-specific logic. No damage forecasts are added.

The approved gold-rimmed, dark-red powerful-attack icon is stored at
`dist/assets/status/powerful-attack-warning.png`. Ready effects that cause positive
damage or grant positive attack at the next own turn start use this fallback icon
when their conditions and listening zone match. The teaching level's retaliation
ready state uses it; ordinary charge counters retain text. Existing valid `assets/`
Skill/Buff icon paths take precedence. The unified [Buff icon display](BUFF-DISPLAY.md)
now replaces permanent captions: only icons and numeric stacks remain on the
board, with names/effects shown on mouse hover, keyboard inspection or 500ms long
press. Field icons are 32px desktop / 28px narrow; reserve icons are smaller.
Source Excel, skill values and battle rules are unchanged. The imported generated
original is retained without resizing.

`ruleVersion:2` is assigned to new battles. `upgradeBattle` reverses old enemy
field and reserve triples once to preserve visible positions and updates unit
positions; current player-turn saves missing a plan get one from their settled
state. Old AI-turn saves without a plan perform only default reinforcement.
Saved valid plans persist across reload; malformed plans are rejected by adventure
validation. Original workbook/pack snapshots, editor and dialogue saves are retained.

Test hub links to `tutorial.html?level=tutorial_01&scenario=enemy-plan`: a disposable
fixture clones a teaching enemy into reserve and wounds its front counterpart.
It does not edit Excel, adventure saves or editor drafts. The standard teaching
entry retains its real seven-round acceptance battle and uses the same engine.

Validation and publication evidence are recorded in the current Wiki delivery
entry. Automated coverage is in `test/turn-plan.test.mjs` and the existing combat,
skills, Buff, tutorial, adventure, save and dialogue suites. Physical phone testing
must be reported separately from desktop and simulated viewport checks.
