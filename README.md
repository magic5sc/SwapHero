# SwapHero

## PvE expedition — 0.5.0

`dist/index.html` is now the PvE single-chapter flow; `dist/duel.html` retains single matches. Start alone, choose a seeded path, recruit and grow a team, manage persistent wounds, and defeat the chapter Boss. Export/import adventure saves for manual cross-device continuation. Only chapter 1 is playable; chapters 2/3, artifacts and meta progression are not implemented. The isolated content pack is explicitly test balance. See [implementation and test assumptions](docs/PVE-0.5.0.md).

Latest PvE rule: simultaneous defeat means player loss after the full trigger chain. Legacy duel rules are unchanged.

## Temple swordsman — 0.4.1

The editor's character selector includes 教会卫队剑士 (`temple_swordsman`), using approved idle v2 and attack v3 sprite sequences. Existing drafts receive the built-in choice without replacing their definitions. Choose the character, save/export the card, and use the editor playtest to try it; existing cards keep their previous artwork. Runtime sheets and timing metadata are in `dist/assets/characters/temple-swordsman/`. Frames use a 192×192 transparent canvas, nearest-neighbor drawing, a 2-second idle loop and a 1.24-second single attack with impact at 640ms. Local art experiments are excluded from the runtime source.

Canonical project source: https://github.com/magic5sc/SwapHero
Private test site: https://swaphero-play.lamentkddesign.chatgpt.site
Rules: https://app.notion.com/p/406e7ee349ad81c2a7ecfdc573c7c606

## Run and test

Serve `dist/` (for example `python3 -m http.server 8000 --directory dist`).
Run `node --test test/*.test.mjs` from the repository root.
`dist/index.html` is the game; `dist/editor.html` is the developer editor;
`dist/playtest.html` plays an isolated editor snapshot. Source modules are in
`dist/src/`, assets in `dist/assets/`, editable content in `content/`.

## Rules update — 2026-10-29

- Choose one match goal: `score_5` (default, five victory points) or
  `elimination` (all enemy units defeated, including reserve units).
- The existing all-units-defeated loss still applies in score games. Simultaneous
  defeat remains an explicit paused error pending a design decision.
- Each side has six slots: field 1–3, reserve 4–6. Corresponding pairs are
  1↔4, 2↔5 and 3↔6. Any reserve may exchange with any field slot; outgoing
  units occupy the incoming unit's original slot. AP and free bench swaps are unchanged.
- `createGame(catalog, team, {victoryCondition:'elimination'})` configures a match.
  The UI exposes the same choice before deployment; restarting preserves it.
- `rear_ally` / `rear_enemy` effect targets use `zone:'bench'`. Optional
  `field_position:1|2|3` selects a particular lane; omitted/null means the
  source's field lane. Targets are unit identity snapshots at trigger time and
  must still be alive in reserve at resolution. Empty reserve slots do nothing.
  Existing skills are not changed. Editor target selection/export supports these fields.
- `migrateFormation()` accepts old eight-slot formations only when slots 7/8 are
  empty. Occupied removed slots are rejected with a reformation message; no units
  are silently deleted. Normal formation APIs require six slots. There is no
  saved in-progress match loader in this version.

The previously deployed editor, art, animation and effects are retained. This
checkout reconciles the earlier Site/GitHub drift into the `dist/` layout;
old root-level browser files are replaced by their current `dist/` counterparts.
See `content/README.md` for source ZIP, release JSON and separate client builds.
