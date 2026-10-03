import { useEffect, useState } from 'react'
import { Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { FormularioSolicitudDueno } from '@/modules/solicitudes/componentes/FormularioSolicitudDueno'
import { PerfilDeportivoCard, UbicacionCard } from '@/modules/cuenta/componentes/PerfilDeportivo'
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'
import type { Usuario } from '@/domain'

/** Pantalla de Ajustes / Perfil (PRD 4.5). */
export default function Ajustes() {
  const sesion = useSesion()
  // `optimista` refleja el cambio al toque; se descarta cuando la sesion cambia.
  const [optimista, setOptimista] = useState<Usuario | null>(null)
  const [tabActivo, setTabActivo] = useState<'jugador' | 'predio'>('jugador')
  
  useEffect(() => {
    setOptimista(null)
  }, [sesion.usuario])

  const usuario = optimista ?? sesion.usuario

  if (sesion.user === null) {
    return (
      <div className="min-h-full bg-canvas pb-safe">
        <NavegacionHeader />
        <Pantalla titulo="Ajustes" subtitulo="Datos personales y disponibilidad para jugar.">
          <div className="space-y-4">
            <Tarjeta titulo="Iniciá sesión" descripcion="Necesitás una cuenta para editar tu perfil.">
              <BotonIngreso />
            </Tarjeta>
          </div>
        </Pantalla>
      </div>
    )
  }

  if (usuario === null) {
    return (
      <div className="min-h-full bg-canvas pb-safe">
        <NavegacionHeader />
        <Pantalla titulo="Ajustes">
          <p className="surface text-sm text-ink-muted">Cargando tu perfil...</p>
        </Pantalla>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas pb-safe">
      <div className="shrink-0">
        <NavegacionHeader />
      </div>
      <Pantalla titulo="Ajustes" subtitulo="Configura tu cuenta deportiva y de predio.">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tabActivo === 'jugador'
                ? 'bg-pitch text-canvas'
                : 'bg-canvas-raised text-ink-muted hover:bg-ink-faint/10'
            }`}
            onClick={() => setTabActivo('jugador')}
          >
            Perfil de Jugador
          </button>
          {usuario.rol === 'dueno_predio' && (
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tabActivo === 'predio'
                  ? 'bg-pitch text-canvas'
                  : 'bg-canvas-raised text-ink-muted hover:bg-ink-faint/10'
              }`}
              onClick={() => setTabActivo('predio')}
            >
              Datos de mi Predio
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {tabActivo === 'jugador' && (
            <>
              <Tarjeta
                titulo="Perfil deportivo"
                descripcion="Posicion, pierna habil y nivel. Define como te buscan para sumar."
              >
                <PerfilDeportivoCard usuario={usuario} onCambio={setOptimista} />
              </Tarjeta>

              <Tarjeta
                titulo="Ubicacion aproximada"
                descripcion="Se usa solo para buscar partidos cerca tuyo."
              >
                <UbicacionCard usuario={usuario} onCambio={setOptimista} />
              </Tarjeta>
            </>
          )}

          {tabActivo === 'predio' && usuario.rol === 'dueno_predio' && (
            <Tarjeta
              titulo="Alta de predio"
              descripcion="Cargá los datos del complejo para que el superadmin habilite tu panel de canchas."
            >
              <FormularioSolicitudDueno usuario={usuario} />
            </Tarjeta>
          )}
        </div>
      </Pantalla>
    </div>
  )
}
