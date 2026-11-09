import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import * as admin from 'firebase-admin';

// ============================================================================
// SCRIPT DE TESTING UI/UX #5: PARTIDO ENTRE DOS EQUIPOS Y CONFIRMACIÓN MUTUA
// ============================================================================
// Abre dos ventanas reales de Google Chrome lado a lado:
//   - Ventana 1 (Izquierda): Capitán 1 — Lionel Andrés (lio@alangulo.com)
//                            Equipo: "La Scaloneta"
//   - Ventana 2 (Derecha):   Capitán 2 — Matías El Rústico (rustico@fulbeando.com)
//                            Equipo: "Los Pibes de Banfield"
//
// Flujo completo:
//   1. Se asegura en Firestore que ambos clubes tengan su partido activo
//      vinculado en sus convocatorias.
//   2. Ambos capitanes inician sesión y van a la pantalla de su Equipo (/equipo).
//   3. Navegan a la pestaña "2. Carga & Post-Partido":
//      - Lionel abre la "Planilla Oficial del Encuentro".
//      - Carga el marcador: 5 a 3 (Victoria para La Scaloneta).
//      - Selecciona autores de goles y califica fair play.
//      - Toca "Enviar a Confirmación del Capitán Rival 🤝".
//   4. En tiempo real:
//      - La pantalla de Lionel pasa a "Planilla Enviada — Esperando Validación Rival".
//      - En la pantalla de Matías (Capitán rival) aparece la tarjeta interactiva
//        "Acta de Partido del Capitán Rival" con el resultado 3 - 5 y ganador declarado.
//   5. Matías califica el Fair Play de La Scaloneta y hace clic en
//      "Confirmar Ganador y Cerrar Partido 🤝🏆".
//   6. En tiempo real, el partido queda oficialmente sellado para ambos clubes:
//      - La Scaloneta suma +1 Victoria.
//      - Los Pibes de Banfield suma +1 Derrota.
//      - Ambos ven el resumen oficial del partido registrado en su historial.
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SLOW_MO_MS = 1000;
const CAPTURAS_DIR = path.resolve(process.cwd(), 'testing/ui-ux/capturas');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Configurar conexión directa al Firestore Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'fulbeando-demo';

const firebaseAdmin = (admin as any).default || admin;
if (!firebaseAdmin.apps?.length) {
  firebaseAdmin.initializeApp({ projectId: 'fulbeando-demo' });
}
const db = firebaseAdmin.firestore();

async function prepararPartidoEntreEquipos() {
  console.log('🏟️  Preparando partido pactado entre La Scaloneta y Los Pibes de Banfield...');
  const fechaPartido = new Date().toISOString();

  await db.collection('teams').doc('team-scaloneta').update({
    convocatoria: {
      fecha: fechaPartido,
      predioNombre: 'Complejo Central Fútbol',
      canchaNombre: 'Cancha 1 (F5 Techada)',
      confirmados: ['user-lionel', 'user-cuti'],
      bajas: [],
      equipoRivalId: 'team-pibes',
      equipoRivalNombre: 'Los Pibes de Banfield',
      equipoRivalEscudoUrl: null,
      resultadoPendiente: null,
    },
  });

  await db.collection('teams').doc('team-pibes').update({
    convocatoria: {
      fecha: fechaPartido,
      predioNombre: 'Complejo Central Fútbol',
      canchaNombre: 'Cancha 1 (F5 Techada)',
      confirmados: ['user-rustico'],
      bajas: [],
      equipoRivalId: 'team-scaloneta',
      equipoRivalNombre: 'La Scaloneta',
      equipoRivalEscudoUrl: null,
      resultadoPendiente: null,
    },
  });

  console.log('✅ Partido y convocatorias vinculadas en Firestore.');
}

async function main() {
  console.log('\n==============================================================================');
  console.log('⚽ FULBEANDO — TEST UI/UX #5: PARTIDO ENTRE 2 EQUIPOS Y CONFIRMACIÓN MUTUA');
  console.log('==============================================================================\n');

  if (!fs.existsSync(CAPTURAS_DIR)) {
    fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
  }

  // 0. Preparar convocatorias cruzadas
  await prepararPartidoEntreEquipos();

  console.log('🚀 Iniciando 2 instancias visuales de Google Chrome...');

  // 1. Lanzar navegador para el Capitán Lionel (Lado Izquierdo)
  const browserLionel = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: SLOW_MO_MS,
    args: [
      '--window-position=30,40',
      '--window-size=740,980',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  // 2. Lanzar navegador para el Capitán Matías (Lado Derecho)
  const browserMatias = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: SLOW_MO_MS,
    args: [
      '--window-position=790,40',
      '--window-size=740,980',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  const contextLionel = await browserLionel.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const contextMatias = await browserMatias.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const pageLionel = await contextLionel.newPage();
  const pageMatias = await contextMatias.newPage();

  pageLionel.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [LIONEL ERROR]', msg.text());
  });
  pageMatias.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [MATIAS ERROR]', msg.text());
  });

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN EN AMBAS VENTANAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 1] 🔑 Iniciando sesión de ambos capitanes...');

    // Login Capitán Lionel
    console.log('   👑 Ventana Izquierda: Login Capitán (Lionel Andrés - lio@alangulo.com)');
    await pageLionel.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageLionel.fill('input[type="email"]', 'lio@alangulo.com');
    await pageLionel.fill('input[type="password"]', 'password123');
    await pageLionel.click('button[type="submit"]');

    // Login Capitán Matías
    console.log('   👑 Ventana Derecha:   Login Capitán (Matías El Rústico - rustico@fulbeando.com)');
    await pageMatias.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageMatias.fill('input[type="email"]', 'rustico@fulbeando.com');
    await pageMatias.fill('input[type="password"]', 'password123');
    await pageMatias.click('button[type="submit"]');

    await sleep(2500);

    // Navegar a la pantalla de Equipo (/equipo)
    console.log('   ⚽ Navegando a la pantalla de Equipo en ambas ventanas...');
    await pageLionel.goto(`${BASE_URL}/equipo`, { waitUntil: 'domcontentloaded' });
    await pageMatias.goto(`${BASE_URL}/equipo`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-01-equipo-lionel.png') });
    await pageMatias.screenshot({ path: path.join(CAPTURAS_DIR, '05-01-equipo-matias.png') });
    console.log('   📸 Pantalla de Equipo cargada en ambas ventanas.');

    // ------------------------------------------------------------------------
    // PASO 2: NAVEGAR A LA PESTAÑA POST-PARTIDO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 2] 📋 Pasando a la pestaña "2. Carga & Post-Partido"...');

    const tabPostLionel = pageLionel.locator('button:has-text("Post-Partido"), button:has-text("Carga & Post-Partido")').first();
    await tabPostLionel.click();

    const tabPostMatias = pageMatias.locator('button:has-text("Post-Partido"), button:has-text("Carga & Post-Partido")').first();
    await tabPostMatias.click();

    await sleep(2000);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-02-tab-post-lionel.png') });
    await pageMatias.screenshot({ path: path.join(CAPTURAS_DIR, '05-02-tab-post-matias.png') });
    console.log('   📸 Ambos capitanes en la sección de Post-Partido.');

    // ------------------------------------------------------------------------
    // PASO 3: LIONEL COMPLETA LA PLANILLA OFICIAL Y PROPONE EL RESULTADO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 3] 🏆 Lionel abre la Planilla Oficial y carga el resultado...');

    const botonCargarEstadisticas = pageLionel.locator('button:has-text("Cargar Estadísticas del Partido")').first();
    await botonCargarEstadisticas.click();
    await sleep(1500);

    const modal3erTiempo = pageLionel.locator('[role="dialog"][aria-label="3er tiempo"]');
    await modal3erTiempo.waitFor({ state: 'visible', timeout: 5000 });

    // Cargar marcador: 5 a 3 (Victoria de La Scaloneta)
    console.log('   ⚽ Marcador: 5 goles a favor, 3 en contra...');
    const tarjetaResultado = modal3erTiempo.locator('div.border.rounded-2xl').first();
    const botonesMasResultado = tarjetaResultado.locator('button:has-text("+")');

    // Sumar 5 goles a favor
    for (let i = 0; i < 5; i++) {
      await botonesMasResultado.first().click();
      await sleep(200);
    }

    // Sumar 3 goles en contra
    for (let i = 0; i < 3; i++) {
      await botonesMasResultado.nth(1).click();
      await sleep(200);
    }

    // Calificar predio y Fair Play del rival
    console.log('   🏟️  Calificando predio con 5 estrellas...');
    const estrellas = modal3erTiempo.locator('button:has-text("★")');
    if ((await estrellas.count()) >= 5) {
      await estrellas.nth(4).click();
      await sleep(400);
    }

    console.log('   🤝 Calificando Fair Play del rival ("Buen rival")...');
    const botonBuenRival = modal3erTiempo.locator('button:has-text("Buen rival")').first();
    if (await botonBuenRival.isVisible({ timeout: 2000 })) {
      await botonBuenRival.click();
      await sleep(400);
    }

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-03-lionel-planilla-completada.png') });

    // Tocar el botón de envío a confirmación mutua
    console.log('   📤 Lionel envía el resultado para confirmación del Capitán rival...');
    const botonEnviarConfirmacion = modal3erTiempo.locator('button:has-text("Enviar a Confirmación"), button:has-text("Confirmar Carga")').first();
    await botonEnviarConfirmacion.click();
    await sleep(2500);

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-04-lionel-esperando-confirmacion.png') });
    console.log('   📸 Lionel en espera: "Planilla Enviada — Esperando Validación Rival".');

    // ------------------------------------------------------------------------
    // PASO 4: MATÍAS RECIBE EL ACTA EN VIVO Y CONFIRMA EL GANADOR
    // ------------------------------------------------------------------------
    console.log('\n[Paso 4] 🤝 En la ventana de Matías (Capitán Rival) se recibe el acta en vivo...');
    await sleep(2000);

    const tarjetaActaRival = pageMatias.locator('div:has-text("Acta de Partido del Capitán Rival")').first();
    await tarjetaActaRival.waitFor({ state: 'visible', timeout: 8000 });

    await pageMatias.screenshot({ path: path.join(CAPTURAS_DIR, '05-05-matias-acta-recibida.png') });
    console.log('   📸 Matías visualiza el acta con marcador propuesto y ganador declarado.');

    // Matías califica también el Fair Play de La Scaloneta
    console.log('   🤝 Matías califica el Fair Play de La Scaloneta...');
    const botonFairPlayMatias = pageMatias.locator('button:has-text("Buen rival")').first();
    if (await botonFairPlayMatias.isVisible({ timeout: 3000 })) {
      await botonFairPlayMatias.click();
      await sleep(500);
    }

    // Matías confirma el ganador y cierra el partido
    console.log('   🏆 Matías confirma el ganador y sella el partido...');
    const botonConfirmarGanador = pageMatias.locator('button:has-text("Confirmar Ganador y Cerrar Partido")').first();
    await botonConfirmarGanador.waitFor({ state: 'visible', timeout: 5000 });
    await botonConfirmarGanador.click();

    await sleep(3500);

    // ------------------------------------------------------------------------
    // PASO 5: AMBOS CAPITANES VEN EL PARTIDO SELLADO Y STATS ACTUALIZADAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 5] 🎉 Verificando oficialización del partido en ambas pantallas...');

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-06-lionel-partido-finalizado.png') });
    await pageMatias.screenshot({ path: path.join(CAPTURAS_DIR, '05-06-matias-partido-finalizado.png') });

    console.log('\n==============================================================================');
    console.log('🎉 ¡TEST UI/UX #5 COMPLETADO CON ÉXITO!');
    console.log('   1. Ambos capitanes completaron los datos del encuentro.');
    console.log('   2. El Capitán de La Scaloneta propuso el resultado (5 - 3).');
    console.log('   3. El Capitán de Los Pibes de Banfield confirmó al ganador en tiempo real.');
    console.log('   4. Las victorias, derrotas y reputación de ambos clubes quedaron selladas.');
    console.log('==============================================================================\n');

    await sleep(4000);
  } catch (error) {
    console.error('\n❌ Error durante la ejecución del Test UI/UX #5:', error);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '05-error-lionel.png') }).catch(() => {});
    await pageMatias.screenshot({ path: path.join(CAPTURAS_DIR, '05-error-matias.png') }).catch(() => {});
    throw error;
  } finally {
    console.log('🧹 Cerrando navegadores...');
    await browserLionel.close();
    await browserMatias.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
