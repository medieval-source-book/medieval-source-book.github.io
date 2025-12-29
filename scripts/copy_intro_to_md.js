#!/usr/bin/env node
/**
 * For each .html in html2, find matching texts/<name>.md.
 * Extract content between '<h2>Introduction to the Text</h2>' and the last '</p>' before '</body>'.
 * Insert that extracted HTML block immediately after the top YAML block in the .md file.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlDir = path.join(root, 'html2');
const mdDir = path.join(root, 'texts');

function isHtmlFile(name) {
  return name.toLowerCase().endsWith('.html');
}

function extractHtmlBlock(html) {
  const heading = '<h2>Introduction to the Text</h2>';
  const startIdx = html.indexOf(heading);
  if (startIdx === -1) return null;
  // Find last </p> before </body>
  const bodyIdx = html.indexOf('</body>');
  if (bodyIdx === -1) return null;
  // last </p> strictly before body
  const lastPBeforeBodyIdx = html.lastIndexOf('</p>', bodyIdx);
  if (lastPBeforeBodyIdx === -1 || lastPBeforeBodyIdx <= startIdx) return null;
  const endIdx = lastPBeforeBodyIdx + '</p>'.length;
  const block = html.slice(startIdx + heading.length, endIdx);
  return block.trim();
}

function findYamlEnd(md) {
  // YAML front matter starts at beginning and ends at the next line with --- on its own
  if (!md.startsWith('---')) return null;
  const re = /^---[\s\S]*?\n---\s*\n?/; // match including trailing newline after closing ---
  const m = md.match(re);
  if (!m) return null;
  return m[0].length; // index to insert after YAML block
}

function main() {
  if (!fs.existsSync(htmlDir)) {
    console.error(`Missing directory: ${htmlDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(mdDir)) {
    console.error(`Missing directory: ${mdDir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(htmlDir).filter(isHtmlFile);
  let updated = 0;
  for (const fname of entries) {
    const base = fname.replace(/\.html$/i, '');
    const htmlPath = path.join(htmlDir, fname);
    const mdPath = path.join(mdDir, base + '.md');
    if (!fs.existsSync(mdPath)) {
      console.warn(`MD not found for ${fname}: ${path.relative(root, mdPath)}`);
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const block = extractHtmlBlock(html);
    if (!block) {
      console.warn(`No extractable intro for ${fname}`);
      continue;
    }
    const md = fs.readFileSync(mdPath, 'utf8');
    const yamlEndIdx = findYamlEnd(md);
    if (yamlEndIdx == null) {
      console.warn(`No YAML block in ${path.relative(root, mdPath)}; skipping insertion.`);
      continue;
    }
    const insertion = `\n${block}\n`;
    const newMd = md.slice(0, yamlEndIdx) + insertion + md.slice(yamlEndIdx);
    fs.writeFileSync(mdPath, newMd, 'utf8');
    updated++;
    console.log(`Inserted intro into: ${path.relative(root, mdPath)}`);
  }
  console.log(`Done. Processed ${entries.length} HTML files, updated ${updated} MD files.`);
}

if (require.main === module) {
  main();
}
