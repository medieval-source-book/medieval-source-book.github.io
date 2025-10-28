const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let removedKeys = 0;

for (const file of files) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) continue;
  const yamlBody = fmMatch[1];
  const yamlStart = fmMatch.index;
  const yamlEnd = yamlStart + fmMatch[0].length;

  const lines = yamlBody.split(/\n/);
  const newLines = [];
  let skip = false;
  let skipIndent = 0;
  let localRemoved = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!skip) {
      // Detect the fulltext key at top level or nested; capture its indent
      const m = line.match(/^(\s*)fulltext\s*:\s*(.*)$/);
      if (m) {
        localRemoved++;
        skip = true;
        skipIndent = m[1].length; // number of spaces
        const value = m[2] || '';
        // If the value is inline scalar ("...", '...', or non-block), we skip just this line
        // If value indicates block scalar (| or > with optional modifiers), keep skipping indented lines > skipIndent
        const isBlock = /^([|>])/.test(value.trim());
        if (!isBlock) {
          // single line removal done
          skip = false;
        }
        continue;
      }
      newLines.push(line);
    } else {
      // Skipping block scalar lines until dedent to <= skipIndent or blank top-level
      const indent = line.match(/^(\s*)/)[1].length;
      if (line.trim() === '' && indent <= skipIndent) {
        // blank but not indented further: treat as end of block
        skip = false;
        newLines.push(line);
        continue;
      }
      if (indent <= skipIndent) {
        // end of block scalar
        skip = false;
        newLines.push(line);
      } else {
        // still part of block scalar value, keep skipping
      }
    }
  }

  if (localRemoved > 0) {
    const newYamlBlock = `---\n${newLines.join('\n')}\n---\n`;
    const newContent = newYamlBlock + content.slice(yamlEnd);
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
    removedKeys += localRemoved;
  }
}

console.log(`Scanned ${files.length} files. Modified ${modified}. Removed ${removedKeys} fulltext entries (any value).`);
