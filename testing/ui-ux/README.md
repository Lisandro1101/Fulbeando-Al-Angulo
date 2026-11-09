# 🎭 Suite de Testing Visual UI/UX — Fulbeando

Esta carpeta contiene scripts interactivos desarrollados con **Playwright** para probar los flujos completos de la aplicación abriendo **ventanas reales de Google Chrome** lado a lado en tu monitor.

El propósito principal es:
- **Evaluar la experiencia de usuario (UX)**: fluidez, legibilidad, modales, transiciones y micro-interacciones.
- **Validar el diseño (UI)**: contraste de colores, espaciados, fuentes y responsividad.
- **Comprobar la reactividad en tiempo real**: sincronización instantánea entre diferentes roles (capitán, jugador, dueño de predio).

---

## 📋 Catálogo de Scripts

| Script | Descripción | Comando de Ejecución |
| :--- | :--- | :--- |
| [`01-reserva-y-aprobacion.ts`](file:///c:/Users/Dell%20PC/Desktop/Proyectos%20de%20Programacion/Fulbeando/testing/ui-ux/01-reserva-y-aprobacion.ts) | Capitán reserva turno en cancha y Dueño aprueba en tiempo real (ventanas lado a lado). | `npm run test:ui:reserva` |
| `02-desafio-entre-capitanes.ts` *(próximo)* | Dos capitanes con sus equipos se desafían por el radar, negocian y pactan un partido. | `npm run test:ui:desafio` |
| `03-muro-comunidad-y-convocatoria.ts` *(próximo)* | Publicación en el muro social, búsqueda de jugador libre y postulación. | `npm run test:ui:muro` |
| `04-tercer-tiempo-y-mvp.ts` *(próximo)* | Cierre de partido, votación de figura/MVP del partido y actualización de estadísticas. | `npm run test:ui:mvp` |

---

## 🚀 Cómo ejecutar el Script 1 (Reserva y Aprobación)

1. Asegúrate de tener los servidores corriendo en segundo plano:
   - Emuladores de Firebase: `127.0.0.1:8080`, `127.0.0.1:9099`
   - Frontend Vite: `http://localhost:5173`
2. Ejecuta el comando en tu terminal:
   ```powershell
   npm run test:ui:reserva
   ```
3. Observa tu pantalla:
   - Se abrirán automáticamente **2 ventanas de Chrome** (Izquierda: Jugador Lio, Derecha: Dueño Ramiro).
   - El script ejecutará el flujo con pausas deliberadas (`slowMo`) para que puedas analizar el comportamiento visual de cada paso.
   - Las capturas de pantalla se guardarán automáticamente en `testing/ui-ux/capturas/`.
   - Al terminar, las ventanas permanecerán abiertas para que puedas inspeccionarlas a tu gusto.
