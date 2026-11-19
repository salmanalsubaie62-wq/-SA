import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

FPS = 24
DUR = 12.0
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = dict(a.split('=') for a in args)
RES_X = int(opt.get('rx', 540)); RES_Y = int(opt.get('ry', 960))
SAMPLES = int(opt.get('samples', 32))
OUT = opt.get('out', '/tmp/blender_frames/f_')
F0 = int(opt.get('f0', 1)); F1 = int(opt.get('f1', 1))
STEP = int(opt.get('step', 1))

random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_denoising = True
try: cy.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
cy.max_bounces = 6; cy.glossy_bounces = 4; cy.transmission_bounces = 6; cy.volume_bounces = 1
cy.caustics_reflective = False; cy.caustics_refractive = False
cy.sample_clamp_indirect = 8
sc.render.resolution_x = RES_X; sc.render.resolution_y = RES_Y; sc.render.resolution_percentage = 100
sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = int(FPS * DUR)
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'AgX - Punchy' if 'AgX - Punchy' in [l.name for l in []] else 'None'
sc.view_settings.exposure = 0.0

def mat(name, base=(0.1, 0.1, 0.1, 1), rough=0.4, metal=0.0, trans=0.0, ior=1.45, emit=None, estr=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = base; b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['IOR'].default_value = ior
    b.inputs['Transmission Weight'].default_value = trans
    if emit:
        b.inputs['Emission Color'].default_value = emit; b.inputs['Emission Strength'].default_value = estr
    return m

def obj_from_bm(name, bm, material=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.location = loc
    if material: o.data.materials.append(material)
    return o

def box(name, sx, sy, sz, material, loc, bevel=0.0, seg=3):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    o = obj_from_bm(name, bm, material, loc)
    if bevel > 0:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = seg
    for p in o.data.polygons: p.use_smooth = True
    return o

# ---------------- bottle (fictional NOIR EMERALD) ----------------
BW, BD, BH = 0.17, 0.065, 0.24
glass = mat('Glass', (0.85, 1, 0.95, 1), rough=0.02, trans=1.0, ior=1.5)
liq = mat('Liquid', (0.98, 0.62, 0.15, 1), rough=0.03, trans=1.0, ior=1.38, emit=(1, .55, .1, 1), estr=0.35)
# amber absorption volume
nt = liq.node_tree; vol = nt.nodes.new('ShaderNodeVolumeAbsorption'); vol.inputs['Color'].default_value = (0.95, 0.5, 0.08, 1); vol.inputs['Density'].default_value = 5
nt.links.new(vol.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
black = mat('Black', (0.01, 0.01, 0.012, 1), rough=0.25, metal=0.0)
gold = mat('Gold', (0.95, 0.65, 0.2, 1), rough=0.18, metal=1.0, emit=(1, .7, .2, 1), estr=0.9)
label = mat('Label', (0.012, 0.012, 0.012, 1), rough=0.5)
bottle = bpy.data.objects.new('Bottle', None); sc.collection.objects.link(bottle); bottle.scale = (0.01, 0.01, 0.01)
def child(o, parent=bottle): o.parent = parent; return o
child(box('GlassBody', BW, BD, BH, glass, (0, 0, BH / 2 + 0.012), bevel=0.012))
child(box('Liquid', BW * .86, BD * .70, BH * .86, liq, (0, 0, BH / 2 + 0.012), bevel=0.008))
child(box('Tube', 0.016, 0.016, BH * .80, black, (0, 0, BH * .46 + 0.02), bevel=0.003))
child(box('Cap', BW * .58, BD * .85, 0.05, black, (0, 0, BH + 0.012 + 0.025), bevel=0.005))
child(box('Ring', BW * .60, BD * .87, 0.006, gold, (0, 0, BH + 0.016), bevel=0.001))
child(box('Neck', BW * .44, BD * .6, 0.012, black, (0, 0, BH + 0.008), bevel=0.002))
child(box('LabelPlate', BW * .62, 0.002, 0.045, label, (0, -BD * .36, BH * .36)))
# label text
bpy.ops.object.text_add(location=(0, -BD * .372, BH * .385))
t = bpy.context.object; t.data.body = 'NOIR'; t.data.size = 0.022; t.data.align_x = 'CENTER'; t.data.extrude = 0.0006
t.rotation_euler = (math.pi / 2, 0, 0); t.data.materials.append(gold); child(t)
bpy.ops.object.text_add(location=(0, -BD * .372, BH * .325))
t2 = bpy.context.object; t2.data.body = 'EMERALD'; t2.data.size = 0.0125; t2.data.align_x = 'CENTER'; t2.data.extrude = 0.0004
t2.rotation_euler = (math.pi / 2, 0, 0); t2.data.materials.append(gold); child(t2)

