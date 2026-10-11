const fs = require('fs');
const path = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. In Screen7MyTeam, add the fileInputRef and handleImageUpload after `const equipo = equipos[equipoActivo];`
const stateInsert = `
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 128;
        const MAX_HEIGHT = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        handleUpdateEmoji(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
`;
content = content.replace(/const equipo = equipos\[equipoActivo\];/, 'const equipo = equipos[equipoActivo];' + stateInsert);

// 2. Replace the div of the team shield
const shieldDivRegex = /<div \s*className=\{`w-24 h-24 bg-zinc-800 mx-auto rounded-full border-4 border-amber-500 flex items-center justify-center text-4xl mb-4 overflow-hidden relative group \$\{equipo\.isCapitan \? 'cursor-pointer' : ''\}`\}\s*onClick=\{[^}]+\}\s*>\s*\{equipo\.emoji\}\s*\{equipo\.isCapitan && \(\s*<div className="absolute inset-0 bg-black\/50 hidden group-hover:flex items-center justify-center text-xs font-bold text-white uppercase backdrop-blur-sm">\s*Cambiar\s*<\/div>\s*\)\}\s*<\/div>/;

const newShieldDiv = `<div 
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

content = content.replace(shieldDivRegex, newShieldDiv);

// 3. In Screen4WelcomeCard, replace the team shield logic
const cardShieldRegex = /<div className="mt-1 w-8 h-8 flex items-center justify-center text-xl bg-zinc-900\/10 rounded-full">\s*\{equipoJugador\.emoji\}\s*<\/div>/;
const newCardShield = `<div className="mt-1 w-8 h-8 flex items-center justify-center text-xl bg-zinc-900/10 rounded-full overflow-hidden">
                  {equipoJugador.emoji?.startsWith('data:') || equipoJugador.emoji?.startsWith('http') ? (
                    <img src={equipoJugador.emoji} alt="Escudo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{equipoJugador.emoji}</span>
                  )}
                </div>`;
content = content.replace(cardShieldRegex, newCardShield);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
