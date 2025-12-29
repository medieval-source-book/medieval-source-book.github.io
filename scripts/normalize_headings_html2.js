#!/usr/bin/env node
/**
 * Normalize headings in html2 files to match conventions in html:
 * - Section headings: h2 for "Text Information", "Introduction to the Text",
 *   "Introduction to the Source", "About this Edition", "Further Reading"
 * - "Critical Notes": h1
 * - Convert any h3/h4 occurrences of these to target levels; preserve text.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'html2');

const SECTION_H2 = [
  'Text Information',
  'Introduction to the Text',
  'Introduction to the Source',
  'About this Edition',
  'Further Reading'
];

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function normalize(content) {
  let s = content;

  // Normalize H2 sections
  for (const label of SECTION_H2) {
    // Replace any <h1..6>label</h..> with <h2>label</h2>
    const re = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegex(label)}\\s*<\\/h[1-6]>`, 'g');
    s = s.replace(re, `<h2>${label}</h2>`);
  }

  // Normalize Critical Notes to h1
  {
    const label = 'Critical Notes';
    const re = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegex(label)}\\s*<\\/h[1-6]>`, 'g');
    s = s.replace(re, `<h1>${label}</h1>`);
  }

  return s;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const dir = targetDir;
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir);
  const files = entries.filter(isHtmlFile);
  let changed = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = normalize(original);
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      changed += 1;
      console.log(`Normalized: ${path.relative(root, filePath)}`);
    } else {
      console.log(`No changes: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Processed ${files.length}, normalized ${changed}.`);
}

if (require.main === module) {
  main();
}
