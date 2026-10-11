const fs = require('fs');
const path = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /export const Screen4WelcomeCard = \(\) => \{[\s\S]*?(?=\/\/ ==========================================)/;

const newComponent = `export const Screen4WelcomeCard = () => {
  const navigate = useNavigate();
  const sesion = useSesion();
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [apodo, setApodo] = useState(sesion.usuario?.nombre || 'EL RÚSTICO');
  const [username, setUsername] = useState(sesion.user?.email?.split('@')[0] || 'el_rustico');
  const [emojiFoto, setEmojiFoto] = useState('⚽');
  const [equipoJugador, setEquipoJugador] = useState<any>(null);

  React.useEffect(() => {
    if (sesion.usuario?.nombre) setApodo(sesion.usuario.nombre);
    if (sesion.user?.email) setUsername(sesion.user.email.split('@')[0] ?? 'jugador');
  }, [sesion.usuario, sesion.user]);

  React.useEffect(() => {
    if (sesion.user) {
      obtenerEquiposDeUsuario(sesion.user.uid).then(t => {
        if (t.length > 0) setEquipoJugador(t[0]);
      }).catch(console.error);
    }
  }, [sesion.user]);
  
  const { isInstallable, promptInstall } = useInstallPrompt();

  const edad = sesion.usuario?.edad || '--';
  const pos = sesion.usuario?.posicion ? sesion.usuario.posicion.slice(0,3).toUpperCase() : 'DC';
  const pierna = sesion.usuario?.piernaHabil ? sesion.usuario.piernaHabil.slice(0,3).toUpperCase() : 'DIE';
  const partidos = sesion.usuario?.partidos_jugados || 0;
  const goles = sesion.usuario?.goles || 0;
  const asist = sesion.usuario?.asistencias || 0;
  const media = sesion.usuario?.rating || 50;

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
        <div className="relative w-64 h-[22rem] shrink-0 drop-shadow-[0_15px_25px_rgba(245,158,11,0.4)]" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 10%, 100% 85%, 50% 100%, 0 85%, 0 10%)" }}>
          <div className="relative h-full w-full bg-gradient-to-br from-[#f9d976] via-[#e6b741] to-[#b38020] flex flex-col p-4 text-[#2c2005] font-sans">
            {/* Background Texture/Shines */}
            <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}></div>
            
            {/* Top Left Stats & Position */}
            <div className="absolute top-6 left-5 flex flex-col items-center z-10">
              <div className="text-5xl font-black tracking-tighter leading-none">{media}</div>
              <div className="text-xl font-bold uppercase tracking-widest mt-1">{pos}</div>
              <div className="w-8 h-[2px] bg-[#5c4a1e] mt-1 mb-1"></div>
              <div className="w-8 h-6 flex items-center justify-center">
                <span className="text-2xl">🇦🇷</span>
              </div>
              {equipoJugador && (
                <div className="mt-1 w-8 h-8 flex items-center justify-center text-xl bg-zinc-900/10 rounded-full">
                  {equipoJugador.emoji}
                </div>
              )}
            </div>

            {/* Player Image / Emoji */}
            <div className="mt-2 w-full h-40 flex items-end justify-center z-0">
              <div className="text-[6rem] leading-none drop-shadow-lg">{emojiFoto}</div>
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
              <div className="flex flex-col gap-1 items-end pr-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{edad}</span>
                  <span className="uppercase w-6 text-left">EDA</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{goles}</span>
                  <span className="uppercase w-6 text-left">GOL</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{partidos}</span>
                  <span className="uppercase w-6 text-left">PAR</span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-[#7a6427]/40 h-full"></div>

              {/* Right Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{pierna}</span>
                  <span className="uppercase w-6 text-left">PIE</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{asist}</span>
                  <span className="uppercase w-6 text-left">ASI</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{pos}</span>
                  <span className="uppercase w-6 text-left">POS</span>
                </div>
              </div>
            </div>

            {/* Footer Logo */}
            <div className="mt-auto pt-2 w-full flex flex-col items-center justify-center opacity-80 z-10">
              <div className="text-[10px] font-black tracking-[0.2em] uppercase">Fulbeando</div>
            </div>
          </div>
        </div>
        </div>

        <div className="w-full max-w-sm mt-8 space-y-3 shrink-0">
          
          <button onClick={() => navigate('/radar')} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl">
            <MapPinned className="w-5 h-5" /> Explorar Radar
          </button>
          <button onClick={() => navigate('/ajustes')} className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 font-bold py-3.5 rounded-xl active:scale-95 transition-transform">
            <Settings className="w-4 h-4" /> Ajustes y disponibilidad
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
                 <button key={emoji} onClick={() => setEmojiFoto(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${emojiFoto === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
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

      <MenuNavegacion />
    </div>
  );
};
`;

content = content.replace(regex, newComponent);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
