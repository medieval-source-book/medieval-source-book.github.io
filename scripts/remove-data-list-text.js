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
  
  // Remove data-list-text attribute from li tags
  // Match: <li data-list-text="anything"> with optional whitespace/newline after
  const newContent = content.replace(/<li\s+data-list-text="[^"]*"\s*>/g, '<li>')
    .replace(/<li\s+data-list-text='[^']*'\s*>/g, '<li>');
  
  if (newContent !== content) {
    const beforeMatches = content.match(/<li\s+data-list-text="[^"]*"\s*>/g) || [];
    removedCount += beforeMatches.length;
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}. Removed ${removedCount} data-list-text attributes.`);
