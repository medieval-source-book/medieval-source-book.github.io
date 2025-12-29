#!/usr/bin/env node
/**
 * Remove all <span> tags from HTML files in html2,
 * preserving the inner text/content.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'html2');

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function stripSpans(content) {
  return content
    // remove opening <span ...>
    .replace(/<span[^>]*>/gi, '')
    // remove closing </span>
    .replace(/<\/span>/gi, '');
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
    const cleaned = stripSpans(original);
    if (cleaned !== original) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      changed += 1;
      console.log(`Removed spans: ${path.relative(root, filePath)}`);
    } else {
      console.log(`No spans found: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Processed ${files.length} files, updated ${changed}.`);
}

if (require.main === module) {
  main();
}
