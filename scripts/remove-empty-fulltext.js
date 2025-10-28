const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

function splitFrontMatter(content) {
  const m = content.match(/^---\n[\s\s\S]*?\n---\s*\n/);
  if (!m) return { yaml: null, body: content };
  return { yaml: m[0], body: content.slice(m[0].length) };
}

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let removedCount = 0;

for (const file of files) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) continue;
  const yamlBody = fmMatch[1];
  const start = fmMatch.index;
  const end = start + fmMatch[0].length;

  const lines = yamlBody.split(/\n/);
  const newLines = [];
  let removedLocal = 0;
  for (const line of lines) {
    if (/^\s*fulltext:\s*""\s*$/.test(line) || /^\s*fulltext:\s*''\s*$/.test(line)) {
      removedLocal++;
      continue;
    }
    newLines.push(line);
  }
  if (removedLocal > 0) {
    const newYamlBlock = `---\n${newLines.join('\n')}\n---\n`;
    const newContent = newYamlBlock + content.slice(end);
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
    removedCount += removedLocal;
  }
}

console.log(`Scanned ${files.length} files. Modified ${modified}. Removed ${removedCount} empty fulltext entries.`);
