# Unity project setup

## Editor and packages

The repository is pinned to Unity 6.3 LTS editor revision 6000.3.27f2.

The package manifest pins:
- Input System 1.20.1.
- Universal Render Pipeline 17.3.0.

Open the repository root in Unity Hub and allow Package Manager to resolve the manifest before opening scenes. Use the same editor revision recorded in ProjectSettings/ProjectVersion.txt for the first import.

## Required Player setting

The scripts use Unity Input System device APIs. In the Editor, open:

Edit → Project Settings → Player → Other Settings → Configuration → Active Input Handling

Choose Input System Package (New), or Both if legacy input is also needed. Restart the Editor if Unity requests it.

## Spell-system GameObjects

Create a GameObject named SpellSystems and add:
- SpellGestureInput
- SpellGestureRecognizer
- SpellTimeDilation
- SpellDrawingController

The controller can auto-find the first three components on the same GameObject. Assign the gesture trail component in the Stroke Renderer field.

Create a child or sibling GameObject named GestureTrail:
- Add a LineRenderer.
- Add SpellStrokeRenderer.
- Assign the gameplay camera.
- Use worldPlaneZ 0 for a typical 2D scene where sprites sit on Z=0.
- Assign an unlit/additive material and tune line width in the Inspector.

Use a top-down orthographic camera looking toward the XY gameplay plane. Place the cat, scenery, and other world objects on that plane.

## Spell event integration

SpellDrawingController exposes a SpellCast event. Subscribe the gameplay spell system to receive:
- SpellType: the recognized spell.
- Screen release position: the end of the drawing gesture.
- Confidence: recognizer score from 0 to 1.

The event is the handoff point for projectile spawning, spell-specific VFX, collision effects, and environmental destruction. Those effect systems and the playable test scene are not included in this initial source foundation yet.

## First manual checks

1. Enter Play Mode on desktop and hold-drag a large circle with the left mouse button.
2. Confirm the world slows as soon as the mouse is pressed.
3. Confirm the tracing line follows the mouse at normal input responsiveness.
4. Release the mouse and confirm Fireball is emitted through the SpellCast event.
5. Repeat with a lightning bolt, triangle, spiral, and star.
6. Repeat on a touch device, then with a supported stylus.
7. Draw an unknown scribble and confirm no spell event is emitted.
8. Confirm the world returns to normal time after both recognized and rejected strokes.

The recognizer thresholds are initial tuning values and must be playtested on real device input before being treated as final.
