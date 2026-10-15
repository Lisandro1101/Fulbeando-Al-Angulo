# Informe 01 — Smoke Test (Fase 1)

- **Proyecto:** Fulbeando (`fulbeando-demo`)
- **Fecha:** 2026-10-11
- **Entorno:** app Vite en `http://localhost:5173`, Firebase Emulator Suite en `http://localhost:4000` (`VITE_USE_EMULATORS=true`)
- **Herramienta:** Playwright (aislado en `/testing`, la app **no fue modificada**)
- **Viewport:** 1366×900, Chromium, es-AR
- **Cuenta usada:** `lio@alangulo.com` / `password123` (seed `scripts/seed-emuladores.ts`)

---

## 1. Resultado general

| Test | Descripción | Resultado |
|---|---|---|
| T1 | La app carga `/login` con todos los elementos | ✅ PASS |
| T2 | Validación: campos vacíos y credenciales inválidas | ✅ PASS |
| T3 | Login con cuenta seed (jugador) | ✅ PASS |
| T4 | Recorrido de 7 rutas del `AppLayout` | ✅ PASS |
| T5 | La sesión persiste tras recargar | ✅ PASS |

**5/5 tests aprobados.** Detalle máquina en `evidencias/smoke-diagnostico.json` y `evidencias/smoke-eventos.jsonl`.

### Estado de las rutas

| Ruta | Estado | Captura | Observación |
|---|---|---|---|
| `/login` | ✅ OK | `01-login.png` | — |
| `/` (home) | ✅ Carga | `10-home.png` | Secciones siempre vacías (**F-01**) |
| `/radar` | ✅ OK | `11-radar.png` | Mapa Leaflet carga correctamente |
| `/equipo` | ✅ OK | `12-equipo.png` | Datos del seed visibles |
| `/partidos` | ✅ OK | `13-partidos.png` | — |
| `/perfil` | ✅ OK | `14-perfil.png` | Stats vacías / solapamiento (**F-05**) |
| `/turnos` | ✅ OK | `15-turnos.png` | Estado vacío bien resuelto |
| `/ajustes` | ✅ OK | `16-ajustes.png` | — |

Ninguna pantalla quedó en blanco ni colgada en "Cargando...".

### Salud técnica observada

- **0** errores JS inesperados en consola durante el recorrido.
- **0** peticiones fallidas de red.
- **1** respuesta HTTP 400: `POST /accounts:signInWithPassword` al Auth emulator durante T2 — **esperada**, es la prueba negativa de credenciales.
- Persistencia de sesión: OK tras `reload`.
- Ruido filtrado por considerarse deliberado: warning de future flags de React Router, `Auto-prompt blocked` de notificaciones.

---

## 2. Hallazgos

### F-01 · El home (`/`) es un stub: nunca muestra contenido — **Severidad: ALTA**

`app/src/modules/ui/AlAnguloHome.tsx:11-13`

```
// TODO: Fetch desde Firestore (Partidos y Equipos)
const partidos: any[] = [];
const equipos: any[] = [];
```

Las secciones "Partidos buscando jugadores" y "Equipos en tu zona" están **quemadas en vacío**: no hay fetch a Firestore, así que siempre muestran solo los títulos.

Colaterales en el mismo archivo:
- El buscador `Buscar partidos, equipos, jugadores...` (líneas 22-27) no tiene `onChange` ni `onSubmit`: es UI muerta.
- Los botones "Ver todos" (líneas 37 y 63) no tienen `onClick`: no hacen nada.
- No existe estado vacío: si la lista está vacía, queda un título con nada debajo, lo que se lee como "roto" y no como "sin resultados".

**Evidencia:** `evidencias/10-home.png`

---

### F-02 · La barra superior desaparece en 5 de 7 pantallas — **Severidad: MEDIA**

`NavegacionHeader` no está en `AppLayout` (`app/src/app/AppLayout.tsx`), se renderiza dentro de pantallas puntuales:

| Pantalla | ¿Tiene `NavegacionHeader`? |
|---|---|
| `/turnos` (Screen5Reservas) | ✅ Sí |
| `/ajustes` | ✅ Sí |
| `/` (AlAnguloHome) | ❌ No |
| `/radar` | ❌ No |
| `/equipo` | ❌ No |
| `/partidos` | ❌ No |
| `/perfil` | ❌ No |

Consecuencia visible en las capturas: en `/`, `/radar`, `/equipo`, `/partidos` y `/perfil` no existen el logo "FULBEANDO PWA", los accesos "Canchas" / "Radar & Partidos" ni el menú de cuenta con **"Cerrar Sesión"** (`NavegacionHeader.tsx:197-201`).

**Impacto real:** un jugador que está en `/`, `/radar`, `/equipo` o `/partidos` no tiene ninguna vía visible para cerrar sesión. La única salida es Perfil → engranaje → `/ajustes` → header → Cerrar Sesión (4 pasos).

**Evidencia:** comparar `15-turnos.png` o `16-ajustes.png` contra `10-home.png`, `11-radar.png`, `12-equipo.png`, `13-partidos.png`, `14-perfil.png`.

---

### F-03 · El jugador no tiene "Ajustes" en el menú lateral — **Severidad: MEDIA**

`app/src/modules/ui/MenuNavegacion.tsx:50-53`

El `NavLink` a `/ajustes` está **dentro de la rama `esDueno`**. El sidebar del jugador muestra solo: Comunidad, Radar, Equipo, Reservas, Perfil.

Un jugador llega a `/ajustes` únicamente por el engranaje de la pantalla de perfil (`Screens.tsx:533`). La ruta existe y funciona, pero está huérfana de la navegación principal.

---

### F-04 · Todas las rutas comparten el mismo `<title>` — **Severidad: MEDIA**

Las 7 rutas inspeccionadas reportan `titulo = "Fulbeando - Noche de Sintetico"`. No hay actualización de `document.title` por ruta.

**Impacto:** pestañas e historial indistinguibles, afecta lectores de pantalla (el título es lo primero que announce un screen reader al navegar) y SEO de rutas públicas.

---

### F-05 · Ficha de perfil: datos vacíos y elementos solapados — **Severidad: MEDIA**

`evidencias/14-perfil.png`

- Estadísticas en placeholder: `GOL --`, `ASI --`, `PAR --`, `PIE --` (solo `EDAD 39` y `POS DEL` tienen valor).
- Avatar femenino para la cuenta "Lionel" (dato de seed, no bug de render, pero se ve inconsistente).
- **Solapamiento visual:** las etiquetas "DEL" y "AR" y el ícono de pelota se dibujan *encima* del avatar en la ficha dorada. A 1366×900 el texto queda cortado/encimado.

---

### F-06 · Contraste bajo en textos secundarios — **Severidad: BAJA** *(confirmar en Fase 5)*

- `13-partidos.png`: "Sí, ya la alquilamos" / "No, buscanos cancha a medias" usan un gris muy apagado sobre fondo zinc-900.
- Sidebar: ítems inactivos en `text-zinc-500` (`MenuNavegacion.tsx:22`).

Sospecha de incumplimiento de WCAG AA (4.5:1). Requiere medición formal con contraste calculado → lo toma la **Fase 5**.

---

### F-07 · Títulos de sección sin jerarquía en `/equipo` — **Severidad: BAJA**

`12-equipo.png`: "LA SCALONETA F5" aparece arriba a la izquierda, debajo del borde superior, y la tarjeta del equipo vuelve a repetir el nombre en grande. Doble título con roles de encabezado ambiguos.

---

## 3. Lo que funcionó bien

- Login carga rápido y con todos los elementos visibles.
- Validación de formularios con mensajes claros y en español rioplatense ("Por favor completá email y contraseña.", "Correo o contraseña incorrectos.").
- Los mensajes de error de autenticación mapean correctamente los códigos de Firebase (`auth/invalid-credential`, `auth/user-not-found`).
- La sesión persiste tras recargar la página.
- 7/7 rutas del `AppLayout` renderizan sin pantalla en blanco ni errores JS.
- El mapa de `/radar` carga tiles y controles sin errores de red.
- Estado vacío de `/turnos` está bien resuelto (icono + título + texto explicativo) — es el **patrón que debería replicarse en el home**.

---

## 4. Artefactos generados

```
testing/
├── package.json              (dependencias de testing, aisladas)
├── playwright.config.ts
├── specs/smoke.spec.ts       (reutilizable en fases siguientes)
├── evidencias/
│   ├── 01-login.png … 16-ajustes.png   (13 capturas)
│   ├── smoke-diagnostico.json          (rutas + eventos)
│   └── smoke-eventos.jsonl             (snapshot por test)
├── reporte-html/             (reporte Playwright)
└── informe-01-smoke.md       (este archivo)
```

**El código de la app no fue modificado.**

---

## 5. Próxima fase sugerida

**Fase 2 — Flujo de jugador a fondo:** radar (búsqueda, filtros, geolocalización), equipo (crear/unirse/invitar), partidos (lanzar desafío), turnos (reserva + pago simulado), reseñas.

Precondición a resolver o saltear explícitamente: **F-01** (el home no tiene datos reales que probar).
