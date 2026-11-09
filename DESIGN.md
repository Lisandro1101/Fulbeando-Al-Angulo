---
name: Fulbeando / Al Ángulo
description: PWA de fútbol amateur con estética deportiva "Noche de Sintético", alto contraste y ritmo ágil para móviles
colors:
  pitch-bg: "#0B0F19"
  pitch-surface: "#141B2D"
  pitch-border: "#1F2937"
  primary: "#16A34A"
  primary-hover: "#15803D"
  urgent: "#D97706"
  urgent-hover: "#B45309"
  occupied: "#DC2626"
  occupied-hover: "#B91C1C"
  ink: "#0F172A"
  ink-light: "#F8FAFC"
  ink-muted: "#94A3B8"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
  heading:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  card: "16px"
  btn: "12px"
  badge: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.btn}"
    padding: "12px 16px"
  button-urgent:
    backgroundColor: "{colors.urgent}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.btn}"
    padding: "12px 16px"
---

## Overview

Fulbeando / Al Ángulo está diseñada bajo el concepto estético **"Noche de Sintético"**: una experiencia de fútbol amateur de alto contraste, energética pero sobria, optimizada para uso en cancha con smartphones. La interfaz prioriza legibilidad inmediata (estados de turnos, semáforo libre/ocupado, radar de suplentes), navegación con el pulgar y micro-interacciones deportivas sin caer en clichés de dashboards corporativos ni estilos crypto recargados.

## Colors

- **Superficie base y fondo:**
  - `pitch-900` (`#0B0F19`): Lienzo oscuro principal de la PWA.
  - `pitch-800` (`#141B2D`): Fondo de tarjetas, paneles flotantes y modales.
  - `pitch-700` (`#1F2937`): Bordes finos, divisores y contornos de tarjeta.
- **Acentos deportivos funcionales:**
  - `primary` / `neon.green` (`#16A34A`): Césped eléctrico. Usado para turnos libres, confirmaciones, estado "disponible" y CTAs de acción primaria ("Voy a jugar", "Aprobar").
  - `urgent` / `amber` (`#D97706`): Modo radar y alerta "Falta 1", seña pendiente de validación y límites de tiempo.
  - `occupied` / `red` (`#DC2626`): Turnos ocupados, cancelaciones y rechazos.
  - `gold` (`#CA8A04`): MVP de partido, fichas estelares y estatus destacado.
- **Tipografía y contraste:**
  - `ink-light` (`#F8FAFC`): Títulos, números grandes de marcador/hora y texto primario.
  - `ink-muted` (`#94A3B8`): Subtítulos, metadatos (distancia en km, tipo de superficie, precio por jugador).

## Typography

- **Display & Marcadores:** `Outfit` (sans-serif geométrico). Utilizado para números grandes, horarios destacados de turnos (`21:00 hs`), resultados y contadores del radar.
- **Interfaz y lectura general:** `Inter` (sans-serif). Utilizado para etiquetas, botones, formularios, tarjetas de jugadores y nombres de complejos deportivos.

## Layout

- **Mobile-first PWA:** Todo el flujo crítico está diseñado para alcanzarse con una sola mano en pantallas de 360px a 430px de ancho.
- **Espaciado inferior seguro (`pb-nav`):** Reserva estricta de `calc(4rem + env(safe-area-inset-bottom))` para evitar que la barra de navegación inferior cubra botones o el último elemento de listas.
- **Ritmo vertical:** Espaciados basados en escala de 4/8/12/16/24px para mantener alineación limpia entre tarjetas de partidos y grillas horarias.

## Elevation & Depth

- **Capas de elevación:**
  - Capa 0: Fondo profundo `#0B0F19`.
  - Capa 1: Tarjetas y listas `#141B2D` con borde sutil `border-pitch-700` (1px).
  - Capa 2: Menú inferior flotante y barras de acción con leve backdrop blur (`backdrop-blur-md`).
  - Capa 3: Modales, bottom-sheets de reserva y overlays de confirmación.
- **Sombras con resplandor temático:**
  - `glow`: Resplandor verde para confirmaciones exitosas y turnos reservados.
  - `pulse-radar`: Pulso concéntrico sutil en el radar de jugadores libres.

## Shapes

- **Tarjetas y contenedores:** Esquinas redondeadas amplias (`rounded-2xl` o `16px`).
- **Botones y campos de formulario:** Redondeo ergonómico (`rounded-xl` o `12px`).
- **Badges y tags de estado:** Redondeo completo tipo píldora (`rounded-full`).

## Components

- **Botón Primario (`.btn-primary`):** Verde césped con contraste blanco, feedback táctil al presionar (`active:scale-[0.99]`).
- **Botón Urgente (`.btn-urgent`):** Gradiente ámbar-naranja para el llamado a suplentes en tiempo real.
- **Botón Fantasma / Secundario (`.btn-ghost`):** Fondo tenue de alto contraste para acciones secundarias ("Volver", "Cancelar").
- **Campos de formulario (`.field`):** Bordes claros, feedback de foco con anillo verde esmeralda y tipografía seminegrita para lectura al sol.
- **Badges de estado:** Píldoras compactas con ícono explicativo (F5 / F7 / Sintético / Techado / Falta 1).

## Do's and Don'ts

### Do's
- Mantener alto contraste entre texto blanco `#F8FAFC` y fondos oscuros `#141B2D`.
- Usar el semáforo de colores siempre con el mismo significado (Verde = Libre/Confirmado, Ámbar = Esperando seña/Radar, Rojo = Ocupado).
- Utilizar transiciones y desaceleraciones suaves (`ease-out`, `ease-in-out`) en modales y cambios de vista.
- Incluir siempre el padding seguro inferior en vistas con scroll que coexisten con el menú flotante.

### Don'ts
- **No usar bordes laterales gruesos en tarjetas (`border-l-4`)**: Es un antipatrón visual de IA; usar badges o sutiles cambios de color en el texto/ícono.
- **No usar animaciones rebotinas o elásticas (`animate-bounce`)**: Se sienten anticuadas y distraen en un contexto deportivo; preferir `fade-in-up` o transiciones de escala suaves.
- **No anidar tarjetas dentro de tarjetas con los mismos bordes y sombras.**
- **No usar gradientes violeta-azul genéricos de plantillas SaaS.**
