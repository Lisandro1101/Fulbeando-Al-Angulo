const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

const containerStr = '<g clip-path="url(#fb9a7894cf)"><g><g clip-path="url(#f7913631a8)">';
const containerIdx = svg.indexOf(containerStr);
const base = svg.slice(0, containerIdx);

const baseOpens = (base.match(/<g\b[^>]*>/g) || []).length;
const baseCloses = (base.match(/<\/g>/g) || []).length;
console.log('At containerIdx: baseOpens=', baseOpens, 'baseCloses=', baseCloses);
console.log('Unclosed tags before container:', baseOpens - baseCloses);

// In original SVG, after containerStr:
// How many opens and closes are in the whole file?
const totalOpens = (svg.match(/<g\b[^>]*>/g) || []).length;
const totalCloses = (svg.match(/<\/g>/g) || []).length;
console.log('Total in original: opens=', totalOpens, 'closes=', totalCloses);
