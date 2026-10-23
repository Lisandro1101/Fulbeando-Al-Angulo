import { RouterProvider } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { router } from '@/app/rutas'
import { LimiteDeError } from '@/app/LimiteDeError'
import { SesionProvider, useSesion } from '@/modules/auth/useSesion'
import { ProveedorConfirm, CargandoFulbeando } from '@/modules/ui/overlays'
import { faltaConfigFirebase } from '@/core/config'

// Onboarding delegado a Screen2RoleSelector y Screen3PlayerOnboarding en UI unificada

function AppContenido() {
  const sesion = useSesion()

  // Sin configuracion de Firebase no se puede seguir: se explica que falta.
  // Se lee el .env y no la sesion porque @/core/firebase se inicializa al importar.
  const faltantes = faltaConfigFirebase()
  const mensaje = sesion.error ?? (faltantes.length > 0
    ? `Falta configuracion de Firebase en el .env: ${faltantes.join(', ')}. Copiá .env.example a .env.local y completá los valores.`
    : null)

  const pantalla = mensaje ? (
    <div className="grid h-full place-items-center bg-canvas px-4">
      <div className="surface max-w-md text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-urgent" />
        <h1 className="mt-3 text-lg font-bold text-ink">No pudimos iniciar Fulbeando</h1>
        <p className="mt-2 text-sm text-ink-muted">{mensaje}</p>
      </div>
    </div>
  ) : (
    <RouterProvider router={router} />
  )

  return <LimiteDeError>{pantalla}</LimiteDeError>
}

export default function App() {
  return (
    <SesionProvider>
      <ProveedorConfirm>
        <AppContenido />
      </ProveedorConfirm>
    </SesionProvider>
  )
}

