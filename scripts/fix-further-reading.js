const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const textsDir = path.join(root, 'texts');

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let modified = 0;

// Check if a line has a comma after the first word (bibliographic entry)
function hasCommaAfterFirstWord(text) {
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  const words = stripped.split(/\s+/);
  if (words.length < 2) return false;
  const firstWord = words[0];
  return firstWord.endsWith(',');
}

// Split text that contains both annotation and bibliographic entry
// Returns array of segments: { type: 'annotation' | 'biblio', text: '...' }
function splitMixedContent(text) {
  // Look for pattern: "annotation text. AuthorLast, AuthorFirst..."
  // The bibliographic entry typically starts with a capital letter followed by comma after first word
  const stripped = text.replace(/<[^>]+>/g, '');
  
  // Find potential split point: period/sentence end followed by capital letter and comma pattern
  const splitRegex = /\.\s+([A-Z][a-z]+,\s)/;
  const match = stripped.match(splitRegex);
  
  if (match && match.index !== undefined) {
    const splitPoint = match.index + 1; // after the period
    const beforeText = text.substring(0, splitPoint).trim();
    const afterText = text.substring(splitPoint).trim();
    
    if (hasCommaAfterFirstWord(afterText)) {
      return [
        { type: 'annotation', text: beforeText },
        { type: 'biblio', text: afterText }
      ];
    }
  }
  
  // No split needed
  return [{ type: hasCommaAfterFirstWord(text) ? 'biblio' : 'annotation', text }];
}

function processFurtherReading(section) {
  // Extract all content between <h2>Further Reading</h2> and next <h1> or <h2> or end
  const lines = section.split('\n');
  const output = [];
  let inUl = false;
  let changed = false;

  for (let line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      output.push(line);
      continue;
    }

    // Skip the h2 header itself
    if (trimmed.match(/<h2>/i)) {
      if (inUl) {
        output.push('</ul>');
        inUl = false;
      }
      output.push(line);
      continue;
    }

    // Check if line is already wrapped in <p>
    if (trimmed.match(/^<p\b/i)) {
      if (inUl) {
        output.push('</ul>');
        inUl = false;
        changed = true;
      }
      output.push(line);
      continue;
    }

    // Check if line is <ul> or </ul> or orphaned </li>
    if (trimmed.match(/^<\/?ul/i) || trimmed.match(/^<\/li>\s*<\/ul>/i) || trimmed.match(/^<\/li>/i)) {
      // Skip these, we'll regenerate them
      changed = true;
      continue;
    }

    // Check if line is <li>
    if (trimmed.match(/^<li\b/i)) {
      // Extract content, handling both <li>content</li> and <li>content
      let content = trimmed.replace(/^<li[^>]*>/i, '');
      content = content.replace(/<\/li>.*$/i, '').trim();
      
      // Check if content contains both annotation and bibliography
      const segments = splitMixedContent(content);
      
      for (const seg of segments) {
        if (seg.type === 'biblio') {
          // This is a bibliographic entry, should be <p>
          if (inUl) {
            output.push('</ul>');
            inUl = false;
          }
          output.push(`<p>${seg.text}</p>`);
          changed = true;
        } else {
          // This is an annotation, should be <li>
          if (!inUl) {
            output.push('<ul>');
            inUl = true;
          }
          output.push(`<li>${seg.text}</li>`);
          if (segments.length === 1 && hasCommaAfterFirstWord(content)) {
            // Only mark as changed if we're actually changing the structure
          } else {
            changed = true;
          }
        }
      }
      continue;
    }

    // Plain text line (shouldn't happen if content was already in tags, but handle it)
    if (hasCommaAfterFirstWord(trimmed)) {
      // Bibliographic entry
      if (inUl) {
        output.push('</ul>');
        inUl = false;
      }
      output.push(`<p>${trimmed}</p>`);
      changed = true;
    } else {
      // Annotation
      if (!inUl) {
        output.push('<ul>');
        inUl = true;
      }
      output.push(`<li>${trimmed}</li>`);
      changed = true;
    }
  }

  if (inUl) {
    output.push('</ul>');
  }

  return { output: output.join('\n'), changed };
}

for (const file of files) {
  const p = path.join(textsDir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Find Further Reading section
  const furtherReadingRegex = /(<h2>Further Reading<\/h2>)([\s\S]*?)(?=<h[12]|$)/i;
  const match = content.match(furtherReadingRegex);

  if (!match) continue;

  const header = match[1];
  const sectionContent = match[2];
  const result = processFurtherReading(header + '\n' + sectionContent);

  if (result.changed) {
    const newContent = content.replace(furtherReadingRegex, result.output);
    fs.writeFileSync(p, newContent, 'utf8');
    modified++;
  }
}

console.log(`Processed ${files.length} files. Modified ${modified}.`);
