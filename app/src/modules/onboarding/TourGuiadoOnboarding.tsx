import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Shield,
  Send,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  MapPin,
  User,
  Zap,
  Target,
  Flame,
  Activity,
  ArrowRight,
  X,
  Info,
} from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
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
const MEDIA_BASE_INICIAL = 55

export function TourGuiadoOnboarding() {
  const sesion = useSesion()
  const usuario = sesion.usuario
  const user = sesion.user
  const location = useLocation()
  const navigate = useNavigate()

  const [completadoLocal, setCompletadoLocal] = useState<boolean>(() => {
    if (usuario?.onboarding_completed === true) return true
    if (user?.uid && typeof window !== 'undefined') {
      return localStorage.getItem(`onboarding_completed_${user.uid}`) === 'true'
    }
    return false
  })

  // Determinar si el tour debe estar activo: solo para jugadores que no completaron el onboarding
  const estaActivo = Boolean(
    !completadoLocal &&
    usuario &&
    usuario.rol === 'jugador' &&
    usuario.onboarding_completed !== true &&
    (!user?.uid || localStorage.getItem(`onboarding_completed_${user.uid}`) !== 'true')
  )

  // Paso actual (1: Carta, 2: Equipo, 3: Debut) manejado con estado local sincronizado
  const [paso, setPaso] = useState<number>(() => {
    if (usuario?.onboarding_step && usuario.onboarding_step >= 1 && usuario.onboarding_step <= 3) {
      return usuario.onboarding_step
    }
    if (usuario?.perfilDeportivo?.posicion) {
      if (!usuario.perfilDeportivo.teamIds || usuario.perfilDeportivo.teamIds.length === 0) return 2
      return 3
    }
    return 1
  })

  // Sincronizar si usuario.onboarding_step cambia desde la sesión
  useEffect(() => {
    if (usuario?.onboarding_step && usuario.onboarding_step > paso) {
      setPaso(usuario.onboarding_step)
    }
  }, [usuario?.onboarding_step])

  // Estado visual del tour
  const [minimizado, setMinimizado] = useState<boolean>(false)
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)
  const [cargando, setCargando] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [exitoCelebracion, setExitoCelebracion] = useState<boolean>(false)

  // --- FORMULARIO PASO 1 (CARTA) ---
  const [apodo, setApodo] = useState<string>('')
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('')
  const [telefono, setTelefono] = useState<string>('')
  const [pos, setPos] = useState<'DEL' | 'MED' | 'DEF' | 'ARQ'>('DEL')
  const [pierna, setPierna] = useState<'Diestro' | 'Zurdo' | 'Ambidiestro'>('Diestro')

  // Sliders de atributos
  const [ritmo, setRitmo] = useState<number>(70)
  const [tiro, setTiro] = useState<number>(72)
  const [pase, setPase] = useState<number>(68)
  const [fisico, setFisico] = useState<number>(70)
  const [defensa, setDefensa] = useState<number>(60)

  // Zona
  const [regionSeleccionada] = useState<string>('GBA Zona Sur')
  const municipiosDeRegion = Object.keys(DIVISION_GEOGRAFICA[regionSeleccionada] || {})
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>('Lomas de Zamora')
  const localidadesDisponibles = DIVISION_GEOGRAFICA[regionSeleccionada]?.[municipioSeleccionado] || []
  const [localidadElegida, setLocalidadElegida] = useState<string>('Lomas de Zamora')
  const [localidadQuery, setLocalidadQuery] = useState<string>('')
  const [mostrarBuscador, setMostrarBuscador] = useState<boolean>(false)

  // --- FORMULARIO PASO 2 (EQUIPO) ---
  const [nombreEquipo, setNombreEquipo] = useState<string>('')
  const [escudoEmoji, setEscudoEmoji] = useState<string>('⚽')
  const [modalidadBase, setModalidadBase] = useState<string>('Fútbol 5')
  const [generoEquipo, setGeneroEquipo] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Masculino')
  const [equipoCreadoNombre, setEquipoCreadoNombre] = useState<string | null>(null)

  // --- FORMULARIO PASO 3 (PUBLICACIÓN) ---
  const [textoPost, setTextoPost] = useState<string>('')

  // Sincronizar datos iniciales del usuario
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
    }
  }, [usuario, user])

  // Abrir automáticamente el modal si el usuario está en la pantalla correspondiente a su paso
  useEffect(() => {
    if (!estaActivo) return
    if (paso === 1 && location.pathname === '/perfil') {
      setModalAbierto(true)
    } else if (paso === 2 && location.pathname === '/equipo') {
      setModalAbierto(true)
    } else if (paso === 3 && location.pathname === '/') {
      setModalAbierto(true)
    }
  }, [paso, location.pathname, estaActivo])

  // Template para el paso 3
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

  // Si no está activo el tour y no hay celebración, no renderizar nada
  if (!estaActivo && !exitoCelebracion) return null

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

  // Datos para la Tarjeta FIFA (Media 55 Bronce bloqueada)
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

  const localidadesFiltradas = localidadesDisponibles.filter((loc) =>
    loc.toLowerCase().includes(localidadQuery.toLowerCase())
  )

  // Acciones de navegación del Tour
  const manejarIrAPaso = (pasoDestino: number) => {
    setPaso(pasoDestino)
    if (pasoDestino === 1) {
      navigate('/perfil')
    } else if (pasoDestino === 2) {
      navigate('/equipo')
    } else if (pasoDestino === 3) {
      navigate('/')
    }
    setModalAbierto(true)
  }

  // --- GUARDAR PASO 1 Y NAVEGAR A /equipo ---
  const handleGuardarPaso1 = async () => {
    if (!user) return
    if (!apodo.trim()) {
      setError('Por favor completá tu apodo para la carta.')
      return
    }
    if (!fechaNacimiento) {
      setError('Por favor completá tu fecha de nacimiento.')
      return
    }
    if (!localidadElegida) {
      setError('Por favor seleccioná tu localidad o barrio.')
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

      // Avanzar al Paso 2 inmediatamente en estado local
      setPaso(2)
      void sesion.refrescar?.()

      // Llevar automáticamente a la pantalla de Equipo y abrir el modal
      navigate('/equipo')
      setModalAbierto(true)
    } catch (err: any) {
      console.error('Error al guardar paso 1:', err)
      setError('No pudimos guardar los datos de tu carta.')
    } finally {
      setCargando(false)
    }
  }

  // --- CREAR EQUIPO (PASO 2) Y NAVEGAR A / ---
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
      void sesion.refrescar?.()

      // Llevar automáticamente al Muro social y abrir el modal
      navigate('/')
      setModalAbierto(true)
    } catch (err: any) {
      console.error('Error al crear equipo:', err)
      setError(err?.message || 'No pudimos crear el equipo.')
    } finally {
      setCargando(false)
    }
  }

  // --- SALTEAR PASO 2 (AGENTE LIBRE) Y NAVEGAR A / ---
  const handleSaltearPaso2 = async () => {
    if (!user) return
    setCargando(true)
    try {
      await actualizarOnboardingStep(user.uid, 3)
      setPaso(3)
      void sesion.refrescar?.()
      navigate('/')
      setModalAbierto(true)
    } catch (err) {
      console.error(err)
      setPaso(3)
      navigate('/')
      setModalAbierto(true)
    } finally {
      setCargando(false)
    }
  }

  // --- PUBLICAR EN EL MURO (PASO 3) Y COMPLETAR TOUR ---
  const handlePublicarDebut = async () => {
    if (!user) return
    if (!textoPost.trim()) {
      setError('Escribí unas palabras para tu presentación.')
      return
    }

    setCargando(true)
    setError(null)

    try {
      const edadVisual = calcularEdadVisual()
      const autorNombre =
        apodo.trim() || usuario?.nombre || user.displayName?.split(' ')[0] || 'Jugador'

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

      await completarOnboarding(user.uid)
      if (user?.uid && typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_completed_${user.uid}`, 'true')
      }
      setCompletadoLocal(true)
      setModalAbierto(false)
      setExitoCelebracion(true)
      void sesion.refrescar?.()

      setTimeout(() => {
        setExitoCelebracion(false)
      }, 3500)
    } catch (err: any) {
      console.error('Error al publicar debut:', err)
      setError('Hubo un error al publicar tu carta.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {/* =========================================================================
          BANNER / ASISTENTE FLOTANTE PERSISTENTE EN LA APP (HUD)
         ========================================================================= */}
      {estaActivo && !completadoLocal && (
        <div className="fixed bottom-20 md:bottom-6 right-3 left-3 md:left-auto md:right-6 md:w-96 z-[120] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
        <div className="bg-gradient-to-r from-zinc-950 via-[#1f103f] to-zinc-950 border border-emerald-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.85)] rounded-2xl overflow-hidden backdrop-blur-xl">
          {/* Barra de progreso de 3 pasos */}
          <div className="h-1.5 w-full bg-zinc-800 flex">
            <div
              className={`h-full transition-all duration-500 ${
                paso >= 1 ? 'bg-emerald-400' : 'bg-transparent'
              }`}
              style={{ width: '33.3%' }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                paso >= 2 ? 'bg-emerald-400' : 'bg-transparent'
              }`}
              style={{ width: '33.3%' }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                paso >= 3 ? 'bg-emerald-400' : 'bg-transparent'
              }`}
              style={{ width: '33.4%' }}
            />
          </div>

          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-zinc-950 font-black text-lg shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                {paso === 1 ? '1' : paso === 2 ? '2' : '3'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Tour Guiado · Paso {paso} de 3
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {paso === 1 && 'Armá tu Carta FUT'}
                  {paso === 2 && 'Creá tu Equipo con amigos'}
                  {paso === 3 && 'Publicá tu Debut en el Muro'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => manejarIrAPaso(paso)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] transition cursor-pointer flex items-center gap-1"
              >
                <span>{modalAbierto ? 'Ver' : 'Completar'}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={() => setMinimizado(!minimizado)}
                aria-label="Minimizar tour"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                {minimizado ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Contenido expandido del HUD */}
          {!minimizado && (
            <div className="px-3.5 pb-3 text-[11px] text-zinc-300 border-t border-white/5 pt-2 flex items-center justify-between">
              <span>
                {paso === 1 && 'Configurá posición, pierna y zona (Media 55 base fijada).'}
                {paso === 2 && 'Podés fundar tu equipo o continuar como agente libre.'}
                {paso === 3 && 'Hacé tu post de presentación para que te inviten a jugar.'}
              </span>
              <span className="text-emerald-400 font-bold ml-2 shrink-0">
                {paso === 1 ? '33%' : paso === 2 ? '66%' : '99%'}
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* =========================================================================
          PANTALLA DE CELEBRACIÓN AL COMPLETAR TOUR
         ========================================================================= */}
      {exitoCelebracion && (
        <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-green-300 flex items-center justify-center text-zinc-950 text-4xl mb-4 shadow-[0_0_40px_rgba(16,185,129,0.7)] animate-bounce">
            🏆
          </div>
          <h2 className="text-3xl font-black text-white">¡Felicitaciones!</h2>
          <p className="text-emerald-400 font-bold text-lg mt-1">
            Completaste el Tour de Onboarding.
          </p>
          <p className="text-zinc-300 text-sm mt-2 max-w-sm">
            Tu carta oficial ya está en el Muro Social de tu zona. ¡Ya podés buscar partidos y desafiar rivales!
          </p>
        </div>
      )}

      {/* =========================================================================
          MODALES INTERACTIVOS PASO A PASO
         ========================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in pointer-events-auto">
          <div className="relative w-full max-w-xl max-h-[90vh] bg-gradient-to-b from-[#160b33] via-[#100726] to-[#0a0418] border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-y-auto text-white">
            {/* Botón Cerrar */}
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Alerta de Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="underline ml-2">
                  Cerrar
                </button>
              </div>
            )}

            {/* --- CONTENIDO PASO 1: CARTA FUT --- */}
            {paso === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Paso 1 de 3
                  </span>
                  <span className="text-xs text-zinc-400">En pantalla: Tu Perfil</span>
                </div>

                <h3 className="text-xl font-black tracking-tight">Armá tu Carta FUT Oficial</h3>

                {/* Banner de Media Bloqueada */}
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-black uppercase text-amber-300">
                      Media Oficial: 55 (Ficha Bronce) · Bloqueada
                    </span>
                    <p className="text-zinc-300 text-[11px] mt-0.5 leading-relaxed">
                      Todos los jugadores arrancan con Media 55. Tu promedio subirá automáticamente
                      partido a partido con tus estadísticas y los votos MVP de tus compañeros y rivales.
                    </p>
                  </div>
                </div>

                {/* Vista previa miniatura de la carta */}
                <div className="flex justify-center p-2 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="scale-75 origin-top -mb-16">
                    <TarjetaJugador datos={datosCarta} />
                  </div>
                </div>

                {/* Campos */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Nombre o Apodo en la Carta
                    </label>
                    <input
                      type="text"
                      value={apodo}
                      onChange={(e) => setApodo(e.target.value)}
                      maxLength={18}
                      placeholder="Ej: Lucho, El Diez"
                      className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Pierna Hábil
                      </label>
                      <select
                        value={pierna}
                        onChange={(e) => setPierna(e.target.value as any)}
                        className="w-full bg-zinc-950/70 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Diestro">Diestro</option>
                        <option value="Zurdo">Zurdo</option>
                        <option value="Ambidiestro">Ambidiestro</option>
                      </select>
                    </div>
                  </div>

                  {/* Posición */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Posición en Cancha
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['DEL', 'MED', 'DEF', 'ARQ'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPos(p)}
                          className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                            pos === p
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                              : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Municipio y Localidad */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                      Zona / Localidad
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={municipioSeleccionado}
                        onChange={(e) => {
                          const m = e.target.value
                          setMunicipioSeleccionado(m)
                          const locs = DIVISION_GEOGRAFICA[regionSeleccionada]?.[m] || []
                          if (locs.length > 0) setLocalidadElegida(locs[0])
                        }}
                        className="bg-zinc-950/70 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-white"
                      >
                        {municipiosDeRegion.map((m) => (
                          <option key={m} value={m} className="bg-zinc-900">
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={localidadElegida}
                        onChange={(e) => setLocalidadElegida(e.target.value)}
                        className="bg-zinc-950/70 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-white"
                      >
                        {localidadesDisponibles.map((loc) => (
                          <option key={loc} value={loc} className="bg-zinc-900">
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sliders de Atributos */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Atributos Autopercibidos (1 al 99)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-zinc-300 mb-0.5">
                          <span>⚡ Ritmo</span>
                          <span className="text-emerald-400">{ritmo}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={ritmo}
                          onChange={(e) => setRitmo(Number(e.target.value))}
                          className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-zinc-300 mb-0.5">
                          <span>🎯 Tiro</span>
                          <span className="text-amber-400">{tiro}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={tiro}
                          onChange={(e) => setTiro(Number(e.target.value))}
                          className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-zinc-300 mb-0.5">
                          <span>👟 Pase</span>
                          <span className="text-sky-400">{pase}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={pase}
                          onChange={(e) => setPase(Number(e.target.value))}
                          className="w-full accent-sky-500 h-1.5 bg-zinc-800 rounded"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-zinc-300 mb-0.5">
                          <span>🛡️ Defensa</span>
                          <span className="text-indigo-400">{defensa}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={defensa}
                          onChange={(e) => setDefensa(Number(e.target.value))}
                          className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón Guardar y continuar a Equipo */}
                <button
                  type="button"
                  onClick={handleGuardarPaso1}
                  disabled={cargando}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition cursor-pointer mt-3"
                >
                  <span>Guardar Carta e ir al Paso 2 (Tu Equipo)</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            )}

            {/* --- CONTENIDO PASO 2: EQUIPO --- */}
            {paso === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                    Paso 2 de 3
                  </span>
                  <span className="text-xs text-zinc-400">En pantalla: Equipos</span>
                </div>

                <h3 className="text-xl font-black tracking-tight">¿Tenés un equipo con amigos?</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Podés fundar tu equipo ahora para jugar partidos y desafíos, o continuar como agente libre
                  si buscás sumarte a un equipo existente.
                </p>

                <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Nombre de tu Equipo
                    </label>
                    <input
                      type="text"
                      value={nombreEquipo}
                      onChange={(e) => setNombreEquipo(e.target.value)}
                      placeholder="Ej: Los Galácticos FC"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                      Escudo / Emoji
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ESCUDOS_PREDETERMINADOS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEscudoEmoji(emoji)}
                          className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center transition cursor-pointer ${
                            escudoEmoji === emoji
                              ? 'bg-indigo-600/40 border-indigo-400 scale-110 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                              : 'bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Modalidad
                      </label>
                      <select
                        value={modalidadBase}
                        onChange={(e) => setModalidadBase(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Fútbol 5">Fútbol 5</option>
                        <option value="Fútbol 7">Fútbol 7</option>
                        <option value="Fútbol 8">Fútbol 8</option>
                        <option value="Fútbol 11">Fútbol 11</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Categoría
                      </label>
                      <select
                        value={generoEquipo}
                        onChange={(e) => setGeneroEquipo(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Mixto">Mixto</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCrearEquipo}
                    disabled={cargando || !nombreEquipo.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition cursor-pointer disabled:opacity-40"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Crear Equipo e ir al Paso 3 (El Muro)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaltearPaso2}
                    disabled={cargando}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Continuar como Agente Libre (Saltar) →</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- CONTENIDO PASO 3: DEBUT EN EL MURO --- */}
            {paso === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Paso 3 de 3 · Final
                  </span>
                  <span className="text-xs text-zinc-400">En pantalla: Muro Social</span>
                </div>

                <h3 className="text-xl font-black tracking-tight">Hacé tu debut en la comunidad</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Presentate en el Muro Social con tu Carta FUT adjunta para que los capitanes y predios
                  de tu zona te contacten para jugar.
                </p>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Mensaje de presentación
                  </label>
                  <textarea
                    rows={3}
                    value={textoPost}
                    onChange={(e) => setTextoPost(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Vista previa miniatura del post */}
                <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold shrink-0">
                    ⚽
                  </div>
                  <div className="text-xs min-w-0">
                    <span className="font-bold text-white block truncate">{datosCarta.nombre}</span>
                    <span className="text-[11px] text-zinc-400 block truncate">
                      Se publicará tu mensaje junto a tu Ficha Bronce (Media 55).
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePublicarDebut}
                  disabled={cargando || !textoPost.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition cursor-pointer disabled:opacity-40 mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publicar en el Muro y Finalizar Tour</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
