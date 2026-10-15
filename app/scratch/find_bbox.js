import fs from 'fs';
const content = fs.readFileSync('public/logo.svg', 'utf8');

const defsEnd = content.indexOf('</defs>');
const body = content.slice(defsEnd);

// Find all transforms in body
const transforms = [...body.matchAll(/transform="([^"]+)"/g)].map(m => m[1]);
console.log('Transforms in body:', transforms);

// Let's compute actual coordinates of paths in body
// Some paths are nested in transforms
// Let's parse the structure of body
let currentX = 0, currentY = 0;
// We can check all paths with their absolute positions
const pathMatches = [...body.matchAll(/<g transform="translate\(([^,]+),\s*([^)]+)\)">.*?<path d="([^"]+)"/gs)];
console.log('Translate + path matches:', pathMatches.length);
pathMatches.forEach(m => {
  const tx = parseFloat(m[1]);
  const ty = parseFloat(m[2]);
  const d = m[3];
  const nums = d.match(/-?[\d\.]+/g) || [];
  let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i+1]);
    if (!isNaN(x)) {
      pMinX = Math.min(pMinX, x);
      pMaxX = Math.max(pMaxX, x);
    }
    if (!isNaN(y)) {
      pMinY = Math.min(pMinY, y);
      pMaxY = Math.max(pMaxY, y);
    }
  }
  console.log(`Path at translate(${tx}, ${ty}): X[${tx + pMinX}, ${tx + pMaxX}], Y[${ty + pMinY}, ${ty + pMaxY}]`);
});
