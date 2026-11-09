const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const firstLetterIdx = svg.indexOf('<g fill="#ffffff" fill-opacity="1">');
const graphicsPart = svg.slice(0, firstLetterIdx);

// Let's create the replacement text for FULBEAND:
// The original letters start at X ~ 4, baseline Y = 57.93, height ~ 39, width ~ 226.
// We can use a <g fill="#ffffff"> with an italic, bold font:
// Or textLength to make it fit seamlessly in the exact width 225.
const newLetters = `
  <g fill="#ffffff" fill-opacity="1">
    <text
      x="4"
      y="57.93"
      fill="#ffffff"
      font-family="'Outfit', 'Montserrat', 'Impact', 'Arial Black', system-ui, sans-serif"
      font-size="43"
      font-weight="900"
      font-style="italic"
      letter-spacing="0.5px"
      textLength="224"
      lengthAdjust="spacingAndGlyphs"
    >FULBEAND</text>
  </g>
</g></g></g></g></g></svg>
`;

const newSvg = graphicsPart + newLetters;

fs.writeFileSync('app/scratch/test_integrated_logo.svg', newSvg);
console.log('Saved app/scratch/test_integrated_logo.svg, size:', newSvg.length);
