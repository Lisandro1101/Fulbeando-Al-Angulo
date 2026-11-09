import { chromium } from 'playwright';
import path from 'path';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 400 } });
  
  const logoPath = path.resolve('app/public/logo.svg');
  // Load an HTML page with the logo on transparent and dark background
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 20px; background: #0f172a; font-family: sans-serif; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
          .container { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
          .light-container { background: #ffffff; padding: 20px; border-radius: 12px; }
          img { display: block; max-height: 120px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">Fondo Oscuro (Dark Theme):</p>
          <img src="file://${logoPath}" alt="Logo" />
        </div>
        <div class="light-container">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Fondo Claro (Light Theme):</p>
          <img src="file://${logoPath}" alt="Logo" />
        </div>
      </body>
    </html>
  `;
  
  await page.setContent(html);
  await page.screenshot({ path: 'app/scratch/logo_preview.png' });
  await browser.close();
  console.log('Saved app/scratch/logo_preview.png');
}

takeScreenshot();
