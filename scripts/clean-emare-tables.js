const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'texts', 'emare.md');
let content = fs.readFileSync(filePath, 'utf8');

// Remove <table> tags with any attributes
content = content.replace(/<table[^>]*>/gi, '');
content = content.replace(/<\/table>/gi, '');

// Remove <tr> tags
content = content.replace(/<tr>/gi, '');
content = content.replace(/<\/tr>/gi, '');

// Remove <td> tags
content = content.replace(/<td>/gi, '');
content = content.replace(/<\/td>/gi, '');

// Remove <p>[number]</p> patterns (standalone paragraph tags with just numbers)
content = content.replace(/<p>\s*\d+\s*<\/p>/gi, '');

// Clean up excessive blank lines (more than 2 consecutive)
content = content.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully cleaned emare.md:');
console.log('- Removed all <table>, <tr>, and <td> tags');
console.log('- Removed all <p>[number]</p> tags');
