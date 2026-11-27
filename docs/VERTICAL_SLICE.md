# Vertical Slice 01 — Spell Lab

## Player fantasy

The player controls the grey cat wizard. Magic is cast by drawing a recognizable one-stroke symbol directly into the game view. There is no spell-selection menu in the core casting loop.

## Input contract

- Desktop: hold and drag the primary mouse button, then release.
- Mobile and tablet: draw with one finger and lift.
- Stylus: use the pen tip as a pointer.
- Touch movement uses the left 32% of the screen; spell drawing uses the right-side area.
- The active touch is tracked by touch ID so movement and gesture drawing can happen simultaneously.
- Each completed stroke is resolved exactly once.
- Stroke capture and recognition use unscaled frame updates and screen-space coordinates. World slow motion must not change drawing speed, sample spacing, or recognition.

## Time-dilation contract

1. Pointer down begins a stroke and immediately sets world time to the configured drawing scale.
2. While the pointer is held, the game world remains slowed; the drawing UI continues to update normally.
3. On pointer release, recognize the stroke and dispatch the matching spell event.
4. Whether recognized or rejected, restore the world's normal speed smoothly using unscaled time.
5. Interruptions (component disabled, focus loss, or app suspension) must not leave the game stuck in slow motion.

Initial tuning:
- Drawing time scale: 0.15.
- Restore duration after release: 0.25 realtime seconds.
- Restore easing: smoothstep.

## Initial gesture vocabulary

| Shape | Spell | First-pass effect |
| --- | --- | --- |
| Circle | Fireball | Projectile and impact burst |
| Lightning bolt | Thunderbolt | Jagged line strike |
| Triangle | Frost | Radial freeze |
| Spiral | Gravity | Pulls nearby props inward |
| Star | Chaos | Large radial damage burst |

The recognizer resamples paths, normalizes rotation, size, and translation, and compares them against one-stroke templates. It accepts modest drawing imperfections and rejects short or ambiguous inputs.

## Spell Lab arena

The procedural first test arena creates a top-down camera, floor/grid, boundary walls, cat sprite, and props:
- Wooden crates.
- Barrels.
- Ceramic vases.
- Stone blocks and pillars.
- Breakable masonry wall segments.

Props use Rigidbody2D, colliders, hit points, spell-specific responses, and temporary physics shards when destroyed. These are placeholder visuals, not final production art.

## Technical stack

- Unity 6.3 LTS.
- URP 17.3.0.
- Input System 1.20.1.
- C#.
- Unity 2D physics.

## Acceptance checks

- [ ] Project opens with no package-resolution errors.
- [ ] URP asset is assigned and Spell Lab scene renders.
- [ ] Mouse drag records one stroke and only one release event.
- [ ] Touch input records one stroke and only one release event.
- [ ] Pen-tip input records one stroke and only one release event.
- [ ] Touch movement and spell drawing can be used simultaneously.
- [ ] World slows at pointer-down, not after recognition.
- [ ] Stroke sampling remains stable during slow motion.
- [ ] Each recognized symbol maps to the correct SpellType.
- [ ] Unrecognized strokes do not cast.
- [ ] Normal time is restored after recognized and rejected strokes.
- [ ] Focus loss / app pause cannot leave Time.timeScale altered.
- [ ] Fireball, Thunderbolt, Frost, Gravity, and Chaos produce their first-pass effects.
- [ ] Props respond to physics and break into shards.
- [ ] HUD remains responsive and legible at target resolutions.
- [ ] Windows and mobile player builds complete successfully.

## Validation boundary

The code, scene entry point, asset, project setup, and Editor validation command are in the repository. Compilation, asset import, rendering, device input, gameplay behavior, and player builds still require an actual Unity Editor/device pass.
