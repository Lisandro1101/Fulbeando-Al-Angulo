const fs = require('fs');
const path = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `<div 
            className={\`w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-4xl mb-4 overflow-hidden relative group \${equipo.isCapitan ? 'cursor-pointer' : ''}\`}
            onClick={() => {
              if (equipo.isCapitan) {
                const emoji = window.prompt('Elegí un nuevo emoji/escudo para el equipo:', equipo.emoji);
                if (emoji) handleUpdateEmoji(emoji);
              }
            }}
          >
            {equipo.emoji}
            {equipo.isCapitan && (
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs font-bold text-white uppercase backdrop-blur-sm">
                Cambiar
              </div>
            )}
          </div>`;

const newStr = `<div 
            className={\`w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-4xl mb-4 overflow-hidden relative group \${equipo.isCapitan ? 'cursor-pointer' : ''}\`}
            onClick={() => {
              if (equipo.isCapitan && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            {equipo.emoji?.startsWith('data:') || equipo.emoji?.startsWith('http') ? (
              <img src={equipo.emoji} alt="Escudo" className="w-full h-full object-cover" />
            ) : (
              <span>{equipo.emoji}</span>
            )}
            {equipo.isCapitan && (
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs font-bold text-white uppercase backdrop-blur-sm">
                Cambiar
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImageUpload} 
          />`;

content = content.replace(oldStr, newStr);

// Also let's check for the second window.prompt in the settings!
const oldStr2 = `<div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '👑'].map(emoji => (
                 <button key={emoji} onClick={() => handleUpdateEmoji(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${equipo.emoji === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
               ))}
             </div>`;

const newStr2 = `<div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '👑'].map(emoji => (
                 <button key={emoji} onClick={() => handleUpdateEmoji(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${equipo.emoji === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
               ))}
               <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 text-2xl rounded-lg transition-transform hover:bg-zinc-800 flex items-center justify-center">📷</button>
             </div>`;

content = content.replace(oldStr2, newStr2);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
