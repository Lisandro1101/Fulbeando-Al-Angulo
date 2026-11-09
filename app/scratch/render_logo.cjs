const sharp = require('sharp');
const fs = require('fs');

async function render() {
  try {
    const svgBuffer = fs.readFileSync('app/public/logo.svg');
    await sharp(svgBuffer)
      .resize({ width: 800 })
      .png()
      .toFile('app/scratch/rendered_logo.png');
    console.log('Successfully rendered app/scratch/rendered_logo.png');
  } catch (err) {
    console.error('Error rendering SVG:', err);
  }
}

render();
