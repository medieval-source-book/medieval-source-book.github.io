#!/usr/bin/env node
/**
 * Insert newline characters between adjacent HTML tags in html2 files
 * to match formatting style used in html (each tag on its own line).
 *
 * Rule:
 * - Replace any occurrence of ">\s<" between tags with ">\n<"
 * - Ensure final trailing newline at end of file
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'html2');

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function formatNewlines(content) {
  let s = content;
  // Insert newline between adjacent tags (or tags separated by spaces)
  s = s.replace(/>\s*</g, '>' + '\n' + '<');
  // Ensure single trailing newline
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
    const formatted = formatNewlines(original);
    if (formatted !== original) {
      fs.writeFileSync(filePath, formatted, 'utf8');
      changed += 1;
      console.log(`Formatted: ${path.relative(root, filePath)}`);
    } else {
      console.log(`Already formatted: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Processed ${files.length} files, formatted ${changed}.`);
}

if (require.main === module) {
  main();
}
