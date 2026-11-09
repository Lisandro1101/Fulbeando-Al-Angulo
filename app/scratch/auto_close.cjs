const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const containerStr = '<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">';
const containerIdx = svg.indexOf(containerStr);
const base = svg.slice(0, containerIdx);

// We add:
const letters = `
<g clip-path="url(#fb9a7894cf)">
  <g fill="#ffffff" fill-opacity="1">
    <text
      x="116"
      y="57"
      text-anchor="middle"
      fill="#ffffff"
      font-family="'Impact', 'Outfit', 'Montserrat', 'Arial Black', system-ui, sans-serif"
      font-size="43"
      font-weight="900"
      font-style="italic"
      letter-spacing="0.5px"
      textLength="220"
      lengthAdjust="spacingAndGlyphs"
    >FULBEAND</text>
  </g>
</g>
`;

let content = base + letters;

// Count unclosed tags in content
const tagRegex = /<\/?(g|svg|defs|clipPath|mask|filter|feColorMatrix|text|path|rect|image)\b[^>]*>/g;
let m;
const stack = [];
while ((m = tagRegex.exec(content)) !== null) {
  const str = m[0];
  const tag = m[1];
  if (str.startsWith('</')) {
    stack.pop();
  } else if (!str.endsWith('/>')) {
    stack.push(tag);
  }
}

console.log('Unclosed tags before final close:', stack);

// Close them in reverse order
while (stack.length > 0) {
  const tag = stack.pop();
  content += `</${tag}>`;
}

fs.writeFileSync('app/scratch/test_integrated_logo.svg', content);
console.log('Saved 100% mathematically balanced SVG!');
