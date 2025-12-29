#!/usr/bin/env node
/**
 * Restore missing <h2>Introduction to the Text</h2> heading
 * at the start of the HTML block inserted after YAML in texts/*.md.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mdDir = path.join(root, 'texts');

function isMdFile(name) {
  return name.toLowerCase().endsWith('.md');
}

function findYamlEnd(md) {
  if (!md.startsWith('---')) return null;
  const re = /^---[\s\S]*?\n---\s*\n?/;
  const m = md.match(re);
  if (!m) return null;
  return m[0].length;
}

function needsHeading(md, yamlEndIdx) {
  const after = md.slice(yamlEndIdx);
  const trimmed = after.trimStart();
  if (trimmed.startsWith('<h2>Introduction to the Text</h2>')) return false;
  // If next non-whitespace char is '<', likely our inserted HTML block
  const nonWsIdx = after.search(/\S/);
  if (nonWsIdx === -1) return false;
  return after[nonWsIdx] === '<';
}

function restore(md, yamlEndIdx) {
  const before = md.slice(0, yamlEndIdx);
  const after = md.slice(yamlEndIdx);
  const insertion = '\n<h2>Introduction to the Text</h2>\n';
  return before + insertion + after;
}

function main() {
  if (!fs.existsSync(mdDir)) {
    console.error(`Missing directory: ${mdDir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(mdDir).filter(isMdFile);
  let changed = 0;
  for (const fname of entries) {
    const filePath = path.join(mdDir, fname);
    const md = fs.readFileSync(filePath, 'utf8');
    const yamlEndIdx = findYamlEnd(md);
    if (yamlEndIdx == null) {
      continue;
    }
    if (!needsHeading(md, yamlEndIdx)) {
      continue;
    }
    const updated = restore(md, yamlEndIdx);
    if (updated !== md) {
      fs.writeFileSync(filePath, updated, 'utf8');
      changed++;
      console.log(`Restored heading in: ${path.relative(root, filePath)}`);
    }
  }
  console.log(`Done. Checked ${entries.length} MD files, restored ${changed}.`);
}

if (require.main === module) {
  main();
}
