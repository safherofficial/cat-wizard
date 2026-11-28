"""Static source-contract checks for Cat Wizard's Blender 2.93 scripts.

These tests do not import bpy and do not replace running the scripts in Blender.
They protect the builder/export/audit contract in regular CI environments.
"""

import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLENDER_DIR = ROOT / "blender"
BUILDER_PATH = BLENDER_DIR / "CatWizard_CreateCharacter_Blender293.py"
AUDIT_PATH = BLENDER_DIR / "CatWizard_GLBAudit_Blender293.py"
EXPECTED_BONES = {
    "Root", "Body", "Head", "Hat", "Ear.L", "Ear.R",
    "Arm.L", "Arm.R", "Leg.L", "Leg.R", "Tail", "Tail.Tip", "Cape",
}
EXPECTED_CLIPS = {"Idle", "Walk", "Run", "Cast", "Hit"}


def parse_source(path):
    source = path.read_text(encoding="utf-8")
    return source, ast.parse(source, filename=str(path))


def assigned_literal(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            if any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
                return ast.literal_eval(node.value)
    raise AssertionError("Assignment not found: " + name)


def call_name(node):
    return ast.unparse(node.func)


class BlenderSourceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder_source, cls.builder = parse_source(BUILDER_PATH)
        cls.audit_source, cls.audit = parse_source(AUDIT_PATH)

    def test_both_scripts_are_valid_python(self):
        self.assertIsInstance(self.builder, ast.Module)
        self.assertIsInstance(self.audit, ast.Module)

    def test_builder_declares_the_complete_13_bone_rig(self):
        self.assertEqual(set(assigned_literal(self.builder, "required_bones")), EXPECTED_BONES)

    def test_all_five_nla_clips_use_declared_bones(self):
        action_calls = [
            node for node in ast.walk(self.builder)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "action"
            and len(node.args) >= 3
            and isinstance(node.args[0], ast.Constant)
            and isinstance(node.args[0].value, str)
        ]
        clips = {}
        for call in action_calls:
            clip_name = call.args[0].value
            channels = ast.literal_eval(call.args[2])
            clips[clip_name] = set(channels)
            self.assertTrue(set(channels).issubset(EXPECTED_BONES),
                            "{} animates an undeclared bone".format(clip_name))
        self.assertEqual(set(clips), EXPECTED_CLIPS)
        secondary = {"Hat", "Ear.L", "Ear.R", "Tail.Tip"}
        self.assertTrue(any(secondary.intersection(channels) for channels in clips.values()))

    def test_curves_are_converted_before_rigid_bone_binding(self):
        conversion = self.builder_source.index("def convert_curve_for_gltf")
        conversion_call = self.builder_source.index("obj = convert_curve_for_gltf(obj)")
        binding_call = self.builder_source.index("attach(obj,bone_name)")
        self.assertLess(conversion, conversion_call)
        self.assertLess(conversion_call, binding_call)
        self.assertIn("obj.parent_type = 'BONE'", self.builder_source)
        self.assertIn("obj.parent_bone = bone_name", self.builder_source)

    def test_rig_parts_and_nla_are_checked_before_export(self):
        self.assertIn("obj.parent != rig or obj.parent_type != 'BONE'", self.builder_source)
        self.assertIn("obj.parent_bone != bone_name", self.builder_source)
        self.assertIn('expected_clips = {"Idle", "Walk", "Run", "Cast", "Hit"}', self.builder_source)
        export_index = self.builder_source.index("bpy.ops.export_scene.gltf(")
        for guard in ("missing_bones", "missing_clips", "Invalid rigid bone binding"):
            self.assertLess(self.builder_source.index(guard), export_index)

    def test_glb_export_includes_selected_rig_and_nla_animation(self):
        export_calls = [
            node for node in ast.walk(self.builder)
            if isinstance(node, ast.Call) and call_name(node) == "bpy.ops.export_scene.gltf"
        ]
        self.assertEqual(len(export_calls), 1)
        keywords = {
            kw.arg: kw.value.value
            for kw in export_calls[0].keywords
            if kw.arg and isinstance(kw.value, ast.Constant)
        }
        self.assertEqual(keywords.get("export_format"), "GLB")
        self.assertTrue(keywords.get("use_selection"))
        self.assertTrue(keywords.get("export_animations"))
        self.assertTrue(keywords.get("export_nla_strips"))
        self.assertTrue(keywords.get("export_skins"))

    def test_builder_has_a_post_export_file_guard(self):
        self.assertIn("not glb_path.is_file()", self.builder_source)
        self.assertIn("glb_path.stat().st_size < 1024", self.builder_source)

    def test_audit_checks_the_same_rig_and_animation_contract(self):
        self.assertEqual(set(assigned_literal(self.audit, "required_bones")), EXPECTED_BONES)
        self.assertIn('expected_clips = ("Idle", "Walk", "Run", "Cast", "Hit")', self.audit_source)

    def test_audit_scopes_actions_and_images_to_the_current_import(self):
        self.assertIn("actions = list(imported_actions or [])", self.audit_source)
        self.assertIn("images = list(imported_images or [])", self.audit_source)
        self.assertIn("actions_before = set(bpy.data.actions)", self.audit_source)
        self.assertIn("images_before = set(bpy.data.images)", self.audit_source)

    def test_audit_recognizes_rigid_and_weighted_binding(self):
        self.assertIn("skinned = [o for o in meshes if any(m.type == 'ARMATURE'", self.audit_source)
        self.assertIn("o.parent_type == 'BONE' and bool(o.parent_bone)", self.audit_source)
        self.assertIn("Rigid meshes parented to armature bones", self.audit_source)

    def test_uv_warning_only_applies_to_image_textured_materials(self):
        self.assertIn("if uses_image_texture and not mesh.uv_layers:", self.audit_source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
