# Buff icon display

Owner request 2026-11-05: no permanent names such as “反击准备” on the board.
Display status icons and stack numbers; mouse hover or touch/pen long press reveals
the corresponding name and details. This presentation does not change combat rules.

`buff-display.mjs` builds a read-only view of each live unit's Buff instances,
passive skill states, legacy attack modifiers and shield, plus existing conditional
preparation hints. Both sides, battlefield and reserves use the same renderer.
Independent Buff instances remain separate, with their own sources and lifetimes.
Inactive zone-restricted states are dimmed and explain why they do not apply.

Custom valid `assets/` Skill/Buff icons take precedence. The approved gold/red
powerful-attack PNG remains the generic incoming attack preparation icon; six
small native SVG fallback icons cover attack, shield, armor, agility, immunity and
marker states. No remote image requests are allowed. Image load errors fall back
to a type icon. State names are accessible labels only until inspected; they are
not native title tooltips or permanent captions. Stacks greater than one use a
numeric corner badge. The row scrolls horizontally if many states are present.

`buff-icons.mjs` owns hover/long-press details. Touch or pen must hold 500ms;
short taps do not open details. Movement beyond 8px cancels long press and allows
horizontal browsing; pointer cancellation also cancels it. Icon input stops before
card inspection/drag handlers, and clicking does not exchange units or spend AP.
Keyboard Enter/Space opens and Escape closes. Leaving a mouse icon, tapping outside,
scroll/resize, rerender or battle animation closes details. During rule/animation
lock or an active card drag, inspection cannot open.

The popup lists name, effective numerical value or trigger behavior, stacks,
remaining own turns/removal timing, active zone, leave behavior and known source.
Shield details include remaining protection; passives are labeled as constant.
Only existing configured data is described. No new lore, effects or authoring
columns were added; both Excel files and existing saves retain their format.

Automatic tests cover pure view data and pointer/timer behavior. Browser and
physical phone acceptance are recorded separately in the current Wiki delivery.
