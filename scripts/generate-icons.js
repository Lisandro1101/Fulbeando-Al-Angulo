import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  console.log('Iniciando generacion de iconos PWA...');
  const publicDir = path.resolve('app/public');
  
  if (!fs.existsSync(publicDir)) {
    console.error('Directorio app/public no encontrado.');
    return;
  }

  try {
    await sharp(path.join(publicDir, 'icon-192.svg'))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('✅ pwa-192x192.png generado');

    await sharp(path.join(publicDir, 'icon-512.svg'))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('✅ pwa-512x512.png generado (se usara tambien como maskable)');
    
    console.log('¡Iconos generados exitosamente!');
  } catch (error) {
    console.error('Error generando los iconos:', error);
  }
}

generateIcons();
