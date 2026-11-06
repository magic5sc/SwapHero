# Reference-led pastel UI — 2026-11-06

The owner supplied a reference with white rounded panels, coral diagonal trim,
pink striped illustrations, lilac information areas, dark plum type and green
primary buttons. These now style adventure, duel, teaching and developer battle
entries through `dist/pastel-ui.css`; existing character art is retained.
The configuration and dialogue authoring pages keep their independent layouts.

Owner clarification: this reference changes UI style only. Preserve the existing
desk background, per-level battlefield texture, parchment/map texture and scroll
rods. The first iteration's full-background replacement was an overreach and has
been removed; pale panels, buttons, tooltips and enlarged character boxes remain.

All twelve battle/reserve slot backgrounds use 10% opacity. Hover/selected and
drag destinations use 20% opacity so their highlights remain translucent too.
Only background colors carry alpha; characters, Buff icons and stats stay opaque.

Battle character display boxes occupy 70% of the smaller slot dimension, retain
square proportions and scale with the viewport. Sequence art uses one shared
idle/attack union crop per character to reduce transparent padding without frame
zoom or clipping the measured animation bounds. Source images are unchanged.

Card and Buff tooltips use the pointer coordinates plus a 12px gap, flip at viewport
edges and retain an 8px margin. Their plum background has 83% opacity and blur.
Mouse movement updates the position; keyboard inspection uses the anchor instead.
Touch/pen inspection retains the existing 500ms hold and 8px movement cancellation.
Buff names remain in inspection only. No battle rules, workbook data or save
schema changes are part of this delivery.

Validation: both workbook compilers; full Node test suite (serial execution);
desktop teaching entry and action phase, card/Buff popup location and computed
opacity, sprite-to-slot geometry, 390×844 responsive layout, adventure start.
Physical touch devices and a complete played-through match were not tested for
this cosmetic delivery. Cursor placement/edge clamping have dedicated unit tests.

Live battle controls reserve space for two phase lines, one action-point line,
and the guidance and feedback text at each breakpoint. Longer guidance or
feedback can scroll within its own area. End Turn stays visible and disabled
during resolution, and the combat log opens over the board. A score still shows
its floating notice while the page stays fixed.
