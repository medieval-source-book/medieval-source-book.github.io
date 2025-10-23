const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix markdown files to ensure blank lines before ## headings when followed by HTML
const root = path.resolve(__dirname, '..');
const patterns = [
  path.join(root, 'texts', '**', '*.md'),
];

patterns.forEach(pattern => {
  glob.sync(pattern).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Find the end of front matter
    if (!content.startsWith('---')) return;
    const fmEndIdx = content.indexOf('\n---', 3);
    if (fmEndIdx === -1) return;
    
    const frontMatter = content.slice(0, fmEndIdx + 4);
    let body = content.slice(fmEndIdx + 4);
    
    // Fix pattern: ## Heading followed immediately by <p> or other HTML
    // Add a blank line before ## headings if they're not preceded by a blank line
    body = body.replace(/([^\n])\n(##\s+[^\n]+)\n(<[a-zA-Z])/g, '$1\n\n$2\n\n$3');
    
    // Also fix pattern where ## Heading comes after HTML tags without blank lines
    body = body.replace(/(<\/[^>]+>)\n(##\s+[^\n]+)\n/g, '$1\n\n$2\n\n');
    
    const newContent = frontMatter + body;
    
    if (newContent !== original) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed markdown headings in:', file);
    }
  });
});

console.log('Done!');
