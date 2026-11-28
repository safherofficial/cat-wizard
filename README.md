# Frog Wizard

**A little magic. A lot of attitude.**

Frog Wizard is a top-down gesture-magic physics sandbox starring a mysterious frog wizard. Draw one continuous symbol with the mouse, touchscreen, or pen; the world slows while the stroke is being drawn; release to cast and experiment with the physical results.

## Current build — Three.js browser edition

The game now runs natively in the browser on **Three.js 0.187.0** with **Vite 8.4.0**. Unity is no longer used for the game runtime or browser build.

- A 148 × 120 walkable enchanted valley with connected hand-painted trails, four peripheral pine groves, moonlit crystal beds, a northern starlight shrine, a moon pond, mushroom groves, an old oak, ancient standing-stone ruins, a timber footbridge, mossy rock outcrops, a winding river, cottage, windmill, 56,000 animated grass blades, 6,000 flower clusters and 520 fireflies. Its sculpted low-relief terrain adds broad rises and shallow basins while keeping footpaths and landmark pads level. Each biome now has its own ground dressing: fern-covered pine floors with fallen timber, floating crystal motes, marsh reeds and color-tuned flower palettes.
- The Frog Wizard is the new main character: a detailed textured 3D frog wizard with mushroom accessories, a near/far LOD pair and lightweight root-level movement animation. The supplied source mesh has no skeleton or animation clips, so limb articulation is not claimed.
- Free-roam movement with WASD, arrow keys or touch relative to the camera heading; the cat turns smoothly toward its travel direction. Hold the right mouse button and drag to orbit the follow camera, or use the mouse wheel to zoom.
- Touch movement on the left side and independent spell drawing on the right side.
- Five normalized one-stroke gesture templates with forward/reverse recognition and rejection of short or straight strokes.
- World time slows to 15% during drawing and eases back over 250 ms after release.
- Fireball, Thunderbolt, Frost, Gravity and Chaos effects.
- Destructible crates, barrels, vases and stone props with mass-aware impulses, object collisions, wall bounce and debris.
- No enemies, player-health system or respawn loop in this phase: the focus is spell behaviour and environmental physics.
- Fireball follows an arcing path and detonates on its first prop impact; Thunderbolt applies directional force along its strike; Frost freezes props; Gravity pulls and swirls them; Chaos delivers an outward shockwave.
- Responsive browser HUD and fullscreen mode.

## Frog Wizard character asset

The browser runtime loads the optimized two-scene GLB at `public/assets/frog-wizard-lods.glb`. The near representation contains 253,449 triangles; the far representation contains 63,362. Both share the original embedded WebP material textures. The optimized file is approximately 17.7 MB, compared with 77.5 MB for the supplied source.

The source is one fused static mesh with no skeleton and no animation clips. Runtime movement turns and gently bobs the complete character; it does not yet animate individual limbs. A rigged version can be introduced later without changing the gameplay controls.

To include the binary in a checkout, place the optimized file at exactly `public/assets/frog-wizard-lods.glb`. Run its structural audit with:

```bash
npm run audit:frog-wizard -- public/assets/frog-wizard-lods.glb
```

Attribution: “Frog wizard with mushrooms” by Scenario, title by Patch; AI-generated with TRELLIS 2; licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Source: https://huggingface.co/datasets/scenario-labs/3d-collection/blob/55b4c002b4c1529fc48da3dff98516c3069bfa3f/assets/scenario_asset_dyHjpX6aCe8q1eNZFekAwzj6/output.glb.

The previous procedural cat and the Blender Cat Wizard builder remain as fallback/legacy material. The Frog Wizard GLB is the intended runtime protagonist.

## Performance diagnostics

Open the game with `?perf=1` to display FPS, average CPU frame cost, draw calls, triangles, geometry/texture counts and the active quality preset. The initial preset is selected from device hints; sustained slow frames lower the internal pixel ratio gradually, while sustained headroom restores it in small steps. Use `?perf=1&quality=high`, `medium` or `low` to override the automatic selection.

## Rendering and performance

- Use `?perf=1` to inspect FPS, average CPU frame cost, draw calls, triangles, geometry/texture counts and the active quality preset.
- The default quality is selected from device hints; an adaptive pixel-ratio controller lowers resolution under sustained frame pressure and recovers gradually when headroom returns.
- Compare `?perf=1&quality=high`, `medium` and `low` to override the automatic selection.
- Grass and flowers are split into spatially culled instanced batches; terrain tessellation and the painted ground texture use a reduced GPU budget.
- Fireflies and crystal motes animate in the vertex shader, avoiding per-frame CPU position-buffer uploads.

## Run locally

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm test
npm run build
npm run preview
```

Vite writes the deployable static site into `dist/`.

## Browser deployment

GitHub Actions runs JavaScript tests, Blender source-contract checks, builds the static site and publishes it to GitHub Pages on pushes to `main`. Pull requests to `main` run the same checks without publishing the game. Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** on the repository for the first publication.

Expected URL: https://safherofficial.github.io/cat-wizard/

## Repository structure

```text
src/
  main.js           Three.js scene, controls, combat and runtime loop
  camera-controls.js right-button orbit camera math and pitch limits
  world-map.js      shared playable world bounds and clamping
  terrain.js        deterministic meadow heightfield and smooth terrain sampling
  gesture.js        one-stroke recognizer and spell templates
  performance.js    adaptive quality presets, pixel-ratio scaling and runtime diagnostics
  spatial-chunks.js  deterministic spatial cell keys for vegetation culling
  style.css         responsive browser shell and HUD
scripts/
  audit-catwizard-glb.js   standalone GLB container and scene contract audit
public/assets/
  cat-wizard.webp   full original cat artwork, transparent WebP
tests/
  camera-controls.test.js  camera orbit interaction math checks
  gesture.test.js          gesture classification checks
  world-map.test.js        expanded world-bound checks
  terrain.test.js           height, slope and flat landmark checks
  performance.test.js      quality selection and adaptive scaling checks
  spatial-chunks.test.js   deterministic vegetation chunk checks
  glb-audit.test.js        standalone GLB audit tests
  blender_source_test.py   Blender builder/audit source contract checks
docs/
  THREEJS.md        development, gameplay and deployment notes
.github/workflows/
  web.yml           tests, build and GitHub Pages deployment
```

## Verification boundary

The project includes executable Node tests, Python source-contract checks and a Vite production build workflow. Passing those checks validates gesture logic, the Blender scripts' source contracts, GLB package structure when an asset is supplied, and static bundling. It does not replace running Blender 2.93, visually inspecting the generated character, or a real browser playtest for graphics, controls, device performance and balancing.
