const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
const stateReplacement = `  const [mostrarModalConvocatoria, setMostrarModalConvocatoria] = useState(false);
  const [mostrarModalEstadisticas, setMostrarModalEstadisticas] = useState(false);
  const [statsPartido, setStatsPartido] = useState<Record<string, { goles: number, asistencias: number }>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);`;
content = content.replace(/  const \[mostrarModalConvocatoria, setMostrarModalConvocatoria\] = useState\(false\);/, stateReplacement);

// 2. Add button in Convocatoria section
const convocatoriaSection = `            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-3">`;
const buttonHtml = `            {equipo.isCapitan && equipo.convocatoria.confirmados.length > 0 && (
              <button 
                onClick={() => setMostrarModalEstadisticas(true)}
                className="w-full bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl active:scale-95 transition-transform mb-4"
              >
                Cargar Estadísticas del Partido
              </button>
            )}

            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-3">`;
content = content.replace(convocatoriaSection, buttonHtml);

// 3. Add Modal
const modalHtml = `      {/* Modal Cargar Estadísticas */}
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
                    className={\`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all \${mvpId === p.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900'}\`}
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

      <MenuNavegacion />`;

content = content.replace(/      <MenuNavegacion \/>/, modalHtml);

fs.writeFileSync(file, content, 'utf8');
console.log('REPLACED');
