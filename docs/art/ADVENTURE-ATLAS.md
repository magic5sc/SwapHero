# Adventure Atlas · 0.5.2

Owner selected concept B on 2026-10-30. Canonical reference and art brief:
https://app.notion.com/p/408e7ee349ad81999325f1ca53b55821

`adventure-atlas-reference.png` is the approved composition reference, not a flattened game screen. Its characters, statistics and graph are illustrative.

## Assets and integration

- `dist/assets/chapter-map/atlas-background.png`: opaque 1536×1024 PNG, generated using built-in image generation from the approved reference. Empty open atlas with ivory paper, cyan contour lines, floating ruins along its edges. No baked UI, routes or characters.
- Six local 48×48 viewBox SVG node icons: combat, elite, shop, event, camp, boss; plus a 100×100 compass. Deterministic code-native UI icons, no external font/emoji dependency.
- `dist/pve.css`: book panel, stone node bases, blue/gold route states, blue/gold headings, parchment team cards and health meters. Scoped to expedition; existing battle/editor art untouched.
- `dist/src/pve-ui.mjs`: renders shared assets for all chapter maps; labels, visited check, current diamond, accessible state descriptions, current-route locator. Scrollable route canvas retains actual seeded graph and existing save format. Small screens retain horizontal map scrolling to avoid overlapping seven columns.
- Start, map, room and completion surfaces share the atlas treatment. Chapters 2/3 remain unavailable; no new gameplay content.

## Background prompt

Use approved Adventure Atlas reference to create ONLY the empty illustrated open-book map background, landscape 1536x1024. Bright pixel-art ivory parchment, cyan cartographic contours, floating ivory ruins/green islands at far edges, blue sky, warm gold corners, subtle central crease. Central 78% quiet pale cream with faint contours for dynamic routes. No title, letters, characters, sidebar, nodes, platforms, icons, crowns, tents, routes or dots. Nearly orthographic open book fills frame; crisp pixel clusters, not photoreal.

## Validation

95 existing Node tests passed, syntax and diff checks passed. Desktop browser checked actual background, icons, loaded pre-existing save (31/32 HP, 2 members), next-node battle entry and saved return to map. No battle or map-generation rules changed. Phone device and final owner visual acceptance remain pending.
