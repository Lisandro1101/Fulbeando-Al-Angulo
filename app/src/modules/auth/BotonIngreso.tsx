import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { ingresoConGoogle } from '@/modules/auth/servicio'

/**
 * El flujo de reserva exige sesion (el turno queda asociado al organizador).
 * El ingreso va acá, dentro de la pantalla de reserva, para no sumar una
 * pantalla nueva fuera del alcance del PRD.
 */
export function BotonIngreso({ alIngresar }: { alIngresar?: () => void }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ingresar = async () => {
    setCargando(true)
    setError(null)
    try {
      await ingresoConGoogle()
      alIngresar?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesion.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-ghost w-full" onClick={ingresar} disabled={cargando}>
        <LogIn className="h-4 w-4" />
        {cargando ? 'Abriendo Google...' : 'Ingresá con Google para reservar'}
      </button>
      {error && <p className="text-xs text-occupied">{error}</p>}
    </div>
  )
}