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

  // Remove data-list-text attribute from <li ...> regardless of attribute order/quotes/newlines
  // Preserve other attributes, normalize spacing
  const liRegex = /<li\b([^>]*)>/gi;
  let changed = false;
  const newContent = content.replace(liRegex, (full, attrs) => {
    if (!/\bdata-list-text\s*=\s*["'][^"']*["']/i.test(attrs)) return full; // nothing to remove
    const before = (attrs.match(/\bdata-list-text\s*=\s*["'][^"']*["']/gi) || []).length;
    removedCount += before;
    changed = true;
    // Remove all occurrences of data-list-text="..." or data-list-text='...'
    let cleaned = attrs.replace(/\s*\bdata-list-text\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned ? `<li ${cleaned}>` : '<li>';
  });

  if (changed) {
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}. Removed ${removedCount} data-list-text attributes.`);
