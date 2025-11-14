const fs = require('fs');
const path = require('path');

const textsDir = path.join(__dirname, '..', 'texts');
const assetsDir = path.join(__dirname, '..', 'assets', 'pdf');
const outputDir = path.join(__dirname, '..', 'pdf-extract');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(textsDir).filter(f => f.endsWith('.md'));
let foundCount = 0;
let copiedCount = 0;

console.log(`Scanning ${files.length} markdown files in texts/...`);

files.forEach(file => {
  const filePath = path.join(textsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract YAML front matter
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  
  if (!yamlMatch) return;
  
  const [, frontMatter, bodyContent] = yamlMatch;
  
  // Check if body is empty (only whitespace)
  if (bodyContent.trim().length > 0) return;
  
  // Look for pdf field in YAML
  const pdfMatch = frontMatter.match(/^pdf:\s*["']?(.+?)["']?\s*$/m);
  
  if (!pdfMatch) return;
  
  const pdfPath = pdfMatch[1].trim();
  foundCount++;
  
  console.log(`\n📄 ${file}`);
  console.log(`   PDF field: ${pdfPath}`);
  
  // Check if PDF exists
  // Handle both absolute paths like /assets/pdf/... and relative paths
  let pdfFilename;
  if (pdfPath.startsWith('/assets/pdf/')) {
    pdfFilename = pdfPath.replace('/assets/pdf/', '');
  } else if (pdfPath.startsWith('assets/pdf/')) {
    pdfFilename = pdfPath.replace('assets/pdf/', '');
  } else {
    pdfFilename = path.basename(pdfPath);
  }
  
  const sourcePdfPath = path.join(assetsDir, pdfFilename);
  
  if (fs.existsSync(sourcePdfPath)) {
    const destPdfPath = path.join(outputDir, pdfFilename);
    fs.copyFileSync(sourcePdfPath, destPdfPath);
    console.log(`   ✅ Copied to pdf-extract/${pdfFilename}`);
    copiedCount++;
  } else {
    console.log(`   ❌ PDF not found at: ${sourcePdfPath}`);
  }
});

console.log(`\n=== Summary ===`);
console.log(`Empty text files with PDF field: ${foundCount}`);
console.log(`PDFs successfully copied: ${copiedCount}`);
console.log(`PDFs not found: ${foundCount - copiedCount}`);
