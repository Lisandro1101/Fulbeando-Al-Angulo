import { useEffect, useState } from 'react'
import { Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { cerrarSesion } from '@/modules/auth/servicio'
import { messaging } from '@/core/firebase'
import { PerfilBasicoCard, PerfilDeportivoCard, UbicacionCard, ZonaCard } from '@/modules/cuenta/componentes/PerfilDeportivo'
import { EditorPredioCard } from '@/modules/cuenta/componentes/EditorPredio'
import { Toast } from '@/modules/ui/overlays'
import type { Usuario } from '@/domain'

function NotificacionesCard() {
  const [permiso, setPermiso] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [aviso, setAviso] = useState<string | null>(null)

  const solicitarPermiso = async () => {
    if (!('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      setPermiso(permission)
      if (permission === 'granted' && messaging) {
        // En una app real acá se obtiene el token con getToken y se guarda en el doc de usuario
        setAviso('¡Notificaciones activadas!')
        setTimeout(() => setAviso(null), 3500)
      }
    } catch (err) {
      console.error('Error al pedir permisos', err)
    }
  }

  return (
    <>
      <Toast mensaje={aviso} tipo="exito" />
      <Tarjeta
      titulo="Alertas y Notificaciones"
      descripcion="Recibí avisos cuando un partido cerca tuyo necesite jugadores."
    >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Notificaciones Push</span>
          {permiso === 'granted' ? (
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">Activadas</span>
          ) : permiso === 'denied' ? (
            <span className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">Bloqueadas</span>
          ) : (
            <button
              type="button"
              onClick={solicitarPermiso}
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              Activar Alertas
            </button>
          )}
        </div>
    </Tarjeta>
    </>
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
      <div className="h-full bg-transparent">
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
      <div className="h-full bg-transparent">
        <Pantalla titulo="Ajustes">
          <p className="surface text-sm text-ink-muted">Cargando tu perfil...</p>
        </Pantalla>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <Pantalla titulo="Ajustes" subtitulo="Configura tu cuenta deportiva y de predio.">
        <div className="mb-4 flex gap-2">
          {esDueno ? (
            <>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  tab === 'cuenta'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
                    : 'bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 hover:text-slate-950 font-bold'
                }`}
                onClick={() => setTabActivo('cuenta')}
              >
                Cuenta
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  tab === 'predio'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
                    : 'bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 hover:text-slate-950 font-bold'
                }`}
                onClick={() => setTabActivo('predio')}
              >
                Datos de mi Predio
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/25 cursor-pointer"
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
                titulo="Mi Zona / Localidad"
                descripcion="Define tu partido y barrio para ver las publicaciones y partidos de tu zona en la Comunidad."
              >
                <ZonaCard usuario={usuario} onCambio={setOptimista} />
              </Tarjeta>

              <Tarjeta
                titulo="Ubicación GPS aproximada"
                descripcion="Se usa solo para buscar partidos y predios en tiempo real en el radar."
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
            className="rounded-full border border-rose-300 bg-white px-6 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:border-rose-400 active:scale-95 cursor-pointer"
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
