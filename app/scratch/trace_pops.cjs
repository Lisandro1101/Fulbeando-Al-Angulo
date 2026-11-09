const fs = require('fs');

const svg = fs.readFileSync('app/scratch/test_integrated_logo.svg', 'utf8');

let line = 1, col = 0;
const stack = [];

for (let i = 0; i < svg.length; i++) {
  col++;
  if (svg[i] === '\n') {
    line++;
    col = 0;
  }
  if (svg[i] === '<') {
    const end = svg.indexOf('>', i);
    const tagContent = svg.slice(i + 1, end).trim();
    if (tagContent.startsWith('?')) {
    } else if (tagContent.startsWith('!--')) {
    } else if (tagContent.startsWith('/')) {
      const tagName = tagContent.slice(1).split(/\s+/)[0];
      const popped = stack.pop();
      console.log(`Closing </${tagName}> at line ${line}, popped: <${popped ? popped.tag : 'EMPTY'}>. Remaining stack depth: ${stack.length}`);
    } else if (!tagContent.endsWith('/')) {
      const tagName = tagContent.split(/\s+/)[0];
      stack.push({ tag: tagName, line, col });
    }
    i = end;
  }
}
