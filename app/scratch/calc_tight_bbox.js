import fs from 'fs';
const content = fs.readFileSync('public/logo.svg', 'utf8');

// The main group is: <g transform="matrix(1, 0, 0, 1, 50, 150)">
// Let's find all path and image bounding boxes inside this group
// Specifically, let's parse every number and coordinate inside that group.
const body = content.slice(content.indexOf('<g transform="matrix(1, 0, 0, 1, 50, 150)">'));

// Let's find the min and max coordinates relative to the group (50, 150)
const paths = [...body.matchAll(/d="([^"]+)"/g)].map(m => m[1]);

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

// Also check the images in defs / masks that are referenced:
// mask has clipPath id="ca46639e75": d="M 186.214844 18.429688 L 280.703125 18.429688 L 280.703125 79.351562 L 186.214844 79.351562 Z"
// So the ball/flame reaches X=295, Y=80.

// Let's parse all numbers in paths:
paths.forEach(p => {
  const nums = p.match(/-?[\d\.]+/g) || [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i+1]);
    if (!isNaN(x) && x < 500 && x > -50) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (!isNaN(y) && y < 500 && y > -50) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
});

console.log('Within group bbox:', { minX, minY, maxX, maxY });
console.log('Absolute in 384x384 (with +50, +150):', {
  absMinX: minX + 50,
  absMinY: minY + 150,
  absMaxX: maxX + 50,
  absMaxY: maxY + 150,
  width: maxX - minX,
  height: maxY - minY
});
