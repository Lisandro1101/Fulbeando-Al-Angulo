const fs = require('fs');
const path = require('path');

const swPath = path.resolve(__dirname, '../app/public/firebase-messaging-sw.js');
if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  const now = new Date();
  const versionString = now.toISOString().replace(/[:.]/g, '-');
  
  if (content.includes('SW_VERSION')) {
    content = content.replace(/const SW_VERSION = ['"][^'"]*['"];?/, `const SW_VERSION = '${versionString}';`);
    content = content.replace(/\/\/ Service Worker Build Version:.*/, `// Service Worker Build Version: ${versionString}`);
  } else {
    content = `// Service Worker Build Version: ${versionString}\nconst SW_VERSION = '${versionString}';\n\n` + content;
  }
  
  fs.writeFileSync(swPath, content, 'utf8');
  console.log(`[bump-sw] Service worker updated with version: ${versionString}`);
} else {
  console.warn(`[bump-sw] Warning: ${swPath} not found`);
}
