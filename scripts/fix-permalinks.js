const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Add .html extension to permalinks that don't have it
const root = path.resolve(__dirname, '..');
const patterns = [
  path.join(root, 'texts', '**', '*.md'),
  path.join(root, 'textcollections', '**', '*.md'),
  path.join(root, 'languages', '*.md'),
  path.join(root, 'periods', '*.md'),
  path.join(root, 'pages', '**', '*.md'),
];

patterns.forEach(pattern => {
  glob.sync(pattern).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Find the end of front matter
    if (!content.startsWith('---')) return;
    const fmEndIdx = content.indexOf('\n---', 3);
    if (fmEndIdx === -1) return;
    
    let frontMatter = content.slice(0, fmEndIdx + 4);
    const body = content.slice(fmEndIdx + 4);
    
    // Update permalink to add .html if it doesn't end with .html or /
    frontMatter = frontMatter.replace(
      /permalink:\s*"([^"]+)"/g,
      (match, url) => {
        if (url.endsWith('.html') || url.endsWith('/')) {
          return match;
        }
        return `permalink: "${url}.html"`;
      }
    );
    
    const newContent = frontMatter + body;
    
    if (newContent !== original) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed permalink for:', file);
    }
  });
});

console.log('Done!');
