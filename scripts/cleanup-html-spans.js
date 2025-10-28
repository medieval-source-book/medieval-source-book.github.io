const fs = require('fs');
const path = require('path');

// Directory path
const textsDir = path.join(__dirname, '../texts');

// Get all .md files
const mdFiles = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));

console.log(`Found ${mdFiles.length} markdown files to process`);

let filesChanged = 0;
let totalReplacements = 0;

mdFiles.forEach(mdFile => {
    try {
        const mdPath = path.join(textsDir, mdFile);
        let content = fs.readFileSync(mdPath, 'utf8');
        let originalContent = content;
        let fileReplacements = 0;
        
        // Replace <span> tags containing 1-4 words with <em>
        // This regex matches <span>...</span> or <span ...>...</span> where content is 1-4 words
        // A word is defined as non-whitespace characters
        const spanRegex = /<span[^>]*>\s*(\S+(?:\s+\S+){0,3})\s*<\/span>/gi;
        
        content = content.replace(spanRegex, (match, innerText) => {
            // Count words in the matched content
            const words = innerText.trim().split(/\s+/);
            if (words.length >= 1 && words.length <= 4) {
                fileReplacements++;
                return `<em>${innerText}</em>`;
            }
            // If more than 4 words, keep original
            return match;
        });
        
        // Only write if changes were made
        if (content !== originalContent) {
            fs.writeFileSync(mdPath, content, 'utf8');
            console.log(`✅ ${mdFile}: Replaced ${fileReplacements} span tags with em tags`);
            filesChanged++;
            totalReplacements += fileReplacements;
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${mdFile}:`, error.message);
    }
});

console.log('\n=== Cleanup Complete ===');
console.log(`📝 Files modified: ${filesChanged}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log(`✓ Files unchanged: ${mdFiles.length - filesChanged}`);
