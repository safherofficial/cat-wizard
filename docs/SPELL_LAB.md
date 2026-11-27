# Spell Lab — first playable-scene target

## What the scene is

`Assets/CatWizard/Scenes/SpellLab.unity` is the first gameplay test scene. It contains a single bootstrap object. At runtime the bootstrap constructs the arena, creates the cat player and camera, and wires the gesture spell pipeline, effects, and HUD.

This makes the first prototype scene self-contained and keeps the initial work focused on the magic-casting loop. The environment and spell sprites are placeholders generated at runtime. The cat artwork is the supplied transparent character sprite.

## Play loop

1. Move the cat through the room.
2. Press and hold the mouse or touch the right-side gesture area.
3. Watch the room slow down while the stroke is traced.
4. Draw one of the five glyphs.
5. Release the pointer to dispatch the spell.
6. Observe the target props react and the world return to normal speed.

## Spell mapping

| Gesture | Spell | Target interaction |
| --- | --- | --- |
| Circle | Fireball | A fireball travels from the cat toward the release point and bursts on arrival. |
| Lightning bolt | Thunderbolt | A jagged arc connects the cat and target point; nearby props take strike damage. |
| Triangle | Frost | Nearby props receive a temporary freeze and ice tint. |
| Spiral | Gravity | A temporary vortex pulls nearby props inward before a release impulse. |
| Star | Chaos | A larger radial burst damages and throws nearby props. |

Destroyed props emit temporary rigidbody shards. This is intentionally a first-pass feedback loop; the current props do not yet have final bespoke destruction meshes, fracture maps, explosion chains, or persistence.

## Input zones

- Desktop: WASD/arrow keys move; left mouse drag draws the spell.
- Touch: left 32% of the screen is reserved for a virtual movement stick. A touch that starts in the right-hand area draws a gesture.
- Stylus: pen tip draws a gesture.

The left movement touch and right gesture touch are tracked independently by their Input System touch IDs.

## Editor validation command

After the first successful Unity import, use:

`Cat Wizard > Validate Gesture Recognizer`

The command creates a temporary recognizer object and verifies that all five template paths are still recognized after scale, rotation, translation, and small deterministic noise. It also checks that a straight-line stroke is rejected.

This command tests the geometry recognizer only. It does not substitute for testing mouse, touch, stylus, time dilation, physics, or rendering in Play Mode.

## Known limitations

- No enemy AI or boss encounter yet.
- No final cat movement, casting, hit-reaction, or idle animation set yet.
- No spell audio or final VFX package yet.
- Arena props and impact effects are placeholder generated sprites.
- Prop destruction currently uses simple radial shard bursts rather than detailed mesh/pixel fracture.
- Gravity and Thunderbolt area interactions are prototype approximations.
- Gesture thresholds need tuning with real mouse/touch/stylus handwriting.
- Unity has not yet compiled or run the project in this execution environment; the first import and Play Mode pass are still required.
