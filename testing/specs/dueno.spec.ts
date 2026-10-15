import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { Diagnostico, EVIDENCIAS, capturar } from './helpers';

const diag = new Diagnostico('fase3-eventos.jsonl');
let ctx = 'setup';
const registrar = (n: string) => {
  ctx = n;
};

const FIRESTORE = 'http://localhost:8080/v1/projects/fulbeando-demo/databases/(default)/documents';
const AUTH =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=k';
const PW = 'password123';
const DUEÑO = 'dueno@fulbeando.com';

/** Cuenta creada en D8 y reutilizada por D10. */
let cuentaFase3: { email: string } | null = null;

// Archivo propio de hallazgos: separado del que usa `Diagnostico`, que lo
// trunca al importar el módulo.
const HALLAZGOS = path.resolve(EVIDENCIAS, 'fase3-hallazgos.jsonl');
fs.writeFileSync(HALLAZGOS, '', 'utf-8');

const anotar = (que: string, datos: Record<string, unknown> = {}) => {
  fs.appendFileSync(
    HALLAZGOS,
    JSON.stringify({ contexto: `${ctx}:${que}`, ...datos }) + '\n',
    'utf-8',
  );
};

test.beforeEach(async ({ page }) => {
  diag.instrumentar(page, () => ctx);
});

test.afterAll(async () => {
  const resumen = {
    generado: new Date().toISOString(),
    totalEventos: diag.eventos.length,
    porTipo: diag.eventos.reduce<Record<string, number>>((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] ?? 0) + 1;
      return acc;
    }, {}),
    eventos: diag.eventos,
  };
  fs.writeFileSync(
    path.resolve(EVIDENCIAS, 'fase3-diagnostico.json'),
    JSON.stringify(resumen, null, 2),
    'utf-8',
  );
});

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

async function ingresar(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(PW);
  await page.getByRole('button', { name: /INGRESAR/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function abrirPanel(page: Page) {
  await page.goto('/venue-dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Panel del predio' })).toBeVisible({
    timeout: 30_000,
  });
  // La cola y la grilla solo se pintan cuando terminó de cargar la lista de
  // predios: hasta ese momento el selector de predios todavía no existe.
  await expect(page.getByRole('heading', { name: /^Solicitudes por validar/ })).toBeVisible({
    timeout: 30_000,
  });
  // Si el dueño tiene mas de un predio, fijamos El Templo para no depender del orden.
  const selector = page.getByRole('button', { name: /El Templo/ });
  if (await selector.count().catch(() => 0)) {
    await selector.first().click();
    await page.waitForTimeout(2500);
  }
}

async function pendientes(page: Page): Promise<number> {
  const h = page.getByRole('heading', { name: /^Solicitudes por validar/ });
  await expect(h).toBeVisible({ timeout: 20_000 });
  const t = await h.innerText();
  return Number(/\((\d+)\)/.exec(t)?.[1] ?? '-1');
}

async function abrirSolicitud(page: Page) {
  await page.getByRole('button', { name: /Pendiente/ }).first().click();
  const modal = page.getByRole('dialog', { name: 'Validar solicitud de turno' });
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByRole('heading', { name: 'Validar solicitud' })).toBeVisible();
  return modal;
}

async function estadoDelComprobante(modal: any) {
  await expect(modal.getByText('Comprobante', { exact: true })).toBeVisible({ timeout: 20_000 });
  // getDownloadURL + la petición del <img> son asincrónicas: damos tiempo a que
  // se asiente el estado final (imagen o mensaje de error).
  await modal.page().waitForTimeout(4000);

  const img = modal.getByAltText('Comprobante de transferencia');
  const imagen = await img.isVisible().catch(() => false);
  const naturalWidth = imagen
    ? await img.evaluate((el: HTMLImageElement) => el.naturalWidth).catch(() => 0)
    : 0;

  const aviso = modal.getByText(
    /(Sin comprobante adjunto|No encontramos el comprobante de esta solicitud|No pudimos abrir el comprobante)/,
  );
  const texto = (await aviso.first().innerText().catch(() => '')) || '';

  return {
    imagen,
    naturalWidth,
    mensaje: texto,
    aprobacionHabilitada: await modal
      .getByRole('button', { name: '¿Aprobar turno?' })
      .isEnabled()
      .catch(() => false),
  };
}

async function entrar(request: APIRequestContext, email: string) {
  const res = await request.post(AUTH, { data: { email, password: PW, returnSecureToken: true } });
  if (!res.ok()) throw new Error(`signIn falló (${email}): ${await res.text()}`);
  const j = await res.json();
  return { uid: j.localId as string, idToken: j.idToken as string };
}

/** Convierte un valor tipado de la REST API de Firestore en JS puro. */
function valorDe(v: any): any {
  if (v === null || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(valorDe);
  if ('mapValue' in v) return camposDe(v.mapValue.fields ?? {});
  return v;
}

/** Convierte un mapa `fields` completo. */
function camposDe(f: any) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(f ?? {})) out[k] = valorDe(v);
  return out;
}

async function traerDoc(request: APIRequestContext, idToken: string, ruta: string) {
  const res = await request.get(`${FIRESTORE}/${ruta}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok()) return null;
  return camposDe((await res.json()).fields ?? {});
}

async function listarDocs(request: APIRequestContext, coleccion: string, idToken?: string) {
  const res = await request.get(`${FIRESTORE}/${coleccion}?pageSize=200`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  if (!res.ok()) return [];
  const j = await res.json();
  return (j.documents ?? []).map((d: any) => ({
    id: String(d.name).split('/').pop(),
    ...camposDe(d.fields ?? {}),
  }));
}

/**
 * Fecha y día de la semana segun el RELOJ DEL NAVEGADOR (Playwright fija la
 * timezone en America/Argentina/Buenos_Aires). Si se calcula en Node puede
 * desfasarse respecto de `aFechaISO()` que usa la app.
 */
async function hoyYdia(page: Page) {
  return page.evaluate(() => {
    const a = new Date();
    const iso = `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(
      a.getDate(),
    ).padStart(2, '0')}`;
    const etiquetas = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    return { iso, etiqueta: etiquetas[a.getDay()]! };
  });
}

/**
 * Arma una solicitud pendiente (turno bloqueado + comprobante) si el panel no
 * tiene ninguna. Reproduce lo que hace `solicitarTurno` en la app, pero por la
 * REST API, para que D2/D3 puedan correr en cualquier orden y re-ejecutarse.
 */
const COMPROBANTE_EXISTENTE =
  'comprobantes/user-lio-10/predio-lanus-01~cancha-1~2026-10-12T18:00/1791768664194-comprobante-valido.png';

async function asegurarSolicitudPendiente(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${FIRESTORE}/turnos?pageSize=200`);
  const docs: any[] = (await res.json()).documents ?? [];

  const pendiente = docs.find((d) => d.fields?.estado?.stringValue === 'bloqueado_temporal');
  if (pendiente) return String(pendiente.name).split('/').pop()!;

  const candidatos = docs
    .filter(
      (d) =>
        String(d.name).includes('/predio-lanus-01~') &&
        d.fields?.estado?.stringValue === 'disponible' &&
        !d.fields?.organizadorUid?.stringValue,
    )
    .sort((a, b) => (String(a.name).includes('2026-10-12') ? -1 : 1));
  if (candidatos.length === 0) throw new Error('No hay turnos disponibles para armar la solicitud');
  const turnoId = String(candidatos[0]!.name).split('/').pop()!;

  const { uid, idToken } = await entrar(request, 'lio@alangulo.com');
  const headers = { Authorization: `Bearer ${idToken}` };
  const hasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const bloqueo = await request.patch(
    `${FIRESTORE}/turnos/${encodeURIComponent(turnoId)}?updateMask.fieldPaths=estado` +
      '&updateMask.fieldPaths=organizadorUid' +
      '&updateMask.fieldPaths=bloqueadoHasta' +
      '&updateMask.fieldPaths=comprobantePendiente',
    {
      headers,
      data: {
        fields: {
          estado: { stringValue: 'bloqueado_temporal' },
          organizadorUid: { stringValue: uid },
          bloqueadoHasta: { timestampValue: hasta },
          comprobantePendiente: { booleanValue: true },
        },
      },
    },
  );
  if (!bloqueo.ok()) throw new Error(`No se pudo bloquear el turno: ${await bloqueo.text()}`);

  const yaExiste = await request.get(`${FIRESTORE}/comprobantes/${encodeURIComponent(turnoId)}`, {
    headers,
  });
  if (!yaExiste.ok()) {
    const alta = await request.post(`${FIRESTORE}/comprobantes?documentId=${encodeURIComponent(turnoId)}`, {
      headers,
      data: {
        fields: {
          turnoId: { stringValue: turnoId },
          organizadorUid: { stringValue: uid },
          storagePath: { stringValue: COMPROBANTE_EXISTENTE },
          mimeType: { stringValue: 'image/png' },
          sizeBytes: { integerValue: '70' },
          alias: { stringValue: 'eltemplo.futbol' },
          monto: { integerValue: '12000' },
          subidoAt: { timestampValue: new Date().toISOString() },
          verificado: { booleanValue: false },
          revisadoPor: { nullValue: null },
          revisadoAt: { nullValue: null },
          motivoRechazo: { nullValue: null },
        },
      },
    });
    if (!alta.ok()) throw new Error(`No se pudo crear el comprobante: ${await alta.text()}`);
  }

  anotar('fixture', { turnoId, accion: 'solicitud pendiente rearmada por REST' });
  return turnoId;
}

/* ================================================================ */
/* BLOQUE A — PANEL DEL DUEÑO                                        */
/* ================================================================ */

test('D1: el panel del dueño carga con sus bloques', async ({ page }) => {
  registrar('D1-panel');
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  await expect(page.getByRole('heading', { name: 'Panel del predio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'VER/EDITAR CANCHAS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cargar turnos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Solicitudes por validar/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grilla de hoy' })).toBeVisible();

  const n = await pendientes(page);
  const sinTurnosHoy = await page
    .getByText('No hay turnos cargados para esta fecha.')
    .isVisible()
    .catch(() => false);

  anotar('estado', {
    solicitudesPendientes: n,
    grillaDeHoyVacia: sinTurnosHoy,
    nota: 'El fixture de la Fase 2 creó turnos desde el 12/10; el día de hoy queda sin turnos.',
  });

  await capturar(page, 'f3-d1-panel');
  anotar('veredicto', {
    estructuraCompleta: true,
    solicitudesPendientes: n,
    nota: 'El número depende de D2/D3; la estructura del panel es lo que se valida acá.',
  });
});

test('D2: rechazar una solicitud pide motivo y descuenta el contador', async ({ page, request }) => {
  registrar('D2-rechazo');
  await asegurarSolicitudPendiente(request);
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  const antes = await pendientes(page);
  expect(antes).toBeGreaterThan(0);

  const modal = await abrirSolicitud(page);
  const comprobante = await estadoDelComprobante(modal);
  anotar('comprobante', comprobante);
  await capturar(page, 'f3-d2-modal-validacion');

  const btnRechazar = modal.getByRole('button', { name: 'Rechazar' });
  await btnRechazar.click();

  // Sin motivo escrito no debe cerrar ni rechazar: solo revela el textarea.
  await expect(modal.getByLabel('Motivo del rechazo')).toBeVisible({ timeout: 10_000 });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByPlaceholder('Ej: el alias no coincide con el del predio'),
  ).toBeVisible();
  await capturar(page, 'f3-d2-motivo-revelado');

  await modal.locator('#motivo-rechazo').fill('QA Fase 3: el alias no coincide con el del predio');
  await btnRechazar.click();
  await expect(modal).toBeHidden({ timeout: 25_000 });

  const despues = await pendientes(page);
  anotar('resultado', { antes, despues, comprobante });
  await capturar(page, 'f3-d2-tras-rechazo');

  expect(despues, 'El rechazo no descuenta la cola de validación').toBe(antes - 1);
});

test('D3: aprobar la solicitud confirma el turno en la grilla', async ({ page, request }) => {
  registrar('D3-aprobacion');
  await asegurarSolicitudPendiente(request);
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  const antes = await pendientes(page);
  expect(antes).toBeGreaterThan(0);

  const modal = await abrirSolicitud(page);
  const comprobante = await estadoDelComprobante(modal);
  anotar('comprobante', comprobante);
  await capturar(page, 'f3-d3-modal-validacion');

  // HALLAZGO: el dueño puede ver la imagen del comprobante que tiene que validar.
  anotar('HALLAZGO', {
    severidad: comprobante.imagen && comprobante.naturalWidth > 0 ? 'OK' : 'ALTA',
    titulo: 'El dueño no puede ver la imagen del comprobante',
    imagenVisible: comprobante.imagen,
    naturalWidth: comprobante.naturalWidth,
    mensajeEnPantalla: comprobante.mensaje,
    aprobacionHabilitada: comprobante.aprobacionHabilitada,
    nota: 'Si la imagen falla pero el botón "¿Aprobar turno?" queda habilitado, el dueño valida a ciegas.',
  });

  const btnAprobar = modal.getByRole('button', { name: '¿Aprobar turno?' });
  expect(
    comprobante.aprobacionHabilitada,
    `No se puede aprobar la solicitud: "${comprobante.mensaje || 'sin mensaje'}"`,
  ).toBe(true);

  await btnAprobar.click();
  await expect(modal).toBeHidden({ timeout: 25_000 });

  const despues = await pendientes(page);
  anotar('resultado', { antes, despues });
  expect(despues, 'La aprobación no descuenta la cola de validación').toBe(antes - 1);

  // El turno aprobado pasa a "Reservado" en la grilla del día que le corresponde.
  const dia = page.getByRole('button', { name: /12 oct/ }).first();
  if (await dia.count().catch(() => 0)) {
    await dia.click();
    await page.waitForTimeout(1500);
    const celda = page.getByRole('button', { name: /18:00: Reservado/ });
    await expect(celda.first()).toBeVisible({ timeout: 15_000 });
    anotar('grilla', { celdasReservadas: await celda.count() });
    await capturar(page, 'f3-d3-grilla-reservada');
  }
});

test('D4: gestor de canchas — listado y validaciones del formulario', async ({ page }) => {
  registrar('D4-canchas');
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  await page.getByRole('button', { name: 'VER/EDITAR CANCHAS' }).click();
  const modal = page.getByRole('dialog').filter({ hasText: 'Gestor de Canchas' });
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByRole('heading', { name: 'Gestor de Canchas' })).toBeVisible();

  await expect(modal.getByText(/La Bombonerita/)).toBeVisible();
  await expect(modal.getByText(/La Techada/)).toBeVisible();
  await expect(modal.getByText(/por turno/).first()).toBeVisible();
  await capturar(page, 'f3-d4-gestor');

  // Alta sin completar: el formulario debe rechazar en el cliente.
  const form = modal.locator('form').last();
  if (!(await form.getByPlaceholder('Cancha 1 - Sintetico').isVisible().catch(() => false))) {
    await modal.locator('summary').click();
  }
  await expect(form.getByPlaceholder('Cancha 1 - Sintetico')).toBeVisible({ timeout: 10_000 });

  await form.getByRole('button', { name: 'Agregar cancha' }).click();
  const errores = [
    await form.getByText('Ponele un nombre de al menos 3 letras.').isVisible().catch(() => false),
    await form.getByText('El precio tiene que ser mayor a cero.').isVisible().catch(() => false),
  ];
  anotar('validaciones', { nombreVacio: errores[0], precioVacio: errores[1] });
  await capturar(page, 'f3-d4-validaciones');

  expect(errores[0], 'Sin validación de nombre en el alta de cancha').toBe(true);
  expect(errores[1], 'Sin validación de precio en el alta de cancha').toBe(true);

  // No creamos canchas: cerramos el modal tal cual.
  await modal.getByRole('button', { name: 'Cerrar' }).click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
});

/* ================================================================ */
/* BLOQUE B — GENERADOR DE GRILLA                                    */
/* ================================================================ */

async function abrirGenerador(page: Page) {
  await page.getByRole('button', { name: 'Cargar turnos' }).click();
  const gen = page.getByRole('dialog').filter({ hasText: 'Cargar turnos a mano' });
  await expect(gen).toBeVisible({ timeout: 15_000 });
  await expect(
    gen.getByText(/(Sena por turno|no tiene canchas activas)/),
    'El generador no terminó de cargar las canchas del predio activo',
  ).toBeVisible({ timeout: 25_000 });
  const sinCanchas = await gen
    .getByText('Este predio no tiene canchas activas, asi que no hay nada que generar.')
    .isVisible()
    .catch(() => false);
  if (sinCanchas) throw new Error('El predio activo no tiene canchas: el panel quedó en el predio equivocado');
  return gen;
}

test('D5: generador de grilla — validaciones de franjas y de fecha', async ({ page }) => {
  registrar('D5-validaciones');
  await ingresar(page, DUEÑO);
  await abrirPanel(page);
  const gen = await abrirGenerador(page);

  const btnGenerar = gen.getByRole('button', { name: 'Generar grilla' });

  // Estado inicial (franjasBase persistido o no).
  const vacioInicial = await gen
    .getByText('Agrega al menos una franja.')
    .isVisible()
    .catch(() => false);
  anotar('estado-inicial', { franjasBasePersistida: !vacioInicial });
  await capturar(page, 'f3-d5-generador');

  // Dejamos una sola franja editable.
  let quitar = gen.getByRole('button', { name: /^Quitar franja/ });
  while ((await quitar.count()) > 1) await quitar.last().click();
  if (!(await gen.locator('#franja-inicio-0').isVisible())) {
    await gen.getByRole('button', { name: 'Agregar franja' }).click();
  }

  const li1 = gen.locator('li').first();
  const ini1 = li1.locator('input[type="time"]').first();
  const fin1 = li1.locator('input[type="time"]').nth(1);

  // A) fin == inicio
  await ini1.fill('20:00');
  await fin1.fill('20:00');
  await expect(gen.getByText('La hora de fin debe ser posterior a la de inicio.')).toBeVisible({
    timeout: 10_000,
  });
  await expect(btnGenerar).toBeDisabled();
  await capturar(page, 'f3-d5-validacion-fin-igual-inicio');

  // B) fin < inicio (el dominio lo interpreta como franja de madrugada)
  await ini1.fill('18:00');
  await fin1.fill('17:00');
  await expect(
    gen.getByText('La franja es demasiado larga. Verifica que el horario no esté invertido.'),
  ).toBeVisible({ timeout: 10_000 });
  await expect(btnGenerar).toBeDisabled();
  await capturar(page, 'f3-d5-validacion-invertida');

  // C) solape entre dos franjas
  await ini1.fill('18:00');
  await fin1.fill('19:00');
  await gen.getByRole('button', { name: 'Agregar franja' }).click();
  const li2 = gen.locator('li').nth(1);
  await li2.locator('input[type="time"]').first().fill('18:30');
  await li2.locator('input[type="time"]').nth(1).fill('19:30');
  await expect(gen.getByText('Las franjas 18:00-19:00 y 18:30-19:30 se pisan.')).toBeVisible({
    timeout: 10_000,
  });
  await expect(btnGenerar).toBeDisabled();
  await capturar(page, 'f3-d5-validacion-solape');

  // D) fecha final anterior a la de inicio
  await li2.locator('input[type="time"]').first().fill('21:00');
  await li2.locator('input[type="time"]').nth(1).fill('22:00');
  await expect(gen.getByText(/ se pisan\./)).toBeHidden({ timeout: 10_000 });
  await expect(btnGenerar).toBeEnabled();

  let fechaAnteriorProbada = false;
  try {
    await gen.locator('#gen-hasta').fill('2020-01-01');
    fechaAnteriorProbada = true;
  } catch (e) {
    anotar('nota', { detalle: 'El input date rechazó un valor menor al min', error: String(e) });
  }

  if (fechaAnteriorProbada) {
    await btnGenerar.click();
    await expect(gen.getByText('La fecha de fin no puede ser anterior a la de inicio.')).toBeVisible({
      timeout: 15_000,
    });
    await capturar(page, 'f3-d5-validacion-fecha');
  }

  anotar('resultado', { fechaAnteriorProbada });
  await gen.getByRole('button', { name: 'Cerrar' }).click();
});

test('D6: generar la grilla de hoy crea turnos visibles en el panel', async ({ page }) => {
  registrar('D6-generar');
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  const { iso, etiqueta } = await hoyYdia(page);
  const gen = await abrirGenerador(page);

  // Una sola franja nueva (21:00-22:00): las franjas de la Fase 2 llegan hasta las 20:00.
  let quitar = gen.getByRole('button', { name: /^Quitar franja/ });
  while ((await quitar.count()) > 1) await quitar.last().click();
  if (!(await gen.locator('#franja-inicio-0').isVisible())) {
    await gen.getByRole('button', { name: 'Agregar franja' }).click();
  }
  const li1 = gen.locator('li').first();
  await li1.locator('input[type="time"]').first().fill('21:00');
  await li1.locator('input[type="time"]').nth(1).fill('22:00');

  // Solo el día de hoy.
  for (const dia of ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']) {
    const cb = gen.getByRole('checkbox', { name: dia });
    const debeEstarMarcado = dia === etiqueta;
    if ((await cb.isChecked()) !== debeEstarMarcado) {
      if (debeEstarMarcado) await cb.check();
      else await cb.uncheck();
    }
  }
  await gen.locator('#gen-hasta').fill(iso);
  await capturar(page, 'f3-d6-formulario');

  const resumen = await gen.getByText(/Sena por turno/).innerText();
  anotar('resumen-previo', { resumen });

  // ¿Se llega a ver el mensaje de éxito? El modal se cierra apenas se genera.
  await page.evaluate(() => {
    const w = window as any;
    w.__vioExito = false;
    const obs = new MutationObserver(() => {
      if (document.body.innerText.includes('Se crearon')) w.__vioExito = true;
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  await gen.getByRole('button', { name: 'Generar grilla' }).click();
  await expect(gen).toBeHidden({ timeout: 40_000 });

  const vioMensaje = await page.evaluate(() => (window as any).__vioExito === true);
  await page.waitForTimeout(1500);

  const celdas = page.getByRole('button', { name: /21:00: Libre/ });
  const nCeldas = await celdas.count();
  anotar('resultado', { vioMensajeDeExito: vioMensaje, celdas2100: nCeldas });
  await capturar(page, 'f3-d6-grilla-generada');

  expect(nCeldas, 'La grilla de hoy no muestra los turnos recién generados').toBeGreaterThan(0);
});

test('D7: celda libre → marcar tomado por fuera → liberar', async ({ page }) => {
  registrar('D7-celdas');
  await ingresar(page, DUEÑO);
  await abrirPanel(page);

  const libre = page.getByRole('button', { name: /21:00: Libre/ }).first();
  if (!(await libre.count().catch(() => 0))) {
    anotar('skip', { motivo: 'No hay celda 21:00 libre (D6 pudo no haber corrido)' });
    test.skip(true, 'Sin celda 21:00 libre');
  }

  await libre.click();
  const modalLibre = page.getByRole('dialog').filter({ hasText: 'Este turno está libre' });
  await expect(modalLibre).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f3-d7-celda-libre');

  await modalLibre.getByRole('button', { name: 'Marcar como ocupado' }).click();
  await expect(modalLibre).toBeHidden({ timeout: 15_000 });

  const ocupada = page.getByRole('button', { name: /21:00: Reservado/ }).first();
  await expect(ocupada).toBeVisible({ timeout: 15_000 });
  await capturar(page, 'f3-d7-celda-ocupada');

  await ocupada.click();
  const modalOcupada = page
    .getByRole('dialog')
    .filter({ hasText: 'Turno tomado por fuera de la app' });
  await expect(modalOcupada).toBeVisible({ timeout: 10_000 });
  await capturar(page, 'f3-d7-celda-ocupada-modal');

  await modalOcupada.getByRole('button', { name: 'Liberar turno' }).click();
  await expect(page.getByRole('button', { name: /21:00: Libre/ }).first()).toBeVisible({
    timeout: 15_000,
  });
  anotar('resultado', { cicloCompleto: true });
  await capturar(page, 'f3-d7-celda-liberada');
});

/* ================================================================ */
/* BLOQUE C — ALTA DE DUEÑO                                          */
/* ================================================================ */

test('D8: alta de dueño desde /role-selector queda en plan pendiente', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  registrar('D8-alta-dueno');

  const email = `qa-fase3-${Date.now()}@qa-fulbeando.test`;
  const nombre = 'QA';
  const apellido = 'Fase3';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate gratis' }).click();
  await page.getByPlaceholder('Nombre').fill(nombre);
  await page.getByPlaceholder('Apellido').fill(apellido);
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(PW);
  await page.getByRole('button', { name: 'REGISTRARME' }).click();

  await page.waitForURL(/\/role-selector/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: '¿Cómo vas a jugar hoy?' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: /Soy Jugador/ })).toBeVisible();
  const btnComplejo = page.getByRole('button', { name: /Tengo un Complejo/ });
  await expect(btnComplejo).toBeVisible();
  await capturar(page, 'f3-d8-role-selector');

  await btnComplejo.click();
  await page.waitForURL(/\/plan-pendiente/, { timeout: 45_000 });

  await expect(
    page.getByRole('heading', { name: /tu cuenta de due[nñ]o qued[oó] registrada/ }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText('Falta un solo paso para usar el panel de canchas: activar el plan.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toBeVisible();
  await capturar(page, 'f3-d8-plan-pendiente');

  // El guard debe bloquear todo lo que no esté exento.
  const bloqueadas: Record<string, string> = {};
  for (const ruta of ['/venue-dashboard', '/venue-registration', '/radar', '/turnos']) {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/plan-pendiente/, { timeout: 20_000 }).catch(() => {});
    bloqueadas[ruta] = page.url();
  }
  await capturar(page, 'f3-d8-guard-bloqueado');
  anotar('guard', bloqueadas);

  for (const [ruta, url] of Object.entries(bloqueadas)) {
    expect(url, `El guard dejó pasar ${ruta} a un dueño con plan pendiente`).toContain(
      '/plan-pendiente',
    );
  }

  // Segunda vez en el selector: la transacción debe rechazar el duplicado.
  await page.goto('/role-selector', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Tengo un Complejo/ }).click();
  await expect(page.getByText(/ya tiene un rol asignado/)).toBeVisible({ timeout: 20_000 });
  await capturar(page, 'f3-d8-alta-duplicada');

  // Verificación directa en Firestore.
  const { uid, idToken } = await entrar(request, email);
  // Se persiste en disco: si el worker de Playwright se reinicia entre tests
  // se pierde la variable de módulo y D10 no podría correr.
  cuentaFase3 = { email };
  fs.writeFileSync(path.resolve(EVIDENCIAS, 'fase3-cuenta.json'), JSON.stringify({ email }), 'utf-8');

  const usuario = await traerDoc(request, idToken, `usuarios/${uid}`);
  const solicitud = await traerDoc(request, idToken, `solicitudes/${uid}`);
  anotar('firestore', { uid, planDueno: usuario?.planDueno, solicitud: solicitud?.estado });
  await capturar(page, 'f3-d8-fin');

  expect(usuario?.rol, 'El rol del nuevo dueño no quedó en dueno_predio').toBe('dueno_predio');
  expect(usuario?.planDueno, 'El plan del nuevo dueño no quedó pendiente').toBe('pendiente');
  expect(solicitud?.estado, 'La solicitud de alta no quedó pendiente').toBe('pendiente');
});

/* ================================================================ */
/* BLOQUE D — ALTA DE PREDIO + SUSCRIPCION                           */
/* ================================================================ */

test('D9: alta real de predio y pantalla de suscripción', async ({ page, request }) => {
  test.setTimeout(180_000);
  registrar('D9-alta-predio');
  await ingresar(page, DUEÑO);

  await page.goto('/venue-registration', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Da de alta tu Complejo' })).toBeVisible({
    timeout: 25_000,
  });
  await expect(
    page.getByText('Completá los datos para aparecer en el radar de los jugadores.'),
  ).toBeVisible();

  const gps = ['Obteniendo ubicación...', '📍 Coordenadas capturadas', 'No se detectó ubicación'];
  let estadoGps = 'no aparece ninguno';
  for (const g of gps) {
    if (await page.getByText(g).isVisible().catch(() => false)) {
      estadoGps = g;
      break;
    }
  }
  anotar('gps', { estadoGps });
  await capturar(page, 'f3-d9-formulario-vacio');

  const nombrePredio = `QA Fase 3 ${Date.now()}`;
  await page.getByPlaceholder('Ej: El Templo del Fútbol').fill(nombrePredio);
  await page.getByPlaceholder('Dirección exacta').fill('Av. Siempreviva 742');
  await page.getByPlaceholder('Ej: Palermo').fill('Palermo');
  await page.getByPlaceholder('Ej: CABA').fill('Buenos Aires');
  await page.getByPlaceholder('Ej: 11 1234 5678').fill('11 5555 5555');
  await capturar(page, 'f3-d9-formulario-completo');

  await page.getByRole('button', { name: 'CONTINUAR' }).click();
  await page.waitForURL(/\/venue-subscription/, { timeout: 30_000 });

  await expect(page.getByRole('heading', { name: 'Activá tu Predio' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Membresía PRO')).toBeVisible();
  await expect(page.getByText('$5.000')).toBeVisible();
  await expect(
    page.getByText('Para figurar en el radar y recibir partidos automáticos, requerimos una suscripción mensual.'),
  ).toBeVisible();
  await capturar(page, 'f3-d9-suscripcion');

  await page.getByRole('button', { name: 'Abonar y Activar' }).click();
  await page.waitForURL(/\/venue-dashboard/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Panel del predio' })).toBeVisible({
    timeout: 25_000,
  });
  await capturar(page, 'f3-d9-panel-tras-alta');

  const { uid, idToken } = await entrar(request, DUEÑO);
  const predios = await listarDocs(request, 'predios');
  const nuevo = predios.find((p: any) => p.nombre === nombrePredio);
  const usuario = await traerDoc(request, idToken, `usuarios/${uid}`);

  anotar('firestore', {
    predioCreado: Boolean(nuevo),
    verificado: nuevo?.verificado,
    duenoUid: nuevo?.duenoUid,
    planDuenoTrasAbonar: usuario?.planDueno,
    prediosDelDueno: predios.filter((p: any) => p.duenoUid === uid).length,
  });

  expect(nuevo, 'No se creó el predio en Firestore').toBeTruthy();
  expect(nuevo.verificado, 'Un predio nuevo no puede nacer verificado').toBe(false);
  expect(nuevo.duenoUid).toBe(uid);
  expect(
    usuario?.planDueno,
    '"Abonar y Activar" no debería tocar Firestore, pero conviene saber si algo cambió',
  ).toBe('activo');
});

/* ================================================================ */
/* BLOQUE E — SEGURIDAD DE LAS RULES                                 */
/* ================================================================ */

test('D10: REGLAS — el dueño pendiente no debería poder activarse su propio plan', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  registrar('D10-bypass-plan');

  // La cuenta la crea D8. Se lee de disco por si el worker se reinició.
  let email = cuentaFase3?.email ?? null;
  if (!email) {
    const rutaCuenta = path.resolve(EVIDENCIAS, 'fase3-cuenta.json');
    if (fs.existsSync(rutaCuenta)) {
      email = JSON.parse(fs.readFileSync(rutaCuenta, 'utf-8')).email as string;
    }
  }
  if (!email) test.skip(true, 'D8 no llegó a crear la cuenta de prueba');

  const { uid, idToken } = await entrar(request, email!);
  const antes = await traerDoc(request, idToken, `usuarios/${uid}`);
  expect(antes?.planDueno, 'La cuenta de D8 no está en plan pendiente').toBe('pendiente');

  const ruta = `${FIRESTORE}/usuarios/${uid}?updateMask.fieldPaths=planDueno`;
  const patch = await request.patch(ruta, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: { fields: { planDueno: { stringValue: 'activo' } } },
  });
  const status = patch.status();
  anotar('intento-de-escalacion', { status, cuerpo: (await patch.text()).slice(0, 400) });

  let entroAlPanel = false;
  let capturaTomada = false;

  if (status === 200) {
    // Prueba de impacto: ¿ahora el guard lo deja entrar al panel?
    await ingresar(page, email!);
    await page.goto('/venue-dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    entroAlPanel = page.url().includes('/venue-dashboard');
    anotar('impacto', { url: page.url(), entroAlPanel });
    if (entroAlPanel) {
      await expect(page.getByRole('heading', { name: 'Panel del predio' })).toBeVisible({
        timeout: 25_000,
      });
    }
    await capturar(page, 'f3-d10-bypass-panel');
    capturaTomada = true;
  }

  // REVERTIR SIEMPRE: la cuenta de prueba vuelve a quedar pendiente.
  const revert = await request.patch(ruta, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: { fields: { planDueno: { stringValue: 'pendiente' } } },
  });
  const despues = await traerDoc(request, idToken, `usuarios/${uid}`);
  anotar('revert', { statusRevert: revert.status(), planDueno: despues?.planDueno });

  if (entroAlPanel) {
    await page.goto('/venue-dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/plan-pendiente/, { timeout: 25_000 }).catch(() => {});
    if (!capturaTomada) await capturar(page, 'f3-d10-revertido');
  }

  expect(
    status,
    `Firestore aceptó que un dueño con plan PENDIENTE escriba planDueno='activo' en su propio doc (HTTP ${status}). Bypass del cobro del plan.`,
  ).toBe(403);
});
