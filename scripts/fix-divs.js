const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="w-full max-w-sm mt-8 space-y-3 shrink-0">/m, '</div>\n          </div>\n        </div>\n\n        <div className="w-full max-w-sm mt-8 space-y-3 shrink-0">');

fs.writeFileSync(file, c);
console.log('Fixed syntax error');
