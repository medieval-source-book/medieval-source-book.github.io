const fs = require('fs');
const path = require('path');

const textsDir = path.join(__dirname, '..', 'texts');

// Files that contain table tags
const filesToClean = [
  'li_qingzhao_at_night.md',
  'li_qingzhao_courtyard_deep.md',
  'li_qingzhao_in_the_sky.md',
  'ouyang_xiu_i_hold_wine.md',
  'yan_shu_singer.md',
  'sultan_daughter.md',
  'tinodi_captivity_peter_pereny.md'
];

let totalModified = 0;
let totalTablesRemoved = 0;
let totalTrRemoved = 0;
let totalTdRemoved = 0;

for (const filename of filesToClean) {
  const filePath = path.join(textsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Count tags before removal
  const tablesBefore = (content.match(/<table[^>]*>/gi) || []).length;
  const trBefore = (content.match(/<tr>/gi) || []).length;
  const tdBefore = (content.match(/<td>/gi) || []).length;
  
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
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    totalTablesRemoved += tablesBefore;
    totalTrRemoved += trBefore;
    totalTdRemoved += tdBefore;
    
    console.log(`✓ ${filename}`);
    console.log(`  - Removed ${tablesBefore} <table> tags`);
    console.log(`  - Removed ${trBefore} <tr> tags`);
    console.log(`  - Removed ${tdBefore} <td> tags`);
  } else {
    console.log(`- ${filename} (no changes needed)`);
  }
}

console.log('\n=== Summary ===');
console.log(`Modified ${totalModified} files`);
console.log(`Total <table> tags removed: ${totalTablesRemoved}`);
console.log(`Total <tr> tags removed: ${totalTrRemoved}`);
console.log(`Total <td> tags removed: ${totalTdRemoved}`);
