const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

function splitFrontMatter(content) {
  const m = content.match(/^---\n[\s\S]*?\n---\s*\n/);
  if (!m) return { yaml: null, body: content };
  return { yaml: m[0], body: content.slice(m[0].length) };
}

function normalizeText(str) {
  // strip HTML tags, decode basic entities, collapse whitespace
  return String(str)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim();
}

function shouldTruncate(body) {
  const trimmed = body.replace(/^\s+/, '');
  // Condition A: starts with the exact markdown heading
  if (/^##\s*Introduction\s+to\s+the\s+Text\b/i.test(trimmed)) return true;

  // Condition B: DOES NOT start with words "Introduction to the Text" in first 50 words
  const cleaned = normalizeText(trimmed).replace(/^#+\s+/, ''); // remove initial heading markers if any
  const tokens = cleaned.split(' ').filter(Boolean);
  const first50 = tokens.slice(0, 50);
  const first4 = first50.slice(0, 4).map(w => w.replace(/[^A-Za-z]/g, '').toLowerCase());
  const startsWithIntroWords = first4.join(' ') === ['introduction','to','the','text'].join(' ');
  return !startsWithIntroWords;
}

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let kept = 0;

for (const file of files) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');
  const { yaml, body } = splitFrontMatter(content);
  if (!yaml) continue; // skip files without YAML

  if (shouldTruncate(body)) {
    fs.writeFileSync(p, yaml, 'utf8');
    modified++;
  } else {
    kept++;
  }
}

console.log(`Processed ${files.length} files. Truncated: ${modified}. Kept body: ${kept}.`);
