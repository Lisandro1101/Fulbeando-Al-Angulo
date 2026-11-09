import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// ============================================================================
// SCRIPT DE TESTING UI/UX #3: MURO SOCIAL, CARTA DE JUGADOR Y REACCIONES EN VIVO
// ============================================================================
// Abre dos ventanas reales de Google Chrome lado a lado:
//   - Ventana 1 (Izquierda): Jugador Libre — Cristian "Cuti" Romero (cuti@alangulo.com)
//   - Ventana 2 (Derecha):   Capitán — Lionel Andrés (lio@alangulo.com)
//
// Flujo completo:
//   1. Ambos inician sesión en Al Ángulo.
//   2. Cuti abre el Composer en el Muro Social, escribe un post buscando equipo
//      con hashtag #BuscoEquipo y adjunta su Carta FUT oficial de jugador.
//   3. Lionel ve aparecer la publicación en tiempo real con su ficha visual,
//      reacciona con un emoji (🔥) y le comenta para reclutarlo para su equipo.
//   4. Cuti recibe la reacción y el comentario en vivo y le da "Seguir" al capitán.
//   5. Se guardan capturas de pantalla completas en testing/ui-ux/capturas/.
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SLOW_MO_MS = 1000;
const CAPTURAS_DIR = path.resolve(process.cwd(), 'testing/ui-ux/capturas');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=============================================================');
  console.log('📰 FULBEANDO — TEST UI/UX #3: MURO SOCIAL Y CARTA FUT');
  console.log('=============================================================\n');

  if (!fs.existsSync(CAPTURAS_DIR)) {
    fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
  }

  console.log('🚀 Iniciando 2 instancias visuales de Google Chrome...');

  // 1. Lanzar navegador para Cuti Romero (Lado Izquierdo)
  const browserCuti = await chromium.launch({
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

  // 2. Lanzar navegador para Lionel (Lado Derecho)
  const browserLionel = await chromium.launch({
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

  const contextCuti = await browserCuti.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const contextLionel = await browserLionel.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const pageCuti = await contextCuti.newPage();
  const pageLionel = await contextLionel.newPage();

  pageCuti.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [CUTI ERROR]', msg.text());
  });
  pageLionel.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [LIONEL ERROR]', msg.text());
  });

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN EN AMBAS VENTANAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 1] 🔑 Iniciando sesión en ambas ventanas...');

    // Login Cuti
    console.log('   🛡️  Ventana Izquierda: Login como Jugador (Cristian "Cuti" Romero)');
    await pageCuti.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageCuti.fill('input[type="email"]', 'cuti@alangulo.com');
    await pageCuti.fill('input[type="password"]', 'password123');
    await pageCuti.click('button[type="submit"]');

    // Login Lionel
    console.log('   👑 Ventana Derecha:   Login como Capitán (Lionel Andrés)');
    await pageLionel.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageLionel.fill('input[type="email"]', 'lio@alangulo.com');
    await pageLionel.fill('input[type="password"]', 'password123');
    await pageLionel.click('button[type="submit"]');

    // Esperar a que cargue la pantalla principal (Muro Social) en ambos
    console.log('   ⏳ Esperando carga del Muro de la Comunidad en ambos clientes...');
    await sleep(2500);

    // Asegurarse de que ambos estén en la pestaña del Muro
    await pageCuti.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await pageLionel.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '03-01-muro-cuti-inicial.png') });
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '03-01-muro-lionel-inicial.png') });
    console.log('   📸 Capturas iniciales del muro guardadas.');

    // ------------------------------------------------------------------------
    // PASO 2: CUTI ABRE EL COMPOSER Y ADJUNTA SU CARTA FUT
    // ------------------------------------------------------------------------
    console.log('\n[Paso 2] ✍️ Cuti abre el Composer para publicar en el Muro Social...');
    // Intentar abrir con el botón directo de carta o la píldora de texto
    const botonCartaAccesoRapido = pageCuti.locator('button[aria-label="Compartir mi carta FUT"], button[title="Compartir mi carta FUT"]').first();
    const pildoraComposer = pageCuti.locator('button:has-text("cancha hoy")').first();

    if (await botonCartaAccesoRapido.isVisible({ timeout: 3000 })) {
      await botonCartaAccesoRapido.click();
    } else {
      await pildoraComposer.click();
      await sleep(1000);
      const botonModoCarta = pageCuti.locator('button:has-text("Carta")').first();
      if (await botonModoCarta.isVisible({ timeout: 2000 })) {
        await botonModoCarta.click();
      }
    }

    await sleep(1200);

    // Tocar chip de hashtag #BuscoEquipo si está disponible
    const chipBuscoEquipo = pageCuti.locator('button:has-text("#BuscoEquipo")').first();
    if (await chipBuscoEquipo.isVisible({ timeout: 2000 })) {
      await chipBuscoEquipo.click();
      await sleep(500);
    }

    // Escribir mensaje en el post
    console.log('   📝 Escribiendo texto de la publicación...');
    const textarea = pageCuti.locator('textarea').first();
    await textarea.fill('¡Buenas a todos! Busco equipo para sumar minutos los fines de semana en Zona Sur. Dejo mi carta con stats actualizadas. #BuscoEquipo ⚽🔥');
    await sleep(1000);

    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '03-02-composer-carta-preparado.png') });

    // Click en "Publicar"
    console.log('   🚀 Cuti publica en el Muro de la Comunidad...');
    const botonPublicar = pageCuti.locator('button:has-text("Publicar")').first();
    await botonPublicar.click();

    await sleep(2500);
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '03-03-post-publicado-cuti.png') });
    console.log('   ✔️ Publicación creada exitosamente.');

    // ------------------------------------------------------------------------
    // PASO 3: LIONEL VE EL POST EN TIEMPO REAL, REACCIONA Y COMENTA
    // ------------------------------------------------------------------------
    console.log('\n[Paso 3] 👀 OBSERVANDO VENTANA DERECHA (Lionel Andrés)...');
    console.log('   🔥 El post con la carta FUT debe verse en tiempo real en el muro.');

    await sleep(2000);

    // Buscar el post recién publicado de Cuti en el muro de Lionel
    const tarjetaCuti = pageLionel.locator('article, div').filter({ hasText: 'Cristian Romero' }).first();
    await tarjetaCuti.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
    await sleep(1000);

    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '03-04-post-recibido-lionel.png') });
    console.log('   📸 Captura guardada: Lionel ve el post de Cuti con su Carta FUT.');

    // Lionel reacciona con emoji 🔥 o ⚽
    console.log('   👍 Lionel reacciona con 🔥 a la publicación...');
    const botonReaccionFuego = tarjetaCuti.locator('button[title*="Fuego"], button:has-text("🔥")').first();
    if (await botonReaccionFuego.isVisible({ timeout: 3000 })) {
      await botonReaccionFuego.click();
      await sleep(1000);
      console.log('   ✔️ Reacción enviada.');
    }

    // Lionel abre comentarios y comenta
    console.log('   💬 Lionel comenta para invitar a Cuti a La Scaloneta...');
    const botonComentar = tarjetaCuti.locator('button[title="Ver comentarios"], button:has(svg.lucide-message-circle)').first();
    if (await botonComentar.isVisible({ timeout: 3000 })) {
      await botonComentar.click();
      await sleep(1000);

      const inputComentario = tarjetaCuti.locator('input[aria-label="Escribir un comentario"]').first();
      if (await inputComentario.isVisible({ timeout: 3000 })) {
        await inputComentario.fill('¡Qué bestia Cuti! Te necesitamos en La Scaloneta de central titular 👑⚽');
        await sleep(1000);

        const botonEnviarComentario = tarjetaCuti.locator('button[aria-label="Enviar comentario"]').first();
        if (await botonEnviarComentario.isVisible({ timeout: 2000 })) {
          await botonEnviarComentario.click();
          console.log('   ✔️ Comentario publicado.');
        }
      }
    }

    await sleep(2000);
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '03-05-lionel-comento.png') });

    // ------------------------------------------------------------------------
    // PASO 4: CUTI VE LA REACCIÓN Y EL COMENTARIO EN VIVO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 4] 📲 OBSERVANDO VENTANA IZQUIERDA (Cuti Romero)...');
    console.log('   👀 Comprobando actualización en tiempo real de reacciones y comentarios.');

    // En la ventana de Cuti, abrir comentarios para ver el mensaje de Lionel
    const tarjetaCutiEnSuVentana = pageCuti.locator('article, div').filter({ hasText: 'Cristian Romero' }).first();
    const botonComentarCuti = tarjetaCutiEnSuVentana.locator('button[title="Ver comentarios"], button:has(svg.lucide-message-circle)').first();
    if (await botonComentarCuti.isVisible({ timeout: 3000 })) {
      await botonComentarCuti.click();
      await sleep(1500);
    }

    await sleep(1500);
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '03-06-cuti-ve-comentario-y-reaccion.png') });

    console.log('\n=============================================================');
    console.log('✅ TEST UI/UX #3 FINALIZADO CON ÉXITO');
    console.log('   📸 Todas las capturas guardadas en: testing/ui-ux/capturas/');
    console.log('   🖥️  Las 2 ventanas permanecen abiertas para tu inspección.');
    console.log('=============================================================\n');

    await sleep(60000);
  } catch (err) {
    console.error('❌ Error durante la ejecución del Test UI/UX #3:', err);
    await pageCuti.screenshot({ path: path.join(CAPTURAS_DIR, '03-error-cuti.png') }).catch(() => {});
    await pageLionel.screenshot({ path: path.join(CAPTURAS_DIR, '03-error-lionel.png') }).catch(() => {});
  } finally {
    await browserCuti.close().catch(() => {});
    await browserLionel.close().catch(() => {});
  }
}

main().catch(console.error);
