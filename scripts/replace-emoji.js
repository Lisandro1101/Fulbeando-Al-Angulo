const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const handleUpdateEmoji = async (newEmoji: string) => {
    if (!equipo || !sesion.user) return;
    try {
      await actualizarEquipo(equipo.id, sesion.user.uid, { shieldUrl: newEmoji });
      const nuevosEquipos = [...equipos];
      nuevosEquipos[equipoActivo] = { ...equipo, emoji: newEmoji };
      setEquipos(nuevosEquipos);
      setToastMessage('Escudo actualizado');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage('Error al actualizar el escudo (¿sos el capitán?)');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };`;

const regex = /  const handleUpdateEmoji = \(newEmoji: string\) => {[\s\S]*?setEquipos\(nuevosEquipos\);\r?\n  };/m;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("REPLACED SUCCESSFULLY");
} else {
  console.log("REGEX DID NOT MATCH");
}
