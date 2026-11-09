const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Find the index of the first letter group:
const firstLetterIdx = svg.indexOf('<g fill="#ffffff" fill-opacity="1">');
console.log('First letter index:', firstLetterIdx);

// The graphic elements (dots, goalposts, flaming ball) are EVERYTHING before firstLetterIdx!
const graphicsPart = svg.slice(0, firstLetterIdx);
console.log('Graphics part length:', graphicsPart.length);

// Let's see how the root group closes:
// In the original, after letter 7 (206.031374), it ends with:
// </g></g></g></g></g></svg>
// Let's see what closing tags are needed.
const lastLetterIdx = svg.indexOf('206.031374');
const closingTags = svg.slice(svg.indexOf('</g></g></g>', lastLetterIdx) + 12);
console.log('Closing tags:', closingTags);
