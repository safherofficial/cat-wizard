# Vertical Slice 01 — Gesture Spell System

## Player fantasy

The player controls the grey cat wizard. Magic is cast by drawing a recognizable one-stroke symbol directly into the game view. There is no spell-selection menu in the core casting loop.

## Input contract

- Desktop: hold and drag the primary mouse button, then release.
- Mobile and tablet: draw with one finger and lift.
- Stylus: use the pen tip as a pointer.
- Each completed stroke is resolved exactly once.
- Stroke capture and recognition use screen-space coordinates. World slow motion must not change drawing speed, sample spacing, or recognition.

## Time-dilation contract

1. Pointer down begins a stroke and immediately sets world time to the configured drawing scale.
2. While the pointer is held, the game world remains slowed; the drawing UI continues to update normally.
3. On pointer release, recognize the stroke and dispatch the matching spell event.
4. Whether recognized or rejected, restore the world's normal speed smoothly using unscaled time.
5. Interruptions (component disabled or application losing focus) must not leave the game stuck in slow motion.

Initial tuning target:
- Drawing time scale: 0.15.
- Restore duration after release: 0.25 realtime seconds.
- Restore easing: smoothstep.
- These are playtest starting values, not final balance.

## Initial gesture vocabulary

| Shape | Spell | Expected behavior |
| --- | --- | --- |
| Circle | Fireball | Explosive projectile |
| Lightning bolt | Thunderbolt | Fast electrical strike |
| Triangle | Frost | Freezing burst |
| Spiral | Gravity | Pull or push objects |
| Star | Chaos | High-impact area spell |

Recognition should tolerate size changes, rotation, and modest hand-drawn imperfections. It must reject very short accidental strokes and ambiguous shapes rather than firing a random spell.

## First implementation boundary

The current code layer provides:
- Mouse, touch, and pen stroke capture through Unity Input System.
- Screen-space stroke events.
- A template-based one-stroke recognizer.
- A world time-dilation controller.
- A LineRenderer-based tracing view.
- A controller that connects gesture recognition, the spell event, and time restoration.

The event SpellDrawingController.SpellCast is the integration point for projectile/effect systems. The first commit does not claim that final spell VFX, damage, destructible props, enemy AI, animation, audio, or a playable Unity scene are complete.

## Acceptance checks

- [ ] Mouse drag records one stroke and only one release event.
- [ ] Touch input records one stroke and only one release event.
- [ ] Pen-tip input records one stroke and only one release event.
- [ ] World slows at pointer-down, not after recognition.
- [ ] Stroke sampling remains stable during slow motion.
- [ ] Each recognized symbol maps to the correct SpellType.
- [ ] Unrecognized strokes do not cast.
- [ ] Normal time is restored after both recognized and rejected strokes.
- [ ] Focus loss / component disable cannot leave Time.timeScale altered.
- [ ] UI and stroke rendering remain responsive during slow motion.
