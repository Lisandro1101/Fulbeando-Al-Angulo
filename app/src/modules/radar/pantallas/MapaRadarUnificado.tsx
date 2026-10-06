import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { UserPlus, X, Search, Phone, Clock, Target, User } from 'lucide-react';
import { listarDesafiosCercanos } from '../radarService';
import { listarPrediosPublicos } from '@/modules/predios/repositorio';
import { listarCandidatosRadar } from '@/modules/usuarios/repositorio';
import { listarEquiposCercanos } from '@/modules/teams/teamService';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { useSesion } from '@/modules/auth/useSesion';
import { canchasDe, nombreCompleto } from '@/domain';
import { appEnv } from '@/core/config';
import { haversineKm, type Punto } from '@/core/geo/geohash';
import { useGeolocation } from '@/hooks/useGeolocation';

const LOCALIDADES_FALLBACK = [
  { nombre: 'CABA', lat: -34.6037, lng: -58.3816 },
  { nombre: 'La Plata', lat: -34.9221, lng: -58.3842 },
  { nombre: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { nombre: 'Rosario', lat: -32.9442, lng: -60.6505 },
];

// 🟢 Pin Verde Esmeralda: Predios/Canchas
const iconoPredio = L.divIcon({
  className: 'marcador-predio',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #10B981; border: 3px solid #0F172A; box-shadow: 0 0 15px #10B981; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏟️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 🔷 Pin Celeste: Equipos del area. Es la capa que mira el dueno de cancha
// para saber a quien le puede ofrecer sus canchas.
const iconoEquipo = L.divIcon({
  className: 'marcador-equipo',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #0EA5E9; border: 3px solid #0F172A; box-shadow: 0 0 15px #0EA5E9; display: flex; align-items: center; justify-content: center; font-size: 14px;">🧢</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 🟠 Pin Ámbar/Naranja: Desafíos
const iconoDesafio = L.divIcon({
  className: 'marcador-desafio',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #F59E0B; border: 3px solid #0F172A; box-shadow: 0 0 15px #F59E0B; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 🔵 Pin Celeste/Azul Neón: Jugador Libre
const iconoJugadorLibre = L.divIcon({
  className: 'marcador-jugador',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #3B82F6; border: 3px solid #0F172A; box-shadow: 0 0 15px #3B82F6; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏃</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function MapEventsListener({ onMove }: { onMove: (lat: number, lng: number, radiusKm: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const radiusKm = center.distanceTo(bounds.getNorthEast()) / 1000;
      onMove(center.lat, center.lng, radiusKm);
    }
  });
  return null;
}

function FlyToLocation({ lat, lng }: { lat: number | null, lng: number | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

// Tipos para el estado unificado
type RadarEntityType = 'cancha' | 'equipo' | 'desafio' | 'jugador';

interface BaseEntity {
  id: string;
  lat: number;
  lng: number;
  type: RadarEntityType;
  distanciaKm: number;
}

interface CanchaEntity extends BaseEntity {
  type: 'cancha';
  nombre: string;
  tipo: string;
  cantidadCanchas: number;
}

/** Capa de equipos del area: la que mira el dueno de cancha para ofrecerles canchas. */
interface EquipoEntity extends BaseEntity {
  type: 'equipo';
  equipoId: string;
  nombre: string;
  modalidad: string;
  cantidadJugadores: number;
  escudoUrl: string | null;
}

interface DesafioEntity extends BaseEntity {
  type: 'desafio';
  /** Cruce con FULBEANDO: el desafio con `turnoId` ya tiene la cancha reservada. */
  desafioId: string;
  equipo: string;
  modalidad: string;
  fechaUnix: number;
  conCancha: boolean;
  descripcion: string | null;
}

interface JugadorEntity extends BaseEntity {
  type: 'jugador';
  uid: string;
  apodo: string;
  posicion: string;
  media: number;
  fairPlay: number;
}

type RadarEntity = CanchaEntity | EquipoEntity | DesafioEntity | JugadorEntity;

type FiltroRadar = 'todos' | 'canchas' | 'equipos' | 'desafios' | 'jugadores';

/** `yyyy-mm-dd hh:mm` en hora local, sin depender de librerias de fecha. */
const formatearHorario = (fechaUnix: number): string => {
  const d = new Date(fechaUnix);
  const p = (n: number) => String(n).padStart(2, '0');
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  const dia = mismoDia ? 'Hoy' : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
  return `${dia} ${p(d.getHours())}:${p(d.getMinutes())} hs`;
};

const ETIQUETA_POSICION: Record<string, string> = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Medio',
  FWD: 'Delantero',
  DT: 'DT',
};

// ==========================================
// MAPA RADAR UNIFICADO
// ==========================================
export const MapaRadarUnificado: React.FC = () => {
  const navigate = useNavigate();
  
  // Estado de Filtros
  const [filtroActivo, setFiltroActivo] = useState<FiltroRadar>('todos');

  // Estado de Entidades en el Mapa
  const [entidades, setEntidades] = useState<RadarEntity[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado de Selección (Bottom Sheet)
  const [seleccionado, setSeleccionado] = useState<RadarEntity | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  
  const { usuario } = useSesion();
  const { location: geoLoc, requestLocation, setLocation } = useGeolocation(
    usuario?.geo ? { lat: usuario.geo.lat, lng: usuario.geo.lng } : undefined
  );

  const fallbackLat = usuario?.geo?.lat ?? -34.6037;
  const fallbackLng = usuario?.geo?.lng ?? -58.3816;

  const mapCenter = { lat: geoLoc.latitude || fallbackLat, lng: geoLoc.longitude || fallbackLng };

  // CARGA DE DATOS
  //
  // Las cuatro fuentes se consultan en paralelo sobre el mismo punto/radio, y con
  // el mismo indice `geo.prefijos` (canchas, equipos, desafios y jugadores
  // comparten el motor de `core/geo`). Asi el mapa muestra la realidad de los dos
  // modulos.
  const cargarRadar = useCallback(async (punto: Punto, radioKm: number) => {
    const [predios, desafios, jugadores, equipos] = await Promise.all([
      listarPrediosPublicos('').catch(() => []),
      listarDesafiosCercanos(punto, radioKm).catch(() => []),
      listarCandidatosRadar(punto, radioKm).catch(() => []),
      listarEquiposCercanos(punto, radioKm).catch(() => []),
    ]);

    const canchasEntities: CanchaEntity[] = predios
      .filter(p => p.geo !== null)
      .map(p => {
        const canchas = canchasDe(p);
        return {
          id: p.id,
          type: 'cancha' as const,
          lat: p.geo!.lat,
          lng: p.geo!.lng,
          distanciaKm: haversineKm(punto, p.geo!),
          nombre: p.nombre,
          tipo: canchas[0]?.tipo ?? 'Sintetico',
          cantidadCanchas: canchas.length
        };
      })
      .filter(c => c.distanciaKm <= radioKm);

    const desafiosEntities: DesafioEntity[] = desafios.map(d => ({
      id: d.id,
      type: 'desafio' as const,
      lat: d.geo.lat,
      lng: d.geo.lng,
      distanciaKm: d.distanciaKm,
      desafioId: d.id,
      equipo: d.equipoNombre,
      modalidad: d.modalidad,
      fechaUnix: d.fechaUnix,
      // El puente con FULBEANDO: si hay turno, la cancha ya esta reservada.
      conCancha: d.turnoId !== null,
      descripcion: d.descripcion,
    }));

    const jugadoresEntities: JugadorEntity[] = jugadores
      .filter(u => u.geo !== null && u.perfilDeportivo !== null)
      .map(u => ({
        id: u.uid,
        type: 'jugador' as const,
        lat: u.geo!.lat,
        lng: u.geo!.lng,
        distanciaKm: u.distanciaKm,
        uid: u.uid,
        apodo: nombreCompleto(u) || 'Jugador',
        posicion: ETIQUETA_POSICION[u.perfilDeportivo!.playerRole ?? ''] ?? 'Cualquiera',
        media: u.perfilDeportivo!.rating,
        fairPlay: Math.round(u.perfilDeportivo!.stats.fairPlayIndex),
      }));

    const equiposEntities: EquipoEntity[] = equipos.map(e => ({
      id: e.id,
      type: 'equipo' as const,
      lat: e.geo!.lat,
      lng: e.geo!.lng,
      distanciaKm: e.distanciaKm,
      equipoId: e.id,
      nombre: e.name,
      modalidad: e.modalidadBase,
      cantidadJugadores: e.members.length,
      escudoUrl: e.shieldUrl ?? null,
    }));

    setEntidades([
      ...canchasEntities.sort((a, b) => a.distanciaKm - b.distanciaKm),
      ...equiposEntities.sort((a, b) => a.distanciaKm - b.distanciaKm),
      ...desafiosEntities.sort((a, b) => a.distanciaKm - b.distanciaKm),
      ...jugadoresEntities.sort((a, b) => a.distanciaKm - b.distanciaKm),
    ]);
  }, []);

  // Carga inicial, centrada donde el usuario esta.
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        await cargarRadar({ lat: mapCenter.lat, lng: mapCenter.lng }, appEnv().radarRadioKm);
      } catch (err) {
        console.error('Error al cargar el radar:', err);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => { vigente = false; };
  }, [cargarRadar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al mover el mapa se recalcula el radio y se recarga. El debounce va aqui (y
  // no en el servicio) para que un solo timer gobierne las TRES fuentes: si
  // cada servicio trajera el suyo, un mismo gesto dispararia tres timers.
  const [vista, setVista] = useState<{ punto: Punto; radioKm: number } | null>(null);

  const handleMapMove = useCallback((lat: number, lng: number, radiusKm: number) => {
    const radioKm = Math.min(Math.max(radiusKm, 1), 50);
    setVista({ punto: { lat, lng }, radioKm });
  }, []);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!vista) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCargando(true);
      cargarRadar(vista.punto, vista.radioKm)
        .catch((err) => console.error('Error al refrescar el radar:', err))
        .finally(() => setCargando(false));
    }, 700);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [vista, cargarRadar]);

  /** 'canchas' -> 'cancha'. Tabla explicita: derivarlo con `slice` es fragil. */
const TIPO_POR_FILTRO: Record<FiltroRadar, RadarEntityType | null> = {
  todos: null,
  canchas: 'cancha',
  equipos: 'equipo',
  desafios: 'desafio',
  jugadores: 'jugador',
};

// Limpiar selección si cambiamos de filtro y el seleccionado no aplica
  useEffect(() => {
    const tipoVisible = TIPO_POR_FILTRO[filtroActivo];
    if (seleccionado && tipoVisible !== null && seleccionado.type !== tipoVisible) {
      setSeleccionado(null);
    }
  }, [filtroActivo, seleccionado]);

  const entidadesVisibles = useMemo(() => {
    const tipoVisible = TIPO_POR_FILTRO[filtroActivo];
    return tipoVisible === null ? entidades : entidades.filter(e => e.type === tipoVisible);
  }, [entidades, filtroActivo]);

  return (
    <div className="h-full w-full bg-zinc-950 relative font-sans overflow-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-sm shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* MAPA BASE */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            className="mapa-oscuro-filtro"
          />
          <MapEventsListener onMove={handleMapMove} />
          {geoLoc.latitude && geoLoc.longitude && <FlyToLocation lat={geoLoc.latitude} lng={geoLoc.longitude} />}

          {entidadesVisibles.map(entidad => (
            <Marker 
              key={entidad.id}
              position={[entidad.lat, entidad.lng]} 
              icon={
                entidad.type === 'cancha' ? iconoPredio :
                entidad.type === 'equipo' ? iconoEquipo :
                entidad.type === 'desafio' ? iconoDesafio :
                iconoJugadorLibre
              }
              eventHandlers={{ click: () => setSeleccionado(entidad) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* HEADER FLOTANTE / FILTROS RAPIDOS */}
      <div className="absolute top-safe pt-4 w-full flex justify-center z-10 pointer-events-none px-2">
        <div className="bg-zinc-900/90 backdrop-blur-md p-1 rounded-full border border-zinc-800 flex shadow-xl pointer-events-auto max-w-full overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setFiltroActivo('todos')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors ${filtroActivo === 'todos' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroActivo('canchas')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors ${filtroActivo === 'canchas' ? 'bg-emerald-500 text-emerald-950' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏟️ Canchas / Predios
          </button>
          <button
            onClick={() => setFiltroActivo('equipos')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors ${filtroActivo === 'equipos' ? 'bg-sky-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🧢 Equipos
          </button>
          <button
            onClick={() => setFiltroActivo('desafios')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors ${filtroActivo === 'desafios' ? 'bg-amber-500 text-amber-950' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🛡️ Desafíos
          </button>
          <button 
            onClick={() => setFiltroActivo('jugadores')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors ${filtroActivo === 'jugadores' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏃 Jugadores Libres
          </button>
          {cargando && (
            <span className="px-3 py-2 text-[11px] font-bold text-zinc-500 whitespace-nowrap">
              Buscando…
            </span>
          )}
        </div>
      </div>

      {/* SELECTOR DE LOCALIDAD FALLBACK (Opcional, ya que ahora usa la ciudad del perfil, pero se mantiene como alternativa si quieren moverse) */}
      {geoLoc.isFallback && !usuario?.geo && (
        <div className="absolute top-20 w-full px-4 z-10 pointer-events-none">
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl p-3 shadow-xl pointer-events-auto">
            <p className="text-xs text-amber-500 font-bold mb-2">📍 Ubicación denegada. Seleccioná una zona:</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {LOCALIDADES_FALLBACK.map(loc => (
                <button
                  key={loc.nombre}
                  onClick={() => setLocation(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }))}
                  className="bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border border-zinc-700 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                >
                  {loc.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB - Lanzar Desafío (Sólo visible si no hay nada seleccionado para no molestar) */}
      {!seleccionado && (
        <>
          <button 
            onClick={requestLocation} 
            className="absolute bottom-40 right-4 bg-zinc-800 text-blue-500 p-3 rounded-full shadow-lg z-10 active:scale-95 transition-transform border border-zinc-700"
            title="Mi Ubicación"
          >
            <Target className="w-6 h-6" />
          </button>
          
          <button onClick={() => navigate('/partidos')} className="absolute bottom-24 right-4 bg-amber-500 text-zinc-950 p-4 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] z-10 active:scale-95 transition-transform">
            <Search className="w-6 h-6" />
          </button>
        </>
      )}

      <MenuNavegacion />

      {/* BOTTOM SHEET UNIFICADA */}
      {seleccionado && (
        <div className="absolute bottom-16 w-full bg-zinc-900 rounded-t-[32px] border-t border-zinc-800 p-6 animate-in slide-in-from-bottom shadow-[0_-10px_50px_rgba(0,0,0,0.6)] z-20 transition-all">
          <button onClick={() => setSeleccionado(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-zinc-800 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>

          {/* RENDERIZADO CONDICIONAL SEGÚN TIPO */}
          
          {seleccionado.type === 'cancha' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-emerald-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(16,185,129,0.3)]">🏟️</div>
                <div>
                  <h3 className="text-white font-black text-xl">{seleccionado.nombre}</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-semibold">{seleccionado.cantidadCanchas} Canchas • {seleccionado.tipo}</p>
                  <span className="inline-block mt-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Predio Verificado</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-zinc-800 text-white py-3.5 rounded-xl font-bold border border-zinc-700 flex justify-center items-center gap-2 active:bg-zinc-700 transition">
                  <Phone className="w-4 h-4" /> WhatsApp
                </button>
                <button 
                  onClick={() => navigate(`/reservar/${seleccionado.id}`)}
                  className="bg-emerald-500 text-zinc-950 py-3.5 rounded-xl font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 active:scale-95 transition"
                >
                  <Clock className="w-4 h-4" /> Ver canchas y reservar
                </button>
              </div>
            </div>
          )}

          {seleccionado.type === 'equipo' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-sky-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(14,165,233,0.3)]">
                  {seleccionado.escudoUrl
                    ? <img src={seleccionado.escudoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    : '🧢'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-black text-xl truncate">{seleccionado.nombre}</h3>
                  <div className="flex gap-2 text-xs font-bold mt-1 flex-wrap">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{seleccionado.modalidad}</span>
                    <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                      {seleccionado.cantidadJugadores} en el plantel
                    </span>
                    <span className="text-zinc-500 font-medium">{seleccionado.distanciaKm.toFixed(1)} km</span>
                  </div>
                </div>
              </div>

              <p className="text-zinc-400 text-sm mb-4">
                Equipo que juega en tu zona. Si te interesa Readiness, coordiná la cancha desde el
                chat o mandales un mensaje.
              </p>

              <button
                onClick={() => {
                  if (!usuario) { navigate('/login'); return; }
                  setToastMessage('Mensaje enviado al equipo.');
                  setTimeout(() => setToastMessage(''), 3500);
                }}
                className="w-full bg-sky-500 text-white py-4 rounded-xl font-black flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm"
              >
                Contactar al equipo
              </button>
            </div>
          )}

          {seleccionado.type === 'desafio' && (
            <div>
               <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-amber-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(245,158,11,0.3)]">🛡️</div>
                <div className="min-w-0">
                  <h3 className="text-white font-black text-xl truncate">{seleccionado.equipo}</h3>
                  <div className="flex gap-2 text-xs font-bold mt-1 flex-wrap">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{seleccionado.modalidad}</span>
                    <span className="bg-amber-400/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">{formatearHorario(seleccionado.fechaUnix)}</span>
                    <span className="text-zinc-500 font-medium">{seleccionado.distanciaKm.toFixed(1)} km</span>
                  </div>
                </div>
              </div>

              {/* PUENTE ENTRE MODULOS: si el desafio referencia un turno de
                  FULBEANDO, la cancha ya esta reservada y se muestra el puente. */}
              <div className={`mb-4 rounded-xl border px-4 py-3 text-xs font-semibold ${seleccionado.conCancha ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'}`}>
                {seleccionado.conCancha
                  ? '✅ Cancha ya reservada (turno confirmado)'
                  : '🏟️ El equipo busca cancha: se coordina al aceptar'}
              </div>

              {seleccionado.descripcion && (
                <p className="text-zinc-300 text-sm mb-4 leading-relaxed">{seleccionado.descripcion}</p>
              )}

              <button 
                onClick={() => {
                  if (!usuario) { navigate('/login'); return; }
                  setToastMessage('Desafío enviado. Te avisamos cuando alguien lo acepte.');
                  setTimeout(() => setToastMessage(''), 3500);
                }}
                className="w-full bg-amber-500 text-amber-950 py-4 rounded-xl font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm"
              >
                Aceptar Desafío
              </button>
            </div>
          )}

          {seleccionado.type === 'jugador' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-blue-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(37,99,235,0.3)] relative">
                  🏃
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-zinc-800 shadow-sm"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-white font-black text-xl">{seleccionado.apodo}</h3>
                    <div className="bg-zinc-950 px-2 py-1 rounded font-black text-amber-400 text-sm border border-zinc-800">M {seleccionado.media}</div>
                  </div>
                  <div className="flex gap-2 text-xs font-bold mt-1">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{seleccionado.posicion}</span>
                    <span className="bg-amber-400/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">⭐ {seleccionado.fairPlay} FP</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-medium">Disponible hoy · {seleccionado.distanciaKm.toFixed(1)} km de distancia</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-zinc-800 text-white py-3.5 rounded-xl font-bold border border-zinc-700 flex justify-center items-center gap-2 hover:border-blue-500 hover:text-blue-500 active:bg-zinc-700 transition">
                  <User className="w-4 h-4" /> Ver perfil
                </button>
                <button 
                  onClick={() => {
                    setToastMessage(`¡Invitación al equipo enviada a ${seleccionado.apodo}!`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }} 
                  className="bg-blue-600 text-white py-3.5 rounded-xl font-black shadow-[0_0_15px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2 active:scale-95 transition"
                >
                  <UserPlus className="w-4 h-4" /> Invitar al Equipo
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
