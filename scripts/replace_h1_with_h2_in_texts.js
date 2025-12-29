#!/usr/bin/env node
/**
 * Replace all <h1>..</h1> with <h2>..</h2> in texts/*.md.
 * Special case: if sequence <h2>Introduction to the Text</h2><h1>Introduction to the Text</h1>
 * appears, delete the <h1> version rather than converting it, to avoid duplicates.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TEXTS_DIR = path.join(ROOT, 'texts');

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  // Remove duplicate h1 Intro immediately after h2 Intro
  content = content.replace(/(<h2>Introduction to the Text<\/h2>\s*)<h1>Introduction to the Text<\/h1>/g, '$1');

  // Replace all remaining h1 tags with h2
  content = content.replace(/<h1>/g, '<h2>').replace(/<\/h1>/g, '<\/h2>');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const entries = fs.readdirSync(TEXTS_DIR);
  let processed = 0;
  let changed = 0;

  for (const entry of entries) {
    const full = path.join(TEXTS_DIR, entry);
    const stat = fs.statSync(full);
    if (stat.isFile() && entry.endsWith('.md')) {
      processed += 1;
      const didChange = processFile(full);
      if (didChange) {
        changed += 1;
        console.log(`Updated: ${path.relative(ROOT, full)}`);
      }
    }
  }

  console.log(`Processed ${processed} Markdown files. Updated ${changed}.`);
}

main();
