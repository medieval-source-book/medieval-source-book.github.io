#!/usr/bin/env python3
"""
Analyze inline colors from user-facing templates and recommend SCSS variable replacements.
"""
import re
from pathlib import Path

# Import contrast calculation from existing script
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

# Key inline colors found in templates
inline_colors = {
    '_search-lunr': [
        ('#d9230f', 'title color', '#f6f6f6'),  # red title on light bg
        ('#666', 'author/origtitle', '#f6f6f6'),
        ('#777', 'link', '#f6f6f6'),
        ('#888', 'meta', '#f6f6f6'),
    ],
    'card-components': [
        ('#ddd', 'border', None),
        ('#f0f0f0', 'thumb bg', None),
        ('#666', 'origtitle', '#fff'),
        ('#888', 'meta', '#fff'),
    ],
    'filter-controls': [
        ('#f5f5f5', 'filter bg', None),
        ('#333', 'results count', '#f6f6f6'),
    ]
}

print('Inline Color Contrast Analysis')
print('=' * 70)

recommendations = []

for component, colors in inline_colors.items():
    print(f'\n{component.upper()}:')
    for fg, label, bg in colors:
        if bg:
            ratio = contrast_ratio(fg, bg)
            status = 'FAIL' if ratio < 4.5 else ('WARN' if ratio < 7 else 'PASS')
            print(f'  {label}: {fg} on {bg} => {ratio:.2f} {status}')
            
            if ratio < 4.5:
                # Suggest SCSS variable
                if 'red' in label or 'title' in label:
                    recommendations.append((component, label, fg, '$red or darken to $secondary-color'))
                elif '666' in fg or '777' in fg or '888' in fg:
                    recommendations.append((component, label, fg, f'$grey-9 (contrast {contrast_ratio("#646464", bg):.2f})'))
        else:
            print(f'  {label}: {fg} (decorative/non-text)')

print('\n' + '=' * 70)
print('RECOMMENDATIONS:\n')

for comp, label, color, suggestion in recommendations:
    print(f'- {comp} / {label} ({color}): Replace with {suggestion}')

# Suggest specific replacements
print('\nSPECIFIC VARIABLE REPLACEMENTS:')
print('  #666 → $grey-9 (#646464) - better contrast')
print('  #777 → $grey-8 (#7E7E7E) - or $grey-9 for better AA')
print('  #888 → $grey-7 (#8B8B8B) - marginal, consider $grey-9')
print('  #d9230f → $secondary-color (#BB0000) - consistent site red')
print('  #ddd → $grey-3 (#CBCBCB) - neutral border')
print('  #f0f0f0 → $grey-1 (#E4E4E4) or keep as bg (non-text)')
print('  #f5f5f5 → $body-bg (#f6f6f6) - near-identical')
print('  #333 → $grey-13 (#313131) - or $black for max contrast')
