const fs = require('fs');
const path = require('path');

const screensPath = path.resolve('app/src/modules/ui/Screens.tsx');
let screensContent = fs.readFileSync(screensPath, 'utf8');

// Remove Emoji from Screen4WelcomeCard
screensContent = screensContent.replace(/<label className="text-xs font-bold text-zinc-500 uppercase">Foto \(Emoji temporal\)<\/label>\s*<div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">\s*\{\['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'\].map\(emoji => \(\s*<button key=\{emoji\} onClick=\{[^>]+ className=\{[^>]+>\{emoji\}<\/button>\s*\)\)\}\s*<\/div>/g, '');

// Remove Emoji from Screen7MyTeam
screensContent = screensContent.replace(/<label className="text-xs font-bold text-zinc-500 uppercase">Escudo \(Emoji temporal\)<\/label>\s*<div className="flex justify-between mt-2 mb-8 bg-zinc-950 p-2 rounded-xl border border-zinc-800">\s*\{\['🛡️', '⚔️', '🦅', '🦁', '⭐'\].map\(emoji => \(\s*<button key=\{emoji\} onClick=\{[^>]+ className=\{[^>]+>\{emoji\}<\/button>\s*\)\)\}\s*<\/div>/g, '');

fs.writeFileSync(screensPath, screensContent, 'utf8');

const perfilPath = path.resolve('app/src/modules/cuenta/componentes/PerfilDeportivo.tsx');
let perfilContent = fs.readFileSync(perfilPath, 'utf8');

// The replacement was probably successful but let's just make sure emojis are gone
perfilContent = perfilContent.replace(/<div className="flex gap-2">\s*\{\['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'\].map\(emoji => \(\s*<button[^>]+>\s*\{emoji\}\s*<\/button>\s*\)\)\}\s*<\/div>/g, '');
perfilContent = perfilContent.replace(/<p className="text-xs text-ink-muted mb-2">Sube una foto o elige un emoji<\/p>/g, '<p className="text-xs text-ink-muted mb-2">Sube una foto de perfil</p>');

// If the previous script failed, then the old code is still there:
perfilContent = perfilContent.replace(/<label className="mb-1 block text-xs text-ink-muted">Foto \(Emoji temporal\)<\/label>\s*<div className="flex justify-between bg-canvas p-2 rounded-xl border border-border">\s*\{\['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'\].map\(emoji => \(\s*<button[^>]+>\s*\{emoji\}\s*<\/button>\s*\)\)\}\s*<\/div>/g, 
`<label className="mb-1 block text-xs text-ink-muted">Foto de Perfil</label>
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
</div>`);

fs.writeFileSync(perfilPath, perfilContent, 'utf8');

console.log('Removed emojis successfully');
