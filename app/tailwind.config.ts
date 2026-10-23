import type { Config } from 'tailwindcss'

/**
 * Paleta Fusionada "Fulbeando x Al Ángulo".
 * Dark mode por defecto, alto contraste para exteriores y estética FUT deportiva.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta base para la app con variantes
        canvas: {
          DEFAULT: '#F8FAFC', // Fondo base light/degradé de la app
          raised: '#111827',  // Card y panel oscuro
          sunken: '#070B12',  // Fondo profundo
          light: '#FFFFFF',
          'light-raised': '#F8FAFC',
          'light-sunken': '#F1F5F9',
        },
        pitch: {
          900: '#0B0F19', // Fondo app (Ultra oscuro)
          800: '#141B2D', // Tarjetas y paneles
          700: '#1F2937', // Bordes y divisores
          // Acentos verdes para fútbol
          DEFAULT: '#16A34A', 
          muted: '#15803D',
          faint: '#DCFCE7',
        },
        // Acentos "FUT" enérgicos de Al Ángulo
        neon: {
          green: '#16A34A', // Éxito, confirmación, status 'open'
          orange: '#EA580C', // Alertas, CTAs principales
          gold: '#CA8A04', // MVP, Premium, Fichas estelares
        },
        urgent: {
          DEFAULT: '#D97706', 
          muted: '#B45309',
          faint: '#FEF3C7',
        },
        occupied: {
          DEFAULT: '#DC2626', 
          muted: '#B91C1C',
          faint: '#FEE2E2',
        },
        ink: {
          DEFAULT: '#0F172A', // Texto principal oscuro de alto contraste
          muted: '#475569', // Texto secundario
          faint: '#94A3B8', // Bordes sutiles y placeholders
        },
        freemium: {
          banner: '#F1F5F9'
        },
        border: '#E2E8F0' // Bordes y divisores claros
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'sans-serif'], // Para números grandes
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        safe: 'env(safe-area-inset-bottom)', // Compatibilidad hacia atrás
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(34 197 94 / 0.25), 0 8px 30px -12px rgb(34 197 94 / 0.45)',
        'neon-green': '0 0 15px rgba(0, 255, 102, 0.25)',
        'neon-orange': '0 0 15px rgba(255, 92, 0, 0.3)',
        'gold-glow': '0 0 20px rgba(255, 215, 0, 0.15)',
      },
      keyframes: {
        'pulse-radar': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.65', transform: 'scale(1.06)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'radar-pulse': 'pulse-radar 2.4s ease-in-out infinite',
        'slide-up': 'slide-up 220ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-up': 'fade-in-up 220ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config