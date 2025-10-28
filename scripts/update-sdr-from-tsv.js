const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');
const tsvPath = path.join(root, 'sdr.tsv');

if (!fs.existsSync(tsvPath)) {
  console.error(`sdr.tsv not found at ${tsvPath}`);
  process.exit(2);
}

function readTsv(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /\bfile\b\s+\bsdr\b/i.test(line)) continue; // skip header
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const key = parts[0].trim();
    const val = parts[1].trim();
    if (!key) continue;
    out.push([key, val]);
  }
  return out;
}

function listTextFiles(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
}

function splitFrontMatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\s*\n/);
  if (!m) return null;
  return { block: m[0], yaml: m[1], start: m.index, end: m.index + m[0].length };
}

function updateYamlSdr(yamlStr, newUrl) {
  const lines = yamlStr.split(/\n/);
  let sdrIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*sdr\s*:/.test(lines[i])) { sdrIndex = i; break; }
  }

  if (newUrl) {
    // ensure we have sdr line with newUrl
    const newLine = `sdr: ${newUrl}`;
    if (sdrIndex >= 0) {
      lines[sdrIndex] = newLine;
    } else {
      // Insert near pdf/tei/image for readability
      let insertAt = -1;
      const pdfIdx = lines.findIndex(l => /^\s*pdf\s*:/.test(l));
      const teiIdx = lines.findIndex(l => /^\s*tei\s*:/.test(l));
      const imgIdx = lines.findIndex(l => /^\s*image\s*:/.test(l));
      // Preference: after pdf, else after tei, else before image, else at end
      if (pdfIdx >= 0) insertAt = pdfIdx + 1;
      else if (teiIdx >= 0) insertAt = teiIdx + 1;
      else if (imgIdx >= 0) insertAt = imgIdx;
      else insertAt = lines.length;
      lines.splice(insertAt, 0, newLine);
    }
  } else {
    // Remove sdr entirely (if present)
    if (sdrIndex >= 0) {
      lines.splice(sdrIndex, 1);
    }
  }

  return lines.join('\n');
}

const tsv = readTsv(tsvPath);
const files = listTextFiles(textsDir);
const stems = files.map(f => f.replace(/\.md$/, ''));
const stemToPath = new Map(stems.map((stem, i) => [stem, path.join(textsDir, files[i]) ]));

let exactMatches = 0;
let suffixMatches = 0;
let updated = 0;
let inserted = 0;
let removed = 0;
let missing = [];

function findFileForKey(key) {
  // Handle common alias/mismatch cases
  const aliasMap = new Map([
    ['bracciolini_conclusio', 'bracciolini_conclusion'],
    ['rabanus_maurus_honour_holy_cross', 'rabanus_maurus_honor_holy_cross'],
    ['li_qingzhao_often_call', 'li_qingzhao_often_recall'],
    ['inca_garcilaso_noble_lady', 'noble_lady'],
  ]);
  const aliased = aliasMap.get(key) || key;
  // exact match first
  if (stemToPath.has(aliased)) return { type: 'exact', p: stemToPath.get(aliased), stem: aliased };
  // suffix match: any stem that ends with _<key>
  const candidates = stems.filter(s => s.endsWith('_' + aliased));
  if (candidates.length === 1) return { type: 'suffix', p: stemToPath.get(candidates[0]), stem: candidates[0] };
  return null;
}

for (const [key, url] of tsv) {
  const match = findFileForKey(key);
  if (!match) {
    missing.push(key);
    continue;
  }
  if (match.type === 'exact') exactMatches++; else suffixMatches++;

  const content = fs.readFileSync(match.p, 'utf8');
  const fm = splitFrontMatter(content);
  if (!fm) { missing.push(key); continue; }

  const hadSdr = /^\s*sdr\s*:/m.test(fm.yaml);
  const newYaml = updateYamlSdr(fm.yaml, url || '');
  if (newYaml !== fm.yaml) {
    const newContent = `---\n${newYaml}\n---\n` + content.slice(fm.end);
    fs.writeFileSync(match.p, newContent, 'utf8');
    if (url) {
      if (hadSdr) updated++; else inserted++;
    } else {
      if (hadSdr) removed++;
    }
  }
}

console.log(`TSV entries: ${tsv.length}`);
console.log(`Matched files — exact: ${exactMatches}, suffix: ${suffixMatches}, missing keys: ${missing.length}`);
console.log(`Changes — updated: ${updated}, inserted: ${inserted}, removed: ${removed}`);
if (missing.length) {
  console.log('Missing keys (no file matched):');
  for (const k of missing.slice(0, 50)) console.log(' -', k);
  if (missing.length > 50) console.log(` ...and ${missing.length - 50} more`);
}
