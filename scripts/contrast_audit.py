#!/usr/bin/env python3
import re, math, pathlib

SCSS_FILE = pathlib.Path(__file__).parent.parent/'_sass'/'_01_settings_colors.scss'

text = SCSS_FILE.read_text()
# capture variable definitions like $var: #hex; or $var: #hex;
pattern = re.compile(r'\$(?P<name>[a-zA-Z0-9_-]+):\s*(?P<value>#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}));')
colors = {m.group('name'): m.group('value') for m in pattern.finditer(text)}

# utility functions

def hex_to_rgb(hexcode):
    hexcode = hexcode.lstrip('#')
    if len(hexcode)==3:
        hexcode = ''.join(c*2 for c in hexcode)
    return tuple(int(hexcode[i:i+2],16)/255.0 for i in (0,2,4))

def rel_luminance(rgb):
    def transform(c):
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b = (transform(c) for c in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contrast_ratio(hex1, hex2):
    l1 = rel_luminance(hex_to_rgb(hex1))
    l2 = rel_luminance(hex_to_rgb(hex2))
    lighter = max(l1,l2)
    darker = min(l1,l2)
    return (lighter + 0.05) / (darker + 0.05)

pairs = {
    'Body text vs body bg': ('black','body-bg' ),
    'Link (red) vs body bg': ('red','body-bg'),
    'Topbar link vs topbar bg': ('topbar-link-color','topbar-bg-color'),
    'Topbar active link bg vs link color': ('topbar-link-bg-active','topbar-link-color'),
    'Panel font vs panel bg': ('panel-font-color','pale-amber'),
    'Footer text vs footer bg': ('footer-color','footer-bg'),
    'Footer link vs footer bg': ('footer-link-color','footer-bg'),
    'Grey-9 text vs body bg': ('grey-9','body-bg'),
    'Highlight comment vs body bg': ('highlight-comment','body-bg'),
    'Focus outline (#005fcc) vs body bg': ('body-bg','005fcc'),
}

# Map derived vars not directly in colors dict
extra_map = {
    'body-bg': '#f6f6f6',
    'panel-font-color': colors.get('black','#000'),
    'pale-amber': colors.get('pale-amber','#FDE8A8'),
    'footer-color': colors.get('white','#FFFFFF'),
    'footer-bg': colors.get('black','#000'),
    'footer-link-color': colors.get('grey','#ECEBEA'),
    'topbar-link-color': colors.get('black','#000'),
    'topbar-bg-color': colors.get('white','#FFFFFF'),
    'topbar-link-bg-active': colors.get('ci-6', colors.get('light-amber','#FBD973')),
    'highlight-comment': '#999988',
    '005fcc': '#005fcc'
}

# merge
for k,v in extra_map.items():
    colors.setdefault(k,v)

print('Contrast Audit Ratios (WCAG):')
print('--------------------------------')

results = []
for label,(fg,bg) in pairs.items():
    if fg not in colors or bg not in colors:
        continue
    ratio = contrast_ratio(colors[fg], colors[bg])
    results.append((label, colors[fg], colors[bg], ratio))

# Sort by ascending ratio
results.sort(key=lambda x: x[3])

for label, fg, bg, ratio in results:
    status = 'FAIL (AA)' if ratio < 4.5 else ('WARN (< AAA)' if ratio < 7 else 'PASS (AAA)')
    print(f'{label}: {fg} on {bg} => {ratio:.2f} {status}')

# Provide summary counts
fail = sum(1 for r in results if r[3] < 4.5)
warn = sum(1 for r in results if 4.5 <= r[3] < 7)
print('\nSummary:')
print(f'  Fail (<4.5): {fail}')
print(f'  Warn (AA pass but <7): {warn}')
print(f'  Pass AAA (>=7): {sum(1 for r in results if r[3] >= 7)}')

# Suggest improvements for failing ones
print('\nSuggestions:')
for label, fg, bg, ratio in results:
    if ratio < 4.5:
        # If bg is light raise darkness of fg or darken bg slightly
        print(f'- {label} ratio {ratio:.2f}: consider darkening foreground {fg} or choosing higher contrast color.')
