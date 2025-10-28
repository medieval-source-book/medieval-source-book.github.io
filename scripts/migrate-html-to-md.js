const fs = require('fs');
const path = require('path');

// Directory paths
const htmlDir = path.join(__dirname, '../html');
const textsDir = path.join(__dirname, '../texts');

// Get all HTML files
const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

console.log(`Found ${htmlFiles.length} HTML files to process`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

htmlFiles.forEach(htmlFile => {
    try {
        const baseName = path.basename(htmlFile, '.html');
        const mdFile = path.join(textsDir, `${baseName}.md`);
        
        // Check if corresponding .md file exists
        if (!fs.existsSync(mdFile)) {
            console.log(`⚠️  Skipping ${htmlFile} - no corresponding .md file found`);
            skipCount++;
            return;
        }
        
        // Read HTML file
        const htmlPath = path.join(htmlDir, htmlFile);
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Extract content from <h2>Introduction to the Text</h2> or <h1>Introduction to the Text</h1> to </body>
        let startMarker = '<h2>Introduction to the Text</h2>';
        const endMarker = '</body>';
        
        let startIndex = htmlContent.indexOf(startMarker);
        
        // Try h1 if h2 not found
        if (startIndex === -1) {
            startMarker = '<h1>Introduction to the Text</h1>';
            startIndex = htmlContent.indexOf(startMarker);
        }
        
        if (startIndex === -1) {
            console.log(`⚠️  Skipping ${htmlFile} - no "Introduction to the Text" section found`);
            skipCount++;
            return;
        }
        
        const endIndex = htmlContent.indexOf(endMarker, startIndex);
        if (endIndex === -1) {
            console.log(`⚠️  Skipping ${htmlFile} - no </body> tag found`);
            skipCount++;
            return;
        }
        
        // Extract the content
        const extractedContent = htmlContent.substring(startIndex, endIndex).trim();
        
        // Read existing .md file
        const mdContent = fs.readFileSync(mdFile, 'utf8');
        
        // Find the end of YAML front matter (handles trailing spaces)
        const yamlMatch = mdContent.match(/^---\n[\s\S]*?\n---\s*\n/);
        if (!yamlMatch) {
            console.log(`⚠️  Skipping ${htmlFile} - no valid YAML front matter found in .md file`);
            skipCount++;
            return;
        }
        
        const yamlEnd = yamlMatch[0].length;
        const yamlFrontMatter = mdContent.substring(0, yamlEnd);
        
        // Create new content: YAML + extracted HTML content
        const newMdContent = yamlFrontMatter + '\n' + extractedContent + '\n';
        
        // Write back to .md file
        fs.writeFileSync(mdFile, newMdContent, 'utf8');
        
        console.log(`✅ Processed ${htmlFile} -> ${baseName}.md`);
        successCount++;
        
    } catch (error) {
        console.error(`❌ Error processing ${htmlFile}:`, error.message);
        errorCount++;
    }
});

console.log('\n=== Migration Complete ===');
console.log(`✅ Successfully processed: ${successCount}`);
console.log(`⚠️  Skipped: ${skipCount}`);
console.log(`❌ Errors: ${errorCount}`);
