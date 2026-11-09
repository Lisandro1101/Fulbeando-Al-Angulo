const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const regex = /<g fill="#ffffff" fill-opacity="1">[\s\S]*?<\/g>\s*<\/g>\s*<\/g>/g;
let match;
let count = 0;
while ((match = regex.exec(svg)) !== null) {
  count++;
  console.log(`=== LETTER ${count} ===`);
  console.log(match[0]);
}

const lastMatchEnd = regex.lastIndex;
console.log('--- After last letter: ---');
console.log(svg.slice(lastMatchEnd, lastMatchEnd + 500));
