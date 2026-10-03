/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo principal oscuro (estilo césped de noche / asfalto)
        pitch: {
          900: '#0B0F19', // Fondo app (Ultra oscuro)
          800: '#141B2D', // Tarjetas y paneles
          700: '#1F2937', // Bordes y divisores
        },
        // Acentos "FUT" enérgicos (Naranja/Oro y Verde Neón)
        neon: {
          green: '#00FF66', // Éxito, confirmación, status 'open'
          orange: '#FF5C00', // Alertas, botones CTA principales (Aceptar desafío)
          gold: '#FFD700', // MVP, Premium, Fichas estelares
        },
        freemium: {
          banner: '#000000' // Fondo para los ads nativos
        }
      },
      fontFamily: {
        // Fuentes que cargan rápido y dan aspecto premium/deportivo
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'], // Para números grandes, marcadores y titulares
      },
      boxShadow: {
        'neon-green': '0 0 15px rgba(0, 255, 102, 0.25)',
        'neon-orange': '0 0 15px rgba(255, 92, 0, 0.3)',
        'gold-glow': '0 0 20px rgba(255, 215, 0, 0.15)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)', // Soporte crucial para el notch de iPhone/Android PWA
        'safe-top': 'env(safe-area-inset-top)',
      }
    },
  },
  plugins: [],
}
