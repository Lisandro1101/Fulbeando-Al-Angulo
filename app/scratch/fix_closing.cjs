const fs = require('fs');

const svg = fs.readFileSync('app/scratch/test_integrated_logo.svg', 'utf8');

// Replace the end </g></g></svg> with </g></g></g></svg>
const fixedSvg = svg.replace(/<\/g><\/g><\/svg>\s*$/, '</g></g></g></svg>');

fs.writeFileSync('app/scratch/test_integrated_logo.svg', fixedSvg);
console.log('Fixed SVG closing tag!');
