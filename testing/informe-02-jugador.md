# Informe 02 — Flujo del jugador (Fase 2)

- **Proyecto:** Fulbeando (`fulbeando-demo`)
- **Fecha:** 2026-10-11
- **Entorno:** app `http://localhost:5173`, Firebase Emulators `http://localhost:4000`
- **Herramienta:** Playwright (`testing/`), cuenta seed `lio@alangulo.com` / `password123`
- **Código de la app:** ✅ **no modificado** (`git status` solo muestra `testing/` y los logs de los emuladores)

---

## 1. Resultado

**14 tests — 14 ✅** (2 requirieron preparar el fixture, documentado en §4)

| ID | Test | Resultado |
|---|---|---|
| R1 | Radar carga con sus 5 filtros | ✅ |
| R2 | Filtros muestran/ocultan marcadores | ✅ |
| R6 | Diagnóstico: ¿el radar muestra algo al alejar el zoom? | ✅ (ver F-08) |
| R3 | Geolocalización concedida y denegada | ✅ |
| R4 | FAB amarillo → modal "Mis Partidos" | ✅ |
| R5 | Bottom-sheet de predio → "Ver canchas y reservar" | ✅ |
| S1 | Formulario de seña: 3 pasos + validaciones de comprobante | ✅ |
| S2 | Envío completo de la solicitud | ✅ |
| E1 | Invitar jugador: búsqueda y estados | ✅ |
| E2 | Armar convocatoria | ✅ |
| E3 | Configuración del equipo | ✅ |
| E4 | Crear equipo: validación y alta | ✅ |
| P1 | Lanzar desafío al radar | ✅ |
| P2 | "Reservar Cancha" → radar | ✅ |
| T1 | `/turnos` placeholder | ✅ (ver F-13) |

26 capturas en `evidencias/f2-*.png`; eventos en `evidencias/fase2-eventos.jsonl`.

---

## 2. Hallazgos

### F-08 · El radar abre completamente vacío — **Severidad: ALTA**

**Evidencia:** `R6:resultado` en `fase2-eventos.jsonl`, capturas `f2-r1-radar-filtros.png` vs `f2-r6-radar-alejado.png`

| Momento | predio | equipo | desafío | jugador |
|---|---|---|---|---|
| Al abrir (zoom 14) | 0 | 0 | 0 | 0 |
| Tras alejar el zoom | 2 | 2 | 2 | 4 |

**Causa raíz:** `MapaRadarUnificado.tsx:73-75` calcula `radioKm` como la distancia del centro a la esquina NE del viewport. A zoom 14 con 1366×900 eso da **~6,5 km**. Los datos del seed están en GBA Sur (Lanús / Lomas / Banfield), a **15-20 km** del centro del mapa (fallback CABA `-34.6037,-58.3816`, `MapaRadarUnificado.tsx:259-262`). El filtro `.filter(c => c.distanciaKm <= radioKm)` (`:293`) descarta todo.

**Impacto:** el usuario abre la pantalla estrella de la app y ve **un mapa con nada adentro**. No hay ningún mensaje de "sin resultados", loading colgado ni indicación de que deba alejar el zoom: se lee como pantalla rota. Los 5 filtros también devuelven 0 en todos los casos.

**Dato clave:** al alejar el zoom aparecen **2 predios, 2 equipos, 2 desafíos y 4 jugadores** — los datos están, solo que fuera del radio.

---

### F-09 · El seed deja el flujo de reserva inalcanzable — **Severidad: ALTA**

Verificado con `npx tsx testing/scripts/preparar-grilla.ts --solo-inspeccion`:

```
predio-lanus-01 | verificado=true | canchasResumen=2 | subcolección canchas=0 | turnos=0
predio-lomas-02 | verificado=true | canchasResumen=1 | subcolección canchas=0 | turnos=0
predio-banfield-03 | verificado=false | canchasResumen=1 | subcolección canchas=0 | turnos=0
turnos en el emulador: 0
```

Dos huecos encadenados:

1. **`seed-emuladores.ts` solo escribe `canchasResumen`** (array denormalizado en el predio, líneas 391-423). **Nunca crea la subcolección `predios/{id}/canchas`**, que es la que lee `listarCanchas` (`modules/canchas/repositorio.ts:50`).
2. Sin canchas en la subcolección, el **`GeneradorGrilla` del dueño no puede crear turnos** (lanza *"El predio no tiene canchas activas"*, `turnos/repositorio.ts:154`). Y nadie más genera turnos: `generarGrillaMasiva` solo se invoca desde `DashboardDueno.tsx:255`.

**Resultado:** colección `turnos` vacía → el jugador ve *"No hay turnos disponibles para los próximos 7 días"* → **el flujo núcleo del producto (pagar una seña y reservar) no se puede ejecutar de punta a punta en el entorno de pruebas**, ni siquiera desde el panel del dueño.

**Dato positivo:** cuando la grilla existe, el flujo completo funciona (ver S2).

---

### F-10 · Errores de Firestore mostrados en crudo al usuario — **Severidad: ALTA**

**Evidencia:** `f2-s2-error-envio.png` (corrida con el fixture mal armado)

La pantalla mostró en rojo, dentro del formulario:

```
evaluation error at L281:24 for 'create' @ L281, evaluation error at L354:24 for
'create' @ L354, evaluation error at L361:24 for 'update' @ L361, false for
'create' @ L354, false for 'create' @ L281
```

**Causa:** `CargaDeSena.tsx:161-164` hace `setError(e.message)` — pasa el mensaje del backend tal cual.

**Impacto:** el usuario ve texto técnico que expone el número de línea de las security rules, sin acentos ni traducción, y sin ninguna indicación de qué hacer. Cualquier `permission-denied`, `failed-precondition` o error de red sale igual. Debería mapearse a un mensaje accionable (y el técnico ir al log).

---

### F-11 · La seña supera al total — **Severidad: MEDIA**

**Evidencia:** `S2:veredicto` → `{"total":11000,"sena":12000,"senaSuperaAlTotal":true}`; también `f2-s2-solicitud-enviada.png` (`Total $ 8.000` / `Sena $ 12.000`).

- `montoSena` sale de `predio.cobro.montoSena` (fijo por predio).
- `precioTotal` sale de `cancha.precioHora` (`domain/turno.ts:133`).

No hay ninguna validación de que `montoSena <= precioTotal`. Se pide al jugador transferir **más** de lo que vale el turno. También se muestra "Monto de sena $12.000" junto a "Total $8.000" sin aclarar la relación.

---

### F-12 · "Ver mis partidos" lleva a una ruta inexistente — **Severidad: MEDIA**

**Evidencia:** `S2:veredicto` → `urlTrasVerMisPartidos: http://localhost:5173/radar`

`CargaDeSena.tsx:269` → `<Link to="/dashboard">Ver mis partidos</Link>`. **`/dashboard` no existe** en `rutas.tsx`; el catch-all (`rutas.tsx:137`) redirige a `/radar`. El usuario confirma su reserva y el único botón lo manda al mapa, no a sus partidos. Peor: `/turnos` (donde "debería" estar) tampoco lo muestra (F-13).

---

### F-13 · `/turnos` es una pantalla placeholder — **Severidad: MEDIA**

`modules/ui/Screens.tsx:673-689`. Solo muestra icono + *"Tus Reservas"* + *"Acá vas a poder ver todos los turnos que tenés reservados o en espera de confirmación."* **No consulta Firestore ni lista nada** (medido: 1 botón en `main`).

Consecuencia directa: tras reservar con éxito (S2), **el jugador no tiene dónde ver su reserva**. Queda solo el estado transitorio de "Solicitud enviada".

---

### F-14 · Los marcadores de Leaflet se superponen y bloquean el clic — **Severidad: MEDIA**

**Evidencia:** fallo de `R5` en su primera ejecución.

Los `L.divIcon` (`.marcador-predio`, `.marcador-jugador`, …) se pisan entre sí. Al hacer clic en uno, Playwright detecta que el evento cae en otro marcador (`marcador-jugador intercepts pointer events`) — es decir, **el usuario puede hacer clic y abrir el bottom-sheet equivocado**. Sucedió dos veces: jugador sobre predio y predio sobre predio.

Workaround usado en el test: filtrar por "Canchas / Predios" y disparar el evento con `dispatchEvent('click')`.

---

### F-15 · El botón de lupa del radar no busca — **Severidad: BAJA**

`MapaRadarUnificado.tsx:509-511`: FAB amarillo con ícono `Search`, **sin texto, sin `title`, sin `aria-label`** (accesible name vacío → infracción de accesibilidad). Al clickear abre el modal *"Mis Partidos"* (`/partidos`), no una búsqueda.

No existe **ningún** input de búsqueda operativo en toda la app: el del home está sin handler (F-01 de Fase 1) y este FAB promete una búsqueda que no hay.

---

### F-16 · Botón "WhatsApp" inerte en el bottom-sheet del predio — **Severidad: BAJA**

`MapaRadarUnificado.tsx:544` — se renderiza junto a "Ver canchas y reservar" pero no tiene handler. Clic sin efecto.

---

### F-17 · Convocatoria y estadísticas no persisten — **Severidad: BAJA**

`handleCreateConvocatoria` (`Screens.tsx:1128`) y el modal "3er TIEMPO" (`:1676-1750`) escriben **solo en `useState`**. Al recargar se pierden. Un capitán puede "armar convocatoria", ver el toast *"Convocatoria creada"*, y al refrescar la app no quedó registro.

---

### F-18 · Warning de React Router al montar rutas modales — **Severidad: BAJA**

```
You rendered descendant <Routes> (or called useRoutes()) at "/" (under <Route path="">)
but the parent route path has no trailing "*".
```
Origen: `AppLayout.tsx:46` y `:57` renderizan `<Routes>` dentro de una ruta sin `*`. Aparece al abrir el modal desde `/`.

---

### F-19 · No existe el módulo de reseñas — **Severidad: INFORMATIVA**

`modules/reviews/` contiene **solo** `reviewTypes.ts` (interfaces). No hay componente, modal, ruta, botón de estrellas ni escritura a `core/config.ts:resenas ('reviews')`. El rating (`⭐ 4.8 FP`, `M 4.2`) se **muestra** en el radar pero no hay UI para crearlo. No testeable.

---

## 3. Lo que funcionó bien

- **Radar:** los 5 filtros responden y cambian los marcadores; geolocalización concedida no rompe nada y la denegada muestra el fallback *"📍 Ubicación denegada. Seleccioná una zona:"* con CABA / La Plata / Córdoba / Rosario.
- **Bottom-sheet del predio:** nombre, *"2 Canchas • F5"*, badge *"PREDIO VERIFICADO"* y CTA correcta.
- **Reserva (S1):** las 3 tarjetas, monto, y las **3 validaciones de comprobante pasan**:
  - `.txt` → *"El comprobante tiene que ser una imagen (jpg, png o webp)."*
  - 6 MB → *"La imagen supera los 5 MB. Bajala de peso y volve a intentar."*
  - Imagen válida → habilita *"Enviar solicitud"* + aviso del bloqueo de 15 min.
- **Reserva (S2):** envío real → *"Solicitud enviada"*, timer `role="timer"` 15:00, detalle del turno, badge *"Esperando validacion del predio"*. La transacción turno+comprobante en una sola escritura funciona con las reglas actuales.
- **Invitar:** con 1 carácter no consulta (sin mensaje erróneo); sin resultados muestra *"No encontramos a nadie con ese nombre"*; al seleccionar habilita *"Copiar link de invitación"*.
- **Convocatoria / Config / Crear equipo:** validación de nombre vacío (*"Poné un nombre para el equipo"*), toasts correctos, guardado sin alterar datos.
- **Partidos:** *"PUBLICAR EN RADAR"* deshabilitado sin fecha, se habilita al completarla, toast *"Partido publicado en el Radar"* y tarjeta nueva.
- **0 errores JS no explicados** durante todo el recorrido.

---

## 4. Cambios realizados en el entorno (no en el código)

Para poder probar la reserva fue imprescindible preparar el fixture (F-09). **Ningún archivo de la app se tocó.**

| Qué | Dónde | Cómo revertir |
|---|---|---|
| 3 docs en `predios/{id}/canchas` | emulador Firestore | `npx tsx testing/scripts/preparar-grilla.ts --limpiar` + borrar canchas |
| 63 docs en `turnos` (7 días × 3 franjas) | emulador Firestore | idem `--limpiar` |
| Reservas creadas por S2 | emulador Firestore | `--limpiar` |
| 1 equipo **"QA Smoke Fase 2"** | emulador Firestore | borrado manual (la app no tiene "borrar equipo", F-03 de Fase 1) |
| Archivos de prueba (PNG 6 MB, .txt) | `testing/assets/` | carpeta descartable |
| Dependencia `@playwright/test` | `testing/package.json` (aislada) | borrar `testing/` |

Script de fixture: `testing/scripts/preparar-grilla.ts` (`--solo-inspeccion`, `--limpiar`).

---

## 5. Artefactos

```
testing/
├── specs/helpers.ts            login + recolección de diagnóstico
├── specs/jugador.spec.ts       14 tests de Fase 2
├── scripts/preparar-grilla.ts  fixture del emulador
├── assets/                     comprobantes de prueba
├── evidencias/f2-*.png         26 capturas
├── evidencias/fase2-eventos.jsonl
└── informe-02-jugador.md       (este archivo)
```

---

## 6. Prioridades para corregir

| # | Hallazgo | Severidad |
|---|---|---|
| F-08 | Radar abre vacío, sin estado de "sin resultados" | ALTA |
| F-09 | Seed no crea canchas ni turnos → reserva inalcanzable | ALTA |
| F-10 | `e.message` de Firestore mostrado en crudo | ALTA |
| F-11 | Seña mayor que el total, sin validación | MEDIA |
| F-12 | "Ver mis partidos" → `/dashboard` inexistente | MEDIA |
| F-13 | `/turnos` no lista reservas | MEDIA |
| F-14 | Marcadores superpuestos bloquean el clic | MEDIA |
| F-15 a F-19 | Lupa inerte, WhatsApp inerte, convocatoria no persiste, warning Router, sin reseñas | BAJA / INFO |

**Siguiente fase sugerida:** Fase 3 — flujo del dueño (alta de predio, suscripción, dashboard, `GeneradorGrilla`, validación de comprobantes). Cierra el ciclo de F-09 y F-11.
