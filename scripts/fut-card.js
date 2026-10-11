const fs = require('fs');
const path = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace card
const oldCardRegex = /<div className="relative w-64 h-96 shrink-0 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded-3xl p-1 shadow-\[0_0_40px_rgba\(245,158,11,0\.5\)\]">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newCard = `<div className="relative w-64 h-[22rem] shrink-0 drop-shadow-[0_15px_25px_rgba(245,158,11,0.4)]" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 10%, 100% 85%, 50% 100%, 0 85%, 0 10%)" }}>
          <div className="relative h-full w-full bg-gradient-to-br from-[#f9d976] via-[#e6b741] to-[#b38020] flex flex-col p-4 text-[#2c2005] font-sans">
            {/* Background Texture/Shines */}
            <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}></div>
            
            {/* Top Left Stats & Position */}
            <div className="absolute top-6 left-5 flex flex-col items-center z-10">
              <div className="text-5xl font-black tracking-tighter leading-none">99</div>
              <div className="text-xl font-bold uppercase tracking-widest mt-1">DC</div>
              <div className="w-8 h-[2px] bg-[#5c4a1e] mt-1 mb-1"></div>
              <div className="w-8 h-6 flex items-center justify-center">
                <span className="text-2xl">🇦🇷</span>
              </div>
            </div>

            {/* Player Image / Emoji */}
            <div className="mt-2 w-full h-40 flex items-end justify-center z-0">
              <div className="text-[6rem] leading-none drop-shadow-lg">{emojiFoto}</div>
            </div>

            {/* Name */}
            <div className="mt-1 w-full text-center z-10 flex flex-col items-center">
              <div className="w-48 h-[1px] bg-[#7a6427]/60 mb-1"></div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-[#1a1303] truncate w-full px-2">{apodo}</h2>
              <div className="w-48 h-[1px] bg-[#7a6427]/60 mt-1"></div>
            </div>

            {/* Stats Grid */}
            <div className="w-full mt-2 grid grid-cols-[1fr_auto_1fr] gap-x-2 text-[#2c2005] font-bold text-sm px-4 z-10">
              {/* Left Column */}
              <div className="flex flex-col gap-1 items-end pr-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">RIT</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">TIR</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">PAS</span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-[#7a6427]/40 h-full"></div>

              {/* Right Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">REG</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">DEF</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none">99</span>
                  <span className="uppercase w-6 text-left">FÍS</span>
                </div>
              </div>
            </div>

            {/* Footer Logo */}
            <div className="mt-auto pt-2 w-full flex flex-col items-center justify-center opacity-80 z-10">
              <div className="text-[10px] font-black tracking-[0.2em] uppercase">Fulbeando</div>
            </div>
          </div>
        </div>`;

content = content.replace(oldCardRegex, newCard);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
