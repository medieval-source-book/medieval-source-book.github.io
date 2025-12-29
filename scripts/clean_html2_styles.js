#!/usr/bin/env node
/**
 * Clean up HTML files in html2 by removing style information
 * to match the simpler formatting of files in html.
 *
 * Removes:
 * - <head>...</head> blocks (including <style> and <title>)
 * - <style>...</style> tags anywhere
 * - inline style attributes (style="...")
 * - class attributes (class="...")
 *
 * Preserves:
 * - Structure and textual content
 * - id and data-* attributes
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDir = path.join(root, 'html2');

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function cleanHtml(content) {
  let s = content;
  // Remove <head>...</head> completely
  s = s.replace(/<head[\s\S]*?<\/head>/gi, '');
  // Remove any remaining <style> tags anywhere
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove inline style attributes (style="...")
  s = s.replace(/\sstyle=("|')(?:.|\n|\r)*?\1/gi, '');
  // Remove class attributes (class="...")
  s = s.replace(/\sclass=("|')[^"']*?\1/gi, '');
  // Clean up multiple spaces that may result from removals
  s = s.replace(/\s{2,}/g, ' ');
  // Clean up spaces before closing angle brackets
  s = s.replace(/\s*>/g, '>');
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
    const cleaned = cleanHtml(original);
    if (cleaned !== original) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      changed += 1;
      console.log(`Cleaned: ${path.relative(root, filePath)}`);
    } else {
      console.log(`Unchanged: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Processed ${files.length} files, cleaned ${changed}.`);
}

if (require.main === module) {
  main();
}
