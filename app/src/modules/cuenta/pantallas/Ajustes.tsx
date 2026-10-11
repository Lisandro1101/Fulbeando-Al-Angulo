import { useEffect, useState } from 'react'
import { Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { cerrarSesion } from '@/modules/auth/servicio'
import { messaging } from '@/core/firebase'
import { PerfilBasicoCard, PerfilDeportivoCard, UbicacionCard } from '@/modules/cuenta/componentes/PerfilDeportivo'
import { EditorPredioCard } from '@/modules/cuenta/componentes/EditorPredio'
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'
import type { Usuario } from '@/domain'

function NotificacionesCard() {
  const [permiso, setPermiso] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const solicitarPermiso = async () => {
    if (!('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      setPermiso(permission)
      if (permission === 'granted' && messaging) {
        // En una app real acá se obtiene el token con getToken y se guarda en el doc de usuario
        alert('¡Notificaciones activadas!')
      }
    } catch (err) {
      console.error('Error al pedir permisos', err)
    }
  }

  return (
    <Tarjeta
      titulo="Alertas y Notificaciones"
      descripcion="Recibí avisos cuando un partido cerca tuyo necesite jugadores."
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Notificaciones Push</span>
        {permiso === 'granted' ? (
          <span className="text-sm font-bold text-pitch">Activadas</span>
        ) : permiso === 'denied' ? (
          <span className="text-sm font-bold text-urgent">Bloqueadas</span>
        ) : (
          <button
            type="button"
            onClick={solicitarPermiso}
            className="rounded-full bg-pitch px-4 py-1.5 text-xs font-semibold text-canvas transition-transform hover:scale-105"
          >
            Activar Alertas
          </button>
        )}
      </div>
    </Tarjeta>
  )
}

/** Pantalla de Ajustes / Perfil (PRD 4.5). */
export default function Ajustes() {
  const sesion = useSesion()
  // `optimista` refleja el cambio al toque; se descarta cuando la sesion cambia.
  const [optimista, setOptimista] = useState<Usuario | null>(null)
  const [tabActivo, setTabActivo] = useState<'jugador' | 'cuenta' | 'predio'>('jugador')
  
  useEffect(() => {
    setOptimista(null)
  }, [sesion.usuario])

  const usuario = optimista ?? sesion.usuario

  // Un dueno no tiene perfil deportivo: sus dos pestañas son Cuenta y Predio.
  // El rol puede cambiar despues de montar la pantalla (cambio de cuenta demo),
  // por lo que la decision se toma en cada render y no en el useState inicial.
  const esDueno = usuario?.rol === 'dueno_predio'
  const tab: 'jugador' | 'cuenta' | 'predio' =
    esDueno && tabActivo === 'jugador' ? 'cuenta' : tabActivo

  if (sesion.user === null) {
    return (
      <div className="h-full bg-canvas pb-safe">
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
      <div className="h-full bg-canvas pb-safe">
        <NavegacionHeader />
        <Pantalla titulo="Ajustes">
          <p className="surface text-sm text-ink-muted">Cargando tu perfil...</p>
        </Pantalla>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas pb-safe">
      <div className="shrink-0">
        <NavegacionHeader />
      </div>
      <Pantalla titulo="Ajustes" subtitulo="Configura tu cuenta deportiva y de predio.">
        <div className="mb-4 flex gap-2">
          {esDueno ? (
            <>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'cuenta'
                    ? 'bg-pitch text-canvas'
                    : 'bg-canvas-raised text-ink-muted hover:bg-ink-faint/10'
                }`}
                onClick={() => setTabActivo('cuenta')}
              >
                Cuenta
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'predio'
                    ? 'bg-pitch text-canvas'
                    : 'bg-canvas-raised text-ink-muted hover:bg-ink-faint/10'
                }`}
                onClick={() => setTabActivo('predio')}
              >
                Datos de mi Predio
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-full bg-pitch px-4 py-1.5 text-sm font-semibold text-canvas"
              onClick={() => setTabActivo('jugador')}
            >
              Perfil de Jugador
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {tab === 'jugador' && (
            <>
              <Tarjeta
                titulo="Datos Básicos"
                descripcion="Tu apodo, usuario y foto de perfil."
              >
                <PerfilBasicoCard usuario={usuario} onCambio={setOptimista} />
              </Tarjeta>

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

              <NotificacionesCard />
            </>
          )}

          {tab === 'cuenta' && esDueno && (
            <>
              <Tarjeta
                titulo="Datos de la cuenta"
                descripcion="Tu nombre, foto de perfil y fecha de nacimiento."
              >
                <PerfilBasicoCard usuario={usuario} onCambio={setOptimista} />
              </Tarjeta>

              <NotificacionesCard />
            </>
          )}

          {tab === 'predio' && esDueno && (
            <Tarjeta
              titulo="Datos de mi Predio"
              descripcion="Direccion, ubicacion exacta y contacto: lo que los jugadores necesitan para llegar."
            >
              <EditorPredioCard duenoUid={usuario.uid} />
            </Tarjeta>
          )}
        </div>

        {/* 6rem: el menu inferior es `fixed` y tapa los ultimos pixeles del
            scroll. Sin este aire, "Cerrar Sena" y "Guardar datos del predio"
            quedarian inalcanzables en mobile. */}
        <div className="mt-12 flex justify-center pb-24">
          <button
            type="button"
            className="rounded-full border border-red-500/30 px-6 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 active:bg-red-500/20"
            onClick={() => {
              cerrarSesion().catch(console.error)
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </Pantalla>
    </div>
  )
}
