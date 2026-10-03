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
        // Paleta base heredada (Fulbeando) adaptada al dark mode Al Ángulo
        canvas: {
          DEFAULT: '#0B0F19', // Asfalto / Dark Canvas - fondo general de la PWA (pitch-900)
          raised: '#141B2D', // Slate Card - tarjetas, modales (pitch-800)
          sunken: '#05080E', // separadores y wells
        },
        pitch: {
          900: '#0B0F19', // Fondo app (Ultra oscuro)
          800: '#141B2D', // Tarjetas y paneles
          700: '#1F2937', // Bordes y divisores
          // Heredado Fulbeando
          DEFAULT: '#22C55E', 
          muted: '#16A34A',
          faint: '#14532D',
        },
        // Acentos "FUT" enérgicos de Al Ángulo
        neon: {
          green: '#00FF66', // Éxito, confirmación, status 'open'
          orange: '#FF5C00', // Alertas, CTAs principales
          gold: '#FFD700', // MVP, Premium, Fichas estelares
        },
        urgent: {
          DEFAULT: '#F59E0B', 
          muted: '#B45309',
          faint: '#78350F',
        },
        occupied: {
          DEFAULT: '#EF4444', 
          muted: '#DC2626',
          faint: '#7F1D1D',
        },
        ink: {
          DEFAULT: '#F8FAFC', 
          muted: '#94A3B8', 
          faint: '#475569',
        },
        freemium: {
          banner: '#000000' // Fondo ads nativos
        }
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
      },
      animation: {
        'radar-pulse': 'pulse-radar 2.4s ease-in-out infinite',
        'slide-up': 'slide-up 220ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config