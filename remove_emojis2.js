const fs = require('fs');
const path = require('path');

function removeBlock(content, startString, endString) {
    const startIndex = content.indexOf(startString);
    if (startIndex === -1) return content;
    
    // Find the next div closing after start
    let searchIndex = startIndex + startString.length;
    let divCount = 1; // Assuming startString is inside a parent div we want to remove? 
    // Actually, it's easier to just do a substring search.
    return content;
}

const perfilPath = path.resolve('app/src/modules/cuenta/componentes/PerfilDeportivo.tsx');
let perfilContent = fs.readFileSync(perfilPath, 'utf8');

const t1 = `      <div>
        <label className="mb-1 block text-xs text-ink-muted">Foto (Emoji temporal)</label>
        <div className="flex justify-between bg-canvas p-2 rounded-xl border border-border">
          {['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'].map(emoji => (
            <button 
              key={emoji} 
              type="button"
              onClick={() => setEmojiFoto(emoji)} 
              className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${emojiFoto === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>`;

const r1 = `      <div>
        <label className="mb-1 block text-xs text-ink-muted">Foto de Perfil</label>
        <div className="flex items-center gap-4 bg-canvas p-4 rounded-xl border border-border">
          <div 
            className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-3xl border-2 border-pitch/50 cursor-pointer hover:border-pitch transition-colors relative group"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {emojiFoto?.startsWith('http') ? (
               <img src={emojiFoto} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
               emojiFoto
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white backdrop-blur-sm">
              <span className="text-xs font-bold uppercase">Subir</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-muted mb-2">Toca el círculo para subir una foto de perfil</p>
          </div>
          <input 
            id="avatar-upload"
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if(!file) return;
              try {
                 setGuardando(true);
                 setError(null);
                 const { optimizeAvatarImage } = await import('@/imageCompressor');
                 const { uploadImageToR2 } = await import('@/uploader');
                 const optimized = await optimizeAvatarImage(file, { maxSize: 300, quality: 0.8 });
                 const result = await uploadImageToR2(optimized, file.name, 'avatars', () => {});
                 setEmojiFoto(result.publicUrl);
              } catch(err) {
                 setError('Error al subir la imagen');
              } finally {
                 setGuardando(false);
              }
            }} 
          />
        </div>
      </div>`;

if (perfilContent.includes('Foto (Emoji temporal)')) {
    const startIdx = perfilContent.indexOf('      <div>\n        <label className="mb-1 block text-xs text-ink-muted">Foto (Emoji temporal)');
    if (startIdx !== -1) {
        const endIdx = perfilContent.indexOf('      </div>\n      \n      {error && <p className="text-sm text-red-500">{error}</p>}');
        if (endIdx !== -1) {
            perfilContent = perfilContent.substring(0, startIdx) + r1 + perfilContent.substring(endIdx + 12);
            fs.writeFileSync(perfilPath, perfilContent, 'utf8');
            console.log('Replaced PerfilDeportivo emojis');
        }
    }
}

const screensPath = path.resolve('app/src/modules/ui/Screens.tsx');
let screensContent = fs.readFileSync(screensPath, 'utf8');

const target1 = `             <label className="text-xs font-bold text-zinc-500 uppercase">Foto (Emoji temporal)</label>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'].map(emoji => (
                 <button key={emoji} onClick={() => setEmojiFoto(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${emojiFoto === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
               ))}
             </div>`;
screensContent = screensContent.replace(target1, '');

const target2 = `             <label className="text-xs font-bold text-zinc-500 uppercase">Escudo (Emoji temporal)</label>
             <div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
               {['🛡️', '⚔️', '🦅', '🦁', '⭐'].map(emoji => (
                 <button key={emoji} onClick={() => handleUpdateEmoji(emoji)} className={\`w-12 h-12 text-2xl rounded-lg transition-transform \${equipo.emoji === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}>{emoji}</button>
               ))}
             </div>`;
screensContent = screensContent.replace(target2, '');

fs.writeFileSync(screensPath, screensContent, 'utf8');
console.log('Replaced Screens emojis');
