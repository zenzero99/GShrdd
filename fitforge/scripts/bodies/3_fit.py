# Tight viewBoxes: front and back of each body share one size (so they draw at the same scale), centred on the content.
import json, re
B = json.load(open('mm/bodies.json')); PAD = 16
def bbox(f):
    xs, ys = [], []
    for d in f['body'] + [m[1] for m in f['muscles']]:
        n = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', d)]
        if not d.startswith('M') or ' L' not in d:  # original MuscleMap strings (relative commands): fall back to absolute numbers only
            continue
        xs += n[0::2]; ys += n[1::2]
    return min(xs), max(xs), min(ys), max(ys)
for sex in ('male', 'female'):
    bf, bb = bbox(B[sex + '_front']), bbox(B[sex + '_back'])
    w = max(bf[1] - bf[0], bb[1] - bb[0]) + 2 * PAD; y0 = min(bf[2], bb[2]) - PAD; h = max(bf[3], bb[3]) + PAD - y0
    for v, b in ((sex + '_front', bf), (sex + '_back', bb)):
        cx = (b[0] + b[1]) / 2
        B[v]['viewBox'] = f'{cx - w / 2:.0f} {y0:.0f} {w:.0f} {h:.0f}'
        print(v, B[v]['viewBox'])
json.dump(B, open('mm/bodies.json', 'w'))
