#!/usr/bin/env node
/**
 * Collapse <p><br/></p> blocks onto a single line across html2 files.
 * Handles variants like <p>\n<br/>\n</p> or extra whitespace.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'html2');

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function collapse(content) {
  let s = content;
  // Collapse paragraph blocks that only contain a <br/> (allowing whitespace/newlines)
  s = s.replace(/<p>\s*<br\s*\/?>(?:\s|\n|\r)*<\/p>/gi, '<p><br/></p>');
  // Ensure trailing newline
  if (!s.endsWith('\n')) s += '\n';
  return s;
}

function main() {
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(targetDir);
  const files = entries.filter(isHtmlFile);
  let changed = 0;
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = collapse(original);
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      changed += 1;
      console.log(`Collapsed: ${path.relative(root, filePath)}`);
    } else {
      console.log(`No changes: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Processed ${files.length}, collapsed ${changed}.`);
}

if (require.main === module) {
  main();
}
