const fs = require('fs');
const path = require('path');
const glob = require('glob');

const repoRoot = path.resolve(__dirname, '..', '..');

// Globs to scan (content, layouts, includes)
const patterns = [
  path.join(repoRoot, 'pages', '**', '*.{md,html}'),
  path.join(repoRoot, '_layouts', '**', '*.html'),
  path.join(repoRoot, '_includes', '**', '*.{html,md}'),
  path.join(repoRoot, '11ty', '_layouts', '**', '*.html'),
  path.join(repoRoot, '11ty', '_includes', '**', '*.{html,md}'),
  path.join(repoRoot, 'pages', '**', '*.{md,html}'),
];

// paths to ignore (basic)
const ignorePaths = [/node_modules/, /.git/, /_site/, /_site_11ty/, /11ty\/node_modules/];

function shouldIgnore(filePath) {
  return ignorePaths.some(rx => rx.test(filePath));
}

const includeRegex = /{%\s*include\s+([^\s'"%][^\s%]*)([^%]*?)%}/g;

let changedFiles = [];

patterns.forEach(pattern => {
  glob.sync(pattern, { nodir: true }).forEach(file => {
    if (shouldIgnore(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    // Skip files that contain raw blocks (likely examples) to avoid modifying displayed examples
    if (content.includes('{% raw %}') || content.includes('{% endraw %}')) return;

    const newContent = content.replace(includeRegex, (match, name, rest) => {
      // If name already looks quoted, skip (regex shouldn't match quoted but be defensive)
      if (/^['"].*['"]$/.test(name)) return match;
      // Surround name in single quotes; keep rest (attributes, spacing) intact
      return `{% include '${name}'${rest}%}`;
    });

    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      changedFiles.push(file);
      console.log('Quoted include in', file);
    }
  });
});

console.log('Done. Files changed:', changedFiles.length);
if (changedFiles.length) console.log(changedFiles.join('\n'));
