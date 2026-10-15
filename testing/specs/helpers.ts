import { expect, type Page, type ConsoleMessage, type Response, type Request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const EVIDENCIAS = path.resolve(process.cwd(), 'evidencias');

type Evento = {
  tipo: 'console-error' | 'page-error' | 'http-error' | 'request-failed';
  contexto: string;
  detalle: string;
  url?: string;
};

export class Diagnostico {
  eventos: Evento[] = [];
  private archivo: string;

  constructor(nombre: string) {
    this.archivo = path.resolve(EVIDENCIAS, nombre);
    fs.mkdirSync(EVIDENCIAS, { recursive: true });
    fs.writeFileSync(this.archivo, '', 'utf-8');
  }

  private guardar(contexto: string) {
    fs.appendFileSync(
      this.archivo,
      JSON.stringify({ contexto, cuando: new Date().toISOString(), eventos: this.eventos }) + '\n',
      'utf-8'
    );
  }

  registrar(evento: Evento) {
    this.eventos.push(evento);
    this.guardar(evento.contexto);
  }

  instrumentar(page: Page, obtenerContexto: () => string) {
    const ruido = [/Auto-prompt blocked/i, /React Router Future Flag Warning/i, /Download the React DevTools/i];
    const esRuido = (t: string) => ruido.some(r => r.test(t));

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return;
      const texto = msg.text();
      if (esRuido(texto)) return;
      this.registrar({ tipo: 'console-error', contexto: obtenerContexto(), detalle: `[${msg.type()}] ${texto}` });
    });

    page.on('pageerror', (err: Error) => {
      this.registrar({ tipo: 'page-error', contexto: obtenerContexto(), detalle: `${err.name}: ${err.message}` });
    });

    page.on('response', (res: Response) => {
      if (res.status() >= 400) {
        this.registrar({
          tipo: 'http-error',
          contexto: obtenerContexto(),
          detalle: `HTTP ${res.status()}`,
          url: res.url(),
        });
      }
    });

    page.on('requestfailed', (req: Request) => {
      const fallo = req.failure()?.errorText ?? 'desconocido';
      if (fallo.includes('ERR_ABORTED')) return;
      this.registrar({ tipo: 'request-failed', contexto: obtenerContexto(), detalle: fallo, url: req.url() });
    });
  }
}

export async function loginSeed(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill('lio@alangulo.com');
  await page.getByPlaceholder('Contraseña').fill('password123');
  await page.getByRole('button', { name: /INGRESAR/i }).click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 25_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

export async function capturar(page: Page, nombre: string) {
  await page.screenshot({ path: path.join(EVIDENCIAS, `${nombre}.png`), fullPage: true });
}

/** Espera a que desaparezca el chip "Buscando…" del radar. */
export async function esperarRadar(page: Page) {
  await page.goto('/radar', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Todos/ })).toBeVisible({ timeout: 20_000 });
  await page
    .getByText('Buscando…')
    .waitFor({ state: 'hidden', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
}
