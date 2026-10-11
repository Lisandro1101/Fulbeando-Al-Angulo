const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const start = 946;
const end = 978;

const before = lines.slice(0, start).join('\n');
const after = lines.slice(end).join('\n');
const replacement = `      {/* Modal Configuración */}
      {mostrarConfig && (
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
      )}`;

fs.writeFileSync(file, before + '\n' + replacement + '\n' + after);
console.log('Success chunk replacement!');
