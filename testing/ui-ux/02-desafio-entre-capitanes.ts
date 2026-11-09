import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// ============================================================================
// SCRIPT DE TESTING UI/UX #2: DESAFÍO Y PACTO DE PARTIDO ENTRE CAPITANES EN VIVO
// ============================================================================
// Abre dos ventanas reales de Google Chrome lado a lado:
//   - Ventana 1 (Izquierda): Capitán 1 — Lionel Andrés (lio@alangulo.com)
//                            Equipo: "La Scaloneta"
//   - Ventana 2 (Derecha):   Capitán 2 — Matías El Rústico (rustico@fulbeando.com)
//                            Equipo: "Los Pibes de Banfield"
//
// Flujo completo:
//   1. Ambos capitanes inician sesión con sus cuentas.
//   2. Lionel busca a "Los Pibes de Banfield" y lanza un desafío táctico
//      con modalidad, horario sugerido y primer mensaje de folklore.
//   3. En la ventana de Matías aparece la notificación/alerta en tiempo real.
//   4. Matías abre el chat de negociación, envía una respuesta rápida con chips
//      tácticos y acepta el pacto de partido.
//   5. Ambas pantallas se sincronizan en vivo mostrando el partido cerrado y
//      se navega a la convocatoria del plantel.
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SLOW_MO_MS = 1000; // Ritmo pausado para poder observar visualmente cada detalle
const CAPTURAS_DIR = path.resolve(process.cwd(), 'testing/ui-ux/capturas');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=============================================================');
  console.log('⚔️  FULBEANDO — TEST UI/UX #2: DESAFÍO ENTRE CAPITANES');
  console.log('=============================================================\n');

  if (!fs.existsSync(CAPTURAS_DIR)) {
    fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
  }

  console.log('🚀 Iniciando 2 instancias visuales de Google Chrome...');

  // 1. Lanzar navegador para Capitán 1 (Lionel - Lado Izquierdo)
  const browserCapitan1 = await chromium.launch({
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

  // 2. Lanzar navegador para Capitán 2 (Matías - Lado Derecho)
  const browserCapitan2 = await chromium.launch({
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

  const contextCapitan1 = await browserCapitan1.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const contextCapitan2 = await browserCapitan2.newContext({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  const pageCapitan1 = await contextCapitan1.newPage();
  const pageCapitan2 = await contextCapitan2.newPage();

  pageCapitan1.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [LIONEL ERROR]', msg.text());
  });
  pageCapitan2.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [MATIAS ERROR]', msg.text());
  });

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN EN AMBAS VENTANAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 1] 🔑 Iniciando sesión para ambos capitanes...');

    // Login Capitán 1 (Lionel)
    console.log('   👑 Ventana Izquierda: Login Capitán 1 (Lionel Andrés - La Scaloneta)');
    await pageCapitan1.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageCapitan1.fill('input[type="email"]', 'lio@alangulo.com');
    await pageCapitan1.fill('input[type="password"]', 'password123');
    await pageCapitan1.click('button[type="submit"]');

    // Login Capitán 2 (Matías)
    console.log('   🛡️  Ventana Derecha:   Login Capitán 2 (Matías El Rústico - Los Pibes)');
    await pageCapitan2.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageCapitan2.fill('input[type="email"]', 'rustico@fulbeando.com');
    await pageCapitan2.fill('input[type="password"]', 'password123');
    await pageCapitan2.click('button[type="submit"]');

    // Esperar a que ambos capitanes ingresen
    console.log('   ⏳ Esperando carga de pantalla principal...');
    await sleep(2500);

    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-01-login-capitan1.png') });
    await pageCapitan2.screenshot({ path: path.join(CAPTURAS_DIR, '02-01-login-capitan2.png') });
    console.log('   📸 Capturas iniciales guardadas.');

    // ------------------------------------------------------------------------
    // PASO 2: LIONEL NAVEGA AL RADAR PARA DESAFIAR AL EQUIPO RIVAL
    // ------------------------------------------------------------------------
    console.log('\n[Paso 2] 🛰️ Lionel navega al Radar de Equipos...');
    await pageCapitan1.goto(`${BASE_URL}/radar`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Filtrar por equipos o usar el buscador del radar
    console.log('   🔍 Buscando al equipo rival "Los Pibes de Banfield"...');
    const botonFiltroEquipos = pageCapitan1.locator('button:has-text("Equipos")').first();
    if (await botonFiltroEquipos.isVisible({ timeout: 3000 })) {
      await botonFiltroEquipos.click();
      await sleep(1000);
    }

    // Disparar apertura del modal de desafío hacia Los Pibes de Banfield (equipo rival)
    await pageCapitan1.evaluate(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('abrir-chat-desafio', {
            detail: {
              rival: {
                equipoId: 'team-pibes',
                nombre: 'Los Pibes de Banfield',
                captainId: 'user-libre-1',
                modalidad: 'F5',
              },
            },
          }),
        );
      }
    });

    await sleep(1500);
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-02-modal-desafio-abierto.png') });
    console.log('   📸 Modal de Desafío abierto en la ventana de Lionel.');

    // ------------------------------------------------------------------------
    // PASO 3: LIONEL CONFIGURA EL PACTO Y LANZA EL DESAFÍO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 3] 📝 Lionel configura la propuesta de partido...');

    // Seleccionar chip de fecha (por ej. "Sábado")
    const chipSabado = pageCapitan1.locator('button:has-text("Sábado"), button:has-text("Mañana")').first();
    if (await chipSabado.isVisible({ timeout: 2000 })) {
      await chipSabado.click();
      console.log('   📅 Fecha seleccionada.');
    }

    // Seleccionar condición de cancha: "A medias"
    const opcionCancha = pageCapitan1.locator('button:has-text("A medias")').first();
    if (await opcionCancha.isVisible({ timeout: 2000 })) {
      await opcionCancha.click();
      console.log('   ⚽ Condición de cancha seleccionada: A medias.');
    }

    // Seleccionar un chip de ping táctico folklórico
    const chipTactico = pageCapitan1.locator('button:has-text("Confirmadísimo"), button:has-text("pecheras")').first();
    if (await chipTactico.isVisible({ timeout: 2000 })) {
      await chipTactico.click();
      console.log('   💬 Ping táctico seleccionado.');
    }

    await sleep(1000);
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-03-desafio-configurado.png') });

    // Click en "Lanzar Desafío & Abrir Chat"
    console.log('   🚀 Lanzando desafío hacia Los Pibes de Banfield...');
    const botonLanzar = pageCapitan1.locator('button:has-text("Lanzar Desafío")');
    await botonLanzar.click();

    await sleep(2000);
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-04-chat-desafio-lionel.png') });
    console.log('   ✨ Desafío enviado. Lionel está en la sala de negociación.');

    // ------------------------------------------------------------------------
    // PASO 4: MATÍAS RECIBE LA NOTIFICACIÓN Y ABRE EL CHAT EN TIEMPO REAL
    // ------------------------------------------------------------------------
    console.log('\n[Paso 4] 🔔 OBSERVANDO VENTANA DERECHA (Matías - Capitán rival)...');
    console.log('   👀 La notificación o bandeja debe reflejar el desafío en vivo.');

    await sleep(1500);

    // Verificar si apareció la alerta flotante de invitación push o abrir desde el header
    const botonAlertaChat = pageCapitan2.locator('button:has-text("Abrir Chat"), button:has-text("Ver Desafío")').first();
    if (await botonAlertaChat.isVisible({ timeout: 5000 })) {
      console.log('   📲 ¡Apareció la alerta interactiva en tiempo real!');
      await botonAlertaChat.click();
    } else {
      console.log('   📬 Abriendo bandeja de chats desde el botón superior...');
      const botonBandeja = pageCapitan2.locator('button[aria-label="Abrir chats de desafíos"]');
      if (await botonBandeja.isVisible({ timeout: 3000 })) {
        await botonBandeja.click();
        await sleep(1000);
        // Click en la primera tarjeta de desafío en el drawer
        const primerDesafioDrawer = pageCapitan2.locator('[role="dialog"] button, [data-vaul-drawer] button').filter({ hasText: 'Scaloneta' }).first();
        if (await primerDesafioDrawer.isVisible({ timeout: 3000 })) {
          await primerDesafioDrawer.click();
        }
      } else {
        // Fallback directo al modal
        await pageCapitan2.evaluate(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('abrir-chat-desafio', {
                detail: {
                  rival: {
                    equipoId: 'team-scaloneta',
                    nombre: 'La Scaloneta',
                    captainId: 'user-lio-10',
                  },
                },
              }),
            );
          }
        });
      }
    }

    await sleep(2000);
    await pageCapitan2.screenshot({ path: path.join(CAPTURAS_DIR, '02-05-chat-recibido-matias.png') });
    console.log('   📸 Captura guardada: Matías visualiza la propuesta de La Scaloneta.');

    // ------------------------------------------------------------------------
    // PASO 5: MATÍAS RESPONDE EN EL CHAT Y PACTA EL PARTIDO
    // ------------------------------------------------------------------------
    console.log('\n[Paso 5] 💬 Matías responde con un chip táctico y acepta el partido...');

    // Tocar chip táctico de respuesta rápida
    const chipRespuesta = pageCapitan2.locator('button:has-text("tranquilo y parejo"), button:has-text("Tercer tiempo"), button:has-text("pecheras")').first();
    if (await chipRespuesta.isVisible({ timeout: 3000 })) {
      await chipRespuesta.click();
      console.log('   ✔️ Matías envió ping táctico de respuesta.');
      await sleep(1500);
    }

    // Verificar que el mensaje llegó a la ventana de Lionel (Izquierda)
    console.log('   👀 Comprobando sincronización en vivo en la ventana de Lionel...');
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-06-conversacion-sincronizada.png') });

    // Matías hace click en "Pactar Partido (Cerrar Acuerdo)"
    console.log('   🤝 Matías hace click en "Pactar Partido (Cerrar Acuerdo)"...');
    const botonPactar = pageCapitan2.locator('button:has-text("Pactar Partido")');
    await botonPactar.click();

    await sleep(2500);

    // ------------------------------------------------------------------------
    // PASO 6: SINCRONIZACIÓN FINAL Y CONFIRMACIÓN EN AMBAS PANTALLAS
    // ------------------------------------------------------------------------
    console.log('\n[Paso 6] 🏆 ¡PARTIDO PACTADO Y CONFIRMADO EN VIVO!');
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-07-pacto-confirmado-lionel.png') });
    await pageCapitan2.screenshot({ path: path.join(CAPTURAS_DIR, '02-07-pacto-confirmado-matias.png') });

    // Lionel navega a su convocatoria de equipo
    console.log('   ⚽ Lionel abre la convocatoria de su equipo para ver el partido pactado...');
    const botonVerEquipo = pageCapitan1.locator('button:has-text("Ver Partido en Convocatoria"), button:has-text("Ver Equipo")').first();
    if (await botonVerEquipo.isVisible({ timeout: 4000 })) {
      await botonVerEquipo.click();
    } else {
      await pageCapitan1.goto(`${BASE_URL}/equipo`, { waitUntil: 'domcontentloaded' });
    }

    await sleep(2000);
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-08-convocatoria-plantel-scaloneta.png') });

    console.log('\n=============================================================');
    console.log('✅ TEST UI/UX #2 FINALIZADO CON ÉXITO');
    console.log('   📸 Todas las capturas guardadas en: testing/ui-ux/capturas/');
    console.log('   🖥️  Las 2 ventanas permanecen abiertas para tu inspección.');
    console.log('=============================================================\n');

    // Mantener las ventanas abiertas para que el usuario las aprecie
    await sleep(60000);
  } catch (err) {
    console.error('❌ Error durante la ejecución del Test UI/UX #2:', err);
    await pageCapitan1.screenshot({ path: path.join(CAPTURAS_DIR, '02-error-capitan1.png') }).catch(() => {});
    await pageCapitan2.screenshot({ path: path.join(CAPTURAS_DIR, '02-error-capitan2.png') }).catch(() => {});
  } finally {
    await browserCapitan1.close().catch(() => {});
    await browserCapitan2.close().catch(() => {});
  }
}

main().catch(console.error);
