const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');
const firstLetterIdx = svg.indexOf('<g fill="#ffffff" fill-opacity="1">');
const graphicsPart = svg.slice(0, firstLetterIdx);

// The exact replacement:
// In the original, the letters start at X=4, baseline Y=57.93.
// The font in the original was an athletic, geometric italic sans-serif:
// 'A': width ~ 27
// 'L': width ~ 23
// 'Á': width ~ 27
// 'N': width ~ 33
// 'G': width ~ 34
// 'U': width ~ 34
// 'L': width ~ 23
// Total width ~ 226px!
// With FULBEAND:
// F - U - L - B - E - A - N - D:
// In lengthAdjust="spacingAndGlyphs" or clean SVG text:
const replacement = `
<g fill="#ffffff" fill-opacity="1">
  <text
    x="4"
    y="57.93"
    fill="#ffffff"
    font-family="'Impact', 'Outfit', 'Montserrat', 'Arial Black', system-ui, sans-serif"
    font-size="44"
    font-weight="900"
    font-style="italic"
    textLength="224"
    lengthAdjust="spacingAndGlyphs"
  >FULBEAND</text>
</g></g><g fill="#ffffff" fill-opacity="1"><g/></g></g></g></g></g></g></svg>
`;

const finalSvg = graphicsPart + replacement;
fs.writeFileSync('app/scratch/test_integrated_logo.svg', finalSvg);
console.log('Written test_integrated_logo.svg successfully!');
