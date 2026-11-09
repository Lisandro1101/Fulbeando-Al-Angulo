import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  console.log('Navegando a la aplicación...');
  await page.goto('http://localhost:5173/login');

  // Login rápido con Lionel
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'lio@alangulo.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Ingresar")');

  // Esperar a que cargue la app (header visible)
  await page.waitForSelector('header button[aria-label="Enviar sugerencia o reportar problema"]', { timeout: 15000 });
  console.log('✅ Botón de feedback detectado en la cabecera.');

  // Tomar captura con el header
  await page.screenshot({ path: 'testing/ui-ux/capturas/feedback-01-header.png' });

  // Abrir modal de feedback
  await page.click('header button[aria-label="Enviar sugerencia o reportar problema"]');
  await page.waitForSelector('div[role="dialog"][aria-label="Enviar feedback o reportar problema"]');
  console.log('✅ Modal de feedback abierto.');

  // Seleccionar tipo 'bug'
  await page.click('button:has-text("Reportar Error")');
  await page.fill('textarea#mensaje-feedback', 'El botón de tercer tiempo tardó unos segundos en actualizarse.');
  await page.waitForTimeout(500);

  // Tomar captura del modal cargado
  await page.screenshot({ path: 'testing/ui-ux/capturas/feedback-02-modal.png' });

  // Enviar feedback
  await page.click('button:has-text("Enviar Mensaje")');
  await page.waitForSelector('text=¡Gracias por tu aporte!', { timeout: 8000 });
  console.log('✅ Feedback enviado exitosamente.');

  // Tomar captura de confirmación
  await page.screenshot({ path: 'testing/ui-ux/capturas/feedback-03-confirmacion.png' });

  await browser.close();
  console.log('🎉 Test de Feedback completado.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
