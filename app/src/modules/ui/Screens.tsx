import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building, Share2, UploadCloud, MapPinned, Users, CheckCircle, Search, Calendar, ChevronRight, Settings, Download, Bell } from 'lucide-react';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { ingresoConGoogle, ingresoConEmail, registroConEmail, cerrarSesion } from '@/modules/auth/servicio';
import { useSesion } from '@/modules/auth/useSesion';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { requestNotificationPermission } from '@/modules/notifications/pushService';

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
      navigate('/radar');
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
      navigate('/radar');
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
  const navigate = useNavigate();
  const sesion = useSesion();
  const [cargando, setCargando] = useState(false);

  const elegirRol = async (rol: 'jugador' | 'dueno_predio', path: string) => {
    if (!sesion.usuario) return;
    setCargando(true);
    try {
      const { cambiarRol } = await import('@/modules/usuarios/repositorio');
      await cambiarRol(sesion.usuario.uid, rol);
      window.location.href = path; // Redirige y fuerza recarga para actualizar la sesión
    } catch (err) {
      console.error(err);
      setCargando(false);
    }
  };

  return (
    <div className="h-full bg-zinc-950 p-6 flex flex-col justify-center font-sans">
      <h2 className="text-2xl font-black text-white text-center mb-8">¿Cómo vas a jugar hoy?</h2>
      
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
  const navigate = useNavigate();
  const [pos, setPos] = useState('DEL');

  const [formData, setFormData] = useState({
    nombre: 'Lionel Andrés', 
    apellido: 'Messi',      
    telefono: '',
    fechaNacimiento: '',
    apodo: 'Lio'
  });

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
  const [localidadElegida, setLocalidadElegida] = useState('Guernica');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Filtrado reactivo de localidades según zona y texto ingresado
  const localidadesDisponibles = ZONAS_OPERATIVAS[zonaSeleccionada] || [];
  const localidadesFiltradas = localidadesDisponibles.filter(loc => 
    loc.toLowerCase().includes(localidadQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-full bg-zinc-950 p-6 flex flex-col font-sans text-white pb-safe">
      <h2 className="text-2xl font-black mt-8">Creá tu Carta de Jugador</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-8">Revisá y completá tus datos base. Arrancás con Media 50%.</p>

      <div className="space-y-6 flex-1">
        
        {/* DATOS PERSONALES */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre</label>
            <input name="nombre" value={formData.nombre} onChange={handleChange} type="text" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-base text-zinc-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Apellido</label>
            <input name="apellido" value={formData.apellido} onChange={handleChange} type="text" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-base text-zinc-300" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Número de Teléfono</label>
          <input name="telefono" value={formData.telefono} onChange={handleChange} type="tel" placeholder="+54 11 1234-5678" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg" />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Fecha de Nacimiento</label>
          <input name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg text-white" />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase">Apodo Futbolero (En la Carta)</label>
          <input name="apodo" value={formData.apodo} onChange={handleChange} type="text" placeholder="Ej: El Rústico" className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-lg text-amber-500" />
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
              className="w-full bg-transparent border-b border-zinc-700 py-2 focus:border-blue-500 outline-none font-bold text-sm text-white appearance-none"
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
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 mb-2"
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

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Posición en la Cancha</label>
          <div className="flex gap-2">
            {['ARQ', 'DEF', 'MED', 'DEL'].map(p => (
              <button key={p} onClick={() => setPos(p)} className={`flex-1 py-3 rounded-xl font-black ${pos === p ? 'bg-blue-500 text-zinc-950 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900 text-zinc-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/perfil')} className="w-full bg-white text-zinc-950 font-black py-4 rounded-xl mt-6 active:scale-95 transition">
        GENERAR MI CARTA
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
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [apodo, setApodo] = useState('EL RÚSTICO');
  const [username, setUsername] = useState('el_rustico');
  const [emojiFoto, setEmojiFoto] = useState('⚽');
  
  const { isInstallable, promptInstall } = useInstallPrompt();

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
          <button onClick={() => setMostrarConfig(true)} className="text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-900 p-2 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-min mt-8">
        <div className="relative w-64 h-96 shrink-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl p-1 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <div className="relative h-full w-full bg-zinc-900 rounded-[22px] flex flex-col items-center p-6 text-white border-4 border-amber-400/30">
            <div className="absolute top-4 left-4 text-3xl font-black text-amber-400">50</div>
            <div className="absolute top-12 left-5 text-sm font-bold text-zinc-400">DEL</div>
            <div className="mt-8 mb-4 w-32 h-32 rounded-full bg-zinc-800 border-4 border-amber-400 flex items-center justify-center text-5xl shrink-0 overflow-hidden">
              {emojiFoto}
            </div>
            <h2 className="text-2xl font-black uppercase text-center line-clamp-2 w-full leading-tight">{apodo}</h2>
            <div className="text-amber-400/80 font-bold text-sm mt-1 mb-2 tracking-wide">@{username}</div>
            
            <div className="w-full border-t border-zinc-800 mt-auto pt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-amber-400">0</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Partidos</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-400">0</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Goles</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm mt-8 space-y-3 shrink-0">
          <button onClick={() => navigate('/equipo')} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-zinc-950 font-black py-4 rounded-xl shadow-lg">
            <Users className="w-5 h-5" /> Crear mi Equipo
          </button>
          <button onClick={() => navigate('/radar')} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl">
            <MapPinned className="w-5 h-5" /> Explorar Radar
          </button>
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

      {/* Modal Configuración */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <h3 className="text-xl font-black mb-6">Configurar Perfil</h3>
             
             <label className="text-xs font-bold text-zinc-500 uppercase">Apodo</label>
             <input 
               type="text" 
               value={apodo}
               onChange={(e) => setApodo(e.target.value)}
               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 mt-2 mb-4 text-white font-black uppercase outline-none focus:border-amber-500"
             />

             <label className="text-xs font-bold text-zinc-500 uppercase">Nombre de Usuario (@)</label>
             <div className="flex items-center w-full bg-zinc-950 border border-zinc-800 rounded-xl mt-2 mb-6 focus-within:border-amber-500 transition-colors overflow-hidden">
               <span className="pl-4 text-zinc-500 font-black">@</span>
               <input 
                 type="text" 
                 value={username}
                 onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                 className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                 placeholder="tu_usuario"
               />
             </div>

             <label className="text-xs font-bold text-zinc-500 uppercase">Foto (Emoji temporal)</label>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'].map(emoji => (
                 <button key={emoji} onClick={() => setEmojiFoto(emoji)} className={`w-12 h-12 text-2xl rounded-lg transition-transform ${emojiFoto === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}`}>{emoji}</button>
               ))}
             </div>

             <button onClick={() => {
               if(sesion.usuario) requestNotificationPermission(sesion.usuario.uid)
             }} className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-bold mb-4 active:scale-95 transition-transform">
               <Bell className="w-5 h-5" /> Activar Alertas Push
             </button>
             <button onClick={() => setMostrarConfig(false)} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform mb-4">Guardar Cambios</button>
             
             <button onClick={async () => {
               await cerrarSesion();
               navigate('/login');
             }} className="w-full border border-red-500/50 text-red-500 font-bold py-3 rounded-xl active:scale-95 transition-transform hover:bg-red-500/10">
               Cerrar Sesión
             </button>
          </div>
        </div>
      )}

      </div>

      <MenuNavegacion />
    </div>
  );
};

// Screen5Radar ha sido reemplazado por MapaRadarUnificado en src/modules/radar/pantallas/MapaRadarUnificado.tsx

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
    const nuevoPartido = {
      id: Date.now(),
      modalidad,
      diaHora: new Date(diaHora).toLocaleString('es-AR', { weekday: 'long', hour: '2-digit', minute:'2-digit' }),
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
                <p className="text-xs text-zinc-500 mt-1">{p.cancha}</p>
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
  const [convFecha, setConvFecha] = useState('Jueves 21:00hs');
  const [inviteUsername, setInviteUsername] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Mock list of users
  const mockUsuarios = [
    { username: 'el_rustico', apodo: 'El Rústico', emoji: '⚽' },
    { username: 'mati_goleador', apodo: 'Matias', emoji: '🔥' },
    { username: 'juan_perez', apodo: 'Juan Pérez', emoji: '🏃‍♂️' },
    { username: 'lio_messi', apodo: 'Lio', emoji: '⭐' }
  ];

  const buscarUsuario = (username: string) => {
    return mockUsuarios.filter(u => u.username.includes(username) || u.apodo.toLowerCase().includes(username));
  };

  const [usuariosBuscados, setUsuariosBuscados] = useState(mockUsuarios.slice(0,0));
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{username:string, apodo:string, emoji:string} | null>(null);
  

  // State for config
  const [formato, setFormato] = useState('F5');
  const [genero, setGenero] = useState('Masculino');

  const currentUser = 'mi_usuario';

  const [equipos, setEquipos] = useState([
    { 
      id: 1, nombre: 'La Scaloneta F5', capitan: 'mi_usuario', w: 45, d: 10, l: 5, emoji: '🛡️', isCapitan: true,
      plantel: [
        { id: 101, username: 'mi_usuario', apodo: 'Yo', emoji: '👑', isCapitan: true },
        { id: 102, username: 'juan_perez', apodo: 'Juan Pérez', emoji: '🏃‍♂️', isCapitan: false },
        { id: 103, username: 'mati_goleador', apodo: 'Matias', emoji: '🔥', isCapitan: false },
      ],
      convocatoria: null as { fecha: string, confirmados: number[], bajas: number[] } | null
    },
    { 
      id: 2, nombre: 'Los Galácticos F7', capitan: 'Cristiano', w: 20, d: 2, l: 1, emoji: '⚡', isCapitan: false,
      plantel: [
        { id: 201, username: 'cristiano', apodo: 'Cristiano', emoji: '⚡', isCapitan: true },
        { id: 101, username: 'mi_usuario', apodo: 'Yo', emoji: '🏃‍♂️', isCapitan: false },
        { id: 202, username: 'el_rustico', apodo: 'El Rústico', emoji: '⚽', isCapitan: false },
      ],
      convocatoria: { fecha: 'Jueves 21:00hs', confirmados: [201], bajas: [202] }
    },
  ]);

  const equipo = equipos[equipoActivo];

  const handleUpdateEmoji = (newEmoji: string) => {
    const nuevosEquipos = [...equipos];
    nuevosEquipos[equipoActivo].emoji = newEmoji;
    setEquipos(nuevosEquipos);
  };

  const handleRemovePlayer = (teamId: number, playerId: number, isSelf: boolean) => {
    if(window.confirm(isSelf ? '¿Estás seguro que querés salir del equipo?' : '¿Estás seguro que querés liberar a este jugador?')) {
      const nuevosEquipos = equipos.map(eq => {
        if(eq.id === teamId) {
           return { ...eq, plantel: eq.plantel.filter(p => p.id !== playerId) };
        }
        return eq;
      });
      setEquipos(nuevosEquipos);
      setToastMessage(isSelf ? 'Saliste del equipo' : 'Jugador liberado del equipo');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleDelegateCaptain = (teamId: number, playerId: number) => {
    if(window.confirm('¿Estás seguro que querés cederle la capitanía a este jugador? Vos pasarás a ser un jugador normal.')) {
      const nuevosEquipos = equipos.map(eq => {
        if(eq.id === teamId) {
           const newPlantel = eq.plantel.map(p => {
             if(p.id === playerId) return { ...p, isCapitan: true, emoji: '👑' };
             if(p.username === currentUser) return { ...p, isCapitan: false, emoji: '🏃‍♂️' };
             return p;
           });
           const newCapitan = newPlantel.find(p => p.id === playerId)?.username || eq.capitan;
           return { ...eq, isCapitan: false, capitan: newCapitan, plantel: newPlantel };
        }
        return eq;
      });
      setEquipos(nuevosEquipos);
      setToastMessage('Has delegado la capitanía');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleCreateConvocatoria = () => {
    const nuevosEquipos = [...equipos];
    nuevosEquipos[equipoActivo].convocatoria = {
      fecha: convFecha,
      confirmados: [],
      bajas: []
    };
    setEquipos(nuevosEquipos);
    setMostrarModalConvocatoria(false);
    setToastMessage('Convocatoria creada');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleResponderConvocatoria = (teamId: number, status: 'voy' | 'bajo') => {
    const nuevosEquipos = equipos.map(eq => {
      if(eq.id === teamId && eq.convocatoria) {
         const myPlayerId = eq.plantel.find(p => p.username === currentUser)?.id;
         if(!myPlayerId) return eq;
         
         const newConf = eq.convocatoria.confirmados.filter(id => id !== myPlayerId);
         const newBajas = eq.convocatoria.bajas.filter(id => id !== myPlayerId);
         
         if(status === 'voy') newConf.push(myPlayerId);
         if(status === 'bajo') newBajas.push(myPlayerId);

         return { ...eq, convocatoria: { ...eq.convocatoria, confirmados: newConf, bajas: newBajas } };
      }
      return eq;
    });
    setEquipos(nuevosEquipos);
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Unite a mi equipo en Fulbeando!',
          text: `¡Sumate a ${equipo.nombre} y rompela con nosotros!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const handleSendInvite = () => {
    if (!usuarioSeleccionado) return;
    setToastMessage(`¡Invitación enviada a @${usuarioSeleccionado.username}!`);
    setTimeout(() => setToastMessage(''), 3000);
    setInviteUsername('');
    setUsuarioSeleccionado(null);
    setUsuariosBuscados([]);
    setMostrarInvitar(false);
  };

  if (!equipo) return <div className="h-full bg-zinc-950 flex justify-center items-center text-white">Cargando...</div>;

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-sm shadow-xl animate-bounce">
            {toastMessage}
          </div>
        )}

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
      </div>

      {/* Header Equipo */}
      <div className="bg-zinc-900 p-6 pt-12 rounded-b-[40px] text-center relative border-b border-zinc-800">
        <button onClick={() => setMostrarConfig(true)} className="absolute top-8 right-6 text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-800 p-3 rounded-full">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-4xl mb-4 overflow-hidden">{equipo.emoji}</div>
        <h2 className="text-2xl font-black uppercase">{equipo.nombre}</h2>
        <p className="text-zinc-400 text-sm mt-1">Capitán: {equipo.capitan}</p>
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
                const myId = equipo.plantel.find(p => p.username === currentUser)?.id;
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
          <h3 className="text-sm font-bold text-zinc-500 uppercase">Plantel (5/10)</h3>
          <button onClick={() => setMostrarInvitar(true)} className="text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full active:scale-95 transition-transform">+ Invitar</button>
        </div>
        
        <div className="space-y-3">
          {equipo.plantel.map((jugador) => {
            const isMe = jugador.username === currentUser;
            const canRemove = equipo.isCapitan && !isMe;
            const canLeave = isMe && !equipo.isCapitan;

            return (
              <div key={jugador.id} className="flex items-center gap-4 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-amber-500">{jugador.emoji}</div>
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

             <label className="text-xs font-bold text-zinc-500 uppercase">Escudo (Emoji temporal)</label>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '⭐'].map(emoji => (
                 <button key={emoji} onClick={() => handleUpdateEmoji(emoji)} className={`w-12 h-12 text-2xl rounded-lg transition-transform ${equipo.emoji === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}`}>{emoji}</button>
               ))}
             </div>

             <button onClick={() => setMostrarConfig(false)} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform">Guardar Cambios</button>
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
               <span className="shrink-0 px-4 text-zinc-600 text-xs font-bold uppercase">o invitar por usuario</span>
               <div className="flex-grow border-t border-zinc-800"></div>
             </div>

             <div className={`flex items-center w-full bg-zinc-950 border rounded-xl mb-2 transition-colors overflow-hidden ${usuarioSeleccionado ? 'border-emerald-500' : 'border-zinc-800 focus-within:border-amber-500'}`}>
               <span className="pl-4 text-zinc-500 font-black">@</span>
               <input 
                 type="text" 
                 value={inviteUsername}
                 onChange={(e) => {
                   const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                   setInviteUsername(val);
                   setUsuarioSeleccionado(null);
                   if (val.length > 0) {
                     setUsuariosBuscados(buscarUsuario(val));
                   } else {
                     setUsuariosBuscados([]);
                   }
                 }}
                 className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                 placeholder="usuario"
               />
               {usuarioSeleccionado && <span className="pr-4 text-emerald-500">✓</span>}
             </div>

             {/* Resultados de Búsqueda */}
             {!usuarioSeleccionado && usuariosBuscados.length > 0 && (
               <div className="bg-zinc-950 border border-zinc-800 rounded-xl mb-4 max-h-40 overflow-y-auto">
                 {usuariosBuscados.map(u => (
                   <div 
                     key={u.username}
                     onClick={() => {
                       setUsuarioSeleccionado(u);
                       setInviteUsername(u.username);
                       setUsuariosBuscados([]);
                     }}
                     className="flex items-center gap-3 p-3 border-b border-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors last:border-0"
                   >
                     <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-sm">{u.emoji}</div>
                     <div>
                       <div className="text-sm font-bold text-white">{u.apodo}</div>
                       <div className="text-xs text-zinc-500 font-medium">@{u.username}</div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
             {!usuarioSeleccionado && inviteUsername.length > 0 && usuariosBuscados.length === 0 && (
               <div className="text-xs text-red-400 font-bold mb-4 px-2">Usuario no encontrado</div>
             )}
             {usuarioSeleccionado && (
               <div className="text-xs text-emerald-400 font-bold mb-4 px-2">¡Usuario válido! Listo para invitar.</div>
             )}

             <button 
               onClick={handleSendInvite} 
               disabled={!usuarioSeleccionado}
               className={`w-full font-black py-4 rounded-xl transition-all mt-2 ${usuarioSeleccionado ? 'bg-amber-500 text-zinc-950 active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
             >
               Enviar Notificación
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

      <MenuNavegacion />
    </div>
  );
};

// ==========================================
// PANTALLA 8: Registro de Complejo
// ==========================================
export const Screen8VenueRegistration = () => {
  const navigate = useNavigate();
  return (
    <div className="h-full bg-zinc-950 p-6 flex flex-col font-sans text-white">
      <h2 className="text-2xl font-black mt-8">Da de alta tu Complejo</h2>
      <p className="text-zinc-400 text-sm mt-2 mb-8">Completá los datos para aparecer en el radar de los jugadores.</p>

      <div className="space-y-6 flex-1">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nombre del Predio</label>
          <input type="text" placeholder="Ej: El Templo del Fútbol" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ubicación</label>
          <input type="text" placeholder="Dirección exacta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-zinc-500 cursor-pointer hover:border-emerald-500 transition">
          <UploadCloud className="w-8 h-8 mb-2" />
          <span className="text-sm font-bold">Subir foto de la cancha principal</span>
        </div>
      </div>

      <button onClick={() => navigate('/venue-subscription')} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl mt-6">
        CONTINUAR
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
