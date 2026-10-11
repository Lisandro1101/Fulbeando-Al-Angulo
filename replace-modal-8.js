const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /\{mostrarConfig && \([\s\S]*?\)\s*\}\s*<\/div>\s*\)\s*\}\s*\{\/\* Modal Invitar \*\//;

const replacement = `{mostrarConfig && (
        <ModalConfiguracionEquipo 
          equipo={{...equipo, id: equipo.id, name: equipo.nombre, genero: genero, modalidadBase: formato, captainId: equipo.isCapitan ? sesion.usuario?.uid : ''}} 
          usuarioUid={sesion.usuario?.uid} 
          onClose={() => setMostrarConfig(false)} 
          onSave={async (cambios) => {
             setFormato(cambios.modalidadBase);
             setGenero(cambios.genero);
             setMostrarConfig(false);
             window.location.reload();
          }} 
        />
      )}

      {/* Modal Invitar */`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(file, content);
  console.log('Done!');
} else {
  console.log('Target regex not found!');
  process.exit(1);
}
