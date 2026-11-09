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
| [`02-desafio-entre-capitanes.ts`](file:///c:/Users/Dell%20PC/Desktop/Proyectos%20de%20Programacion/Fulbeando/testing/ui-ux/02-desafio-entre-capitanes.ts) | Dos capitanes con sus equipos se desafían por el radar, negocian y pactan un partido en tiempo real. | `npm run test:ui:desafio` |
| [`03-muro-comunidad-y-convocatoria.ts`](file:///c:/Users/Dell%20PC/Desktop/Proyectos%20de%20Programacion/Fulbeando/testing/ui-ux/03-muro-comunidad-y-convocatoria.ts) | Publicación en el muro social, carta de jugador FUT, reacciones en vivo y comentarios. | `npm run test:ui:muro` |
| [`04-tercer-tiempo-y-mvp.ts`](file:///c:/Users/Dell%20PC/Desktop/Proyectos%20de%20Programacion/Fulbeando/testing/ui-ux/04-tercer-tiempo-y-mvp.ts) | Tercer Tiempo, votación democrática de la figura (MVP), planilla oficial del capitán y estadísticas. | `npm run test:ui:mvp` |

---

## 🚀 Cómo ejecutar los Scripts Visuales

1. Asegúrate de tener los servidores corriendo en segundo plano:
   - Emuladores de Firebase: `127.0.0.1:8080`, `127.0.0.1:9099`
   - Frontend Vite: `http://localhost:5173`

2. Ejecuta cualquiera de los comandos en tu terminal:

   - **Script 1 (Reserva y Aprobación):**
     ```powershell
     npm run test:ui:reserva
     ```
   - **Script 2 (Desafío entre Capitanes):**
     ```powershell
     npm run test:ui:desafio
     ```
   - **Script 3 (Muro Social y Carta FUT):**
     ```powershell
     npm run test:ui:muro
     ```
   - **Script 4 (Tercer Tiempo y MVP):**
     ```powershell
     npm run test:ui:mvp
     ```

3. Observa tu monitor:
   - Se abrirán automáticamente **2 ventanas reales de Google Chrome** lado a lado.
   - Las acciones ocurren con ritmo pausado (`slowMo`) para que aprecies los diseños, modales, chips interactivos y animaciones.
   - Las capturas de pantalla de cada etapa se guardarán automáticamente en `testing/ui-ux/capturas/`.
   - Al terminar, las ventanas permanecerán abiertas para que puedas interactuar libremente.
