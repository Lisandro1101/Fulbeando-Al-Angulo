const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /\{mostrarConfig && \([\s\S]*?\)\s*\}\s*<\/div>\s*\);\s*\};/g;

const match = targetRegex.exec(content);
if (!match) {
  console.log('No match found!');
  process.exit(1);
}

const newModal = `      {mostrarConfig && (
        <ModalConfiguracionEquipo 
          equipo={equipo} 
          usuarioUid={sesion.usuario?.uid} 
          onClose={() => setMostrarConfig(false)} 
          onSave={async (cambios) => {
             const nuevosEquipos = [...equipos];
             nuevosEquipos[equipoActivo] = { ...equipo, ...cambios };
             setEquipos(nuevosEquipos);
             setMostrarConfig(false);
             setToastMessage('¡Equipo actualizado con éxito!');
             setTimeout(() => setToastMessage(''), 3000);
          }} 
        />
      )}
    </div>
  );
};`;

content = content.replace(match[0], newModal);
fs.writeFileSync(file, content);
console.log('Done replacing modal in Screens.tsx!');
