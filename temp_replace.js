const fs = require('fs');
const path = require('path');

const p = path.resolve('app/src/modules/ui/Screens.tsx');
let content = fs.readFileSync(p, 'utf8');

const t1 = `  const buscarUsuario = (username: string) => {
    return mockUsuarios.filter(u => u.username.includes(username) || u.apodo.toLowerCase().includes(username));
  };

  const [usuariosBuscados, setUsuariosBuscados] = useState(mockUsuarios.slice(0,0));
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{username:string, apodo:string, emoji:string} | null>(null);`;

const r1 = `  const buscarUsuario = async (username: string) => {
    try {
       const resultados = await buscarJugadores(username);
       const mapeados = resultados.map(r => ({
         username: r.uid,
         apodo: r.name,
         emoji: r.avatarUrl ? r.avatarUrl : '🏃‍♂️'
       }));
       setUsuariosBuscados(mapeados);
    } catch(e) {
       console.error(e);
       setUsuariosBuscados([]);
    }
  };

  const [usuariosBuscados, setUsuariosBuscados] = useState<{username:string, apodo:string, emoji:string}[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{username:string, apodo:string, emoji:string} | null>(null);`;

content = content.replace(t1, r1);

const t2 = `               <input 
                 type="text" 
                 value={inviteUsername}
                 onChange={(e) => {
                   const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                   setInviteUsername(val);
                   setUsuarioSeleccionado(null);
                   if (val.length > 0) {
                     setUsuariosBuscados(buscarUsuario(val));
                   } else {
                     setUsuariosBuscados([]);
                   }
                 }}
                 className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                 placeholder="usuario"
               />`;

const r2 = `               <input 
                 type="text" 
                 value={inviteUsername}
                 onChange={(e) => {
                   const val = e.target.value.toLowerCase().replace(/[^a-z0-9_ ]/g, '');
                   setInviteUsername(val);
                   setUsuarioSeleccionado(null);
                   if (val.length > 1) {
                     void buscarUsuario(val);
                   } else {
                     setUsuariosBuscados([]);
                   }
                 }}
                 className="w-full bg-transparent p-4 text-white font-bold outline-none placeholder:text-zinc-600"
                 placeholder="nombre de jugador"
               />`;

content = content.replace(t2, r2);

fs.writeFileSync(p, content, 'utf8');
console.log('Replaced successfully');
