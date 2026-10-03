import { RouterProvider } from 'react-router-dom'
import { AlertTriangle, Building, User } from 'lucide-react'
import { router } from '@/app/rutas'
import { LimiteDeError } from '@/app/LimiteDeError'
import { useSesion } from '@/modules/auth/useSesion'
import { cambiarRol } from '@/modules/usuarios/repositorio'
import { useState } from 'react'

function Onboarding({ usuarioUid }: { usuarioUid: string }) {
  const [cargando, setCargando] = useState(false)
  const elegirRol = async (rol: 'jugador' | 'dueno_predio') => {
    setCargando(true)
    await cambiarRol(usuarioUid, rol)
    window.location.reload()
  }

  return (
    <div className="grid h-screen place-items-center bg-canvas px-4 pb-safe">
      <div className="surface w-full max-w-sm space-y-6 p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-ink">¡Bienvenido a Fulbeando!</h1>
          <p className="mt-2 text-sm text-ink-muted">Contanos cómo vas a usar la app para prepararte el terreno.</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <button 
            type="button" 
            disabled={cargando}
            onClick={() => elegirRol('jugador')}
            className="flex flex-col items-center gap-2 rounded-xl border border-ink-faint bg-canvas p-4 transition-all hover:ring-2 hover:ring-pitch disabled:opacity-50"
          >
            <div className="rounded-full bg-pitch-faint p-3 text-pitch">
              <User className="h-6 w-6" />
            </div>
            <span className="font-bold text-ink">Soy Jugador</span>
            <span className="text-xs text-ink-muted">Quiero buscar turnos, sumarme a partidos y jugar.</span>
          </button>
          
          <button 
            type="button" 
            disabled={cargando}
            onClick={() => elegirRol('dueno_predio')}
            className="flex flex-col items-center gap-2 rounded-xl border border-ink-faint bg-canvas p-4 transition-all hover:ring-2 hover:ring-pitch disabled:opacity-50"
          >
            <div className="rounded-full bg-pitch-faint p-3 text-pitch">
              <Building className="h-6 w-6" />
            </div>
            <span className="font-bold text-ink">Soy Dueño de Predio</span>
            <span className="text-xs text-ink-muted">Quiero publicar mis canchas y gestionar reservas.</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const sesion = useSesion()

  // Sin configuracion de Firebase no se puede seguir: se explica que falta.
  const pantalla = sesion.error ? (
    <div className="grid min-h-full place-items-center bg-canvas px-4">
      <div className="surface max-w-md text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-urgent" />
        <h1 className="mt-3 text-lg font-bold text-ink">No pudimos iniciar Fulbeando</h1>
        <p className="mt-2 text-sm text-ink-muted">{sesion.error}</p>
      </div>
    </div>
  ) : sesion.cargando ? (
    <div className="grid min-h-full place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-radar-pulse rounded-full bg-pitch" />
        <p className="text-sm text-ink-muted">Cargando Fulbeando...</p>
      </div>
    </div>
  ) : sesion.usuario?.rol === 'invitado' ? (
    <Onboarding usuarioUid={sesion.usuario.uid} />
  ) : (
    <RouterProvider router={router} />
  )

  return <LimiteDeError>{pantalla}</LimiteDeError>
}