# Cat Wizard

**A little magic. A lot of attitude.**

Cat Wizard is a top-down fantasy action prototype starring a distinguished grey cat wizard. Its defining mechanic is gesture-cast magic: draw one continuous symbol with the mouse, touchscreen, or pen; the world slows while the stroke is being drawn; release to cast.

## Current build — Three.js browser edition

The game now runs natively in the browser on **Three.js 0.187.0** with **Vite 8.4.0**. Unity is no longer used for the game runtime or browser build.

- A dark stone training hall with a central spell seal, boundary walls, ruined pillars, destructible props, colored lights and player obstacle collision.
- Full original grey cat wizard artwork, with the green chroma background removed and alpha transparency preserved, loaded as a lightweight WebP sprite.
- Desktop movement with WASD or arrow keys.
- Touch movement on the left side and independent spell drawing on the right side.
- Five normalized one-stroke gesture templates with forward/reverse recognition and rejection of short or straight strokes.
- World time slows to 15% during drawing and eases back over 250 ms after release.
- Fireball, Thunderbolt, Frost, Gravity and Chaos effects.
- Destructible crates, barrels, vases and stone props with knockback and debris.
- Three pursuing cursed wisps with safe initial spacing, player health, temporary invulnerability and arena respawn.
- Responsive browser HUD and fullscreen mode.

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
