import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'

/**
 * Temporizador visible del bloqueo temporal (15 min, regla 6.1).
 * Cuando llega a cero se avisa por `alVencer` para que la pantalla cambie de
 * estado: el turno no se cancela solo, solo deja de estar bloqueado.
 */
export function TemporizadorBloqueo({
  bloqueadoHastaMs,
  alVencer,
}: {
  bloqueadoHastaMs: number
  alVencer: () => void
}) {
  const [restante, setRestante] = useState(bloqueadoHastaMs - Date.now())
  const aviso = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setRestante(bloqueadoHastaMs - Date.now()), 1000)
    return () => clearInterval(t)
  }, [bloqueadoHastaMs])

  useEffect(() => {
    if (restante <= 0 && !aviso.current) {
      aviso.current = true
      alVencer()
    }
  }, [restante, alVencer])

  const segundos = Math.max(0, Math.ceil(restante / 1000))
  const minutos = Math.floor(segundos / 60)
  const parteMinutos = String(minutos).padStart(2, '0')
  const parteSegundos = String(segundos % 60).padStart(2, '0')
  const urgente = segundos <= 60

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${
        urgente ? 'bg-occupied-faint/40 text-occupied' : 'bg-urgent-faint/40 text-urgent'
      }`}
      role="timer"
      aria-live="polite"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Timer className="h-4 w-4" />
        {segundos > 0 ? 'Turno bloqueado esperando aprobación' : 'El bloqueo venció'}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums">
        {parteMinutos}:{parteSegundos}
      </span>
    </div>
  )
}