const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let removedCount = 0;

for (const file of files) {
  const p = path.join(textsDir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Remove id attribute from <ul ...> regardless of attribute order, quotes, or newlines.
  // Keeps any other attributes intact and normalizes spacing.
  const ulIdRegex = /<ul\b([^>]*)>/gi;
  let changed = false;
  const newContent = content.replace(ulIdRegex, (full, attrs) => {
    if (!/\bid\s*=\s*["'][^"']*["']/i.test(attrs)) return full; // nothing to remove
    const before = (attrs.match(/\bid\s*=\s*["'][^"']*["']/gi) || []).length;
    removedCount += before;
    changed = true;
    // Remove all id="..." or id='...'
    let cleaned = attrs.replace(/\s*\bid\s*=\s*["'][^"']*["']/gi, '');
    // Collapse excessive whitespace and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned ? `<ul ${cleaned}>` : '<ul>';
  });

  if (changed) {
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}. Removed ${removedCount} id attributes from ul tags.`);
