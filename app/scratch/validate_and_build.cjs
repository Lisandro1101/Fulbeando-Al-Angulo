const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const containerStr = '<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">';
const containerIdx = svg.indexOf(containerStr);
const base = svg.slice(0, containerIdx);

const newContent = `
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
</g></g></svg>
`;

const finalSvg = base + newContent;

// Let's verify XML tag balance:
const tagRegex = /<\/?(g|svg|path|rect|image|defs|filter|feColorMatrix|clipPath|mask|text)\b[^>]*>/g;
let m;
const stack = [];
let valid = true;
while ((m = tagRegex.exec(finalSvg)) !== null) {
  const str = m[0];
  const tag = m[1];
  if (str.startsWith('</')) {
    const last = stack.pop();
    if (last !== tag) {
      console.error(`Mismatch: expected </${last}> but got </${tag}>`);
      valid = false;
      break;
    }
  } else if (!str.endsWith('/>')) {
    stack.push(tag);
  }
}

if (valid && stack.length === 0) {
  console.log('✅ XML is 100% BALANCED and VALID!');
  fs.writeFileSync('app/scratch/test_integrated_logo.svg', finalSvg);
} else {
  console.log('❌ XML NOT balanced! Remaining in stack:', stack);
}
