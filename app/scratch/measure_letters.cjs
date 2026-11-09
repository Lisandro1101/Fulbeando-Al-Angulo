const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// The letters are inside:
// <g fill="#ffffff" fill-opacity="1"><g transform="translate(X, 57.933045)"><g><path d="..."/></g></g></g>
const letterRegex = /<g fill="#ffffff" fill-opacity="1"><g transform="translate\(([^,]+),\s*([^)]+)\)"><g><path d="([^"]+)"/g;
let m;
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

while ((m = letterRegex.exec(svg)) !== null) {
  const transX = parseFloat(m[1]);
  const transY = parseFloat(m[2]);
  const d = m[3];
  const nums = d.match(/-?[\d\.]+/g).map(Number);
  for (let i = 0; i < nums.length; i += 2) {
    const x = transX + nums[i];
    const y = transY + nums[i+1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
}

console.log('Original Letters Bounding Box (in local coordinates):');
console.log({ minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY });
