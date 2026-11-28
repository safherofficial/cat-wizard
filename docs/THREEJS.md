# Cat Wizard — Three.js browser edition

Cat Wizard now runs as a native browser game built with Three.js. Unity is no longer part of the production runtime or web build pipeline.

## Stack

- Three.js `0.187.0` for the WebGL scene, perspective follow camera, lighting, materials, stylized meshes, animated vegetation, particles and effects.
- Vite `8.4.0` for development and optimized static builds.
- Native JavaScript modules; no Unity player, license, WebAssembly runtime or game server is required.

## Local development and checks

```bash
npm install
npm run dev
npm test
python tests/blender_source_test.py
npm run build
npm run preview
```

The deployable site is written to `dist/`.

## Controls

- Desktop: WASD or arrow keys move relative to the camera heading (W always moves toward the top of the view); hold the right mouse button and drag to orbit the follow camera; hold the left mouse button, draw a single glyph and release to cast. The cat turns to face its actual world-space travel direction.
- Touch: hold and drag on the left 32% of the game surface to move relative to the camera heading; draw and release on the right side to cast. Pointer IDs are independent, allowing movement and spell drawing together.
- Drawing reduces world simulation speed to 15%; after release it eases back to full speed over 250 ms.

## Spells

| Gesture | Spell | Effect |
| --- | --- | --- |
| Circle | Fireball | Arcing projectile; collides with the first prop in its path, then detonates with a distance-scaled blast. |
| Lightning | Thunderbolt | Instant strike; applies a directional impulse and damage to props along the bolt. |
| Triangle | Frost | Area pulse that freezes props in place, stopping their movement and spin until thaw. |
| Spiral | Gravity | Temporary vortex that pulls and swirls props; their collisions exchange momentum. |
| Star | Chaos | Wide shockwave with distance-scaled outward impulse and destructible impact.

## Gameplay

The scene is a 148 × 120 free-roam enchanted valley built from a seeded 3584×2816 painted ground texture, 56,000 animated instanced grass blades, 6,000 wildflower clusters, 520 floating fireflies, four peripheral pine groves, two moonlit crystal beds, a northern starlight shrine, tree canopies, bushes, a winding river, a west-side moon pond, expanded mushroom hollows, an old oak grove, a southern ring of ancient stones, a timber footbridge, moss-covered rocky outcrops, a cottage, a working windmill and a wider ring of distant hills. Hand-painted trails lead from the central spell clearing into the new outer biomes. The 148 × 120 ground is a subdivided, deterministic heightfield: broad, low-relief rises and shallow basins blend into level walking trails, the central spell clearing, the river corridor and landmark pads. Grass, flowers, trees, mushrooms, rocks and crystals are anchored to their local surface height; the player, camera, directional light and spell-picking ray follow the same profile. The camera and directional shadow light follow the player across the expanded bounds. At its centre, a broken stone ring surrounds a levitating mana core. The protagonist is a modeled 3D grey cat with the signature pink bow tie, pointed ears, violet wizard hat and pipe; the walk cycle articulates the legs and arms, with a moving cloak, secondary head and hat motion, a swaying tail and animated pipe smoke. Instanced grass bends in the wind and fireflies drift above the flowers. This phase deliberately has no enemies, health, damage-to-player or respawn loop. Instead, it isolates the five gesture spells and their interactions with destructible crates, barrels, vases and stones. Movable props have mass, damped velocity, wall and pillar collisions, and pairwise momentum exchange. The follow camera is closer to the character to emphasize the third-person view.


## Sculpted meadow terrain

- `src/terrain.js` provides a deterministic, bounded height function for broad rises, shallow basins and subtle surface undulation.
- The ground plane is subdivided and displaced into a static Three.js heightfield; it retains the hand-painted grass texture and recomputes vertex normals for natural lighting.
- Trail corridors, the central spell clearing, the river, moon pond, ruins and major landmark pads stay level or blend gently into the surrounding terrain.
- Instanced grass, flower patches, pine trees, crystals, mushrooms, rocks and the other grounded set pieces use the same height function to avoid floating or buried placement.
- Player elevation, camera follow, directional-light tracking, spell rings, projectiles and terrain ray-picking follow the surface.
- Dedicated tests check flat gameplay areas, positive and negative landforms, finite bounds and gradual height changes.

## Distinct woodland, crystal and marsh micro-biomes

- Adds a low-poly fern understorey to the four pine groves, with fallen logs, moss-covered timber and cut stumps placed away from the trails and existing collision landmarks.
- Adds 52 softly glowing, drifting motes around the two crystal beds. Their color palette follows the crystal tones and their movement is driven by world time, so it slows during spell drawing.
- Adds twelve marsh-reed clumps around the moon pond, with separate instanced stalks, seed heads and leaves.
- Gives the flower fields region-aware color palettes: cool and luminous tones near the crystals, muted woodland colors beneath the pines, and warm pale-gold colors around the northern shrine.
- Batches the new fern, log, stump, reed and mote details with instanced meshes or point geometry to keep the additional environment dressing lightweight.
- Keeps all grounded details aligned to the shared terrain heightfield.

## Blender character asset

The current candidate source is `blender/CatWizard_CreateCharacter_Blender293.py` (Character 02, Blender 2.93 LTS), with a companion `blender/CatWizard_GLBAudit_Blender293.py`. Character 02 adds dedicated Hat, Ear.L, Ear.R and Tail.Tip bones to a 13-bone rigid-part rig; it includes Idle, Walk, Run, Cast and Hit NLA clips. Bevelled curve details are converted to meshes before GLB export, and the builder validates expected bones, mesh bindings and clips before saving/exporting. The Blender audit helper checks the exported GLB's structure and produces front/side/rear previews.

After generating the GLB in Blender 2.93, run the standalone structural audit from the repository root:

```bash
npm run audit:character -- ~/CatWizard_Art_v2/cat-wizard-character-v2.glb
```

That Node.js tool checks GLB container integrity, embedded buffer bounds, mesh/accessor references and animation channel references, and reports the five expected clips. It also reports rig nodes and parent-hierarchy deviations for follow-up in the Blender audit. The check is structural only: it does not replace Blender execution, visual review or Three.js playback. No generated `.blend`, `.glb` or preview render has yet been verified in this environment. The browser continues to use the current procedural Three.js cat until the candidate is generated, audited and explicitly approved. The older ZIP remains as Character 01 legacy material.

## Meadow visual and draw-call pass

- Bush lobes now share one instanced geometry/material batch instead of creating one mesh/material per lobe.
- River-bank pebbles are batched into a single `InstancedMesh`.
- The river adds subtle vertex ripples and a low-amplitude animated highlight through a material shader hook. The animation uses world time, so it participates in the 15% spell-drawing slow motion.
- Firefly positions use a dynamic buffer usage hint because the positions are updated continuously.
- Camera target vectors are reused between frames rather than allocated on each camera update.
- Quality profiles now also control shadow-map resolution and antialiasing. High preserves the previous 2048 shadow map and antialiasing defaults; Medium halves the shadow-map dimensions; Low disables shadows and antialiasing.

The meadow batching is intended to lower draw-call overhead without reducing the number of bush lobes or changing their placements. GPU savings and the visual quality of the animated river still require comparison in a real browser across the three profiles.

## Runtime timing

- The animation loop subdivides larger frame deltas into small simulation steps, preserving elapsed gameplay time on slower-refresh devices while keeping player movement, prop collisions and spell impacts stable.

## Deployment

Pull requests targeting `main` run JavaScript tests, Blender source-contract tests and the production build, but do not publish the game. Pushes to `main`, or a manual run of **Cat Wizard Web**, run the same checks and publish `dist/` through GitHub Pages.

The first Pages deployment requires **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. No Unity license or Vercel integration is involved.

Expected URL: https://safherofficial.github.io/cat-wizard/

A successful workflow build confirms static compilation and packaging. Graphics, browser input, device performance and real playability still require hands-on browser testing.

## Performance diagnostics

Append `?perf=1` to the Preview URL to show a compact runtime overlay. It reports:

- Approximate frames per second over a rolling measurement window.
- Average JavaScript frame cost, including simulation and WebGL command submission.
- Draw calls and triangles from the most recent render.
- Active geometry and texture counts tracked by Three.js.
- The selected quality preset and renderer pixel ratio.

The CPU figure is not a GPU execution timer; WebGL work may complete asynchronously. Use browser performance tools or a GPU profiler for deeper investigation.

Three manual quality presets are available for comparison:

| Query value | Pixel-ratio cap | Shadow map | Antialiasing |
| --- | ---: | ---: | --- |
| `high` (default) | 1.5 | 2048 × 2048, soft | On |
| `medium` | 1.25 | 1024 × 1024, standard | On |
| `low` | 1.0 | Shadows disabled | Off |

Examples:

- `?perf=1`
- `?perf=1&quality=medium`
- `?perf=1&quality=low`

These presets are diagnostic controls, not automatic quality switching. Compare the same scene and actions on each preset before changing the default or optimizing individual assets.


## Atmospheric valley backdrop

- Replaces the flat sky-only horizon with a lightweight gradient sky dome and a warm, low-intensity sun halo.
- Adds 40 distant, irregular mountain peaks as one instanced draw, softened by extended scene fog to frame the larger valley.
- Adds sixteen drifting storybook cloud formations (96 instanced puffs total); their slow movement follows world time and therefore eases during spell drawing.
- Adds four instanced pine groves, two emissive crystal beds and a northern starlight shrine as new outer-map destinations.
- Keeps the backdrop free of shadow casting and uses deterministic layout helpers with unit tests so the horizon remains stable between launches.
