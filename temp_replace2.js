const fs = require('fs');
const path = require('path');

const p = path.resolve('app/src/modules/cuenta/componentes/PerfilDeportivo.tsx');
let content = fs.readFileSync(p, 'utf8');

const t1 = `import { useState } from 'react'
import { Crosshair, Loader2, MapPin } from 'lucide-react'`;

const r1 = `import { useState, useRef } from 'react'
import { Crosshair, Loader2, MapPin, Upload } from 'lucide-react'
import { optimizeAvatarImage } from '@/imageCompressor'
import { uploadImageToR2 } from '@/uploader'`;

content = content.replace(t1, r1);

const t2 = `export function PerfilBasicoCard({ usuario, onCambio }: { usuario: Usuario; onCambio: (usuario: Usuario) => void }) {
  const [apodo, setApodo] = useState(usuario.nombre || '');
  const [username, setUsername] = useState(usuario.email?.split('@')[0] || '');
  const [emojiFoto, setEmojiFoto] = useState(usuario.fotoUrl || '⚽');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);`;

const r2 = `export function PerfilBasicoCard({ usuario, onCambio }: { usuario: Usuario; onCambio: (usuario: Usuario) => void }) {
  const [apodo, setApodo] = useState(usuario.nombre || '');
  const [username, setUsername] = useState(usuario.email?.split('@')[0] || '');
  const [emojiFoto, setEmojiFoto] = useState(usuario.fotoUrl || '⚽');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setGuardando(true);
      setError(null);
      const optimizedBlob = await optimizeAvatarImage(file, { maxSize: 300, quality: 0.8 });
      const result = await uploadImageToR2(optimizedBlob, file.name, 'avatars', (prog) => {
         // console.log(prog);
      });
      setEmojiFoto(result.publicUrl);
    } catch (err) {
       console.error(err);
       setError('Error al subir la imagen');
    } finally {
       setGuardando(false);
    }
  };`;

content = content.replace(t2, r2);

const t3 = `      <div>
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

const r3 = `      <div>
        <label className="mb-1 block text-xs text-ink-muted">Foto de Perfil</label>
        <div className="flex items-center gap-4 bg-canvas p-4 rounded-xl border border-border">
          <div 
            className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-3xl border-2 border-pitch/50 cursor-pointer hover:border-pitch transition-colors relative group"
            onClick={() => fileInputRef.current?.click()}
          >
            {emojiFoto?.startsWith('http') ? (
               <img src={emojiFoto} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
               emojiFoto
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white backdrop-blur-sm">
              <Upload className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-muted mb-2">Sube una foto o elige un emoji</p>
            <div className="flex gap-2">
              {['⚽', '🏃‍♂️', '🔥', '🧤', '🏆'].map(emoji => (
                <button 
                  key={emoji} 
                  type="button"
                  onClick={() => setEmojiFoto(emoji)} 
                  className={\`w-8 h-8 text-lg rounded-lg transition-transform \${emojiFoto === emoji ? 'bg-amber-500 scale-110' : 'bg-transparent'}\`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </div>
      </div>`;

content = content.replace(t3, r3);

fs.writeFileSync(p, content, 'utf8');
console.log('Replaced successfully');
