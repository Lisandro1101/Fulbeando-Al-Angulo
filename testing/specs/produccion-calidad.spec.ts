import { test, expect } from '@playwright/test';

test.describe('Validaciones de Calidad y Producción — Fulbeando', () => {

  test('P1: El archivo ads.txt oficial está disponible y contiene el ID de AdSense', async ({ request }) => {
    const res = await request.get('/ads.txt');
    expect(res.status(), 'El archivo ads.txt debe responder con código 200 OK').toBe(200);
    const texto = await res.text();
    expect(texto).toContain('pub-7558809644534817');
    expect(texto).toContain('f08c47fec0942fa0');
  });

  test('P2: El manifiesto PWA responde correctamente', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBeTruthy();
    expect(json.icons).toBeInstanceOf(Array);
  });

  test('P3: Pantalla de Login carga con branding Fulbeando y sin errores de consola', async ({ page }) => {
    const erroresConsola: string[] = [];
    page.on('pageerror', (err) => erroresConsola.push(err.message));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verificar logo o texto de bienvenida
    await expect(
      page.locator('img[alt="FULBEAND"], img[alt*="FULBEANDO" i], img[src*="logo-fulbeand"]').first()
    ).toBeVisible({ timeout: 15_000 });

    // Campos de formulario presentes
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: /INGRESAR/i })).toBeVisible();

    // Sin errores fatales de JavaScript en la página
    expect(erroresConsola, `Errores fatales JS detectados: ${erroresConsola.join(', ')}`).toHaveLength(0);
  });

  test('P4: Validación de inputs vacíos en Login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /INGRESAR/i }).click();

    // Mensaje de advertencia
    await expect(page.getByText(/completá email y contraseña/i)).toBeVisible({ timeout: 10_000 });
  });

  test('P5: Responsividad móvil — Sin desborde horizontal en celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verificar que el ancho del scroll no sobrepase el ancho de la ventana
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, 'El contenido no debe desbordarse horizontalmente en mobile').toBeLessThanOrEqual(clientWidth + 2);
  });

  test('P6: Pestaña de Registro e inputs de Nombre/Apellido disponibles', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Cambiar a registro si existe botón o toggle
    const toggleRegistro = page.getByRole('button', { name: /registra|crear cuenta/i });
    if (await toggleRegistro.isVisible()) {
      await toggleRegistro.click();
      await expect(page.getByPlaceholder('Nombre')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByPlaceholder('Apellido')).toBeVisible({ timeout: 5_000 });
    }
  });

});
