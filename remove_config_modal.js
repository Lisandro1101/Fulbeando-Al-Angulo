const fs = require('fs');
const path = require('path');

const screensPath = path.resolve('app/src/modules/ui/Screens.tsx');
let content = fs.readFileSync(screensPath, 'utf8');

// Replace lines 363-372
const t1 = `  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [apodo, setApodo] = useState(sesion.usuario?.nombre || 'EL RÚSTICO');
  const [username, setUsername] = useState(sesion.user?.email?.split('@')[0] || 'el_rustico');
  const [emojiFoto, setEmojiFoto] = useState('⚽');
  const [equipoJugador, setEquipoJugador] = useState<any>(null);

  React.useEffect(() => {
    if (sesion.usuario?.nombre) setApodo(sesion.usuario.nombre);
    if (sesion.user?.email) setUsername(sesion.user.email.split('@')[0] ?? 'jugador');
  }, [sesion.usuario, sesion.user]);`;

const r1 = `  const apodo = sesion.usuario?.nombre || 'EL RÚSTICO';
  const username = sesion.user?.email?.split('@')[0] || 'el_rustico';
  const emojiFoto = sesion.usuario?.fotoUrl || '⚽';
  const [equipoJugador, setEquipoJugador] = useState<any>(null);`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
} else {
    console.log("Could not find t1");
}

// Replace Settings icon button
const t2 = `          <button onClick={() => setMostrarConfig(true)} className="text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-900 p-2 rounded-full">
            <Settings className="w-5 h-5" />
          </button>`;

const r2 = `          <button onClick={() => navigate('/ajustes')} className="text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-900 p-2 rounded-full">
            <Settings className="w-5 h-5" />
          </button>`;

if (content.includes(t2)) {
    content = content.replace(t2, r2);
} else {
    console.log("Could not find t2");
}

// Remove the button "Ajustes y disponibilidad"
const t3 = `          <button onClick={() => navigate('/ajustes')} className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-zinc-200 font-bold py-3.5 rounded-xl active:scale-95 transition-transform">
            <Settings className="w-4 h-4" /> Ajustes y disponibilidad
          </button>\n`;

if (content.includes(t3)) {
    content = content.replace(t3, '');
} else {
    console.log("Could not find t3");
}

// Remove the modal
const t4 = `      {/* Modal Configuración */}
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
      )}\n`;

if (content.includes(t4)) {
    content = content.replace(t4, '');
} else {
    // try to find it dynamically if exact match fails
    const startIdx = content.indexOf('{/* Modal Configuración */}');
    if (startIdx !== -1) {
        const endIdx = content.indexOf('      <MenuNavegacion />', startIdx);
        if (endIdx !== -1) {
            content = content.substring(0, startIdx) + content.substring(endIdx);
            console.log("Removed t4 dynamically");
        }
    } else {
        console.log("Could not find t4");
    }
}

// The emojiFoto rendering has {emojiFoto} currently, wait, it has:
// <div className="text-[6rem] leading-none drop-shadow-lg">{emojiFoto}</div>
// Let's replace it so if it's an image url it shows an image:
const t5 = `<div className="text-[6rem] leading-none drop-shadow-lg">{emojiFoto}</div>`;
const r5 = `<div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border-4 border-[#e6b741] drop-shadow-lg">
                {emojiFoto?.startsWith('http') ? (
                  <img src={emojiFoto} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{emojiFoto}</span>
                )}
              </div>`;

if (content.includes(t5)) {
    content = content.replace(t5, r5);
} else {
    console.log("Could not find t5");
}

fs.writeFileSync(screensPath, content, 'utf8');
console.log('Script completed');
