#!/usr/bin/env python3
"""
Full site color scan for inline hex/rgb values not using SCSS variables.
Flags potential contrast issues.
"""
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
EXTENSIONS = ['.html', '.scss', '.css', '.md', '.njk']

# Regex for hex colors and rgb/rgba
HEX_PATTERN = re.compile(r'#([0-9a-fA-F]{3,6})\b')
RGB_PATTERN = re.compile(r'rgba?\s*\(')

exclude_dirs = {'_site_11ty', '.git', 'node_modules', 'assets/fonts', 'assets/js'}

def scan_file(path):
    try:
        content = path.read_text(encoding='utf-8', errors='ignore')
    except:
        return []
    
    findings = []
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        # Skip comments
        if line.strip().startswith('//') or line.strip().startswith('/*'):
            continue
        
        hex_matches = HEX_PATTERN.findall(line)
        rgb_matches = RGB_PATTERN.findall(line)
        
        if hex_matches or rgb_matches:
            findings.append((i, line.strip()[:120]))
    
    return findings

def main():
    results = {}
    
    for ext in EXTENSIONS:
        for file_path in BASE.rglob(f'*{ext}'):
            # Skip excluded directories
            if any(ex in file_path.parts for ex in exclude_dirs):
                continue
            
            findings = scan_file(file_path)
            if findings:
                rel_path = file_path.relative_to(BASE)
                results[str(rel_path)] = findings
    
    print('Inline Color Scan Results')
    print('=' * 60)
    print(f'Found inline colors in {len(results)} files:\n')
    
    for file_path in sorted(results.keys()):
        print(f'\n{file_path}:')
        for line_num, line_text in results[file_path][:5]:  # limit to 5 per file
            print(f'  Line {line_num}: {line_text}')
        if len(results[file_path]) > 5:
            print(f'  ... and {len(results[file_path]) - 5} more')
    
    # Highlight likely user-facing inline colors
    print('\n' + '=' * 60)
    print('User-facing files with inline colors (pages/layouts):')
    user_facing = {k: v for k, v in results.items() 
                   if any(x in k for x in ['pages/', 'layouts/', '_includes/'])}
    
    for file_path in sorted(user_facing.keys()):
        print(f'\n{file_path}:')
        for line_num, line_text in user_facing[file_path][:5]:
            print(f'  Line {line_num}: {line_text}')

if __name__ == '__main__':
    main()
