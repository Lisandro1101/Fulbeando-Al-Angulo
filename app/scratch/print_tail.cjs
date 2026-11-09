const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');
const firstLetterIdx = svg.indexOf('<g fill="#ffffff" fill-opacity="1">');
const tail = svg.slice(firstLetterIdx);

// Replace all letter path bodies with just the tags
console.log(tail.replace(/d="[^"]+"/g, 'd="..."'));
