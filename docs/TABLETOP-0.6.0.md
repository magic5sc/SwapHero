# Tabletop presentation 0.6.0 — 2026-10-31

Visual surfaces were superseded by the owner's 2026-11-06 reference-led pastel
UI; see [PASTEL-UI.md](PASTEL-UI.md). The historical description below remains
implementation context for live art, input and transition behavior.

The approved scroll preview is integrated into the real PvE and single-battle UI.
The game renders the existing character assets and card data. No preview character
image or baked battle screenshot is shipped as a playable roster or battle board.
Existing nine character definitions, Spine/sequence animation files, content JSON,
combat/formation logic, map generation and save schema are unchanged.

## Presentation

- Fixed wooden desk; chapter content on illustrated parchment with two brass/wood
  rollers, retained as two adjacent rollers when closed and sliding.
- Green leather battlefield with lighter front lines and darker reserves. Four
  rows with three live card slots each; icons label row roles. Hover/long-press
  details and drag-only exchanges retain the original input path.
- A tall responsive layout on phones; sprite boxes remain square. Short landscape
  screens can scroll rather than distorting sprites.
- `tabletop.mjs` manages presentation locking and close -> slide left -> slide in
  from right -> open. The live DOM is clipped, never replaced by preview characters.
- `pve-ui.mjs` awaits transitions, saves node entry before animation, retains battle
  result/reward handling, and places team details/management inside the parchment.
- Preview character cutouts belong to the separate Notion art archive, are reference
  extracts, and have not been promoted to production pixel masters or animation rigs.

## Verification

109 Node tests pass, including three new checks for dual roller spacing, sequential
round-trip transitions and restoring a visible source on transition failure.
Browser QA could not run: the browser tool timed out. Desktop/mobile visuals,
actual drag input and complete animated matches remain owner acceptance items.
No claim of mobile-device validation or production pixel-spec compliance is made.

## Scroll corrections 0.6.1 — 2026-10-31

- The map and top/bottom bands now share one parchment background. The map's
  scroll offset moves that single texture; controls retain their usable positions.
- Closed rollers compensate for transparent margins in the existing image. Their
  visible bodies touch with a small overlap rather than leaving a desk-colored gap.
- Leather curl has an opaque backing and follows the actual clip boundary at its
  center. Its height is bounded across screens; the former 87% travel mismatch and
  broad trailing translucent shadow are removed.
- Existing characters, gameplay, asset bytes and save format are unchanged.

Validation: all 109 Node tests passed; diff/JS syntax checks passed. Browser QA
checked map texture synchronization after scrolling, the desktop closed rollers,
paused leather expansion midpoint, and the same midpoint/closed rollers in a
390px iframe viewport. Normal map-to-battle and paused reverse transitions ran.
The temporary animation-control page was removed before packaging. This is
browser viewport testing, not iPhone/Safari device verification or owner acceptance.
