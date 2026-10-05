import { RouterProvider } from 'react-router-dom'
import { AlertTriangle, Building, User } from 'lucide-react'
import { router } from '@/app/rutas'
import { LimiteDeError } from '@/app/LimiteDeError'
import { useSesion } from '@/modules/auth/useSesion'
import { cambiarRol } from '@/modules/usuarios/repositorio'
import { useState } from 'react'

// Onboarding delegado a Screen2RoleSelector y Screen3PlayerOnboarding en UI unificada

export default function App() {
  const sesion = useSesion()

  // Sin configuracion de Firebase no se puede seguir: se explica que falta.
  const pantalla = sesion.error ? (
    <div className="grid h-full place-items-center bg-canvas px-4">
      <div className="surface max-w-md text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-urgent" />
        <h1 className="mt-3 text-lg font-bold text-ink">No pudimos iniciar Fulbeando</h1>
        <p className="mt-2 text-sm text-ink-muted">{sesion.error}</p>
      </div>
    </div>
  ) : sesion.cargando ? (
    <div className="grid h-full place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-radar-pulse rounded-full bg-pitch" />
        <p className="text-sm text-ink-muted">Cargando Fulbeando...</p>
      </div>
    </div>
  ) : (
    <RouterProvider router={router} />
  )

  return <LimiteDeError>{pantalla}</LimiteDeError>
}
