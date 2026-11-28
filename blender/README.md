# Cat Wizard — Character 02 / Blender 2.93 LTS

This package contains a new Blender candidate asset. It does **not** replace the procedural character currently used by the Three.js game.

## Files

- `CatWizard_CreateCharacter_Blender293.py` — builds the editable character, 13-bone rigid-part rig, five NLA clips, preview render, `.blend` and `.glb`.
- `CatWizard_GLBAudit_Blender293.py` — imports a generated GLB into a separate scene, reports mesh/material/rig/animation statistics, and renders front/side/rear previews.
- `CatWizard_Blender293_CharacterBuilder.zip` — previous Character 01 package, retained as a legacy baseline.
- `../scripts/audit-catwizard-glb.js` — standalone GLB container and game-facing contract audit; does not require Blender.

## Requirements

- Blender 2.93 LTS.
- Blender's bundled glTF 2.0 exporter/importer (`io_scene_gltf2`).
- Node.js 22 for the standalone GLB audit command.
- No external textures or model dependencies.

## Build

1. Open Blender 2.93 and switch to **Scripting**.
2. Open `CatWizard_CreateCharacter_Blender293.py` and click **Run Script**.
3. Check the system console for `CAT WIZARD CHARACTER 02 CREATED`.
4. Inspect `~/CatWizard_Art_v2/`:
   - `cat-wizard-character-v2.blend`
   - `cat-wizard-character-v2.glb`
   - `cat-wizard-character-v2-preview.png`

## Rig

The candidate uses `Root`, `Body`, `Head`, `Hat`, `Ear.L`, `Ear.R`, `Arm.L`, `Arm.R`, `Leg.L`, `Leg.R`, `Tail`, `Tail.Tip` and `Cape`.

It exports five NLA clips: `Idle`, `Walk`, `Run`, `Cast` and `Hit`. The character uses separate rigid mesh parts parented to bones rather than a single deforming skin with weight painting. Bevelled curve details are converted to meshes before glTF export.

## Audit

1. In Blender 2.93, open **Scripting** and run `CatWizard_GLBAudit_Blender293.py`.
2. Select `cat-wizard-character-v2.glb`.
3. Review the generated `_AUDIT.txt` and front/side/rear PNGs beside the GLB.
4. From the repository root, run the Blender-independent GLB check:

   ```bash
   npm run audit:character -- ~/CatWizard_Art_v2/cat-wizard-character-v2.glb
   ```

The Blender audit checks expected bones and animation clips, rigid bone-parenting or weighted mesh binding, geometry counts, dimensions, materials, image-texture UVs and meshes without recognized rig bindings. The standalone audit checks GLB container integrity, embedded buffers, mesh/accessor references, animation channels, required clip names, the full 13-node rig hierarchy and direct mesh attachment to rig bones. Missing required bones, broken hierarchy or mesh nodes detached from rig bones fail the standalone check. Both are structural audits, not visual or runtime certification.

## Runtime integration boundary

Do not copy this candidate into `public/assets/` or replace the live character yet. Review the `.blend`, audit views and browser playback first. The current Three.js procedural character remains active until the candidate is approved.
