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
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Punchy' if 'AgX - Punchy' in [l.name for l in []] else 'None'
sc.view_settings.exposure = -0.4

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
bottle = bpy.data.objects.new('Bottle', None); sc.collection.objects.link(bottle); bottle.scale = (4, 4, 4)
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

# ---------------- world ----------------
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.01, 0.04, 0.03, 1); bg.inputs['Strength'].default_value = 0.25
vs = w.node_tree.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.0012; vs.inputs['Anisotropy'].default_value = 0.35
vs.inputs['Color'].default_value = (0.5, 0.9, 0.75, 1)
w.node_tree.links.new(vs.outputs[0], w.node_tree.nodes['World Output'].inputs['Volume'])

# ground
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=120, y_segments=120, size=130)
for v in bm.verts:
    d = math.hypot(v.co.x, v.co.y); v.co.z = (random.random() - .5) * 0.25 * min(1, d / 14) + math.sin(v.co.x * .15) * math.cos(v.co.y * .13) * 1.2 * min(1, d / 20)
ground = obj_from_bm('Ground', bm, mat('Rock', (0.012, 0.03, 0.025, 1), rough=0.35))
for p in ground.data.polygons: p.use_smooth = True
# platform
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=1.6, radius2=1.45, depth=0.25)
plat = obj_from_bm('Platform', bm, mat('Plat', (0.01, 0.025, 0.02, 1), rough=0.18, metal=0.2), (0, 0, 0.1))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=64, radius1=1.5, radius2=1.5, depth=0.02)
ringo = obj_from_bm('PlatRing', bm, mat('Ring', (1, .6, .15, 1), emit=(1, .62, .15, 1), estr=4), (0, 0, 0.225))

# golden river: curve strip
pts = [(6 * math.sin(y * 0.11), y, 0.04) for y in range(-85, 1, 3)]
cu = bpy.data.curves.new('River', 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
cu.bevel_depth = 0.9; cu.bevel_resolution = 1; cu.extrude = 0.0
riv = bpy.data.objects.new('River', cu); sc.collection.objects.link(riv)
rm = mat('GoldRiver', (1, .45, .05, 1), rough=0.2, emit=(1, .38, .03, 1), estr=3.2); riv.data.materials.append(rm); riv.scale.z = 0.15

# crystals
def crystal_mesh(name, h, r, seed):
    rnd = random.Random(seed); bm = bmesh.new()
    n = 6; lean = (rnd.uniform(-.2, .2) * h, rnd.uniform(-.2, .2) * h)
    base = [bm.verts.new((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), 0)) for i in range(n)]
    mid = [bm.verts.new((r * .9 * math.cos(2 * math.pi * i / n) + lean[0] * .6, r * .9 * math.sin(2 * math.pi * i / n) + lean[1] * .6, h * .72)) for i in range(n)]
    tip = bm.verts.new((lean[0], lean[1], h))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((base[i], base[j], mid[j], mid[i])); bm.faces.new((mid[i], mid[j], tip))
    bm.faces.new(base[::-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    return me
emerald = mat('Emerald', (0.02, 0.55, 0.30, 1), rough=0.08, trans=0.9, ior=1.57, emit=(0.0, 0.8, 0.45, 1), estr=0.12)
cmeshes = [crystal_mesh(f'cm{i}', 1.0, 0.18, i) for i in range(8)]
for me in cmeshes: me.materials.append(emerald)
def place_crystal(x, y, h, r, i):
    o = bpy.data.objects.new('Crystal', cmeshes[i % 8]); sc.collection.objects.link(o)
    o.location = (x, y, -0.05); o.scale = (r, r, h)
    o.rotation_euler = (random.uniform(-.12, .12), random.uniform(-.12, .12), random.uniform(0, 6.28))
    return o
CR = []
for i in range(22):
    a = i / 22 * 2 * math.pi + random.uniform(-.1, .1); rad = random.uniform(3.6, 8.0)
    if math.sin(a) < -0.3 and rad < 8.5: a = math.pi - a
    h = random.uniform(2.2, 5.5); CR.append(place_crystal(math.cos(a) * rad, math.sin(a) * rad, h, h * random.uniform(.35, .55), i))
for y in range(-80, -8, 5):
    for side in (-1, 1):
        x = 6 * math.sin(y * 0.11) + side * random.uniform(3.5, 9); h = random.uniform(.8, 3.2)
        place_crystal(x, y + random.uniform(-2, 2), h, h * .4, y)
# floating shards (animated orbit)
SH = []
for i in range(10):
    o = place_crystal(0, 0, random.uniform(.25, .55), random.uniform(.07, .14), i + 40); o.location.z = 0.6 + random.random() * 2.2
    SH.append((o, random.uniform(2.2, 3.2), random.uniform(0, 6.28), random.uniform(.25, .5)))
# trees
tmat = mat('Tree', (0.005, 0.03, 0.02, 1), rough=0.8)
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=1.4, radius2=0.0, depth=7)
for v in bm.verts: v.co.z += 3.5
tm = bpy.data.meshes.new('tree'); bm.to_mesh(tm); bm.free(); tm.materials.append(tmat)
for i in range(520):
    for _ in range(10):
        x = random.uniform(-110, 110); y = random.uniform(-120, 90)
        if abs(x - 6 * math.sin(y * .11)) > 16 and math.hypot(x, y) > 14: break
    o = bpy.data.objects.new('T', tm); sc.collection.objects.link(o)
    s = random.uniform(.8, 2.6); o.scale = (s, s, s * random.uniform(1, 1.8)); o.location = (x, y, -0.2)

# lights
def area(name, loc, rot, power, color, size, sy=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.size = size
    if sy: l.shape = 'RECTANGLE'; l.size_y = sy
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; return o
kl = area('Key', (0, 0.5, 9), (0, 0, 0), 2200, (1, .78, .45), 5); kl.visible_glossy = False
area('RimGold', (2.8, 3.0, 2.8), (math.radians(-60), math.radians(10), math.radians(150)), 2400, (1, .7, .3), 0.35, 3.0)
area('RimGreen', (-3.2, 2.2, 2.2), (math.radians(-60), math.radians(-12), math.radians(-135)), 1500, (.3, 1, .6), 0.4, 3.0)
area('Front', (0.8, -5.0, 2.6), (math.radians(84), 0, 0), 700, (1, .88, .7), 0.3, 2.6)
sun = bpy.data.lights.new('Dawn', 'SUN'); sun.energy = 1.2; sun.color = (1, .7, .35)
so = bpy.data.objects.new('Dawn', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(80), 0, math.radians(180))

# ---------------- camera ----------------
cam_d = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.sensor_width = 36; cam_d.lens = 28
tgt = bpy.data.objects.new('Target', None); sc.collection.objects.link(tgt)
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 16
cam_d.dof.focus_object = tgt
def k(o, prop, frame, val, idx=-1):
    setattr(o, prop, val); o.keyframe_insert(prop, frame=frame)
def F(t): return int(round(t * FPS)) + 1
BZ = 1.6  # camera focus height (bottle mid)
HB = 1.0  # bottle base hover height
# camera keys (time, pos, target, lens)
CK = [
 (0.0, (-5.5, -13, 1.4), (0, 0, 1.6), 30),
 (3.0, (-1.4, -8.0, 1.7), (0, 0, BZ), 34),
 (3.1, (-1.65, -4.1, 1.7), (0, 0, BZ), 42),
 (7.0, (1.65, -4.1, 1.7), (0, 0, BZ), 42),
 (7.6, (-1.0, -2.6, 2.3), (0, 0, 2.15), 85),
 (9.3, (.9, -2.4, 1.45), (0, 0, 1.5), 85),
 (9.9, (0, -4.5, 1.8), (0, 0, BZ), 50),
 (12.0, (0, -8.5, 2.2), (0, 0, BZ), 34),
]
for (t_, p, tg, ln) in CK:
    f = F(t_); cam.location = p; cam.keyframe_insert('location', frame=f)
    tgt.location = tg; tgt.keyframe_insert('location', frame=f)
    cam_d.lens = ln; cam_d.keyframe_insert('lens', frame=f)
# smooth interpolation
# bottle rise + slow rotation; shards orbit
for (t_, z, rz) in [(0, -1.3, 0), (0.3, -1.3, 0), (3.0, HB, 0.0), (5.0, HB, 0.22), (8.0, HB, -0.1), (12, HB + .1, 0.0)]:
    bottle.location = (0, 0, z); bottle.rotation_euler = (0.0, 0.0, rz); bottle.keyframe_insert('location', frame=F(t_)); bottle.keyframe_insert('rotation_euler', frame=F(t_))
# shards: keyframe every 12 frames
for f in range(1, int(FPS * DUR) + 2, 6):
    t_ = (f - 1) / FPS
    for (o, rad, ph, sp) in SH:
        a = ph + t_ * sp * 1.4; vis = min(1, max(0, (t_ - 2) / 2))
        o.location = (math.cos(a) * rad * (1 + .25 * (1 - min(1, (t_ - 2) / 6))), math.sin(a) * rad * (1 + .25 * (1 - min(1, (t_ - 2) / 6))), o.location.z)
        o.scale = (vis, vis, vis)
        o.rotation_euler = (a * 1.3, a * .7, a)
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f); o.keyframe_insert('scale', frame=f)
# DOF: focus on target; fstop lower during macro
for t_, fs in [(0, 14), (3.1, 8), (7.0, 8), (7.6, 6.5), (9.3, 6.5), (9.9, 10), (12, 14)]:
    cam_d.dof.aperture_fstop = fs; cam_d.dof.keyframe_insert('aperture_fstop', frame=F(t_))

# ---------------- render ----------------
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
for f in range(F0, F1 + 1, STEP):
    sc.frame_set(f); sc.render.filepath = f'{OUT}{f:04d}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', f, flush=True)
