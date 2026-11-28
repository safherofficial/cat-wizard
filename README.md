# Cat Wizard

**A little magic. A lot of attitude.**

Cat Wizard is a top-down gesture-magic physics sandbox starring a distinguished grey cat wizard. Draw one continuous symbol with the mouse, touchscreen, or pen; the world slows while the stroke is being drawn; release to cast and experiment with the physical results.

## Current build — Three.js browser edition

The game now runs natively in the browser on **Three.js 0.187.0** with **Vite 8.4.0**. Unity is no longer used for the game runtime or browser build.

- A 100 × 80 walkable enchanted valley with connected hand-painted footpaths, a moon pond, mushroom groves, an old oak, ancient standing-stone ruins, a timber footbridge, mossy rock outcrops, winding river, cottage, windmill, animated grass, wildflowers and fireflies.
- A 3D modeled grey cat wizard with the signature pink bow tie, pointed ears, violet wizard hat, pipe and articulated walk cycle.
- Free-roam desktop movement across the full valley with WASD or arrow keys; hold the right mouse button and drag to orbit the follow camera around the wizard. Touch movement remains available on the left side.
- Touch movement on the left side and independent spell drawing on the right side.
- Five normalized one-stroke gesture templates with forward/reverse recognition and rejection of short or straight strokes.
- World time slows to 15% during drawing and eases back over 250 ms after release.
- Fireball, Thunderbolt, Frost, Gravity and Chaos effects.
- Destructible crates, barrels, vases and stone props with mass-aware impulses, object collisions, wall bounce and debris.
- No enemies, player-health system or respawn loop in this phase: the focus is spell behaviour and environmental physics.
- Fireball follows an arcing path and detonates on its first prop impact; Thunderbolt applies directional force along its strike; Frost freezes props; Gravity pulls and swirls them; Chaos delivers an outward shockwave.
- Responsive browser HUD and fullscreen mode.

## Blender character source

The current Blender candidate is `blender/CatWizard_CreateCharacter_Blender293.py` (Character 02, Blender 2.93 LTS), accompanied by `blender/CatWizard_GLBAudit_Blender293.py`. The builder creates an editable `.blend`, a GLB and a preview under `~/CatWizard_Art_v2/`; the rig has 13 bones and five NLA clips (Idle, Walk, Run, Cast and Hit). The parts are rigidly parented to bones rather than bound as one weighted skin.

After generating the GLB, run both the Blender audit helper and the standalone container audit:

```bash
npm run audit:character -- ~/CatWizard_Art_v2/cat-wizard-character-v2.glb
```

The standalone audit checks GLB container integrity, embedded buffers, mesh and accessor references, animation channels and required clip names. Missing rig node names or hierarchy differences are flagged for confirmation in Blender. It does not replace visual inspection or a Three.js playtest. The GLB is not part of the browser build and the procedural Three.js character remains active. The older `blender/CatWizard_Blender293_CharacterBuilder.zip` is retained as Character 01 legacy material.

## Performance diagnostics

Open the game with `?perf=1` to display FPS, average CPU frame cost, draw calls, triangles, geometry/texture counts and the active quality preset. Compare manual profiles with `?perf=1&quality=medium` or `?perf=1&quality=low`. High quality remains the default; these profiles do not switch automatically.

## Rendering and performance

- Use `?perf=1` to inspect FPS, average CPU frame cost, draw calls, triangles, geometry/texture counts and the active quality preset.
- Compare `?perf=1&quality=high`, `medium` and `low`; the default remains High.
- The meadow uses instanced bush and river-bank batches, a lightweight animated river shader and a dynamic firefly position buffer.

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
  gesture.js        one-stroke recognizer and spell templates
  performance.js    render quality presets and optional runtime diagnostics
  style.css         responsive browser shell and HUD
scripts/
  audit-catwizard-glb.js   standalone GLB container and scene contract audit
public/assets/
  cat-wizard.webp   full original cat artwork, transparent WebP
tests/
  gesture.test.js          gesture classification checks
  performance.test.js      render quality preset checks
  glb-audit.test.js        standalone GLB audit tests
  blender_source_test.py   Blender builder/audit source contract checks
docs/
  THREEJS.md        development, gameplay and deployment notes
.github/workflows/
  web.yml           tests, build and GitHub Pages deployment
```

## Verification boundary

The project includes executable Node tests, Python source-contract checks and a Vite production build workflow. Passing those checks validates gesture logic, the Blender scripts' source contracts, GLB package structure when an asset is supplied, and static bundling. It does not replace running Blender 2.93, visually inspecting the generated character, or a real browser playtest for graphics, controls, device performance and balancing.
