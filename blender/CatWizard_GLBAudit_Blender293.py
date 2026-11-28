# Cat Wizard - GLB audit helper for Blender 2.93
# Run from Blender > Scripting > Run Script, then choose the exported .glb.
# The script imports the GLB into a separate scene, writes a text audit and
# creates front / side / rear material preview renders beside the source file.

import bpy
import addon_utils
import os
import math
from mathutils import Vector
from bpy_extras.io_utils import ImportHelper
from bpy.props import StringProperty


def _fmt_vec(v, digits=3):
    return "(" + ", ".join(("{0:." + str(digits) + "f}").format(float(x)) for x in v) + ")"


def _safe_name(value):
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in value)[:80]


def _enable_gltf_addon():
    try:
        addon_utils.enable("io_scene_gltf2", default_set=True, persistent=True)
    except Exception:
        try:
            bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
        except Exception as exc:
            raise RuntimeError("Impossibile attivare l'importatore glTF di Blender: " + str(exc))
    if not hasattr(bpy.ops.import_scene, "gltf"):
        raise RuntimeError("Importatore glTF non disponibile in questa installazione di Blender.")


def _analyse(scene, filepath, imported_actions=None, imported_images=None):
    objects = list(scene.objects)
    meshes = [o for o in objects if o.type == 'MESH']
    armatures = [o for o in objects if o.type == 'ARMATURE']
    cameras = [o for o in objects if o.type == 'CAMERA']
    lights = [o for o in objects if o.type == 'LIGHT']
    # Only inspect datablocks created by this import. The Blender session may
    # already contain unrelated actions and images from other open projects.
    actions = list(imported_actions or [])
    images = list(imported_images or [])

    lines = []
    warnings = []
    lines.append("CAT WIZARD | GLB TECHNICAL AUDIT")
    lines.append("=" * 72)
    lines.append("Source: " + filepath)
    lines.append("File size: {0:.2f} MB".format(os.path.getsize(filepath) / (1024.0 * 1024.0)))
    lines.append("Blender: " + bpy.app.version_string)
    lines.append("")

    lines.append("SUMMARY")
    lines.append("- Objects: {0} (meshes {1}, armatures {2}, cameras {3}, lights {4})".format(
        len(objects), len(meshes), len(armatures), len(cameras), len(lights)))

    total_vertices = 0
    total_faces = 0
    total_triangles = 0
    mesh_names = []
    bbox_min = Vector((float('inf'), float('inf'), float('inf')))
    bbox_max = Vector((float('-inf'), float('-inf'), float('-inf')))

    for obj in meshes:
        mesh = obj.data
        mesh.calc_loop_triangles()
        total_vertices += len(mesh.vertices)
        total_faces += len(mesh.polygons)
        total_triangles += len(mesh.loop_triangles)
        mesh_names.append(obj.name)
        for corner in obj.bound_box:
            p = obj.matrix_world @ Vector(corner)
            for i in range(3):
                bbox_min[i] = min(bbox_min[i], p[i])
                bbox_max[i] = max(bbox_max[i], p[i])

    lines.append("- Total vertices: {0:,}".format(total_vertices))
    lines.append("- Total polygon faces: {0:,}".format(total_faces))
    lines.append("- Total triangles: {0:,}".format(total_triangles))
    if meshes:
        dimensions = bbox_max - bbox_min
        center = (bbox_min + bbox_max) * 0.5
        lines.append("- World bounds: min {0}, max {1}".format(_fmt_vec(bbox_min), _fmt_vec(bbox_max)))
        lines.append("- Overall dimensions (Blender units): {0}".format(_fmt_vec(dimensions)))
        lines.append("- Bounding-box center: {0}".format(_fmt_vec(center)))
    else:
        center = Vector((0, 0, 0))
        dimensions = Vector((0, 0, 0))
        warnings.append("No mesh objects were imported.")

    lines.append("")
    lines.append("MESH DETAILS")
    for obj in meshes:
        mesh = obj.data
        mesh.calc_loop_triangles()
        mats = [slot.material.name if slot.material else "<empty>" for slot in obj.material_slots]
        uv_names = [uv.name for uv in mesh.uv_layers]
        uses_image_texture = any(
            material and material.use_nodes and material.node_tree and any(
                node.type == 'TEX_IMAGE' and node.image
                for node in material.node_tree.nodes
            )
            for material in [slot.material for slot in obj.material_slots]
        )
        vg_count = len(obj.vertex_groups)
        arm_mods = [m for m in obj.modifiers if m.type == 'ARMATURE']
        lines.append("\n[{0}]".format(obj.name))
        lines.append("  vertices={0:,} faces={1:,} triangles={2:,}".format(
            len(mesh.vertices), len(mesh.polygons), len(mesh.loop_triangles)))
        lines.append("  dimensions={0} scale={1}".format(_fmt_vec(obj.dimensions), _fmt_vec(obj.scale)))
        lines.append("  UV layers={0}".format(", ".join(uv_names) if uv_names else "NONE"))
        lines.append("  material slots={0}".format(", ".join(mats) if mats else "NONE"))
        lines.append("  vertex groups={0}; armature modifiers={1}".format(vg_count, len(arm_mods)))
        lines.append("  parent={0}".format(obj.parent.name if obj.parent else "NONE"))
        lines.append("  shape keys={0}".format(len(mesh.shape_keys.key_blocks) if mesh.shape_keys else 0))
        if not obj.material_slots:
            warnings.append("Mesh '{0}' has no material slots.".format(obj.name))
        if uses_image_texture and not mesh.uv_layers:
            warnings.append("Mesh '{0}' uses image textures but has no UV map.".format(obj.name))

    lines.append("\nARMATURE / RIG")
    if not armatures:
        lines.append("No armature found.")
        warnings.append("No armature: the model is not rigged for skeletal animation.")
    required_bones = {
        "Root", "Body", "Head", "Hat", "Ear.L", "Ear.R",
        "Arm.L", "Arm.R", "Leg.L", "Leg.R", "Tail", "Tail.Tip", "Cape"
    }
    for rig in armatures:
        rig_bones = {bone.name for bone in rig.data.bones}
        lines.append("[{0}] bones={1}, pose bones={2}".format(
            rig.name, len(rig.data.bones), len(rig.pose.bones)))
        lines.append("  root parent={0}".format(rig.parent.name if rig.parent else "NONE"))
        missing = sorted(required_bones.difference(rig_bones))
        lines.append("  required Cat Wizard bones missing={0}".format(", ".join(missing) if missing else "NONE"))
        if missing:
            warnings.append("Armature '{0}' is missing expected bones: {1}.".format(rig.name, ", ".join(missing)))

    skinned = [o for o in meshes if any(m.type == 'ARMATURE' for m in o.modifiers)]
    rigid_bone_parts = [
        o for o in meshes
        if o.parent and o.parent.type == 'ARMATURE'
        and o.parent_type == 'BONE' and bool(o.parent_bone)
    ]
    bound_mesh_ids = {o.as_pointer() for o in skinned + rigid_bone_parts}
    unbound_meshes = [o for o in meshes if o.as_pointer() not in bound_mesh_ids]
    unknown_bone_parts = [
        o for o in rigid_bone_parts
        if o.parent_bone not in {bone.name for rig in armatures for bone in rig.data.bones}
    ]
    lines.append("Weighted meshes with Armature modifier: {0}/{1}".format(len(skinned), len(meshes)))
    lines.append("Rigid meshes parented to armature bones: {0}/{1}".format(len(rigid_bone_parts), len(meshes)))
    lines.append("Meshes without recognized rig binding: {0}/{1}".format(len(unbound_meshes), len(meshes)))
    if unbound_meshes:
        warnings.append("Meshes without weighted or rigid armature binding: " +
                        ", ".join(o.name for o in unbound_meshes))
    if unknown_bone_parts:
        warnings.append("Rigid mesh parts reference unexpected bone names: " +
                        ", ".join(o.name + " -> " + o.parent_bone for o in unknown_bone_parts))
    if armatures and not skinned and not rigid_bone_parts:
        warnings.append("Armature exists but no mesh uses skin weights or bone parenting.")

    lines.append("\nANIMATION")
    expected_clips = ("Idle", "Walk", "Run", "Cast", "Hit")
    if not actions:
        lines.append("No actions imported.")
        warnings.append("No animation actions found in the GLB.")
    else:
        imported_names = [action.name for action in actions]
        for action in actions:
            fr = action.frame_range
            lines.append("- {0}: frames {1:.1f}–{2:.1f} ({3:.1f} frames)".format(
                action.name, fr[0], fr[1], max(0.0, fr[1] - fr[0])))
        missing_clips = [clip for clip in expected_clips if not any(clip.lower() in name.lower() for name in imported_names)]
        lines.append("Expected clips missing: {0}".format(", ".join(missing_clips) if missing_clips else "NONE"))
        if missing_clips:
            warnings.append("Expected animation clips not found in imported GLB: " + ", ".join(missing_clips))

    lines.append("\nMATERIALS / TEXTURES")
    material_count = 0
    for mat in bpy.data.materials:
        if mat.name not in {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}:
            continue
        material_count += 1
        lines.append("\n[{0}] nodes={1}".format(mat.name, mat.use_nodes))
        if mat.use_nodes and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    base = node.inputs.get('Base Color')
                    metallic = node.inputs.get('Metallic')
                    roughness = node.inputs.get('Roughness')
                    lines.append("  Principled: base={0}, metallic={1}, roughness={2}".format(
                        _fmt_vec(base.default_value, 2) if base else "n/a",
                        round(float(metallic.default_value), 3) if metallic else "n/a",
                        round(float(roughness.default_value), 3) if roughness else "n/a"))
                elif node.type == 'TEX_IMAGE' and node.image:
                    img = node.image
                    lines.append("  Image: {0} ({1}x{2}), packed={3}, path={4}".format(
                        img.name, img.size[0], img.size[1], bool(img.packed_file), img.filepath))
        else:
            lines.append("  Material is not node based.")
    lines.append("\nUsed materials: {0}".format(material_count))
    lines.append("Imported image datablocks: {0}".format(len(images)))
    for img in images:
        lines.append("- {0}: {1}x{2}, packed={3}, path={4}".format(
            img.name, img.size[0], img.size[1], bool(img.packed_file), img.filepath))

    lines.append("\nGAME-READINESS CHECKS")
    if total_triangles > 50000:
        warnings.append("Triangle count exceeds 50k; measure runtime cost and consider a gameplay LOD.")
    if total_triangles > 100000:
        warnings.append("Triangle count exceeds 100k; likely too heavy for a single browser-game character without optimization.")
    if meshes and (dimensions.x <= 0 or dimensions.y <= 0 or dimensions.z <= 0):
        warnings.append("One or more overall dimensions are zero; inspect import scale / geometry.")
    if meshes and max(dimensions) > 1000:
        warnings.append("Model dimensions are unusually large; verify applied scale and units.")
    if meshes and max(dimensions) < 0.01:
        warnings.append("Model dimensions are unusually small; verify applied scale and units.")
    if warnings:
        for warning in warnings:
            lines.append("[CHECK] " + warning)
    else:
        lines.append("No automatic red flags detected. Visual review is still required.")
    lines.append("\nIMPORTANT: This is a structural audit only. It cannot certify deformation quality or visual fidelity.")

    return "\n".join(lines), center, dimensions, meshes


def _make_previews(scene, filepath, center, dimensions, meshes):
    if not meshes:
        return []

    # Use Blender Workbench for dependable material/object previews without external assets.
    old_engine = scene.render.engine
    old_res = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 85
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.background_type = 'WORLD'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = 'WORLD'
    scene.display.shading.show_specular_highlight = True

    camera_data = bpy.data.cameras.new("CW_AuditCamera")
    camera_obj = bpy.data.objects.new("CW_AuditCamera", camera_data)
    scene.collection.objects.link(camera_obj)
    scene.camera = camera_obj
    camera_data.type = 'ORTHO'
    camera_data.lens = 50

    radius = max(float(max(dimensions)), 1.0)
    distance = radius * 3.2
    target = center.copy()
    # GLB commonly uses front = -Y in Blender coordinates; side and rear are included for checking.
    views = [
        ("Front", Vector((0, -distance, 0))),
        ("Side", Vector((distance, 0, 0))),
        ("Rear", Vector((0, distance, 0))),
    ]
    outputs = []
    source_dir = os.path.dirname(filepath)
    base_name = os.path.splitext(os.path.basename(filepath))[0]

    for label, offset in views:
        camera_obj.location = target + offset + Vector((0, 0, radius * 0.08))
        direction = target - camera_obj.location
        camera_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        camera_data.ortho_scale = radius * 1.55
        out_path = os.path.join(source_dir, base_name + "_AUDIT_" + label.upper() + ".png")
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        outputs.append(out_path)

    scene.render.engine = old_engine
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = old_res
    scene.camera = None
    bpy.data.objects.remove(camera_obj, do_unlink=True)
    bpy.data.cameras.remove(camera_data)
    return outputs


class CW_OT_AuditGLB(bpy.types.Operator, ImportHelper):
    bl_idname = "import_scene.catwizard_audit_glb"
    bl_label = "Import and Audit Cat Wizard GLB"
    bl_options = {'REGISTER', 'UNDO'}

    filename_ext = ".glb"
    filter_glob: StringProperty(default="*.glb", options={'HIDDEN'})

    def execute(self, context):
        filepath = bpy.path.abspath(self.filepath)
        if not os.path.isfile(filepath):
            self.report({'ERROR'}, "File GLB non trovato.")
            return {'CANCELLED'}

        try:
            _enable_gltf_addon()
            scene = bpy.data.scenes.new("CAT_WIZARD_GLB_AUDIT")
            context.window.scene = scene
            actions_before = set(bpy.data.actions)
            images_before = set(bpy.data.images)
            bpy.ops.import_scene.gltf(filepath=filepath)
            imported_actions = [item for item in bpy.data.actions if item not in actions_before]
            imported_images = [item for item in bpy.data.images if item not in images_before]
            report, center, dimensions, meshes = _analyse(
                scene, filepath, imported_actions, imported_images
            )
            out_dir = os.path.dirname(filepath)
            base_name = os.path.splitext(os.path.basename(filepath))[0]
            report_path = os.path.join(out_dir, base_name + "_AUDIT.txt")
            with open(report_path, "w", encoding="utf-8") as handle:
                handle.write(report)
            previews = _make_previews(scene, filepath, center, dimensions, meshes)
            self.report({'INFO'}, "Audit completato: " + report_path)
            print("\n" + report + "\n")
            print("Preview create: " + ", ".join(previews))
            return {'FINISHED'}
        except Exception as exc:
            self.report({'ERROR'}, "Audit GLB fallito: " + str(exc))
            print("CAT WIZARD GLB AUDIT ERROR:", repr(exc))
            return {'CANCELLED'}


def register():
    bpy.utils.register_class(CW_OT_AuditGLB)
    try:
        bpy.ops.import_scene.catwizard_audit_glb('INVOKE_DEFAULT')
    except Exception as exc:
        print("Avvia il comando F3 > Import and Audit Cat Wizard GLB:", exc)


def unregister():
    bpy.utils.unregister_class(CW_OT_AuditGLB)


if __name__ == "__main__":
    register()