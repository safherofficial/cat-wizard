# Cat Wizard

A top-down 2D action game starring the grey cat wizard from the supplied character reference.

The defining mechanic is gesture-cast magic: draw a symbol with a mouse, touchscreen, or pen; the game recognizes the stroke and dispatches the corresponding spell event. The world enters slow motion while the gesture is being drawn and returns to normal speed after the stroke resolves.

## Current milestone

**Vertical Slice 01 — Gesture Spell System**

- Mouse drag on desktop.
- Finger or stylus stroke on touch devices.
- One completed gesture = one spell attempt.
- Template-based one-stroke recognition for five symbols.
- Gesture capture and recognition use screen-space input, independent of scaled world time.
- World time is slowed while the stroke is active (initial target: 0.15x).
- Time returns smoothly to normal after release, including rejected gestures.
- A LineRenderer tracing view follows the pointer.
- A temporary Console probe verifies recognized spell events.

Initial gesture vocabulary:

| Gesture | Spell |
| --- | --- |
| Circle | Fireball |
| Lightning bolt | Thunderbolt |
| Triangle | Frost |
| Spiral | Gravity |
| Star | Chaos |

## Technology baseline

- Unity 6.3 LTS (pinned editor revision: 6000.3.27f2).
- Universal Render Pipeline 17.3.0.
- Input System 1.20.1.
- C# and Unity 2D physics.

## Repository layout

```text
Assets/CatWizard/Scripts/Spells/
  CatWizard.Spells.asmdef
  SpellType.cs
  SpellGestureInput.cs
  SpellGestureRecognizer.cs
  SpellTimeDilation.cs
  SpellStrokeRenderer.cs
  SpellDrawingController.cs
  SpellGestureDebugProbe.cs
Packages/manifest.json
ProjectSettings/ProjectVersion.txt
docs/
  VERTICAL_SLICE.md
  UNITY_SETUP.md
```

## Current status

The repository contains the first reusable gesture-input, recognition, time-dilation, tracing, and event-dispatch code foundation. It does **not** yet contain the finished cat controller, playable test scene, projectile/effect prefabs, destructible environment, enemy AI, animation/audio package, or platform builds. The recognition and slow-motion logic still needs import, compilation, and manual playtesting in the Unity Editor.

## Setup

See docs/UNITY_SETUP.md for package resolution, Input System configuration, scene wiring, and first manual checks.

## Security

Never commit personal access tokens, API keys, or other credentials. Use the connected Git provider integration or local credential storage instead.
