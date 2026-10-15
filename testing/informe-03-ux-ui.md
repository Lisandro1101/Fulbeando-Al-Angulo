# Informe 03 — Auditoría UX/UI del sistema

- **Proyecto:** Fulbeando (`fulbeando-demo`)
- **Fecha:** 2026-10-13
- **Tipo:** Auditoría UX/UI **estática + heurísticas** (revisión de código, sin nueva corrida de Playwright)
- **Alcance:** `app/src` (rutas vivas del `AppLayout` + componentes que renderizan), `tailwind.config.ts`, `styles/index.css`
- **Herramienta:** lectura de fuentes + conteo de patrones (`Select-String`); se reutilizan capturas de las Fases 1-3 (`evidencias/*.png`)
- **Código de la app:** ✅ **no modificado** (solo se agregó este informe en `testing/`)

> Este informe no repite los hallazgos funcionales de las Fases 1-3 (F-01…F-19). Se enfoca en **consistencia visual, accesibilidad y feedback**, tomando como base el código y las capturas ya existentes.

---

## 1. Resultado

El sistema **funciona de punta a punta** (los 3 roles navegan, reservan, publican y validan), pero la **capa visual no es coherente**: conviven dos sistemas de diseño, hay un bug de layout que tapa contenido con el `bottom-nav`, y la accesibilidad/feedback es despareja entre pantallas "nuevas" (con tokens) y "viejas" (paleta cruda).

| Dimensión | Estado | Comentario breve |
|---|---|---|
| Funcionalidad de flujos | ✅ Bien | Cubierta por Fases 1-3 |
| Design system (tokens) | ⚠️ Parcial | Tokens definidos, pero mayoría de pantallas usa paleta cruda (**F-20, F-22**) |
| Layout / safe areas | ❌ Débil | Contenido tapado por el `bottom-nav` (**F-21**) |
| Accesibilidad | ❌ Débil | 24 `aria-label`, 0 `focus-visible:` en `.tsx`, modales sin `role` (**F-24, F-25**) |
| Feedback de estados | ⚠️ Parcial | Buenos estados en pantallas nuevas; errores silenciados y sin skeletons (**F-27, F-28**) |
| Responsive desktop | ⚠️ Parcial | Tokens con `mx-auto`; `Screens.tsx` casi sin `max-w`/`md:` (**F-29**) |
| Higiene de código | ❌ Débil | ~20 archivos sin importadores + layout duplicado (**F-31**) |

Conteo de la paleta cruda en `.tsx` (rutas vivas y no vivas): `zinc-` **445**, `emerald-` **136**, `amber-` **99**, `gray-` **59**, `slate-` **38**, `red-` **32**. `Screens.tsx` (2 928 líneas) concentra **322** referencias a `zinc/emerald/amber`.

---

## 2. Hallazgos

### F-20 · Conviven dos sistemas de diseño en paralelo — **Severidad: ALTA**

**Evidencia:** comparar `evidencias/10-home.png` (paleta cruda) contra `evidencias/16-ajustes.png` (tokens). Capturas `f3-d1-panel.png` (tokens) y `f3-d9-formulario-completo.png` (cruda).

- **Sistema A (canónico, PRD):** tokens en `app/tailwind.config.ts` (`canvas #0B0F19`, `pitch`, `neon`, `urgent #F59E0B`, `occupied`, `ink`, `freemium`) + clases en `app/src/styles/index.css` (`.surface`, `.btn*`, `.field`, `.badge`, `.slot-*`) + wrapper `app/src/modules/ui/pantalla.tsx` (`Pantalla`, `Tarjeta`, `Etiqueta`).
- **Sistema B (ad-hoc):** paleta Tailwind cruda (`bg-zinc-950`, `emerald-500`, `amber-500`) escrita directo en el JSX.

**Dos "fondos negros" distintos** que producen una costura de color visible al navegar:
- `bg-canvas` = `#0B0F19` → **18 archivos** (`App.tsx`, `pantalla.tsx`, `Ajustes.tsx`, `DashboardDueno.tsx`, `CargaDeSena.tsx`, `PerfilDeportivo.tsx`, …).
- `bg-zinc-950` = `#09090B` → **12 archivos** (`app/AppLayout.tsx:40`, `rutas.tsx`, `AlAnguloHome.tsx:109`, `Screens.tsx`, `MapaRadarUnificado.tsx`, `CartaPublica.tsx`, …).

El **shell** (`app/src/app/AppLayout.tsx:40`) pinta `bg-zinc-950`, pero las pantallas con tokens pintan `bg-canvas` encima. `DatosDeTransferencia.tsx` mezcla ambos dentro del mismo componente.

**Impacto:** el usuario percibe "pantallas de apps distintas". El equipo tampoco sabe qué token usar al agregar features. No hay una única fuente de verdad.

---

### F-21 · El `bottom-nav` tapa contenido en las pantallas "token" — **Severidad: ALTA**

**Evidencia de código:** `MenuNavegacion.tsx:26-28` fija el nav abajo (`fixed bottom-0`, alto ~64 px + safe area). Las pantallas con tokens compensan solo con **`pb-safe`** = `env(safe-area-inset-bottom)` (**0-34 px**), que es menor que el nav:

| Archivo | Línea | Padding inferior |
|---|---|---|
| `modules/ui/pantalla.tsx` | 26 | `pb-safe` (afecta a **todas** las que usan `<Pantalla>`) |
| `modules/ui/Screens.tsx` | 353 | `pb-safe` |
| `modules/turnos/pantallas/CargaDeSena.tsx` | 288 | `pb-safe` |
| `modules/cuenta/pantallas/Ajustes.tsx` | 77, 91, 100 | `pb-safe` |
| `modules/predios/pantallas/DashboardDueno.tsx` | 195 | `pb-safe` |

Las pantallas crudas sí lo resuelven con **`pb-28`** (`AlAnguloHome.tsx:115`, `Screens.tsx`).

**Impacto:** el último bloque de contenido (botón "Abonar/Guardar", último ítem de la grilla, última tarjeta) queda **debajo de la barra de navegación** en móvil, sin poder scrollearse hasta verlo del todo. Es un defecto visible, no estético.

---

### F-22 · Tres "verdes" y un ámbar duplicado — **Severidad: MEDIA**

- **Verdes:** `emerald-500 #10B981` (136 usos) vs `pitch #22C55E` (token) vs `neon-green #00FF66` (token, `styles/index.css:143`).
- **Ámbar:** `amber-500` (`#F59E0B`) es el **mismo hex** que `urgent.DEFAULT` (`tailwind.config.ts:35`), pero se usan como dos cosas distintas.

El acento de CTA cambia sin criterio dentro de la misma pantalla — en `AlAnguloHome.tsx`:
- "Ver todos" = `text-emerald-500` (línea 154)
- "Anotarme" = `bg-emerald-500` (línea 239)
- "Lanzar Desafío" = `bg-amber-500` (línea 168)

En `MenuNavegacion.tsx` el ítem activo es `amber-500` (línea 21) y el logo dice `emerald-500` (línea 32).

**Impacto:** no hay un color "primario" claro; el usuario no aprende qué botón es la acción principal.

---

### F-23 · Clases CSS inexistentes en uso (animaciones y utilidades fantasma) — **Severidad: MEDIA**

`tailwind.config.ts` **solo** define las animaciones `radar-pulse` y `slide-up` (líneas 81-84) y **no** hay plugin `tailwindcss-animate`. Sin embargo se usan:

| Clase | Usos | Ubicaciones |
|---|---|---|
| `animate-fade-in` | 5 | `app/AppLayout.tsx:13`, `Screens.tsx:929,2443,2530`, `AlertaInvitacionPush.tsx:137` |
| `animate-fade-in-up` | 1 | `modules/ui/RadarCard.tsx:7` |
| `hide-scrollbar` | 2 | (no definida en CSS) |
| `border-border` | 1 | `modules/cuenta/componentes/PerfilDeportivo.tsx` |

**Impacto:** las animaciones de apertura de modales **no ocurren** (clase inerte) y aparece el borde por defecto del navegador donde se esperaba el token. Da la sensación de UI "a medio terminar".

---

### F-24 · Modales sin `role="dialog"` y botones icónicos sin `aria-label` — **Severidad: MEDIA**

Lo bueno: los modales nuevos **sí** implementan accesibilidad. Hay **7** `role="dialog"` + **7** `aria-modal`:
`DashboardDueno.tsx:289,419,453,518,620`, `ModalValidacion.tsx:95`, `ModalActivarRadar.tsx:48`.

Faltantes:
- **`FlotanteModal`** (`app/AppLayout.tsx:13`): sin `role="dialog"` ni `aria-modal`; el botón de cierre (líneas 15-20) solo tiene el ícono `<X>`.
- Modales en `Screens.tsx:929, 2443, 2530`: sin `role`/`aria-modal`.
- Botones **solo-ícono sin `aria-label`**:
  - `Screens.tsx:931` (cerrar "compartir turno"), `:1903` (engranaje/config equipo), `:2446` (cerrar modal estadísticas).
  - `app/AppLayout.tsx:15` (cerrar modal flotante).

En total hay apenas **24** `aria-label` en todo `app/src`.

---

### F-25 · Formularios sin etiqueta asociada y foco invisible — **Severidad: MEDIA**

- **`focus-visible:` en `.tsx` = 0.** El estilo de foco solo existe en las clases `.btn*` de `styles/index.css:34-51`; el resto de la app no tiene anillo de foco. Al mismo tiempo hay **36** `outline-none` que lo eliminan sin reemplazo.
- Solo **32** `htmlFor` en total; muchos inputs se identifican solo por `placeholder` (p. ej. el registro en `Screens.tsx:111-116`), lo que rompe lectores de pantalla y pruebas por `label`.

---

### F-26 · Uso de `alert()` y `confirm()` nativos — **Severidad: MEDIA**

Rompen el lenguaje visual (diálogo del navegador sobre UI oscura) y no son accesibles ni estilizables:

- `modules/cuenta/pantallas/Ajustes.tsx:23` → `alert('¡Notificaciones activadas!')`
- `modules/chat/ChatRoom.tsx:30` → `alert('Máximo 500 caracteres.')`
- `modules/comunidad/componentes/PostCard.tsx:120` → `confirm('¿Borrar esta publicación?')`
- `modules/ui/Screens.tsx:1493, 1508` → `window.confirm(...)`

---

### F-27 · Errores silenciados y "vacío" que esconde fallas de red — **Severidad: MEDIA**

- `modules/cuenta/componentes/EditorPredio.tsx:59` → `catch { setPredios([]) }`: si falla la consulta, la UI muestra *"Todavía no cargaste tu complejo"* cuando en realidad hubo un error.
- `modules/admin/AdminDashboard.tsx:38` → `contar()` hace `console.error('No pude contar:', err)` y devuelve `null`: el administrador no se entera de que un conteo falló.
- Muchos `catch` en `Screens.tsx` solo escriben a consola.

**Impacto:** pantallas que "parecen vacías" cuando en realidad falló la red; soporte no puede distinguir un dataset vacío de un error.

---

### F-28 · Sin skeletons y cuatro implementaciones de toast distintas — **Severidad: BAJA**

- **No hay skeletons** en la app: toda carga es spinner o texto "Cargando…".
- Hay **4** implementaciones de toast copiadas y divergentes: `Screens.tsx`, `AlAnguloHome.tsx`, `MapaRadarUnificado.tsx`, `AlertaInvitacionPush.tsx`. Ninguna usa `role="status"`/`aria-live`, así que un lector de pantalla no anuncia el resultado ("Solicitud enviada", "Te anotaste").

---

### F-29 · Desktop y tipografía débil en las pantallas "crudas" — **Severidad: BAJA**

- `Screens.tsx` tiene solo **2** usos de `md:` y **12** de `max-w-` en 2 928 líneas → los formularios se estiran a todo el ancho en monitor.
- `pantalla.tsx` no fija `max-w` (0 usos).
- Tipografía muy chica en muchos lugares: `text-[10px]` **32**, `text-[11px]` **30**, `text-[9px]` **5**; combinados con `text-zinc-500` (**84**) y `text-zinc-600` (**10**) sobre fondo oscuro → contraste y legibilidad bajos (candidato a incumplir WCAG AA; la medición formal quedó pendiente desde F-06).

---

### F-30 · `alt` genéricos y un `alt=""` que pierde información — **Severidad: BAJA**

- `MapaRadarUnificado.tsx:559` → `alt=""` en el escudo dentro del mapa.
- Genéricos no descriptivos: `PostCard.tsx:205` (`"Foto"`), `PerfilDeportivo.tsx:319` (`"Perfil"`), `TarjetaJugador.tsx:75` (`"Perfil"`), `WelcomeCard.tsx:45` (`"Avatar"`), `PlayerCard.tsx:26` (`"Avatar Jugador"`), `Screens.tsx:1916` (`"Escudo"`), `Screens.tsx:140` (`"G"`).

---

### F-31 · Código muerto y layout duplicado — **Severidad: BAJA**

Escaneo de importadores (excluyendo barrels): **~20 archivos** que ningún módulo importa, incluidos varios con deuda visual importante:

`modules/ui/AppLayout.tsx` (layout **duplicado** con nav emoji + banner *"ESPACIO PUBLICITARIO ADMOB"* falso, línea 22), `modules/ui/NavegacionHeader.tsx` (retorna `null`), `modules/ui/PlayerCard.tsx`, `modules/ui/RadarCard.tsx`, `modules/ui/MatchValidationWidget.tsx`, `modules/chat/ChatRoom.tsx`, `modules/chat/useChat.ts`, `modules/jugador/pantallas/DashboardJugador.tsx`, `modules/publico/pantallas/Landing.tsx`, `modules/admin/pantallas/PanelSuperadmin.tsx`, `modules/admin/adminTypes.ts`, `modules/onboarding/components/WelcomeCard.tsx`, `modules/onboarding/onboardingService.ts`, `modules/radar/components/RadarFloatingCard.tsx`, `modules/radar/freeAgentsRadarService.ts`, `modules/radar/partidosService.ts`, `modules/reviews/reviewTypes.ts`, `modules/solicitudes/componentes/FormularioSolicitudDueno.tsx`, `modules/teams/components/TeamCreationForm.tsx`, `modules/venues/venueRadarService.ts`, `modules/monetization/adsControl.ts`.

Además existe un **`sticky` inerte** en el header de `pantalla.tsx:17` (es hermano del contenedor con scroll, no dentro de él).

---

## 3. Lo que funcionó bien

- **Tokens existen y se usan donde importa:** las clases `.btn*` (≈50 referencias), `.field`, `.surface`, `.badge` están definidas en `styles/index.css` y se aplican en las pantallas token.
- **Accesibilidad bien hecha en pantallas nuevas:** `DashboardDueno`, `ModalValidacion` y `ModalActivarRadar` usan `role="dialog"` + `aria-modal`; `helpers.ts` de testing pudo localizar esos modales por rol sin problemas.
- **Estados vacíos claros:** `/turnos` (icono + título + texto) y el feed social ("No declaraste tu partido/localidad…") son el patrón a replicar.
- **Feedback async resuelto:** `BotonIngreso`, `Composer` (estados de subida), `CargaDeSena`, `GestorCanchas`, `SelectorFranja` muestran progreso y errores utilizables.
- **Navegación adaptativa:** `MenuNavegacion` cambia bottom-nav (móvil) ↔ sidebar (desktop) y respeta safe-area en el borde inferior.
- **Errores de auth legibles:** los mensajes de login están mapeados a español rioplatense (Fase 1).
- **Optimización de imágenes:** `imageCompressor.ts` conserva el aspecto en las fotos de post (`object-contain`) y recorta 1:1 solo los avatares.

---

## 4. Metodología y alcance

- Revisión **estática** de `app/src`, `tailwind.config.ts` y `styles/index.css`, con conteo de patrones por `Select-String`.
- Se **reutilizaron** las capturas de Fases 1-3 (`evidencias/10-home.png`, `16-ajustes.png`, `f3-d1-panel.png`, `f3-d9-formulario-completo.png`, etc.) como evidencia visual de las inconsistencias.
- **No** se ejecutó Playwright ni se modificó el código de la app.
- **Fuera de alcance:** medición formal de contraste WCAG, pruebas con lector de pantalla y testeos de teclado (quedan como fase específica de accesibilidad).

---

## 5. Artefactos

```
testing/
├── informe-01-smoke.md
├── informe-02-jugador.md
├── informe-03-ux-ui.md        (este archivo)
├── evidencias/                (capturas reutilizadas de Fases 1-3)
├── specs/  scripts/  assets/  resultados/  reporte-html/
```

---

## 6. Prioridades para corregir

| # | Hallazgo | Severidad | Arreglo sugerido |
|---|---|---|---|
| F-20 | Dos sistemas de diseño / dos fondos | ALTA | Adoptar tokens (`canvas/ink/pitch/urgent`, `.btn/.field/.surface`) y migrar pantallas crudas; un solo fondo |
| F-21 | `bottom-nav` tapa contenido | ALTA | `pb-[calc(4rem+env(safe-area-inset-bottom))]` en `Pantalla` y pantallas token |
| F-22 | 3 verdes + ámbar duplicado | MEDIA | Definir 1 CTA primario (verde) y 1 secundario; retirar `emerald-500/amber-500` crudos |
| F-23 | Clases CSS inexistentes | MEDIA | Definir `animate-fade-in` (o quitarla) y `hide-scrollbar`/`border-border` |
| F-24 | Modales sin `role`, íconos sin `aria-label` | MEDIA | `role="dialog"`+`aria-modal` en `FlotanteModal` y modales de `Screens.tsx`; `aria-label` en cierres |
| F-25 | Sin labels / foco invisible | MEDIA | `htmlFor`/`id` y `focus-visible:` global |
| F-26 | `alert`/`confirm` nativos | MEDIA | Un `<Modal>` + `<Toast>` propios |
| F-27 | Errores silenciados | MEDIA | Distinguir "vacío" de "error" (`AsyncState`) con mensaje accionable |
| F-28 | Sin skeletons / toasts duplicados | BAJA | Componente de skeleton + un único toast con `aria-live` |
| F-29 | Desktop/tipografía débil | BAJA | `max-w` en formularios; subir 1-2 px los textos de 9-10 px |
| F-30 | `alt` genéricos / vacío | BAJA | `alt` descriptivo por contenido |
| F-31 | Código muerto + layout duplicado | BAJA | Borrar ~20 archivos sin importadores y `modules/ui/AppLayout.tsx` |

**Sugerencia de secuencia:** un sprint corto de **Quick Wins** (F-21, F-23, F-24 + unificar CTA) para bajar los defectos visibles, y luego un sprint de **consolidación del design system** (F-20, F-22, F-25, F-26, F-28) con un `<Modal>`/`<Toast>`/`<AsyncState>` únicos.

---

## 7. Estado de las correcciones

> `npm run typecheck` + `npm run build` OK tras cada tanda. Código de la app **sí** modificado en esta sección.

| # | Hallazgo | Estado | Cambios |
|---|---|---|---|
| F-21 | `bottom-nav` tapa contenido | ✅ Resuelto | `styles/index.css`: utilidad `.pb-nav` (`4rem + safe-area`); aplicada en `pantalla.tsx:26` y `Screens.tsx:353`; quitado `pb-safe` redundante en `Ajustes.tsx`, `DashboardDueno.tsx:195`, `CargaDeSena.tsx:288` |
| F-22 | 3 verdes + ámbar duplicado | 🟡 Parcial | CTA "Lanzar Desafío" (home `AlAnguloHome.tsx:168` y FAB del radar `MapaRadarUnificado.tsx:513`) unificado a verde; quedan usos crudos en el resto de pantallas |
| F-23 | Clases CSS inexistentes | ✅ Resuelto | `tailwind.config.ts`: `fade-in`/`fade-in-up` + color `border` (#1F2937); `index.css`: `.hide-scrollbar` |
| F-24 | Modales sin `role`, íconos sin `aria-label` | ✅ Resuelto | `aria-label` en cierres/íconos (`app/AppLayout.tsx`, `Screens.tsx`, `MapaRadarUnificado.tsx:505,513`); `role="dialog"`+`aria-modal` en `FlotanteModal` y en los 7 modales de `Screens.tsx` (compartir, 3er tiempo, radar, crear, config, invitar, convocar) y `AlertaInvitacionPush` |
| F-25 | Sin labels / foco invisible | ✅ Resuelto | Foco visible global `:focus-visible:not(:disabled)` en `index.css`; `htmlFor`/`id` (o `aria-label`) en **todos** los `input`/`select`/`textarea` de `src` (barrido automático sin faltantes; checkboxes anidados en `<label>` exceptuados) |
| F-26 | `alert`/`confirm` nativos | ✅ Resuelto | `modules/ui/overlays.tsx`: `ProveedorConfirm` + `useConfirmar(): Promise<boolean>`; montado en `App.tsx`. Reemplazados todos los `window.confirm`/`alert` (`PostCard.tsx`, `Screens.tsx` Screen7, `Ajustes.tsx`) |
| F-27 | Sin estados de error/retry | ✅ Resuelto | `EditorPredio.tsx`: estado `errorCarga` + mensaje + botón "Reintentar" |
| F-28 | Sin skeletons / toasts duplicados | ✅ Resuelto | `overlays.tsx`: `Toast` (role=status, aria-live, tipos exito/error/info) y `Esqueleto`; toasts unificados en `Screens.tsx`, `AlAnguloHome.tsx`, `MapaRadarUnificado.tsx`, `AlertaInvitacionPush.tsx`; `Feed.tsx` usa 3 cards `Esqueleto` |
| F-30 | `alt` genéricos / vacío | ✅ Resuelto (vivos) | `MapaRadarUnificado.tsx:559`, `PostCard.tsx:205`, `TarjetaJugador.tsx:75`, `PerfilDeportivo.tsx:319`, `Screens.tsx:140,1916` |
| F-31 | Código muerto | ✅ Resuelto | 22 archivos sin importadores borrados + 11 dirs vacíos (`modules/{chat,monetization,reviews,onboarding,publico,jugador/pantallas,solicitudes/componentes,radar/components}` y varios) |
| F-29 | Desktop/tipografía débil | ✅ Resuelto | Textos `text-[9px]`/`text-[10px]` subidos a `text-[11px]` (27 usos en 6 archivos); `max-w-2xl` en `pantalla.tsx` (header + `main`) y `max-w-md`/`max-w-3xl` en las pantallas crudas `Screen2/3/10` de `Screens.tsx` |
| F-20 | Dos design systems | 🟡 Parcial (Paso 1) | **Fondos unificados al token `canvas`**: los 47 `bg-zinc-950` de 12 archivos (incluido el shell `AppLayout.tsx:41`) pasaron a `bg-canvas`. Queda pendiente migrar el resto de la paleta cruda (`emerald`/`amber`/`zinc-900`) a tokens (`pitch`/`urgent`/`canvas-raised`) módulo por módulo |

Pendiente: **F-20** (continuar migración de paleta cruda a tokens por módulo: `Screens.tsx`, `AlAnguloHome.tsx`, `MapaRadarUnificado.tsx`, `MenuNavegacion.tsx`, etc.).
