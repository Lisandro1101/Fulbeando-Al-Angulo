const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Let's see the elements that use the masks
const maskUsages = [...svg.matchAll(/mask="url\(#([^)]+)\)"/g)].map(x => x[1]);
console.log('Mask usages:', maskUsages);

// Let's find every direct child or section of the main <g transform="matrix(1, 0, 0, 1, 50, 150)">
// Let's print the structure
const startIdx = svg.indexOf('<g transform="matrix(1, 0, 0, 1, 50, 150)">');
const body = svg.slice(startIdx);

// Let's find all tags right under the root group or with mask attribute
const matchesWithMask = [...body.matchAll(/<g[^>]*mask="url\(#([^)]+)\)"[^>]*>([\s\S]*?)<\/g>/g)];
console.log('Groups with mask count:', matchesWithMask.length);
matchesWithMask.forEach((m, i) => {
  console.log(`--- Masked Group ${i} (mask: ${m[1]}) ---`);
  console.log(m[0].slice(0, 300));
});

// Let's also find elements that have <path fill="#ffffff"> or similar
const whitePaths = [...svg.matchAll(/<path[^>]*fill="#fff[^"]*"[^>]*>/gi)];
console.log('White paths in whole svg:', whitePaths.length);

// Let's see all images and their dimensions/positions in <defs> or <body>
const images = [...svg.matchAll(/<image[^>]*>/g)];
console.log('Total images in SVG:', images.length);
images.forEach((img, i) => {
  console.log(`Image ${i}:`, img[0].slice(0, 120));
});
