import { RouterProvider } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { router } from '@/app/rutas'
import { LimiteDeError } from '@/app/LimiteDeError'
import { SesionProvider, useSesion } from '@/modules/auth/useSesion'
import { ProveedorConfirm } from '@/modules/ui/overlays'
import { faltaConfigFirebase } from '@/core/config'
import { Toaster } from '@/components/ui/sonner'

// Onboarding delegado a Screen2RoleSelector y Screen3PlayerOnboarding en UI unificada

function AppContenido() {
  const sesion = useSesion()

  // Sin configuracion de Firebase no se puede seguir: se explica que falta.
  // Se lee el .env y no la sesion porque @/core/firebase se inicializa al importar.
  const faltantes = faltaConfigFirebase()
  const mensaje = sesion.error ?? (faltantes.length > 0
    ? `Falta configuracion de Firebase en el .env: ${faltantes.join(', ')}. Copiá .env.example a .env.local y completá los valores.`
    : null)

  const reintentar = async () => {
    try {
      if (sesion.refrescar) {
        await sesion.refrescar()
      } else {
        window.location.reload()
      }
    } catch {
      window.location.reload()
    }
  }

  const salir = async () => {
    try {
      const { auth } = await import('@/core/firebase')
      await auth.signOut()
    } catch {}
    window.location.href = '/login'
  }

  const pantalla = mensaje ? (
    <div className="grid h-full min-h-screen place-items-center bg-[#1E0D4A] px-4 py-8">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 sm:p-8 text-center shadow-xl border border-slate-200">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-lg font-black text-slate-900">No pudimos iniciar Fulbeando</h1>
        <p className="mt-2 text-sm text-slate-600 font-medium break-words">{mensaje}</p>

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-left font-mono text-xs text-slate-600 space-y-1">
          <div><span className="font-bold text-slate-700">Host:</span> {typeof window !== 'undefined' ? window.location.hostname : 'n/a'}</div>
          <div><span className="font-bold text-slate-700">Usuario:</span> {sesion.user?.email || sesion.user?.uid || 'Sin sesión'}</div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reintentar}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-md transition cursor-pointer text-sm"
          >
            Reintentar conexión
          </button>
          <button
            type="button"
            onClick={salir}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition cursor-pointer text-xs"
          >
            Cerrar sesión y volver al login
          </button>
        </div>
      </div>
    </div>
  ) : (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
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

