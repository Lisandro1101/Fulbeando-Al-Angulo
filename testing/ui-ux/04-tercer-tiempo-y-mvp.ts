import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// ============================================================================
// SCRIPT DE TESTING UI/UX #4: TERCER TIEMPO, VOTACIÓN DE MVP Y PLANILLA OFICIAL
// ============================================================================
// Abre dos ventanas reales de Google Chrome lado a lado:
//   - Ventana 1 (Izquierda): Capitán — Lionel Andrés (lio@alangulo.com)
//                            Equipo: "La Scaloneta"
//   - Ventana 2 (Derecha):   Jugador del Plantel — Cristian "Cuti" Romero (cuti@alangulo.com)
//                            Equipo: "La Scaloneta"
//
// Flujo completo:
//   1. Ambos inician sesión y van a la pantalla de su Equipo (/equipo).
//   2. Verifican la convocatoria del partido y confirman asistencia ("Voy").
//   3. Pasan a la pestaña "2. Carga & Post-Partido":
//      - Se observa el banner oficial de Tercer Tiempo con promos locales.
//      - Cuti vota a Lionel como la figura/MVP del partido en la votación democrática.
//      - Lionel vota a Cuti como la figura del partido.
//   4. El Capitán Lionel abre la "Planilla Oficial del 3er Tiempo":
//      - Carga el resultado del partido (ej. 5 a 3 - Victoria).
//      - El más votado de la cancha aparece destacado automáticamente como MVP.
//      - Asigna goles y asistencias a los jugadores.
//      - Califica las canchas del predio (4 estrellas) y el Fair Play rival.
//      - Finaliza el encuentro y guarda la planilla.
//   5. Los datos, victorias y medallas se sincronizan en vivo en ambas pantallas.
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SLOW_MO_MS = 1000;
const CAPTURAS_DIR = path.resolve(process.cwd(), 'testing/ui-ux/capturas');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=============================================================');
  console.log('🍺 FULBEANDO — TEST UI/UX #4: TERCER TIEMPO, MVP Y PLANILLA');
  console.log('=============================================================\n');

  if (!fs.existsSync(CAPTURAS_DIR)) {
    fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
  }

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

  // 2. Lanzar navegador para el Jugador Cuti Romero (Lado Derecho)
  const browserCuti = await chromium.launch({
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

  const contextCuti = await browserCuti.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const pageLionel = await contextLionel.newPage();
  const pageCuti = await contextCuti.newPage();

  pageLionel.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [LIONEL ERROR]', msg.text());
  });
  pageCuti.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [CUTI ERROR]', msg.text());
  });

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN EN AMBAS VENTANAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 1] 🔑 Iniciando sesión para Capitán y Jugador...');

    // Login Capitán Lionel
    console.log('   👑 Ventana Izquierda: Login Capitán (Lionel Andrés - lio@alangulo.com)');
    await pageLionel.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageLionel.fill('input[type="email"]', 'lio@alangulo.com');
    await pageLionel.fill('input[type="password"]', 'password123');
    await pageLionel.click('button[type="submit"]');

    // Login Cuti Romero
    console.log('   🏃 Ventana Derecha:   Login Jugador (Cristian Romero - cuti@alangulo.com)');
    await pageCuti.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageCuti.fill('input[type="email"]', 'cuti@alangulo.com');
    await pageCuti.fill('input[type="password"]', 'password123');
    await pageCuti.click('button[type="submit"]');

    await sleep(2500);

    // Navegar a la pantalla de Equipo (/equipo)
    console.log('   ⚽ Navegando a la pantalla del equipo "La Scaloneta"...');
    await pageLionel.goto(`${BASE_URL}/equipo`, { waitUntil: 'domcontentloaded' });
    await pageCuti.goto(`${BASE_URL}/equipo`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-01-equipo-lionel-inicial.png') });
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '04-01-equipo-cuti-inicial.png') });
    console.log('   📸 Pantalla de Equipo cargada en ambas ventanas.');

    // ------------------------------------------------------------------------
    // PASO 2: CONVOCATORIA ACTIVA Y ASISTENCIA
    // ------------------------------------------------------------------------
    console.log('\n[Paso 2] 📋 Verificando convocatoria y confirmaciones...');

    // Si no hay convocatoria activa, el capitán abre una
    const botonArmar = pageLionel.locator('button:has-text("Armar Convocatoria")').first();
    if (await botonArmar.isVisible({ timeout: 2000 })) {
      console.log('   ✨ Capitán arma una nueva convocatoria para el partido...');
      await botonArmar.click();
      await sleep(1000);
      const botonConfirmarConv = pageLionel.locator('button:has-text("Abrir Convocatoria")').first();
      await botonConfirmarConv.click();
      await sleep(1500);
    }

    // Cuti confirma su asistencia tocando "Voy"
    console.log('   ✔️ Cuti confirma asistencia tocando "Voy"...');
    const botonVoyCuti = pageCuti.locator('button:has-text("Voy")').first();
    if (await botonVoyCuti.isVisible({ timeout: 3000 })) {
      await botonVoyCuti.click();
      await sleep(1000);
    }

    // Lionel también confirma asistencia tocando "Voy"
    const botonVoyLionel = pageLionel.locator('button:has-text("Voy")').first();
    if (await botonVoyLionel.isVisible({ timeout: 3000 })) {
      await botonVoyLionel.click();
      await sleep(1000);
    }

    await sleep(1500);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-02-convocatoria-confirmada.png') });
    console.log('   📸 Convocatoria confirmada en el plantel.');

    // ------------------------------------------------------------------------
    // PASO 3: PASAR A LA PESTAÑA POST-PARTIDO Y VOTAR LA FIGURA (MVP)
    // ------------------------------------------------------------------------
    console.log('\n[Paso 3] 🍺 Entrando a "2. Carga & Post-Partido" (Tercer Tiempo)...');

    // Cambiar a pestaña Post-Partido en ambos clientes
    const tabPostLionel = pageLionel.locator('button:has-text("Post-Partido"), button:has-text("Carga & Post-Partido")').first();
    await tabPostLionel.click();

    const tabPostCuti = pageCuti.locator('button:has-text("Post-Partido"), button:has-text("Carga & Post-Partido")').first();
    await tabPostCuti.click();

    await sleep(2000);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-03-tercer-tiempo-lionel.png') });
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '04-03-tercer-tiempo-cuti.png') });
    console.log('   📸 Sección de Tercer Tiempo y Votación desplegada.');

    // Cuti vota a Lionel como la figura del partido
    console.log('   ⭐ Cuti vota a Lionel Andrés como la Figura/MVP del partido...');
    const botonVotarLionel = pageCuti.locator('button:has-text("Lionel"), button:has-text("Andrés")').first();
    if (await botonVotarLionel.isVisible({ timeout: 3000 })) {
      await botonVotarLionel.click();
      await sleep(1500);
      console.log('   ✔️ Voto de Cuti registrado.');
    }

    // Lionel vota a Cuti Romero
    console.log('   ⭐ Lionel vota a Cristian Romero como figura...');
    const botonVotarCuti = pageLionel.locator('button:has-text("Cristian"), button:has-text("Romero")').first();
    if (await botonVotarCuti.isVisible({ timeout: 3000 })) {
      await botonVotarCuti.click();
      await sleep(1500);
      console.log('   ✔️ Voto de Lionel registrado.');
    }

    await sleep(1500);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-04-votos-mvp-registrados.png') });

    // ------------------------------------------------------------------------
    // PASO 4: EL CAPITÁN ABRE LA PLANILLA OFICIAL DEL 3ER TIEMPO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 4] 🏆 Capitán Lionel abre la Planilla Oficial del Encuentro...');

    const botonCargarEstadisticas = pageLionel.locator('button:has-text("Cargar Estadísticas del Partido")').first();
    await botonCargarEstadisticas.click();
    await sleep(1500);

    const modal3erTiempo = pageLionel.locator('[role="dialog"][aria-label="3er tiempo"]');
    await modal3erTiempo.waitFor({ state: 'visible', timeout: 5000 });

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-05-modal-3er-tiempo-abierto.png') });
    console.log('   📸 Modal de 3er Tiempo abierto.');

    // Cargar resultado: 5 goles a favor, 3 en contra (dentro de la tarjeta de resultado)
    console.log('   ⚽ Cargando resultado final: 5 - 3 (Victoria)...');
    const tarjetaResultado = modal3erTiempo.locator('div.border.rounded-2xl').first();
    const botonesMasResultado = tarjetaResultado.locator('button:has-text("+")');
    // Sumar goles a favor
    const botonMasFavor = botonesMasResultado.first();
    for (let i = 0; i < 5; i++) {
      await botonMasFavor.click();
      await sleep(250);
    }

    // Sumar goles en contra
    const botonMasContra = botonesMasResultado.nth(1);
    for (let i = 0; i < 3; i++) {
      await botonMasContra.click();
      await sleep(250);
    }

    // Asignar goles individuales a Lionel y Cuti
    console.log('   👟 Asignando goles y asistencias a los jugadores...');
    const seccionGoles = modal3erTiempo.locator('div').filter({ hasText: 'Goles, Asistencias y Asistencia' });
    const botonesSumaGolesJugador = seccionGoles.locator('div.border button:has-text("+")');
    if ((await botonesSumaGolesJugador.count()) >= 2) {
      await botonesSumaGolesJugador.nth(0).click();
      await sleep(200);
      await botonesSumaGolesJugador.nth(0).click();
      await sleep(200);
      await botonesSumaGolesJugador.nth(1).click();
      await sleep(200);
    }

    // Calificar predio (4 estrellas)
    console.log('   🏟️  Calificando predio con 4 estrellas...');
    const estrellas = modal3erTiempo.locator('button:has-text("★")');
    if ((await estrellas.count()) >= 4) {
      await estrellas.nth(3).click();
      await sleep(500);
    }

    // Calificar Fair Play del rival
    console.log('   🤝 Calificando Fair Play del rival...');
    const botonFairPlay = modal3erTiempo.locator('button:has-text("Excelente"), button:has-text("Bueno")').first();
    if (await botonFairPlay.isVisible({ timeout: 2000 })) {
      await botonFairPlay.click();
      await sleep(500);
    }

    await sleep(1000);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-06-planilla-completada.png') });

    // Guardar planilla y finalizar partido
    console.log('   💾 Confirmando carga y finalizando encuentro oficial...');
    const botonFinalizar = modal3erTiempo.locator('button:has-text("Confirmar Carga y Finalizar Partido")').first();
    await botonFinalizar.click();

    await sleep(2500);

    // ------------------------------------------------------------------------
    // PASO 5: SINCRONIZACIÓN FINAL DE ESTADÍSTICAS Y VICTORIAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 5] 🏆 ¡PARTIDO CERRADO! Comprobando actualización en vivo...');

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-07-post-cierre-lionel.png') });
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '04-07-post-cierre-cuti.png') });

    console.log('\n=============================================================');
    console.log('✅ TEST UI/UX #4 FINALIZADO CON ÉXITO');
    console.log('   📸 Todas las capturas guardadas en: testing/ui-ux/capturas/');
    console.log('   🖥️  Las 2 ventanas permanecen abiertas para tu inspección.');
    console.log('=============================================================\n');

    await sleep(60000);
  } catch (err) {
    console.error('❌ Error durante la ejecución del Test UI/UX #4:', err);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '04-error-lionel.png') }).catch(() => {});
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '04-error-cuti.png') }).catch(() => {});
  } finally {
    await browserLionel.close().catch(() => {});
    await browserCuti.close().catch(() => {});
  }
}

main().catch(console.error);
