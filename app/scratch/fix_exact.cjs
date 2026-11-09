const fs = require('fs');

const svg = fs.readFileSync('app/scratch/test_integrated_logo.svg', 'utf8');

// Replace the end with exactly </g></g></g></g></svg>
const cleanSvg = svg.replace(/<\/g>+\s*<\/svg>\s*$/, '</g></g></g></g></svg>');

fs.writeFileSync('app/scratch/test_integrated_logo.svg', cleanSvg);
console.log('Cleaned closing tags to exactly 4 </g> and 1 </svg>');
