import { useState, useEffect } from 'react'
import {
  User,
  Shield,
  Send,
  Check,
  ChevronRight,
  Lock,
  MapPin,
  Sparkles,
  Zap,
  Target,
  Flame,
  Activity,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import { CargandoFulbeando } from '@/modules/ui/overlays'
import { TarjetaJugador, type DatosTarjeta } from '@/modules/cuenta/componentes/TarjetaJugador'
import { DIVISION_GEOGRAFICA, calcularGeoZona } from '@/core/geo/zonas'
import {
  guardarPaso1Onboarding,
  actualizarOnboardingStep,
  completarOnboarding,
} from '@/modules/usuarios/repositorio'
import { crearEquipo } from '@/modules/teams/teamService'
import { crearPublicacion } from '@/modules/comunidad/repositorio'
import {
  PERFIL_DEPORTIVO_VACIO,
  type PerfilDeportivo,
  type Posicion,
  type PlayerRole,
  type PiernaHabil,
  edadDe,
} from '@/domain'

const ESCUDOS_PREDETERMINADOS = ['⚽', '🦁', '⚡', '🦅', '🏆', '🔥', '🐺', '🛡️', '🦈', '👑', '🎯', '🚀']

export function OnboardingWizard() {
  const sesion = useSesion()
  const usuario = sesion.usuario
  const user = sesion.user

  // Paso actual (1, 2, 3)
  const [paso, setPaso] = useState<number>(usuario?.onboarding_step || 1)
  const [cargando, setCargando] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [exitoFinal, setExitoFinal] = useState<boolean>(false)

  // --- PASO 1: CARTA FUT ---
  const [apodo, setApodo] = useState<string>('')
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('')
  const [telefono, setTelefono] = useState<string>('')
  const [pos, setPos] = useState<'DEL' | 'MED' | 'DEF' | 'ARQ'>('DEL')
  const [pierna, setPierna] = useState<'Diestro' | 'Zurdo' | 'Ambidiestro'>('Diestro')

  // Sliders de atributos (1 al 99)
  const [ritmo, setRitmo] = useState<number>(70)
  const [tiro, setTiro] = useState<number>(72)
  const [pase, setPase] = useState<number>(68)
  const [fisico, setFisico] = useState<number>(70)
  const [defensa, setDefensa] = useState<number>(60)

  // Zona geográfica
  const [regionSeleccionada] = useState<string>('GBA Zona Sur')
  const municipiosDeRegion = Object.keys(DIVISION_GEOGRAFICA[regionSeleccionada] || {})
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>('Lomas de Zamora')
  const localidadesDisponibles = DIVISION_GEOGRAFICA[regionSeleccionada]?.[municipioSeleccionado] || []
  const [localidadElegida, setLocalidadElegida] = useState<string>('Lomas de Zamora')
  const [localidadQuery, setLocalidadQuery] = useState<string>('')
  const [mostrarBuscador, setMostrarBuscador] = useState<boolean>(false)

  // --- PASO 2: EQUIPO ---
  const [nombreEquipo, setNombreEquipo] = useState<string>('')
  const [escudoEmoji, setEscudoEmoji] = useState<string>('⚽')
  const [modalidadBase, setModalidadBase] = useState<string>('Fútbol 5')
  const [generoEquipo, setGeneroEquipo] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Masculino')
  const [equipoCreadoNombre, setEquipoCreadoNombre] = useState<string | null>(null)

  // --- PASO 3: PUBLICACIÓN DE BIENVENIDA ---
  const [textoPost, setTextoPost] = useState<string>('')

  // Sincronizar estado inicial desde el usuario autenticado
  useEffect(() => {
    if (usuario) {
      if (!apodo) setApodo(usuario.nombre || user?.displayName?.split(' ')[0] || 'Jugador')
      if (!telefono && usuario.telefono) setTelefono(usuario.telefono)
      if (!fechaNacimiento && usuario.fechaNacimiento) setFechaNacimiento(usuario.fechaNacimiento)
      if (usuario.zona) {
        setLocalidadElegida(usuario.zona)
        for (const [muni, locs] of Object.entries(DIVISION_GEOGRAFICA['GBA Zona Sur'] || {})) {
          if (locs.includes(usuario.zona)) {
            setMunicipioSeleccionado(muni)
            break
          }
        }
      }
      if (usuario.perfilDeportivo?.posicion) {
        const p = usuario.perfilDeportivo.posicion
        if (p === 'arquero') setPos('ARQ')
        else if (p === 'defensor') setPos('DEF')
        else if (p === 'medio') setPos('MED')
        else if (p === 'delantero') setPos('DEL')
      }
      if (usuario.perfilDeportivo?.piernaHabil) {
        const pie = usuario.perfilDeportivo.piernaHabil
        if (pie === 'diestro') setPierna('Diestro')
        else if (pie === 'zurdo') setPierna('Zurdo')
        else if (pie === 'ambidiestro') setPierna('Ambidiestro')
      }
      if (usuario.perfilDeportivo?.atributos) {
        const at = usuario.perfilDeportivo.atributos
        if (at.ritmo) setRitmo(at.ritmo)
        if (at.tiro) setTiro(at.tiro)
        if (at.pase) setPase(at.pase)
        if (at.fisico) setFisico(at.fisico)
        if (at.defensa) setDefensa(at.defensa)
      }
      if (usuario.onboarding_step && usuario.onboarding_step > paso) {
        setPaso(usuario.onboarding_step)
      }
    } else if (user) {
      if (!apodo && user.displayName) {
        setApodo(user.displayName.split(' ')[0] || 'Jugador')
      }
    }
  }, [usuario, user])

  // Calcular edad dinámica
  const calcularEdadVisual = (): number => {
    if (fechaNacimiento) {
      const [anio, mes, dia] = fechaNacimiento.split('-').map(Number)
      if (anio && mes && dia) {
        const hoy = new Date()
        let edad = hoy.getFullYear() - anio
        const mesActual = hoy.getMonth() + 1
        if (mesActual < mes || (mesActual === mes && hoy.getDate() < dia)) edad -= 1
        if (edad >= 10 && edad <= 70) return edad
      }
    }
    if (usuario) {
      const e = edadDe(usuario)
      if (e) return e
    }
    return 24
  }

  // Generar template automático para la publicación de debut cuando se llega al Paso 3
  useEffect(() => {
    if (paso === 3 && !textoPost) {
      const posMapTexto = {
        DEL: 'delantero',
        MED: 'mediocampista',
        DEF: 'defensor',
        ARQ: 'arquero',
      }
      const posTexto = posMapTexto[pos] || 'jugador'
      const zonaTexto = localidadElegida || municipioSeleccionado || 'la zona sur'
      const equipoTexto = equipoCreadoNombre ? ` y capitán de ${equipoCreadoNombre}` : ''
      setTextoPost(
        `¡Hola a todos! 👋 Me sumo a Fulbeando. Juego de ${posTexto} (${pierna.toLowerCase()})${equipoTexto} y busco partidos en ${zonaTexto}. ¡Sumame a tu partido!`
      )
    }
  }, [paso, pos, pierna, localidadElegida, municipioSeleccionado, equipoCreadoNombre, textoPost])

  // Localidades filtradas para el buscador
  const localidadesFiltradas = localidadesDisponibles.filter((loc) =>
    loc.toLowerCase().includes(localidadQuery.toLowerCase())
  )

  // Datos para la Tarjeta FIFA (Media base fija 55 = Bronce para todos)
  const MEDIA_BASE_INICIAL = 55

  const datosCarta: DatosTarjeta = {
    nombre: (apodo.trim() || usuario?.nombre || user?.displayName?.split(' ')[0] || 'JUGADOR').toUpperCase(),
    fotoUrl: usuario?.fotoUrl || user?.photoURL || '⚽',
    media: MEDIA_BASE_INICIAL,
    pos: pos,
    edad: calcularEdadVisual(),
    goles: 0,
    asistencias: 0,
    partidos: 0,
    pierna: pierna,
    equipoNombre: equipoCreadoNombre || 'Agente Libre',
    shieldUrl: null,
  }

  // --- ACCIÓN: GUARDAR PASO 1 ---
  const handleGuardarPaso1 = async () => {
    if (!user) {
      setError('Debes tener una sesión activa para continuar.')
      return
    }
    if (!apodo.trim()) {
      setError('Por favor completá tu nombre o apodo para la carta.')
      return
    }
    if (!fechaNacimiento) {
      setError('Por favor completá tu fecha de nacimiento para calcular tu edad en la carta.')
      return
    }
    if (!localidadElegida) {
      setError('Por favor seleccioná tu localidad o barrio para ubicarte en el radar.')
      return
    }

    setCargando(true)
    setError(null)

    try {
      const posMap: Record<'ARQ' | 'DEF' | 'MED' | 'DEL', { posicion: Posicion; playerRole: PlayerRole }> = {
        DEL: { posicion: 'delantero', playerRole: 'FWD' },
        MED: { posicion: 'medio', playerRole: 'MID' },
        DEF: { posicion: 'defensor', playerRole: 'DEF' },
        ARQ: { posicion: 'arquero', playerRole: 'GK' },
      }
      const rolData = posMap[pos]
      const piernaMapeada: PiernaHabil =
        pierna === 'Diestro' ? 'diestro' : pierna === 'Zurdo' ? 'zurdo' : 'ambidiestro'

      const perfilPrevio = usuario?.perfilDeportivo ?? PERFIL_DEPORTIVO_VACIO
      const nuevoPerfil: PerfilDeportivo = {
        ...perfilPrevio,
        posicion: rolData.posicion,
        playerRole: rolData.playerRole,
        piernaHabil: piernaMapeada,
        disponibleHoy: perfilPrevio.disponibleHoy ?? true,
        notificacionesRadar: perfilPrevio.notificacionesRadar ?? true,
        atributos: {
          ritmo,
          tiro,
          pase,
          fisico,
          defensa,
        },
      }

      const geoPrivado = calcularGeoZona(localidadElegida || municipioSeleccionado)

      await guardarPaso1Onboarding(user.uid, {
        nombre: apodo.trim(),
        fechaNacimiento,
        telefono: telefono.trim() || null,
        municipio: municipioSeleccionado,
        zona: localidadElegida,
        geo: geoPrivado,
        perfilDeportivo: nuevoPerfil,
        onboarding_step: 2,
      })

      setPaso(2)
    } catch (err: any) {
      console.error('Error al guardar paso 1:', err)
      setError('No pudimos guardar los datos de tu carta. Intentá nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  // --- ACCIÓN: GUARDAR EQUIPO (PASO 2) ---
  const handleCrearEquipo = async () => {
    if (!user) return
    if (!nombreEquipo.trim()) {
      setError('Por favor ingresá el nombre de tu equipo.')
      return
    }

    setCargando(true)
    setError(null)

    try {
      const nombreFinal = nombreEquipo.trim()
      await crearEquipo(user.uid, apodo || user.displayName || 'Capitán', {
        nombre: nombreFinal,
        escudoUrl: escudoEmoji,
        modalidadBase,
        genero: generoEquipo,
      })

      setEquipoCreadoNombre(nombreFinal)
      await actualizarOnboardingStep(user.uid, 3)
      setPaso(3)
    } catch (err: any) {
      console.error('Error al crear equipo:', err)
      setError(err?.message || 'No pudimos crear el equipo. Intentá nuevamente o saltea el paso.')
    } finally {
      setCargando(false)
    }
  }

  // --- ACCIÓN: SALTEAR PASO 2 (AGENTE LIBRE) ---
  const handleSaltearPaso2 = async () => {
    if (!user) return
    setCargando(true)
    try {
      await actualizarOnboardingStep(user.uid, 3)
      setPaso(3)
    } catch (err) {
      console.error('Error al actualizar paso:', err)
      setPaso(3)
    } finally {
      setCargando(false)
    }
  }

  // --- ACCIÓN: PUBLICAR EN EL MURO Y COMPLETAR ONBOARDING (PASO 3) ---
  const handleFinalizarOnboarding = async () => {
    if (!user) return
    if (!textoPost.trim()) {
      setError('Escribí unas palabras para tu presentación en el muro.')
      return
    }

    setCargando(true)
    setError(null)

    try {
      const edadVisual = calcularEdadVisual()
      const autorNombre =
        apodo.trim() || usuario?.nombre || user.displayName?.split(' ')[0] || 'Jugador'

      // Publicar en el muro con la carta FUT adjunta
      await crearPublicacion({
        tipo: 'carta',
        texto: textoPost.trim(),
        autorUid: user.uid,
        autorNombre: usuario ? `${usuario.nombre} ${usuario.apellido || ''}`.trim() : autorNombre,
        autorApodo: apodo.trim() || autorNombre,
        autorFotoUrl: usuario?.fotoUrl || user.photoURL || null,
        autorZona: localidadElegida || usuario?.zona || null,
        autorMunicipio: municipioSeleccionado || usuario?.municipio || null,
        tarjeta: {
          media: MEDIA_BASE_INICIAL,
          posicion: pos,
          edad: edadVisual,
          goles: 0,
          asistencias: 0,
          partidosJugados: 0,
          mvpCount: 0,
          pierna: pierna,
          equipoNombre: equipoCreadoNombre || 'Agente Libre',
        },
      })

      // Marcar onboarding completado
      await completarOnboarding(user.uid)
      setExitoFinal(true)

      // Redirigir a la app principal
      setTimeout(() => {
        window.location.href = '/'
      }, 1400)
    } catch (err: any) {
      console.error('Error al finalizar onboarding:', err)
      setError('Hubo un error al publicar tu carta. Intentá nuevamente.')
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0e0725] via-[#140b33] to-[#080314] text-white flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 font-sans selection:bg-emerald-500 selection:text-black">
      <CargandoFulbeando visible={cargando} />

      {/* Pantalla de Éxito / Bienvenida */}
      {exitoFinal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-green-300 flex items-center justify-center text-zinc-950 text-4xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.6)] animate-bounce">
            ⚽
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ¡Bienvenido a Fulbeando!
          </h2>
          <p className="text-emerald-400 font-bold text-lg mt-2">
            Tu carta fue publicada en el muro social.
          </p>
          <p className="text-zinc-400 text-sm mt-3 max-w-sm">
            Ingresando al radar de partidos y equipos de tu zona...
          </p>
        </div>
      )}

      {/* Encabezado Principal */}
      <header className="w-full max-w-4xl text-center mb-6 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Onboarding de Jugador
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
          Configurá tu Perfil Futbolero
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm mt-1">
          Completá 3 simples pasos para debutar en las canchas de tu zona.
        </p>

        {/* Stepper Visual */}
        <div className="w-full max-w-xl mx-auto mt-6 px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800 -translate-y-1/2 z-0">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300"
                style={{ width: paso === 1 ? '0%' : paso === 2 ? '50%' : '100%' }}
              />
            </div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                  paso > 1
                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : paso === 1
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {paso > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : '1'}
              </div>
              <span className="text-[11px] sm:text-xs font-bold mt-1 text-zinc-300">Tu Carta</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                  paso > 2
                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : paso === 2
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {paso > 2 ? <Check className="w-5 h-5 stroke-[3]" /> : '2'}
              </div>
              <span className="text-[11px] sm:text-xs font-bold mt-1 text-zinc-300">Tu Equipo</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                  paso === 3
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                3
              </div>
              <span className="text-[11px] sm:text-xs font-bold mt-1 text-zinc-300">Debut</span>
            </div>
          </div>
        </div>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div className="w-full max-w-4xl mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-between animate-shake">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-white text-xs underline ml-3"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* =========================================================================
          PASO 1: CREACIÓN DE CARTA FIFA
         ========================================================================= */}
      {paso === 1 && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Vista Previa en Tiempo Real */}
          <div className="lg:col-span-5 flex flex-col items-center bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              Vista Previa en Tiempo Real
            </div>

            <div className="scale-90 sm:scale-100 transition-all origin-top my-2">
              <TarjetaJugador datos={datosCarta} />
            </div>

            {/* Banner de Media Bloqueada */}
            <div className="w-full mt-4 bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-start gap-3 text-left">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-black uppercase text-amber-300 tracking-wide">
                  <span>Media Inicial: 55 (Bronce Base)</span>
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1 py-0.2 rounded font-mono">
                    BLOQUEADA
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] mt-1 leading-relaxed">
                  Todos los jugadores comienzan con Media 55. Nadie puede modificarla manualmente: tu
                  valoración subirá con los partidos que juegues y los votos MVP recibidos.
                </p>
              </div>
            </div>

            {/* Radar / Resumen de Atributos */}
            <div className="w-full mt-4 pt-4 border-t border-white/10 grid grid-cols-5 gap-1.5 text-center">
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">RIT</div>
                <div className="text-base font-black text-emerald-400">{ritmo}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">TIR</div>
                <div className="text-base font-black text-amber-400">{tiro}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">PAS</div>
                <div className="text-base font-black text-sky-400">{pase}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">DEF</div>
                <div className="text-base font-black text-indigo-400">{defensa}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">FÍS</div>
                <div className="text-base font-black text-rose-400">{fisico}</div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario de la Carta */}
          <div className="lg:col-span-7 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              1. Datos Básicos y Posición
            </h2>

            {/* Nombre / Apodo */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nombre o Apodo en la Carta
              </label>
              <input
                type="text"
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                maxLength={18}
                placeholder="Ej: Lucho, El Diez, Toro"
                className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Fecha de Nacimiento y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Edad calculada: {calcularEdadVisual()} años
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Teléfono (WhatsApp opcional)
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 11 1234 5678"
                  className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Posición en la Cancha */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Posición Principal
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'DEL', label: 'DEL', desc: 'Delantero' },
                  { id: 'MED', label: 'MED', desc: 'Medio' },
                  { id: 'DEF', label: 'DEF', desc: 'Defensor' },
                  { id: 'ARQ', label: 'ARQ', desc: 'Arquero' },
                ].map((item) => {
                  const activa = pos === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPos(item.id as any)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        activa
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                          : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base font-black">{item.label}</span>
                      <span className="text-[10px] opacity-80">{item.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pierna Hábil */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Pierna Hábil
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Diestro', 'Zurdo', 'Ambidiestro'] as const).map((pie) => {
                  const activa = pierna === pie
                  return (
                    <button
                      key={pie}
                      type="button"
                      onClick={() => setPierna(pie)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                        activa
                          ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                          : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {pie}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Zona / Localidad */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                Municipio y Localidad
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={municipioSeleccionado}
                  onChange={(e) => {
                    const m = e.target.value
                    setMunicipioSeleccionado(m)
                    const locs = DIVISION_GEOGRAFICA[regionSeleccionada]?.[m] || []
                    if (locs.length > 0) setLocalidadElegida(locs[0])
                  }}
                  className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {municipiosDeRegion.map((m) => (
                    <option key={m} value={m} className="bg-zinc-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    value={mostrarBuscador ? localidadQuery : localidadElegida}
                    onFocus={() => {
                      setMostrarBuscador(true)
                      setLocalidadQuery('')
                    }}
                    onChange={(e) => setLocalidadQuery(e.target.value)}
                    placeholder="Buscá tu barrio/localidad..."
                    className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  {mostrarBuscador && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl max-h-48 overflow-y-auto z-30 shadow-2xl p-1">
                      {localidadesFiltradas.length > 0 ? (
                        localidadesFiltradas.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setLocalidadElegida(loc)
                              setMostrarBuscador(false)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-500/20 hover:text-emerald-300 transition"
                          >
                            {loc}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-zinc-500">No encontramos esa localidad</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sliders de Atributos */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Atributos Autopercibidos (1 al 99)
                </span>
                <span className="text-[11px] text-zinc-400">Definen tu estilo de juego</span>
              </div>

              <div className="space-y-3.5 bg-zinc-950/40 p-3.5 rounded-xl border border-white/5">
                {/* Ritmo */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" /> Ritmo (Velocidad / Aceleración)
                    </span>
                    <span className="text-emerald-400 font-mono font-black">{ritmo}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={ritmo}
                    onChange={(e) => setRitmo(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                {/* Tiro */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-400" /> Tiro (Potencia / Definición)
                    </span>
                    <span className="text-amber-400 font-mono font-black">{tiro}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={tiro}
                    onChange={(e) => setTiro(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                {/* Pase */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Pase (Visión / Precisión)
                    </span>
                    <span className="text-sky-400 font-mono font-black">{pase}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={pase}
                    onChange={(e) => setPase(Number(e.target.value))}
                    className="w-full accent-sky-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                {/* Defensa */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" /> Defensa (Corte / Posicionamiento)
                    </span>
                    <span className="text-indigo-400 font-mono font-black">{defensa}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={defensa}
                    onChange={(e) => setDefensa(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                {/* Físico */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> Físico (Resistencia / Fuerza)
                    </span>
                    <span className="text-rose-400 font-mono font-black">{fisico}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={fisico}
                    onChange={(e) => setFisico(Number(e.target.value))}
                    className="w-full accent-rose-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Botón de Continuar */}
            <button
              type="button"
              onClick={handleGuardarPaso1}
              disabled={cargando}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>Guardar y Continuar al Paso 2</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PASO 2: CREACIÓN DE EQUIPO (OPCIONAL / RÁPIDO)
         ========================================================================= */}
      {paso === 2 && (
        <div className="w-full max-w-2xl bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in flex flex-col gap-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              ¿Tenés un equipo con amigos?
            </h2>
            <p className="text-zinc-400 text-sm mt-1 max-w-md mx-auto">
              Podés fundar tu equipo ahora para jugar partidos, o saltear este paso si buscás sumarte
              como agente libre.
            </p>
          </div>

          <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
            {/* Nombre del Equipo */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nombre de tu Equipo
              </label>
              <input
                type="text"
                value={nombreEquipo}
                onChange={(e) => setNombreEquipo(e.target.value)}
                maxLength={30}
                placeholder="Ej: Los Galácticos FC, La Banda de Lomas"
                className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
              />
            </div>

            {/* Escudo / Emoji */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Escudo / Emblema
              </label>
              <div className="flex flex-wrap gap-2.5">
                {ESCUDOS_PREDETERMINADOS.map((emoji) => {
                  const activa = escudoEmoji === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEscudoEmoji(emoji)}
                      className={`w-11 h-11 rounded-xl border text-xl flex items-center justify-center transition cursor-pointer ${
                        activa
                          ? 'bg-indigo-600/30 border-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                          : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modalidad y Género */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Modalidad Base
                </label>
                <select
                  value={modalidadBase}
                  onChange={(e) => setModalidadBase(e.target.value)}
                  className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="Fútbol 5">Fútbol 5</option>
                  <option value="Fútbol 7">Fútbol 7</option>
                  <option value="Fútbol 8">Fútbol 8</option>
                  <option value="Fútbol 11">Fútbol 11</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <select
                  value={generoEquipo}
                  onChange={(e) => setGeneroEquipo(e.target.value as any)}
                  className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCrearEquipo}
              disabled={cargando || !nombreEquipo.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition cursor-pointer disabled:opacity-40"
            >
              <Shield className="w-5 h-5" />
              <span>Crear Equipo y Continuar</span>
            </button>

            <button
              type="button"
              onClick={handleSaltearPaso2}
              disabled={cargando}
              className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Saltar por ahora (Busco equipo como agente libre) →</span>
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a editar mi carta
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PASO 3: PRIMERA PUBLICACIÓN EN EL MURO SOCIAL
         ========================================================================= */}
      {paso === 3 && (
        <div className="w-full max-w-4xl bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in flex flex-col gap-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <Send className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¡Hacé tu debut en la comunidad!
            </h2>
            <p className="text-zinc-400 text-sm mt-1 max-w-md mx-auto">
              Publicá tu carta en el muro social de tu zona para que los capitanes y canchas te
              conozcan y te inviten a jugar.
            </p>
          </div>

          {/* Cuadro de Redacción */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tu mensaje de presentación</span>
              <span className="text-[11px] text-zinc-500 font-normal">Podés editarlo a tu gusto</span>
            </label>
            <textarea
              rows={3}
              value={textoPost}
              onChange={(e) => setTextoPost(e.target.value)}
              maxLength={280}
              placeholder="Escribí unas palabras para tu presentación..."
              className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
            />
            <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-1">
              <span>Se adjuntará automáticamente tu Carta FUT oficial</span>
              <span>{textoPost.length} / 280</span>
            </div>
          </div>

          {/* Vista Previa de la Publicación en el Feed */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              Así se verá tu post en el Muro de la Comunidad:
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
              {/* Header del post */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-white/10">
                  {usuario?.fotoUrl || user?.photoURL ? (
                    <img
                      src={usuario?.fotoUrl || user?.photoURL || ''}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>⚽</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{datosCarta.nombre}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      NUEVO JUGADOR
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    📍 {localidadElegida || municipioSeleccionado} · Recién publicado
                  </span>
                </div>
              </div>

              {/* Texto del post */}
              <p className="text-sm text-zinc-200 mb-4 whitespace-pre-wrap leading-relaxed">
                {textoPost}
              </p>

              {/* Carta FUT adjunta */}
              <div className="flex justify-center p-3 bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                <div className="scale-85 sm:scale-95 origin-center">
                  <TarjetaJugador datos={datosCarta} />
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Publicar */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleFinalizarOnboarding}
              disabled={cargando || !textoPost.trim()}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition cursor-pointer disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
              <span>Publicar en el Muro y Comenzar</span>
            </button>

            <button
              type="button"
              onClick={() => setPaso(2)}
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center justify-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Paso 2
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
