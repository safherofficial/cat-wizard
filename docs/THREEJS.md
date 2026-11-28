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

- Desktop: WASD or arrow keys move Frog Wizard; hold Shift while moving to run. Hold the left mouse button, draw a single glyph and release to cast.
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

The scene is a stylized painted meadow built from a seeded 2048×1536 ground texture, 9,000 animated instanced grass blades, nearly 1,000 flower clusters, tree canopies, bushes, a winding river, a cottage, a working windmill, hills, standing stones and floating fireflies. At its centre, a broken stone ring surrounds a levitating mana core. Frog Wizard is loaded through Three.js GLTFLoader from an optimized 8.79 MB rigged GLB. Its WebP texture atlas preserves both 2048×2048 maps and the base-color alpha channel, cutting the 20.85 MB PNG master by 57.9% without changing mesh geometry, skeleton, weights or five animation clips. `EXT_texture_webp` is a required glTF extension supported by the Three.js 0.187.0 GLTFLoader. The runtime clones the skinned hierarchy with SkeletonUtils, normalizes model height and ground pivot, enables mesh shadows, and preserves the original procedural cat as a fallback if the external asset fails. The controller crossfades between Idle and Walk, uses Shift for Run, plays Cast on successful spells and Hit on damage, and slows the animation mixer together with the world while a glyph is being drawn. Instanced grass bends in the wind and fireflies drift above the flowers. Three faceted cursed wisps pursue the player. Destructible props, player health, invulnerability, respawn and the five gesture spells are retained. The follow camera is closer to the character to emphasize the third-person adventure view.

## Blender character asset

The repository includes `blender/CatWizard_Blender293_CharacterBuilder.zip`, a self-contained Blender 2.93 Python builder for the first Cat Wizard character asset. Frog Wizard was rigged in Blender 2.93.5 and exported as a 20.85 MB skinned PNG GLB master with 21 joints and five clips: Idle, Walk, Run, Cast and Hit. The production browser receives a separate 8.79 MB WebP-compressed GLB (57.9% smaller) with original 2048×2048 texture dimensions and unchanged geometry, skinning and clips. Keep the PNG master for Blender 2.93.5 editing; Three.js 0.187.0 GLTFLoader reads the WebP runtime build through `EXT_texture_webp`. The original model is “Frog wizard with mushrooms” (title by Patch), created by Scenario and licensed under CC BY 4.0. Source: https://huggingface.co/datasets/scenario-labs/3d-collection/blob/55b4c002b4c1529fc48da3dff98516c3069bfa3f/assets/scenario_asset_dyHjpX6aCe8q1eNZFekAwzj6/output.glb. License: https://creativecommons.org/licenses/by/4.0/.

## Runtime timing

- The animation loop subdivides larger frame deltas into small simulation steps, preserving elapsed gameplay time on slower-refresh devices while keeping motion and impact updates stable.

## Deployment

Every push to `main`, or a manual run of **Cat Wizard Web**, runs `npm install`, `npm test`, `npm run build`, verifies the generated static files and publishes `dist/` through GitHub Pages.

The first Pages deployment requires **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. No Unity license or Vercel integration is involved.

Expected URL: https://safherofficial.github.io/cat-wizard/

A successful workflow build confirms static compilation and packaging. Graphics, browser input, device performance and real playability still require hands-on browser testing.
