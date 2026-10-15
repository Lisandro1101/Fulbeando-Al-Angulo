import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { Diagnostico, EVIDENCIAS, capturar, loginSeed, esperarRadar } from './helpers';

const diag = new Diagnostico('fase2-eventos.jsonl');
let ctx = 'setup';
const registrar = (nombre: string) => { ctx = nombre; };

test.beforeEach(async ({ page }) => {
  diag.instrumentar(page, () => ctx);
});

test.afterAll(async ({ playwright }) => {
  // Resumen final legible
  const resumen = {
    generado: new Date().toISOString(),
    totalEventos: diag.eventos.length,
    porTipo: diag.eventos.reduce<Record<string, number>>((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] ?? 0) + 1;
      return acc;
    }, {}),
    eventos: diag.eventos,
  };
  const fs = await import('node:fs');
  fs.writeFileSync(path.resolve(EVIDENCIAS, 'fase2-diagnostico.json'), JSON.stringify(resumen, null, 2), 'utf-8');
});

// ============================================================
// BLOQUE A — RADAR
// ============================================================

test('R1: el radar carga con sus 5 filtros', async ({ page }) => {
  registrar('R1');
  await loginSeed(page);
  await esperarRadar(page);

  for (const nombre of [/^Todos$/, /Canchas\s*\/\s*Predios/, /Equipos/, /Desafíos/, /Jugadores Libres/]) {
    await expect(page.getByRole('button', { name: nombre })).toBeVisible();
  }
  await capturar(page, 'f2-r1-radar-filtros');
});

test('R2: los filtros del radar muestran y ocultan marcadores', async ({ page }) => {
  registrar('R2');
  await loginSeed(page);
  await esperarRadar(page);

  const predios = page.locator('.marcador-predio');
  const equipos = page.locator('.marcador-equipo');
  const desafios = page.locator('.marcador-desafio');
  const jugadores = page.locator('.marcador-jugador');

  const conteo = {
    todos: {
      predio: await predios.count(),
      equipo: await equipos.count(),
      desafio: await desafios.count(),
      jugador: await jugadores.count(),
    },
  };

  await page.getByRole('button', { name: /Canchas\s*\/\s*Predios/ }).click();
  await page.waitForTimeout(1200);
  conteo['soloPredios'] = {
    predio: await predios.count(),
    equipo: await equipos.count(),
    desafio: await desafios.count(),
    jugador: await jugadores.count(),
  };
  await capturar(page, 'f2-r2-filtro-predios');

  await page.getByRole('button', { name: /Jugadores Libres/ }).click();
  await page.waitForTimeout(1200);
  conteo['soloJugadores'] = {
    predio: await predios.count(),
    equipo: await equipos.count(),
    desafio: await desafios.count(),
    jugador: await jugadores.count(),
  };

  await page.getByRole('button', { name: /^Todos$/ }).click();
  await page.waitForTimeout(1200);
  conteo['vueltaATodos'] = {
    predio: await predios.count(),
    equipo: await equipos.count(),
    desafio: await desafios.count(),
    jugador: await jugadores.count(),
  };

  const fs = await import('node:fs');
  fs.appendFileSync(
    path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
    JSON.stringify({ contexto: 'R2:conteos', conteo }) + '\n',
    'utf-8'
  );

  // El filtro "solo predios" no debe dejar marcadores de otros tipos
  expect(conteo['soloPredios'].equipo, 'Filtro Canchas dejó marcadores de equipo').toBe(0);
  expect(conteo['soloPredios'].jugador, 'Filtro Canchas dejó marcadores de jugador').toBe(0);
  // Volver a "Todos" debe restaurar variedad
  expect(conteo['vueltaATodos'].predio).toBe(conteo.todos.predio);
});

test('R6: diagnóstico — ¿el radar muestra algo al alejar el mapa?', async ({ page }) => {
  registrar('R6-radio');
  await loginSeed(page);
  await esperarRadar(page);

  const contar = async () => ({
    predio: await page.locator('.marcador-predio').count(),
    equipo: await page.locator('.marcador-equipo').count(),
    desafio: await page.locator('.marcador-desafio').count(),
    jugador: await page.locator('.marcador-jugador').count(),
  });

  const inicial = await contar();

  // zoomControl está en false: el único modo es rueda del mouse sobre el mapa.
  await alejarMapa(page);
  const trasAlejar = await contar();
  await capturar(page, 'f2-r6-radar-alejado');

  const fs = await import('node:fs');
  fs.appendFileSync(
    path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
    JSON.stringify({
      contexto: 'R6:resultado',
      zoomInicial: inicial,
      trasAlejar,
      veredicto:
        inicial.predio + inicial.equipo + inicial.desafio + inicial.jugador === 0
          ? 'VACÍO al abrir; ' +
            (trasAlejar.predio + trasAlejar.equipo + trasAlejar.desafio + trasAlejar.jugador > 0
              ? 'CON datos al alejar el zoom → el radio del viewport excluye los datos del seed'
              : 'SIGUE vacío al alejar → el problema no es el zoom')
          : 'Con datos desde el inicio',
    }) + '\n',
    'utf-8'
  );
});

test('R3: geolocalización concedida y denegada', async ({ page, context }) => {
  registrar('R3-geo');
  await loginSeed(page);
  await esperarRadar(page);

  const resultados: Record<string, string> = {};

  // Caso A: permiso concedido
  await context.grantPermissions(['geolocation'], { origin: 'http://localhost:5173' });
  await context.setGeolocation({ latitude: -34.6037, longitude: -58.3816 });
  const btnGeo = page.getByTitle('Mi Ubicación');
  await expect(btnGeo).toBeVisible();
  await btnGeo.click();
  await page.waitForTimeout(2500);
  resultados['conPermiso'] = page.url().includes('/radar') ? 'OK: sigue en /radar sin errores' : `URL inesperada: ${page.url()}`;
  await capturar(page, 'f2-r3-geo-concedida');

  // Caso B: permiso denegado
  await context.clearPermissions();
  const panelDenegado = page.getByText('📍 Ubicación denegada. Seleccioná una zona:');
  await btnGeo.click();
  await page.waitForTimeout(2500);
  if (await panelDenegado.isVisible().catch(() => false)) {
    resultados['denegado'] = 'OK: muestra panel de fallback';
    for (const zona of ['CABA', 'La Plata', 'Córdoba', 'Rosario']) {
      await expect(page.getByRole('button', { name: zona })).toBeVisible();
    }
    await capturar(page, 'f2-r3-geo-denegada');
  } else {
    resultados['denegado'] = 'SIN PANEL: no apareció el fallback (¿usuario.geo presente en seed?)';
  }

  const fs = await import('node:fs');
  fs.appendFileSync(
    path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
    JSON.stringify({ contexto: 'R3:resultados', resultados }) + '\n',
    'utf-8'
  );
});

test('R4: el FAB amarillo abre el modal "Mis Partidos"', async ({ page }) => {
  registrar('R4-fab');
  await loginSeed(page);
  await esperarRadar(page);

  const fab = page.locator('button.bg-amber-500.rounded-full');
  await expect(fab).toBeVisible();
  await fab.click();

  await expect(page.getByRole('heading', { name: 'Mis Partidos' })).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f2-r4-modal-partidos');

  // Cerrar con la X del modal flotante
  await page.locator('.fixed.inset-0 button:has(svg)').first().click();
  await expect(page.getByRole('heading', { name: 'Mis Partidos' })).toBeHidden({ timeout: 10_000 });
});

/** zoomControl está en false: el único modo de alejar es la rueda del mouse. */
async function alejarMapa(page: import('@playwright/test').Page, ruedas = 8) {
  const mapa = page.locator('.leaflet-container');
  const caja = (await mapa.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  for (let i = 0; i < ruedas; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
  }
  await page
    .getByText('Buscando…')
    .waitFor({ state: 'hidden', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
}

test('R5: bottom-sheet de un predio y acceso a la reserva', async ({ page }) => {
  registrar('R5-botsheet');
  await loginSeed(page);
  await esperarRadar(page);

  const marcadores = page.locator('.marcador-predio');
  const fs = await import('node:fs');

  if ((await marcadores.count()) === 0) {
    // Mismo camino que tiene que recorrer un usuario real: el radio del
    // viewport inicial no alcanza, hay que alejar el zoom.
    await alejarMapa(page);
    fs.appendFileSync(
      path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
      JSON.stringify({ contexto: 'R5:nota', nota: 'Marcadores ausentes al abrir; hubo que alejar el zoom para verlos' }) + '\n',
      'utf-8'
    );
  }

  if ((await marcadores.count()) === 0) {
    fs.appendFileSync(
      path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
      JSON.stringify({ contexto: 'R5:HALLAZGO', hallazgo: 'Sin .marcador-predio ni siquiera al alejar el zoom' }) + '\n',
      'utf-8'
    );
    test.skip(true, 'El radar sigue sin marcadores de predio');
  }

  // Deja solo marcadores de predio: superpuestos con jugadores/equipos, el
  // cliqueo queda tapado (el click cae en el marcador de arriba).
  await page.getByRole('button', { name: /Canchas\s*\/\s*Predios/ }).click();
  await page.waitForTimeout(1500);

  // Los divIcon de Leaflet se superponen entre sí y Playwright rechaza el
  // click "a granel": se dispara el evento directamente sobre el marcador.
  await marcadores.first().dispatchEvent('click');
  await page.waitForTimeout(1200);
  await capturar(page, 'f2-r5-botsheet');

  const btnReservar = page.getByRole('button', { name: 'Ver canchas y reservar' });
  await expect(btnReservar).toBeVisible({ timeout: 10_000 });
  await btnReservar.click();

  await page.waitForURL(/\/reservar\//, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Cargar seña' })).toBeVisible({ timeout: 20_000 });
  await capturar(page, 'f2-r5-llega-a-reserva');
});

// ============================================================
// BLOQUE B — RESERVA (seña)
// ============================================================

async function obtenerPredioId(request: import('@playwright/test').APIRequestContext): Promise<string | null> {
  const res = await request.get(
    'http://localhost:8080/v1/projects/fulbeando-demo/databases/(default)/documents/predios'
  );
  if (!res.ok()) return null;
  const json = await res.json();
  // Solo los verificados: `listarPrediosPublicos` (y por lo tanto la grilla de
  // turnos) los filtra por `verificado == true`.
  const verificados = (json.documents ?? []).filter(
    (d: { name: string; fields: { verificado?: { booleanValue?: boolean } } }) =>
      d.fields?.verificado?.booleanValue === true,
  );
  const doc = verificados.find((d: { name: string }) => d.name.includes('/predios/'));
  return doc ? doc.name.split('/').pop() : null;
}

async function abrirReserva(page: Page, predioId: string) {
  await page.goto(`/reservar/${predioId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Cargar seña' })).toBeVisible({ timeout: 25_000 });
  await page.waitForTimeout(2500);
}

test('S1: el formulario de seña muestra sus 3 pasos y valida el comprobante', async ({ page, request }) => {
  registrar('S1-seña');
  await loginSeed(page);

  const predioId = await obtenerPredioId(request);
  expect(predioId, 'No se encontró ningún predio en el emulador').toBeTruthy();
  await abrirReserva(page, predioId!);

  await expect(page.getByText('1. Elegí cancha y horario')).toBeVisible();
  await expect(page.getByText('2. Transferí la seña')).toBeVisible();
  await expect(page.getByText('3. Subí el comprobante')).toBeVisible();
  await expect(page.getByText('Monto de sena')).toBeVisible();
  await capturar(page, 'f2-s1-formulario');

  const hayTurnos = await page.getByText('No hay turnos disponibles para los próximos 7 días.').isVisible().catch(() => false);
  const sinCanchas = await page.getByText('Este predio todavia no publico canchas.').isVisible().catch(() => false);

  const fs = await import('node:fs');
  if (hayTurnos || sinCanchas) {
    fs.appendFileSync(
      path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
      JSON.stringify({ contexto: 'S1:HALLAZGO', hallazgo: hayTurnos ? 'Sin turnos disponibles en 7 días' : 'Predio sin canchas publicadas' }) + '\n',
      'utf-8'
    );
    test.skip(true, 'El predio de prueba no tiene turnos publicados');
  }

  // Debe auto-seleccionar el primer turno (sugerencia)
  const btnEnviar = page.getByRole('button', { name: 'Enviar solicitud' });
  await expect(btnEnviar).toBeDisabled();

  // Comprobante con tipo inválido
  await page.locator('input[type="file"]').setInputFiles(path.resolve(EVIDENCIAS, '../assets/comprobante-invalido.txt'));
  await expect(page.getByText('El comprobante tiene que ser una imagen (jpg, png o webp).')).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f2-s1-comprobante-invalido');
  await expect(btnEnviar).toBeDisabled();

  // Comprobante demasiado grande
  await page.locator('input[type="file"]').setInputFiles(path.resolve(EVIDENCIAS, '../assets/comprobante-grande.png'));
  await expect(
    page.getByText('La imagen supera los 5 MB. Bajala de peso y volve a intentar.')
  ).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f2-s1-comprobante-grande');
  await expect(btnEnviar).toBeDisabled();

  // Archivo válido → habilita el envío
  await page.locator('input[type="file"]').setInputFiles(path.resolve(EVIDENCIAS, '../assets/comprobante-valido.png'));
  await page.waitForTimeout(1000);
  await expect(btnEnviar).toBeEnabled({ timeout: 10_000 });
  await expect(page.getByText(/El turno queda bloqueado 15 minutos/)).toBeVisible();
  await capturar(page, 'f2-s1-listo-para-enviar');
});

test('S2: envío completo de la solicitud de seña', async ({ page, request }) => {
  test.setTimeout(180_000);
  registrar('S2-envio');
  await loginSeed(page);

  const predioId = await obtenerPredioId(request);
  expect(predioId).toBeTruthy();
  await abrirReserva(page, predioId!);

  const hayTurnos = await page.getByText('No hay turnos disponibles para los próximos 7 días.').isVisible().catch(() => false);
  if (hayTurnos) test.skip(true, 'Sin turnos disponibles');

  await page.locator('input[type="file"]').setInputFiles(path.resolve(EVIDENCIAS, '../assets/comprobante-valido.png'));
  const btnEnviar = page.getByRole('button', { name: 'Enviar solicitud' });
  await expect(btnEnviar).toBeEnabled({ timeout: 10_000 });

  await btnEnviar.click();

  try {
    await expect(page.getByRole('heading', { name: 'Solicitud enviada' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Esperando validacion del predio')).toBeVisible({ timeout: 20_000 });
    await capturar(page, 'f2-s2-solicitud-enviada');

    // Coherencia de montos: la seña nunca puede superar al total.
    const detalle = await page.locator('body').innerText();
    const total = Number((detalle.match(/Total\s*\$\s*([\d.]+)/)?.[1] ?? '0').replace(/\./g, ''));
    const sena = Number((detalle.match(/[Ss]e[nñ]a\s*\$\s*([\d.]+)/)?.[1] ?? '0').replace(/\./g, ''));

    // ¿A dónde lleva "Ver mis partidos"?
    let urlFinal = '(no se pudo navegar)';
    try {
      await page.getByRole('link', { name: 'Ver mis partidos' }).click();
      await page.waitForTimeout(2500);
      urlFinal = page.url();
    } catch {
      urlFinal = 'link no encontrado';
    }

    const fs = await import('node:fs');
    fs.appendFileSync(
      path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
      JSON.stringify({
        contexto: 'S2:veredicto',
        total,
        sena,
        senaSuperaAlTotal: sena > total,
        urlTrasVerMisPartidos: urlFinal,
      }) + '\n',
      'utf-8'
    );
  } catch (e) {
    // Deja evidencia del estado final de la pantalla (error visible, toast, etc.)
    await capturar(page, 'f2-s2-error-envio');
    const cuerpo = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);
    const fs = await import('node:fs');
    fs.appendFileSync(
      path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
      JSON.stringify({ contexto: 'S2:FALLO', cuerpo }) + '\n',
      'utf-8'
    );
    throw e;
  }
});

// ============================================================
// BLOQUE C — EQUIPO
// ============================================================

test('E1: invitar jugador — búsqueda y estados', async ({ page }) => {
  registrar('E1-invitar');
  await loginSeed(page);
  await page.goto('/equipo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /LA SCALONETA F5/i })).toBeVisible({ timeout: 25_000 });

  await page.getByRole('button', { name: '+ Invitar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Invitar Jugador' })).toBeVisible();

  const input = page.getByPlaceholder('buscar por nombre o apellido');
  const msgSinResultados = page.getByText('No encontramos a nadie con ese nombre');

  // 1 solo carácter → no debe lanzar búsqueda ni mensaje
  await input.fill('a');
  await page.waitForTimeout(1500);
  expect(await msgSinResultados.isVisible().catch(() => false), 'Busca con menos de 2 caracteres').toBeFalsy();
  await capturar(page, 'f2-e1-invitar-1char');

  // Texto sin resultados
  await input.fill('zzzzzz');
  await expect(msgSinResultados).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f2-e1-invitar-sin-resultados');

  // Búsqueda real (usuarios del seed). El resultado es un <div onClick>, no un <button>.
  await input.fill('Diego');
  await expect(msgSinResultados).toBeHidden({ timeout: 10_000 });
  const resultado = page.locator('div.cursor-pointer').filter({ hasText: 'Diego' }).first();
  await expect(resultado).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f2-e1-invitar-con-resultados');

  await resultado.click();
  await expect(page.getByText(/^Invitás a /)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Copiar link de invitación' })).toBeEnabled();
  await capturar(page, 'f2-e1-invitar-seleccionado');

  const busquedaDiego = 'resultados + selección OK';
  const fs = await import('node:fs');
  fs.appendFileSync(
    path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
    JSON.stringify({ contexto: 'E1:resultado', busquedaDiego }) + '\n',
    'utf-8'
  );
});

test('E2: armar convocatoria', async ({ page }) => {
  registrar('E2-convocatoria');
  await loginSeed(page);
  await page.goto('/equipo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /LA SCALONETA F5/i })).toBeVisible({ timeout: 25_000 });

  const btnConv = page.getByRole('button', { name: '+ Armar Convocatoria' }).first();
  await expect(btnConv).toBeVisible({ timeout: 20_000 });
  await btnConv.click();

  await expect(page.getByRole('heading', { name: 'Armar Convocatoria' })).toBeVisible();
  const inputFecha = page.locator('input[type="text"]').last();
  await expect(inputFecha).toHaveValue('Jueves 21:00hs');

  await page.getByRole('button', { name: 'Abrir Convocatoria' }).click();
  await expect(page.getByText('Convocatoria creada')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Próximo Partido')).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f2-e2-convocatoria');
});

test('E3: configuración del equipo', async ({ page }) => {
  registrar('E3-config');
  await loginSeed(page);
  await page.goto('/equipo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /LA SCALONETA F5/i })).toBeVisible({ timeout: 25_000 });

  const gear = page.locator('button:has(svg.lucide-settings)').first();
  await expect(gear).toBeVisible({ timeout: 20_000 });
  await gear.click();

  await expect(page.getByRole('heading', { name: 'Configurar Equipo' })).toBeVisible();
  await capturar(page, 'f2-e3-config-abierta');

  // Guardar sin modificar → no debe alterar datos del seed
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(page.getByText('Equipo actualizado')).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f2-e3-config-guardada');
});

test('E4: crear equipo — validación y alta', async ({ page }) => {
  registrar('E4-crear');
  await loginSeed(page);
  await page.goto('/equipo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /LA SCALONETA F5/i })).toBeVisible({ timeout: 25_000 });

  const btnCrearTab = page.getByTitle('Crear otro equipo');
  await expect(btnCrearTab).toBeVisible({ timeout: 20_000 });
  await btnCrearTab.click();

  await expect(page.getByRole('heading', { name: 'Crear equipo' })).toBeVisible();

  // Validación: nombre vacío
  await page.getByRole('button', { name: 'Crear equipo', exact: true }).click();
  await expect(page.getByText('Poné un nombre para el equipo')).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f2-e4-crear-validacion');

  // Alta real
  await page.getByPlaceholder('Los Pibes de Lomas').fill('QA Smoke Fase 2');
  const modal = page.locator('.fixed, [role="dialog"]').filter({ hasText: 'Quedás como capitán' }).last();
  await modal.getByRole('button', { name: 'F7', exact: true }).click();
  await modal.getByRole('button', { name: 'Mixto', exact: true }).click();
  await modal.getByRole('button', { name: 'Crear equipo', exact: true }).click();

  await expect(page.getByText('Equipo "QA Smoke Fase 2" creado')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Plantel \(1\/23\)/)).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f2-e4-crear-exito');
});

// ============================================================
// BLOQUE D — PARTIDOS
// ============================================================

test('P1: lanzar desafío al radar', async ({ page }) => {
  registrar('P1-desafio');
  await loginSeed(page);
  await page.goto('/partidos', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Mis Partidos' })).toBeVisible({ timeout: 25_000 });

  await page.getByRole('button', { name: '+ Lanzar Desafío' }).click();
  await expect(page.getByRole('heading', { name: 'Lanzar Desafío al Radar' })).toBeVisible();

  const btnPublicar = page.getByRole('button', { name: 'PUBLICAR EN RADAR' });
  await expect(btnPublicar).toBeDisabled();
  await capturar(page, 'f2-p1-form-sin-fecha');

  await page.locator('input[type="datetime-local"]').fill('2026-11-05T21:00');
  await expect(btnPublicar).toBeEnabled();

  await page.locator('select').last().selectOption({ label: 'No, buscamos cancha a medias' });
  await btnPublicar.click();

  await expect(page.getByText('Partido publicado en el Radar')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Buscando rival...').last()).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f2-p1-desafio-publicado');
});

test('P2: "Reservar Cancha" navega al radar', async ({ page }) => {
  registrar('P2-reservar-cancha');
  await loginSeed(page);
  await page.goto('/partidos', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Mis Partidos' })).toBeVisible({ timeout: 25_000 });

  await page.getByRole('button', { name: 'Reservar Cancha' }).first().click();
  await page.waitForURL(/\/radar/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Todos$/ })).toBeVisible({ timeout: 20_000 });
  await capturar(page, 'f2-p2-derivado-al-radar');
});

// ============================================================
// BLOQUE E — OTROS
// ============================================================

test('T1: /turnos es una pantalla placeholder sin acciones', async ({ page }) => {
  registrar('T1-turnos');
  await loginSeed(page);
  await page.goto('/turnos', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Tus Reservas' })).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText('Acá vas a poder ver todos los turnos que tenés reservados o en espera de confirmación.')
  ).toBeVisible();

  const botones = await page.locator('main button').count();
  const fs = await import('node:fs');
  fs.appendFileSync(
    path.resolve(EVIDENCIAS, 'fase2-eventos.jsonl'),
    JSON.stringify({ contexto: 'T1:hallazgo', botonesEnMain: botones, nota: 'Pantalla sin listado real ni acciones' }) + '\n',
    'utf-8'
  );
  await capturar(page, 'f2-t1-turnos');
});
