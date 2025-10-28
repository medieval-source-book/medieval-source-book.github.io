const fs = require('fs');
const path = require('path');

const textsDir = path.join(__dirname, '../texts');

const mdFiles = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));

let filesChanged = 0;
let totalRemovedTags = 0;
let warnings = [];

function splitFrontMatter(content) {
  // Match YAML front matter at the start of the file
  const m = content.match(/^---\n[\s\S]*?\n---\s*\n/);
  if (!m) {
    return { yaml: '', body: content, yamlEnd: 0 };
  }
  const yaml = m[0];
  const body = content.slice(yaml.length);
  return { yaml, body, yamlEnd: yaml.length };
}

console.log(`Processing ${mdFiles.length} markdown files in texts/ ...`);

for (const file of mdFiles) {
  const p = path.join(textsDir, file);
  const original = fs.readFileSync(p, 'utf8');
  const { yaml, body } = splitFrontMatter(original);

  // Remove all <span ...> and </span> tags while preserving inner content
  // Count occurrences first
  const openCount = (body.match(/<span\b[^>]*>/gi) || []).length;
  const closeCount = (body.match(/<\/span>/gi) || []).length;

  let newBody = body.replace(/<span\b[^>]*>/gi, '');
  newBody = newBody.replace(/<\/span>/gi, '');

  // Basic sanity: ensure no span tags remain
  const leftover = (newBody.match(/<\/?span\b/gi) || []).length;
  if (leftover > 0) {
    warnings.push(`${file}: ${leftover} leftover <span> tokens after cleanup`);
  }

  // Optionally normalize whitespace created by removal: collapse double spaces inside tags
  newBody = newBody.replace(/\s{2,}/g, ' ');
  // Keep line breaks as-is; avoid altering paragraphs/markdown

  if (newBody !== body) {
    const removed = openCount + closeCount;
    totalRemovedTags += removed;
    const updated = yaml + newBody;
    fs.writeFileSync(p, updated, 'utf8');
    console.log(`✅ ${file}: removed ${removed} <span> tags`);
    filesChanged++;
  }
}

console.log('\n=== Span Removal Complete ===');
console.log(`📝 Files modified: ${filesChanged}`);
console.log(`🗑️  Total <span> tags removed: ${totalRemovedTags}`);
if (warnings.length) {
  console.log(`⚠️  Warnings (${warnings.length}):`);
  warnings.slice(0, 20).forEach(w => console.log(' - ' + w));
  if (warnings.length > 20) console.log(` ... and ${warnings.length - 20} more`);
}
