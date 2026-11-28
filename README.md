# Cat Wizard

**A little magic. A lot of attitude.**

Cat Wizard is a top-down fantasy action prototype starring a distinguished grey cat wizard. Its defining mechanic is gesture-cast magic: draw one continuous symbol with the mouse, touchscreen, or pen; the world slows while the stroke is being drawn; release to cast.

## Current build — Three.js browser edition

The game now runs natively in the browser on **Three.js 0.187.0** with **Vite 8.4.0**. Unity is no longer used for the game runtime or browser build.

- A hand-painted meadow arena with a winding dirt path, river, swaying 3D grass, wildflowers, trees, cottage, windmill, standing stones, fireflies and a floating spell core.
- Frog Wizard is the main character, now loaded from a rigged GLB with a 21-joint skeleton and five animation clips: Idle, Walk, Run, Cast and Hit. The runtime normalizes model height and ground pivot, enables mesh shadows, and keeps the original procedural cat as a safe fallback if the external asset cannot be reached.
- Desktop movement with WASD or arrow keys; hold Shift to run.
- Touch movement on the left side and independent spell drawing on the right side.
- Five normalized one-stroke gesture templates with forward/reverse recognition and rejection of short or straight strokes.
- World time slows to 15% during drawing and eases back over 250 ms after release.
- Fireball, Thunderbolt, Frost, Gravity and Chaos effects.
- Destructible crates, barrels, vases and stone props with knockback and debris.
- Three pursuing cursed wisps with safe initial spacing, player health, temporary invulnerability and arena respawn.
- Responsive browser HUD and fullscreen mode.

## Blender character source

A Blender 2.93-compatible character builder is included in `blender/CatWizard_Blender293_CharacterBuilder.zip`. Run the Python script from Blender's **Scripting** workspace to generate an editable `.blend`, a game-ready `.glb`, and a preview render under `~/CatWizard_Art/`. The builder creates a rigid-bone character rig with Idle, Walk, Run, Cast and Hit animation clips. The current Frog Wizard GLB has no embedded animation clips or skeletal rig. Idle bobbing, facing and movement are driven by the existing runtime controller; full limb animation requires a rigged, animated export.

## Frog Wizard model attribution

The original 3D model is “Frog wizard with mushrooms” (title by Patch), created by Scenario. Source: https://huggingface.co/datasets/scenario-labs/3d-collection/blob/55b4c002b4c1529fc48da3dff98516c3069bfa3f/assets/scenario_asset_dyHjpX6aCe8q1eNZFekAwzj6/output.glb. Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/. Modifications for this game include rigging and the Idle, Walk, Run, Cast and Hit animation clips.

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
  style.css         responsive browser shell and HUD
public/assets/
  cat-wizard.webp  full original cat artwork, transparent WebP
tests/
  gesture.test.js   gesture classification checks
docs/
  THREEJS.md        development, gameplay and deployment notes
.github/workflows/
  web.yml           tests, build and GitHub Pages deployment
```

## Verification boundary

The project includes executable Node tests and a Vite production build workflow. Passing those checks validates gesture logic and static bundling; it does not replace a real browser playtest for graphics, controls, device performance or balancing.
