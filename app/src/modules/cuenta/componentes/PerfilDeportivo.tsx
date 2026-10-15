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
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="perfil-posicion">
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
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="perfil-pierna">
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
        <span className="mb-1 block text-xs text-ink-muted">Nivel autopercibido</span>
        <div className="flex gap-1.5">
          {NIEVELE.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={perfil.nivel === n}
              className={`h-10 flex-1 rounded-xl border text-sm font-semibold ${
                perfil.nivel === n
                  ? 'border-pitch bg-pitch-faint/40 text-pitch'
                  : 'border-ink-faint/30 text-ink-muted'
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
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
        </p>
      )}
      {error && <p className="text-sm text-occupied">{error}</p>}
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
          <p className="text-sm text-ink-muted">
            Sin ubicacion no podes ver el radar de suplentes ni que te encuentren.
          </p>
          <button type="button" className="btn-ghost w-full" onClick={ubicar} disabled={pidiendo}>
            {pidiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            Usar mi ubicacion
          </button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
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
      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{titulo}</span>
        <span className="block text-xs text-ink-muted">{descripcion}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={activo}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-pitch"
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
        <label htmlFor="perfil-apodo" className="mb-1 block text-xs text-ink-muted">Apodo</label>
        <input 
          id="perfil-apodo"
          type="text" 
          value={apodo} 
          onChange={(e) => setApodo(e.target.value)} 
          className="field" 
        />
      </div>
      <div>
        <label htmlFor="perfil-username" className="mb-1 block text-xs text-ink-muted">Nombre de Usuario (@)</label>
        <div className="flex items-center field p-0 overflow-hidden">
          <span className="pl-3 text-ink-muted font-bold">@</span>
          <input 
            id="perfil-username"
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
            className="w-full bg-transparent p-2 outline-none" 
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted" htmlFor="fecha-nacimiento">Fecha de nacimiento</label>
        <input
          id="fecha-nacimiento"
          type="date"
          value={fechaNacimiento}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          className="field [color-scheme:dark]"
        />
        <p className="mt-1 text-xs text-ink-muted">
          De acá sale tu edad en la ficha del perfil.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Foto de Perfil</label>
        <div className="flex items-center gap-4 bg-canvas p-4 rounded-xl border border-border">
          <div 
            className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-3xl border-2 border-pitch/50 cursor-pointer hover:border-pitch transition-colors relative group"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {emojiFoto?.startsWith('http') ? (
               <img src={emojiFoto} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
               <span className="text-sm font-bold text-zinc-500">Foto</span>
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white backdrop-blur-sm">
              <span className="text-xs font-bold uppercase">Subir</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-muted mb-2">Toca el círculo para subir una foto de perfil</p>
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
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="pt-2">
        <button 
          type="button"
          onClick={guardar} 
          disabled={guardando} 
          className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
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
        <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-emerald-500/30 rounded-xl text-xs text-zinc-300">
          <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            Zona actual declarada: <strong className="text-white">{zonaActualLegible}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
          <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Todavía no tenés una zona declarada. Seleccionala abajo:</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="perfil-region" className="text-xs font-bold text-zinc-400 uppercase">
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-white cursor-pointer"
          >
            {Object.keys(DIVISION_GEOGRAFICA).map((reg) => (
              <option key={reg} value={reg} className="bg-zinc-900">
                {reg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="perfil-municipio" className="text-xs font-bold text-zinc-400 uppercase">
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-white cursor-pointer"
          >
            {municipiosDeRegion.map((muni) => (
              <option key={muni} value={muni} className="bg-zinc-900">
                {muni}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="perfil-localidad" className="text-xs font-bold text-zinc-400 uppercase">
            Barrio / Localidad
          </label>
          <select
            id="perfil-localidad"
            value={localidadElegida}
            onChange={(e) => setLocalidadElegida(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-white cursor-pointer"
          >
            {localidadesDisponibles.map((loc) => (
              <option key={loc} value={loc} className="bg-zinc-900">
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && <p className="text-sm text-emerald-400 font-semibold">{mensaje}</p>}
      {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
      >
        {guardando ? 'Guardando zona...' : 'Guardar mi Zona'}
      </button>
    </div>
  )
}
