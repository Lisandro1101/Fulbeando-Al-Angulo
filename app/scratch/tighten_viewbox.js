import fs from 'fs';
const content = fs.readFileSync('public/logo.svg', 'utf8');

// Let's create an updated version of public/logo.svg with the tight viewBox
const updated = content.replace(
  'viewBox="0 0 384 383.999986"',
  'viewBox="43 98 305 132"'
);

fs.writeFileSync('public/logo.svg', updated);
console.log('Updated public/logo.svg successfully');
