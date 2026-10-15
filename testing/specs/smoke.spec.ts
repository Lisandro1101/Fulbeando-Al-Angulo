import { test, expect, type Page, type ConsoleMessage, type Response, type Request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCIAS = path.resolve(process.cwd(), 'evidencias');
const JSON_FINAL = path.resolve(EVIDENCIAS, 'smoke-diagnostico.json');
const JSONL = path.resolve(EVIDENCIAS, 'smoke-eventos.jsonl');

type Evento = {
  tipo: 'console-error' | 'page-error' | 'http-error' | 'request-failed';
  ruta: string;
  detalle: string;
  url?: string;
};

type Visita = { ruta: string; url: string; titulo: string; captura: string; estado: string };

const eventos: Evento[] = [];
const rutasVisitadas: Visita[] = [];

// Ruido conocido y deliberado de la app: no es un bug.
const RUIDO_PERMITIDO = [
  /Auto-prompt blocked/i,
  /Download the React DevTools/i,
  /React Router Future Flag Warning/i,
];

const esRuido = (t: string) => RUIDO_PERMITIDO.some(r => r.test(t));

let rutaActual = 'setup';
const obtenerRuta = () => rutaActual;

function persistir(contexto: string) {
  // JSONL: append por test, a prueba de reinicios de módulo.
  const linea = JSON.stringify({ contexto, cuando: new Date().toISOString(), rutasVisitadas, eventos });
  fs.appendFileSync(JSONL, linea + '\n', 'utf-8');
  fs.writeFileSync(
    JSON_FINAL,
    JSON.stringify({ generado: new Date().toISOString(), rutasVisitadas, eventos }, null, 2),
    'utf-8'
  );
}

function instrumentar(page: Page) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const texto = msg.text();
    if (esRuido(texto)) return;
    eventos.push({ tipo: 'console-error', ruta: rutaActual, detalle: `[${msg.type()}] ${texto}` });
  });

  page.on('pageerror', (err: Error) => {
    eventos.push({ tipo: 'page-error', ruta: rutaActual, detalle: `${err.name}: ${err.message}` });
  });

  page.on('response', (res: Response) => {
    if (res.status() >= 400) {
      eventos.push({ tipo: 'http-error', ruta: rutaActual, detalle: `HTTP ${res.status()}`, url: res.url() });
    }
  });

  page.on('requestfailed', (req: Request) => {
    const fallo = req.failure()?.errorText ?? 'desconocido';
    if (fallo.includes('ERR_ABORTED')) return;
    eventos.push({ tipo: 'request-failed', ruta: rutaActual, detalle: fallo, url: req.url() });
  });
}

async function irAYCapturar(page: Page, ruta: string, nombre: string) {
  rutaActual = ruta;
  await page.goto(ruta, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const captura = `${nombre}.png`;
  await page.screenshot({ path: path.join(EVIDENCIAS, captura), fullPage: true });

  const contenido = (await page.locator('body').innerText().catch(() => '')).trim();
  const vacia = contenido.length === 0;
  const soloCargando = contenido === 'Cargando...';

  rutasVisitadas.push({
    ruta,
    url: page.url(),
    titulo: await page.title().catch(() => ''),
    captura,
    estado: vacia ? 'VACIA' : soloCargando ? 'STUCK-CARGANDO' : 'OK',
  });
}

async function loginSeed(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill('lio@alangulo.com');
  await page.getByPlaceholder('Contraseña').fill('password123');
  await page.getByRole('button', { name: /INGRESAR/i }).click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 25_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCIAS, { recursive: true });
  fs.writeFileSync(JSONL, '', 'utf-8');
});

test.afterAll(() => persistir('final'));

test.describe('Fase 1 — Smoke test', () => {
  test('T1: la app carga la pantalla de login sin errores', async ({ page }) => {
    instrumentar(page);
    rutaActual = '/login';
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await expect(page.getByRole('heading', { name: /AL ÁNGULO/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: /INGRESAR/i })).toBeVisible();

    await page.screenshot({ path: path.join(EVIDENCIAS, '01-login.png'), fullPage: true });
    persistir('T1');
  });

  test('T2: validación de formularios del login', async ({ page }) => {
    instrumentar(page);
    rutaActual = '/login (validación)';
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /INGRESAR/i }).click();
    await expect(page.getByText('Por favor completá email y contraseña.')).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCIAS, '02-login-validacion-vacios.png'), fullPage: true });

    await page.getByPlaceholder('Email').fill('no-existe@fulbeando.com');
    await page.getByPlaceholder('Contraseña').fill('wrong-password');
    await page.getByRole('button', { name: /INGRESAR/i }).click();
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(EVIDENCIAS, '03-login-credenciales-invalidas.png'), fullPage: true });
    persistir('T2');
  });

  test('T3: login con cuenta seed del jugador', async ({ page }) => {
    instrumentar(page);
    rutaActual = '/login (seed jugador)';
    await loginSeed(page);
    rutaActual = 'tras-login';
    await page.screenshot({ path: path.join(EVIDENCIAS, '04-tras-login.png'), fullPage: true });
    expect(page.url()).not.toContain('/login');
    persistir('T3');
  });

  test('T4: recorrido de las rutas principales del AppLayout', async ({ page }) => {
    test.setTimeout(300_000);
    instrumentar(page);
    await loginSeed(page);

    const rutas: [string, string][] = [
      ['/', '10-home'],
      ['/radar', '11-radar'],
      ['/equipo', '12-equipo'],
      ['/partidos', '13-partidos'],
      ['/perfil', '14-perfil'],
      ['/turnos', '15-turnos'],
      ['/ajustes', '16-ajustes'],
    ];

    for (const [ruta, nombre] of rutas) {
      await irAYCapturar(page, ruta, nombre);
      persistir(`T4:${ruta}`);
    }

    const rotas = rutasVisitadas.filter(r => r.estado !== 'OK');
    expect(rotas, `Pantallas rotas: ${JSON.stringify(rotas, null, 2)}`).toHaveLength(0);
  });

  test('T5: la sesión persiste tras recargar', async ({ page }) => {
    instrumentar(page);
    await loginSeed(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    rutaActual = 'recarga';
    await page.screenshot({ path: path.join(EVIDENCIAS, '05-tras-recarga.png'), fullPage: true });

    expect(page.url(), 'La sesión no persistió tras recargar').not.toContain('/login');
    persistir('T5');
  });
});
