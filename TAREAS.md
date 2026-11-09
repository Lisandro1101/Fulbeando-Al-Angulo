# 📋 Tablero de Tareas Pendientes — Fulbeando / Al Ángulo

> **Propósito:** Ayuda memoria y backlog operativo del sistema. Utilizá los checkboxes (`- [ ]` / `- [x]`) para dar seguimiento a las tareas a medida que las vayamos desarrollando y corrigiendo.

---

## 🟢 Estado Actual del MVP (Lo que ya está funcionando)
- [x] **Autenticación con roles:** Jugador, Dueño de Predio y Superadministrador con emuladores locales (`fulbeando-demo`).
- [x] **Radar geolocalizado en vivo:** Búsqueda en mapa con Geohash para canchas, jugadores disponibles y desafíos.
- [x] **Flujo de reserva y seña:** Bloqueo provisorio de 15 minutos, carga de comprobante y alias bancario.
- [x] **Panel del predio (`/venue-dashboard`):** Grilla semáforo (libre, pendiente, ocupado), bloqueo manual y modal de validación.
- [x] **Modernización UI móvil:**
  - Integración de Sonner para notificaciones toast apiladas.
  - Migración a Vaul Drawer en detalle del radar, notificaciones, compositor de comunidad, chat de desafíos y validación de turnos.
  - Corrección del modal de validación de turnos para que no corte los botones de "Aprobar turno" y "Rechazar".

---

## 🚀 1. Módulo Predios & Dueños (`/venue-dashboard`)

- [x] **Modal de validación de reservas:**
  - [x] Fijar botones de acción al pie con `min-h-0` y scroll independiente del contenido.
  - [x] Previsualización controlada de imágenes/PDF de comprobantes.
- [x] **Visor de comprobante ampliado:**
  - [x] Modal con zoom y rotación para comprobantes con texto pequeño o capturas borrosas.
- [x] **Configuración de Predio & Canchas:**
  - [x] Carga y edición de fotos reales de cada cancha (césped, iluminación, techada).
  - [x] Configuración diferenciada de precios por día/horario (ej. tarifas noche vs. tarde).
- [x] **Carga masiva de turnos (`GeneradorGrilla`):**
  - [x] **Optimización y proceso en segundo plano:** Diagnosticar por qué demora tanto la creación masiva de turnos. Si el período seleccionado es extenso (ej. 6 meses o 1 año con miles de turnos), confirmar la acción al usuario de inmediato ("Dar el OK") y procesar la escritura en segundo plano/lotes asíncronos sin congelar la interfaz ni bloquear el panel.
  - [x] Permitir replicar la grilla de una semana a la siguiente con un solo clic.
  - [x] Opción de pausar/bloquear feriados completos.
- [x] **Historial y balance de caja:**
  - [x] Pestaña con resumen de señas cobradas en la semana/mes.
  - [x] Exportación rápida a Excel/CSV o PDF para el dueño.

---

## ⚽ 2. Módulo Jugadores, Partidos & Radar "Falta 1"

- [x] **Búsqueda de texto en el Radar (Lupa):**
  - [x] Activar el botón de la lupa en el mapa para desplegar una barra de búsqueda escrita interactiva.
  - [x] Permitir buscar por texto coincidencias de:
    - **Canchas y predios** (por nombre de complejo o barrio).
    - **Equipos** (por nombre o zona).
    - **Jugadores** (por nombre o posición).
  - [x] Al seleccionar un resultado de búsqueda, centrar el mapa y abrir automáticamente la ficha de la entidad.
- [x] **Convocatoria de Suplentes ("Falta 1"):**
  - [x] Flujo completo de postulación de jugador ("Voy"): notificación en tiempo real al organizador.
  - [x] Aceptación o descarte de postulantes por parte del organizador del partido.
  - [x] Cierre automático de la alerta cuando se completan los cupos requeridos.
- [x] **Filtros del Mapa y Radar:**
  - [x] Filtro por tipo de cancha (F5, F7, F8, F11) y si es techada.
  - [x] Filtro por franja horaria (mañana, tarde, noche).
- [x] **Ficha y Perfil del Jugador:**
  - [x] Switch "Disponible para jugar hoy" con selector de horario (ej. "Disponible a partir de las 20hs").
  - [x] Carga de avatar/foto de perfil personalizada.
  - [x] Medallero deportivo y Fair Play visible para otros capitanes.

---

## 🏆 3. Módulo Equipos, Desafíos & Comunidad

- [x] **Desafíos entre equipos (`ModalProponerDesafio`):**
  - [x] **Horario personalizado:** Reemplazar las tarjetas rápidas con horarios fijos predeterminados por un selector/campo de horario personalizado (permitiendo al capitán proponer la hora exacta del desafío).
- [x] **Cierre de Desafíos & Partidos:**
  - [x] Carga de resultado final del partido (goles de cada equipo).
  - [x] Votación de figura del partido (MVP) y calificación de Fair Play entre rivales.
  - [x] Actualización automática de la tabla de posiciones y estadísticas del equipo.
- [x] **Feed de Comunidad:**
  - [x] Adjuntar fotos de partidos y festejos en los posteos.
  - [x] Comentarios y reacciones ("Aplausos", "Fuego") en publicaciones de equipos.

---

## 🎨 4. UX/UI, Accesibilidad & Sistema de Diseño

- [x] **Unificación de fondos y paleta ("Noche de Sintético"):**
  - [x] Reemplazar residuos de `bg-zinc-950` por el token oficial `bg-canvas` (`#0B0F19`) para evitar saltos de color al navegar.
  - [x] Unificar los acentos verdes (`emerald-500` vs token `pitch #22C55E`).
- [x] **Ajuste de Safe Area inferior:**
  - [x] Asegurar que todas las pantallas con contenido scrolleable usen `pb-28` para que el `MenuNavegacion` no tape elementos finales.
- [x] **Limpieza de estilos y clases inexistentes:**
  - [x] Reemplazar `animate-fade-in` por animaciones de Framer Motion o clases Tailwind nativas (`animate-in fade-in duration-200`).
  - [x] Remover componentes y archivos obsoletos o sin importadores.
- [x] **Accesibilidad (a11y):**
  - [x] Incorporar `aria-label` en botones con sólo íconos (cerrar, agregar, volver).
  - [x] Agregar estados de foco visibles (`focus-visible:ring-2`) para navegación por teclado.

---

## ⚙️ 5. Backend, Notificaciones & Producción

- [x] **Firebase Cloud Functions (Automatizaciones):**
  - [x] Tarea programada (cron) para liberar turnos en `bloqueado_temporal` cuyos 15 minutos hayan vencido sin aprobación (`liberarTurnosBloqueadosExpirados`).
  - [x] Envío de notificaciones push móviles (FCM / Web Push) cuando:
    - Se confirma o rechaza una seña (`notificarJugadorEstadoSena`).
    - Se activa una alerta de "Falta 1" cerca del jugador (`notificarAlertaFaltaUno`).
    - Un equipo recibe una propuesta de desafío (`notificarEquipoPropuestaDesafio`).
- [x] **Reglas de Seguridad Firestore (`firestore.rules`):**
  - [x] Auditar y asegurar que los jugadores sólo puedan modificar sus propios turnos y perfiles.
  - [x] Restringir que sólo el dueño del predio asignado pueda validar o rechazar turnos de sus canchas.
- [x] **Optimización Offline y PWA:**
  - [x] Configurar caché de Service Worker para carga instantánea del mapa y recursos estáticos (`runtimeCaching` en Workbox para tiles OSM, Google Fonts y assets R2).

---

## 📝 Notas de Seguimiento
*(Espacio libre para anotar detalles de reuniones, ideas sueltas o bugs descubiertos durante las pruebas)*

- **Idea:** Botón de compartir turno o partido directamente por WhatsApp con mensaje preformateado.
- **Recordatorio:** Credenciales de prueba en emulador: `superadmin@fulbeando.com` / `dueno@fulbeando.com` / `lio@alangulo.com` (todas con password `password123`).
