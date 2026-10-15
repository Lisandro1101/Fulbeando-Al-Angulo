import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Falta el nodo #root en index.html')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registro y actualización silenciosa del Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // 1. Consultar si hay nueva versión cada 30 minutos
      setInterval(() => {
        registration.update().catch(console.error);
      }, 30 * 60 * 1000);

      // 2. Consultar si hay nueva versión cuando el usuario vuelve a enfocar la pestaña o app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(console.error);
        }
      });
    },
    onRegisterError(error) {
      console.error('Error registrando Service Worker:', error);
    },
  });
}

