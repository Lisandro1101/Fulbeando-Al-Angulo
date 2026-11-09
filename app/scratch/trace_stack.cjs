const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const containerStr = '<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">';
const containerIdx = svg.indexOf(containerStr);
const base = svg.slice(0, containerIdx);

// Trace stack of open tags
const tagRegex = /<\/?(g|svg)\b[^>]*>/g;
let m;
const stack = [];
while ((m = tagRegex.exec(base)) !== null) {
  const full = m[0];
  if (full.startsWith('</')) {
    stack.pop();
  } else if (!full.endsWith('/>')) {
    stack.push(full);
  }
}

console.log('Open tags at containerIdx:');
stack.forEach((t, i) => console.log(i, t));
