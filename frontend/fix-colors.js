const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('C:/Users/ritik/OneDrive/Desktop/EVALI-X-master/frontend/src');
let changedFiles = 0;

const replacements = [
  { regex: /\bbg-white\b/g, replacement: 'bg-surface' },
  { regex: /\btext-gray-900\b/g, replacement: 'text-text' },
  { regex: /\btext-gray-800\b/g, replacement: 'text-text' },
  { regex: /\btext-gray-700\b/g, replacement: 'text-text-muted' },
  { regex: /\btext-gray-600\b/g, replacement: 'text-text-muted' },
  { regex: /\btext-gray-500\b/g, replacement: 'text-text-muted' },
  { regex: /\bbg-gray-50\b/g, replacement: 'bg-surface-muted' },
  { regex: /\bborder-gray-100\b/g, replacement: 'border-border' },
  { regex: /\bborder-gray-200\b/g, replacement: 'border-border' },
  { regex: /\bborder-gray-300\b/g, replacement: 'border-border' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replacement);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Updated:', file);
  }
});

console.log('Total files updated:', changedFiles);
