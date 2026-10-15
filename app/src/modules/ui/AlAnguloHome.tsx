import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/modules/auth/useSesion';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { COLECCIONES } from '@/core/config';
import type { Desafio, Equipo } from '@/domain';
import { nombreCompleto } from '@/domain';
import { notificarAceptacionDesafio } from '@/modules/teams/teamService';
import { Feed } from '@/modules/comunidad/componentes/Feed';
import { Toast } from '@/modules/ui/overlays';
import { Users, Search, Calendar, Shield, Swords, ArrowRight } from 'lucide-react';

export default function AlAnguloHome() {
  const { cargando: cargandoSesion, usuario } = useSesion();
  const navigate = useNavigate();

  const [partidos, setPartidos] = useState<Desafio[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargarDatos = async () => {
      setCargandoDatos(true);
      try {
        // Cargar desafíos abiertos
        let listaDesafios: Desafio[] = [];
        try {
          const qDesafios = query(
            collection(db, COLECCIONES.desafios),
            where('estado', '==', 'ABIERTO'),
            limit(20)
          );
          const snapDesafios = await getDocs(qDesafios);
          listaDesafios = snapDesafios.docs.map(d => ({ ...(d.data() as Desafio), id: d.id }));
        } catch (err) {
          console.warn('Error al consultar desafíos con filtro, reintentando consulta general:', err);
          const snapFallBack = await getDocs(query(collection(db, COLECCIONES.desafios), limit(10)));
          listaDesafios = snapFallBack.docs.map(d => ({ ...(d.data() as Desafio), id: d.id }));
        }

        // Cargar equipos
        let listaEquipos: Equipo[] = [];
        try {
          const qEquipos = query(collection(db, COLECCIONES.equipos), limit(20));
          const snapEquipos = await getDocs(qEquipos);
          listaEquipos = snapEquipos.docs.map(d => ({ ...(d.data() as Equipo), id: d.id }));
        } catch (err) {
          console.warn('Error al cargar equipos:', err);
        }

        if (!cancelado) {
          setPartidos(listaDesafios);
          setEquipos(listaEquipos);
        }
      } catch (err) {
        console.error('Error general cargando home:', err);
      } finally {
        if (!cancelado) {
          setCargandoDatos(false);
        }
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargandoSesion || cargandoDatos) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas text-emerald-500 font-bold gap-3">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Cargando comunidad...</span>
      </div>
    );
  }

  const queryLimpia = busqueda.trim().toLowerCase();

  const partidosFiltrados = partidos.filter(p => {
    if (!queryLimpia) return true;
    const nombre = p.equipoNombre?.toLowerCase() || '';
    const desc = p.descripcion?.toLowerCase() || '';
    const mod = p.modalidad?.toLowerCase() || '';
    const pos = p.posicionBuscada?.toLowerCase() || '';
    return nombre.includes(queryLimpia) || desc.includes(queryLimpia) || mod.includes(queryLimpia) || pos.includes(queryLimpia);
  });

  const equiposFiltrados = equipos.filter(e => {
    if (!queryLimpia) return true;
    const nombre = e.name?.toLowerCase() || '';
    const mod = e.modalidadBase?.toLowerCase() || '';
    return nombre.includes(queryLimpia) || mod.includes(queryLimpia);
  });

  const formatearFecha = (epochMs: number) => {
    if (!epochMs) return 'Fecha a coordinar';
    const d = new Date(epochMs);
    return `${d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs`;
  };

  return (
    <div className="flex flex-col h-full bg-canvas font-sans text-white overflow-hidden relative">
      <Toast mensaje={toastMensaje} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-28">
        
        {/* HEADER BÚSQUEDA */}
        <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur-md pt-2 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500/50 transition">
            <Search className="w-5 h-5 text-zinc-500 shrink-0" />
            <input 
              aria-label="Buscar partidos, equipos o posiciones"
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar partidos, equipos, posiciones..." 
              className="bg-transparent border-none outline-none w-full text-zinc-200 placeholder-zinc-500 text-sm"
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-bold"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* MURO SOCIAL: composer + feed (Comunidad / Mi zona / Siguiendo) */}
        {usuario && <Feed />}

        {/* FEED: PARTIDOS BUSCANDO JUGADORES / RIVAL */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-500" />
                Partidos y Desafíos
              </h2>
              <p className="text-xs text-zinc-400">Equipos buscando rival o completando el plantel</p>
            </div>
            <button 
              onClick={() => navigate('/partidos')}
              className="text-emerald-500 text-xs font-bold uppercase hover:text-emerald-400 transition"
            >
              Ver todos
            </button>
          </div>

          {partidosFiltrados.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 text-center space-y-3">
              <Swords className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-zinc-300 text-sm font-medium">
                {busqueda ? 'No hay partidos que coincidan con la búsqueda.' : 'No hay desafíos abiertos en este momento.'}
              </p>
              <button 
                onClick={() => navigate('/partidos')}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-2 px-4 rounded-xl transition"
              >
                Lanzar Desafío
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {partidosFiltrados.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-100">{p.equipoNombre}</span>
                      <span className="text-[11px] font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                        {p.modalidad || 'F5'}
                      </span>
                      {p.estadoCancha === 'CON_CANCHA' ? (
                        <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          Cancha lista
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Busca cancha
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {formatearFecha(p.fechaUnix)}
                    </p>
                    {p.descripcion && (
                      <p className="text-xs text-zinc-400 italic line-clamp-1">{p.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {p.posicionBuscada && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-black uppercase px-2.5 py-1 rounded-md">
                        Busca {p.posicionBuscada}
                      </span>
                    )}
                    <button 
                      onClick={async () => {
                        if (!usuario) {
                          navigate('/login');
                          return;
                        }
                        if (p.creatorId === usuario.uid) {
                          setToastMensaje('Este partido fue publicado por vos');
                          setTimeout(() => setToastMensaje(null), 3000);
                          return;
                        }
                        try {
                          const nombreUsuario = nombreCompleto(usuario) || usuario.nombre || 'Un jugador';
                          await notificarAceptacionDesafio(
                            usuario.uid,
                            nombreUsuario,
                            p.creatorId,
                            {
                              id: p.id,
                              equipoNombre: p.equipoNombre,
                              descripcion: p.descripcion,
                            }
                          );
                          setToastMensaje(`¡Te anotaste! Se le envió un aviso al organizador de ${p.equipoNombre} ⚽`);
                          setTimeout(() => setToastMensaje(null), 4000);
                        } catch (err) {
                          console.error('Error al anotarse al partido:', err);
                          setToastMensaje('No se pudo enviar la solicitud.');
                          setTimeout(() => setToastMensaje(null), 3000);
                        }
                      }}
                      className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-3.5 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      Anotarme
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FEED: EQUIPOS */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                Equipos en la comunidad
              </h2>
              <p className="text-xs text-zinc-400">Clubes y combinados buscando jugadores o rivales</p>
            </div>
            <button 
              onClick={() => navigate('/equipo')}
              className="text-emerald-500 text-xs font-bold uppercase hover:text-emerald-400 transition"
            >
              Ver todos
            </button>
          </div>

          {equiposFiltrados.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 text-center space-y-3">
              <Shield className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-zinc-300 text-sm font-medium">
                {busqueda ? 'No hay equipos que coincidan con la búsqueda.' : 'No hay equipos registrados en este momento.'}
              </p>
              <button 
                onClick={() => navigate('/equipo')}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-2 px-4 rounded-xl transition"
              >
                Crear o Unirme a un Equipo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {equiposFiltrados.map(e => (
                <div key={e.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex justify-between items-center transition">
                  <div className="flex items-center gap-3">
                    {e.shieldUrl ? (
                      <img src={e.shieldUrl} alt={e.name} className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-700" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-700">
                        <Shield className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-zinc-100">{e.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {e.modalidadBase || 'Fútbol 5'} • {e.members?.length || 1} jugadores
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/equipo')}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2 px-3.5 rounded-lg transition"
                  >
                    Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
