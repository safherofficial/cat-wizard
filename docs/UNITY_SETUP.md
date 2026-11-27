# Unity setup and first run

## Required Editor and packages

Open this repository with Unity 6.3 LTS revision 6000.3.27f2. Package Manager resolves:

- Input System 1.20.1.
- Universal Render Pipeline 17.3.0.

Let the first import finish before opening the scene. The project includes an Editor initialization script that creates `Assets/Settings/CatWizardURP.asset` and assigns it to Graphics Settings and all quality levels when no URP asset is already assigned. The initial renderer is Unity's built-in Universal Renderer. The dedicated 2D Renderer and Light2D lighting pass are deferred to a later art/lighting milestone.

If the setup script did not run, use `Cat Wizard > Configure Universal Render Pipeline` from the Editor menu. The script does not overwrite a different render pipeline already assigned to the project.

## Scene

Open `Assets/CatWizard/Scenes/SpellLab.unity`. It is also registered as the first enabled Build Settings scene.

Press Play. The scene bootstrap creates:
- Top-down orthographic camera with smooth follow.
- Arena floor, grid, boundary walls, and destructible training props.
- Cat sprite loaded from `Resources/CatWizard/cat_wizard_game`.
- Player movement, gesture capture, slow motion, recognition, tracing, spell effects, and HUD.

The first version uses generated placeholder sprites for the arena props and spell effects. The supplied cat illustration is the actual imported sprite.

## Controls

### Desktop
- Move: WASD or arrow keys.
- Cast: hold the left mouse button, draw one continuous symbol, release.

### Phone / tablet
- Move: hold and drag from the left-side movement zone (left 32% of the screen).
- Cast: draw with a finger on the right-side gesture area.
- Stylus: draw with the pen tip.
- The Input System tracks the active touch ID, so a left-thumb movement touch and a right-side spell gesture can coexist.

The recognizer uses screen-space points and unscaled frame timing. The world slows to 0.15x during a gesture. A recognized spell is dispatched once on release; unrecognized strokes are rejected. Time then eases back to its normal scale over 0.25 realtime seconds.

## Spell effects

The initial glyphs are:
- Circle — Fireball: moving projectile followed by an area impact.
- Lightning bolt — Thunderbolt: jagged line strike and sampled collision damage.
- Triangle — Frost: radial pulse and temporary prop freeze.
- Spiral — Gravity: temporary vortex that pulls props inward.
- Star — Chaos: larger radial damage pulse.

Destroyed props emit temporary physics shards. These are first-pass placeholder effects and require visual tuning and platform performance tests.

## Validation

In the Unity Editor, run `Cat Wizard > Validate Gesture Recognizer`. The command checks all five templates after rotation, scaling, translation, and small deterministic point noise; it also checks rejection of a straight-line stroke.

Then manually verify:
1. Mouse down slows the world immediately.
2. The trace remains responsive while the world is slowed.
3. Releasing a recognized glyph logs the correct spell once in Console.
4. Unknown scribbles do not cast.
5. The world returns to normal after both recognized and rejected strokes.
6. Props move, freeze, or break according to the spell.
7. On a touch device, movement on the left and spell drawing on the right work at the same time.
8. Test stylus input separately on a supported device.

## Known validation boundary

The repository has not yet been imported, compiled, or played in Unity in this environment. No Windows, Android, or iOS build has been produced. The Editor validation command and the manual checklist must be run in Unity before treating this milestone as verified.
