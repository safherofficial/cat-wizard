# Cat Wizard

**A little magic. A lot of attitude.**

Cat Wizard is a top-down fantasy action prototype starring a distinguished grey cat wizard. Its defining mechanic is gesture-cast magic: draw one continuous symbol with the mouse, touchscreen, or pen; the world slows while the stroke is being drawn; release to cast.

## Current build — Three.js browser edition

The game now runs natively in the browser on **Three.js 0.187.0** with **Vite 8.4.0**. Unity is no longer used for the game runtime or browser build.

- A hand-painted meadow arena with a winding dirt path, river, swaying 3D grass, wildflowers, trees, cottage, windmill, standing stones, fireflies and a floating spell core.
- A 3D modeled grey cat wizard with the signature pink bow tie, pointed ears, violet wizard hat, pipe and articulated walk cycle.
- Desktop movement with WASD or arrow keys.
- Touch movement on the left side and independent spell drawing on the right side.
- Five normalized one-stroke gesture templates with forward/reverse recognition and rejection of short or straight strokes.
- World time slows to 15% during drawing and eases back over 250 ms after release.
- Fireball, Thunderbolt, Frost, Gravity and Chaos effects.
- Destructible crates, barrels, vases and stone props with knockback and debris.
- Three pursuing cursed wisps with safe initial spacing, player health, temporary invulnerability and arena respawn.
- Responsive browser HUD and fullscreen mode.

## Blender character source

A Blender 2.93-compatible character builder is included in `blender/CatWizard_Blender293_CharacterBuilder.zip`. Run the Python script from Blender's **Scripting** workspace to generate an editable `.blend`, a game-ready `.glb`, and a preview render under `~/CatWizard_Art/`. The builder creates a rigid-bone character rig with Idle, Walk, Run, Cast and Hit animation clips. The resulting GLB is not part of the browser build until it is reviewed and added under `public/assets/`.

## Performance diagnostics

Open the game with `?perf=1` to display FPS, average CPU frame cost, draw calls, triangles, geometry/texture counts and the active quality preset. Compare manual profiles with `?perf=1&quality=medium` or `?perf=1&quality=low`. High quality remains the default; these profiles do not switch automatically.

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

GitHub Actions runs gesture tests, builds the static site and publishes it to GitHub Pages on every push to `main`. Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** on the repository for the first publication.

Expected URL: https://safherofficial.github.io/cat-wizard/

## Repository structure

```text
src/
  main.js           Three.js scene, controls, combat and runtime loop
  gesture.js        one-stroke recognizer and spell templates
  performance.js    render quality presets and optional runtime diagnostics
  style.css         responsive browser shell and HUD
public/assets/
  cat-wizard.webp  full original cat artwork, transparent WebP
tests/
  gesture.test.js   gesture classification checks
  performance.test.js render quality preset checks
docs/
  THREEJS.md        development, gameplay and deployment notes
.github/workflows/
  web.yml           tests, build and GitHub Pages deployment
```

## Verification boundary

The project includes executable Node tests and a Vite production build workflow. Passing those checks validates gesture logic and static bundling; it does not replace a real browser playtest for graphics, controls, device performance or balancing.
