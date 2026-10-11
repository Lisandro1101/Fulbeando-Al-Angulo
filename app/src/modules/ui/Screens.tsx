import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Building, Share2, CheckCircle, Search, Calendar, ChevronRight, Settings, Download, X } from 'lucide-react';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader';
import { ingresoConGoogle, ingresoConEmail, registroConEmail } from '@/modules/auth/servicio';
import { useSesion } from '@/modules/auth/useSesion';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { MONTO_SENA_DEFAULT } from '@/core/config';
import { requestNotificationPermission } from '@/modules/notifications/pushService';
import { useGeolocation } from '@/hooks/useGeolocation';
import { obtenerEquiposDeUsuario, obtenerEquipoPorId, actualizarEquipo, buscarJugadores, crearEquipo, delegarCapitania, liberarMiembro, salirDelEquipo, unirseAEquipo } from '@/modules/teams/teamService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { edadDe, MAX_MEMBROS_EQUIPO, MAX_EQUIPOS_POR_JUGADOR, nombreCompleto, PERFIL_DEPORTIVO_VACIO, type PerfilDeportivo, type Posicion, type PlayerRole } from '@/domain';
import { optimizeAvatarImage } from '@/imageCompressor';
import { uploadImageToR2 } from '@/uploader';

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

  React.useEffect(() => {
    if (sesion.usuario && !sesion.cargando) {
      // Intentar pedir permiso automáticamente si el usuario ya está logueado
      requestNotificationPermission(sesion.usuario.uid).catch(e => console.log('Auto-prompt blocked', e));
      // El superadmin no entra a la app: su unico destino es el panel.
      navigate(sesion.usuario.rol === 'superadmin' ? '/superadmin' : '/radar');
    }
  }, [sesion.usuario, sesion.cargando, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setCargando(true);
      setError(null);
      await ingresoConGoogle();
      // Con signInWithRedirect, la app navegará a la página de Google y volverá.
      // No hacemos navigate() manual acá.
    } catch (err) {
      console.error('Error al iniciar con Google:', err);
      setError('Hubo un error al iniciar sesión. Intentá de nuevo.');
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
      // Si la sesion todavia no cargo, el effect de arriba corrige el destino.
      navigate(sesion.usuario?.rol === 'superadmin' ? '/superadmin' : '/radar');
    } catch (err: any) {
      console.error('Error en autenticación por email:', err);
      let msj = 'Hubo un error al autenticar.';
      if (err.code === 'auth/email-already-in-use') msj = 'El correo ya está registrado. Ingresá en lugar de registrarte.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') msj = 'Correo o contraseña incorrectos.';
      if (err.code === 'auth/weak-password') msj = 'La contraseña es muy débil (mínimo 6 caracteres).';
      setError(msj);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col justify-center items-center p-6 text-white font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter">AL ÁNGULO</h1>
          <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs mt-2">El Potrero Digital</p>
        </div>
        
        {error && <div className="text-red-500 text-sm text-center font-bold bg-red-500/10 py-2 rounded-lg">{error}</div>}

        <form className="space-y-4" onSubmit={handleEmailAuth}>
          {isRegister && (
            <div className="flex gap-2">
              <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
              <input type="text" placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
            </div>
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
          
          <button type="submit" disabled={cargando} className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition disabled:opacity-50">
            {cargando ? 'PROCESANDO...' : (isRegister ? 'REGISTRARME' : 'INGRESAR')}
          </button>
        </form>
        
        <div className="text-center">
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(null); }} className="text-sm text-zinc-400 font-semibold hover:text-white transition">
            {isRegister ? '¿Ya tenés cuenta? Ingresá acá' : '¿No tenés cuenta? Registrate gratis'}
          </button>
        </div>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-semibold">O</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          disabled={cargando}
          className="w-full bg-white text-zinc-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
          {cargando ? 'Conectando...' : 'Continuar con Google'}
        </button>
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
    <div className="h-full bg-zinc-950 p-6 flex flex-col justify-center font-sans">
      <h2 className="text-2xl font-black text-white text-center mb-8">¿Cómo vas a jugar hoy?</h2>

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm font-bold text-red-500">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Card Jugador */}
        <button 
          onClick={() => elegirRol('jugador', '/onboarding-player')} 
          disabled={cargando}
          className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-500 transition group text-left disabled:opacity-50"
        >
          <div className="bg-zinc-800 p-3 rounded-full text-blue-500 group-hover:bg-blue-500 group-hover:text-zinc-950 transition">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Soy Jugador</h3>
            <p className="text-sm text-zinc-400 mt-1">Armá tu carta, fichá en equipos y desafiá rivales en tu barrio.</p>
          </div>
        </button>

        {/* Card Dueño */}
        <button 
          onClick={() => elegirRol('dueno_predio', '/venue-registration')} 
          disabled={cargando}
          className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-500 transition group text-left disabled:opacity-50"
        >
          <div className="bg-zinc-800 p-3 rounded-full text-emerald-500 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Tengo un Complejo</h3>
            <p className="text-sm text-zinc-400 mt-1">Promocioná tus canchas en el radar y recibí partidos.</p>
            <p className="mt-2 text-xs font-semibold text-emerald-500">
              Te pasamos el contacto para activar el plan
            </p>
          </div>
        </button>
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

  // --- ZONAS Y LOCALIDADES PARA ESCALAR ---
  const ZONAS_OPERATIVAS: Record<string, string[]> = {
    "GBA Zona Sur": [
      'Alejandro Korn', 'Adrogué', 'Avellaneda', 'Banfield', 'Burzaco', 
      'Canning', 'Ezeiza', 'Glew', 'Guernica', 'Lanús', 'Llavallol', 
      'Lomas de Zamora', 'Longchamps', 'Luis Guillón', 'Monte Grande', 
      'San Vicente', 'Temperley'
    ],
    "CABA (Próximamente)": [
      'Caballito', 'Palermo', 'Villa Crespo'
    ],
    "GBA Oeste (Próximamente)": [
      'Ramos Mejía', 'Morón', 'Castelar'
    ]
  };

  const [zonaSeleccionada, setZonaSeleccionada] = useState("GBA Zona Sur");
  const [localidadQuery, setLocalidadQuery] = useState('');
  const [localidadElegida, setLocalidadElegida] = useState('Lomas de Zamora');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Precargar datos de la sesión del usuario (sea de Google o de Email)
  React.useEffect(() => {
    if (sesion.usuario) {
      if (!apodo) setApodo(sesion.usuario.nombre || sesion.user?.displayName?.split(' ')[0] || '');
      if (!telefono && sesion.usuario.telefono) setTelefono(sesion.usuario.telefono);
      if (!fechaNacimiento && sesion.usuario.fechaNacimiento) setFechaNacimiento(sesion.usuario.fechaNacimiento);
      if (sesion.usuario.zona) setLocalidadElegida(sesion.usuario.zona);
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

  // Filtrado reactivo de localidades según zona y texto ingresado
  const localidadesDisponibles = ZONAS_OPERATIVAS[zonaSeleccionada] || [];
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
      await updateDoc(userRef, {
        nombre: apodo.trim() || sesion.usuario?.nombre || sesion.user.displayName?.split(' ')[0] || 'Jugador',
        fechaNacimiento,
        telefono: telefono.trim() || null,
        zona: localidadElegida,
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
    <div className="h-full bg-zinc-950 p-6 flex flex-col font-sans text-white pb-safe overflow-y-auto">
      <h2 className="text-2xl font-black mt-8">Creá tu Carta de Jugador</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-6">
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
          <label className="text-xs font-bold text-zinc-500 uppercase">Apodo Futbolero (En la Carta)</label>
          <input 
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
            <label className="text-xs font-bold text-zinc-500 uppercase">Fecha de Nacimiento</label>
            <span className="text-[11px] text-zinc-400">Calcula tu edad en la ficha</span>
          </div>
          <input 
            value={fechaNacimiento} 
            onChange={e => setFechaNacimiento(e.target.value)} 
            type="date" 
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition font-bold" 
          />
        </div>

        {/* TELÉFONO */}
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Número de Teléfono (WhatsApp / Opcional)</label>
          <input 
            value={telefono} 
            onChange={e => setTelefono(e.target.value)} 
            type="tel" 
            placeholder="+54 11 1234-5678" 
            className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-emerald-500 outline-none font-bold text-lg" 
          />
        </div>
        
        {/* SELECTOR ZONA + BUSCADOR DE LOCALIDADES */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Región</label>
            <select 
              value={zonaSeleccionada}
              onChange={(e) => { 
                setZonaSeleccionada(e.target.value); 
                setLocalidadElegida(''); // Resetear localidad al cambiar de zona
              }}
              className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-emerald-500 outline-none font-bold text-sm text-white appearance-none"
            >
              {Object.keys(ZONAS_OPERATIVAS).map(zona => (
                <option key={zona} value={zona} className="bg-zinc-900">{zona}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="text-xs font-bold text-zinc-500 uppercase">Barrio / Localidad</label>
            <div 
              className="w-full border-b border-zinc-700 py-2 font-bold text-sm text-white cursor-pointer flex justify-between items-center"
              onClick={() => { setMostrarBuscador(true); setLocalidadQuery(''); }}
            >
              <span>{localidadElegida || 'Buscar...'}</span>
              <Search className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Modal/Dropdown Buscador */}
            {mostrarBuscador && (
              <div className="absolute top-14 left-0 w-[200%] sm:w-[150%] -translate-x-1/2 sm:translate-x-0 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl p-3 z-50">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Escribí tu barrio..." 
                  value={localidadQuery}
                  onChange={(e) => setLocalidadQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 mb-2"
                />
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {localidadesFiltradas.length > 0 ? (
                    localidadesFiltradas.map(loc => (
                      <div 
                        key={loc} 
                        onClick={() => { setLocalidadElegida(loc); setMostrarBuscador(false); }}
                        className="py-2 px-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        {loc}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 p-2 text-center">No se encontraron localidades</div>
                  )}
                </div>
                <button 
                  onClick={() => setMostrarBuscador(false)} 
                  className="w-full mt-2 py-1 text-xs text-zinc-500 font-bold hover:text-white"
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
  const apodo = sesion.usuario?.nombre || 'EL RÚSTICO';
  const emojiFoto = sesion.usuario?.fotoUrl || '⚽';
  const [equipoJugador, setEquipoJugador] = useState<any>(null);

  React.useEffect(() => {
    if (sesion.user) {
      obtenerEquiposDeUsuario(sesion.user.uid).then(t => {
        if (t.length > 0) setEquipoJugador(t[0]);
      }).catch(console.error);
    }
  }, [sesion.user]);
  
  const { isInstallable, promptInstall } = useInstallPrompt();

  // Edad derivada de la fecha de nacimiento: se calcula en lectura, sin escrituras.
  const edad = (sesion.usuario ? edadDe(sesion.usuario) : null) ?? '--';
  const posicion = sesion.usuario?.perfilDeportivo?.posicion;
  const pos = posicion ? posicion.slice(0, 3).toUpperCase() : '--';
  const piernaHabil = sesion.usuario?.perfilDeportivo?.piernaHabil;
  const pierna = piernaHabil ? piernaHabil.slice(0, 3).toUpperCase() : '--';
  // GOL / PAR / ASI y el promedio quedan RESERVADOS hasta que exista historial
  // de partidos: los numeros del seed son de prueba y no van en la ficha.
  const reservado = '--';
  const equipoNombre = equipoJugador?.name ?? '';

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28 flex flex-col items-center">
        
        <div className="absolute top-6 right-6 flex gap-2 z-10">
          {isInstallable && (
            <button onClick={() => {
              promptInstall();
              if(sesion.usuario) requestNotificationPermission(sesion.usuario.uid).catch(e => console.log('Auto-prompt blocked on install', e));
            }} className="flex items-center gap-1 bg-emerald-500 text-zinc-950 px-3 py-2 rounded-full font-bold text-xs active:scale-95 transition-transform">
              <Download className="w-4 h-4" /> Instalar
            </button>
          )}
          <button onClick={() => navigate('/ajustes')} className="text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-900 p-2 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-min mt-8">
        <div className="relative w-64 h-[24rem] shrink-0 drop-shadow-[0_15px_25px_rgba(245,158,11,0.4)]" style={{ clipPath: "url(#ficha-dorada)" }}>
          {/* La misma silueta del polygon de siempre (15% 0 / 85% 0 / ... /
              50% 100%) pero con cada vertice redondeado. Esta en SVG (no en
              clip-path: path()) porque Safari no soporta path(). Con
              objectBoundingBox la forma se escala sola: si cambia el ancho o
              el alto de la ficha, no hay que recalcular nada. */}
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <clipPath id="ficha-dorada" clipPathUnits="objectBoundingBox">
                <path d="M .2047 0 L .7953 0 Q .85 0 .8887 .0258 L .9613 .0742 Q 1 .1 1 .1365 L 1 .8135 Q 1 .85 .95 .8648 L .55 .9852 Q .5 1 .45 .9852 L .05 .8648 Q 0 .85 0 .8135 L 0 .1365 Q 0 .1 .0387 .0742 L .1113 .0258 Q .15 0 .2047 0 Z" />
              </clipPath>
            </defs>
          </svg>
          <div className="relative h-full w-full bg-gradient-to-br from-[#f9d976] via-[#e6b741] to-[#b38020] flex flex-col p-4 text-[#2c2005] font-sans">
            {/* Background Texture/Shines */}
            <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}></div>
            
            {/* Top Left Stats & Position */}
            <div className="absolute top-6 left-5 flex flex-col items-center z-10">
              <div className="text-5xl font-black tracking-tighter leading-none opacity-40" title="Próximamente: promedio de la temporada">{reservado}</div>
              <div className="text-xl font-bold uppercase tracking-widest mt-1">{pos}</div>
              <div className="w-8 h-[2px] bg-[#5c4a1e] mt-1 mb-1"></div>
              <div className="w-8 h-6 flex items-center justify-center">
                <span className="text-2xl">🇦🇷</span>
              </div>
              {equipoJugador?.shieldUrl && (
                <div className="mt-1 w-8 h-8 flex items-center justify-center text-xl bg-zinc-900/10 rounded-full overflow-hidden">
                  <img src={equipoJugador.shieldUrl} alt={`Escudo de ${equipoJugador.name}`} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Player Image / Emoji */}
            <div className="mt-2 w-full h-40 flex items-end justify-center z-0">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border-4 border-[#e6b741] drop-shadow-lg">
                {emojiFoto?.startsWith('http') ? (
                  <img src={emojiFoto} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{emojiFoto}</span>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="mt-1 w-full text-center z-10 flex flex-col items-center">
              <div className="w-48 h-[1px] bg-[#7a6427]/60 mb-1"></div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-[#1a1303] truncate w-full px-2">{apodo}</h2>
              <div className="w-48 h-[1px] bg-[#7a6427]/60 mt-1"></div>
            </div>

            {/* Stats Grid */}
            <div className="w-full mt-2 grid grid-cols-[1fr_auto_1fr] gap-x-2 text-[#2c2005] font-bold text-sm px-4 z-10">
              {/* Left Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">EDAD</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{edad}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">GOL</span>
                  <span className="text-lg font-black leading-none w-8 text-right opacity-40" title="Próximamente: historial de partidos">{reservado}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">PAR</span>
                  <span className="text-lg font-black leading-none w-8 text-right opacity-40" title="Próximamente: historial de partidos">{reservado}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-[#7a6427]/40 h-full"></div>

              {/* Right Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">PIE</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{pierna}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">ASI</span>
                  <span className="text-lg font-black leading-none w-8 text-right opacity-40" title="Próximamente: historial de partidos">{reservado}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">POS</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{pos}</span>
                </div>
              </div>
            </div>

            {/* Footer: el equipo del jugador; sin equipo, la marca. Con mb-16
                sube fuera de la punta de la ficha: abajo del todo el clip lo
                comia y el nombre del equipo se cortaba. */}
            <div className="mt-auto mb-16 pt-2 w-full flex flex-col items-center justify-center opacity-80 z-10">
              <div className="text-[10px] font-black tracking-[0.2em] uppercase truncate w-full text-center">
                {equipoNombre || 'Fulbeando'}
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="w-full max-w-sm mt-8 space-y-3 shrink-0">
          <button 
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: '¡Mirá mi carta en Fulbeando!',
                    text: '¡Esta es mi carta de jugador en Fulbeando! Entrá a ver mis estadísticas y armemos un equipo.',
                    url: window.location.href,
                  });
                } catch (err) {
                  console.error('Error sharing:', err);
                }
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('¡Enlace a tu perfil copiado al portapapeles!');
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-zinc-300 font-semibold py-3 rounded-xl active:scale-95 transition-transform"
          >
            <Share2 className="w-4 h-4" /> Compartir mi racha
          </button>
        </div>
      </div>


      <MenuNavegacion />
    </div>
  );
};
// ==========================================
// PANTALLA 5: Tus Reservas / Turnos
// ==========================================
export const Screen5Reservas = () => {
  return (
    <div className="h-full bg-zinc-950 flex flex-col font-sans">
      <div className="shrink-0">
        <NavegacionHeader />
      </div>
      <div className="flex-1 p-6 flex flex-col justify-center items-center pb-24 text-center">
        <Calendar className="w-16 h-16 text-emerald-500 mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Tus Reservas</h2>
        <p className="text-zinc-400 text-sm max-w-[280px]">
          Acá vas a poder ver todos los turnos que tenés reservados o en espera de confirmación.
        </p>
      </div>
      <MenuNavegacion />
    </div>
  );
};

// ==========================================
// PANTALLA 6: Partidos y Desafíos
// ==========================================
export const Screen6LaunchChallenge = () => {
  const navigate = useNavigate();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modalidad, setModalidad] = useState('F5');
  const [diaHora, setDiaHora] = useState('');
  const [cancha, setCancha] = useState('Sí, ya la alquilamos');
  
  const [partidos, setPartidos] = useState([
    { id: 1, modalidad: 'F5', diaHora: 'Jueves 21:00hs', cancha: 'Sí, ya la alquilamos', estado: 'Confirmado', rival: 'Los Pibes' },
    { id: 2, modalidad: 'F7', diaHora: 'Sábado 18:00hs', cancha: 'No, buscamos cancha a medias', estado: 'En Radar', rival: null }
  ]);

  const [toastMessage, setToastMessage] = useState('');

  const handlePublicar = () => {
    if (!diaHora) return;
    
    let fechaFormateada = diaHora;
    const dateObj = new Date(diaHora);
    if (!isNaN(dateObj.getTime())) {
      fechaFormateada = dateObj.toLocaleString('es-AR', { weekday: 'long', hour: '2-digit', minute:'2-digit' });
    }

    const nuevoPartido = {
      id: Date.now(),
      modalidad,
      diaHora: fechaFormateada,
      cancha,
      estado: 'En Radar',
      rival: null
    };
    setPartidos([nuevoPartido, ...partidos]);
    setMostrarFormulario(false);
    setToastMessage('Partido publicado en el Radar');
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-sm z-[9999] animate-bounce shadow-xl border-2 border-zinc-950">
            {toastMessage}
          </div>
        )}

      {!mostrarFormulario ? (
        <>
          <div className="flex justify-between items-center mb-6 mt-4">
            <h2 className="text-2xl font-black text-amber-500">Mis Partidos</h2>
            <button 
              onClick={() => setMostrarFormulario(true)}
              className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors"
            >
              + Lanzar Desafío
            </button>
          </div>

          <div className="space-y-4">
            {partidos.length === 0 && (
              <div className="text-center py-8 text-zinc-500 font-bold border border-zinc-800 rounded-2xl border-dashed">
                Aún no tenés partidos ni desafíos activos.
              </div>
            )}
            {partidos.map(p => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-black">{p.modalidad}</span>
                    <h3 className="font-bold">{p.rival ? `vs ${p.rival}` : 'Buscando rival...'}</h3>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${p.estado === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
                    {p.estado}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 font-bold mt-2">{p.diaHora}</p>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-zinc-500">{p.cancha}</p>
                  {p.cancha.includes('buscamos') && (
                    <button 
                      onClick={() => navigate('/radar', { state: { matchId: p.id, teamName: p.rival || 'Mi Equipo', fromAlAngulo: true } })}
                      className="bg-amber-500 text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-black shadow-md hover:scale-105 transition-transform"
                    >
                      Reservar Cancha
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setMostrarFormulario(false)} className="text-zinc-500 text-sm font-bold mb-6">← Volver</button>
          <h2 className="text-2xl font-black text-amber-500 mb-6">Lanzar Desafío al Radar</h2>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Modalidad</label>
              <div className="flex gap-2 mt-2">
                {['F5', 'F7', 'F11'].map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setModalidad(m)}
                    className={`flex-1 py-3 rounded-xl font-black transition-colors ${m === modalidad ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Día y Hora</label>
              <input 
                type="datetime-local" 
                value={diaHora}
                onChange={(e) => setDiaHora(e.target.value)}
                className="w-full bg-zinc-900 border-none rounded-xl px-4 py-3 mt-2 text-white outline-none" 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">¿Tienen Cancha?</label>
              <select 
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                className="w-full bg-zinc-900 border-none rounded-xl px-4 py-3 mt-2 text-white outline-none"
              >
                <option>Sí, ya la alquilamos</option>
                <option>No, buscamos cancha a medias</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handlePublicar}
            disabled={!diaHora}
            className={`w-full font-black py-4 rounded-xl mt-8 transition-all ${diaHora ? 'bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            PUBLICAR EN RADAR
          </button>
        </>
      )}
      </div>

      <MenuNavegacion />
    </div>
  );
};

// ==========================================
// PANTALLA 7: Pestaña Mi Equipo
// ==========================================
export const Screen7MyTeam = () => {
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [mostrarModalConvocatoria, setMostrarModalConvocatoria] = useState(false);
  const [mostrarModalEstadisticas, setMostrarModalEstadisticas] = useState(false);
  const [statsPartido, setStatsPartido] = useState<Record<string, { goles: number, asistencias: number }>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [convFecha, setConvFecha] = useState('Jueves 21:00hs');
  const [inviteUsername, setInviteUsername] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Busqueda de jugadores REAL (Firestore). Antes había un `mockUsuarios`
  // inventado: "Enviar Notificación" no escribía nada en ninguna parte.
  const [usuariosBuscados, setUsuariosBuscados] = useState<
    Array<{ uid: string; username: string; apodo: string; emoji: string }>
  >([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<
    { uid: string; username: string; apodo: string; emoji: string } | null
  >(null);
  const [buscando, setBuscando] = useState(false);
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
      soyMiembro: t.members.some((m: any) => m.uid === sesion.user?.uid),
      plantel: t.members.map((m: any) => ({
        id: m.uid,
        username: m.name,
        apodo: m.name,
        emoji: m.uid === t.captainId ? '👑' : '🏃‍♂️',
        // Fuente estructural de la capitania: `captainId`. El `role` del
        // documento puede traer datos viejos y no tiene por que coincidir.
        isCapitan: m.uid === t.captainId,
      })),
      convocatoria: null,
    }),
    [sesion.user?.uid],
  );

  /** Vuelve a leer "mis equipos" y devuelve cuántos hay. */
  const recargarEquipos = React.useCallback(async (): Promise<number> => {
    if (!sesion.user) return 0;
    const dbTeams = await obtenerEquiposDeUsuario(sesion.user.uid);
    setEquipos(dbTeams.map(mapearEquipo));
    setCargando(false);
    return dbTeams.length;
  }, [sesion.user, mapearEquipo]);

  React.useEffect(() => {
    if (!sesion.user) return;
    setCargando(true);
    recargarEquipos().catch((err) => {
      console.error(err);
      setCargando(false);
    });
  }, [sesion.user, recargarEquipos]);

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

  /**
   * Baja real: `salirDelEquipo` (por cuenta propia) o `liberarMiembro` (desde
   * la capitanía). Ambos escriben `teams.members` y el `teamIds` del jugador.
   */
  const handleRemovePlayer = async (teamId: string, playerId: string, isSelf: boolean) => {
    if (!sesion.user) return;
    const pregunta = isSelf
      ? '¿Estás seguro que querés salir del equipo?'
      : '¿Estás seguro que querés liberar a este jugador?';
    if (!window.confirm(pregunta)) return;

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
    if (!window.confirm('¿Cederle la capitanía a este jugador? Vos pasás a ser un jugador normal.')) return;

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
    if (termino.length < 2) {
      setUsuariosBuscados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    buscarJugadores(termino)
      .then((r) => {
        if (token !== busquedaRef.current) return;
        setUsuariosBuscados(
          r.map((m) => ({ uid: m.uid, username: m.username, apodo: m.name, emoji: m.avatarUrl || '⚽' })),
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
    const nuevosEquipos = [...equipos];
    nuevosEquipos[equipoActivo] = {
      ...equipo,
      convocatoria: {
        fecha: convFecha,
        confirmados: [],
        bajas: [],
      },
    };
    setEquipos(nuevosEquipos);
    setMostrarModalConvocatoria(false);
    setToastMessage('Convocatoria creada');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleResponderConvocatoria = (teamId: string, status: 'voy' | 'bajo') => {
    const nuevosEquipos = equipos.map(eq => {
      if(eq.id === teamId && eq.convocatoria) {
         const myPlayerId = eq.plantel.find((p: any) => p.id === currentUid)?.id;
         if(!myPlayerId) return eq;
         
         const newConf = eq.convocatoria.confirmados.filter((id: any) => id !== myPlayerId);
         const newBajas = eq.convocatoria.bajas.filter((id: any) => id !== myPlayerId);
         
         if(status === 'voy') newConf.push(myPlayerId);
         if(status === 'bajo') newBajas.push(myPlayerId);

         return { ...eq, convocatoria: { ...eq.convocatoria, confirmados: newConf, bajas: newBajas } };
      }
      return eq;
    });
    setEquipos(nuevosEquipos);
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
   * El equipo se arma con el link: las reglas de `usuarios/{uid}` no dejan que
   * el capitan escriba el perfil de un tercero, así que lo único honesto que
   * podemos hacer desde acá es dejar el link en el portapapeles.
   */
  const handleSendInvite = async () => {
    if (!usuarioSeleccionado || !equipo) return;
    try {
      await navigator.clipboard.writeText(linkDeInvitacion(equipo.id));
      aviso(`Link de invitación para ${usuarioSeleccionado.apodo} copiado`);
    } catch {
      aviso(linkDeInvitacion(equipo.id));
    }
    setInviteUsername('');
    setUsuarioSeleccionado(null);
    setUsuariosBuscados([]);
    setMostrarInvitar(false);
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
        <button onClick={() => setMostrarCrear(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
        <h3 className="text-xl font-black mb-1">Crear equipo</h3>
        <p className="text-sm text-zinc-400 mb-6">
          Quedás como capitán. Podés tener hasta {MAX_EQUIPOS_POR_JUGADOR} equipos a la vez.
        </p>

        <label className="text-xs font-bold text-zinc-500 uppercase">Nombre del equipo</label>
        <input
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

  if (cargando) return <div className="h-full bg-zinc-950 flex justify-center items-center text-white">Cargando equipos...</div>;

  if (equipos.length === 0 || !equipo) {
    return (
      <div className="h-full flex flex-col bg-zinc-950 font-sans text-white overflow-hidden relative">
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-sm shadow-xl animate-bounce">
            {toastMessage}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {bannerInvitacion}
          <div className="flex flex-col justify-center items-center p-6 text-center min-h-[60vh]">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-3xl mb-4 border border-zinc-800">🛡️</div>
            <h2 className="text-2xl font-black text-amber-500 mb-2">No tenés equipo</h2>
            <p className="text-zinc-400 mb-8">Creá un equipo para empezar a sumar estadísticas, armar convocatorias y lanzar desafíos al Radar.</p>
            <button
              onClick={() => setMostrarCrear(true)}
              className="bg-amber-500 text-zinc-950 font-black px-8 py-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-transform"
            >
              CREAR EQUIPO
            </button>
          </div>
        </div>
        {modalCrearEquipo}
        <MenuNavegacion />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-sm shadow-xl animate-bounce">
            {toastMessage}
          </div>
        )}

        {bannerInvitacion}

      {/* Selector de equipos (Tabs) */}
      <div className="flex bg-zinc-900 border-b border-zinc-800 pt-8">
        {equipos.map((eq, i) => (
          <button 
            key={eq.id} 
            onClick={() => setEquipoActivo(i)}
            className={`flex-1 py-4 text-sm font-bold uppercase transition ${equipoActivo === i ? 'text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500'}`}
          >
            {eq.nombre}
          </button>
        ))}
        {equipos.length < MAX_EQUIPOS_POR_JUGADOR && (
          <button
            onClick={() => setMostrarCrear(true)}
            className="px-4 py-4 text-sm font-bold text-zinc-500 hover:text-amber-500 transition"
            title="Crear otro equipo"
          >
            +
          </button>
        )}
      </div>

      {/* Header Equipo */}
      <div className="bg-zinc-900 p-6 pt-12 rounded-b-[40px] text-center relative border-b border-zinc-800">
        {equipo.isCapitan && (
          <button onClick={abrirConfig} className="absolute top-8 right-6 text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-800 p-3 rounded-full">
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
             <img src={equipo.emoji} alt="Escudo" className="w-full h-full object-cover" />
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
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
        />
        <h2 className="text-2xl font-black uppercase">{equipo.nombre}</h2>
            <p className="text-zinc-400 text-sm mt-1">Capitán: {equipo.capitanNombre}</p>
        <div className="flex justify-center gap-4 mt-4 text-sm font-bold">
          <div className="text-emerald-500">{equipo.w} PG</div>
          <div className="text-zinc-500">{equipo.d} PE</div>
          <div className="text-red-500">{equipo.l} PP</div>
        </div>
      </div>

      {/* Convocatoria Section */}
      <div className="px-6 pt-6">
        {equipo.convocatoria ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-black text-lg text-amber-500">Próximo Partido</h3>
                <p className="text-sm text-zinc-400 font-bold">{equipo.convocatoria.fecha}</p>
              </div>
              {equipo.isCapitan && (
                <button className="text-xs font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                  Al Radar
                </button>
              )}
            </div>
            
            {equipo.isCapitan && equipo.convocatoria.confirmados.length > 0 && (
              <button 
                onClick={() => setMostrarModalEstadisticas(true)}
                className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl active:scale-95 transition-transform mb-4"
              >
                Cargar Estadísticas del Partido
              </button>
            )}

            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-3">
              <div className="text-center flex-1">
                <div className="text-xl font-black text-emerald-500">{equipo.convocatoria.confirmados.length}</div>
                <div className="text-[10px] uppercase font-bold text-zinc-500">Confirmados</div>
              </div>
              <div className="w-px h-8 bg-zinc-800"></div>
              <div className="text-center flex-1">
                <div className="text-xl font-black text-red-500">{equipo.convocatoria.bajas.length}</div>
                <div className="text-[10px] uppercase font-bold text-zinc-500">Bajas</div>
              </div>
            </div>

            <div className="flex gap-2">
              {(() => {
                const myId = equipo.plantel.find((p: any) => p.id === currentUid)?.id;
                const confirmó = myId && equipo.convocatoria.confirmados.includes(myId);
                const seBajó = myId && equipo.convocatoria.bajas.includes(myId);
                return (
                  <>
                    <button 
                      onClick={() => handleResponderConvocatoria(equipo.id, 'voy')}
                      className={`flex-1 py-2 rounded-xl font-black text-sm transition-colors ${confirmó ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
                    >
                      ✓ Voy
                    </button>
                    <button 
                      onClick={() => handleResponderConvocatoria(equipo.id, 'bajo')}
                      className={`flex-1 py-2 rounded-xl font-black text-sm transition-colors ${seBajó ? 'bg-red-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
                    >
                      ✕ Me bajo
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          equipo.isCapitan ? (
            <button 
              onClick={() => setMostrarModalConvocatoria(true)}
              className="w-full bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
            >
              + Armar Convocatoria
            </button>
          ) : (
            <div className="text-center py-4 text-zinc-600 font-bold text-sm bg-zinc-900 rounded-2xl border border-zinc-800">
              No hay próximo partido programado
            </div>
          )
        )}
      </div>

      {/* Lista de Jugadores */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase">Plantel ({equipo.plantel.length}/{MAX_MEMBROS_EQUIPO})</h3>
          <button onClick={() => setMostrarInvitar(true)} className="text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full active:scale-95 transition-transform">+ Invitar</button>
        </div>
        
        <div className="space-y-3">
          {equipo.plantel.map((jugador: any) => {
            const isMe = jugador.id === currentUid;
            const canRemove = equipo.isCapitan && !isMe;
            const canLeave = isMe && !equipo.isCapitan;

            return (
              <div key={jugador.id} className="flex items-center gap-4 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center font-bold text-amber-500">
                  {jugador.emoji?.startsWith('http') ? (
                    <img src={jugador.emoji} alt={jugador.apodo} className="w-full h-full object-cover" />
                  ) : (
                    jugador.emoji
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{jugador.apodo}</h4>
                  <p className="text-xs text-zinc-500 font-semibold">{jugador.isCapitan ? 'CAPITÁN' : 'JUGADOR'}</p>
                </div>
                {canRemove && (
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleDelegateCaptain(equipo.id, jugador.id)}
                      className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors"
                    >
                      Hacer Capitán
                    </button>
                    <button 
                      onClick={() => handleRemovePlayer(equipo.id, jugador.id, false)}
                      className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                      Liberar
                    </button>
                  </div>
                )}
                {canLeave && (
                  <button 
                    onClick={() => handleRemovePlayer(equipo.id, jugador.id, true)}
                    className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                  >
                    Salir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Configuración */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <h3 className="text-xl font-black mb-2">Configurar Equipo</h3>
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

             <button onClick={handleGuardarConfig} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform">Guardar Cambios</button>
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {mostrarInvitar && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          {/* ... (el resto del modal invitar queda igual pero omito el contenido completo aca y lo dejo como estaba) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <button onClick={() => setMostrarInvitar(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
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
                  type="text" 
                  value={inviteUsername}
                  onChange={(e) => {
                    // Sin pasar a minúsculas: el rango de Firestore compara por
                    // code point y "lio" no matchearía contra "Lionel".
                    const val = e.target.value.slice(0, 40);
                    setInviteUsername(val);
                    setUsuarioSeleccionado(null);
                    buscarInvitados(val);
                  }}
                  className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                  placeholder="buscar por nombre o apellido"
                />
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
              {!usuarioSeleccionado && inviteUsername.trim().length >= 2 && usuariosBuscados.length === 0 && !buscando && (
                <div className="text-xs text-red-400 font-bold mb-4 px-2">No encontramos a nadie con ese nombre</div>
              )}
              {usuarioSeleccionado && (
                <div className="text-xs text-emerald-400 font-bold mb-4 px-2">
                  Invitás a {usuarioSeleccionado.apodo}. El equipo se arma con el link.
                </div>
              )}

              <button 
                onClick={handleSendInvite} 
                disabled={!usuarioSeleccionado}
                className={`w-full font-black py-4 rounded-xl transition-all mt-2 ${usuarioSeleccionado ? 'bg-amber-500 text-zinc-950 active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                Copiar link de invitación
              </button>
          </div>
        </div>
      )}

      {/* Modal Armar Convocatoria */}
      {mostrarModalConvocatoria && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <button onClick={() => setMostrarModalConvocatoria(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">✕</button>
             <h3 className="text-xl font-black mb-2">Armar Convocatoria</h3>
             <p className="text-sm text-zinc-400 mb-6">Llamá a tu equipo a jugar el próximo partido.</p>

             <label className="text-xs font-bold text-zinc-500 uppercase">Fecha y Hora</label>
             <input 
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
      <MenuNavegacion />
      {/* Modal Cargar Estadísticas */}
      {mostrarModalEstadisticas && equipo && (
        <div className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-sm p-4 flex flex-col pt-12 pb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black italic text-emerald-500">3er TIEMPO</h2>
            <button onClick={() => setMostrarModalEstadisticas(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <h3 className="font-bold text-amber-500 mb-4">Elegir MVP del Partido ⭐</h3>
              <div className="grid grid-cols-2 gap-2">
                {equipo.plantel.filter((p: any) => equipo.convocatoria?.confirmados.includes(p.id)).map((p: any) => (
                  <button 
                    key={p.id}
                    onClick={() => setMvpId(p.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${mvpId === p.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl">{p.emoji}</div>
                    <span className="text-xs font-bold text-white truncate w-full text-center">{p.apodo}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-emerald-500 mb-4">Goles y Asistencias</h3>
              <div className="space-y-2">
                {equipo.plantel.filter((p: any) => equipo.convocatoria?.confirmados.includes(p.id)).map((p: any) => {
                  const s = statsPartido[p.id] || { goles: 0, asistencias: 0 };
                  const updateStats = (field: 'goles'|'asistencias', val: number) => {
                    setStatsPartido(prev => ({...prev, [p.id]: { ...s, [field]: Math.max(0, s[field] + val) }}));
                  };
                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">{p.emoji}</div>
                      <div className="flex-1 truncate">
                        <span className="text-sm font-bold text-white block truncate">{p.apodo}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase font-bold text-zinc-500">Goles</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateStats('goles', -1)} className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-red-500">-</button>
                            <span className="font-black w-3 text-center">{s.goles}</span>
                            <button onClick={() => updateStats('goles', 1)} className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-emerald-500">+</button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase font-bold text-zinc-500">Asist.</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateStats('asistencias', -1)} className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-red-500">-</button>
                            <span className="font-black w-3 text-center">{s.asistencias}</span>
                            <button onClick={() => updateStats('asistencias', 1)} className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-amber-500">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setToastMessage('Estadísticas guardadas con éxito');
              setTimeout(() => setToastMessage(''), 3000);
              setMostrarModalEstadisticas(false);
            }}
            className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl mt-4 active:scale-95 transition-transform"
          >
            Confirmar Carga
          </button>
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
    telefono: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!sesion.user) return;
    setCargando(true);
    try {
      const { crearPredio } = await import('@/modules/predios/repositorio');
      await crearPredio({
        nombre: formData.nombre || 'Mi Complejo',
        direccion: formData.direccion || 'Av. Siempre Viva 123',
        barrio: formData.barrio,
        ciudad: formData.ciudad,
        telefono: formData.telefono || '1122334455',
        // El dueno aun no cargó datos bancarios: se dejan vacíos y `cbu` en null.
// `montoSena` es obligatorio, asi que se usa el default del proyecto.
cobro: { cbu: null, alias: '', titular: '', montoSena: MONTO_SENA_DEFAULT },
        duenoUid: sesion.user.uid,
        punto: { 
          lat: location.latitude ?? -34.6037, 
          lng: location.longitude ?? -58.3816 
        }
      });
      navigate('/venue-subscription');
    } catch (err) {
      console.error('Error creando predio:', err);
      setCargando(false);
    }
  };

  return (
    <div className="h-full bg-zinc-950 p-6 flex flex-col font-sans text-white pb-safe overflow-y-auto">
      <h2 className="text-2xl font-black mt-8">Da de alta tu Complejo</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-8">Completá los datos para aparecer en el radar de los jugadores.</p>

      <div className="space-y-6 flex-1">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nombre del Predio</label>
          <input name="nombre" value={formData.nombre} onChange={handleChange} type="text" placeholder="Ej: El Templo del Fútbol" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Dirección</label>
          <input name="direccion" value={formData.direccion} onChange={handleChange} type="text" placeholder="Dirección exacta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Barrio / Localidad</label>
            <input name="barrio" value={formData.barrio} onChange={handleChange} type="text" placeholder="Ej: Palermo" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ciudad</label>
            <input name="ciudad" value={formData.ciudad} onChange={handleChange} type="text" placeholder="Ej: CABA" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ubicación GPS</label>
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
            <button onClick={requestLocation} disabled={location.loading} className="text-xs bg-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg">
              Actualizar
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Teléfono de Contacto</label>
          <input name="telefono" value={formData.telefono} onChange={handleChange} type="tel" placeholder="Ej: 11 1234 5678" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={cargando} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl mt-6 disabled:opacity-50">
        {cargando ? 'CREANDO...' : 'CONTINUAR'}
      </button>
    </div>
  );
};

// ==========================================
// PANTALLA 9: Suscripción de Predio
// ==========================================
export const Screen9VenueSubscription = () => {
  const navigate = useNavigate();
  return (
    <div className="h-full bg-zinc-950 p-6 flex flex-col items-center justify-center font-sans text-white text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
        <Building className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-3xl font-black mb-2">Activá tu Predio</h2>
      <p className="text-zinc-400 text-sm px-4 mb-8">Para figurar en el radar y recibir partidos automáticos, requerimos una suscripción mensual.</p>
      
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-left">
        <h3 className="font-bold text-emerald-500 mb-4">Membresía PRO</h3>
        <p className="text-2xl font-black mb-1">$5.000 <span className="text-sm text-zinc-500 font-normal">/mes</span></p>
        <ul className="text-sm text-zinc-400 space-y-2 mt-6 mb-8">
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Presencia en el Radar en vivo</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Gestión de reservas inteligente</li>
        </ul>
        
        <button onClick={() => navigate('/venue-dashboard')} className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl flex items-center justify-center gap-2">
          Abonar y Activar
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
    <div className="h-full bg-zinc-950 p-6 font-sans text-white">
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
