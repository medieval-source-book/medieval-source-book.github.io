const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

const mdFiles = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));

let issues = [];
let checked = 0;
let hrefCount = 0;

function splitFrontMatter(content) {
  const m = content.match(/^---\n[\s\S]*?\n---\s*\n/);
  if (!m) return { yaml: '', body: content };
  return { yaml: m[0], body: content.slice(m[0].length) };
}

function checkLocalPath(href) {
  // Only check /assets paths locally
  if (!href.startsWith('/assets/')) return true; // don't mark as issue
  const localPath = path.join(root, href);
  return fs.existsSync(localPath);
}

function looksSuspicious(href) {
  if (!href) return 'empty href';
  if (/\s/.test(href)) return 'contains whitespace';
  if (href.includes('..')) return 'contains ..';
  if (/^https?:\/\//i.test(href)) return null; // external ok, skip network
  if (href.startsWith('#')) return null; // in-page anchor
  if (href.startsWith('/assets/')) return null; // handled separately
  // Very short or odd relative link
  if (!href.includes('/')) return 'relative link without slash';
  return null;
}

for (const file of mdFiles) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');
  const { body } = splitFrontMatter(content);
  // Find anchor hrefs
  const anchorRegex = /<a\b[^>]*href=("|')([^"']+)(\1)[^>]*>/gi;
  let m;
  while ((m = anchorRegex.exec(body)) !== null) {
    hrefCount++;
    const href = m[2];

    const susp = looksSuspicious(href);
    if (susp) {
      issues.push({ file, href, type: susp });
    }

    if (href.startsWith('/assets/')) {
      const exists = checkLocalPath(href);
      if (!exists) {
        issues.push({ file, href, type: 'missing local asset' });
      }
    }
  }
}

console.log(`Scanned ${mdFiles.length} files, found ${hrefCount} hrefs.`);
if (!issues.length) {
  console.log('No link issues detected.');
  process.exit(0);
}

// Summarize
const byType = issues.reduce((acc, it) => {
  acc[it.type] = (acc[it.type] || 0) + 1;
  return acc;
}, {});

console.log('Issues summary:');
for (const [t, n] of Object.entries(byType)) {
  console.log(` - ${t}: ${n}`);
}

console.log('\nSample (up to 50):');
issues.slice(0, 50).forEach(it => {
  console.log(` - ${it.file}: ${it.type} -> ${it.href}`);
});

// Write full report
const reportPath = path.join(root, 'link-check-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ totalIssues: issues.length, issues }, null, 2));
console.log(`\nFull report saved to ${reportPath}`);
