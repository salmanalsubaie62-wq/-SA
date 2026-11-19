# ================= V2: عالم الصورة + حركة الزجاجة =================
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BD_PATH = os.path.join(HERE, '..', 'ASSETS', 'backdrop_9x16.png')
S = 4.2                      # مقياس الزجاجة
BY = -9.0                    # مكان الزجاجة على محور y
ZOOM = 1.6                   # تكبير الصورة خلف الزجاجة
CAMY0 = -14.0                # مرجع بعد الكاميرا عن الخلفية (الخلفية عند y=0)
def sm_(t, a, b):
    x = min(1, max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x)

# --- الخلفية: صورة العالم على مستوى
img = bpy.data.images.load(BD_PATH); img.colorspace_settings.name = 'sRGB'
PH = 16.6 * ZOOM; PW = PH * 9 / 16
bpy.ops.mesh.primitive_plane_add(size=1)
bg = bpy.context.object; bg.name = 'Backdrop'; bg.rotation_euler = (math.pi / 2, 0, 0); bg.scale = (PW, PH, 1)
bg.location = (-0.23 * ZOOM, 0, 0)
bm_ = bpy.data.materials.new('BackdropMat'); bm_.use_nodes = True; nt = bm_.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
bg.data.materials.append(bm_)

# --- العالم: نفس الصورة كبيئة للانعكاسات والإضاءة الخفيفة
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; wn = w.node_tree
for n in list(wn.nodes): wn.nodes.remove(n)
et = wn.nodes.new('ShaderNodeTexEnvironment'); et.image = img
wb = wn.nodes.new('ShaderNodeBackground'); wb.inputs['Strength'].default_value = 1.4
wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(et.outputs['Color'], wb.inputs['Color']); wn.links.new(wb.outputs[0], wo.inputs['Surface'])

# --- الإضاءة
def area(name, loc, rot, power, color, size, sy=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.size = size
    if sy: l.shape = 'RECTANGLE'; l.size_y = sy
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; return o
kl = area('Key', (0, BY + 0.5, 6.5), (0, 0, 0), 1800, (1, .8, .5), 3.5); kl.visible_glossy = False
area('RimGold', (2.8, BY + 3.0, 1.8), (math.radians(-70), math.radians(10), math.radians(150)), 1500, (1, .72, .3), 0.35, 3.0)
area('RimGreen', (-3.0, BY + 2.4, 1.6), (math.radians(-70), math.radians(-12), math.radians(-135)), 1000, (.3, 1, .6), 0.4, 3.0)
area('Front', (0.6, BY - 4.0, 1.4), (math.radians(88), 0, 0), 500, (1, .9, .75), 0.3, 2.6)

# --- مركز الزجاجة ونقاط التركيز (أبناء للزجاجة)
def empty(name, local):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.parent = bottle; e.location = local; return e
BC = empty('BC', (0, 0, 0.155)); BT = empty('BT', (0, 0, 0.26)); BLb = empty('BL', (0, 0, 0.09))

# --- توهج مادّي عند التجسّد + شرارات
def glow_mat(name, col, st):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes
    for x in list(n): n.remove(x)
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = st
    o = n.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(e.outputs[0], o.inputs['Surface']); return m
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, segments=24, ring_count=12)
flare = bpy.context.object; flare.name = 'Flare'; flare.data.materials.append(glow_mat('FlareM', (1, .75, .3, 1), 25))
flare.location = (0, BY, 0.2); flare.scale = (0.001, 0.001, 0.001)
for t_, s_ in [(0, 0.001), (0.7, 0.01), (1.3, 1.4), (2.2, 0.001)]:
    flare.scale = (s_, s_, s_); flare.keyframe_insert('scale', frame=F_(t_) if False else int(round(t_ * FPS)) + 1)
SPK = []
spm = glow_mat('Spark', (1, .8, .35, 1), 30); rnd = random.Random(5)
for i in range(70):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.018, segments=8, ring_count=6)
    o = bpy.context.object; o.data.materials.append(spm); SPK.append((o, rnd.uniform(.5, 2.4), rnd.uniform(0, 6.28), rnd.uniform(.3, .9), rnd.uniform(-.2, 1.9)))
def fr(t): return int(round(t * FPS)) + 1

# --- حركة الزجاجة
REST = -0.15
for f in range(1, int(FPS * DUR) + 2, 3):
    t_ = (f - 1) / FPS
    appear = sm_(t_, 0.7, 2.6)
    sc_ = max(0.01, S * appear)
    bob = 0.05 * math.sin(t_ * 1.7)
    rise = 0.55 * (1 - appear) * -1
    lift = 0.0 + 0.45 * sm_(t_, 5.0, 7.5) * (1 - sm_(t_, 8.5, 9.2)) + 0.25 * sm_(t_, 10.6, 12)
    bottle.scale = (sc_, sc_, sc_)
    bottle.location = (0, BY, REST + rise + lift + bob * appear)
    spin = 2 * math.pi * sm_(t_, 5.0, 8.7)
    micro = -0.28 * sm_(t_, 8.9, 10.6) + 0.28 * sm_(t_, 10.6, 11.4)
    bottle.rotation_euler = (0.03 * math.sin(t_ * 1.1) * appear, 0.0, spin + micro + 0.12 * math.sin(t_ * .8))
    bottle.keyframe_insert('scale', frame=f); bottle.keyframe_insert('location', frame=f); bottle.keyframe_insert('rotation_euler', frame=f)
# شرارات: تتجمع على الزجاجة ثم تطفو حولها
for f in range(1, int(FPS * DUR) + 2, 6):
    t_ = (f - 1) / FPS
    conv = 1 - sm_(t_, 0.3, 2.4)
    for (o, rad0, ph, sp_, z0) in SPK:
        a = ph + t_ * sp_ * 1.6; rad = (0.45 + rad0 * 0.55) * (0.5 + conv * 2.2)
        o.location = (math.cos(a) * rad, BY + math.sin(a) * rad * .6, 0.2 + z0 * 0.7 * (0.4 + .6 * (1 - conv)) + 0.15 * math.sin(t_ + ph))
        v = sm_(t_, 0.2, 1.0)
        o.scale = (v, v, v); o.keyframe_insert('location', frame=f); o.keyframe_insert('scale', frame=f)

# --- الكاميرات (قصّ بالمؤشرات)
def make_cam(name, lens, fstop, focus):
    cd = bpy.data.cameras.new(name); co = bpy.data.objects.new(name, cd); sc.collection.objects.link(co)
    cd.lens = lens; cd.sensor_fit = 'VERTICAL'; cd.sensor_width = 36; cd.sensor_height = 36
    cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_object = focus
    tg = bpy.data.objects.new(name + '_T', None); sc.collection.objects.link(tg)
    tc = co.constraints.new('TRACK_TO'); tc.target = tg; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    return co, cd, tg
def key_cam(co, tg, items):
    for (t_, pos, tgt) in items:
        co.location = pos; co.keyframe_insert('location', frame=fr(t_))
        tg.location = tgt; tg.keyframe_insert('location', frame=fr(t_))
camA, _, tA = make_cam('CamA', 32, 11, BC)
camB, _, tB = make_cam('CamB', 40, 8, BC)
camC, cdC, tC = make_cam('CamC', 85, 3.2, BLb)
camD, _, tD = make_cam('CamD', 34, 9, BC)
zc = 0.55   # مركز الزجاجة تقريباً
key_cam(camA, tA, [(0.0, (-0.9, BY - 8.2, 0.35), (0, BY, zc)), (4.95, (0.25, BY - 5.4, 0.25), (0, BY, zc + .05))])
key_cam(camB, tB, [(4.95, (-2.3, BY - 4.9, 0.2), (0, BY, zc + .1)), (8.8, (2.3, BY - 4.6, 0.3), (0, BY, zc + .1))])
key_cam(camC, tC, [(8.85, (-0.7, BY - 2.9, 0.75), (0, BY, zc)), (10.6, (0.55, BY - 2.6, 0.5), (0, BY, zc + .5))])
key_cam(camD, tD, [(10.65, (0.0, BY - 4.0, 0.35), (0, BY, zc + .1)), (12.0, (0.0, BY - 7.5, 0.55), (0, BY, zc + .15))])
for name, f_, cam_ in [('A', 1, camA), ('B', fr(4.95), camB), ('C', fr(8.85), camC), ('D', fr(10.65), camD)]:
    m = sc.timeline_markers.new(name, frame=f_); m.camera = cam_
sc.camera = camA

import os as _os
_os.makedirs(_os.path.dirname(OUT), exist_ok=True)
for f in range(F0, F1 + 1, STEP):
    sc.frame_set(f); sc.render.filepath = f'{OUT}{f:04d}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', f, flush=True)
