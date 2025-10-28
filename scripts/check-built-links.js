const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const siteDir = path.join(root, 'dist');

function listHtmlFiles(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const p = path.join(d, entry);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (p.endsWith('.html')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function resolveSitePathFromHref(href, fromFile) {
  if (!href) return null;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return null;
  if (href.includes('{') || href.includes('}')) return null; // skip template examples
  if (href.startsWith('//')) return null; // protocol-relative external
  let local;
  if (href.startsWith('/')) {
    local = path.join(siteDir, href);
  } else {
    const base = path.dirname(fromFile);
    local = path.resolve(base, href);
  }
  try {
    const stat = fs.existsSync(local) ? fs.statSync(local) : null;
    if (stat && stat.isDirectory()) return path.join(local, 'index.html');
    if (!fs.existsSync(local)) {
      const tryIndex = path.join(local, 'index.html');
      if (fs.existsSync(tryIndex)) return tryIndex;
      const tryHtml = local.endsWith('.html') ? local : `${local}.html`;
      if (fs.existsSync(tryHtml)) return tryHtml;
    }
  } catch {}
  return local;
}

function isExternal(href) {
  return /^https?:\/\//i.test(href) || href.startsWith('//');
}

function parseHrefs(html) {
  const out = [];
  const re = /<a\b[^>]*href=("|')([^"']+)(\1)[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[2]);
  }
  return out;
}

if (!fs.existsSync(siteDir)) {
  console.error(`Build directory not found: ${siteDir}\nRun the site build first (npm run build).`);
  process.exit(2);
}

const files = listHtmlFiles(siteDir);
let issues = [];
let totalHrefs = 0;

for (const file of files) {
  const html = readFileSafe(file);
  const hrefs = parseHrefs(html);
  totalHrefs += hrefs.length;
  for (const href of hrefs) {
    if (!href || href.startsWith('#')) continue; // skip empty/anchors
    if (isExternal(href)) continue; // skip external
    // normalize stripping query/hash
    const pure = href.split('#')[0].split('?')[0];
    if (!pure) continue;
    const target = resolveSitePathFromHref(pure, file);
    if (!target || !fs.existsSync(target)) {
      issues.push({ file: path.relative(root, file), href });
    }
  }
}

console.log(`Scanned ${files.length} HTML files with ${totalHrefs} links.`);
if (!issues.length) {
  console.log('No broken internal links detected in built site.');
  process.exit(0);
}

console.log(`Found ${issues.length} potential broken internal links. Sample up to 50:`);
issues.slice(0, 50).forEach(it => console.log(` - ${it.file}: ${it.href}`));

const reportPath = path.join(root, 'built-link-check-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ totalIssues: issues.length, issues }, null, 2));
console.log(`\nFull report saved to ${reportPath}`);
