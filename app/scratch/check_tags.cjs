const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');
const firstLetterIdx = svg.indexOf('<g fill="#ffffff" fill-opacity="1">');

// Everything from firstLetterIdx to the end:
const tail = svg.slice(firstLetterIdx);

console.log('Tail length:', tail.length);
// Count opens and closes in tail
const opens = (tail.match(/<g\b[^>]*>/g) || []).length;
const closes = (tail.match(/<\/g>/g) || []).length;
console.log('Tail opens <g>:', opens, 'Tail closes </g>:', closes);

// Notice: In tail, there were 7 letter groups.
// Each letter group was:
// <g fill="#ffffff" fill-opacity="1"><g transform="translate(...)"><g><path d="..."/></g></g></g> -> 3 opens, 3 closes!
// And after letter 7, there were 5 closes: </g></g></g></g></g></svg>
// In test_integrated_logo.svg, we added:
// <g fill="#ffffff" fill-opacity="1"><text ...>FULBEAND</text></g> -> 1 open, 1 close.
// And then </g></g></g></g></g></svg>
// BUT wait, why did it have opens 44 and closes 42?
// Let's count in the whole original SVG:
const origOpens = (svg.match(/<g\b[^>]*>/g) || []).length;
const origCloses = (svg.match(/<\/g>/g) || []).length;
console.log('Original opens <g>:', origOpens, 'Original closes </g>:', origCloses);
