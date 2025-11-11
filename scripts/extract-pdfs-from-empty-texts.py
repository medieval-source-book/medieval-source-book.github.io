#!/usr/bin/env python3

import os
import re
import shutil
from pathlib import Path

# Directories
base_dir = Path(__file__).parent.parent
texts_dir = base_dir / 'texts'
assets_dir = base_dir / 'assets' / 'pdf'
output_dir = base_dir / 'pdf-extract'

# Create output directory
output_dir.mkdir(exist_ok=True)

found_count = 0
copied_count = 0
not_found = []

print(f"Scanning markdown files in {texts_dir}...")

for md_file in texts_dir.glob('*.md'):
    content = md_file.read_text(encoding='utf-8')
    
    # Extract YAML front matter
    yaml_match = re.match(r'^---\s*\n(.*?)\n---\s*\n?(.*)$', content, re.DOTALL)
    
    if not yaml_match:
        continue
    
    front_matter, body_content = yaml_match.groups()
    
    # Check if body is empty (only whitespace)
    if body_content.strip():
        continue
    
    # Look for pdf field in YAML
    pdf_match = re.search(r'^pdf:\s*["\']?(.+?)["\']?\s*$', front_matter, re.MULTILINE)
    
    if not pdf_match:
        continue
    
    pdf_path = pdf_match.group(1).strip()
    found_count += 1
    
    print(f"\n📄 {md_file.name}")
    print(f"   PDF field: {pdf_path}")
    
    # Extract filename from path
    if pdf_path.startswith('/assets/pdf/'):
        pdf_filename = pdf_path.replace('/assets/pdf/', '')
    elif pdf_path.startswith('assets/pdf/'):
        pdf_filename = pdf_path.replace('assets/pdf/', '')
    else:
        pdf_filename = Path(pdf_path).name
    
    source_pdf_path = assets_dir / pdf_filename
    
    if source_pdf_path.exists():
        dest_pdf_path = output_dir / pdf_filename
        shutil.copy2(source_pdf_path, dest_pdf_path)
        print(f"   ✅ Copied to pdf-extract/{pdf_filename}")
        copied_count += 1
    else:
        print(f"   ❌ PDF not found at: {source_pdf_path}")
        not_found.append((md_file.name, pdf_path))

print(f"\n=== Summary ===")
print(f"Empty text files with PDF field: {found_count}")
print(f"PDFs successfully copied: {copied_count}")
print(f"PDFs not found: {found_count - copied_count}")

if not_found:
    print(f"\nFiles with missing PDFs:")
    for md_name, pdf in not_found:
        print(f"  - {md_name}: {pdf}")
