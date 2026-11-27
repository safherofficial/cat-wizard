# Cat Wizard — Three.js browser edition

Cat Wizard now runs as a native browser game built with Three.js. Unity is no longer part of the production runtime or web build pipeline.

## Stack

- Three.js `0.187.0` for the WebGL scene, orthographic camera, lighting, materials, sprites and effects.
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

The arena is assembled from Three.js geometry and a generated stone-floor texture. Player movement resolves against the destructible props and fixed ruin pillars; broken props stop blocking the player. The wisps begin far enough from the spawn point to avoid immediate unavoidable contact damage. It includes a spell seal, boundary masonry, ruined pillars, destructible crates, barrels, vases and stone blocks, three pursuing cursed wisps, player health, invulnerability, respawn, spell trails, impact rings and debris. The original cat art is served from `public/assets/cat-wizard.png`.

## Deployment

Every push to `main`, or a manual run of **Cat Wizard Web**, runs `npm install`, `npm test`, `npm run build`, verifies the generated static files and publishes `dist/` through GitHub Pages.

The first Pages deployment requires **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. No Unity license or Vercel integration is involved.

Expected URL: https://safherofficial.github.io/cat-wizard/

A successful workflow build confirms static compilation and packaging. Graphics, browser input, device performance and real playability still require hands-on browser testing.
