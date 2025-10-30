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
  
  // Remove id attribute from ul tags
  // Match: <ul id="anything">
  const newContent = content.replace(/<ul\s+id="[^"]*"\s*>/g, '<ul>')
    .replace(/<ul\s+id='[^']*'\s*>/g, '<ul>');
  
  if (newContent !== content) {
    const beforeMatches = (content.match(/<ul\s+id=["'][^"']*["']\s*>/g) || []).length;
    removedCount += beforeMatches;
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}. Removed ${removedCount} id attributes from ul tags.`);
