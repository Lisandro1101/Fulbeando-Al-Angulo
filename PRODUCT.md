# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Jugadores y Organizadores de fútbol amateur:** buscan canchas disponibles, reservan turnos, organizan partidos con amigos y necesitan resolver el problema de "falta uno" convocando suplentes de último momento.
- **Dueños y Administradores de Complejos/Predios:** gestionan canchas (F5, F7, F8, F11), franjas horarias y turnos semanales; reciben solicitudes con comprobante de seña y aprueban o rechazan con un clic para evitar turnos caídos y desorganización.
- **Superadministradores:** moderación de la plataforma, verificación de predios adheridos y control de métricas globales de adopción.

## Product Purpose

Conectar a administradores de predios de fútbol amateur con organizadores de partidos y jugadores individuales en Argentina (iniciando en Zona Sur / AMBA). Resuelve dos fricciones críticas del ecosistema del fútbol 5/7:
1. La desorganización en reservas y la pérdida de ingresos de los predios por reservas caídas o no confirmadas.
2. La dificultad recurrente de los equipos para completar los cupos a último momento ("Falta 1").

## Positioning

Una plataforma ágil centrada en la experiencia de partido real: mapa interactivo de canchas adheridas con validación directa de comprobantes de seña y un **"Radar Falta 1"** geolocalizado en tiempo real que notifica y recluta jugadores disponibles en la zona sin intermediarios lentos.

## Operating Context

- **Entorno de uso:** Predominantemente teléfonos móviles (PWA optimizada para una mano, con safe-areas y lectura bajo reflectores o luz solar en la cancha).
- **Flujos clave:**
  - Búsqueda en mapa y selección de cancha/turno.
  - Carga de comprobante de transferencia bancaria (Alias/CBU) con bloqueo temporal de 15 minutos.
  - Validación en un toque desde el panel del dueño del predio.
  - Activación de alerta geolocalizada "Radar Falta 1" para sumar suplentes cercanos.
  - Creación de equipos y desafíos entre escuadras.

## Capabilities and Constraints

- **PWA offline-first / responsive:** Optimizada para navegación rápida móvil.
- **Sin pasarela de pagos integrada en MVP:** Las señas se pagan por transferencia bancaria directa (CBU/Alias); la app gestiona y almacena los comprobantes gráficos para aprobación del predio.
- **Soft deletes:** No hay borrado físico de reservas ni perfiles; se mantiene trazabilidad y reputación.
- **Emuladores de Firebase:** Configuración desacoplada en `fulbeando-demo` para desarrollo local sin costo ni impacto en producción.

## Brand Commitments

- **Nombre:** Fulbeando / Al Ángulo.
- **Tono y Personalidad:** Futbolero, auténtico, dinámico, callejero y confiable.
- **Identidad visual:** Estética "Noche de Sintético" (Dark mode nativo, contrastes altos, toques de césped verde eléctrico y alertas ámbar/fuego estilo radar).

## Product Principles

1. **Inmediatez en la cancha:** Menos de 3 toques para reservar o sumarse a un partido.
2. **Claridad operativa:** Semáforo visual transparente para el estado de turnos (Libre / Pendiente / Confirmado).
3. **Respeto a la cultura futbolera local:** Términos reales del fútbol amateur argentino (partido, turno, seña, arquero, falta uno, predio).
4. **Cero fricción innecesaria:** Sin descargas pesadas de tienda; acceso instantáneo vía web/PWA.
