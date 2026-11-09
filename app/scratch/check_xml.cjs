const fs = require('fs');

const svg = fs.readFileSync('app/scratch/test_integrated_logo.svg', 'utf8');

// Let's check with an actual DOMParser or simple XML tokenizer
// We can use playwright or a pure JS XML checker
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
      // xml declaration
    } else if (tagContent.startsWith('!--')) {
      // comment
    } else if (tagContent.startsWith('/')) {
      const tagName = tagContent.slice(1).split(/\s+/)[0];
      const popped = stack.pop();
      if (popped.tag !== tagName) {
        console.error(`Mismatch at line ${line}, col ${col}: expected </${popped.tag}> (from line ${popped.line}), but found </${tagName}>`);
        process.exit(1);
      }
    } else if (!tagContent.endsWith('/')) {
      const tagName = tagContent.split(/\s+/)[0];
      stack.push({ tag: tagName, line, col });
    }
    i = end;
  }
}

if (stack.length > 0) {
  console.log(`Unclosed tags:`, stack);
} else {
  console.log(`ALL TAGS MATCH PERFECTLY!`);
}
