const fs = require('fs');

const logoSvg = fs.readFileSync('app/public/logo.svg', 'utf8');

// Find all tags in logoSvg
const tags = [...logoSvg.matchAll(/<([a-zA-Z0-9:]+)[^>]*>/g)].map(m => m[1]);
const tagCounts = {};
tags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
console.log('Tag counts:', tagCounts);

// Let's inspect the group structure after <defs>
const afterDefs = logoSvg.slice(logoSvg.indexOf('</defs>'));
console.log('After defs length:', afterDefs.length);
console.log('Snippet after defs:', afterDefs.slice(0, 1500));
