# Pull SVG path strings out of the MuscleMap Swift data files into JSON: {view: [{slug, side, d}]}
import re, json, sys
src = sys.argv[1]; out = {}
for view, fn in [('male_front', 'MaleFrontPaths'), ('male_back', 'MaleBackPaths'), ('female_front', 'FemaleFrontPaths'), ('female_back', 'FemaleBackPaths')]:
    s = open(f'{src}/{fn}.swift').read()
    items = []
    for block in s.split('BodyPartPathData(')[1:]:
        slug = re.search(r'slug:\s*\.(\w+)', block).group(1)
        for side in ('common', 'left', 'right'):
            m = re.search(side + r':\s*\[(.*?)\]', block, re.S)
            if m:
                for d in re.findall(r'"([^"]+)"', m.group(1)): items.append({'slug': slug, 'side': side, 'd': d})
    out[view] = items
    print(view, len(items), sorted(set(i['slug'] for i in items)))
json.dump(out, open(sys.argv[2], 'w'))
