# Builds FitForge's body data from the MuscleMap art (MIT, github.com/melihcolpan/MuscleMap):
# maps muscles to FitForge's 16 groups, and gives the male body a Classic Physique shape (broader
# shoulders, tighter waist, fuller legs) by warping x-coordinates by height. Output: mm/bodies.json
import json, math
from svgpathtools import parse_path
from shapely.geometry import Polygon
from shapely.ops import unary_union
P = json.load(open('mm/paths.json'))
VB = {'male_front': (0, 95, 727, 1280), 'male_back': (718, 95, 727, 1280), 'female_front': (0, 0, 650, 1450), 'female_back': (823, 0, 650, 1450)}
GROUP = {'chest': 'chest', 'abs': 'abs', 'obliques': 'obliques', 'serratus': 'lats', 'deltoids': 'shoulders', 'trapezius': 'traps',
  'rhomboids': 'upper_back', 'rotatorCuff': 'upper_back', 'upperBack': 'lats', 'lowerBack': 'lower_back', 'biceps': 'biceps', 'triceps': 'triceps',
  'forearm': 'forearms', 'quadriceps': 'quads', 'hipFlexors': 'quads', 'adductors': 'adductors', 'hamstring': 'hamstrings', 'gluteal': 'glutes',
  'calves': 'calves', 'tibialis': 'calves'}
BODY = {'head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'}
SUB = {'upperChest', 'lowerChest', 'upperAbs', 'lowerAbs', 'frontDeltoid', 'rearDeltoid', 'upperTrapezius', 'lowerTrapezius', 'innerQuad', 'outerQuad'}
ARM = {'biceps', 'triceps', 'forearm', 'hands'}
LEG = {'quadriceps', 'hipFlexors', 'adductors', 'hamstring', 'knees', 'tibialis', 'calves', 'ankles', 'feet'}

def lerp(keys, y):
    for (y0, a), (y1, b) in zip(keys, keys[1:]):
        if y0 <= y <= y1: t = (y - y0) / (y1 - y0); t = t * t * (3 - 2 * t); return a + (b - a) * t
    return keys[0][1] if y < keys[0][0] else keys[-1][1]
# male, in male-front y units (back view uses the same heights)
TORSO = [(0, 1), (270, 1), (310, 1.07), (360, 1.12), (430, 1.1), (500, 1.02), (580, 0.93), (650, 0.92), (700, 0.97), (760, 1), (2000, 1)]
LEGK = [(0, 1), (650, 1), (720, 1.08), (800, 1.12), (900, 1.1), (960, 1.02), (1010, 1), (1080, 1.04), (1140, 1.08), (1200, 1.02), (1260, 1), (2000, 1)]
ARM_SHIFT, ARM_THICK = 14, 1.07

def sample(d, step=1.6):
    pts = []
    for seg in parse_path(d):
        n = max(2, int(math.ceil(seg.length() / step)))
        pts += [seg.point(k / n) for k in range(n)]
    return [(p.real, p.imag) for p in pts]

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        dd = abs(dy * (pts[k][0] - a[0]) - dx * (pts[k][1] - a[1])) / L
        if dd > dmax: i, dmax = k, dd
    return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps) if dmax > eps else [a, b]

def to_d(pts):
    k = max(range(len(pts)), key=lambda j: math.dist(pts[0], pts[j]))   # split the closed ring in two for RDP
    pts = rdp(pts[:k + 1], 0.35)[:-1] + rdp(pts[k:] + [pts[0]], 0.35)[:-1]
    f = lambda v: f'{round(v, 1):g}'
    return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z'

def center(items, slug):
    L = [parse_path(i['d']).bbox() for i in items if i['slug'] == slug and i['side'] == 'left']
    R = [parse_path(i['d']).bbox() for i in items if i['slug'] == slug and i['side'] == 'right']
    return (max(b[1] for b in L) + min(b[0] for b in R)) / 2

out = {}
for v, items in P.items():
    male = v.startswith('male'); front = v.endswith('front')
    cx = center(items, 'abs' if front else 'trapezius')
    vb = list(VB[v]); body, muscles, shapes = [], [], {}
    for i in items:
        s = i['slug']
        if s in SUB: continue                     # sub-group overlays repeat the base muscle
        pts = sample(i['d']); xs = [p[0] for p in pts]
        if male:
            xs = [p[0] for p in pts]; side = -1 if (min(xs) + max(xs)) / 2 < cx else 1
            if s in ARM:
                mid = (min(xs) + max(xs)) / 2
                pts = [(mid + (x - mid) * ARM_THICK + side * ARM_SHIFT, y) for x, y in pts]
            elif s in LEG:
                lc = cx + side * (74 if front else 72)   # each leg's own centre line
                pts = [(lc + (x - lc) * lerp(LEGK, y), y) for x, y in pts]
            elif s not in ('head', 'hair', 'neck'):
                pts = [(cx + (x - cx) * lerp(TORSO, y), y) for x, y in pts]
        if s in BODY: body.append(to_d(pts))
        else: shapes.setdefault(GROUP[s], []).append(Polygon(pts).buffer(0))
    # pieces of the same group that touch (e.g. hip flexor and quad) become one shape, so no stray seam
    for g, polys in shapes.items():
        merged = unary_union([p.buffer(0.7) for p in polys]).buffer(-0.7)
        for poly in (merged.geoms if hasattr(merged, 'geoms') else [merged]):
            if poly.area > 20: muscles.append([g, to_d(list(poly.exterior.coords)[:-1])])
    if male: vb = [vb[0] - 20, vb[1], vb[2] + 40, vb[3]]   # room for the wider shoulders and arms
    out[v] = {'viewBox': ' '.join(f'{x:g}' for x in vb), 'body': body, 'muscles': muscles}
    print(v, len(body), len(muscles), sum(len(d) for d in body) + sum(len(m[1]) for m in muscles), 'chars')
json.dump(out, open('mm/bodies.json', 'w'))
