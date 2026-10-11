const fs = require('fs');
const file = 'c:/Users/Dell PC/Desktop/Proyectos de Programacion/Fulbeando/app/src/modules/ui/Screens.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const sesion = useSesion();
  const currentUser = sesion.user?.email?.split('@')[0] || 'mi_usuario';

  const [equipos, setEquipos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  React.useEffect(() => {
    if (!sesion.user) return;
    setCargando(true);
    obtenerEquiposDeUsuario(sesion.user.uid).then(dbTeams => {
      if (dbTeams.length === 0) {
        setEquipos([]);
        setCargando(false);
        return;
      }
      
      const mapped = dbTeams.map(t => ({
        id: t.id,
        nombre: t.name,
        capitan: t.captainId,
        w: t.stats?.wins || 0,
        d: t.stats?.draws || 0,
        l: t.stats?.losses || 0,
        emoji: t.shieldUrl || '🛡️',
        isCapitan: t.captainId === sesion.user!.uid,
        plantel: t.members.map(m => ({
          id: m.uid,
          username: m.name,
          apodo: m.name,
          emoji: m.role === 'CAPITAN' ? '👑' : '🏃‍♂️',
          isCapitan: m.role === 'CAPITAN'
        })),
        convocatoria: null
      }));
      
      setEquipos(mapped);
      setCargando(false);
    }).catch(err => {
      console.error(err);
      setCargando(false);
    });
  }, [sesion.user]);`;

const searchStr = `  const currentUser = 'mi_usuario';

  const [equipos, setEquipos] = useState([
    { 
      id: 1, nombre: 'La Scaloneta F5', capitan: 'mi_usuario', w: 45, d: 10, l: 5, emoji: '🛡️', isCapitan: true,
      plantel: [
        { id: 101, username: 'mi_usuario', apodo: 'Yo', emoji: '👑', isCapitan: true },
        { id: 102, username: 'juan_perez', apodo: 'Juan Pérez', emoji: '🏃‍♂️', isCapitan: false },
        { id: 103, username: 'mati_goleador', apodo: 'Matias', emoji: '🔥', isCapitan: false },
      ],
      convocatoria: null as { fecha: string, confirmados: number[], bajas: number[] } | null
    },
    { 
      id: 2, nombre: 'Los Galácticos F7', capitan: 'Cristiano', w: 20, d: 2, l: 1, emoji: '⚡', isCapitan: false,
      plantel: [
        { id: 201, username: 'cristiano', apodo: 'Cristiano', emoji: '⚡', isCapitan: true },
        { id: 101, username: 'mi_usuario', apodo: 'Yo', emoji: '🏃‍♂️', isCapitan: false },
        { id: 202, username: 'el_rustico', apodo: 'El Rústico', emoji: '⚽', isCapitan: false },
      ],
      convocatoria: { fecha: 'Jueves 21:00hs', confirmados: [201], bajas: [202] }
    },
  ]);`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("REPLACED SUCCESSFULLY");
} else {
  // Let's try splitting line by line
  let lines = content.split('\n');
  let startIdx = lines.findIndex(l => l.includes("const currentUser = 'mi_usuario';"));
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("  ]);"));
  if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, replacement);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log("REPLACED USING LINES");
  } else {
    console.log("COULD NOT FIND CONTENT");
  }
}
