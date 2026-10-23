import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Building, Share2, CheckCircle, Search, Calendar, ChevronRight, Settings, Download, X, Loader2, MessageCircle, Copy, Users, Check, Radio, Lock, Unlock, Trash2, Clock, Trophy } from 'lucide-react';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { ingresoConGoogle, ingresoConEmail, registroConEmail } from '@/modules/auth/servicio';
import { useSesion } from '@/modules/auth/useSesion';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { MONTO_SENA_DEFAULT, COLECCIONES } from '@/core/config';
import { requestNotificationPermission } from '@/modules/notifications/pushService';
import { useGeolocation } from '@/hooks/useGeolocation';
import { obtenerEquiposDeUsuario, escucharEquiposDeUsuario, obtenerEquipoPorId, actualizarEquipo, buscarJugadores, crearEquipo, delegarCapitania, liberarMiembro, salirDelEquipo, eliminarEquipo, unirseAEquipo, enviarInvitacionAEquipo, actualizarConvocatoriaEquipo, alternarCierreConvocatoria, cancelarConvocatoriaEquipo, finalizarTercerTiempoYPartido, emitirVotoMvp } from '@/modules/teams/teamService';
import { doc, updateDoc, serverTimestamp, collection, setDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { MAX_MEMBROS_EQUIPO, MAX_EQUIPOS_POR_JUGADOR, nombreCompleto, PERFIL_DEPORTIVO_VACIO, type PerfilDeportivo, type Posicion, type PlayerRole, type Turno, calcularMediaJugador, calcularDivisionEquipo, calcularRutaDestino } from '@/domain';
import { DIVISION_GEOGRAFICA, calcularGeoZona } from '@/core/geo/zonas';
import { aGeoIndex } from '@/core/geo';
import { listarTurnosDelOrganizador } from '@/modules/turnos/repositorio';
import { obtenerPredio } from '@/modules/predios/repositorio';
import { aFechaISO } from '@/core/tiempo';
import { optimizeAvatarImage } from '@/imageCompressor';
import { uploadImageToR2 } from '@/uploader';
import { useDatosCarta } from '@/modules/cuenta/useDatosCarta';
import { TarjetaJugador, obtenerTemaSegunMedia } from '@/modules/cuenta/componentes/TarjetaJugador';
import { generarImagenCarta, descargarBlob } from '@/modules/comunidad/tarjetaImagen';
import { Toast, useConfirmar, CargandoFulbeando } from '@/modules/ui/overlays';
import { BannerSponsorTercerTiempo } from '@/modules/publicidad/componentes/BannerSponsorTercerTiempo';

// ==========================================
// PANTALLA 1: Login / Registro Unificado
// ==========================================
export const Screen1Login = () => {
  const navigate = useNavigate();
  const sesion = useSesion();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');

  // Redirigir limpiamente cuando la sesión y el perfil del usuario estén listos
  React.useEffect(() => {
    if (sesion.usuario && !sesion.cargando) {
      requestNotificationPermission(sesion.usuario.uid).catch((e) =>
        console.log('Auto-prompt blocked', e),
      );
      const destino = calcularRutaDestino(sesion.usuario);
      navigate(destino, { replace: true });
    }
  }, [sesion.usuario, sesion.cargando, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setCargando(true);
      setError(null);
      await ingresoConGoogle();
      // No llamamos a navigate() acá: el useEffect anterior redirigirá directamente
      // al destino correspondiente sin pantallas intermedias ni parpadeos.
    } catch (err: any) {
      console.error('Error al iniciar con Google:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError('Hubo un error al iniciar sesión con Google. Intentá de nuevo.');
      }
      setCargando(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completá email y contraseña.');
      return;
    }
    if (isRegister && (!nombre || !apellido)) {
      setError('Por favor completá tu nombre y apellido.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      if (isRegister) {
        await registroConEmail(nombre, apellido, email, password);
      } else {
        await ingresoConEmail(email, password);
      }
      // NOTA: NO llamamos a navigate() acá manualmente con un estado anterior o nulo.
      // useSesion actualizará la sesión y el useEffect redirigirá directamente
      // al destino correcto (jugador, dueño de predio, superadmin, etc.),
      // evitando rebotar por /radar y volver a /login.
      // Dejamos cargando=true para mantener la pantalla de carga limpia hasta que se concrete la navegación.
    } catch (err: any) {
      console.error('Error en autenticación por email:', err);
      let msj = 'Hubo un error al autenticar.';
      if (err.code === 'auth/email-already-in-use') msj = 'El correo ya está registrado. Ingresá en lugar de registrarte.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') msj = 'Correo o contraseña incorrectos.';
      if (err.code === 'auth/weak-password') msj = 'La contraseña es muy débil (mínimo 6 caracteres).';
      setError(msj);
      setCargando(false);
    }
  };

  // Si la sesión inicial está cargando o el usuario ya está autenticado esperando la navegación,
  // mostramos directamente el loader de marca para evitar cualquier parpadeo del formulario.
  if (sesion.cargando || (sesion.usuario && !sesion.cargando)) {
    return (
      <div className="min-h-full min-h-[100dvh] w-full bg-gradient-to-b from-[#361982] via-[#281165] to-[#1c0a48] flex flex-col justify-center items-center p-6 text-white font-sans">
        <CargandoFulbeando visible={true} mensaje="Iniciando sesión…" />
      </div>
    );
  }

  return (
    <div className="min-h-full min-h-[100dvh] w-full bg-gradient-to-b from-[#361982] via-[#281165] to-[#1c0a48] flex flex-col justify-center items-center p-6 text-white font-sans overflow-y-auto">
      <CargandoFulbeando visible={cargando} mensaje="Ingresando…" />
      <div className="w-full max-w-sm space-y-6 bg-white/5 backdrop-blur-xl border border-[#4c24b2]/40 p-6 sm:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="text-center">
          <img src="/logo-anterior.svg" alt="Al Ángulo" className="w-full h-32 object-contain object-center mx-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]" />
          <p className="text-emerald-400 font-black uppercase tracking-widest text-xs mt-2">La red futbolera</p>
        </div>
        
        {error && (
          <div className="text-rose-300 text-sm text-center font-bold bg-rose-500/20 border border-rose-500/40 py-2.5 px-3 rounded-xl">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailAuth}>
          {isRegister && (
            <div className="flex gap-2">
              <input 
                type="text" 
                aria-label="Nombre" 
                placeholder="Nombre" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)} 
                className="w-1/2 bg-[#1c0a48]/70 border border-[#4c24b2]/60 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition" 
              />
              <input 
                type="text" 
                aria-label="Apellido" 
                placeholder="Apellido" 
                value={apellido} 
                onChange={e => setApellido(e.target.value)} 
                className="w-1/2 bg-[#1c0a48]/70 border border-[#4c24b2]/60 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition" 
              />
            </div>
          )}
          <input 
            type="email" 
            aria-label="Email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full bg-[#1c0a48]/70 border border-[#4c24b2]/60 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition" 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            aria-label="Contraseña" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full bg-[#1c0a48]/70 border border-[#4c24b2]/60 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition" 
          />
          
          <motion.button 
            type="submit" 
            disabled={cargando} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3.5 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'PROCESANDO...' : (isRegister ? 'REGISTRARME' : 'INGRESAR')}
          </motion.button>
        </form>
        
        <div className="text-center">
          <button 
            type="button" 
            onClick={() => { setIsRegister(!isRegister); setError(null); }} 
            className="text-sm text-indigo-200 hover:text-white font-semibold transition cursor-pointer"
          >
            {isRegister ? '¿Ya tenés cuenta? Ingresá acá' : '¿No tenés cuenta? Registrate gratis'}
          </button>
        </div>
        
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#4c24b2]/40"></div>
          <span className="flex-shrink-0 mx-4 text-indigo-200/70 text-xs font-semibold">O</span>
          <div className="flex-grow border-t border-[#4c24b2]/40"></div>
        </div>

        <motion.button 
          onClick={handleGoogleLogin} 
          disabled={cargando}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          {cargando ? 'Conectando...' : 'Continuar con Google'}
        </motion.button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 2: Selector de Rol
// ==========================================
export const Screen2RoleSelector = () => {
  const sesion = useSesion();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegirRol = async (rol: 'jugador' | 'dueno_predio', path: string) => {
    if (!sesion.user) return;
    setCargando(true);
    setError(null);
    try {
      if (rol === 'dueno_predio') {
        // Alta de dueno: rol + solicitud en la MISMA transaccion y despues al
        // cartel de contacto. El plan queda `pendiente`, asi que el usuario no
        // llega a ninguna otra pantalla hasta que el superadmin lo active.
        const { iniciarAltaDueno } = await import('@/modules/solicitudes/repositorio');
        await iniciarAltaDueno(sesion.user.uid, {
          nombre: sesion.usuario?.nombre ?? sesion.user.displayName?.split(' ')[0] ?? '',
          apellido: sesion.usuario?.apellido ?? '',
          telefono: sesion.usuario?.telefono ?? '',
          email: sesion.usuario?.email ?? sesion.user.email ?? '',
        });
        // Recarga completa: la sesion se lee UNA sola vez por login y con un
        // `navigate` quedaria vieja (rol `invitado`) y rebotaria a esta pantalla.
        window.location.href = '/plan-pendiente';
        return;
      }

      const { cambiarRol } = await import('@/modules/usuarios/repositorio');
      await cambiarRol(sesion.user.uid, rol);
      window.location.href = path; // Redirige y fuerza recarga para actualizar la sesión
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No pudimos guardar tu eleccion.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-full min-h-[100dvh] w-full bg-gradient-to-b from-[#361982] via-[#281165] to-[#1c0a48] p-6 flex flex-col justify-center items-center font-sans">
      <CargandoFulbeando visible={cargando} />
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-black text-white text-center mb-8 drop-shadow-md">¿Cómo vas a jugar hoy?</h2>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-center text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Card Jugador */}
          <button 
            onClick={() => elegirRol('jugador', '/onboarding-player')} 
            disabled={cargando}
            className="w-full bg-white/5 backdrop-blur-md border border-[#4c24b2]/40 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-400 hover:bg-white/10 transition group text-left disabled:opacity-50 shadow-lg cursor-pointer"
          >
            <div className="bg-[#1c0a48] border border-[#4c24b2]/60 p-3 rounded-full text-indigo-200 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Soy Jugador</h3>
              <p className="text-sm text-indigo-200/80 mt-1">Armá tu carta, fichá en equipos y desafiá rivales en tu barrio.</p>
            </div>
          </button>

          {/* Card Dueño */}
          <button 
            onClick={() => elegirRol('dueno_predio', '/venue-registration')} 
            disabled={cargando}
            className="w-full bg-white/5 backdrop-blur-md border border-[#4c24b2]/40 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-400 hover:bg-white/10 transition group text-left disabled:opacity-50 shadow-lg cursor-pointer"
          >
            <div className="bg-[#1c0a48] border border-[#4c24b2]/60 p-3 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Tengo un Complejo</h3>
              <p className="text-sm text-indigo-200/80 mt-1">Promocioná tus canchas en el radar y recibí partidos.</p>
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                Te pasamos el contacto para activar el plan
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 3: Onboarding Jugador
// ==========================================
export const Screen3PlayerOnboarding = () => {
  const sesion = useSesion();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<'ARQ' | 'DEF' | 'MED' | 'DEL'>('DEL');

  const [apodo, setApodo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  // --- REGIONES, MUNICIPIOS Y LOCALIDADES (Jerarquía de Zona Sur) ---
  const [regionSeleccionada, setRegionSeleccionada] = useState("GBA Zona Sur");
  const municipiosDeRegion = Object.keys(DIVISION_GEOGRAFICA[regionSeleccionada] || {});

  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>("Lomas de Zamora");
  const localidadesDisponibles = (DIVISION_GEOGRAFICA[regionSeleccionada]?.[municipioSeleccionado]) || [];

  const [localidadQuery, setLocalidadQuery] = useState('');
  const [localidadElegida, setLocalidadElegida] = useState('Lomas de Zamora');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Precargar datos de la sesión del usuario (sea de Google o de Email)
  React.useEffect(() => {
    if (sesion.usuario) {
      if (!apodo) setApodo(sesion.usuario.nombre || sesion.user?.displayName?.split(' ')[0] || '');
      if (!telefono && sesion.usuario.telefono) setTelefono(sesion.usuario.telefono);
      if (!fechaNacimiento && sesion.usuario.fechaNacimiento) setFechaNacimiento(sesion.usuario.fechaNacimiento);
      if (sesion.usuario.zona) {
        setLocalidadElegida(sesion.usuario.zona);
        // Intentar inferir el municipio según la localidad precargada
        for (const [muni, locs] of Object.entries(DIVISION_GEOGRAFICA["GBA Zona Sur"] || {})) {
          if (locs.includes(sesion.usuario.zona)) {
            setMunicipioSeleccionado(muni);
            break;
          }
        }
      }
      if (sesion.usuario.perfilDeportivo?.posicion) {
        const p = sesion.usuario.perfilDeportivo.posicion;
        if (p === 'arquero') setPos('ARQ');
        else if (p === 'defensor') setPos('DEF');
        else if (p === 'medio') setPos('MED');
        else if (p === 'delantero') setPos('DEL');
      }
    } else if (sesion.user) {
      if (!apodo && sesion.user.displayName) setApodo(sesion.user.displayName.split(' ')[0] || '');
    }
  }, [sesion.usuario, sesion.user]);

  // Filtrado reactivo de localidades según el municipio activo y el texto ingresado
  const localidadesFiltradas = localidadesDisponibles.filter(loc => 
    loc.toLowerCase().includes(localidadQuery.toLowerCase())
  );

  const handleGenerarCarta = async () => {
    if (!sesion.user) {
      setError('Debes tener una sesión activa para continuar.');
      return;
    }
    if (!fechaNacimiento) {
      setError('Por favor completá tu fecha de nacimiento: así calculamos tu edad en la carta.');
      return;
    }
    if (!localidadElegida) {
      setError('Por favor seleccioná tu localidad o barrio para ubicarte en el radar.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const posMap: Record<'ARQ' | 'DEF' | 'MED' | 'DEL', { posicion: Posicion; playerRole: PlayerRole }> = {
        DEL: { posicion: 'delantero', playerRole: 'FWD' },
        MED: { posicion: 'medio', playerRole: 'MID' },
        DEF: { posicion: 'defensor', playerRole: 'DEF' },
        ARQ: { posicion: 'arquero', playerRole: 'GK' },
      };
      const rolData = posMap[pos];
      const perfilPrevio = sesion.usuario?.perfilDeportivo ?? PERFIL_DEPORTIVO_VACIO;
      const nuevoPerfil: PerfilDeportivo = {
        ...perfilPrevio,
        posicion: rolData.posicion,
        playerRole: rolData.playerRole,
        disponibleHoy: perfilPrevio.disponibleHoy ?? true,
        notificacionesRadar: perfilPrevio.notificacionesRadar ?? true,
      };

      const userRef = doc(db, 'usuarios', sesion.user.uid);
      const geoPrivado = calcularGeoZona(localidadElegida || municipioSeleccionado);

      await updateDoc(userRef, {
        nombre: apodo.trim() || sesion.usuario?.nombre || sesion.user.displayName?.split(' ')[0] || 'Jugador',
        fechaNacimiento,
        telefono: telefono.trim() || null,
        municipio: municipioSeleccionado,
        zona: localidadElegida,
        geo: geoPrivado,
        perfilDeportivo: nuevoPerfil,
        updatedAt: serverTimestamp(),
      });

      // Redirigir a la vista de perfil para ver la carta recién generada
      window.location.href = '/perfil';
    } catch (err: any) {
      console.error('Error al guardar carta:', err);
      setError('No pudimos guardar los datos de tu carta. Intentá nuevamente.');
      setCargando(false);
    }
  };

  const nombreMostrar = sesion.usuario ? nombreCompleto(sesion.usuario) : (sesion.user?.displayName || '');

  return (
    <div className="mx-auto h-full w-full max-w-md bg-transparent p-6 flex flex-col font-sans text-slate-800 pb-nav overflow-y-auto">
      <CargandoFulbeando visible={cargando} />
      <h2 className="text-2xl font-black mt-8 text-slate-900">Creá tu Carta de Jugador</h2>
      <p className="text-slate-500 text-sm mt-2 mb-6">
        {nombreMostrar ? `¡Hola ${nombreMostrar}! ` : ''}
        Completá tu ficha deportiva para jugar en el radar. Arrancás con Media 50%.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      <div className="space-y-6 flex-1">
        {/* APODO FUTBOLERO */}
        <div>
          <label htmlFor="onb-apodo" className="text-xs font-bold text-zinc-500 uppercase">Apodo Futbolero (En la Carta)</label>
          <input 
            id="onb-apodo"
            value={apodo} 
            onChange={e => setApodo(e.target.value)} 
            type="text" 
            placeholder="Ej: El Rústico, Lio, La Fiera" 
            className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-emerald-500 outline-none font-bold text-lg text-amber-500" 
          />
        </div>

        {/* FECHA DE NACIMIENTO */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="onb-fecha-nac" className="text-xs font-bold text-zinc-500 uppercase">Fecha de Nacimiento</label>
            <span className="text-[11px] text-zinc-400">Calcula tu edad en la ficha</span>
          </div>
          <input 
            id="onb-fecha-nac"
            value={fechaNacimiento} 
            onChange={e => setFechaNacimiento(e.target.value)} 
            type="date" 
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition font-bold" 
          />
        </div>

        {/* TELÉFONO */}
        <div>
          <label htmlFor="onb-telefono" className="text-xs font-bold text-zinc-500 uppercase">Número de Teléfono (WhatsApp / Opcional)</label>
          <input 
            id="onb-telefono"
            value={telefono} 
            onChange={e => setTelefono(e.target.value)} 
            type="tel" 
            placeholder="+54 11 1234-5678" 
            className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-emerald-500 outline-none font-bold text-lg" 
          />
        </div>
        
        {/* SELECTOR JERÁRQUICO: REGIÓN, MUNICIPIO Y LOCALIDAD */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-region" className="text-xs font-bold text-zinc-500 uppercase">Región</label>
              <select 
                id="onb-region"
                value={regionSeleccionada}
                onChange={(e) => { 
                  const nuevaRegion = e.target.value;
                  setRegionSeleccionada(nuevaRegion);
                  const munis = Object.keys(DIVISION_GEOGRAFICA[nuevaRegion] || {});
                  const primerMuni = munis[0] || '';
                  setMunicipioSeleccionado(primerMuni);
                  const primerLoc = DIVISION_GEOGRAFICA[nuevaRegion]?.[primerMuni]?.[0] || '';
                  setLocalidadElegida(primerLoc);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-white"
              >
                {Object.keys(DIVISION_GEOGRAFICA).map(reg => (
                  <option key={reg} value={reg} className="bg-zinc-900">{reg}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="onb-municipio" className="text-xs font-bold text-zinc-500 uppercase">Municipio / Partido</label>
              <select 
                id="onb-municipio"
                value={municipioSeleccionado}
                onChange={(e) => { 
                  const nuevoMuni = e.target.value;
                  setMunicipioSeleccionado(nuevoMuni);
                  const primerLoc = DIVISION_GEOGRAFICA[regionSeleccionada]?.[nuevoMuni]?.[0] || '';
                  setLocalidadElegida(primerLoc);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mt-1 focus:border-emerald-500 outline-none font-bold text-sm text-white"
              >
                {municipiosDeRegion.map(muni => (
                  <option key={muni} value={muni} className="bg-zinc-900">{muni}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Barrio / Localidad</label>
              <span className="text-[11px] text-emerald-400 font-semibold">{localidadesDisponibles.length} barrios en {municipioSeleccionado}</span>
            </div>
            <div 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm text-white cursor-pointer flex justify-between items-center hover:border-zinc-700 transition"
              onClick={() => { setMostrarBuscador(true); setLocalidadQuery(''); }}
            >
              <span>{localidadElegida || 'Seleccioná o buscá tu barrio...'}</span>
              <Search className="w-4 h-4 text-zinc-400" />
            </div>

            {/* Modal/Dropdown Buscador de Barrios */}
            {mostrarBuscador && (
              <div className="absolute top-16 left-0 w-full bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <input 
                  autoFocus
                  aria-label="Buscar barrio"
                  type="text" 
                  placeholder={`Buscar barrio en ${municipioSeleccionado}...`} 
                  value={localidadQuery}
                  onChange={(e) => setLocalidadQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 mb-3"
                />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {localidadesFiltradas.length > 0 ? (
                    localidadesFiltradas.map(loc => (
                      <div 
                        key={loc} 
                        onClick={() => { setLocalidadElegida(loc); setMostrarBuscador(false); }}
                        className={`py-2 px-3 text-sm rounded-xl cursor-pointer flex justify-between items-center transition ${localidadElegida === loc ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-zinc-300 hover:bg-zinc-800'}`}
                      >
                        <span>{loc}</span>
                        {localidadElegida === loc && <span className="text-xs">✓</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 p-4 text-center">No se encontraron barrios con ese nombre</div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setMostrarBuscador(false)} 
                  className="w-full mt-3 py-2 text-xs text-zinc-400 font-bold hover:text-white bg-zinc-800/80 rounded-xl transition"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* POSICIÓN EN LA CANCHA */}
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Posición en la Cancha</label>
          <div className="flex gap-2">
            {(['ARQ', 'DEF', 'MED', 'DEL'] as const).map(p => (
              <button 
                key={p} 
                type="button"
                onClick={() => setPos(p)} 
                className={`flex-1 py-3 rounded-xl font-black transition-all ${pos === p ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={handleGenerarCarta} 
        disabled={cargando}
        className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl mt-6 active:scale-95 transition disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      >
        {cargando ? 'CREANDO TU CARTA...' : 'GENERAR MI CARTA'}
      </button>
    </div>
  );
};

// ==========================================
// PANTALLA 4: Vista Carta (Welcome)
// ==========================================
export const Screen4WelcomeCard = () => {
  const navigate = useNavigate();
  const sesion = useSesion();
  const { datos, snapshot } = useDatosCarta(sesion.usuario);
  const cartaRef = React.useRef<HTMLDivElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  
  const { isInstallable, promptInstall } = useInstallPrompt();

  const mostrarAviso = (mensaje: string) => {
    setAviso(mensaje);
    setTimeout(() => setAviso(null), 3500);
  };

  // Comparte la carta por WhatsApp / hoja nativa. En movil adjunta la IMAGEN
  // generada; si el navegador no soporta compartir archivos (o falla la
  // generacion), cae a texto + link. En escritorio no hay share sheet: copia el
  // link y descarga el PNG para que el usuario lo adjunte a mano.
  const compartirCarta = async () => {
    const url = `${window.location.origin}/carta/${sesion.usuario?.uid ?? ''}`;
    const texto = `¡Mirá mi carta en Fulbeando! Entrá a ver mis estadísticas y armemos un equipo. ${url}`;
    const blob = cartaRef.current ? await generarImagenCarta(cartaRef.current) : null;
    const archivo = blob ? new File([blob], 'carta-fulbeando.png', { type: 'image/png' }) : null;
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

    if (nav.share && archivo && nav.canShare?.({ files: [archivo] })) {
      try {
        await nav.share({ title: 'Mi carta en Fulbeando', text: texto, files: [archivo] });
        return;
      } catch (err) {
        console.error('Error compartiendo la imagen:', err);
      }
    }
    if (nav.share) {
      try {
        await nav.share({ title: 'Mi carta en Fulbeando', text: texto, url });
        return;
      } catch (err) {
        console.error('Error compartiendo:', err);
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch { /* clipboard bloqueado: igual descargamos la imagen */ }
    if (blob) descargarBlob(blob, 'carta-fulbeando.png');
    mostrarAviso('Link copiado y carta descargada');
  };

  const publicarEnComunidad = async () => {
    const u = sesion.usuario;
    if (!u || publicando) return;
    setPublicando(true);
    try {
      await crearPublicacion({
        autorUid: u.uid,
        autorNombre: nombreCompleto(u) || u.nombre,
        autorApodo: u.nombre,
        autorFotoUrl: u.fotoUrl,
        autorZona: u.zona ?? null,
        autorMunicipio: u.municipio ?? null,
        tipo: 'carta',
        texto: null,
        media: [],
        tarjeta: snapshot,
      });
      mostrarAviso('¡Tu carta se publicó en la comunidad!');
    } catch (err) {
      console.error('Error publicando la carta:', err);
      mostrarAviso('No se pudo publicar. Probá de nuevo.');
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent font-sans text-slate-800 overflow-hidden relative">
      <Toast mensaje={aviso} />
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28 flex flex-col items-center">
        
        <div className="absolute top-6 right-6 flex gap-2 z-10">
          {/* Botón de instalar app en celular (desactivado momentáneamente)
          {isInstallable && (
            <motion.button 
              onClick={() => {
                promptInstall();
                if(sesion.usuario) requestNotificationPermission(sesion.usuario.uid).catch(e => console.log('Auto-prompt blocked on install', e));
              }} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="flex items-center gap-1 bg-emerald-500 text-zinc-950 px-3 py-2 rounded-full font-bold text-xs cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Instalar
            </motion.button>
          )} */}
          <motion.button 
            onClick={() => navigate('/ajustes')} 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="text-slate-600 hover:text-slate-900 bg-white/80 border border-slate-200 p-2 rounded-full shadow-sm cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="flex-1 flex flex-col items-center justify-center w-full min-h-min mt-8"
        >
          <TarjetaJugador ref={cartaRef} datos={datos} />
          {(() => {
            const tema = obtenerTemaSegunMedia(datos.media);
            return (
              <div className="mt-3 flex items-center gap-2 text-xs font-black text-slate-800 bg-white/90 border border-slate-300 px-3.5 py-1.5 rounded-full shadow-sm">
                <span 
                  className="w-2.5 h-2.5 rounded-full animate-pulse border border-slate-400/40" 
                  style={{ 
                    backgroundColor: 
                      tema.tier === 'bronce' ? '#b45309' : 
                      tema.tier === 'plata' ? '#64748b' : 
                      tema.tier === 'oro' ? '#eab308' : 
                      tema.tier === 'especial' ? '#a855f7' : '#0284c7' 
                  }}
                ></span>
                <span>Ficha {tema.nombreTier} · Media {datos.media}</span>
              </div>
            );
          })()}
        </motion.div>

        <div className="w-full max-w-sm mt-8 space-y-3 shrink-0">
          <motion.button
            onClick={compartirCarta}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-zinc-300 font-semibold py-3 rounded-xl cursor-pointer shadow-sm hover:border-zinc-700 hover:text-white"
          >
            <Share2 className="w-4 h-4" /> Compartir mi carta
          </motion.button>
          <motion.button
            onClick={publicarEnComunidad}
            disabled={publicando}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-60 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {publicando ? 'Publicando...' : 'Publicar en la comunidad'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
// ==========================================
// PANTALLA 5: Tus Reservas / Turnos
// ==========================================
const formatearFechaArg = (fechaISO: string): string => {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length === 3) {
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
  }
  return fechaISO;
};

export const Screen5Reservas = () => {
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [prediosNombres, setPrediosNombres] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  // Compartir con el equipo
  const [turnoCompartir, setTurnoCompartir] = useState<Turno | null>(null);
  const [equiposCapitan, setEquiposCapitan] = useState<any[]>([]);
  const [equipoSelId, setEquipoSelId] = useState<string>('');
  const [publicandoConvocatoria, setPublicandoConvocatoria] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [toastCompartir, setToastCompartir] = useState<string | null>(null);

  const avisoCompartir = (msg: string) => {
    setToastCompartir(msg);
    setTimeout(() => setToastCompartir(null), 3500);
  };

  const cargarReservas = React.useCallback(async () => {
    if (!usuario?.uid) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const hoy = aFechaISO();
      const res = await listarTurnosDelOrganizador(usuario.uid, hoy);
      setTurnos(res);

      const ids = [...new Set(res.map((t) => t.predioId))];
      const mapa: Record<string, string> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await obtenerPredio(id);
            if (p?.nombre) mapa[id] = p.nombre;
          } catch (e) {
            console.error('Error al obtener predio:', id, e);
          }
        })
      );
      setPrediosNombres(mapa);
    } catch (err) {
      console.error('Error al cargar turnos del organizador:', err);
    } finally {
      setCargando(false);
    }
  }, [usuario?.uid]);

  React.useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const handleAbrirCompartir = async (t: Turno) => {
    setTurnoCompartir(t);
    setCopiado(false);
    if (usuario?.uid) {
      try {
        const teams = await obtenerEquiposDeUsuario(usuario.uid);
        const dondeEsCapitan = teams.filter((eq) => eq.captainId === usuario.uid);
        const disponibles = dondeEsCapitan.length > 0 ? dondeEsCapitan : teams;
        setEquiposCapitan(disponibles);
        if (disponibles.length > 0 && disponibles[0]) {
          setEquipoSelId(disponibles[0].id);
        }
      } catch (err) {
        console.error('Error al cargar equipos:', err);
      }
    }
  };

  const armarTextoPartido = (t: Turno) => {
    const pNombre = prediosNombres[t.predioId] || 'Complejo Deportivo';
    const saldo = t.precioTotal - t.montoSena;
    return `⚽ *¡PARTIDO CONFIRMADO EN FULBEANDO!* ⚽\n\n` +
      `📍 *Predio:* ${pNombre}\n` +
      `📅 *Fecha:* ${formatearFechaArg(t.fecha)}\n` +
      `⏰ *Horario:* ${t.horaInicio} - ${t.horaFin} hs\n` +
      `💵 *Seña abonada:* $${t.montoSena.toLocaleString()}\n` +
      `💰 *A pagar en cancha:* $${saldo.toLocaleString()} (Total: $${t.precioTotal.toLocaleString()})\n\n` +
      `¡Entren a la app para confirmar asistencia y armar la táctica!`;
  };

  const handleCompartirWhatsApp = () => {
    if (!turnoCompartir) return;
    const txt = armarTextoPartido(turnoCompartir);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`;
    if (navigator.share) {
      navigator.share({
        title: '¡Partido Confirmado!',
        text: txt,
      }).catch(() => {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCopiarTexto = async () => {
    if (!turnoCompartir) return;
    const txt = armarTextoPartido(turnoCompartir);
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
      avisoCompartir('¡Datos del partido copiados al portapapeles!');
    } catch {
      avisoCompartir('No se pudo copiar');
    }
  };

  const handlePublicarConvocatoria = async () => {
    if (!turnoCompartir || !usuario?.uid || !equipoSelId) return;
    setPublicandoConvocatoria(true);
    try {
      const pNombre = prediosNombres[turnoCompartir.predioId] || 'Complejo Deportivo';
      const fechaTexto = `${formatearFechaArg(turnoCompartir.fecha)} ${turnoCompartir.horaInicio}hs (${pNombre})`;
      await actualizarConvocatoriaEquipo(equipoSelId, {
        fecha: fechaTexto,
        predioNombre: pNombre,
        turnoId: turnoCompartir.id,
        confirmados: [usuario.uid],
        bajas: [],
      });
      const eq = equiposCapitan.find((e) => e.id === equipoSelId);
      avisoCompartir(`¡Convocatoria publicada en ${eq?.name || 'tu equipo'}!`);
      setTimeout(() => setTurnoCompartir(null), 1200);
    } catch (err: any) {
      console.error('Error al publicar convocatoria:', err);
      avisoCompartir(err?.message || 'Error al publicar convocatoria');
    } finally {
      setPublicandoConvocatoria(false);
    }
  };

  const equipoSeleccionadoObj = equiposCapitan.find((e) => e.id === equipoSelId);

  return (
    <div className="h-full bg-transparent flex flex-col font-sans text-slate-800 overflow-hidden relative">
      {/* Toast notificador */}
      <Toast mensaje={toastCompartir} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-28">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Tus Reservas</h2>
              <p className="text-slate-500 text-xs mt-1">Partidos y turnos programados en complejos.</p>
            </div>
            <motion.button
              onClick={cargarReservas}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="text-xs bg-white border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
            >
              Actualizar
            </motion.button>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 text-emerald-500 font-bold text-sm">
              <span className="h-8 w-8 animate-radar-pulse rounded-full bg-emerald-500 mb-3" />
              Cargando tus reservas...
            </div>
          ) : turnos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
              <Calendar className="w-14 h-14 text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-zinc-200 mb-2">No tenés reservas activas</h3>
              <p className="text-zinc-400 text-sm max-w-sm mb-6">
                Cuando reserves un turno y cargues la seña en un predio, vas a poder seguir el estado de confirmación acá.
              </p>
              <motion.button
                onClick={() => navigate('/radar')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="bg-emerald-500 text-zinc-950 font-black px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition cursor-pointer"
              >
                Buscar Cancha en el Radar
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              {turnos.map((t) => {
                const esConfirmado = t.estado === 'confirmado';
                const esPendiente = t.estado === 'bloqueado_temporal';

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                    whileHover={{ y: -2 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition shadow-sm hover:shadow-md space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">
                            {formatearFechaArg(t.fecha)}
                          </span>
                          <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {t.horaInicio} - {t.horaFin} hs
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Predio: <span className="text-zinc-200 font-semibold">{prediosNombres[t.predioId] || t.predioId}</span>
                        </p>
                      </div>

                      <span
                        className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                          esConfirmado
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : esPendiente
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {esConfirmado
                          ? 'Confirmado'
                          : esPendiente
                          ? 'Esperando validación'
                          : t.estado}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                      <span>
                        Seña: <strong className="text-white">${t.montoSena.toLocaleString()}</strong>
                      </span>
                      <span>
                        Total: <strong className="text-zinc-300">${t.precioTotal.toLocaleString()}</strong>
                      </span>
                    </div>

                    {/* Botón Compartir con el equipo para reservas confirmadas */}
                    {esConfirmado && (
                      <div className="pt-2 border-t border-zinc-800">
                        <motion.button
                          onClick={() => handleAbrirCompartir(t)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          Compartir con el equipo
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Compartir Reserva con el Equipo */}
      {turnoCompartir && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div role="dialog" aria-modal="true" aria-label="Compartir reserva con el equipo" className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
            <button
              onClick={() => setTurnoCompartir(null)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 text-zinc-500 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase mb-1">
              <Share2 className="w-4 h-4" />
              Compartir con el equipo
            </div>
            <h3 className="text-xl font-black text-white mb-2">Partido Confirmado</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Compartí los datos de la reserva con tu plantel o abriles la convocatoria en la app.
            </p>

            {/* Tarjeta resumen de la reserva */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Predio</span>
                <span className="text-sm font-bold text-white">
                  {prediosNombres[turnoCompartir.predioId] || turnoCompartir.predioId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Fecha</span>
                <span className="text-sm font-bold text-white">
                  {formatearFechaArg(turnoCompartir.fecha)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Horario</span>
                <span className="text-sm font-bold text-emerald-400">
                  {turnoCompartir.horaInicio} - {turnoCompartir.horaFin} hs
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">Resta pagar en cancha</span>
                <span className="text-sm font-black text-zinc-200">
                  ${(turnoCompartir.precioTotal - turnoCompartir.montoSena).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Opción 1: Abrir Convocatoria en la app */}
            {equiposCapitan.length > 0 && (
              <div className="mb-4 p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl">
                <label className="text-[11px] font-black uppercase text-amber-500 block mb-2">
                  Publicar en la pantalla de equipo
                </label>
                {equiposCapitan.length > 1 && (
                  <select
                    aria-label="Equipo donde publicar la convocatoria"
                    value={equipoSelId}
                    onChange={(e) => setEquipoSelId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-xs font-bold mb-3 outline-none"
                  >
                    {equiposCapitan.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handlePublicarConvocatoria}
                  disabled={publicandoConvocatoria}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-3 px-4 rounded-xl text-xs transition active:scale-95 disabled:opacity-60 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  {publicandoConvocatoria ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Abrir convocatoria en {equipoSeleccionadoObj?.name || 'mi equipo'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Opción 2: Compartir por WhatsApp o Copiar */}
            <div className="space-y-2">
              <button
                onClick={handleCompartirWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl text-sm transition active:scale-95 shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar a WhatsApp del Equipo
              </button>

              <button
                onClick={handleCopiarTexto}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-4 rounded-xl text-xs transition active:scale-95"
              >
                {copiado ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    ¡Copiado al portapapeles!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar detalles del partido
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PANTALLA 6: Partidos y Desafíos
// ==========================================
export const Screen6LaunchChallenge = () => {
  const navigate = useNavigate();
  const sesion = useSesion();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Ninguna información pre-establecida: el usuario debe seleccionar cada campo explícitamente
  const [modalidad, setModalidad] = useState<string>('');
  const [diaHora, setDiaHora] = useState('');
  const [estadoCancha, setEstadoCancha] = useState<'CON_CANCHA' | 'BUSCA_CANCHA' | ''>('');
  
  const [misEquipos, setMisEquipos] = useState<any[]>([]);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState<string>('');
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const limpiarFormulario = () => {
    setModalidad('');
    setDiaHora('');
    setEstadoCancha('');
  };

  // 1. Cargar equipos del usuario
  useEffect(() => {
    if (!sesion.user?.uid) return;
    setCargandoEquipos(true);
    obtenerEquiposDeUsuario(sesion.user.uid)
      .then((eqs) => {
        setMisEquipos(eqs);
        if (eqs.length > 0) {
          const cap = eqs.find((e: any) => e.captainId === sesion.user?.uid) || eqs[0];
          setEquipoSeleccionadoId(cap.id);
        }
      })
      .catch((err) => console.warn('Error cargando equipos en Screen6LaunchChallenge:', err))
      .finally(() => setCargandoEquipos(false));
  }, [sesion.user?.uid]);

  // 2. Escuchar en tiempo real los desafíos creados por el usuario en Firestore
  useEffect(() => {
    if (!sesion.user?.uid) {
      setPartidos([]);
      return;
    }
    const q = query(
      collection(db, COLECCIONES.desafios),
      where('creatorId', '==', sesion.user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ ...(d.data() as any), id: d.id }))
          .filter((d) => d.estado !== 'CANCELADO')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPartidos(items);
      },
      (err) => {
        console.warn('Error escuchando desafíos del usuario:', err);
      }
    );
    return () => unsub();
  }, [sesion.user?.uid]);

  // 3. Publicar desafío en Firestore (/challenges) para que figure inmediatamente en el Radar
  const handlePublicar = async () => {
    if (!modalidad) {
      setToastMessage('Por favor seleccioná la modalidad (F5, F7, F8 o F11)');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    if (!diaHora) {
      setToastMessage('Por favor seleccioná día y hora tentativa para el partido');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    if (!estadoCancha) {
      setToastMessage('Por favor indicá si ya tienen cancha o buscan a medias');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    if (!sesion.user?.uid) return;

    if (misEquipos.length === 0) {
      setToastMessage('Necesitás tener un equipo para lanzar un desafío al radar.');
      setTimeout(() => setToastMessage(''), 3500);
      return;
    }

    const eq = misEquipos.find((e) => e.id === equipoSeleccionadoId) || misEquipos[0];
    setPublicando(true);

    try {
      const dateObj = new Date(diaHora);
      const fechaUnix = !isNaN(dateObj.getTime()) ? dateObj.getTime() : Date.now() + 24 * 3600 * 1000;

      // Calcular ubicación geográfica para el geohash del Radar:
      let geoPunto = sesion.usuario?.geo ? { lat: sesion.usuario.geo.lat, lng: sesion.usuario.geo.lng } : null;
      if (!geoPunto && eq?.geo?.lat && eq?.geo?.lng) {
        geoPunto = { lat: eq.geo.lat, lng: eq.geo.lng };
      }
      if (!geoPunto) {
        const guardada = typeof window !== 'undefined' ? localStorage.getItem('al_angulo_ultima_ubicacion') : null;
        if (guardada) {
          try {
            const p = JSON.parse(guardada);
            if (p.lat && p.lng) geoPunto = p;
          } catch (e) {}
        }
      }
      if (!geoPunto) {
        geoPunto = { lat: -34.6037, lng: -58.3816 };
      }

      const geoIndex = aGeoIndex(geoPunto);
      const desafioRef = doc(collection(db, COLECCIONES.desafios));

      const nuevoDesafio = {
        id: desafioRef.id,
        creatorId: sesion.user.uid,
        equipoId: eq.id,
        equipoNombre: eq.name || eq.nombre || 'Mi Equipo',
        equipoEscudoUrl: eq.shieldUrl || eq.escudoUrl || null,
        modalidad: modalidad as any,
        estadoCancha,
        estado: 'ABIERTO',
        tipoDesafio: 'partido_equipo',
        turnoId: null,
        predioId: null,
        posicionBuscada: null,
        fechaUnix,
        descripcion: `Desafío abierto ${modalidad}: ${estadoCancha === 'CON_CANCHA' ? 'Cancha reservada' : 'Buscamos cancha a medias'}`,
        geo: geoIndex,
        equiposAceptantes: [],
        createdAt: Date.now(),
      };

      await setDoc(desafioRef, nuevoDesafio);

      setMostrarFormulario(false);
      limpiarFormulario();
      setToastMessage('¡Desafío publicado en el Radar con éxito! ⚽');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err: any) {
      console.error('Error publicando desafío en Firestore:', err);
      setToastMessage(err?.message || 'Error al publicar desafío');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setPublicando(false);
    }
  };

  // 4. Cancelar desafío y darlo de baja del Radar
  const handleCancelarDesafio = async (id: string) => {
    setCancelandoId(id);
    try {
      await updateDoc(doc(db, COLECCIONES.desafios, id), {
        estado: 'CANCELADO',
        updatedAt: Date.now(),
      });
      setToastMessage('Desafío cancelado y quitado del Radar');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err: any) {
      console.error('Error cancelando desafío:', err);
      setToastMessage('No se pudo cancelar el desafío');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setCancelandoId(null);
    }
  };

  const formatearFechaHora = (item: any) => {
    if (item.fechaUnix) {
      const d = new Date(item.fechaUnix);
      return d.toLocaleString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return item.diaHora || 'A convenir';
  };

  return (
    <div className="h-full flex flex-col bg-transparent font-sans text-slate-800 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
        <Toast mensaje={toastMessage} />

      {!mostrarFormulario ? (
        <>
          {/* Header con pr-14 para no pisarse con el boton Cerrar (X) de la modal */}
          <div className="flex justify-between items-center mb-6 mt-1 pr-14">
            <div>
              <h2 className="text-2xl font-black text-amber-500">Mis Desafíos Abiertos</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Partidos publicados en el mapa para cualquier rival</p>
            </div>
            <motion.button 
              onClick={() => setMostrarFormulario(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              + Lanzar Desafío
            </motion.button>
          </div>

          <div className="space-y-4">
            {partidos.length === 0 && (
              <div className="text-center py-12 px-6 text-zinc-400 border border-zinc-800/80 rounded-2xl border-dashed bg-zinc-900/40">
                <div className="text-3xl mb-3">🛡️</div>
                <p className="font-bold text-white text-base mb-1">Aún no tenés desafíos activos en el Radar</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-4">
                  Tocá en "+ Lanzar Desafío" para publicar un partido en el mapa y que otros equipos te desafíen.
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(true)}
                  className="bg-amber-500 text-zinc-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:bg-amber-400 transition"
                >
                  Lanzar Primer Desafío
                </button>
              </div>
            )}
            {partidos.map((p) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                whileHover={{ y: -2 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition text-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-black">{p.modalidad}</span>
                    <h3 className="font-bold text-sm">{p.equipoNombre || 'Mi Equipo'}</h3>
                  </div>
                  <span className={`text-[11px] font-black uppercase px-2 py-1 rounded-full ${
                    p.estado === 'ABIERTO' || p.estado === 'En Radar'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {p.estado === 'ABIERTO' ? 'Visible en Radar 📡' : p.estado}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 font-bold mt-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{formatearFechaHora(p)}</span>
                </p>
                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-800/80">
                  <p className="text-xs text-zinc-400">
                    {p.estadoCancha === 'CON_CANCHA' ? '✅ Con cancha alquilada' : '⚽ Buscan cancha a medias'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelarDesafio(p.id)}
                      disabled={cancelandoId === p.id}
                      className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      {cancelandoId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      <span>Quitar del Radar</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => navigate('/radar')}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Ver en Radar →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setMostrarFormulario(false)} className="text-zinc-500 text-sm font-bold mb-6 cursor-pointer hover:text-white transition">← Volver</button>
          <h2 className="text-2xl font-black text-amber-500 mb-1">Lanzar Desafío al Radar</h2>
          <p className="text-xs text-zinc-400 mb-6">Tu partido aparecerá en el mapa para que cualquier equipo de la zona pueda desafiarte.</p>

          <div className="space-y-5">
            {/* Selector de equipo */}
            {misEquipos.length > 1 && (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1.5">Equipo que lanza el desafío</label>
                <select
                  value={equipoSeleccionadoId}
                  onChange={(e) => setEquipoSeleccionadoId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 text-xs font-bold"
                >
                  {misEquipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name || eq.nombre} {eq.captainId === sesion.user?.uid ? '👑' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {misEquipos.length === 0 && !cargandoEquipos && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold">
                ⚠️ No integrás ningún equipo todavía. Creá un equipo primero en "Mi Equipo" para poder lanzar un desafío al radar.
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase flex items-center justify-between">
                <span>Modalidad</span>
                {!modalidad && <span className="text-[10px] text-amber-400 font-normal">Obligatorio</span>}
              </label>
              <div className="flex gap-2 mt-2">
                {['F5', 'F7', 'F8', 'F11'].map((m) => (
                  <motion.button 
                    key={m} 
                    type="button"
                    onClick={() => setModalidad(m)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`flex-1 py-3 rounded-xl font-black transition-colors cursor-pointer text-xs ${
                      m === modalidad 
                        ? 'bg-amber-500 text-zinc-950 shadow-md ring-2 ring-amber-400' 
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="desafio-diahora" className="text-xs font-bold text-zinc-400 uppercase flex items-center justify-between">
                <span>Día y Hora aproximada</span>
                {!diaHora && <span className="text-[10px] text-amber-400 font-normal">Obligatorio</span>}
              </label>
              <input 
                id="desafio-diahora"
                type="datetime-local" 
                value={diaHora}
                onChange={(e) => setDiaHora(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mt-2 text-white outline-none focus:border-amber-500/50 text-xs font-bold" 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase flex items-center justify-between mb-2">
                <span>¿Tienen Cancha?</span>
                {!estadoCancha && <span className="text-[10px] text-amber-400 font-normal">Obligatorio</span>}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEstadoCancha('BUSCA_CANCHA')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    estadoCancha === 'BUSCA_CANCHA'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span className="font-black text-xs text-white flex items-center gap-1.5">
                    ⚽ No, buscamos a medias
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Coordinamos y alquilamos entre ambos equipos
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstadoCancha('CON_CANCHA')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    estadoCancha === 'CON_CANCHA'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span className="font-black text-xs text-white flex items-center gap-1.5">
                    ✅ Sí, ya la alquilamos
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Tenemos predio y horario confirmado
                  </span>
                </button>
              </div>
            </div>
          </div>

          <motion.button 
            onClick={handlePublicar}
            disabled={!modalidad || !diaHora || !estadoCancha || publicando || misEquipos.length === 0}
            whileHover={modalidad && diaHora && estadoCancha && !publicando ? { scale: 1.02 } : {}}
            whileTap={modalidad && diaHora && estadoCancha && !publicando ? { scale: 0.96 } : {}}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`w-full font-black py-4 rounded-xl mt-8 transition-all flex items-center justify-center gap-2 ${
              modalidad && diaHora && estadoCancha && !publicando && misEquipos.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {publicando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>PUBLICANDO EN EL RADAR...</span>
              </>
            ) : !modalidad ? (
              <span>1. SELECCIONÁ MODALIDAD</span>
            ) : !diaHora ? (
              <span>2. ELEGÍ DÍA Y HORA</span>
            ) : !estadoCancha ? (
              <span>3. INDICÁ SI TIENEN CANCHA</span>
            ) : (
              <span>PUBLICAR EN RADAR</span>
            )}
          </motion.button>
        </>
      )}
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 7: Pestaña Mi Equipo
// ==========================================
export const Screen7MyTeam = () => {
  const navigate = useNavigate();
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [eliminandoEquipo, setEliminandoEquipo] = useState(false);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [mostrarModalConvocatoria, setMostrarModalConvocatoria] = useState(false);
  const [mostrarModalEstadisticas, setMostrarModalEstadisticas] = useState(false);
  const [statsPartido, setStatsPartido] = useState<Record<string, { goles: number, asistencias: number }>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [ausentesIds, setAusentesIds] = useState<string[]>([]);
  const [estrellasPredio, setEstrellasPredio] = useState<number>(0);
  const [fairPlayRival, setFairPlayRival] = useState<'BUEN_RIVAL' | 'CONFLICTIVO' | null>(null);
  const [convFecha, setConvFecha] = useState('Jueves 21:00hs');
  const [inviteUsername, setInviteUsername] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [subPestanaPlantel, setSubPestanaPlantel] = useState<'confirmados' | 'todos'>('confirmados');
  const [etapaPartido, setEtapaPartido] = useState<'convocatoria' | 'post_partido'>('convocatoria');

  // Busqueda de jugadores REAL (Firestore). Antes había un `mockUsuarios`
  // inventado: "Enviar Notificación" no escribía nada en ninguna parte.
  const [usuariosBuscados, setUsuariosBuscados] = useState<
    Array<{ uid: string; username: string; apodo: string; emoji: string }>
  >([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<
    { uid: string; username: string; apodo: string; emoji: string } | null
  >(null);
  const [buscando, setBuscando] = useState(false);
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false);
  const busquedaRef = React.useRef(0);

  // Modal de configuración: se cargan del equipo activo al abrirlo.
  const [formato, setFormato] = useState('F5');
  const [genero, setGenero] = useState('Masculino');
  const [escudoSel, setEscudoSel] = useState('🛡️');

  // Alta de equipo (máx. MAX_EQUIPOS_POR_JUGADOR por jugador).
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoFormato, setNuevoFormato] = useState('F5');
  const [nuevoGenero, setNuevoGenero] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Masculino');

  // Modal Al Radar (Faltan jugadores para completar)
  const [mostrarModalRadar, setMostrarModalRadar] = useState(false);
  const [jugadoresFaltantes, setJugadoresFaltantes] = useState(2);
  const [posicionRadar, setPosicionRadar] = useState<string>('Cualquiera');
  const [enviandoAlRadar, setEnviandoAlRadar] = useState(false);

  const sesion = useSesion();
  // La identidad es el `uid`: comparar por parte del email no matchea contra
  // `members[].uid` ni contra `members[].name`.
  const currentUid = sesion.user?.uid ?? null;

  // Invitación por link: /equipo?unirse=<teamId>
  const [params] = useSearchParams();
  const equipoInvitadoId = params.get('unirse');
  const [equipoInvitado, setEquipoInvitado] = useState<{ id: string; nombre: string } | null>(null);
  const [uniendose, setUniendose] = useState(false);

  const [equipos, setEquipos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const confirmar = useConfirmar();

  const aviso = (mensaje: string) => {
    setToastMessage(mensaje);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const mapearEquipo = React.useCallback(
    (t: any) => ({
      id: t.id,
      nombre: t.name,
      capitan: t.captainId,
      // `captainId` es un uid: para mostrarlo hace falta el nombre del miembro.
      capitanNombre: t.members.find((m: any) => m.uid === t.captainId)?.name ?? 'Sin capitán',
      formato: t.modalidadBase || 'F5',
      genero: t.genero || 'Masculino',
      w: t.stats?.wins || 0,
      d: t.stats?.draws || 0,
      l: t.stats?.losses || 0,
      emoji: t.shieldUrl || '🛡️',
      isCapitan: t.captainId === sesion.user?.uid,
      soyMiembro: t.members.some((m: any) => m.uid === sesion.user?.uid && !m.esTemporal),
      esRefuerzoTemporal: Boolean(
        t.convocatoria?.confirmados?.includes(sesion.user?.uid) &&
          (t.convocatoria?.refuerzos?.some((r: any) => r.uid === sesion.user?.uid) ||
            t.members.some((m: any) => m.uid === sesion.user?.uid && m.esTemporal)),
      ),
      ultimoPartido: t.ultimoPartido || null,
      estadisticasJugadores: t.estadisticasJugadores || {},
      plantel: t.members
        .filter((m: any) => !m.esTemporal)
        .map((m: any) => {
          const st = (t.estadisticasJugadores && t.estadisticasJugadores[m.uid]) || {
            goles: 0,
            asistencias: 0,
            partidosJugados: 0,
            mvpCount: 0,
          };
          const med = calcularMediaJugador({
            partidosJugados: st.partidosJugados,
            goles: st.goles,
            asistencias: st.asistencias,
            mvpCount: st.mvpCount,
            posicion: m.position || 'DEL',
          });
          return {
            id: m.uid,
            username: m.name,
            apodo: m.name,
            emoji: m.uid === t.captainId ? '👑' : '🏃‍♂️',
            isCapitan: m.uid === t.captainId,
            esTemporal: false,
            stats: st,
            media: med,
          };
        }),
      confirmadosDelPartido: (() => {
        const confIds: string[] = Array.isArray(t.convocatoria?.confirmados)
          ? t.convocatoria.confirmados
          : [];
        const miembrosConf = t.members
          .filter((m: any) => !m.esTemporal && confIds.includes(m.uid))
          .map((m: any) => {
            const st = (t.estadisticasJugadores && t.estadisticasJugadores[m.uid]) || {
              goles: 0,
              asistencias: 0,
              partidosJugados: 0,
              mvpCount: 0,
            };
            const med = calcularMediaJugador({
              partidosJugados: st.partidosJugados,
              goles: st.goles,
              asistencias: st.asistencias,
              mvpCount: st.mvpCount,
              posicion: m.position || 'DEL',
            });
            return {
              id: m.uid,
              username: m.name,
              apodo: m.name,
              emoji: m.uid === t.captainId ? '👑' : '🏃‍♂️',
              isCapitan: m.uid === t.captainId,
              esTemporal: false,
              stats: st,
              media: med,
            };
          });
        const refuerzosConf = (Array.isArray(t.convocatoria?.refuerzos) ? t.convocatoria.refuerzos : [])
          .filter((r: any) => confIds.includes(r.uid))
          .map((r: any) => {
            const st = (t.estadisticasJugadores && t.estadisticasJugadores[r.uid]) || {
              goles: 0,
              asistencias: 0,
              partidosJugados: 0,
              mvpCount: 0,
            };
            const med = calcularMediaJugador({
              partidosJugados: st.partidosJugados,
              goles: st.goles,
              asistencias: st.asistencias,
              mvpCount: st.mvpCount,
              posicion: 'DEL',
            });
            return {
              id: r.uid,
              username: r.nombre || r.name || 'Refuerzo',
              apodo: r.nombre || r.name || 'Refuerzo',
              emoji: '⚡',
              isCapitan: false,
              esTemporal: true,
              stats: st,
              media: med,
            };
          });
        return [...miembrosConf, ...refuerzosConf];
      })(),
      reputation: t.reputation || null,
      convocatoria: t.convocatoria
        ? {
            ...t.convocatoria,
            confirmados: Array.isArray(t.convocatoria.confirmados) ? t.convocatoria.confirmados : [],
            bajas: Array.isArray(t.convocatoria.bajas) ? t.convocatoria.bajas : [],
          }
        : null,
    }),
    [sesion.user?.uid],
  );

  /** Escucha en tiempo real "mis equipos" y las convocatorias/cambios del plantel. */
  React.useEffect(() => {
    if (!sesion.user) {
      setEquipos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    const unsubscribe = escucharEquiposDeUsuario(sesion.user.uid, (dbTeams) => {
      setEquipos(dbTeams.map(mapearEquipo));
      setCargando(false);
    });
    return () => unsubscribe();
  }, [sesion.user?.uid, mapearEquipo]);

  const recargarEquipos = React.useCallback(async (): Promise<number> => {
    if (!sesion.user) return 0;
    const dbTeams = await obtenerEquiposDeUsuario(sesion.user.uid);
    setEquipos(dbTeams.map(mapearEquipo));
    return dbTeams.length;
  }, [sesion.user, mapearEquipo]);

  // Banner de invitación: una sola lectura, y solo cuando se abre un link.
  React.useEffect(() => {
    if (!equipoInvitadoId || !sesion.user) {
      setEquipoInvitado(null);
      return;
    }
    let vivo = true;
    obtenerEquipoPorId(equipoInvitadoId)
      .then((t) => { if (vivo) setEquipoInvitado(t ? { id: t.id, nombre: t.name } : null); })
      .catch(() => { if (vivo) setEquipoInvitado(null); });
    return () => { vivo = false; };
  }, [equipoInvitadoId, sesion.user]);

  const equipo = equipos[equipoActivo];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !equipo) return;

    try {
      setToastMessage('Subiendo imagen...');
      const optimizedBlob = await optimizeAvatarImage(file, { maxSize: 300, quality: 0.8 });
      // `teams/{teamId}` y no `teams`: storage.rules exige ser el capitan del
      // equipo que se nombra en el path.
      const result = await uploadImageToR2(optimizedBlob, file.name, `teams/${equipo.id}`, () => {});
      await handleUpdateEmoji(result.publicUrl);
    } catch (err) {
       console.error(err);
       setToastMessage('Error al subir la imagen');
       setTimeout(() => setToastMessage(''), 3000);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  /** Escribe `shieldUrl` en `teams/{id}`: solo el capitan pasa la regla. */
  const handleUpdateEmoji = async (newEmoji: string) => {
    if (!equipo || !sesion.user) return;
    try {
      await actualizarEquipo(equipo.id, sesion.user.uid, { shieldUrl: newEmoji });
      setEquipos((prev) => prev.map((eq, i) => (i === equipoActivo ? { ...eq, emoji: newEmoji } : eq)));
      aviso('Escudo actualizado');
    } catch (err) {
      console.error(err);
      aviso('No se pudo actualizar el escudo (¿sos el capitán?)');
    }
  };

  /** Abre la configuración con los datos ACTUALES del equipo. */
  const abrirConfig = () => {
    if (!equipo) return;
    setFormato(equipo.formato);
    setGenero(equipo.genero);
    setEscudoSel(equipo.emoji);
    setMostrarConfig(true);
  };

  /** Un solo write: formato, categoría y escudo se guardan juntos. */
  const handleGuardarConfig = async () => {
    if (!equipo || !sesion.user) {
      setMostrarConfig(false);
      return;
    }
    try {
      await actualizarEquipo(equipo.id, sesion.user.uid, {
        modalidadBase: formato,
        genero: genero as 'Masculino' | 'Femenino' | 'Mixto',
        shieldUrl: escudoSel,
      });
      await recargarEquipos();
      setMostrarConfig(false);
      aviso('Equipo actualizado');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    }
  };

  /** Disolver o eliminar equipo por parte del capitán */
  const handleEliminarEquipo = async () => {
    if (!equipo || !sesion.user) return;
    if (!equipo.isCapitan) {
      aviso('Solo el capitán puede eliminar este equipo');
      return;
    }
    const confirmado = await confirmar(
      `¿Estás seguro de que querés eliminar y disolver "${equipo.nombre}"? Se liberará a todos los integrantes del plantel y esta acción no se puede deshacer.`,
      {
        titulo: 'Eliminar equipo',
        textoConfirmar: 'Eliminar definitivamente',
        peligro: true,
      },
    );
    if (!confirmado) return;

    setEliminandoEquipo(true);
    try {
      await eliminarEquipo(equipo.id, sesion.user.uid);
      setMostrarConfig(false);
      const total = await recargarEquipos();
      setEquipoActivo(Math.max(0, Math.min(equipoActivo, total - 1)));
      aviso(`El equipo "${equipo.nombre}" fue eliminado`);
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo eliminar el equipo');
    } finally {
      setEliminandoEquipo(false);
    }
  };

  /**
   * Baja real: `salirDelEquipo` (por cuenta propia) o `liberarMiembro` (desde
   * la capitanía). Ambos escriben `teams.members` y el `teamIds` del jugador.
   */
  const handleRemovePlayer = async (teamId: string, playerId: string, isSelf: boolean) => {
    if (!sesion.user) return;
    if (isSelf && equipo?.isCapitan) {
      aviso('Como capitán, podés delegar la capitanía o disolver el equipo desde la Configuración ⚙️');
      return;
    }
    const pregunta = isSelf
      ? '¿Estás seguro que querés salir del equipo?'
      : '¿Estás seguro que querés liberar a este jugador?';
    if (!(await confirmar(pregunta, { titulo: isSelf ? 'Salir del equipo' : 'Liberar jugador', textoConfirmar: isSelf ? 'Salir' : 'Liberar', peligro: true }))) return;

    try {
      if (isSelf) await salirDelEquipo(teamId, sesion.user.uid);
      else await liberarMiembro(teamId, sesion.user.uid, playerId);
      await recargarEquipos();
      aviso(isSelf ? 'Saliste del equipo' : 'Jugador liberado del equipo');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo completar la operación');
    }
  };

  /** Cede la capitanía y la administración a otro integrante del plantel. */
  const handleDelegateCaptain = async (teamId: string, playerId: string) => {
    if (!sesion.user) return;
    if (!(await confirmar('¿Cederle la capitanía a este jugador? Vos pasás a ser un jugador normal.', { titulo: 'Delegar capitanía', textoConfirmar: 'Delegar' }))) return;

    try {
      await delegarCapitania(teamId, sesion.user.uid, playerId);
      await recargarEquipos();
      aviso('Capitanía delegada');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo delegar la capitanía');
    }
  };

  /** Alta de equipo: el creador queda como capitán (lo exige también la regla). */
  const handleCrearEquipo = async () => {
    if (!sesion.user) return;
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      aviso('Poné un nombre para el equipo');
      return;
    }
    try {
      await crearEquipo(
        sesion.user.uid,
        sesion.usuario ? nombreCompleto(sesion.usuario) : sesion.user.displayName || 'Jugador',
        { nombre, modalidadBase: nuevoFormato, genero: nuevoGenero },
      );
      const total = await recargarEquipos();
      setEquipoActivo(Math.max(0, total - 1));
      setMostrarCrear(false);
      setNuevoNombre('');
      aviso(`Equipo "${nombre}" creado`);
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo crear el equipo');
    }
  };

  /** El que recibe el link se suma a sí mismo: es la única vía que dejan las reglas. */
  const handleUnirse = async () => {
    if (!sesion.user || !equipoInvitadoId) return;
    setUniendose(true);
    try {
      await unirseAEquipo(equipoInvitadoId, sesion.user.uid);
      await recargarEquipos();
      setEquipoInvitado(null);
      aviso('Te sumaste al equipo');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No te pudiste sumar al equipo');
    } finally {
      setUniendose(false);
    }
  };

  /** Busca jugadores reales. El contador evita que respuestas viejas pisen a las nuevas. */
  const buscarInvitados = (valor: string) => {
    const token = ++busquedaRef.current;
    const termino = valor.trim();
    if (termino.length < 1) {
      setUsuariosBuscados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    buscarJugadores(termino, 10, sesion.user?.uid)
      .then((r) => {
        if (token !== busquedaRef.current) return;
        // El mismo que busca no puede aparecer en el listado, ni miembros que ya estén en el equipo
        const miembrosActuales = new Set((equipo?.plantel ?? []).map((m: any) => m.id));
        if (sesion.user?.uid) miembrosActuales.add(sesion.user.uid);

        const disponibles = r.filter((m) => !miembrosActuales.has(m.uid));
        setUsuariosBuscados(
          disponibles.map((m) => ({ uid: m.uid, username: m.username, apodo: m.name, emoji: m.avatarUrl || '⚽' })),
        );
      })
      .catch((err) => {
        console.error(err);
        if (token !== busquedaRef.current) return;
        setUsuariosBuscados([]);
      })
      .finally(() => {
        if (token === busquedaRef.current) setBuscando(false);
      });
  };

  const handleCreateConvocatoria = () => {
    if (!equipo) return;
    const nuevaConv = {
      fecha: convFecha,
      confirmados: currentUid ? [currentUid] : [],
      bajas: [],
    };
    actualizarConvocatoriaEquipo(equipo.id, nuevaConv).catch(console.error);
    const nuevosEquipos = [...equipos];
    nuevosEquipos[equipoActivo] = {
      ...equipo,
      convocatoria: nuevaConv,
    };
    setEquipos(nuevosEquipos);
    setMostrarModalConvocatoria(false);
    setToastMessage('Convocatoria creada');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleResponderConvocatoria = (teamId: string, status: 'voy' | 'bajo') => {
    const eqActual = equipos.find(eq => eq.id === teamId);
    if (eqActual?.convocatoria?.cerrada) {
      setToastMessage('La convocatoria está cerrada por el capitán.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const nuevosEquipos = equipos.map(eq => {
      if(eq.id === teamId && eq.convocatoria) {
         const myPlayerId = eq.plantel.find((p: any) => p.id === currentUid)?.id;
         if(!myPlayerId) return eq;
         
         const newConf = (eq.convocatoria.confirmados || []).filter((id: any) => id !== myPlayerId);
         const newBajas = (eq.convocatoria.bajas || []).filter((id: any) => id !== myPlayerId);
         
         if(status === 'voy') newConf.push(myPlayerId);
         if(status === 'bajo') newBajas.push(myPlayerId);

         const convActualizada = { ...eq.convocatoria, confirmados: newConf, bajas: newBajas };
         actualizarConvocatoriaEquipo(teamId, convActualizada).catch(console.error);

         return { ...eq, convocatoria: convActualizada };
      }
      return eq;
    });
    setEquipos(nuevosEquipos);
  };

  const handleAlternarCierreConvocatoria = async (teamId: string, cerrar: boolean) => {
    try {
      const eq = equipos.find(e => e.id === teamId);
      if (!eq || !eq.convocatoria) return;
      await alternarCierreConvocatoria(teamId, cerrar, eq.convocatoria.alertaRadarId);
      const convActualizada = {
        ...eq.convocatoria,
        cerrada: cerrar,
        alertaRadarEnviada: cerrar ? false : eq.convocatoria.alertaRadarEnviada,
      };
      setEquipos(prev => prev.map(e => e.id === teamId ? { ...e, convocatoria: convActualizada } : e));
      setToastMessage(cerrar ? '🔒 Convocatoria cerrada. ¡Plantel confirmado!' : '🔓 Convocatoria reabierta.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      console.error('Error al cambiar estado de convocatoria:', err);
      setToastMessage('No se pudo actualizar la convocatoria.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleCancelarConvocatoria = async (teamId: string) => {
    if (!window.confirm('¿Seguro que querés cancelar este partido y cerrar la convocatoria?')) return;
    try {
      const eq = equipos.find(e => e.id === teamId);
      await cancelarConvocatoriaEquipo(teamId, eq?.convocatoria?.alertaRadarId);
      setEquipos(prev => prev.map(e => e.id === teamId ? { ...e, convocatoria: null } : e));
      setToastMessage('Partido cancelado y convocatoria eliminada.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      console.error('Error cancelando convocatoria:', err);
      setToastMessage('No se pudo cancelar la convocatoria.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleAbrirEstadisticas = (eqActual: any) => {
    setAusentesIds([]);
    setEstrellasPredio(0);
    setFairPlayRival(null);

    // Pre-seleccionar automáticamente al más votado por la cancha si hubo votos
    const conteo: Record<string, number> = {};
    Object.values(eqActual?.convocatoria?.votosMvp || {}).forEach((candId: any) => {
      conteo[candId] = (conteo[candId] || 0) + 1;
    });
    let liderUid: string | null = null;
    let maxV = 0;
    Object.entries(conteo).forEach(([uid, cant]) => {
      if (cant > maxV) {
        maxV = cant;
        liderUid = uid;
      }
    });
    setMvpId(liderUid);

    setStatsPartido({});
    setMostrarModalEstadisticas(true);
  };

  /**
   * Publica la alerta al Radar cuando no se completa el equipo.
   */
  const handleEnviarAlRadar = async () => {
    if (!equipo || !equipo.convocatoria || !sesion.user) return;
    setEnviandoAlRadar(true);
    try {
      const predio = equipo.convocatoria.predioNombre || equipo.convocatoria.predio || 'Complejo Deportivo';
      const cancha = equipo.convocatoria.canchaNombre || equipo.convocatoria.cancha || 'Cancha reservada';
      const fecha = equipo.convocatoria.fecha || 'Próximo partido';

      const textoAlerta = `¡No completamos! Necesitamos a los ${jugadoresFaltantes} jugadores necesarios para jugar en ${predio} (${cancha}). Fecha: ${fecha}. ¡Sumate a ${equipo.nombre}!`;

      // Geo del usuario o fallback
      const geoPunto = sesion.usuario?.geo
        ? { lat: sesion.usuario.geo.lat, lng: sesion.usuario.geo.lng }
        : { lat: -34.6037, lng: -58.3816 };
      const geoIndex = aGeoIndex(geoPunto);

      // Creamos el desafío en Firestore (/challenges) para que figure en el Radar
      const desafioRef = doc(collection(db, COLECCIONES.desafios));
      await setDoc(desafioRef, {
        id: desafioRef.id,
        creatorId: sesion.user.uid,
        equipoId: equipo.id,
        equipoNombre: equipo.nombre,
        equipoEscudoUrl: equipo.emoji?.startsWith('http') ? equipo.emoji : null,
        modalidad: (equipo.formato || 'F5') as any,
        estadoCancha: 'CON_CANCHA',
        estado: 'ABIERTO',
        turnoId: equipo.convocatoria.turnoId ?? null,
        predioId: equipo.convocatoria.predioId ?? null,
        posicionBuscada: posicionRadar !== 'Cualquiera' ? posicionRadar : null,
        fechaUnix: Date.now() + 24 * 3600 * 1000,
        descripcion: textoAlerta,
        geo: geoIndex,
        equiposAceptantes: [],
        createdAt: Date.now(),
      });

      // Actualizamos la convocatoria del equipo en Firestore
      const convActualizada = {
        ...equipo.convocatoria,
        alertaRadarEnviada: true,
        jugadoresFaltantes,
        posicionRadar,
        alertaRadarId: desafioRef.id,
      };
      await actualizarConvocatoriaEquipo(equipo.id, convActualizada);

      // Actualización optimista local
      setEquipos((prev) =>
        prev.map((eq) => (eq.id === equipo.id ? { ...eq, convocatoria: convActualizada } : eq))
      );

      setMostrarModalRadar(false);
      aviso(`¡Alerta enviada al Radar! Se buscan ${jugadoresFaltantes} jugadores.`);
    } catch (err: any) {
      console.error('Error al enviar alerta al radar:', err);
      aviso(err?.message || 'Error al enviar alerta al radar');
    } finally {
      setEnviandoAlRadar(false);
    }
  };

  /** Link de invitación: lleva al equipo, no a la pantalla de siempre. */
  const linkDeInvitacion = (teamId: string) => `${window.location.origin}/equipo?unirse=${teamId}`;

  const handleShareLink = async () => {
    if (!equipo) return;
    const url = linkDeInvitacion(equipo.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Unite a mi equipo en Fulbeando!',
          text: `¡Sumate a ${equipo.nombre} y rompela con nosotros!`,
          url,
        });
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      aviso('Link de invitación copiado');
    } catch {
      aviso(url);
    }
  };

  /**
   * Envía la invitación formal en Firestore y dispara el push alert al jugador invitado.
   */
  const handleSendInvite = async () => {
    if (!usuarioSeleccionado || !equipo || !sesion.user) return;
    setEnviandoInvitacion(true);
    try {
      const nombreCapitan = sesion.usuario?.nombre
        ? `${sesion.usuario.nombre} ${sesion.usuario.apellido ?? ''}`.trim()
        : (sesion.user.displayName || 'Capitán');

      await enviarInvitacionAEquipo(
        sesion.user.uid,
        nombreCapitan,
        usuarioSeleccionado.uid,
        usuarioSeleccionado.apodo,
        { id: equipo.id, name: equipo.nombre, shieldUrl: equipo.emoji },
      );

      // Copiar también el link de invitación en portapapeles por comodidad
      navigator.clipboard?.writeText(linkDeInvitacion(equipo.id)).catch(() => {});

      aviso(`¡Invitación enviada a ${usuarioSeleccionado.apodo}! Le llegará un alerta push.`);
      setInviteUsername('');
      setUsuarioSeleccionado(null);
      setUsuariosBuscados([]);
      setMostrarInvitar(false);
    } catch (err: any) {
      console.error('Error al enviar invitación:', err);
      aviso(err?.message || 'No se pudo enviar la invitación');
    } finally {
      setEnviandoInvitacion(false);
    }
  };

  const bannerInvitacion = equipoInvitado ? (
    <div className="mx-6 mt-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
      <div className="flex-1">
        <p className="text-xs font-black uppercase text-amber-500">Te invitaron a</p>
        <p className="font-bold text-white">{equipoInvitado.nombre}</p>
      </div>
      <button
        onClick={handleUnirse}
        disabled={uniendose}
        className="bg-amber-500 text-zinc-950 font-black text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
      >
        {uniendose ? '...' : 'Unirse'}
      </button>
      <button
        onClick={() => setEquipoInvitado(null)}
        className="text-zinc-500 hover:text-white text-lg px-1"
        aria-label="Descartar invitación"
      >
        ✕
      </button>
    </div>
  ) : null;

  const modalCrearEquipo = mostrarCrear && (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Crear equipo" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
        <button onClick={() => setMostrarCrear(false)} aria-label="Cerrar" className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
        <h3 className="text-xl font-black mb-1">Crear equipo</h3>
        <p className="text-sm text-zinc-400 mb-6">
          Quedás como capitán. Podés tener hasta {MAX_EQUIPOS_POR_JUGADOR} equipos a la vez.
        </p>

        <label htmlFor="equipo-nombre" className="text-xs font-bold text-zinc-500 uppercase">Nombre del equipo</label>
        <input
          id="equipo-nombre"
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          maxLength={60}
          placeholder="Los Pibes de Lomas"
          className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white font-bold mb-6 mt-2 outline-none focus:border-amber-500"
        />

        <label className="text-xs font-bold text-zinc-500 uppercase">Formato de juego</label>
        <div className="flex flex-wrap gap-2 mt-2 mb-6">
          {['F5', 'F7', 'F11'].map((f) => (
            <button
              key={f}
              onClick={() => setNuevoFormato(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${nuevoFormato === f ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
        <div className="flex gap-2 mt-2 mb-8">
          {(['Masculino', 'Femenino', 'Mixto'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setNuevoGenero(g)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors ${nuevoGenero === g ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {g}
            </button>
          ))}
        </div>

        <button
          onClick={handleCrearEquipo}
          className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform"
        >
          Crear equipo
        </button>
      </div>
    </div>
  );

  if (cargando) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-transparent text-emerald-600 font-bold gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-600">Cargando equipo...</span>
      </div>
    );
  }

  if (equipos.length === 0 || !equipo) {
    return (
      <div className="h-full flex flex-col bg-transparent font-sans text-slate-100 overflow-hidden relative">
        <Toast mensaje={toastMessage} />
        <div className="flex-1 overflow-y-auto">
          {bannerInvitacion}
          <div className="flex flex-col justify-center items-center p-6 text-center min-h-[60vh]">
            <div className="w-20 h-20 bg-white shadow-md rounded-full flex items-center justify-center text-3xl mb-4 border border-slate-200">🛡️</div>
            <h2 className="text-2xl font-black text-amber-500 mb-2">No tenés equipo</h2>
            <p className="text-slate-400 mb-8">Creá un equipo para empezar a sumar estadísticas, armar convocatorias y lanzar desafíos al Radar.</p>
            <motion.button
              onClick={() => setMostrarCrear(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-amber-500 text-zinc-950 font-black px-8 py-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer"
            >
              CREAR EQUIPO
            </motion.button>
          </div>
        </div>
        {modalCrearEquipo}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        {/* Toast Notification */}
        <Toast mensaje={toastMessage} />

        {bannerInvitacion}

      {/* Selector de equipos (Tabs) */}
      <div className="flex bg-zinc-900 border-b border-zinc-800 pt-8">
        {equipos.map((eq, i) => (
          <motion.button 
            key={eq.id} 
            onClick={() => setEquipoActivo(i)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`flex-1 py-4 text-sm font-bold uppercase transition cursor-pointer ${equipoActivo === i ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {eq.nombre}
          </motion.button>
        ))}
        {equipos.length < MAX_EQUIPOS_POR_JUGADOR && (
          <motion.button
            onClick={() => setMostrarCrear(true)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="px-4 py-4 text-sm font-bold text-zinc-400 hover:text-amber-400 transition cursor-pointer"
            title="Crear otro equipo"
          >
            +
          </motion.button>
        )}
      </div>

      {/* Header Equipo */}
      <div className="bg-zinc-900 p-6 pt-12 rounded-b-[40px] text-center relative border-b border-zinc-800">
        {equipo.isCapitan && (
          <button onClick={abrirConfig} aria-label="Configurar equipo" className="absolute top-8 right-6 text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-800 p-3 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        )}
        <div 
          className={`w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-4xl mb-4 overflow-hidden relative group ${equipo.isCapitan ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (equipo.isCapitan && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        >
          {equipo.emoji?.startsWith('http') ? (
             <img src={equipo.emoji} alt={`Escudo de ${equipo.nombre}`} className="w-full h-full object-cover" />
          ) : (
             equipo.emoji
          )}
          {equipo.isCapitan && (
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs font-bold text-white uppercase backdrop-blur-sm">
              Cambiar
            </div>
          )}
        </div>
        <input 
          type="file" 
          aria-label="Subir escudo del equipo"
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
        />
        <h2 className="text-2xl font-black uppercase text-white tracking-wide">{equipo.nombre}</h2>
        {equipo.esRefuerzoTemporal && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
            ⚡ Refuerzo para el partido de hoy
          </div>
        )}

        {/* Badge de División de Fútbol y Reputación */}
        {(() => {
          const divInfo = calcularDivisionEquipo({
            stats: { wins: equipo.w, draws: equipo.d, losses: equipo.l },
            mediaPlantel: (() => {
              const ms = equipo.plantel || [];
              if (ms.length === 0) return 58;
              const sum = ms.reduce((acc: number, cur: any) => acc + (cur.media || 55), 0);
              return Math.round(sum / ms.length);
            })(),
            reputation: equipo.reputation,
          });

          return (
            <div className="flex flex-col items-center gap-1.5 mt-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${divInfo.badgeClass}`}>
                <span>{divInfo.icono}</span>
                <span>{divInfo.nombre}</span>
              </span>
              <div className="flex items-center justify-center gap-2 text-xs font-bold mt-1 flex-wrap">
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/35 px-2.5 py-0.5 rounded-lg font-black tracking-wider">
                  ⭐ Media {divInfo.mediaEquipo}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg border font-bold flex items-center gap-1.5 ${divInfo.insigniaFairPlay.badgeClass}`}>
                  <span>{divInfo.insigniaFairPlay.icono}</span>
                  <span>{divInfo.insigniaFairPlay.score}% {divInfo.insigniaFairPlay.texto}</span>
                </span>
              </div>
            </div>
          );
        })()}

        <p className="text-zinc-400 text-xs mt-2">Capitán: {equipo.capitanNombre}</p>
        <div className="flex justify-center gap-4 mt-3 text-sm font-bold">
          <div className="text-emerald-500">{equipo.w} PG</div>
          <div className="text-zinc-500">{equipo.d} PE</div>
          <div className="text-red-500">{equipo.l} PP</div>
        </div>
      </div>

      {/* Convocatoria y Post-Partido Section */}
      <div className="px-6 pt-6">
        {equipo.convocatoria ? (
          <div>
            {/* Selector de Etapa: Convocatoria vs Post-Partido */}
            <div className="flex bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 shadow-md mb-4 gap-1.5">
              <button
                type="button"
                onClick={() => setEtapaPartido('convocatoria')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  etapaPartido === 'convocatoria'
                    ? 'bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>1. Convocatoria</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  etapaPartido === 'convocatoria' ? 'bg-zinc-950/25 text-zinc-950' : 'bg-zinc-800 text-amber-400'
                }`}>
                  {equipo.convocatoria.confirmados?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEtapaPartido('post_partido')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  etapaPartido === 'post_partido'
                    ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>2. Carga & Post-Partido</span>
              </button>
            </div>

            {/* Panel 1: Convocatoria (Pre-Partido) */}
            {etapaPartido === 'convocatoria' ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-zinc-800/70">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      <span className="text-[11px] uppercase font-black tracking-wider text-amber-400">
                        Próximo Partido • Convocatoria
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-white">{equipo.convocatoria.fecha}</h3>
                    {equipo.convocatoria.predioNombre && (
                      <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 mt-1">
                        <span>📍</span> {equipo.convocatoria.predioNombre}
                      </p>
                    )}
                  </div>
                  {equipo.isCapitan && (
                    <motion.button
                      onClick={() => {
                        const formatoNum = parseInt((equipo.formato || 'F5').replace(/\D/g, '')) || 5;
                        const yaConfirmados = (equipo.convocatoria.confirmados || []).length;
                        const faltan = Math.max(1, formatoNum - yaConfirmados);
                        setJugadoresFaltantes(faltan);
                        setMostrarModalRadar(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-md cursor-pointer ${
                        equipo.convocatoria.alertaRadarEnviada
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 hover:bg-blue-600/50'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                      }`}
                    >
                      <Radio className={`w-3.5 h-3.5 ${equipo.convocatoria.alertaRadarEnviada ? 'animate-pulse text-blue-400' : ''}`} />
                      {equipo.convocatoria.alertaRadarEnviada ? 'Radar Activo' : 'Al Radar'}
                    </motion.button>
                  )}
                </div>

                {/* Badge de Convocatoria Cerrada */}
                {equipo.convocatoria.cerrada && (
                  <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 mb-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold truncate">
                      <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Convocatoria Cerrada • Plantel Confirmado</span>
                    </div>
                    {equipo.isCapitan && (
                      <button
                        onClick={() => handleAlternarCierreConvocatoria(equipo.id, false)}
                        className="text-amber-400 hover:text-white font-black uppercase text-[11px] underline ml-2 shrink-0 cursor-pointer"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                )}

                {/* Badge de alerta activa en Radar */}
                {equipo.convocatoria.alertaRadarEnviada && !equipo.convocatoria.cerrada && (
                  <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 mb-3 text-xs">
                    <div className="flex items-center gap-2 text-blue-200 font-bold truncate">
                      <Radio className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
                      <span className="truncate">
                        En Radar: faltan {equipo.convocatoria.jugadoresFaltantes || 1} jugador(es)
                      </span>
                    </div>
                    <button
                      onClick={() => navigate('/radar')}
                      className="text-blue-400 hover:text-white font-black uppercase text-[11px] underline ml-2 shrink-0 cursor-pointer"
                    >
                      Ver en mapa
                    </button>
                  </div>
                )}

                {/* Contadores de Confirmados y Bajas */}
                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-3.5">
                  <div className="text-center flex-1">
                    <div className="text-2xl font-black text-emerald-400">{equipo.convocatoria.confirmados?.length || 0}</div>
                    <div className="text-[11px] uppercase font-bold text-zinc-400">Confirmados</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800"></div>
                  <div className="text-center flex-1">
                    <div className="text-2xl font-black text-rose-400">{equipo.convocatoria.bajas?.length || 0}</div>
                    <div className="text-[11px] uppercase font-bold text-zinc-400">Bajas</div>
                  </div>
                </div>

                {/* Botones de Asistencia del Jugador */}
                <div className="flex gap-2.5 mb-3.5">
                  {equipo.convocatoria.cerrada ? (
                    <div className="w-full text-center py-2.5 px-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 text-xs font-bold flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Convocatoria cerrada por el capitán</span>
                    </div>
                  ) : (
                    (() => {
                      const myId = equipo.plantel.find((p: any) => p.id === currentUid)?.id;
                      const confirmó = myId && equipo.convocatoria.confirmados?.includes(myId);
                      const seBajó = myId && equipo.convocatoria.bajas?.includes(myId);
                      return (
                        <>
                          <motion.button 
                            onClick={() => handleResponderConvocatoria(equipo.id, 'voy')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className={`flex-1 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              confirmó 
                                ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                                : 'bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Voy</span>
                          </motion.button>
                          <motion.button 
                            onClick={() => handleResponderConvocatoria(equipo.id, 'bajo')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className={`flex-1 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              seBajó 
                                ? 'bg-rose-500 text-zinc-950 shadow-[0_0_15px_rgba(244,63,94,0.35)]' 
                                : 'bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            <span>Me bajo</span>
                          </motion.button>
                        </>
                      );
                    })()
                  )}
                </div>

                {/* Botones de Gestión del Capitán (Cerrar / Reabrir / Cancelar) */}
                {equipo.isCapitan && (
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                    <motion.button
                      onClick={() => handleAlternarCierreConvocatoria(equipo.id, !equipo.convocatoria.cerrada)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`flex-1 text-xs font-black py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 border shadow-sm cursor-pointer ${
                        equipo.convocatoria.cerrada
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {equipo.convocatoria.cerrada ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Reabrir Convocatoria</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Cerrar Convocatoria</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => handleCancelarConvocatoria(equipo.id)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="text-xs font-bold py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-700/80 hover:border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer"
                      title="Cancelar partido y eliminar convocatoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </motion.button>
                  </div>
                )}
              </div>
            ) : (
              /* Panel 2: Carga de Datos y Post-Partido */
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                <div className="pb-3 border-b border-zinc-800/70">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-[11px] uppercase font-black tracking-wider text-emerald-400">
                      Post-Partido & Tercer Tiempo
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-white">Carga de Datos del Encuentro</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                    Una vez jugado el partido, cargá el resultado oficial, goleadores y elegí la figura de la cancha.
                  </p>
                </div>

                {/* Banner de Sponsor Oficial / Promo de Tercer Tiempo */}
                <BannerSponsorTercerTiempo />

                {/* Planilla Oficial del Capitán */}
                {equipo.isCapitan ? (
                  <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-950 border border-emerald-500/30 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Planilla Oficial
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">Solo Capitán</span>
                    </div>
                    <p className="text-xs text-zinc-300 mb-3.5 leading-snug">
                      Registrá el resultado final, ausentes, autores de goles, asistencias y calificación del predio y rival.
                    </p>
                    <motion.button
                      onClick={() => handleAbrirEstadisticas(equipo)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Cargar Estadísticas del Partido</span>
                    </motion.button>
                  </div>
                ) : (
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>El capitán {equipo.capitanNombre} es el encargado de cargar la planilla oficial tras el partido.</span>
                  </div>
                )}

                {/* Votación democrática de la Figura (MVP) por compañeros y rivales */}
                {equipo.confirmadosDelPartido && equipo.confirmadosDelPartido.length > 0 && (
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">⭐</span>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          Votación de la Figura
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {(() => {
                          const totalVotos = Object.keys(equipo.convocatoria?.votosMvp || {}).length;
                          return totalVotos === 1 ? '1 voto registrado' : `${totalVotos} votos registrados`;
                        })()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-3 font-medium leading-tight">
                      Elegí quién la rompió hoy. Compañeros y rivales pueden votar con 1 tap.
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {equipo.confirmadosDelPartido.map((p: any) => {
                        const esMiPropioUsuario = p.id === currentUid;
                        const votosCandidato = Object.values(equipo.convocatoria?.votosMvp || {}).filter(
                          (candId: any) => candId === p.id
                        ).length;
                        const yoLoVote = currentUid && equipo.convocatoria?.votosMvp?.[currentUid] === p.id;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={esMiPropioUsuario || !currentUid}
                            onClick={async () => {
                              if (esMiPropioUsuario || !currentUid) return;
                              try {
                                await emitirVotoMvp(
                                  equipo.id,
                                  currentUid,
                                  p.id,
                                  equipo.convocatoria?.equipoRivalId
                                );
                                setToastMessage(`¡Votaste a ${p.apodo} como figura del partido! ⭐`);
                                setTimeout(() => setToastMessage(''), 2500);
                              } catch (err: any) {
                                setToastMessage(err.message || 'Error al registrar tu voto');
                                setTimeout(() => setToastMessage(''), 2500);
                              }
                            }}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 transition-all text-left ${
                              yoLoVote
                                ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                : esMiPropioUsuario
                                ? 'bg-zinc-950/40 border-zinc-800/40 opacity-50 cursor-not-allowed'
                                : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/80 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{p.emoji || '🏃'}</span>
                              <span className="text-xs font-bold text-white truncate">
                                {p.apodo}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              {votosCandidato > 0 && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40">
                                  ⭐ {votosCandidato}
                                </span>
                              )}
                              {yoLoVote && (
                                <span className="text-[10px] font-black text-amber-400">
                                  ✓
                                </span>
                              )}
                              {esMiPropioUsuario && (
                                <span className="text-[9px] font-bold text-zinc-500">
                                  (Vos)
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {equipo.ultimoPartido && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] uppercase font-black tracking-wider text-emerald-400">Último Partido Finalizado</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-400">{equipo.ultimoPartido.fecha}</span>
                </div>
                
                {equipo.ultimoPartido.predioNombre && (
                  <p className="text-sm font-black text-white mb-3">
                    📍 {equipo.ultimoPartido.predioNombre} {equipo.ultimoPartido.canchaNombre ? `· ${equipo.ultimoPartido.canchaNombre}` : ''}
                  </p>
                )}

                {/* MVP Destacado */}
                {equipo.ultimoPartido.mvpNombre && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                      {equipo.ultimoPartido.mvpEmoji || '👑'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] uppercase font-black text-amber-400 tracking-wider block">
                        ⭐ Figura de la Cancha (MVP)
                      </span>
                      <span className="text-sm font-black text-white truncate block">
                        {equipo.ultimoPartido.mvpNombre}
                      </span>
                    </div>
                  </div>
                )}

                {/* Resumen de Goles y Asistencias cargadas */}
                {equipo.ultimoPartido.stats && Object.keys(equipo.ultimoPartido.stats).length > 0 && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <span className="text-[11px] uppercase font-black text-zinc-500 tracking-wider block mb-2">
                      Goles y Asistencias Registrados
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(equipo.ultimoPartido.stats).map(([uid, s]: [string, any]) => {
                        if (!s.goles && !s.asistencias) return null;
                        const j = equipo.plantel.find((p: any) => p.id === uid);
                        const nombre = j?.apodo || 'Jugador';
                        return (
                          <div key={uid} className="bg-zinc-900 border border-zinc-700/60 px-2.5 py-1 rounded-lg text-xs flex items-center gap-2">
                            <span className="font-bold text-zinc-300">{nombre}:</span>
                            {s.goles > 0 && <span className="font-black text-emerald-400">⚽ {s.goles}</span>}
                            {s.asistencias > 0 && <span className="font-black text-amber-400">👟 {s.asistencias}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {equipo.isCapitan ? (
              <motion.button 
                onClick={() => setMostrarModalConvocatoria(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-amber-500/50 hover:text-white text-zinc-400 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                + Armar Nueva Convocatoria
              </motion.button>
            ) : (
              <div className="text-center py-4 text-zinc-300 font-bold text-sm bg-zinc-900 rounded-2xl border border-zinc-800">
                No hay próximo partido programado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Jugadores: dividida en Confirmados (con convocatoria) o Plantel Completo (sin convocatoria) */}
      <div className="p-6">
        {(() => {
          const jugadoresConfirmados = equipo.confirmadosDelPartido || [];

          const renderTarjetaJugador = (jugador: any, permitirGestion: boolean) => {
            const isMe = jugador.id === currentUid;
            const canRemove = permitirGestion && equipo.isCapitan && !isMe;
            const canLeave = permitirGestion && isMe && !equipo.isCapitan;
            const esRefuerzo = Boolean(jugador.esTemporal);

            return (
              <motion.div 
                key={jugador.id} 
                whileHover={{ y: -1, scale: 1.008 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center gap-4 bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-shadow"
              >
                <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center font-bold text-amber-500">
                  {jugador.emoji?.startsWith('http') ? (
                    <img src={jugador.emoji} alt={jugador.apodo} className="w-full h-full object-cover" />
                  ) : (
                    jugador.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate text-white">{jugador.apodo}</h4>
                    {esRefuerzo && (
                      <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black shrink-0">
                        ⚡ Refuerzo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 font-semibold">{jugador.isCapitan ? 'CAPITÁN' : esRefuerzo ? 'REFUERZO DEL PARTIDO' : 'JUGADOR'}</p>
                </div>

                {/* Estadísticas de Jugador y Media / OVR */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end text-[11px] font-bold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span title="Goles">⚽ {jugador.stats?.goles || 0}</span>
                      <span title="Asistencias">👟 {jugador.stats?.asistencias || 0}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">{jugador.stats?.partidosJugados || 0} PJ</span>
                  </div>
                  {(() => {
                    const tema = obtenerTemaSegunMedia(jugador.media || 55);
                    return (
                      <div 
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-md ${tema.badgeMediaClass}`}
                        title={`Media / OVR ${jugador.media || 55} (${tema.nombreTier})`}
                      >
                        {jugador.media || 55}
                      </div>
                    );
                  })()}
                </div>
                {esRefuerzo && equipo.isCapitan && (
                  <button 
                    onClick={() => {
                      setUsuarioSeleccionado({
                        uid: jugador.id,
                        username: jugador.username || jugador.apodo,
                        apodo: jugador.apodo,
                        emoji: jugador.emoji,
                      });
                      setMostrarInvitar(true);
                    }}
                    className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
                    title="Invitar a ser miembro permanente del plantel"
                  >
                    + Sumar al Plantel
                  </button>
                )}
                {canRemove && (
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleDelegateCaptain(equipo.id, jugador.id)}
                      className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                      Hacer Capitán
                    </button>
                    <button 
                      onClick={() => handleRemovePlayer(equipo.id, jugador.id, false)}
                      className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      Liberar
                    </button>
                  </div>
                )}
                {canLeave && (
                  <button 
                    onClick={() => handleRemovePlayer(equipo.id, jugador.id, true)}
                    className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    Salir
                  </button>
                )}
              </motion.div>
            );
          };

          if (equipo.convocatoria) {
            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => setSubPestanaPlantel('confirmados')}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        subPestanaPlantel === 'confirmados'
                          ? 'bg-emerald-500 text-zinc-950 shadow-md'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold'
                      }`}
                    >
                      ✓ Confirmados ({jugadoresConfirmados.length})
                    </motion.button>
                    <motion.button
                      onClick={() => setSubPestanaPlantel('todos')}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        subPestanaPlantel === 'todos'
                          ? 'bg-amber-500 text-zinc-950 shadow-md'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold'
                      }`}
                    >
                      Plantel ({equipo.plantel.length})
                    </motion.button>
                  </div>
                  {subPestanaPlantel === 'todos' && (
                    <motion.button
                      onClick={() => setMostrarInvitar(true)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                    >
                      + Invitar
                    </motion.button>
                  )}
                </div>

                {subPestanaPlantel === 'confirmados' ? (
                  jugadoresConfirmados.length === 0 ? (
                    <div className="text-center py-8 bg-zinc-900/60 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-2">
                      <p className="text-sm font-bold text-zinc-300">Aún no hay jugadores confirmados</p>
                      <p className="text-xs text-zinc-400">A medida que los integrantes pongan '✓ Voy' o se sumen refuerzos del Radar, irán apareciendo acá.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jugadoresConfirmados.map((jugador: any) => renderTarjetaJugador(jugador, false))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {equipo.plantel.map((jugador: any) => renderTarjetaJugador(jugador, true))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Plantel del Equipo ({equipo.plantel.length}/{MAX_MEMBROS_EQUIPO})
                </h3>
                <button
                  onClick={() => setMostrarInvitar(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  + Invitar
                </button>
              </div>
              <div className="space-y-3">
                {equipo.plantel.map((jugador: any) => renderTarjetaJugador(jugador, true))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modal Configuración */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
          <div role="dialog" aria-modal="true" aria-label="Configurar equipo" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl max-h-[90vh] overflow-y-auto">
             <button
               type="button"
               onClick={() => setMostrarConfig(false)}
               aria-label="Cerrar"
               className="absolute top-6 right-6 text-zinc-500 hover:text-white transition p-1 cursor-pointer"
             >
               <X className="w-5 h-5" />
             </button>

             <h3 className="text-xl font-black mb-2 text-white">Configurar Equipo</h3>
             <p className="text-sm text-zinc-400 mb-6">Ajustá cómo querés que {equipo.nombre} aparezca en el radar.</p>
             
             <label className="text-xs font-bold text-zinc-500 uppercase">Formato de Juego</label>
             <div className="flex flex-wrap gap-2 mt-2 mb-6">
               {['F5', 'F7', 'F11', 'Todos'].map(f => (
                 <button key={f} onClick={() => setFormato(f)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${formato === f ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>{f}</button>
               ))}
             </div>

             <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
             <div className="flex gap-2 mt-2 mb-6">
               {['Masculino', 'Femenino', 'Mixto'].map(g => (
                 <button key={g} onClick={() => setGenero(g)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors ${genero === g ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>{g}</button>
               ))}
             </div>

             <label className="text-xs font-bold text-zinc-500 uppercase">Escudo</label>
             <p className="text-[11px] text-zinc-600 mb-2">Tocá la foto del equipo en el encabezado para subir una imagen.</p>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '⭐'].map(emoji => (
                 <button key={emoji} onClick={() => setEscudoSel(emoji)} className={`w-12 h-12 text-2xl rounded-lg transition-transform ${escudoSel === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}`}>{emoji}</button>
               ))}
             </div>

             <button onClick={handleGuardarConfig} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition cursor-pointer shadow-md">
               Guardar Cambios
             </button>

             {/* Zona de peligro: solo visible para el capitán */}
             {equipo.isCapitan && (
               <div className="mt-8 pt-6 border-t border-zinc-800">
                 <label className="text-xs font-black text-rose-500 uppercase tracking-wider block mb-1">
                   Zona de peligro
                 </label>
                 <p className="text-[11px] text-zinc-400 mb-3">
                   Eliminar este equipo liberará a todos los jugadores del plantel y borrará su historial de partidos.
                 </p>
                 <button
                   type="button"
                   onClick={handleEliminarEquipo}
                   disabled={eliminandoEquipo}
                   className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 text-rose-400 hover:text-white font-bold py-3 px-4 rounded-xl text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                 >
                   {eliminandoEquipo ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <Trash2 className="w-4 h-4" />
                   )}
                   Eliminar este equipo
                 </button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {mostrarInvitar && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          {/* ... (el resto del modal invitar queda igual pero omito el contenido completo aca y lo dejo como estaba) */}
          <div role="dialog" aria-modal="true" aria-label="Invitar jugador" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <button onClick={() => setMostrarInvitar(false)} aria-label="Cerrar" className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
             <h3 className="text-xl font-black mb-2">Invitar Jugador</h3>
             <p className="text-sm text-zinc-400 mb-6">Sumá un nuevo talento a {equipo.nombre}.</p>
             
             <button onClick={handleShareLink} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl mb-6 active:scale-95 transition-transform">
               <Share2 className="w-5 h-5" /> Compartir Link de Invitación
             </button>

             <div className="relative flex py-2 items-center mb-6">
               <div className="flex-grow border-t border-zinc-800"></div>
               <span className="shrink-0 px-4 text-zinc-600 text-xs font-bold uppercase">o buscar por nombre</span>
               <div className="flex-grow border-t border-zinc-800"></div>
             </div>

             <div className={`flex items-center w-full bg-zinc-950 border rounded-xl mb-2 transition-colors overflow-hidden ${usuarioSeleccionado ? 'border-emerald-500' : 'border-zinc-800 focus-within:border-amber-500'}`}>
               <Search className="w-4 h-4 ml-4 text-zinc-500 shrink-0" />
                <input 
                  aria-label="Buscar jugador por usuario"
                  type="text" 
                  value={inviteUsername}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 40);
                    setInviteUsername(val);
                    setUsuarioSeleccionado(null);
                    buscarInvitados(val);
                  }}
                  className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                  placeholder="buscar por nombre o apellido"
                />
                {buscando && <Loader2 className="w-4 h-4 mr-3 text-amber-500 animate-spin shrink-0" />}
                {usuarioSeleccionado && <span className="pr-4 text-emerald-500">✓</span>}
             </div>

             {/* Resultados de Búsqueda */}
             {!usuarioSeleccionado && usuariosBuscados.length > 0 && (
               <div className="bg-zinc-950 border border-zinc-800 rounded-xl mb-4 max-h-40 overflow-y-auto">
                  {usuariosBuscados.map(u => (
                    <div 
                      key={u.uid}
                      onClick={() => {
                        setUsuarioSeleccionado(u);
                        setInviteUsername(u.apodo);
                        setUsuariosBuscados([]);
                      }}
                     className="flex items-center gap-3 p-3 border-b border-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors last:border-0"
                   >
                     <div className="w-8 h-8 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center text-sm">
                        {u.emoji?.startsWith('http') ? (
                          <img src={u.emoji} alt={u.apodo} className="w-full h-full object-cover" />
                        ) : (
                          u.emoji
                        )}
                     </div>
                     <div>
                       <div className="text-sm font-bold text-white">{u.apodo}</div>
                       <div className="text-xs text-zinc-500 font-medium">@{u.username}</div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
              {!usuarioSeleccionado && inviteUsername.trim().length >= 1 && usuariosBuscados.length === 0 && !buscando && (
                <div className="text-xs text-red-400 font-bold mb-4 px-2">No encontramos a ningún jugador con ese nombre</div>
              )}
              {usuarioSeleccionado && (
                <div className="text-xs text-emerald-400 font-bold mb-4 px-2">
                  Invitando a {usuarioSeleccionado.apodo}. Al enviar, le saldrá un alerta push para unirse.
                </div>
              )}

              <button 
                onClick={handleSendInvite} 
                disabled={!usuarioSeleccionado || enviandoInvitacion}
                className={`w-full font-black py-4 rounded-xl transition-all mt-2 flex items-center justify-center gap-2 ${usuarioSeleccionado && !enviandoInvitacion ? 'bg-amber-500 text-zinc-950 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                {enviandoInvitacion ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando invitación...
                  </>
                ) : (
                  'Enviar invitación'
                )}
              </button>
          </div>
        </div>
      )}

      {/* Modal Armar Convocatoria */}
      {mostrarModalConvocatoria && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Armar convocatoria" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <button onClick={() => setMostrarModalConvocatoria(false)} aria-label="Cerrar" className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
             <h3 className="text-xl font-black mb-2">Armar Convocatoria</h3>
             <p className="text-sm text-zinc-400 mb-6">Llamá a tu equipo a jugar el próximo partido.</p>

             <label htmlFor="conv-fecha" className="text-xs font-bold text-zinc-500 uppercase">Fecha y Hora</label>
             <input 
                id="conv-fecha"
                type="text" 
                value={convFecha}
                onChange={(e) => setConvFecha(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white font-bold mb-6 mt-2 outline-none focus:border-amber-500"
             />

             <button 
               onClick={handleCreateConvocatoria} 
               className="w-full bg-amber-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform"
             >
               Abrir Convocatoria
             </button>
          </div>
        </div>
      )}
      </div>

      {modalCrearEquipo}
      {/* Modal Cargar Estadísticas */}
      {mostrarModalEstadisticas && equipo && (
        <div role="dialog" aria-modal="true" aria-label="3er tiempo" className="fixed inset-0 z-[200] bg-zinc-950/95 backdrop-blur-sm p-4 flex flex-col pt-12 pb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black italic text-emerald-500">3er TIEMPO</h2>
            <button onClick={() => setMostrarModalEstadisticas(false)} aria-label="Cerrar" className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-amber-500">Elegir MVP del Partido ⭐</h3>
                {(() => {
                  const totalVotos = Object.keys(equipo.convocatoria?.votosMvp || {}).length;
                  if (totalVotos > 0) {
                    return (
                      <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        🗳️ {totalVotos} voto{totalVotos > 1 ? 's' : ''} de la cancha
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const votosMap: Record<string, number> = {};
                Object.values(equipo.convocatoria?.votosMvp || {}).forEach((candId: any) => {
                  votosMap[candId] = (votosMap[candId] || 0) + 1;
                });
                const maxVotos = Math.max(0, ...Object.values(votosMap));

                const candidatos = (equipo.confirmadosDelPartido || [])
                  .filter((p: any) => !ausentesIds.includes(p.id))
                  .sort((a: any, b: any) => (votosMap[b.id] || 0) - (votosMap[a.id] || 0));

                return (
                  <div className="grid grid-cols-2 gap-2">
                    {candidatos.map((p: any) => {
                      const votos = votosMap[p.id] || 0;
                      const esLider = votos > 0 && votos === maxVotos;
                      const esSeleccionado = mvpId === p.id;

                      return (
                        <button 
                          key={p.id}
                          type="button"
                          onClick={() => setMvpId(p.id)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
                            esSeleccionado
                              ? 'border-amber-500 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          {esLider && (
                            <span className="absolute -top-2 bg-amber-500 text-zinc-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider">
                              👑 Más votado ({votos})
                            </span>
                          )}
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl mt-1">
                            {p.emoji || '🏃'}
                          </div>
                          <span className="text-xs font-bold text-white truncate w-full text-center">
                            {p.apodo}
                          </span>
                          {votos > 0 && !esLider && (
                            <span className="text-[10px] text-amber-400 font-bold">
                              ⭐ {votos} voto{votos > 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-emerald-500">Goles, Asistencias y Asistencia</h3>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Silencio = Jugó ✅</span>
              </div>
              <div className="space-y-2.5">
                {(equipo.confirmadosDelPartido || []).map((p: any) => {
                  const estaAusente = ausentesIds.includes(p.id);
                  const s = statsPartido[p.id] || { goles: 0, asistencias: 0 };
                  const updateStats = (field: 'goles'|'asistencias', val: number) => {
                    setStatsPartido(prev => ({...prev, [p.id]: { ...s, [field]: Math.max(0, s[field] + val) }}));
                  };
                  return (
                    <div 
                      key={p.id} 
                      className={`border p-3 rounded-xl flex items-center gap-3 transition-colors ${
                        estaAusente ? 'bg-zinc-950/70 border-rose-900/40 opacity-70' : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-lg">{p.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold block truncate ${estaAusente ? 'line-through text-zinc-400' : 'text-white'}`}>
                            {p.apodo}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (estaAusente) {
                                setAusentesIds(prev => prev.filter(id => id !== p.id));
                              } else {
                                setAusentesIds(prev => [...prev, p.id]);
                                if (mvpId === p.id) setMvpId(null);
                              }
                            }}
                            title={estaAusente ? 'Marcar como presente' : 'Marcar como ausente / no asistió'}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              estaAusente
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            }`}
                          >
                            {estaAusente ? '❌ Faltó' : '✓ Jugó'}
                          </button>
                        </div>
                        {estaAusente && (
                          <span className="text-[10px] text-rose-400/90 font-medium block mt-0.5">
                            Falta sin aviso (-15% Fair Play)
                          </span>
                        )}
                      </div>

                      {!estaAusente && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500">Goles</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button onClick={() => updateStats('goles', -1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center text-red-400 font-bold active:scale-90 transition cursor-pointer">-</button>
                              <span className="font-black w-3 text-center text-xs">{s.goles}</span>
                              <button onClick={() => updateStats('goles', 1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center text-emerald-400 font-bold active:scale-90 transition cursor-pointer">+</button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500">Asist.</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button onClick={() => updateStats('asistencias', -1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center text-red-400 font-bold active:scale-90 transition cursor-pointer">-</button>
                              <span className="font-black w-3 text-center text-xs">{s.asistencias}</span>
                              <button onClick={() => updateStats('asistencias', 1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center text-amber-400 font-bold active:scale-90 transition cursor-pointer">+</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calificación opcional del Predio */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                  <span>🏟️</span>
                  <span className="truncate">¿Qué tal las canchas de {equipo.convocatoria?.predioNombre || equipo.convocatoria?.predio || 'el predio'}?</span>
                </span>
                {estrellasPredio > 0 && (
                  <span className="text-xs font-black text-amber-400 shrink-0 ml-2">{estrellasPredio} de 5 ⭐</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mb-3 font-medium">Opcional: ayuda a otros equipos a saber cómo están las canchas.</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setEstrellasPredio(estrella === estrellasPredio ? 0 : estrella)}
                    className={`flex-1 py-2 rounded-xl border text-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                      estrellasPredio >= estrella
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Calificación opcional de Fair Play del Rival */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <span className="text-sm font-bold text-white block mb-1">
                Conducta y Fair Play del equipo rival
              </span>
              <p className="text-[11px] text-zinc-400 mb-3 font-medium">Opcional: calificá el respeto y juego limpio del rival.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFairPlayRival(fairPlayRival === 'BUEN_RIVAL' ? null : 'BUEN_RIVAL')}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    fairPlayRival === 'BUEN_RIVAL'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>🤝</span>
                  <span>Buen rival / Juego limpio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFairPlayRival(fairPlayRival === 'CONFLICTIVO' ? null : 'CONFLICTIVO')}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    fairPlayRival === 'CONFLICTIVO'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>⚠️</span>
                  <span>Conflictivo / Violento</span>
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={async () => {
              if (equipo) {
                try {
                  await finalizarTercerTiempoYPartido(equipo.id, {
                    mvpId,
                    stats: statsPartido,
                    ausentesIds,
                    calificacionPredio: estrellasPredio > 0 ? {
                      predioId: equipo.convocatoria?.predioId || null,
                      predioNombre: equipo.convocatoria?.predioNombre || equipo.convocatoria?.predio || null,
                      estrellas: estrellasPredio,
                    } : null,
                    fairPlayRival,
                    equipoRivalId: equipo.convocatoria?.equipoRivalId || null,
                  });
                } catch (err) {
                  console.warn('Error guardando estadísticas de tercer tiempo:', err);
                }
              }
              setToastMessage('¡Estadísticas, reputación y goles del 3er tiempo guardados! ⚽');
              setTimeout(() => setToastMessage(''), 3500);
              setMostrarModalEstadisticas(false);
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-xl mt-4 active:scale-95 transition-transform cursor-pointer"
          >
            Confirmar Carga y Finalizar Partido
          </button>
        </div>
      )}

      {/* Modal Al Radar: Pregunta cuántos jugadores faltan y envía alerta */}
      {mostrarModalRadar && equipo?.convocatoria && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div role="dialog" aria-modal="true" aria-label="Convocar al radar" className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setMostrarModalRadar(false)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 text-zinc-500 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase mb-1">
              <Radio className="w-4 h-4 animate-pulse" />
              Lanzar Alerta al Radar
            </div>
            <h3 className="text-xl font-black text-white mb-2">Completar Equipo</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Publicá una alerta en el mapa para que jugadores libres de la zona se sumen a este partido.
            </p>

            {/* Datos del partido */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Predio / Cancha</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {equipo.convocatoria.predioNombre || equipo.convocatoria.predio || 'Cancha confirmada'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Fecha y Horario</span>
                <span className="font-bold text-emerald-400">
                  {equipo.convocatoria.fecha}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Confirmados del equipo</span>
                <span className="font-bold text-zinc-300">
                  {(equipo.convocatoria.confirmados || []).length} jugadores
                </span>
              </div>
            </div>

            {/* Pregunta: ¿Cuántos jugadores se necesitan para completar? */}
            <div className="mb-5">
              <label className="text-xs font-black uppercase text-amber-500 block mb-3">
                ¿Cuántos jugadores se necesitan para completar?
              </label>
              
              <div className="flex items-center justify-center gap-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-3">
                <button
                  type="button"
                  onClick={() => setJugadoresFaltantes((prev) => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-2xl flex items-center justify-center transition"
                >
                  -
                </button>
                <div className="text-center min-w-[100px]">
                  <span className="text-4xl font-black text-amber-500">{jugadoresFaltantes}</span>
                  <span className="text-[11px] uppercase font-bold text-zinc-500 block mt-0.5">
                    {jugadoresFaltantes === 1 ? 'jugador' : 'jugadores'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setJugadoresFaltantes((prev) => Math.min(10, prev + 1))}
                  className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-2xl flex items-center justify-center transition"
                >
                  +
                </button>
              </div>

              {/* Botones de selección rápida */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setJugadoresFaltantes(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                      jugadoresFaltantes === num
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Posición sugerida */}
            <div className="mb-5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-2">
                Posición que buscan (opcional)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['Cualquiera', 'Arquero', 'Defensor', 'Mediocampista', 'Delantero'].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosicionRadar(pos)}
                    className={`py-2 px-1 text-[11px] rounded-xl font-bold truncate transition ${
                      posicionRadar === pos
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista previa del mensaje */}
            <div className="bg-zinc-950/80 border border-blue-500/30 rounded-2xl p-3.5 mb-5">
              <div className="text-[11px] font-black uppercase text-blue-400 mb-1">Mensaje en el Radar</div>
              <p className="text-xs text-zinc-300 italic font-medium leading-relaxed">
                "📢 ¡No completamos! Necesitamos a los {jugadoresFaltantes} jugadores necesarios para jugar en{' '}
                {equipo.convocatoria.predioNombre || equipo.convocatoria.predio || 'el predio'} (
                {equipo.convocatoria.canchaNombre || equipo.convocatoria.cancha || 'Cancha'}). Fecha: {equipo.convocatoria.fecha}. ¡Sumate a {equipo.nombre}!"
              </p>
            </div>

            {/* Botón de acción */}
            <button
              onClick={handleEnviarAlRadar}
              disabled={enviandoAlRadar}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-4 rounded-xl text-sm transition active:scale-95 disabled:opacity-60 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              {enviandoAlRadar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  Enviar Alerta al Radar
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Cierre de Screen7MyTeam */}
    </div>
  );
};

// ==========================================
// PANTALLA 8: Registro de Complejo
// ==========================================
// PANTALLA 8: Alta de Predio
// ==========================================
export const Screen8VenueRegistration = () => {
  const navigate = useNavigate();
  const sesion = useSesion();
  const [cargando, setCargando] = useState(false);
  const { location, requestLocation } = useGeolocation();

  React.useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    barrio: 'Centro',
    ciudad: 'Buenos Aires',
    telefono: '',
    tipoSena: 'fijo' as 'fijo' | 'porcentaje',
    montoSena: '4000',
    porcentajeSena: '50',
    alias: '',
    titular: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!sesion.user) return;
    setCargando(true);
    try {
      const { crearPredio } = await import('@/modules/predios/repositorio');
      const senaNum = Number(formData.montoSena);
      const pctNum = Number(formData.porcentajeSena);
      await crearPredio({
        nombre: formData.nombre || 'Mi Complejo',
        direccion: formData.direccion || 'Av. Siempre Viva 123',
        barrio: formData.barrio,
        ciudad: formData.ciudad,
        telefono: formData.telefono || '1122334455',
        cobro: { 
          cbu: null, 
          alias: formData.alias.trim(), 
          titular: formData.titular.trim(), 
          tipoSena: formData.tipoSena,
          montoSena: senaNum > 0 ? senaNum : MONTO_SENA_DEFAULT,
          porcentajeSena: pctNum > 0 ? Math.min(100, pctNum) : 50
        },
        duenoUid: sesion.user.uid,
        punto: { 
          lat: location.latitude ?? -34.6037, 
          lng: location.longitude ?? -58.3816 
        }
      });
      navigate('/venue-dashboard');
    } catch (err) {
      console.error('Error creando predio:', err);
      setCargando(false);
    }
  };

  return (
    <div className="h-full bg-transparent p-6 flex flex-col font-sans text-zinc-100 pb-28 md:pb-8 overflow-y-auto">
      <CargandoFulbeando visible={cargando} />
      <h2 className="text-2xl font-black mt-2 text-white">Da de alta tu Complejo</h2>
      <p className="text-zinc-400 text-sm mt-1 mb-6">Completá los datos para aparecer en el radar de los jugadores.</p>

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Nombre del Predio</label>
          <input aria-label="Nombre del complejo" name="nombre" value={formData.nombre} onChange={handleChange} type="text" placeholder="Ej: El Templo del Fútbol" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder:text-zinc-500 text-sm font-medium" />
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Dirección</label>
          <input aria-label="Dirección" name="direccion" value={formData.direccion} onChange={handleChange} type="text" placeholder="Dirección exacta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder:text-zinc-500 text-sm font-medium" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Barrio / Localidad</label>
            <input aria-label="Barrio / localidad" name="barrio" value={formData.barrio} onChange={handleChange} type="text" placeholder="Ej: Palermo" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder:text-zinc-500 text-sm font-medium" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Ciudad</label>
            <input aria-label="Ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} type="text" placeholder="Ej: CABA" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder:text-zinc-500 text-sm font-medium" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Ubicación GPS</label>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm">
              {location.loading ? (
                <span className="text-amber-500 font-bold">Obteniendo ubicación...</span>
              ) : location.latitude && location.longitude ? (
                <span className="text-emerald-500 font-bold">📍 Coordenadas capturadas</span>
              ) : (
                <span className="text-zinc-500">No se detectó ubicación</span>
              )}
            </div>
            <button onClick={requestLocation} disabled={location.loading} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer">
              Actualizar
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Teléfono de Contacto</label>
          <input aria-label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} type="tel" placeholder="Ej: 11 1234 5678" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder:text-zinc-500 text-sm font-medium" />
        </div>

        <div className="pt-4 border-t border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Cobro de Seña y Datos Bancarios
          </h3>
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Modalidad de la Seña</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoSena: 'fijo' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  formData.tipoSena === 'fijo'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                💵 Monto Fijo ($)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoSena: 'porcentaje' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  formData.tipoSena === 'porcentaje'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                📊 Porcentaje (%)
              </button>
            </div>
            {formData.tipoSena === 'fijo' ? (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Monto de la Seña Fija ($)</label>
                <input aria-label="Monto de la seña" name="montoSena" value={formData.montoSena} onChange={handleChange} type="number" min="0" step="500" placeholder="Ej: 4000" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-emerald-400" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Porcentaje de Seña (%)</label>
                <input aria-label="Porcentaje de la seña" name="porcentajeSena" value={formData.porcentajeSena} onChange={handleChange} type="number" min="5" max="100" step="5" placeholder="Ej: 50" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-emerald-400" />
              </div>
            )}
            <p className="text-[11px] text-zinc-500 mt-1">Monto que debe transferir el jugador para congelar la reserva.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Alias (MP / Banco)</label>
              <input aria-label="Alias de transferencia" name="alias" value={formData.alias} onChange={handleChange} type="text" placeholder="Ej: complejo.mp" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-mono text-sm text-white placeholder:text-zinc-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Titular de la cuenta</label>
              <input aria-label="Titular de la cuenta" name="titular" value={formData.titular} onChange={handleChange} type="text" placeholder="Ej: Juan Pérez" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Botón con margen inferior suficiente para no quedar tapado por la barra de navegación en celulares */}
      <div className="pt-6 pb-4 mt-4">
        <button 
          onClick={handleSubmit} 
          disabled={cargando} 
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {cargando ? 'GUARDANDO COMPLEJO...' : 'GUARDAR Y CONTINUAR'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 9: Suscripción de Predio
// ==========================================
export const Screen9VenueSubscription = () => {
  const navigate = useNavigate();
  return (
    <div className="h-full bg-transparent p-6 flex flex-col items-center justify-center font-sans text-slate-800 text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
        <Building className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-3xl font-black mb-2 text-slate-900">Activá tu Predio</h2>
      <p className="text-slate-500 text-sm px-4 mb-8">Para figurar en el radar y recibir partidos automáticos, requerimos una suscripción mensual.</p>
      
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-left">
        <h3 className="font-bold text-emerald-500 mb-4">Membresía PRO</h3>
        <p className="text-2xl font-black mb-1">$5.000 <span className="text-sm text-zinc-500 font-normal">/mes</span></p>
        <ul className="text-sm text-zinc-400 space-y-2 mt-6 mb-8">
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Presencia en el Radar en vivo</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Gestión de reservas inteligente</li>
        </ul>
        
        <button onClick={() => navigate('/venue-dashboard')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
          Ir a Mi Panel de Canchas
        </button>
      </div>
    </div>
  );
};

// ==========================================
// PANTALLA 10: Dashboard Dueño
// ==========================================
export const Screen10VenueDashboard = () => {
  return (
    <div className="mx-auto h-full w-full max-w-3xl bg-zinc-950 p-6 font-sans text-white">
      <header className="flex justify-between items-center mb-8 mt-4">
        <div>
          <h1 className="text-2xl font-black">El Templo 🏟️</h1>
          <p className="text-emerald-500 text-xs font-bold uppercase mt-1">Activo en el Radar</p>
        </div>
        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-emerald-500 border border-emerald-500/30">
          4.8
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Partidos Hoy</p>
          <p className="text-2xl font-black">3</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Solicitudes</p>
          <p className="text-2xl font-black text-amber-500">2 Nuevas</p>
        </div>
      </div>

      <h2 className="text-sm font-bold text-zinc-500 uppercase mb-4">Bandeja de Entrada</h2>
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-full text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Desafío: La Scaloneta</h3>
            <p className="text-xs text-zinc-400 mt-1">Hoy 20:00hs • F5 Sintético</p>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>
    </div>
  );
};
