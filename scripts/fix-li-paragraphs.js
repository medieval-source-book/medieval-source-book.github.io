const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let changedFiles = [];

function processUlBlock(full) {
  const openerMatch = full.match(/<ul\b[^>]*>/i);
  if (!openerMatch) return full; // safety
  const opener = openerMatch[0];
  const inner = full.slice(opener.length, full.length - '</ul>'.length);

  const liRegex = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  let lastIndex = 0;
  let segs = [];
  let current = opener;
  let changed = false;
  let m;

  while ((m = liRegex.exec(inner)) !== null) {
    const pre = inner.slice(lastIndex, m.index);
    current += pre; // preserve whitespace/comments between lis if any

    const liAttrs = (m[1] || '').trim();
    const liContent = m[2] || '';

    const pStart = liContent.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>([\s\S]*)$/i);

    if (pStart) {
      changed = true;
      const first = pStart[1];
      const rest = pStart[2] || '';
      current += `<li${liAttrs ? ' ' + liAttrs : ''}>${first}</li>`;

      if (rest && rest.replace(/\s+/g, '').length > 0) {
        // Close UL, emit rest paragraphs outside, reopen UL
        segs.push(current + '</ul>');
        segs.push(rest);
        current = opener;
      }
    } else {
      // No <p> directly after <li>, keep as-is
      current += `<li${liAttrs ? ' ' + liAttrs : ''}>${liContent}</li>`;
    }

    lastIndex = liRegex.lastIndex;
  }

  current += inner.slice(lastIndex);
  segs.push(current + '</ul>');

  const output = segs.join('');
  return { output, changed };
}

for (const file of files) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');

  const ulRegex = /<ul\b[^>]*>[\s\S]*?<\/ul>/gi;
  let anyChanged = false;
  const newContent = content.replace(ulRegex, (full) => {
    const res = processUlBlock(full);
    if (res.changed) anyChanged = true;
    return res.output || res; // res.output if object, else string
  });

  if (anyChanged && newContent !== content) {
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
    changedFiles.push(file);
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}.`);
if (changedFiles.length) {
  console.log('Changed files:\n - ' + changedFiles.join('\n - '));
}
