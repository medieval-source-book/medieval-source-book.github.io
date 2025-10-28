const fs = require('fs');
const path = require('path');

const textsDir = path.join(__dirname, '../texts');

function splitFrontMatter(content) {
  const m = content.match(/^---\n[\s\S]*?\n---\s*\n/);
  if (!m) return { yaml: '', body: content };
  return { yaml: m[0], body: content.slice(m[0].length) };
}

const mdFiles = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let filesChanged = 0;
let totalBrNormalized = 0;
let totalEmptyPRemoved = 0;

for (const file of mdFiles) {
  const p = path.join(textsDir, file);
  const original = fs.readFileSync(p, 'utf8');
  const { yaml, body } = splitFrontMatter(original);
  let newBody = body;

  // Normalize <br/> variants to <br>
  // Matches <br>, <br/>, <br /> with varying spaces and case; unify to <br>
  const brVariant = /<br\s*\/?>/gi;
  const brCount = (newBody.match(brVariant) || []).length;
  if (brCount) {
    newBody = newBody.replace(brVariant, '<br>');
    totalBrNormalized += brCount;
  }

  // Remove extraneous <p><br></p> blocks (allowing whitespace)
  // Variants: <p><br></p>, <p> <br> </p>, with potential newlines
  const emptyPRegex = /<p>\s*(?:<br>)\s*<\/p>\s*\n?/gi;
  const removeCount = (newBody.match(emptyPRegex) || []).length;
  if (removeCount) {
    newBody = newBody.replace(emptyPRegex, '\n'); // keep a single blank line for spacing
    totalEmptyPRemoved += removeCount;
  }

  // Only write if changed
  if (newBody !== body) {
    fs.writeFileSync(p, yaml + newBody, 'utf8');
    filesChanged++;
    console.log(`✅ ${file}: normalized ${brCount} <br/> -> <br>, removed ${removeCount} <p><br></p>`);
  }
}

console.log(`\n=== Break Normalization Complete ===`);
console.log(`📝 Files modified: ${filesChanged}`);
console.log(`🔄 <br> normalized: ${totalBrNormalized}`);
console.log(`🗑️  <p><br></p> removed: ${totalEmptyPRemoved}`);
