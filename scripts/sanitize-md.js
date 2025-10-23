const fs = require('fs');
const path = require('path');

// Sanitize markdown files in _texts and other folders to replace empty YAML block scalars
// like `fulltext: |` followed by blank lines and `---` with `fulltext: ""`

const root = path.resolve(__dirname, '..', '..');
const patterns = [
  path.join(root, '_texts', '**', '*.md'),
  path.join(root, '_texts', '**', '*.markdown'),
  path.join(root, '_texts original', '**', '*.md'),
  path.join(root, '_texts original', '**', '*.markdown'),
];

const glob = require('glob');

patterns.forEach(pattern => {
  glob.sync(pattern).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Find front-matter block at start
    if (!content.startsWith('---')) return;
    const fmEndIdx = content.indexOf('\n---', 3);
    if (fmEndIdx === -1) return;
    const fmBlock = content.slice(0, fmEndIdx + 4); // include closing --- and newline
    const body = content.slice(fmEndIdx + 4);

    // Normalize YAML block scalars: for any key like `key: |`, ensure following lines are indented
    const lines = fmBlock.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*\|\s*$/);
      if (m) {
        // indent subsequent lines until next top-level key or end of front-matter
        let j = i + 1;
        for (; j < lines.length; j++) {
          const line = lines[j];
          if (line.match(/^[A-Za-z0-9_-]+:\s*/)) break; // next key
          if (line.trim() === '---') break; // end of front-matter
          if (!line.startsWith(' ') && !line.startsWith('\t')) {
            lines[j] = ' ' + line;
          }
        }
        i = j - 1;
      }
    }
    const newFmBlock = lines.join('\n');
    if (newFmBlock !== fmBlock) {
      const newContent = newFmBlock + body;
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Normalized block scalars for', file);
    }
    // Convert empty block scalars (e.g., `fulltext: |` followed only by blank lines) to empty string values
    let updated = fs.readFileSync(file, 'utf8');
    const emptyBlockRegex = /(^|\n)([ \t]*)(fulltext|imagesource):\s*\|\s*\n(?:[ \t]*\n)+/g;
    if (emptyBlockRegex.test(updated)) {
      updated = updated.replace(emptyBlockRegex, "$1$2$3: \"\"\n");
      fs.writeFileSync(file, updated, 'utf8');
      console.log('Collapsed empty block scalars for', file);
    }
    // Additionally, extract stray lines that appear after a key like `fulltext:` or `imagesource:` but before the closing '---'
    const keysToExtract = ['fulltext', 'imagesource'];
    let fmLines = newFmBlock.split('\n');
    let extracted = [];
    let changed = false;
    for (let k = 0; k < fmLines.length; k++) {
      const line = fmLines[k];
      const keyMatch = line.match(new RegExp('^(' + keysToExtract.join('|') + '):\s*(.*)$'));
      if (keyMatch) {
        // collect following lines that are not new key lines and not the end marker
        let j = k + 1;
        let collected = [];
        for (; j < fmLines.length; j++) {
          const l = fmLines[j];
          if (l.trim() === '---') break;
          if (l.match(/^[A-Za-z0-9_-]+:\s*/)) break;
          // treat this line as part of the key's stray block
          collected.push(l.replace(/^\s?/, ''));
        }
        if (collected.length > 0) {
          // replace the key line with an explicit empty-string value
          fmLines[k] = keyMatch[1] + ': ""';
          // remove the collected lines from fmLines
          fmLines.splice(k + 1, collected.length);
          // append collected lines to extracted content
          extracted.push(collected.join('\n'));
          changed = true;
        }
      }
    }
    if (changed) {
      const finalFm = fmLines.join('\n');
      const finalBody = '\n' + extracted.join('\n\n') + '\n' + body;
      fs.writeFileSync(file, finalFm + finalBody, 'utf8');
      console.log('Extracted stray front-matter blocks for', file);
    }
  });
});
