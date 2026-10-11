const fs = require('fs');
const path = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace card
const oldCardRegex = /<div className="relative w-64 h-96 shrink-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl p-1 shadow-\[0_0_30px_rgba\(245,158,11,0\.3\)\]">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newCard = `<div className="relative w-64 h-96 shrink-0 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded-3xl p-1 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
          <div className="relative h-full w-full bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-700 rounded-[22px] flex flex-col items-center p-6 text-zinc-950 border-4 border-yellow-300/50 shadow-inner">
            <div className="absolute top-4 left-4 text-4xl font-black text-zinc-900 drop-shadow-sm">50</div>
            <div className="absolute top-14 left-5 text-sm font-bold text-zinc-800 uppercase">DEL</div>
            <div className="mt-8 mb-4 w-32 h-32 rounded-full bg-zinc-900 border-4 border-yellow-300 flex items-center justify-center text-5xl shrink-0 overflow-hidden shadow-lg">
              {emojiFoto}
            </div>
            <h2 className="text-2xl font-black uppercase text-center line-clamp-2 w-full leading-tight text-zinc-950 drop-shadow-sm">{apodo}</h2>
            <div className="text-zinc-900 font-bold text-sm mt-1 mb-2 tracking-wide opacity-80">@{username}</div>
            
            <div className="w-full border-t border-yellow-600/50 mt-auto pt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-zinc-900">0</div>
                <div className="text-[10px] text-zinc-800 font-bold uppercase tracking-widest">Partidos</div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900">0</div>
                <div className="text-[10px] text-zinc-800 font-bold uppercase tracking-widest">Goles</div>
              </div>
            </div>
          </div>
        </div>`;

content = content.replace(oldCardRegex, newCard);

// Remove Crear mi Equipo button in Screen4WelcomeCard
const oldButton = /<button onClick=\{\(\) => navigate\('\/equipo'\)\} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-zinc-950 font-black py-4 rounded-xl shadow-lg">\s*<Users className="w-5 h-5" \/> Crear mi Equipo\s*<\/button>/;
content = content.replace(oldButton, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
