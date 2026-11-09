const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Find the start of the letters container:
// Right before letter 1, there was:
// <g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">
const containerStr = '<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">';
const containerIdx = svg.indexOf(containerStr);
console.log('containerIdx:', containerIdx);

// Everything before containerStr:
const baseGraphics = svg.slice(0, containerIdx);

// Inside <g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">,
// the full bounding box is X: 0 to 232, Y: 0 to 75.
// Let's place FULBEAND using font styling matching the original logo!
const newLettersBlock = `
<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">
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
      letter-spacing="1px"
      textLength="222"
      lengthAdjust="spacingAndGlyphs"
    >FULBEAND</text>
  </g>
</g></g></g></g></g></g></g></g></svg>
`;

const finalSvg = baseGraphics + newLettersBlock;
fs.writeFileSync('app/scratch/test_integrated_logo.svg', finalSvg);
console.log('Written test_integrated_logo.svg! Length:', finalSvg.length);
