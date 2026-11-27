# Cat Wizard

A top-down 2D action game starring the grey cat wizard from the supplied character reference.

The defining mechanic is **gesture-cast magic**: draw a symbol with a mouse, touchscreen, or pen; the game recognizes the stroke and casts the corresponding spell. The world enters slow motion while the gesture is being drawn and returns to normal speed after the spell is released.

## Current milestone

**Vertical Slice 01 — Gesture Spell System**

- Mouse drag on desktop.
- Finger or stylus stroke on touch devices.
- One completed gesture = one spell attempt.
- Gesture recognition is independent of scaled game time.
- World time is slowed while the stroke is active.
- Time returns smoothly to normal immediately after the gesture resolves.
- A visible tracing line follows the pointer.

Initial gesture vocabulary:

| Gesture | Spell |
| --- | --- |
| Circle | Fireball |
| Lightning bolt | Thunderbolt |
| Triangle | Frost |
| Spiral | Gravity |
| Star | Chaos |

## Technology

- Unity 2D with URP.
- C#.
- Unity Input System (mouse, touch, pen).
- 2D physics for environmental interaction.

## Repository layout

```text
Assets/CatWizard/Scripts/
  Spells/
    SpellType.cs
    SpellGestureRecognizer.cs
    SpellGestureInput.cs
    SpellTimeDilation.cs
    SpellStrokeRenderer.cs
    SpellDrawingController.cs
docs/
  VERTICAL_SLICE.md
```

## Current status

This repository is being initialized with the reusable gameplay foundation. A Unity Editor project, scene, character animation set, spell VFX, audio, destructible environment, and platform builds are subsequent integration tasks. No playable build is claimed yet.

## Security

Never commit personal access tokens, API keys, or other credentials. Use the connected Git provider integration or local credential storage instead.
