# Cat Wizard

A top-down 2D action prototype starring the grey cat wizard from the supplied character reference.

The defining mechanic is gesture-cast magic: draw a symbol with a mouse, touchscreen, or pen; the game recognizes the stroke and dispatches the corresponding spell. The world enters slow motion while the gesture is being drawn and returns to normal speed after the stroke resolves.

## Current milestone

**Vertical Slice 01 — Spell Lab**

- A runtime-built top-down arena with boundary walls and floor grid.
- Original cat character sprite imported as a transparent Unity Sprite.
- Desktop movement with WASD / arrow keys.
- Tablet and phone movement with a left-side virtual thumb zone.
- Spell drawing with mouse, finger, or stylus.
- The right side of the touch display is reserved for gesture casting, allowing movement and spell drawing at the same time.
- Template-based one-stroke recognition for five symbols.
- Gesture capture and recognition use screen-space input, independent of scaled world time.
- World time is slowed while the stroke is active (initial target: 0.15x).
- Time returns smoothly to normal after release, including rejected gestures.
- A live LineRenderer tracing view follows the pointer.
- Five first-pass spells interact with real 2D physics props:
  - Circle → Fireball projectile and impact burst.
  - Lightning → jagged lightning line and strike damage.
  - Triangle → Frost burst that freezes props.
  - Spiral → Gravity vortex that pulls props inward.
  - Star → Chaos area blast.
- Destructible crates, barrels, ceramic vases, and stone blocks break into physics shards.
- Runtime HUD displays controls, glyph legend, time-dilation state, and last recognized spell.

## Technology baseline

- Unity 6.3 LTS (pinned editor revision: 6000.3.29f1).
- Universal Render Pipeline 17.3.0.
- Input System 1.20.1.
- C# and Unity 2D physics.

An Editor setup script creates and assigns a URP asset on first import. The URP asset uses Unity's built-in 2D Renderer, which is the base for future Light2D and shadow-caster work.

## Repository layout

```text
Assets/
  CatWizard/
    Scenes/SpellLab.unity
    Scripts/
      Gameplay/
        SpellLabBootstrap.cs
        SpellCombatController.cs
      Player/CatPlayerController.cs
      Spells/
        SpellType.cs
        SpellGestureInput.cs
        SpellGestureRecognizer.cs
        SpellTimeDilation.cs
        SpellStrokeRenderer.cs
        SpellDrawingController.cs
        SpellGestureDebugProbe.cs
      UI/SpellLabHud.cs
      World/
        CameraFollow2D.cs
        DestructibleProp.cs
  Editor/
    CatWizardProjectSetup.cs
    GestureRecognizerValidation.cs
  Resources/CatWizard/cat_wizard_game.png
Packages/manifest.json
ProjectSettings/
  ProjectVersion.txt
  ProjectSettings.asset
  EditorBuildSettings.asset
docs/
  VERTICAL_SLICE.md
  UNITY_SETUP.md
  SPELL_LAB.md
```

## Current status and verification

The Spell Lab scene and its runtime arena/spell systems are now in the repository. The scene is configured as the first build scene. The source has received a static review and the recognizer algorithm was independently exercised against translated, scaled, rotated, and mildly noisy versions of its five template paths. An Editor menu command also provides those checks inside Unity.

**The Unity Editor has not yet been run in this environment.** Unity compilation, asset import, actual mouse/touch/stylus playtesting, rendering verification, and player builds remain pending. Treat this as a first playable-scene implementation awaiting Unity Editor validation, not as a verified release build.

## Open and test

1. Install Unity 6.3 LTS revision 6000.3.29f1 through Unity Hub.
2. Open the repository root in Unity Hub.
3. Allow Package Manager to resolve the manifest and let the Editor finish importing assets.
4. Open `Assets/CatWizard/Scenes/SpellLab.unity` and press Play.
5. For desktop, move with WASD / arrow keys and draw with the left mouse button.
6. On phone or tablet, use the left side to move and draw spells on the right side.
7. Try the five symbols shown in the HUD. Watch the Console for the debug probe's recognized spell and confidence.
8. In the Editor menu, run `Cat Wizard > Validate Gesture Recognizer` to check all five gestures in forward and reverse directions, with transformations, plus straight-line rejection.
9. Inspect Build Settings to confirm SpellLab is the first enabled scene.

More detail is in [docs/UNITY_SETUP.md](docs/UNITY_SETUP.md) and [docs/SPELL_LAB.md](docs/SPELL_LAB.md).

## Security

Never commit personal access tokens, API keys, or other credentials. Use the connected Git provider integration or local credential storage instead.
