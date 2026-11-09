const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Find definitions of the clipPaths around firstLetterIdx
const cpIds = ['fb9a7894cf', 'f7913631a8', '09aa7a9cc9', 'ee39569f90'];
cpIds.forEach(id => {
  const match = svg.match(new RegExp(`<clipPath id="${id}"[^>]*>[\\s\\S]*?<\\/clipPath>`));
  console.log(`clipPath ${id}:`, match ? match[0] : 'not found');
});

// Let's see: in the original SVG, each letter had its OWN clip-path!
// Look at Letter 1: <g clip-path="..."><g fill="#ffffff"...
// Let's print the 200 characters before each of the 7 letters in the original SVG:
const regex = /<g fill="#ffffff" fill-opacity="1">/g;
let m;
let i = 0;
while ((m = regex.exec(svg)) !== null) {
  i++;
  console.log(`Letter ${i} index: ${m.index}, 120 chars before:`);
  console.log(svg.slice(Math.max(0, m.index - 120), m.index));
}
