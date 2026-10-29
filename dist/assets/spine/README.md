# SwapHero Spine animation prototype

Runtime: official Esoteric Software spine-webgl and spine-canvas 4.3.13, vendored under `dist/vendor/spine/` with its license. Project owner confirmed a current Spine license on 2026-10-28. No license keys are stored.

Six hand-authored/generated Spine 4.3 JSON skeletons bind the existing unchanged RGBA character atlas to a weighted 8×8 quad mesh. Six bones control root, torso, head, weapon, cape/wing and feet. Animations: idle, attack, hit, enter, exit, defeat. These are actual Spine skeletal timelines, not CSS-only sprite floating. This first pass is modest mesh deformation, not separately painted limbs or a fully hand-keyed production rig. No .spine binary editor project has been produced or editor-import validated.

Rebuild JSON and atlas metadata: `node scripts/build-spine-rigs.mjs`. PNG stays at `dist/assets/sky-islands/heroes-atlas.png`. Runtime atlas references that original image. To refine in the Spine editor, unpack the atlas to per-region images, import the JSON, relink its attachment image, and save a native editor project. That editor workflow remains unverified here.

`src/spine-art.mjs` prefers a single offscreen WebGL context, then the official Canvas triangle renderer when WebGL is unavailable. It draws visible sprites at up to 20fps, pauses hidden tabs, respects reduced-motion, and falls back to static art on initialization/render errors. The Canvas mesh backend is an official experimental path; mobile performance and WebGL path require device testing. Units retain animation identity across DOM rerenders. Rules stay in battle.mjs; the existing CSS owns the one forward attack translation. Animation failure does not stop play.

Verification: six skeletons parsed by the official runtime, weighted vertices and all animation names verified, all animated vertices finite, head rotation changes over time. Full suite 47 passing. Desktop browser Canvas fallback rendered camp and battle; attack cycle returned to player with expected HP/AP. Full defeat, swap choreography, mobile and accelerated WebGL visual acceptance remain pending.
