import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// ============================================================================
// SCRIPT DE TESTING UI/UX #1: RESERVA Y APROBACIÓN DE TURNO EN TIEMPO REAL
// ============================================================================
// Abre dos ventanas reales de Chrome lado a lado:
//   - Ventana 1 (Izquierda): Jugador / Capitán (Lionel Andrés - lio@alangulo.com)
//   - Ventana 2 (Derecha):   Dueño de Predio (Ramiro - dueno@fulbeando.com)
//
// Puedes ver cómo se ejecuta en vivo y en directo en tu monitor con ritmo
// pausado para apreciar el diseño visual, micro-interacciones y la
// reactividad en tiempo real (Firestore onSnapshot).
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SLOW_MO_MS = 1200; // Ritmo pausado para poder observar visualmente cada detalle
const CAPTURAS_DIR = path.resolve(process.cwd(), 'testing/ui-ux/capturas');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=============================================================');
  console.log('⚽ FULBEANDO — TEST UI/UX #1: RESERVA Y APROBACIÓN EN VIVO');
  console.log('=============================================================\n');

  if (!fs.existsSync(CAPTURAS_DIR)) {
    fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
  }

  const fixtureComprobante = path.resolve(process.cwd(), 'testing/fixtures/comprobante-demo.png');
  if (!fs.existsSync(fixtureComprobante)) {
    fs.mkdirSync(path.dirname(fixtureComprobante), { recursive: true });
    // Minimal 1x1 green PNG
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(fixtureComprobante, buffer);
  }

  console.log('🚀 Iniciando 2 instancias visuales de Google Chrome...');

  // 1. Lanzar navegador para el Jugador (Lado Izquierdo)
  const browserJugador = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: SLOW_MO_MS,
    args: [
      '--window-position=30,50',
      '--window-size=680,960',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  // 2. Lanzar navegador para el Dueño (Lado Derecho)
  const browserDueno = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: SLOW_MO_MS,
    args: [
      '--window-position=730,50',
      '--window-size=860,960',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  const contextJugador = await browserJugador.newContext({
    viewport: { width: 660, height: 880 },
    deviceScaleFactor: 1,
  });

  const contextDueno = await browserDueno.newContext({
    viewport: { width: 840, height: 880 },
    deviceScaleFactor: 1,
  });

  const pageJugador = await contextJugador.newPage();
  const pageDueno = await contextDueno.newPage();

  pageJugador.on('console', msg => {
    if (msg.type() === 'error') console.log('   [JUGADOR ERROR]', msg.text());
  });
  pageDueno.on('console', msg => {
    if (msg.type() === 'error') console.log('   [DUENO ERROR]', msg.text());
  });

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN EN AMBAS VENTANAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 1] 🔑 Iniciando sesión en ambas ventanas...');

    // Login Jugador
    console.log('   👤 Ventana Izquierda: Login como Jugador (Lionel Andrés)');
    await pageJugador.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageJugador.fill('input[type="email"]', 'lio@alangulo.com');
    await pageJugador.fill('input[type="password"]', 'password123');
    await pageJugador.click('button[type="submit"]');

    // Login Dueño
    console.log('   🏟️  Ventana Derecha:   Login como Dueño (Ramiro - El Templo)');
    await pageDueno.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageDueno.fill('input[type="email"]', 'dueno@fulbeando.com');
    await pageDueno.fill('input[type="password"]', 'password123');
    await pageDueno.click('button[type="submit"]');

    // Esperar a que el dueño esté en su panel
    console.log('   ⏳ Esperando redirecciones de perfil...');
    await pageDueno.waitForURL('**/venue-dashboard', { timeout: 15000 }).catch(async () => {
      await pageDueno.goto(`${BASE_URL}/venue-dashboard`, { waitUntil: 'domcontentloaded' });
    });

    await sleep(1500);
    await pageDueno.screenshot({ path: path.join(CAPTURAS_DIR, '01-panel-dueno-inicial.png') });
    console.log('   📸 Captura guardada: 01-panel-dueno-inicial.png');

    // ------------------------------------------------------------------------
    // PASO 2: EL JUGADOR NAVEGA A RESERVAR EN "EL TEMPLO"
    // ------------------------------------------------------------------------
    console.log('\n[Paso 2] ⚽ Jugador abre el flujo de reserva en "El Templo"...');
    await pageJugador.goto(`${BASE_URL}/reservar/predio-lanus-01`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await pageJugador.screenshot({ path: path.join(CAPTURAS_DIR, '02-pantalla-reserva-jugador.png') });

    // ------------------------------------------------------------------------
    // PASO 3: SELECCIÓN DE TURNO Y CARGA DE SEÑA
    // ------------------------------------------------------------------------
    console.log('\n[Paso 3] 🕒 Jugador selecciona horario y adjunta comprobante...');

    // Intentar seleccionar turno sugerido o buscar un slot
    const botonElegir = pageJugador.locator('button:has-text("Elegir este"), button:has-text("Elegir")').first();
    if (await botonElegir.isVisible({ timeout: 3000 })) {
      await botonElegir.click();
      console.log('   ✔️ Horario seleccionado con éxito.');
    } else {
      console.log('   ℹ️ Buscando disponibilidad manual...');
      await pageJugador.click('button:has-text("Buscar disponibilidad")');
      await sleep(1000);
      const primerResultado = pageJugador.locator('button:has-text("Elegir")').first();
      if (await primerResultado.isVisible()) {
        await primerResultado.click();
      }
    }

    await sleep(1000);

    // Cargar comprobante
    console.log('   📎 Subiendo comprobante de pago...');
    const fileInput = pageJugador.locator('input[type="file"]');
    await fileInput.setInputFiles(fixtureComprobante);
    await sleep(1000);

    await pageJugador.screenshot({ path: path.join(CAPTURAS_DIR, '03-comprobante-cargado.png') });

    // ------------------------------------------------------------------------
    // PASO 4: ENVIAR SOLICITUD
    // ------------------------------------------------------------------------
    console.log('\n[Paso 4] 🚀 Jugador envía la solicitud al predio...');
    const botonEnviar = pageJugador.locator('button:has-text("Enviar solicitud")');
    await botonEnviar.click();

    // ------------------------------------------------------------------------
    // PASO 5: VERIFICAR REACTIVIDAD EN TIEMPO REAL EN EL PANEL DEL DUEÑO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 5] 👀 OBSERVANDO VENTANA DERECHA (Dueño del Predio)...');
    console.log('   🔔 La solicitud debe aparecer AUTOMÁTICAMENTE sin tocar "Actualizar".');

    // Esperar a que la lista de pendientes tenga al menos 1 solicitud
    const tarjetaPendiente = pageDueno.locator('ul button:has-text("Pendiente")').first();
    await tarjetaPendiente.waitFor({ state: 'visible', timeout: 12000 });
    console.log('   ✨ ¡APARECIÓ LA SOLICITUD EN TIEMPO REAL!');
    await sleep(1000);
    await pageDueno.screenshot({ path: path.join(CAPTURAS_DIR, '04-solicitud-recibida-dueno.png') });

    // ------------------------------------------------------------------------
    // PASO 6: EL DUEÑO ABRE EL COMPROBANTE Y LO APRUEBA
    // ------------------------------------------------------------------------
    console.log('\n[Paso 6] 🔍 Dueño abre el modal de validación y revisa comprobante...');
    await tarjetaPendiente.click();
    await sleep(1500);

    const botonAprobar = pageDueno.locator('button:has-text("Aprobar turno")');
    await botonAprobar.waitFor({ state: 'visible', timeout: 5000 });
    await pageDueno.screenshot({ path: path.join(CAPTURAS_DIR, '05-modal-validacion-abierto.png') });

    console.log('   ✅ Dueño hace clic en "Aprobar turno"...');
    await botonAprobar.click();
    await sleep(1000);

    // ------------------------------------------------------------------------
    // PASO 7: VERIFICAR CONFIRMACIÓN AUTOMÁTICA EN LA PANTALLA DEL JUGADOR
    // ------------------------------------------------------------------------
    console.log('\n[Paso 7] 👀 OBSERVANDO VENTANA IZQUIERDA (Jugador)...');
    console.log('   🎉 La pantalla debe cambiar sola a "¡Reserva confirmada!"');

    const cartelConfirmado = pageJugador.locator('text=/Reserva confirmada|Turno confirmado/i').first();
    await cartelConfirmado.waitFor({ state: 'visible', timeout: 10000 });
    console.log('   🏆 ¡CONFIRMADO EN TIEMPO REAL EN LA PANTALLA DEL JUGADOR!');

    await sleep(1500);
    await pageJugador.screenshot({ path: path.join(CAPTURAS_DIR, '06-reserva-confirmada-jugador.png') });

    console.log('\n=============================================================');
    console.log('🌟 ¡TEST COMPLETADO CON ÉXITO TOTAL!');
    console.log(`📁 Capturas de pantalla guardadas en: ${CAPTURAS_DIR}`);
    const shouldClose = process.argv.includes('--close') || process.env.HOLD === 'false';
    if (!shouldClose) {
      console.log('ℹ️  Las ventanas de Chrome permanecerán abiertas para inspección.');
      console.log('   (Presiona Ctrl+C en tu terminal cuando desees cerrarlas)\n');
      await new Promise(() => {});
    } else {
      console.log('⏳ Finalizando y cerrando navegadores tras guardar capturas...');
      await sleep(3000);
      await browserJugador.close();
      await browserDueno.close();
    }
  } catch (error) {
    console.error('\n❌ Error durante la ejecución del test UI/UX:', error);
    await pageJugador.screenshot({ path: path.join(CAPTURAS_DIR, 'error-jugador.png') }).catch(() => {});
    await pageDueno.screenshot({ path: path.join(CAPTURAS_DIR, 'error-dueno.png') }).catch(() => {});
    throw error;
  }
}

void main();
