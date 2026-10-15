import fs from 'fs';
const content = fs.readFileSync('public/logo.svg', 'utf8');

// Find all tags outside defs
const defsEnd = content.indexOf('</defs>');
const body = content.slice(defsEnd);
console.log('Body length:', body.length);
console.log('Body snippet (first 1000):', body.slice(0, 1000));
console.log('Body snippet (last 1000):', body.slice(-1000));
