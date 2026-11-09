const fs = require('fs');
const path = require('path');

const logoSvg = fs.readFileSync('app/public/logo.svg', 'utf8');

// Match viewBox, width, height
console.log('--- SVG Attributes ---');
const viewBox = logoSvg.match(/viewBox="([^"]+)"/);
const width = logoSvg.match(/width="([^"]+)"/);
const height = logoSvg.match(/height="([^"]+)"/);
console.log('width:', width ? width[1] : null);
console.log('height:', height ? height[1] : null);
console.log('viewBox:', viewBox ? viewBox[1] : null);

// Ratio
if (viewBox) {
  const [minX, minY, vbW, vbH] = viewBox[1].split(' ').map(Number);
  console.log(`viewBox Dimensions: minX=${minX}, minY=${minY}, width=${vbW}, height=${vbH}`);
  console.log(`Aspect Ratio (W/H): ${(vbW / vbH).toFixed(3)} (approx ${(vbW/vbH).toFixed(1)}:1)`);
}

// Find base64 images
const base64Matches = [...logoSvg.matchAll(/xlink:href="data:image\/png;base64,([^"]+)"/g)];
console.log('Embedded base64 images count:', base64Matches.length);
if (base64Matches.length > 0) {
  const buf = Buffer.from(base64Matches[0][1], 'base64');
  fs.writeFileSync('app/scratch/extracted_logo.png', buf);
  console.log('Saved app/scratch/extracted_logo.png, size:', buf.length);
  // PNG width/height are at bytes 16-24 (IHDR)
  const imgWidth = buf.readUInt32BE(16);
  const imgHeight = buf.readUInt32BE(20);
  console.log(`Embedded PNG resolution: ${imgWidth} x ${imgHeight}`);
}

// Check paths and text
const texts = [...logoSvg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
console.log('Texts in SVG:', texts);

// Check colors (fill, stroke, stop-color)
const fills = [...logoSvg.matchAll(/fill="([^"]+)"/g)].map(m => m[1]);
const strokes = [...logoSvg.matchAll(/stroke="([^"]+)"/g)].map(m => m[1]);
const uniqueColors = [...new Set([...fills, ...strokes])];
console.log('Unique colors (fill/stroke):', uniqueColors);
