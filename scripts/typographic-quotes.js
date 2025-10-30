const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

function splitFrontMatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\s*\n/);
  if (!m) return { yaml: '', body: content, yamlBlock: '' };
  return { yaml: m[1], body: content.slice(m[0].length), yamlBlock: m[0] };
}

// Smart quotes replacement: context-aware
function replaceQuotes(text) {
  // Replace double quotes
  // Opening: after whitespace, start of string, or various punctuation
  text = text.replace(/(^|[\s\(\[\{—–-])"/gm, '$1"');
  // Closing: before whitespace, end of string, or punctuation
  text = text.replace(/"([\s\)\]\}\.,;:!?—–-]|$)/gm, '"$1');
  // Any remaining double quotes (edge cases) -> closing quote
  text = text.replace(/"/g, '"');
  
  // Replace single quotes/apostrophes
  // Apostrophes within words (e.g., it's, don't) - use right single quote
  text = text.replace(/(\w)'(\w)/g, '$1\u2019$2');
  // Opening single quote: after whitespace or start
  text = text.replace(/(^|[\s\(\[\{—–-])'/gm, '$1\u2018');
  // Closing single quote: before whitespace, punctuation, or end
  text = text.replace(/'([\s\)\]\}\.,;:!?—–-]|$)/gm, '\u2019$1');
  // Any remaining single quotes -> closing
  text = text.replace(/'/g, '\u2019');
  
  return text;
}

// Process YAML: replace quotes in string values but preserve YAML structure
function processYaml(yamlText) {
  const lines = yamlText.split('\n');
  const newLines = lines.map(line => {
    // Match key: value pattern
    const match = line.match(/^(\s*\w+:\s*)(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      // Only process if there are quotes in the value
      if (value.includes('"') || value.includes("'")) {
        value = replaceQuotes(value);
      }
      return key + value;
    }
    // For continuation lines (multi-line YAML values with leading spaces/pipes)
    if (/^\s+/.test(line) && (line.includes('"') || line.includes("'"))) {
      return replaceQuotes(line);
    }
    return line;
  });
  return newLines.join('\n');
}

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;
let totalReplacements = 0;

for (const file of files) {
  const p = path.join(textsDir, file);
  const content = fs.readFileSync(p, 'utf8');
  const { yaml, body, yamlBlock } = splitFrontMatter(content);
  
  let changed = false;
  let newYaml = yaml;
  let newBody = body;
  
  // Process YAML if it has quotes
  if (yaml && (yaml.includes('"') || yaml.includes("'"))) {
    newYaml = processYaml(yaml);
    if (newYaml !== yaml) changed = true;
  }
  
  // Process body if it has quotes
  if (body && (body.includes('"') || body.includes("'"))) {
    newBody = replaceQuotes(body);
    if (newBody !== body) changed = true;
  }
  
  if (changed) {
    const newContent = yaml ? `---\n${newYaml}\n---\n${newBody}` : newBody;
    // Count replacements
    const beforeCount = (content.match(/["']/g) || []).length;
    const afterCount = (newContent.match(/["']/g) || []).length;
    const replacements = beforeCount - afterCount;
    
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
    totalReplacements += replacements;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}. Total quote replacements: ${totalReplacements}.`);
