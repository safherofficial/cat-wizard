# Cat Wizard — Character Asset 02 (Blender 2.93 LTS)
# A more cohesive, sculptural, storybook-style 3D character builder.
# Run from Blender: Scripting > Open > this file > Run Script.
# Outputs to ~/CatWizard_Art_v2/:
#   cat-wizard-character-v2.blend
#   cat-wizard-character-v2.glb
#   cat-wizard-character-v2-preview.png

import bpy
import math
from pathlib import Path
from mathutils import Vector

VERSION_LABEL = "Cat Wizard Character 02 — Storybook Edition / P2 Rig & Export Pass"
OUTPUT_DIR = Path.home() / "CatWizard_Art_v2"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

# Warmer, more deliberate palette: silver fur, deep plum/navy fabrics,
# saturated rose, aged brass and little teal magical accents.
PALETTE = {
    "fur": (0.43, 0.49, 0.55, 1),
    "fur_light": (0.70, 0.75, 0.77, 1),
    "fur_shadow": (0.25, 0.31, 0.37, 1),
    "ear_pink": (0.91, 0.43, 0.53, 1),
    "nose": (0.88, 0.42, 0.53, 1),
    "muzzle": (0.91, 0.88, 0.79, 1),
    "eye_cream": (1.0, 0.91, 0.70, 1),
    "eye_iris": (0.15, 0.48, 0.43, 1),
    "eye_dark": (0.035, 0.065, 0.075, 1),
    "robe": (0.075, 0.105, 0.20, 1),
    "robe_mid": (0.13, 0.19, 0.33, 1),
    "robe_light": (0.25, 0.34, 0.52, 1),
    "robe_shadow": (0.035, 0.055, 0.12, 1),
    "cloak": (0.16, 0.10, 0.34, 1),
    "cloak_light": (0.33, 0.22, 0.53, 1),
    "hat": (0.25, 0.16, 0.48, 1),
    "hat_light": (0.46, 0.32, 0.69, 1),
    "pink": (0.98, 0.29, 0.57, 1),
    "pink_light": (1.0, 0.58, 0.70, 1),
    "gold": (0.63, 0.36, 0.13, 1),
    "gold_light": (0.95, 0.69, 0.30, 1),
    "teal": (0.22, 0.75, 0.71, 1),
    "pipe": (0.25, 0.105, 0.052, 1),
    "pipe_light": (0.49, 0.25, 0.10, 1),
    "leather": (0.10, 0.12, 0.18, 1),
    "smoke": (0.79, 0.91, 0.90, 1),
    "ember": (1.0, 0.29, 0.045, 1),
}


def clean_collection(name):
    old = bpy.data.collections.get(name)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


CHAR = clean_collection("CW_CHARACTER_V2")
STUDIO = clean_collection("CW_PREVIEW_STUDIO_V2")
PARTS = []


def mat(name, color, roughness=0.58, metallic=0.0, subsurface=0.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if "Subsurface" in bsdf.inputs:
            bsdf.inputs["Subsurface"].default_value = subsurface
        if "Sheen" in bsdf.inputs:
            bsdf.inputs["Sheen"].default_value = 0.22 if roughness > 0.55 else 0.06
        if emission:
            if "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return m


M = {}
for key, color in PALETTE.items():
    rough = 0.74
    metal = 0.0
    sub = 0.025 if key in ("fur", "fur_light", "muzzle") else 0.0
    if key in ("gold", "gold_light"):
        rough, metal = 0.30, 0.72
    elif key in ("eye_cream", "eye_iris", "eye_dark", "nose", "pink", "pink_light", "ember"):
        rough = 0.28
    elif key in ("teal",):
        rough, metal = 0.30, 0.18
    elif key in ("pipe", "pipe_light"):
        rough = 0.40
    emission = color if key in ("ember", "teal") else None
    strength = 1.4 if key == "ember" else (0.35 if key == "teal" else 0.0)
    M[key] = mat("CW2 | " + key.replace("_", " ").title(), color, rough, metal, sub, emission, strength)


def link_obj(obj, name, material=None, smooth=True):
    obj.name = name
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    CHAR.objects.link(obj)
    if material and obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.clear()
        obj.data.materials.append(material)
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = smooth
    return obj


def add_mesh(name, vertices, faces, material, bone, smooth=True, double_sided=False):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    CHAR.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = smooth
    if double_sided:
        material.use_nodes = True
    PARTS.append((obj, bone))
    return obj


def uv(name, loc, scale, material, bone, segments=32, rings=20, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=loc)
    obj = link_obj(bpy.context.object, name, material, smooth)
    obj.scale = scale
    PARTS.append((obj, bone))
    return obj


def cylinder(name, loc, radius, depth, material, bone, vertices=32, bevel=0.02, scale=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = link_obj(bpy.context.object, name, material, False)
    if scale:
        obj.scale = scale
    if bevel:
        mod = obj.modifiers.new("Soft crafted edges", 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("Weighted highlights", 'WEIGHTED_NORMAL')
    PARTS.append((obj, bone))
    return obj


def curve(name, points, bevel, material, bone, resolution=16):
    data = bpy.data.curves.new(name + "Curve", 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = resolution
    data.bevel_depth = bevel
    data.bevel_resolution = 4
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = point
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    CHAR.objects.link(obj)
    data.materials.append(material)
    PARTS.append((obj, bone))
    return obj


def between(name, start, end, radius, material, bone, vertices=16):
    a, b = Vector(start), Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a + b) * 0.5)
    obj = link_obj(bpy.context.object, name, material, True)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = direction.to_track_quat('Z', 'Y')
    PARTS.append((obj, bone))
    return obj


def keep(obj, bone):
    PARTS.append((obj, bone))
    return obj


def ellipsoid_ring_mesh(name, rings, material, bone, segments=40, wave=0.0, smooth=True):
    # Each ring: (z, radius_x, radius_y, center_x, center_y).
    verts, faces = [], []
    for ri, (z, rx, ry, cx, cy) in enumerate(rings):
        for j in range(segments):
            a = 2.0 * math.pi * j / segments
            w = wave * math.sin(a * 6.0 + ri * 0.24) * (ri / max(1, len(rings)-1))
            verts.append((cx + math.cos(a) * rx, cy + math.sin(a) * ry, z + w))
    for ri in range(len(rings)-1):
        for j in range(segments):
            a = ri * segments + j
            b = ri * segments + (j+1) % segments
            c = (ri+1) * segments + (j+1) % segments
            d = (ri+1) * segments + j
            faces.append((a, b, c, d))
    faces.append(tuple(range(segments-1, -1, -1)))
    last = (len(rings)-1)*segments
    faces.append(tuple(last+j for j in range(segments)))
    return add_mesh(name, verts, faces, material, bone, smooth)


def ear_mesh(name, x_center, z_base, side, bone, material):
    # Thick, leaf-shaped outer ear with a curved silhouette rather than a cone.
    front_y = -0.395
    outline = [
        (-0.19, 0.00), (-0.22, 0.16), (-0.16, 0.40), (-0.07, 0.64),
        (0.00, 0.72), (0.10, 0.55), (0.18, 0.28), (0.17, 0.08),
        (0.08, -0.02), (-0.08, -0.03)
    ]
    verts = [(x_center + dx*side, front_y, z_base + dz) for dx, dz in outline]
    verts += [(x_center + dx*side, front_y + 0.10, z_base + dz) for dx, dz in outline]
    faces = []
    n = len(outline)
    if side > 0:
        faces.append(tuple(reversed(range(n))))
        faces.append(tuple(range(n, 2*n)))
    else:
        faces.append(tuple(range(n)))
        faces.append(tuple(reversed(range(n, 2*n))))
    for i in range(n):
        faces.append((i, (i+1)%n, (i+1)%n+n, i+n))
    obj = add_mesh(name, verts, faces, material, bone, True)
    bevel = obj.modifiers.new("Velvet-soft ear edge", 'BEVEL')
    bevel.width = 0.035
    bevel.segments = 3
    obj.modifiers.new("Ear normals", 'WEIGHTED_NORMAL')
    return obj


def make_ear_inner(name, x_center, z_base, side, bone):
    points = [(-.115,.08),(-.10,.28),(-.045,.53),(0,.60),(.065,.43),(.105,.20),(.08,.08)]
    verts = [(x_center + dx*side, -.472, z_base+dz) for dx,dz in points]
    return add_mesh(name, verts, [tuple(reversed(range(len(verts))))], M["ear_pink"], bone, True)


def custom_brim():
    # An asymmetrical, softly undulating hat brim with a rolled gold edge.
    seg, radial = 64, 5
    verts, faces = [], []
    for layer in range(2):
        for r_index in range(radial):
            t = r_index / float(radial-1)
            rx = 0.42 + t * 0.52
            ry = 0.33 + t * 0.40
            for j in range(seg):
                a = 2*math.pi*j/seg
                wave = 0.045*math.sin(3*a+0.4) + 0.025*math.sin(5*a-0.8)
                x = math.cos(a)*rx + 0.055*math.sin(a)
                y = math.sin(a)*ry + 0.015*math.cos(2*a)
                z = 2.205 + wave + (0.025 if layer==0 else -0.035) + (1-t)*0.035
                verts.append((x,y,z))
    ring_count = radial*seg
    for layer in range(2):
        offset = layer*ring_count
        for r in range(radial-1):
            for j in range(seg):
                a=offset+r*seg+j; b=offset+r*seg+(j+1)%seg
                c=offset+(r+1)*seg+(j+1)%seg; d=offset+(r+1)*seg+j
                faces.append((a,d,c,b) if layer==0 else (a,b,c,d))
    # side walls outer and inner
    for r in (0, radial-1):
        for j in range(seg):
            a=r*seg+j; b=r*seg+(j+1)%seg
            c=ring_count+r*seg+(j+1)%seg; d=ring_count+r*seg+j
            faces.append((a,b,c,d))
    brim=add_mesh("Hat | Sculpted soft brim",verts,faces,M["hat"],"Hat",True)
    sub=brim.modifiers.new("Silhouette polish",'SUBSURF'); sub.levels=1; sub.render_levels=1
    # Piping follows the outside edge.
    edge=[]
    for j in range(seg+1):
        a=2*math.pi*(j%seg)/seg
        edge.append((math.cos(a)*.94+.055*math.sin(a),math.sin(a)*.73+.015*math.cos(2*a),2.205+0.045*math.sin(3*a+.4)+0.025*math.sin(5*a-.8)))
    curve("Hat | Hand-stitched gold brim edge",edge,.018,M["gold_light"],"Hat")
    inner=[]
    for j in range(seg+1):
        a=2*math.pi*(j%seg)/seg
        inner.append((math.cos(a)*.43+.055*math.sin(a),math.sin(a)*.34+.015*math.cos(2*a),2.235+0.035*math.sin(3*a+.4)))
    curve("Hat | Inner satin piping",inner,.012,M["gold"],"Hat")


def create_hat_crown():
    # Tapered, subtly bent crown with a real curved silhouette.
    rings = [
        (2.24,.43,.34,0.00,.00),
        (2.36,.41,.32,.015,.00),
        (2.58,.34,.28,.055,.015),
        (2.80,.25,.22,.13,.025),
        (2.98,.16,.15,.23,.04),
        (3.10,.075,.08,.32,.05),
        (3.14,.015,.02,.36,.055),
    ]
    ellipsoid_ring_mesh("Hat | Curved sculpted crown",rings,M["hat"],"Hat",48,smooth=True)
    curve("Hat | Gold crown seam",[(0,-.339,2.29),(.12,-.33,2.30),(.25,-.28,2.31),(.36,-.22,2.32)],.018,M["gold_light"],"Hat")
    # Embroidered stars on the visible front-left of the crown.
    for idx,(x,z,size) in enumerate([(-.22,2.55,.055),(-.10,2.72,.035),(.02,2.47,.028)]):
        y=-.29 + (z-2.45)*.15
        uv("Hat | Constellation gem %02d"%idx,(x,y,z),(size,.018,size*1.25),M["gold_light"],"Hat",16,10)
    uv("Hat | Floating rose finial",(.37,.02,3.14),(.09,.09,.10),M["pink_light"],"Hat",20,12)


# ARMATURE: rigidly attached pieces keep the model simple to edit and export.
arm_data = bpy.data.armatures.new("CW2 | Cat Wizard Skeleton")
rig = bpy.data.objects.new("CW2_CatWizard_Rig", arm_data)
CHAR.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bones = [
    ("Root",(0,0,.03),(0,0,.42),None),
    ("Body",(0,0,.34),(0,0,1.40),"Root"),
    ("Head",(0,0,1.31),(0,0,1.92),"Body"),
    ("Hat",(0,0,2.14),(.02,0,2.82),"Head"),
    ("Ear.L",(-.34,0,2.00),(-.39,0,2.52),"Head"),
    ("Ear.R",(.34,0,2.00),(.39,0,2.52),"Head"),
    ("Arm.L",(-.36,0,1.24),(-.66,-.02,.92),"Body"),
    ("Arm.R",(.36,0,1.24),(.69,-.02,.98),"Body"),
    ("Leg.L",(-.22,0,.45),(-.22,0,.10),"Body"),
    ("Leg.R",(.22,0,.45),(.22,0,.10),"Body"),
    ("Tail",(0,.31,.64),(-.25,.62,1.04),"Body"),
    ("Tail.Tip",(-.38,.46,1.20),(-.17,.43,1.49),"Tail"),
    ("Cape",(0,.24,1.28),(0,.43,.38),"Body"),
]
for name, head, tail, parent in bones:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
        b.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front = True
rig.data.display_type = 'OCTAHEDRAL'


def attach(obj, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    obj.matrix_world = world
    obj["cw_rigid_part"] = True


# ---------------------------------------------------------------------------
# BODY: a continuous flared robe with tailored panels and embroidered trim.
# ---------------------------------------------------------------------------
robe_rings = [
    (.15,.58,.40,0,.035),(.22,.67,.43,0,.025),(.38,.66,.42,0,.015),
    (.62,.56,.37,0,.005),(.88,.47,.34,0,0),(1.10,.43,.32,0,0),
    (1.27,.39,.30,0,0),(1.36,.32,.27,0,0),
]
ellipsoid_ring_mesh("Robe | Unified tailored silhouette",robe_rings,M["robe"],"Body",64,wave=.045,smooth=True)

# Front inset panel follows the curved torso surface with its own shaped mesh.
front_panel = [
    (-.29,-.303,1.31),(.29,-.303,1.31),(.33,-.345,.60),(.18,-.392,.24),
    (-.18,-.392,.24),(-.33,-.345,.60)
]
add_mesh("Robe | Raised midnight-blue front panel",front_panel,[(5,4,3,2,1,0)],M["robe_mid"],"Body",True)
curve("Robe | Twin gold front seams",[(-.26,-.335,1.24),(-.29,-.38,.83),(-.27,-.41,.43),(-.15,-.41,.23)],.014,M["gold"],"Body")
curve("Robe | Twin gold front seams R",[(.26,-.335,1.24),(.29,-.38,.83),(.27,-.41,.43),(.15,-.41,.23)],.014,M["gold"],"Body")

# Layered collar, deliberately oversized so it reads at gameplay camera distance.
add_mesh("Robe | Left folded collar",[(-.34,-.29,1.34),(-.04,-.42,1.31),(-.14,-.47,1.13),(-.43,-.35,1.18)],[(3,2,1,0)],M["robe_light"],"Body",True)
add_mesh("Robe | Right folded collar",[(.34,-.29,1.34),(.04,-.42,1.31),(.14,-.47,1.13),(.43,-.35,1.18)],[(0,1,2,3)],M["robe_mid"],"Body",True)
curve("Robe | Collar gold piping",[(-.36,-.31,1.33),(-.18,-.45,1.30),(0,-.49,1.31),(.18,-.45,1.30),(.36,-.31,1.33)],.018,M["gold_light"],"Body")

# Decorative waist sash, clasp and buttons.
curve("Robe | Rose waist sash",[(-.48,-.30,.64),(-.28,-.38,.60),(0,-.407,.59),(.28,-.38,.60),(.48,-.30,.64)],.045,M["pink"],"Body")
uv("Robe | Starburst clasp",(0,-.454,.62),(.105,.035,.105),M["gold_light"],"Body",20,12)
uv("Robe | Teal centre stone",(0,-.487,.62),(.045,.018,.052),M["teal"],"Body",16,10)
for i,z in enumerate((.82,1.02,1.17)):
    uv("Robe | Gold button %02d"%i,(0,-.408,z),(.035,.018,.035),M["gold_light"],"Body",16,10)

# Hem trim runs around the body with tiny stitched marks.
hem_points=[]
for j in range(65):
    a=2*math.pi*j/64
    hem_points.append((math.cos(a)*.66,.015+math.sin(a)*.425,.19+.035*math.sin(a*6)))
curve("Robe | Sculpted gold hem",hem_points,.027,M["gold_light"],"Body")

# Back cape with shaped folds and gold scalloped edging.
# Back cape with shaped folds and gold scalloped edging.
cape_vertices = []
cape_faces = []
columns, rows = 9, 7
for row in range(rows):
    t = row / float(rows-1)
    z = 1.28 - t*1.12
    width = .30 + .46*(t**.8)
    for col in range(columns):
        u = col/(columns-1)*2-1
        fold = .045*math.cos(col*math.pi*1.3 + row*.35)
        x = u*width
        y = .19 + fold + .10*t
        zz = z - .08*abs(u)**1.4*t + .035*math.cos(u*math.pi*3)*t
        cape_vertices.append((x,y,zz))
for row in range(rows-1):
    for col in range(columns-1):
        a=row*columns+col; b=a+1; c=b+columns; d=a+columns
        cape_faces.append((a,d,c,b))
cape_obj = add_mesh("Cloak | Flowing sculpted velvet cape",cape_vertices,cape_faces,M["cloak"],"Cape",True,True)
solid = cape_obj.modifiers.new("Velvet thickness",'SOLIDIFY'); solid.thickness=.035
sub = cape_obj.modifiers.new("Soft fabric folds",'SUBSURF'); sub.levels=1; sub.render_levels=1
cape_edge=[]
for col in range(columns):
    v=cape_vertices[(rows-1)*columns+col]
    cape_edge.append((v[0],v[1]-.018,v[2]))
curve("Cloak | Gold scalloped edge",cape_edge,.024,M["gold_light"],"Cape")
for idx,u in enumerate((-.55,-.25,.25,.55)):
    curve("Cloak | Embroidered arc %02d"%idx,[(u*.24,.15,1.18),(u*.42,.10,.91),(u*.65,.16,.56)],.011,M["hat_light"],"Cape")

# Legs and boots: broad little paws with stitched leather cuffs.
leg_pivots=[]
for side,label in [(-1,"L"),(1,"R")]:
    x=side*.235; bone="Leg."+label
    leg_pivot=Vector((x,0,.42))
    uv("Leg %s | Silver ankle"%label,(x,-.015,.32),(.145,.17,.25),M["fur"],bone)
    uv("Boot %s | Soft rounded shoe"%label,(x,-.145,.145),(.205,.285,.145),M["leather"],bone)
    cylinder("Boot %s | Brass cuff"%label,(x,-.02,.29),.165,.075,M["gold"],bone,24,.012,scale=(1,.94,1))
    curve("Boot %s | Leather stitch"%label,[(x-.13,-.30,.16),(x,-.34,.17),(x+.13,-.30,.16)],.009,M["gold_light"],bone)
    for toe in range(3):
        tx=x+(toe-1)*.075
        uv("Boot %s | Toe seam %d"%(label,toe),(tx,-.375,.15),(.014,.009,.04),M["robe_light"],bone,12,8)

# Arms have tapered sleeves, layered cuffs and plush paws.
arm_pivots=[]
for side,label in [(-1,"L"),(1,"R")]:
    bone="Arm."+label
    shoulder=(side*.39,-.015,1.20)
    elbow=(side*.55,-.105,.94)
    wrist=(side*.61,-.23,.78)
    sleeve=between("Sleeve %s | Sculpted upper arm"%label,shoulder,elbow,.16,M["robe_mid"],bone,20)
    sleeve.scale.x=1.10
    uv("Sleeve %s | Rounded shoulder"%label,(side*.40,-.02,1.19),(.20,.20,.21),M["robe"],bone)
    # Cuff and paw are separate so they remain readable at small scale.
    between("Sleeve %s | Lower forearm"%label,elbow,wrist,.125,M["robe_light"],bone,20)
    cuff_loc=(side*.60,-.225,.79)
    cylinder("Sleeve %s | Gold cuff"%label,cuff_loc,.135,.075,M["gold"],bone,24,.012,scale=(1,.82,1))
    paw_loc=(side*.62,-.31,.68)
    uv("Paw %s | Soft silver hand"%label,paw_loc,(.14,.135,.13),M["fur_light"],bone)
    for toe in range(3):
        tx=side*.62+(toe-1)*.065
        uv("Paw %s | Rounded toe %d"%(label,toe),(tx,-.425,.65),(.045,.034,.057),M["fur_light"],bone,16,10)
    arm_pivots.append(bone)

# Head: soft heart-shaped cheeks and layered facial planes.
uv("Head | Sculpted silver head",(0,-.015,1.72),(.525,.445,.49),M["fur"],"Head",48,32)
uv("Head | Forehead soft plane",(0,-.345,1.83),(.36,.13,.23),M["fur_light"],"Head",32,20)
for side,label in [(-1,"L"),(1,"R")]:
    x=side*.34
    ear_bone="Ear."+label
    ear_mesh("Head | Sculpted outer ear %s"%label,x,1.99,side,ear_bone,M["fur"])
    make_ear_inner("Head | Velvet inner ear %s"%label,x,2.035,side,ear_bone)
    # A small tufty inner-ear highlight creates a soft, layered edge.
    uv("Head | Ear glint %s"%label,(x-side*.035,-.485,2.22),(.035,.015,.065),M["pink_light"],ear_bone,16,10)
    uv("Face | Cheek %s"%label,(side*.255,-.365,1.54),(.245,.16,.19),M["fur_light"],"Head",32,20)

# Eyes are large and expressive, with warm lids and glossy teal irises.
for side,label in [(-1,"L"),(1,"R")]:
    x=side*.195
    uv("Eye %s | Warm ivory sclera"%label,(x,-.417,1.755),(.145,.072,.178),M["eye_cream"],"Head",32,20)
    uv("Eye %s | Deep teal iris"%label,(x+side*.012,-.477,1.748),(.086,.042,.126),M["eye_iris"],"Head",28,18)
    uv("Eye %s | Dark vertical pupil"%label,(x+side*.014,-.512,1.748),(.036,.023,.105),M["eye_dark"],"Head",24,16)
    uv("Eye %s | Main catchlight"%label,(x-.026,-.535,1.804),(.032,.014,.038),M["eye_cream"],"Head",16,10)
    uv("Eye %s | Tiny catchlight"%label,(x+.035,-.535,1.705),(.012,.009,.014),M["eye_cream"],"Head",12,8)
    # Eyelids and arched eyebrows communicate the cat's dry, self-assured attitude.
    curve("Face | Upper eyelid %s"%label,[(x-.14,-.452,1.83),(x,-.50,1.89),(x+.14,-.452,1.83)],.025,M["fur"],"Head")
    curve("Face | Expressive brow %s"%label,[(x-.14,-.438,1.96),(x-.02,-.48,2.00),(x+.13,-.438,1.96)],.035,M["fur_shadow"],"Head")
    # Distinct feline cheek markings: three tapered ink-like strokes.
    for stripe in range(3):
        z=1.52+stripe*.062
        curve("Face | Silver tabby stripe %s %d"%(label,stripe),[(side*.35,-.472,z),(side*.43,-.474,z+.018),(side*.50,-.438,z+.055)],.012,M["fur_shadow"],"Head")
    # Whiskers sweep outward and slightly down, three per cheek.
    for w in range(3):
        z=1.49+w*.055
        curve("Face | Whisker %s %d"%(label,w),[(side*.31,-.478,z),(side*.49,-.50,z+(w-1)*.035),(side*.68,-.46,z+(w-1)*.095)],.0085,M["fur_light"],"Head")

# Muzzle pads, nose and small curved mouth with a defined chin.
uv("Face | Left muzzle pad",(-.095,-.47,1.49),(.16,.12,.105),M["muzzle"],"Head",32,20)
uv("Face | Right muzzle pad",(.095,-.47,1.49),(.16,.12,.105),M["muzzle"],"Head",32,20)
# Inverted triangular nose, with rounded bevel for a soft painted look.
nose_verts=[(-.075,-.586,1.565),(.075,-.586,1.565),(0,-.61,1.475),(0,-.625,1.555)]
add_mesh("Face | Heart-shaped rose nose",nose_verts,[(3,1,0),(3,2,1),(3,0,2)],M["nose"],"Head",True)
uv("Face | Nose highlight",(-.023,-.631,1.555),(.018,.008,.012),M["pink_light"],"Head",12,8)
curve("Face | Philtrum",[(0,-.59,1.48),(0,-.585,1.435)],.012,M["fur_shadow"],"Head")
curve("Face | Left smile",[(0,-.585,1.435),(-.055,-.57,1.405),(-.12,-.54,1.42)],.012,M["fur_shadow"],"Head")
curve("Face | Right smile",[(0,-.585,1.435),(.055,-.57,1.405),(.12,-.54,1.42)],.012,M["fur_shadow"],"Head")
uv("Face | Soft chin",(0,-.405,1.375),(.16,.08,.065),M["fur_light"],"Head",24,16)

# Forehead markings, small fur tufts and cheek accents.
for idx,side in enumerate((-1,1)):
    curve("Face | Forehead tabby mark %d"%idx,[(side*.055,-.478,1.96),(side*.09,-.474,2.015),(side*.13,-.438,2.035)],.014,M["fur_shadow"],"Head")
uv("Head | Centre brow tuft",(0,-.375,2.075),(.11,.085,.115),M["fur_light"],"Head",20,12)
for side in (-1,1):
    uv("Head | Cheek fur point",(side*.43,-.345,1.47),(.10,.10,.075),M["fur"],"Head",20,12)

# Signature pink bow tie: two sculpted lobes, pleats, knot and a small brass jewel.
for side,label in [(-1,"L"),(1,"R")]:
    wing=uv("Bow | Sculpted satin wing %s"%label,(side*.15,-.525,1.305),(.175,.09,.13),M["pink"],"Body",32,20)
    wing.rotation_euler[1]=side*.20
    curve("Bow | Satin fold %s"%label,[(side*.09,-.616,1.36),(side*.18,-.617,1.32),(side*.23,-.594,1.28)],.012,M["pink_light"],"Body")
uv("Bow | Rounded knot",(0,-.625,1.305),(.095,.075,.09),M["pink_light"],"Body",24,16)
uv("Bow | Tiny brass centre",(0,-.693,1.307),(.028,.014,.032),M["gold_light"],"Body",16,10)

# Hat: custom brim, curved crown, stitched decoration, tassel and tiny stars.
custom_brim()
create_hat_crown()
curve("Hat | Tassel cord",[(.35,.03,3.10),(.45,.02,3.02),(.50,-.005,2.91)],.018,M["gold"],"Hat")
uv("Hat | Tassel",(.50,-.005,2.88),(.075,.075,.09),M["gold_light"],"Hat",20,12)
for idx,(x,z) in enumerate([(-.42,2.27),(.40,2.25),(-.25,2.29)]):
    uv("Hat | Brim constellation %02d"%idx,(x,-.24,z),(.028,.014,.028),M["gold_light"],"Hat",12,8)

# Pipe: curved walnut stem, bowl, brass ferrule and glowing ember held in right paw.
between("Pipe | Walnut stem",(.49,-.52,1.47),(.86,-.60,1.49),.034,M["pipe"],"Arm.R",16)
uv("Pipe | Grip ferrule",(.57,-.56,1.48),(.055,.04,.05),M["gold"],"Arm.R",16,10)
cylinder("Pipe | Sculpted bowl",(.90,-.60,1.52),.105,.20,M["pipe_light"],"Arm.R",24,.016,scale=(1,.82,1))
cylinder("Pipe | Bowl cavity",(.90,-.60,1.625),.074,.015,M["pipe"],"Arm.R",24,.005)
curve("Pipe | Bowl carved band",[(.82,-.69,1.56),(.90,-.70,1.55),(.98,-.69,1.56)],.012,M["gold_light"],"Arm.R")
uv("Pipe | Ember",(.90,-.60,1.635),(.05,.05,.024),M["ember"],"Arm.R",16,10)
curve("Pipe | Engraved walnut grain",[(.62,-.60,1.49),(.72,-.635,1.50),(.82,-.64,1.51)],.006,M["pipe_light"],"Arm.R")
# Smoke is designed as subtle wisps rather than opaque bubbles.
curve("Pipe Smoke | First curl",[(.91,-.60,1.71),(.86,-.62,1.82),(.94,-.63,1.89)],.018,M["smoke"],"Arm.R")
curve("Pipe Smoke | Second curl",[(.94,-.63,1.88),(1.04,-.64,1.98),(1.00,-.64,2.07)],.014,M["smoke"],"Arm.R")
uv("Pipe Smoke | Soft puff",(1.0,-.64,2.11),(.055,.035,.075),M["smoke"],"Arm.R",18,12)

# Tail: a fuller S curve with an elegant pale end, attached to its own bone.
tail_points=[(0,.31,.66),(-.18,.43,.70),(-.39,.50,.84),(-.48,.48,1.08),(-.38,.46,1.30),(-.17,.43,1.38)]
curve("Tail | Plush silver S-curve",tail_points,.095,M["fur"],"Tail")
uv("Tail | Pale fluffy tip",tail_points[-1],(.115,.115,.12),M["fur_light"],"Tail.Tip",20,14)
# A few short fur tufts add a designed silhouette near the tail tip.
curve("Tail | Tip tuft",[(-.21,.43,1.40),(-.12,.42,1.50),(-.05,.40,1.48)],.04,M["fur_light"],"Tail.Tip")

# Convert bevelled curves to mesh objects before glTF export. glTF exports meshes,
# not Blender curve datablocks; this preserves whiskers, piping, seams and smoke.
def convert_curve_for_gltf(obj):
    if obj.type != 'CURVE':
        return obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    result = bpy.ops.object.convert(target='MESH')
    if 'FINISHED' not in result:
        raise RuntimeError("Could not convert curve to mesh: " + obj.name)
    converted = bpy.context.view_layer.objects.active
    if converted is None or converted.type != 'MESH':
        raise RuntimeError("Curve conversion did not create a mesh: " + obj.name)
    return converted


# Attach all parts to the armature after modelling, preserving world transforms.
# Bone-parented rigid parts are intentional for this stylized low-poly game asset.
prepared_parts = []
for obj,bone_name in PARTS:
    obj = convert_curve_for_gltf(obj)
    if bone_name not in rig.data.bones:
        raise RuntimeError("Missing rig bone '{0}' for part '{1}'".format(bone_name, obj.name))
    attach(obj,bone_name)
    prepared_parts.append((obj,bone_name))
PARTS = prepared_parts

required_bones = {
    "Root", "Body", "Head", "Hat", "Ear.L", "Ear.R",
    "Arm.L", "Arm.R", "Leg.L", "Leg.R", "Tail", "Tail.Tip", "Cape"
}
missing_bones = sorted(required_bones.difference({bone.name for bone in rig.data.bones}))
if missing_bones:
    raise RuntimeError("Rig is missing required bones: " + ", ".join(missing_bones))
if any(obj.type != 'MESH' for obj,_ in PARTS):
    raise RuntimeError("All character parts must be meshes before GLB export.")
if any(obj.parent != rig or obj.parent_type != 'BONE' for obj,_ in PARTS):
    raise RuntimeError("One or more character parts are not attached to the expected armature bone.")

# Keep the rig as the only active selection before action authoring.
for obj in list(bpy.context.selected_objects):
    obj.select_set(False)
rig.select_set(True)
bpy.context.view_layer.objects.active=rig
rig.animation_data_create()
rig.animation_data.action=None
for b in rig.pose.bones:
    b.rotation_mode='XYZ'


def action(name, frame_range, channels):
    act=bpy.data.actions.new(name)
    rig.animation_data.action=act
    for bone_name, axes in channels.items():
        for axis, keys in axes.items():
            fc=act.fcurves.new(data_path='pose.bones["%s"].rotation_euler'%bone_name,index=axis,action_group=bone_name)
            for frame,value in keys:
                point=fc.keyframe_points.insert(frame,value)
                point.interpolation='BEZIER'
            fc.update()
            mod=fc.modifiers.new('CYCLES')
            mod.mode_before='REPEAT';mod.mode_after='REPEAT'
    rig.animation_data.action=None
    track=rig.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,int(frame_range[0]),act)
    strip.action_frame_start=frame_range[0];strip.action_frame_end=frame_range[1]
    strip.blend_type='REPLACE';strip.extrapolation='NOTHING'


action("Idle",(1,49),{
    "Body":{0:[(1,-.012),(13,.014),(25,-.012),(37,.014),(49,-.012)]},
    "Head":{1:[(1,-.018),(13,.014),(25,-.018),(37,.014),(49,-.018)],2:[(1,-.02),(25,.02),(49,-.02)]},
    "Tail":{0:[(1,-.10),(13,.12),(25,-.10),(37,.12),(49,-.10)],1:[(1,-.07),(25,.08),(49,-.07)]},
    "Tail.Tip":{0:[(1,-.08),(13,.12),(25,-.08),(37,.12),(49,-.08)]},
    "Hat":{1:[(1,-.025),(13,.025),(25,-.025),(37,.025),(49,-.025)]},
    "Ear.L":{1:[(1,-.035),(13,.025),(25,-.035),(37,.025),(49,-.035)]},
    "Ear.R":{1:[(1,.035),(13,-.025),(25,.035),(37,-.025),(49,.035)]},
    "Cape":{0:[(1,-.025),(13,.025),(25,-.025),(37,.025),(49,-.025)]}
})
action("Walk",(1,25),{
    "Leg.L":{0:[(1,-.48),(7,.48),(13,-.48),(19,.48),(25,-.48)]},
    "Leg.R":{0:[(1,.48),(7,-.48),(13,.48),(19,-.48),(25,.48)]},
    "Arm.L":{0:[(1,.28),(7,-.28),(13,.28),(19,-.28),(25,.28)]},
    "Arm.R":{0:[(1,-.28),(7,.28),(13,-.28),(19,.28),(25,-.28)]},
    "Tail":{1:[(1,-.18),(7,.18),(13,-.18),(19,.18),(25,-.18)]},
    "Tail.Tip":{0:[(1,-.16),(7,.16),(13,-.16),(19,.16),(25,-.16)]},
    "Hat":{1:[(1,-.035),(7,.035),(13,-.035),(19,.035),(25,-.035)]},
    "Ear.L":{1:[(1,-.045),(7,.035),(13,-.045),(19,.035),(25,-.045)]},
    "Ear.R":{1:[(1,.045),(7,-.035),(13,.045),(19,-.035),(25,.045)]},
    "Cape":{0:[(1,-.09),(7,.09),(13,-.09),(19,.09),(25,-.09)]}
})
action("Run",(1,17),{
    "Leg.L":{0:[(1,-.72),(5,.72),(9,-.72),(13,.72),(17,-.72)]},
    "Leg.R":{0:[(1,.72),(5,-.72),(9,.72),(13,-.72),(17,.72)]},
    "Arm.L":{0:[(1,.48),(5,-.48),(9,.48),(13,-.48),(17,.48)]},
    "Arm.R":{0:[(1,-.48),(5,.48),(9,-.48),(13,.48),(17,-.48)]},
    "Body":{0:[(1,-.04),(5,.04),(9,-.04),(13,.04),(17,-.04)]},
    "Tail":{1:[(1,-.28),(5,.28),(9,-.28),(13,.28),(17,-.28)]},
    "Tail.Tip":{0:[(1,-.22),(5,.22),(9,-.22),(13,.22),(17,-.22)]},
    "Hat":{1:[(1,-.055),(5,.055),(9,-.055),(13,.055),(17,-.055)]},
    "Ear.L":{1:[(1,-.06),(5,.05),(9,-.06),(13,.05),(17,-.06)]},
    "Ear.R":{1:[(1,.06),(5,-.05),(9,.06),(13,-.05),(17,.06)]},
    "Cape":{0:[(1,-.14),(5,.14),(9,-.14),(13,.14),(17,-.14)]}
})
action("Cast",(1,25),{
    "Body":{0:[(1,0),(8,-.12),(16,.08),(25,0)]},
    "Head":{0:[(1,0),(8,.10),(16,-.06),(25,0)]},
    "Arm.R":{0:[(1,-.12),(8,-.78),(16,-.50),(25,-.12)]},
    "Arm.L":{0:[(1,0),(8,.32),(16,.14),(25,0)]},
    "Tail":{1:[(1,0),(8,.32),(16,-.22),(25,0)]},
    "Tail.Tip":{0:[(1,0),(8,-.25),(16,.18),(25,0)]},
    "Hat":{1:[(1,0),(8,.12),(16,-.05),(25,0)]},
    "Ear.L":{1:[(1,0),(8,-.10),(16,.04),(25,0)]},
    "Ear.R":{1:[(1,0),(8,.10),(16,-.04),(25,0)]},
    "Cape":{0:[(1,0),(8,-.16),(16,.08),(25,0)]}
})
action("Hit",(1,19),{
    "Body":{0:[(1,0),(4,.22),(10,-.12),(19,0)]},
    "Head":{2:[(1,0),(4,-.18),(10,.14),(19,0)]},
    "Arm.L":{0:[(1,0),(4,-.55),(10,.24),(19,0)]},
    "Arm.R":{0:[(1,0),(4,.55),(10,-.24),(19,0)]},
    "Hat":{1:[(1,0),(4,-.09),(10,.035),(19,0)]},
    "Ear.L":{1:[(1,0),(4,.12),(10,-.04),(19,0)]},
    "Ear.R":{1:[(1,0),(4,-.12),(10,.04),(19,0)]},
    "Tail.Tip":{0:[(1,0),(4,.22),(10,-.12),(19,0)]}
})

expected_clips = {"Idle", "Walk", "Run", "Cast", "Hit"}
created_clips = {track.name for track in rig.animation_data.nla_tracks}
missing_clips = sorted(expected_clips.difference(created_clips))
if missing_clips:
    raise RuntimeError("Missing required NLA clips: " + ", ".join(missing_clips))

for obj, bone_name in PARTS:
    if obj.type != 'MESH' or not obj.material_slots:
        raise RuntimeError("Invalid export mesh or missing material: " + obj.name)
    if obj.parent != rig or obj.parent_type != 'BONE' or obj.parent_bone != bone_name:
        raise RuntimeError("Invalid rigid bone binding for part: " + obj.name)

# ---------------------------------------------------------------------------
# Studio-only presentation setup; these objects never enter the exported GLB.
# ---------------------------------------------------------------------------
def studio_obj(obj,name):
    obj.name=name
    for col in list(obj.users_collection): col.objects.unlink(obj)
    STUDIO.objects.link(obj)
    return obj

studio_ground_mat=mat("CW2 Studio | Warm mist",(.115,.16,.20,1),.92)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.055))
studio_obj(bpy.context.object,"Studio | Seamless floor").data.materials.append(studio_ground_mat)

pedestal_mat=mat("CW2 Studio | Slate pedestal",(.18,.22,.29,1),.5,.22)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1.13,depth=.17,location=(0,0,-.09))
pedestal=studio_obj(bpy.context.object,"Studio | Floating slate plinth")
pedestal.data.materials.append(pedestal_mat)
bevel=pedestal.modifiers.new("Plinth rounded rim",'BEVEL');bevel.width=.06;bevel.segments=4
pedestal.modifiers.new("Plinth weighted normals",'WEIGHTED_NORMAL')

brass_mat=mat("CW2 Studio | Brass inlay",PALETTE["gold_light"],.27,.7)
bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=12,major_radius=1.04,minor_radius=.018,location=(0,0,.005))
studio_obj(bpy.context.object,"Studio | Brass plinth inlay").data.materials.append(brass_mat)

bpy.ops.object.camera_add(location=(3.45,-7.9,3.15))
camera=studio_obj(bpy.context.object,"Studio | Portrait camera")
target=Vector((0,-.005,1.58))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.82
bpy.context.scene.camera=camera

lights=[
    ((-3.8,-4.6,6.0),780,(1.0,.76,.58),4.0),
    ((4.3,-1.0,4.6),620,(.52,.78,1.0),3.2),
    ((0.0,3.0,5.1),900,(.65,.52,1.0),3.1),
    ((0.0,-5.0,1.7),150,(1.0,.45,.48),2.0),
]
for idx,(location,power,color,size) in enumerate(lights):
    bpy.ops.object.light_add(type='AREA',location=location)
    light=studio_obj(bpy.context.object,"Studio | Softbox %02d"%idx)
    light.data.energy=power;light.data.color=color;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.eevee.use_gtao=True;scene.eevee.gtao_distance=2.2;scene.eevee.gtao_factor=1.25
scene.eevee.use_soft_shadows=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.12,.15,.19)
scene.view_settings.view_transform='Filmic'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=.15;scene.view_settings.gamma=1
scene.frame_start=1;scene.frame_end=49;scene.frame_set(1)
scene.camera.data.lens=55
scene.render.filepath=str(OUTPUT_DIR/"cat-wizard-character-v2-preview.png")

# Save the native Blender project first. Then export just the character and rig.
blend_path=OUTPUT_DIR/"cat-wizard-character-v2.blend"
glb_path=OUTPUT_DIR/"cat-wizard-character-v2.glb"
for obj in list(bpy.context.selected_objects): obj.select_set(False)
for obj in CHAR.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

try:
    bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
except Exception:
    pass

# Preview render is staged independently from the game export.
try:
    bpy.ops.render.render(write_still=True)
except Exception as exc:
    print("Preview render warning:",repr(exc))

for obj in list(bpy.context.selected_objects): obj.select_set(False)
for obj in CHAR.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=rig
try:
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),export_format='GLB',use_selection=True,
        export_apply=True,export_animations=True,export_nla_strips=True,
        export_skins=True,export_materials='EXPORT',export_yup=True,
        export_cameras=False,export_lights=False
    )
except Exception as exc:
    print("GLB EXPORT ERROR:",repr(exc))
    print("The .blend file has been saved. Enable the glTF 2.0 add-on and export CW_CHARACTER_V2 as GLB.")
    raise

if not glb_path.is_file() or glb_path.stat().st_size < 1024:
    raise RuntimeError("GLB export completed without a valid output file (missing or smaller than 1 KB).")

print("\nCAT WIZARD CHARACTER 02 CREATED")
print("Blend:",blend_path)
print("GLB:",glb_path)
print("Preview:",OUTPUT_DIR/"cat-wizard-character-v2-preview.png")
print("Rig: CW2_CatWizard_Rig | Bones:",len(rig.data.bones))
print("Rigid mesh parts:",len(PARTS))
print("NLA clips: Idle, Walk, Run, Cast, Hit")