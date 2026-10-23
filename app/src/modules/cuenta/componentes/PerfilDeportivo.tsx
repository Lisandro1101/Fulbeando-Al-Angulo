import { useState } from 'react'
import { Crosshair, Loader2, MapPin } from 'lucide-react'
import type { NivelAutopercibido, PerfilDeportivo, PiernaHabil, Posicion, Usuario } from '@/domain'
import { PERFIL_DEPORTIVO_VACIO } from '@/domain'
import { actualizarPerfilDeportivo, actualizarZonaYMunicipio, guardarGeo } from '@/modules/usuarios/repositorio'
import { DIVISION_GEOGRAFICA, calcularGeoZona, inferirMunicipio } from '@/core/geo/zonas'

const POSICIONES: readonly Posicion[] = ['arquero', 'defensor', 'medio', 'delantero']
const NIEVELE: readonly NivelAutopercibido[] = [1, 2, 3, 4, 5]

const ETIQUETA_POSICION: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  medio: 'Medio',
  delantero: 'Delantero',
}

/**
 * Perfil deportivo + "Disponible para jugar hoy". El switch es lo que habilita
 * al usuario en el radar: `esCandidatoParaRadar` lo exige en el dominio.
 */
export function PerfilDeportivoCard({
  usuario,
  onCambio,
}: {
  usuario: Usuario
  onCambio: (usuario: Usuario) => void
}) {
  const [perfil, setPerfil] = useState<PerfilDeportivo>(
    usuario.perfilDeportivo ?? PERFIL_DEPORTIVO_VACIO,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actualizar = async (cambios: Partial<PerfilDeportivo>) => {
    const anterior = perfil
    const siguiente = { ...perfil, ...cambios }
    setPerfil(siguiente)
    setGuardando(true)
    setError(null)
    try {
      await actualizarPerfilDeportivo(usuario.uid, siguiente)
      onCambio({ ...usuario, perfilDeportivo: siguiente })
    } catch {
      setPerfil(anterior)
      setError('No pudimos guardar tu perfil.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="perfil-posicion">
            Posicion preferida
          </label>
          <select
            id="perfil-posicion"
            className="field"
            value={perfil.posicion ?? ''}
            onChange={(e) =>
              void actualizar({
                posicion: e.target.value === '' ? null : (e.target.value as Posicion),
              })
            }
          >
            <option value="">Sin definir</option>
            {POSICIONES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_POSICION[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="perfil-pierna">
            Pierna habil
          </label>
          <select
            id="perfil-pierna"
            className="field"
            value={perfil.piernaHabil ?? ''}
            onChange={(e) =>
              void actualizar({
                piernaHabil: e.target.value === '' ? null : (e.target.value as PiernaHabil),
              })
            }
          >
            <option value="">Sin definir</option>
            <option value="diestro">Diestro</option>
            <option value="zurdo">Zurdo</option>
          </select>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-700">Nivel autopercibido</span>
        <div className="flex gap-1.5">
          {NIEVELE.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={perfil.nivel === n}
              className={`h-10 flex-1 rounded-xl border text-sm font-bold transition shadow-sm cursor-pointer ${
                perfil.nivel === n
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950 font-bold hover:border-slate-400'
              }`}
              onClick={() => void actualizar({ nivel: perfil.nivel === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Interruptor
        id="perfil-disponible"
        activo={perfil.disponibleHoy}
        titulo="Disponible para jugar hoy"
        descripcion="Te muestra el radar de suplentes que te queda cerca."
        onToggle={(v) => void actualizar({ disponibleHoy: v })}
      />

      <Interruptor
        id="perfil-notificaciones"
        activo={perfil.notificacionesRadar}
        titulo="Notificaciones del radar"
        descripcion="Avisos de turnos que necesitan jugador."
        onToggle={(v) => void actualizar({ notificacionesRadar: v })}
      />

      {guardando && (
        <p className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> Guardando...
        </p>
      )}
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-bold">{error}</p>}
    </div>
  )
}

/** Ubicacion aproximada: es lo que permite consultar el radar por proximidad. */
export function UbicacionCard({
  usuario,
  onCambio,
}: {
  usuario: Usuario
  onCambio: (usuario: Usuario) => void
}) {
  const [pidiendo, setPidiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ubicar = () => {
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo no reporta ubicacion.')
      return
    }
    setPidiendo(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geo = await guardarGeo(usuario.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          onCambio({ ...usuario, geo })
        } catch {
          setError('No pudimos guardar tu ubicacion.')
        } finally {
          setPidiendo(false)
        }
      },
      () => {
        setError('No pudimos obtener la ubicacion. Revisa el permiso del navegador.')
        setPidiendo(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <div className="space-y-3">
      {usuario.geo === null ? (
        <>
          <p className="text-sm text-slate-600 font-medium">
            Sin ubicacion no podes ver el radar de suplentes ni que te encuentren.
          </p>
          <button type="button" className="btn-ghost w-full" onClick={ubicar} disabled={pidiendo}>
            {pidiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            Usar mi ubicacion
          </button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <MapPin className="h-4 w-4 text-pitch" />
          Ubicacion guardada ({usuario.geo.lat.toFixed(3)}, {usuario.geo.lng.toFixed(3)}). Se
          guarda una zona aproximada, no tu posicion exacta.
        </p>
      )}
      {error && <p className="text-sm text-urgent">{error}</p>}
    </div>
  )
}

function Interruptor({
  id,
  activo,
  titulo,
  descripcion,
  onToggle,
}: {
  id: string
  activo: boolean
  titulo: string
  descripcion: string
  onToggle: (valor: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-100/80 border border-slate-300 px-3.5 py-3 hover:bg-slate-200/80 transition shadow-sm"
    >
      <span>
        <span className="block text-sm font-bold text-slate-900">{titulo}</span>
        <span className="block text-xs text-slate-600 font-semibold">{descripcion}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={activo}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-emerald-600 cursor-pointer"
      />
    </label>
  )
}

export function PerfilBasicoCard({ usuario, onCambio }: { usuario: Usuario; onCambio: (usuario: Usuario) => void }) {
  const [apodo, setApodo] = useState(usuario.nombre || '');
  const [username, setUsername] = useState(usuario.email?.split('@')[0] || '');
  const [emojiFoto, setEmojiFoto] = useState(usuario.fotoUrl || '⚽');
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario.fechaNacimiento || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      // Solo se manda el email si el usuario lo cambio de verdad: si no, cada
      // "Guardar Cambios" reescribia la direccion con el dominio de relleno.
      const cambios: { nombre: string; email?: string; fotoUrl: string | null; fechaNacimiento: string | null } = {
        nombre: apodo,
        fotoUrl: emojiFoto,
        fechaNacimiento: fechaNacimiento || null,
      };
      const emailEditado = username + '@fulbeando.local';
      if (username && emailEditado !== usuario.email) cambios.email = emailEditado;

      const { actualizarDatosBasicos } = await import('@/modules/usuarios/repositorio');
      await actualizarDatosBasicos(usuario.uid, cambios);
      onCambio({ ...usuario, ...cambios });
    } catch {
      setError('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="perfil-apodo" className="mb-1 block text-xs font-bold text-slate-700">Apodo</label>
        <input 
          id="perfil-apodo"
          type="text" 
          value={apodo} 
          onChange={(e) => setApodo(e.target.value)} 
          className="field" 
        />
      </div>
      <div>
        <label htmlFor="perfil-username" className="mb-1 block text-xs font-bold text-slate-700">Nombre de Usuario (@)</label>
        <div className="flex items-center field p-0 overflow-hidden">
          <span className="pl-3.5 text-slate-400 font-bold">@</span>
          <input 
            id="perfil-username"
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
            className="w-full bg-transparent px-2 py-2.5 text-slate-900 font-semibold outline-none" 
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="fecha-nacimiento">Fecha de nacimiento</label>
        <input
          id="fecha-nacimiento"
          type="date"
          value={fechaNacimiento}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          className="field"
        />
        <p className="mt-1 text-xs text-slate-600 font-semibold">
          De acá sale tu edad en la ficha del perfil.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700">Foto de Perfil</label>
        <div className="flex items-center gap-4 bg-slate-100/80 p-4 rounded-2xl border border-slate-300 shadow-sm">
          <div 
            className="w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center text-3xl border-2 border-emerald-500/40 cursor-pointer hover:border-emerald-500 transition-colors relative group shadow-sm"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {emojiFoto?.startsWith('http') ? (
               <img src={emojiFoto} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
               <span className="text-sm font-bold text-slate-400">Foto</span>
            )}
            <div className="absolute inset-0 bg-slate-900/60 hidden group-hover:flex items-center justify-center text-white backdrop-blur-xs">
              <span className="text-[11px] font-black uppercase tracking-wider">Subir</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-600 font-medium mb-1">Toca el círculo para subir una foto de perfil</p>
          </div>
          <input 
            id="avatar-upload"
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if(!file) return;
              try {
                 setGuardando(true);
                 setError(null);
                 const { optimizeAvatarImage } = await import('@/imageCompressor');
                 const { uploadImageToR2 } = await import('@/uploader');
                  const optimized = await optimizeAvatarImage(file, { maxSize: 300, quality: 0.8 });
                  // `avatars/{uid}`: storage.rules solo deja escribir en el
                  // espacio propio del usuario que sube.
                  const result = await uploadImageToR2(optimized, file.name, `avatars/${usuario.uid}`, () => {});
                 setEmojiFoto(result.publicUrl);
              } catch(err) {
                 setError('Error al subir la imagen');
              } finally {
                 setGuardando(false);
              }
            }} 
          />
        </div>
      </div>
      
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-bold">{error}</p>}
      
      <div className="pt-2">
        <button 
          type="button"
          onClick={guardar} 
          disabled={guardando} 
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

export function ZonaCard({
  usuario,
  onCambio,
}: {
  usuario: Usuario
  onCambio: (usuario: Usuario) => void
}) {
  const [regionSeleccionada, setRegionSeleccionada] = useState<string>(() => {
    if (usuario.municipio) {
      for (const [reg, munis] of Object.entries(DIVISION_GEOGRAFICA)) {
        if (Object.keys(munis).includes(usuario.municipio)) return reg
      }
    }
    if (usuario.zona) {
      const muni = inferirMunicipio(usuario.zona)
      if (muni) {
        for (const [reg, munis] of Object.entries(DIVISION_GEOGRAFICA)) {
          if (Object.keys(munis).includes(muni)) return reg
        }
      }
    }
    return 'GBA Zona Sur'
  })

  const municipiosDeRegion = Object.keys(DIVISION_GEOGRAFICA[regionSeleccionada] || {})

  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>(() => {
    if (usuario.municipio) return usuario.municipio
    if (usuario.zona) {
      const muni = inferirMunicipio(usuario.zona)
      if (muni) return muni
    }
    return municipiosDeRegion[0] || 'Lomas de Zamora'
  })

  const localidadesDisponibles = DIVISION_GEOGRAFICA[regionSeleccionada]?.[municipioSeleccionado] || []

  const [localidadElegida, setLocalidadElegida] = useState<string>(
    usuario.zona || localidadesDisponibles[0] || municipioSeleccionado
  )
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const zonaActualLegible = [usuario.zona, usuario.municipio].filter(Boolean).join(', ')

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      const loc = localidadElegida || municipioSeleccionado
      const muni = municipioSeleccionado
      const geoZona = calcularGeoZona(loc)

      await actualizarZonaYMunicipio(usuario.uid, {
        zona: loc,
        municipio: muni,
        geo: usuario.geo ?? geoZona,
      })

      onCambio({
        ...usuario,
        zona: loc,
        municipio: muni,
        geo: usuario.geo ?? geoZona,
      })

      setMensaje('¡Zona y localidad guardadas con éxito!')
      setTimeout(() => setMensaje(null), 3500)
    } catch (err) {
      console.error('Error al guardar zona:', err)
      setError('No se pudo guardar la zona. Revisá tu conexión.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      {zonaActualLegible ? (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium shadow-sm">
          <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Zona actual declarada: <strong className="text-slate-900 font-extrabold">{zonaActualLegible}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium shadow-sm">
          <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Todavía no tenés una zona declarada. Seleccionala abajo:</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="perfil-region" className="text-xs font-bold text-slate-700 uppercase">
            Región
          </label>
          <select
            id="perfil-region"
            value={regionSeleccionada}
            onChange={(e) => {
              const reg = e.target.value
              setRegionSeleccionada(reg)
              const munis = Object.keys(DIVISION_GEOGRAFICA[reg] || {})
              const primerMuni = munis[0] || ''
              setMunicipioSeleccionado(primerMuni)
              const primerLoc = DIVISION_GEOGRAFICA[reg]?.[primerMuni]?.[0] || primerMuni
              setLocalidadElegida(primerLoc)
            }}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-slate-900 shadow-sm cursor-pointer"
          >
            {Object.keys(DIVISION_GEOGRAFICA).map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="perfil-municipio" className="text-xs font-bold text-slate-700 uppercase">
            Municipio / Partido (Mi Zona)
          </label>
          <select
            id="perfil-municipio"
            value={municipioSeleccionado}
            onChange={(e) => {
              const muni = e.target.value
              setMunicipioSeleccionado(muni)
              const primerLoc = DIVISION_GEOGRAFICA[regionSeleccionada]?.[muni]?.[0] || muni
              setLocalidadElegida(primerLoc)
            }}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-slate-900 shadow-sm cursor-pointer"
          >
            {municipiosDeRegion.map((muni) => (
              <option key={muni} value={muni}>
                {muni}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="perfil-localidad" className="text-xs font-bold text-slate-700 uppercase">
            Barrio / Localidad
          </label>
          <select
            id="perfil-localidad"
            value={localidadElegida}
            onChange={(e) => setLocalidadElegida(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-slate-900 shadow-sm cursor-pointer"
          >
            {localidadesDisponibles.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && <p className="text-sm text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl shadow-sm">{mensaje}</p>}
      {error && <p className="text-sm text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl shadow-sm">{error}</p>}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
      >
        {guardando ? 'Guardando zona...' : 'Guardar mi Zona'}
      </button>
    </div>
  )
}
