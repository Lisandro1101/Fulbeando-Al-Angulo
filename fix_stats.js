const fs = require('fs');
const path = require('path');

const screensPath = path.resolve('app/src/modules/ui/Screens.tsx');
let content = fs.readFileSync(screensPath, 'utf8');

// 1. Fix variables
const t1 = `  const edad = sesion.usuario?.edad || '--';
  const pos = sesion.usuario?.posicion ? sesion.usuario.posicion.slice(0,3).toUpperCase() : 'DC';
  const pierna = sesion.usuario?.piernaHabil ? sesion.usuario.piernaHabil.slice(0,3).toUpperCase() : 'DIE';
  const partidos = sesion.usuario?.partidos_jugados || 0;
  const goles = sesion.usuario?.goles || 0;
  const asist = sesion.usuario?.asistencias || 0;
  const media = sesion.usuario?.rating || 50;`;

const r1 = `  const edad = sesion.usuario?.perfilDeportivo?.edad || '--';
  const pos = sesion.usuario?.perfilDeportivo?.posicion ? sesion.usuario.perfilDeportivo.posicion.slice(0,3).toUpperCase() : 'DC';
  const pierna = sesion.usuario?.perfilDeportivo?.piernaHabil ? sesion.usuario.perfilDeportivo.piernaHabil.slice(0,3).toUpperCase() : 'DIE';
  const partidos = sesion.usuario?.perfilDeportivo?.stats?.matchesPlayed || 0;
  const goles = sesion.usuario?.perfilDeportivo?.stats?.goals || 0;
  // TODO: we fallback to 0 since asistencias is not in stats currently
  const asist = (sesion.usuario?.perfilDeportivo?.stats as any)?.asistencias || 0;
  const media = sesion.usuario?.perfilDeportivo?.rating || 50;`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
} else {
    console.log("Could not find t1");
}

// 2. Fix the columns HTML
// Left Column
const t2 = `              {/* Left Column */}
              <div className="flex flex-col gap-1 items-end pr-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{edad}</span>
                  <span className="uppercase w-6 text-left">EDA</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{goles}</span>
                  <span className="uppercase w-6 text-left">GOL</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-6 text-right">{partidos}</span>
                  <span className="uppercase w-6 text-left">PAR</span>
                </div>
              </div>`;

const r2 = `              {/* Left Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">EDA</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{edad}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">GOL</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{goles}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">PAR</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{partidos}</span>
                </div>
              </div>`;

if (content.includes(t2)) {
    content = content.replace(t2, r2);
} else {
    console.log("Could not find t2");
}

// Right Column
const t3 = `              {/* Right Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{pierna}</span>
                  <span className="uppercase w-6 text-left">PIE</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{asist}</span>
                  <span className="uppercase w-6 text-left">ASI</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-black leading-none w-8 text-right">{pos}</span>
                  <span className="uppercase w-6 text-left">POS</span>
                </div>
              </div>`;

const r3 = `              {/* Right Column */}
              <div className="flex flex-col gap-1 items-start pl-2">
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">PIE</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{pierna}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">ASI</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{asist}</span>
                </div>
                <div className="flex gap-2 justify-start items-center">
                  <span className="uppercase w-8 text-left text-xs">POS</span>
                  <span className="text-lg font-black leading-none w-8 text-right">{pos}</span>
                </div>
              </div>`;

if (content.includes(t3)) {
    content = content.replace(t3, r3);
} else {
    console.log("Could not find t3");
}

fs.writeFileSync(screensPath, content, 'utf8');
console.log('Script completed');
