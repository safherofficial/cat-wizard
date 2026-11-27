# Spell Lab — first playable-scene target

## What the scene is

`Assets/CatWizard/Scenes/SpellLab.unity` is the first gameplay test scene. It contains a single bootstrap object. At runtime the bootstrap constructs the arena, creates the cat player and camera, and wires the gesture spell pipeline, effects, and HUD.

This makes the first prototype scene self-contained and keeps the initial work focused on the magic-casting loop. The room is lit by a global 2D light and three colored point lights. The floor is now a detailed runtime-generated stone atlas with an engraved central spell seal, corner runes, carved stone props, reinforced wooden crates, and soft ground shadows. The cat artwork is the supplied transparent character sprite. This is a stylized procedural art pass, not final hand-painted production art.

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

Destroyed props emit temporary rigidbody shards. The arena also includes six individually destructible masonry wall segments and two ruin pillars, so destruction is not limited to furniture-sized objects.

Three cursed wisps now add the first enemy-combat loop. They drift around their starting positions, pursue the cat when it enters their awareness radius, and damage the player on contact. All five spells can damage them; Frost temporarily freezes them and Gravity pulls them toward the vortex. Defeated wisps burst into particles and increment the HUD counter. The cat has five health points, brief hit invulnerability, knockback, and an automatic return to the arena after being defeated.

## Input zones

- Desktop: WASD/arrow keys move; left mouse drag draws the spell.
- Touch: left 32% of the screen is reserved for a virtual movement stick. A touch that starts in the right-hand area draws a gesture.
- Stylus: pen tip draws a gesture.

The left movement touch and right gesture touch are tracked independently by their Input System touch IDs.

## Editor validation command

After the first successful Unity import, use:

`Cat Wizard > Validate Gesture Recognizer`

The command creates a temporary recognizer object and verifies all five template paths in forward and reverse directions after scale, rotation, translation, and small deterministic noise. It also checks that a straight-line stroke is rejected.

This command tests the geometry recognizer only. It does not substitute for testing mouse, touch, stylus, time dilation, physics, or rendering in Play Mode.

## Known limitations

- No boss encounter, ranged enemy attacks, or multi-wave progression yet.
- Wisp and cat feedback still use placeholder procedural visuals; final movement, casting, hit-reaction, and idle animation sets are not implemented yet.
- No spell audio or final VFX package yet.
- Floor, stone, and wooden prop textures are procedurally generated and stylized; final hand-painted environment art, animated character frames, and bespoke spell VFX are still future art milestones.
- Prop destruction currently uses simple radial shard bursts rather than detailed mesh/pixel fracture.
- Gravity and Thunderbolt area interactions are prototype approximations.
- Gesture thresholds need tuning with real mouse/touch/stylus handwriting.
- Unity has not yet compiled or run the project in this execution environment; the first import and Play Mode pass are still required.
