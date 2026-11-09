const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// The main group is: <g transform="matrix(1, 0, 0, 1, 50, 150)">
// Let's see what children it has
const startIdx = svg.indexOf('<g transform="matrix(1, 0, 0, 1, 50, 150)">');
const body = svg.slice(startIdx);

console.log('Total length of body:', body.length);

// Let's find top-level elements or groups inside <g transform="...">
// We can use an XML parser or regex to inspect the structure
const groupRegex = /<g\b[^>]*>/g;
let m;
const groups = [];
while ((m = groupRegex.exec(body)) !== null) {
  groups.push(m[0]);
}
console.log('Total <g> tags:', groups.length);
console.log('First 15 <g> tags:\n', groups.slice(0, 15).join('\n'));

// Let's look for masks and images
const masks = [...svg.matchAll(/<mask\b[^>]*id="([^"]+)"[^>]*>/g)].map(x => x[1]);
console.log('Mask IDs:', masks);

const clipPaths = [...svg.matchAll(/<clipPath\b[^>]*id="([^"]+)"[^>]*>/g)].map(x => x[1]);
console.log('ClipPath count:', clipPaths.length);

// Let's check fills of all paths
const pathsWithFill = [...body.matchAll(/<path\b([^>]*)\/?>/g)].map(x => x[1]);
const fills = {};
pathsWithFill.forEach(p => {
  const fillMatch = p.match(/fill="([^"]+)"/);
  const f = fillMatch ? fillMatch[1] : 'none';
  fills[f] = (fills[f] || 0) + 1;
});
console.log('Fills count in body paths:', fills);
