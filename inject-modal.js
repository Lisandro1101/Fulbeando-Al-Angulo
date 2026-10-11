const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const newComponent = `
function ModalConfiguracionEquipo({ equipo, usuarioUid, onClose, onSave }: { equipo: any, usuarioUid?: string, onClose: () => void, onSave: (cambios: any) => void }) {
  const [nombre, setNombre] = useState(equipo.name);
  const [modalidadBase, setModalidadBase] = useState(equipo.modalidadBase || 'F5');
  const [genero, setGenero] = useState(equipo.genero || 'Masculino');
  const [guardando, setGuardando] = useState(false);

  const esCapitan = equipo.captainId === usuarioUid;

  const handleGuardar = async () => {
    if (!esCapitan) return;
    setGuardando(true);
    try {
      const { actualizarEquipo } = await import('@/modules/teams/teamService');
      await actualizarEquipo(equipo.id, usuarioUid!, { nombre, modalidadBase, genero });
      onSave({ name: nombre, modalidadBase, genero });
    } catch (e) {
      console.error(e);
      alert('Error al guardar: ' + (e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-800 p-6 animate-slide-up sm:animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Configuración del Equipo</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2">✕</button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nombre del Equipo</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)}
              disabled={!esCapitan}
              className={\`w-full bg-zinc-900 border \${esCapitan ? 'border-zinc-700 focus:border-emerald-500 text-white' : 'border-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'} rounded-xl p-4 font-bold outline-none\`}
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Modalidad Base</label>
            <div className="flex gap-2">
              {['F5', 'F7', 'F11'].map(mod => (
                <button 
                  key={mod}
                  onClick={() => esCapitan && setModalidadBase(mod)}
                  disabled={!esCapitan}
                  className={\`flex-1 py-3 rounded-xl font-bold transition-all \${modalidadBase === mod ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'} \${!esCapitan && 'opacity-50 cursor-not-allowed'}\`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Género</label>
            <div className="flex gap-2">
              {['Masculino', 'Femenino', 'Mixto'].map(gen => (
                <button 
                  key={gen}
                  onClick={() => esCapitan && setGenero(gen)}
                  disabled={!esCapitan}
                  className={\`flex-1 py-3 rounded-xl font-bold transition-all \${genero === gen ? 'bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'} \${!esCapitan && 'opacity-50 cursor-not-allowed'}\`}
                >
                  {gen}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {esCapitan ? (
          <button 
            onClick={handleGuardar} 
            disabled={guardando}
            className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        ) : (
          <p className="text-sm text-center font-bold text-red-400">Solo el capitán puede editar la configuración del equipo.</p>
        )}
      </div>
    </div>
  );
}
`;

content = content + '\n' + newComponent;
fs.writeFileSync(file, content);
console.log('Done injecting ModalConfiguracionEquipo!');
