const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Move caption text from body content to imagesource YAML field
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
    
    let frontMatter = content.slice(0, fmEndIdx + 4);
    let body = content.slice(fmEndIdx + 4);
    
    // Check if imagesource is empty
    if (!frontMatter.includes('imagesource: ""') && !frontMatter.includes("imagesource: ''")) {
      return; // Skip if imagesource is already populated
    }
    
    // Extract the first line of body content (the caption)
    // Skip empty lines at the start
    const bodyLines = body.split('\n');
    let captionLine = '';
    let captionIndex = -1;
    
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i].trim();
      if (line && !line.startsWith('#')) {
        // This is the caption line
        captionLine = line;
        captionIndex = i;
        break;
      }
    }
    
    if (!captionLine || captionLine.startsWith('<')) {
      // No caption found or it's HTML
      return;
    }
    
    // Update the front matter with the caption
    frontMatter = frontMatter.replace(
      /imagesource:\s*(""|'')/,
      `imagesource: "${captionLine.replace(/"/g, '\\"')}"`
    );
    
    // Remove the caption line from body
    bodyLines.splice(captionIndex, 1);
    body = bodyLines.join('\n');
    
    const newContent = frontMatter + body;
    
    if (newContent !== original) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Moved caption to imagesource for:', file);
    }
  });
});

console.log('Done!');
