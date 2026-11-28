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
npm run build
npm run preview
```

The deployable site is written to `dist/`.

## Controls

- Desktop: WASD or arrow keys move the cat; hold the left mouse button, draw a single glyph and release to cast.
- Touch: hold and drag on the left 32% of the game surface to move; draw and release on the right side to cast. Pointer IDs are independent, allowing movement and spell drawing together.
- Drawing reduces world simulation speed to 15%; after release it eases back to full speed over 250 ms.

## Spells

| Gesture | Spell | Effect |
| --- | --- | --- |
| Circle | Fireball | Traveling fire projectile and impact burst. |
| Lightning | Thunderbolt | Strike that damages objects and wisps along its path. |
| Triangle | Frost | Area pulse that chills and temporarily freezes targets. |
| Spiral | Gravity | Temporary vortex pulling movable objects and wisps inward, with an impact pulse for wisps in range. |
| Star | Chaos | Wide, high-impact blast. |

## Gameplay

The scene is a stylized painted meadow built from a seeded 2048×1536 ground texture, 9,000 animated instanced grass blades, nearly 1,000 flower clusters, tree canopies, bushes, a winding river, a cottage, a working windmill, hills, standing stones and floating fireflies. At its centre, a broken stone ring surrounds a levitating mana core. The protagonist is now Frog Wizard, loaded through Three.js GLTFLoader from an optimized GLB asset. The loader selects the lighter LOD1 scene (~63k triangles), normalizes model height and ground pivot, enables mesh shadows, and keeps the original character as a graceful fallback if the asset fails to load. The GLB does not contain animation clips or a skeletal rig, so the existing controller supplies facing, idle bob and movement motion without changing WASD or camera-relative controls. Instanced grass bends in the wind and fireflies drift above the flowers. Three faceted cursed wisps pursue the player. Destructible props, player health, invulnerability, respawn and the five gesture spells are retained. The follow camera is closer to the character to emphasize the third-person adventure view.

## Blender character asset

The repository includes `blender/CatWizard_Blender293_CharacterBuilder.zip`, a self-contained Blender 2.93 Python builder for the first Cat Wizard character asset. It generates an editable Blender project, a GLB export and a preview render, with separate NLA clips for idle, walk, run, cast and hit. The script has been statically syntax-checked, but it has not yet been executed in the user's local Blender installation. The runtime now loads the optimized Frog Wizard LOD1 scene directly. The Blender builder remains useful for future rigged/animated exports; the current GLB has no animation clips.

## Runtime timing

- The animation loop subdivides larger frame deltas into small simulation steps, preserving elapsed gameplay time on slower-refresh devices while keeping motion and impact updates stable.

## Deployment

Every push to `main`, or a manual run of **Cat Wizard Web**, runs `npm install`, `npm test`, `npm run build`, verifies the generated static files and publishes `dist/` through GitHub Pages.

The first Pages deployment requires **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. No Unity license or Vercel integration is involved.

Expected URL: https://safherofficial.github.io/cat-wizard/

A successful workflow build confirms static compilation and packaging. Graphics, browser input, device performance and real playability still require hands-on browser testing.
