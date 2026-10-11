import { useSesion } from '@/modules/auth/useSesion';
import { Users, Search } from 'lucide-react';

export default function AlAnguloHome() {
  const { cargando } = useSesion();

  if (cargando) {
    return <div className="flex h-full items-center justify-center bg-zinc-950 text-emerald-500 font-bold">Cargando comunidad...</div>;
  }

  // TODO: Fetch desde Firestore (Partidos y Equipos)
  const partidos: any[] = [];
  const equipos: any[] = [];

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-sans text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">
        
        {/* HEADER BÚSQUEDA */}
        <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md pt-2 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar partidos, equipos, jugadores..." 
              className="bg-transparent border-none outline-none w-full text-zinc-300 text-sm"
            />
          </div>
        </div>



        {/* FEED: PARTIDOS BUSCANDO JUGADORES */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-black text-white">Partidos buscando jugadores</h2>
            <button className="text-emerald-500 text-xs font-bold uppercase hover:text-emerald-400">Ver todos</button>
          </div>
          <div className="space-y-3">
            {partidos.map(p => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-200">{p.lugar}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{p.fecha} • {p.nivel}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                    Faltan {p.faltan}
                  </span>
                  <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-1 px-3 rounded-lg transition">
                    Anotarme
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEED: EQUIPOS */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-black text-white">Equipos en tu zona</h2>
            <button className="text-emerald-500 text-xs font-bold uppercase hover:text-emerald-400">Ver todos</button>
          </div>
          <div className="space-y-3">
            {equipos.map(e => (
              <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-200">{e.nombre}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{e.busqueda} • {e.zona}</p>
                  </div>
                </div>
                <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-1 px-3 rounded-lg transition">
                  Ver
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}
