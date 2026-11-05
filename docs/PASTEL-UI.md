# Reference-led pastel UI — 2026-11-06

The owner supplied a reference with white rounded panels, coral diagonal trim,
pink striped illustrations, lilac information areas, dark plum type and green
primary buttons. These now style adventure, duel, teaching and developer battle
entries through `dist/pastel-ui.css`; existing character art is retained.
The configuration and dialogue authoring pages keep their independent layouts.

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
