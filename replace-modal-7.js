const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      {/* Modal Configuración */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
             <h3 className="text-xl font-black mb-2">Configurar Equipo</h3>
             <p className="text-sm text-zinc-400 mb-6">Ajustá cómo querés que {equipo.nombre} aparezca en el radar.</p>
             
             <label className="text-xs font-bold text-zinc-500 uppercase">Formato de Juego</label>
             <div className="flex flex-wrap gap-2 mt-2 mb-6">
               {['F5', 'F7', 'F11', 'Todos'].map(f => (
                 <button key={f} onClick={() => setFormato(f)} className={\`px-4 py-2 rounded-xl text-sm font-bold transition-colors \${formato === f ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}\`}>{f}</button>
               ))}
             </div>

             <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
             <div className="flex gap-2 mt-2 mb-6">
               {['Masculino', 'Femenino', 'Mixto'].map(g => (
                 <button key={g} onClick={() => setGenero(g)} className={\`flex-1 py-3 rounded-xl text-xs font-bold transition-colors \${genero === g ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}\`}>{g}</button>
               ))}
             </div>

             <label className="text-xs font-bold text-zinc-500 uppercase">Escudo (Emoji temporal)</label>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '⭐'].map(emoji => (
                 <button key={emoji} onClick={() => handleUpdateEmoji(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${equipo.emoji === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
               ))}
             </div>

             <button onClick={() => setMostrarConfig(false)} className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-xl active:scale-95 transition-transform">Guardar Cambios</button>
          </div>
        </div>
      )}`;

const replacement = `      {/* Modal Configuración */}
      {mostrarConfig && (
        <ModalConfiguracionEquipo 
          equipo={{...equipo, id: equipo.id, name: equipo.nombre, genero: genero, modalidadBase: formato, captainId: equipo.isCapitan ? sesion.usuario?.uid : ''}} 
          usuarioUid={sesion.usuario?.uid} 
          onClose={() => setMostrarConfig(false)} 
          onSave={async (cambios) => {
             setFormato(cambios.modalidadBase);
             setGenero(cambios.genero);
             setMostrarConfig(false);
             window.location.reload();
          }} 
        />
      )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Done!');
} else {
  console.log('Target not found!');
  process.exit(1);
}
