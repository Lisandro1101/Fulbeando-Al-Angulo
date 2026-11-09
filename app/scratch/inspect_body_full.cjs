const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Let's see what else is in <g transform="matrix(1, 0, 0, 1, 50, 150)">
const startIdx = svg.indexOf('<g transform="matrix(1, 0, 0, 1, 50, 150)">');
const body = svg.slice(startIdx);

// Let's split body into its direct parts
console.log('Body starts with:');
console.log(body.slice(0, 1000));

console.log('\n--- Searching for any paths or other images in body ---');
// Let's find all tags right inside body
const parts = [];
let idx = 0;
// Find all <path, <image, <use, <g, <rect
const tagRegex = /<(path|image|rect|g|use)\b/g;
let match;
let pathCount = 0;
let gCount = 0;
while ((match = tagRegex.exec(body)) !== null) {
  if (match[1] === 'path') pathCount++;
  if (match[1] === 'g') gCount++;
}
console.log(`pathCount: ${pathCount}, gCount: ${gCount}`);

// Let's print the last 2000 chars of body
console.log('\nLast 2000 chars of body:');
console.log(body.slice(-2000));
