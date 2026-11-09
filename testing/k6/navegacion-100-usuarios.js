import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ============================================================================
// CONFIGURACIÓN DE MÉTRICAS PERSONALIZADAS
// ============================================================================
const PageLoadTime = new Trend('page_load_time', true);
const NavigationSuccessRate = new Rate('navigation_success_rate');
const ActiveUserJourneys = new Counter('active_user_journeys');

// ============================================================================
// PARÁMETROS CONFIGURABLES VÍA VARIABLES DE ENTORNO
// ============================================================================
// Ejemplo de ejecución:
//   k6 run testing/k6/navegacion-100-usuarios.js
//   k6 run -e TARGET_VUS=100 -e BASE_URL=http://localhost:5173 testing/k6/navegacion-100-usuarios.js
// ============================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '100', 10);
const AUTH_EMULATOR_URL = __ENV.AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
const SIMULAR_AUTH = __ENV.SIMULAR_AUTH === 'true'; // Activar si los emuladores están corriendo

// ============================================================================
// OPCIONES DE CARGA Y UMBRALES DE RENDIMIENTO (100 USUARIOS VUs)
// ============================================================================
export const options = {
  stages: [
    { duration: '30s', target: Math.round(TARGET_VUS * 0.3) }, // Ramp-up inicial (30 usuarios)
    { duration: '45s', target: TARGET_VUS },                   // Ramp-up completo a 100 usuarios
    { duration: '2m', target: TARGET_VUS },                    // Meseta: 100 usuarios navegando concurrentemente
    { duration: '30s', target: Math.round(TARGET_VUS * 0.2) }, // Desaceleración
    { duration: '15s', target: 0 },                            // Cierre
  ],
  thresholds: {
    // El 95% de las peticiones debe responder en menos de 800ms
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    // Tasa de errores HTTP debe ser inferior al 2%
    http_req_failed: ['rate<0.02'],
    // Al menos 98% de las validaciones de páginas deben ser exitosas
    checks: ['rate>0.98'],
    // Métrica propia de navegación
    navigation_success_rate: ['rate>0.98'],
  },
};

// Cabeceras HTTP estándar de navegador
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Dest': 'document',
};

// Función auxiliar para navegar a una ruta de la SPA y medirla
function visitarRuta(nombreRuta, path) {
  const inicio = new Date();
  const res = http.get(`${BASE_URL}${path}`, { headers: HEADERS, tags: { page: nombreRuta } });
  const duracion = new Date() - inicio;

  PageLoadTime.add(duracion, { page: nombreRuta });

  const ok = check(res, {
    [`${nombreRuta} responde HTTP 200`]: (r) => r.status === 200,
    [`${nombreRuta} tiene contenido HTML`]: (r) => r.body && r.body.length > 50,
  });

  NavigationSuccessRate.add(ok);
  return res;
}

// Tiempo de reflexión humano entre pantallas (1.5s a 3.5s)
function pausaHumana(min = 1.5, max = 3.5) {
  const tiempo = Math.random() * (max - min) + min;
  sleep(tiempo);
}

// ============================================================================
// FLUJOS DE USUARIO SEGÚN PERFIL (USER PERSONAS)
// ============================================================================

// 1. FLUJO JUGADOR: Busca partidos en el radar, consulta equipo, turnos y perfil (~70% de usuarios)
function flujoJugador(vuId) {
  group('Flujo Jugador - Navegación Principal', () => {
    // 1. Landing / Inicio
    visitarRuta('01_Home', '/');
    pausaHumana(1, 2.5);

    // 2. Pantalla de Login
    visitarRuta('02_Login', '/login');
    pausaHumana(1.5, 3);

    // Simulación de autenticación en emulador de Auth si está habilitado
    if (SIMULAR_AUTH) {
      const payload = JSON.stringify({
        email: 'lio@alangulo.com',
        password: 'password123',
        returnSecureToken: true,
      });
      const authRes = http.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(authRes, { 'Auth Login responde OK (200)': (r) => r.status === 200 });
      pausaHumana(1, 2);
    }

    // 3. Mapa Radar Unificado (Pantalla central de la app)
    visitarRuta('03_Radar', '/radar');
    pausaHumana(2, 4);

    // 4. Cartelera de Partidos y Desafíos
    visitarRuta('04_Partidos', '/partidos');
    pausaHumana(1.5, 3.5);

    // 5. Mi Equipo
    visitarRuta('05_MiEquipo', '/equipo');
    pausaHumana(1.5, 3);

    // 6. Turnos y Reserva de Canchas
    visitarRuta('06_Turnos', '/turnos');
    pausaHumana(2, 4);

    // 7. Perfil de Usuario y Carta
    visitarRuta('07_Perfil', '/perfil');
    pausaHumana(1.5, 3);

    // 8. Ajustes
    visitarRuta('08_Ajustes', '/ajustes');
    pausaHumana(1, 2);
  });
}

// 2. FLUJO DUEÑO DE PREDIO: Gestiona su complejo deportivo (~20% de usuarios)
function flujoDuenoPredio(vuId) {
  group('Flujo Dueño de Predio - Gestión de Complejo', () => {
    // 1. Ingreso a login
    visitarRuta('Dueno_01_Login', '/login');
    pausaHumana(1.5, 3);

    // 2. Panel de administración del dueño
    visitarRuta('Dueno_02_VenueDashboard', '/venue-dashboard');
    pausaHumana(2.5, 5);

    // 3. Consulta de turnos y grilla
    visitarRuta('Dueno_03_TurnosGrilla', '/turnos');
    pausaHumana(2, 4);

    // 4. Configuración y Ajustes
    visitarRuta('Dueno_04_Ajustes', '/ajustes');
    pausaHumana(1.5, 3);
  });
}

// 3. FLUJO VISITANTE / EXPLORADOR: Conoce la plataforma (~10% de usuarios)
function flujoVisitante(vuId) {
  group('Flujo Visitante - Exploración Pública', () => {
    // 1. Landing
    visitarRuta('Visitante_01_Home', '/');
    pausaHumana(1.5, 3);

    // 2. Consulta de Radar
    visitarRuta('Visitante_02_Radar', '/radar');
    pausaHumana(2, 4);

    // 3. Visualización de Carta Pública de Jugador
    visitarRuta('Visitante_03_CartaPublica', '/carta/ejemplo-jugador');
    pausaHumana(2, 3.5);

    // 4. Selector de Roles (Onboarding previo al registro)
    visitarRuta('Visitante_04_SelectorRol', '/role-selector');
    pausaHumana(1, 2.5);
  });
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN (VIRTUAL USER ENTRYPOINT)
// ============================================================================
export default function () {
  ActiveUserJourneys.add(1);

  // Distribuir los 100 usuarios concurrentes según su ID de usuario virtual (__VU)
  const selector = __VU % 10;

  if (selector < 7) {
    // 70% de los usuarios simulan jugadores habituales
    flujoJugador(__VU);
  } else if (selector < 9) {
    // 20% de los usuarios simulan dueños de canchas / predios
    flujoDuenoPredio(__VU);
  } else {
    // 10% de los usuarios simulan visitantes y nuevos registros
    flujoVisitante(__VU);
  }
}

// ============================================================================
// GENERACIÓN DE REPORTE RESUMEN (HTML + CONSOLA)
// ============================================================================
export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqFailed = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0;
  const avg = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Carga K6 - Fulbeando (${TARGET_VUS} Usuarios)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    h1 { color: #10b981; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155; }
    .stat-val { font-size: 1.8rem; font-weight: bold; color: #38bdf8; }
    .stat-lbl { color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem; }
    .tag { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background: #10b981; color: #000; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <span class="tag">K6 LOAD TEST</span>
    <h1>Reporte de Carga: Fulbeando (Navegación ${TARGET_VUS} VUs)</h1>
    <p style="color: #94a3b8;">Simulación de ${TARGET_VUS} usuarios activos recorriendo la aplicación, pantallas y flujos principales.</p>
    <div class="grid">
      <div class="stat"><div class="stat-val">${TARGET_VUS}</div><div class="stat-lbl">Usuarios Concurrentes (VUs)</div></div>
      <div class="stat"><div class="stat-val">${reqTotal}</div><div class="stat-lbl">Total Peticiones HTTP</div></div>
      <div class="stat"><div class="stat-val">${avg} ms</div><div class="stat-lbl">Latencia Promedio</div></div>
      <div class="stat"><div class="stat-val">${p95} ms</div><div class="stat-lbl">Percentil 95 (P95)</div></div>
      <div class="stat"><div class="stat-val">${reqFailed}%</div><div class="stat-lbl">Tasa de Fallos HTTP</div></div>
    </div>
  </div>
</body>
</html>
  `;

  return {
    'testing/resultados/k6-reporte.html': html,
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Formateador simple de texto si no está disponible el nativo
function textSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0;
  const avg = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  return `
==============================================================
   FULBEANDO - PRUEBA DE CARGA K6 (${TARGET_VUS} USUARIOS CONCURRENTES)
==============================================================
> Peticiones HTTP realizadas : ${reqTotal}
> Latencia promedio         : ${avg} ms
> Percentil 95 (p95)        : ${p95} ms
> Reporte HTML guardado en  : testing/resultados/k6-reporte.html
==============================================================
  `;
}
