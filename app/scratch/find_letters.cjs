const fs = require('fs');

const svg = fs.readFileSync('app/public/logo.original.backup.svg', 'utf8');

// Find all occurrences of fill="#ffffff"
const textGroups = [];
const regex = /<g fill="#ffffff" fill-opacity="1">[\s\S]*?<\/g>\s*<\/g>\s*<\/g>/g;
let match;
while ((match = regex.exec(svg)) !== null) {
  textGroups.push({
    start: match.index,
    end: match.index + match[0].length,
    snippet: match[0]
  });
}

console.log('Total fill="#ffffff" letter groups:', textGroups.length);
textGroups.forEach((tg, i) => {
  const trans = tg.snippet.match(/transform="translate\(([^)]+)\)"/);
  console.log(`Letter ${i}: transform=${trans ? trans[1] : 'none'}, length=${tg.snippet.length}`);
});

// Also check if there are other text groups like "EL POTRERO DIGITAL"
// What color is "EL POTRERO DIGITAL"? Let's search for fills or transforms
const startTextIdx = textGroups.length > 0 ? textGroups[0].start : -1;
console.log('First letter group starts at index:', startTextIdx);

// Let's see what is right BEFORE the first letter group and right AFTER the last letter group
if (startTextIdx !== -1) {
  console.log('\n--- 500 chars BEFORE first letter group: ---');
  console.log(svg.slice(startTextIdx - 500, startTextIdx));

  const endTextIdx = textGroups[textGroups.length - 1].end;
  console.log('\n--- 500 chars AFTER last letter group: ---');
  console.log(svg.slice(endTextIdx, endTextIdx + 500));
}
