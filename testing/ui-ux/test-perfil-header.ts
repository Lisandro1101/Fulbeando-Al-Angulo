import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Viewport móvil típico de Android estrecho (360px de ancho)
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();

  console.log('Navegando al login...');
  await page.goto('http://localhost:5173/login');

  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'lio@alangulo.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Ingresar")');

  // Navegar a Perfil
  await page.waitForSelector('a[href="/perfil"]', { timeout: 15000 });
  await page.click('a[href="/perfil"]');
  await page.waitForTimeout(1500);

  console.log('Tomando captura de /perfil en 360px de ancho...');
  await page.screenshot({ path: 'testing/ui-ux/capturas/perfil-mobile-360px.png' });

  await browser.close();
  console.log('✅ Captura completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
