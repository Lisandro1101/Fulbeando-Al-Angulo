import fs from 'fs';
const content = fs.readFileSync('public/logo.svg', 'utf8');
console.log('length:', content.length);

// Find image tags or path tags
const imgMatches = content.match(/<image[^>]+>/g) || [];
console.log('Images:', imgMatches.map(img => img.slice(0, 100)));

// Find all transforms and viewBox
const viewBox = content.match(/viewBox="([^"]+)"/);
console.log('viewBox:', viewBox ? viewBox[1] : 'none');

// Find all path coordinates
const paths = content.match(/d="([^"]+)"/g) || [];
console.log('Total paths:', paths.length);
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
paths.forEach(p => {
  const nums = p.match(/-?[\d\.]+/g) || [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i+1]);
    if (!isNaN(x)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (!isNaN(y)) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
});
console.log('Bounding box from paths:', { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });

// Check what else is inside svg
const tags = [...new Set(content.match(/<[a-zA-Z]+/g) || [])];
console.log('Tags inside SVG:', tags);
