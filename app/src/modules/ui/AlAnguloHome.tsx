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
import { Users, Search, Calendar, Shield, Swords, ArrowRight, MessageSquare, MapPin, PlusCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabHome = 'muro' | 'partidos' | 'equipos';

export default function AlAnguloHome() {
  const { cargando: cargandoSesion, usuario } = useSesion();
  const navigate = useNavigate();

  const [tabActiva, setTabActiva] = useState<TabHome>('muro');
  const [partidos, setPartidos] = useState<Desafio[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('todas');
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
      <div className="flex h-full items-center justify-center bg-transparent text-emerald-600 font-bold gap-3">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Cargando comunidad...</span>
      </div>
    );
  }

  const queryLimpia = busqueda.trim().toLowerCase();

  const partidosFiltrados = partidos.filter(p => {
    if (filtroModalidad !== 'todas') {
      if (filtroModalidad === 'con_cancha' && p.estadoCancha !== 'CON_CANCHA') return false;
      if (filtroModalidad !== 'con_cancha' && p.modalidad?.toLowerCase() !== filtroModalidad.toLowerCase()) return false;
    }
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

  const placeholderBusqueda = () => {
    if (tabActiva === 'muro') return 'Buscar en publicaciones, jugadores, zonas...';
    if (tabActiva === 'partidos') return 'Buscar partidos, modalidades, posiciones...';
    return 'Buscar equipos por nombre o modalidad...';
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans text-slate-800 overflow-hidden relative">
      <Toast mensaje={toastMensaje} />
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pb-28"
      >
        
        {/* HEADER BÚSQUEDA Y PESTAÑAS PRINCIPALES */}
        <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/80 space-y-3">
          {/* Input de Búsqueda */}
          <div className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 focus-within:border-emerald-500/50 shadow-sm transition">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input 
              aria-label="Buscador de comunidad"
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={placeholderBusqueda()} 
              className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-sm"
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Pestañas Principales: Muro / Partidos & Desafíos / Equipos */}
          <div className="flex bg-slate-200/80 border border-slate-300/80 rounded-xl p-1 gap-1 shadow-inner">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTabActiva('muro')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tabActiva === 'muro'
                  ? 'bg-emerald-600 text-white shadow-md font-black'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Muro Social</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTabActiva('partidos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tabActiva === 'partidos'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Partidos</span>
              {partidos.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${tabActiva === 'partidos' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-slate-300 text-amber-900 border border-amber-500/30 font-bold'}`}>
                  {partidos.length}
                </span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTabActiva('equipos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tabActiva === 'equipos'
                  ? 'bg-emerald-600 text-white shadow-md font-black'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Equipos</span>
              {equipos.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${tabActiva === 'equipos' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-slate-300 text-emerald-900 border border-emerald-500/30 font-bold'}`}>
                  {equipos.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

        {/* TAB 1: MURO SOCIAL */}
        {tabActiva === 'muro' && (
          <Feed busqueda={busqueda} />
        )}

        {/* TAB 2: PARTIDOS Y DESAFÍOS */}
        {tabActiva === 'partidos' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-amber-500" />
                  Partidos y Desafíos
                </h2>
                <p className="text-xs text-slate-600 font-semibold">Equipos buscando rival o completando el plantel</p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/partidos')}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black py-2 px-3.5 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-md"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Lanzar Desafío
              </motion.button>
            </div>

            {/* Chips de filtro por modalidad */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'todas', label: 'Todas las modalidades' },
                { id: 'F5', label: 'Fútbol 5' },
                { id: 'F7', label: 'Fútbol 7' },
                { id: 'F11', label: 'Fútbol 11' },
                { id: 'con_cancha', label: 'Con Cancha' },
              ].map(({ id, label }) => {
                const activo = filtroModalidad === id;
                return (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFiltroModalidad(id)}
                    className={`text-xs font-bold py-1.5 px-3 rounded-full border transition-all shrink-0 cursor-pointer ${
                      activo
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 font-black shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 font-bold shadow-sm'
                    }`}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>

            {partidosFiltrados.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3">
                <Swords className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-zinc-300 text-sm font-medium">
                  {busqueda ? 'No hay partidos que coincidan con la búsqueda.' : 'No hay desafíos abiertos en este momento.'}
                </p>
                <button 
                  onClick={() => navigate('/partidos')}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black py-2 px-4 rounded-xl transition cursor-pointer"
                >
                  Lanzar Desafío Ahora
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {partidosFiltrados.map(p => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition shadow-sm"
                  >
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
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
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
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-3.5 rounded-lg transition cursor-pointer shadow-md"
                      >
                        Anotarme
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: EQUIPOS Y MERCADO */}
        {tabActiva === 'equipos' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Equipos en la comunidad
                </h2>
                <p className="text-xs text-slate-600 font-semibold">Clubes y combinados buscando jugadores o rivales</p>
              </div>
              <button 
                onClick={() => navigate('/equipo')}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black py-2 px-3.5 rounded-xl transition cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Crear Equipo
              </button>
            </div>

            {equiposFiltrados.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3">
                <Shield className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-zinc-300 text-sm font-medium">
                  {busqueda ? 'No hay equipos que coincidan con la búsqueda.' : 'No hay equipos registrados en este momento.'}
                </p>
                <button 
                  onClick={() => navigate('/equipo')}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black py-2 px-4 rounded-xl transition cursor-pointer"
                >
                  Crear o Unirme a un Equipo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equiposFiltrados.map(e => (
                  <motion.div 
                    key={e.id} 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex justify-between items-center transition shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {e.shieldUrl ? (
                        <img src={e.shieldUrl} alt={e.name} className="w-11 h-11 rounded-full object-cover bg-zinc-800 border border-zinc-700 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-700 shrink-0">
                          <Shield className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-zinc-100 truncate">{e.name}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {e.modalidadBase || 'Fútbol 5'} • {e.members?.length || 1} jugadores
                        </p>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => navigate('/equipo')}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2 px-3.5 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      Ver
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

      </motion.div>
    </div>
  );
}
