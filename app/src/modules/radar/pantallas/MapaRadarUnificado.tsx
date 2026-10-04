import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, MessageCircle, X, Search, Calendar, Phone, Clock, Map as MapIcon, User, Shield } from 'lucide-react';
import { onMapMoveDebounced } from '../radarService'; // Asumiendo que reutilizamos la logica de debounce
import { listarPrediosPublicos } from '@/modules/predios/repositorio';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { canchasDe } from '@/domain';

// ==========================================
// ICONOS PERSONALIZADOS
// ==========================================

// 🟢 Pin Verde Esmeralda: Predios/Canchas
const iconoPredio = L.divIcon({
  className: 'marcador-predio',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #10B981; border: 3px solid #0F172A; box-shadow: 0 0 15px #10B981; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏟️</div>`,
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

// Tipos para el estado unificado
type RadarEntityType = 'cancha' | 'desafio' | 'jugador';

interface BaseEntity {
  id: string;
  lat: number;
  lng: number;
  type: RadarEntityType;
}

interface CanchaEntity extends BaseEntity {
  type: 'cancha';
  nombre: string;
  tipo: string;
  cantidadCanchas: number;
}

interface DesafioEntity extends BaseEntity {
  type: 'desafio';
  equipo: string;
  modalidad: string;
  horario: string;
}

interface JugadorEntity extends BaseEntity {
  type: 'jugador';
  apodo: string;
  posicion: string;
  media: number;
  horaDisponible: string;
  fairPlay: number;
}

type RadarEntity = CanchaEntity | DesafioEntity | JugadorEntity;

// ==========================================
// MAPA RADAR UNIFICADO
// ==========================================
export const MapaRadarUnificado: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado de Filtros
  const [filtros, setFiltros] = useState({
    canchas: true,
    desafios: true,
    jugadores: true
  });

  // Estado de Entidades en el Mapa
  const [entidades, setEntidades] = useState<RadarEntity[]>([]);
  
  // Estado de Selección (Bottom Sheet)
  const [seleccionado, setSeleccionado] = useState<RadarEntity | null>(null);

  const mapCenter = { lat: -34.9221, lng: -58.3842 }; 

  // CARGA DE DATOS
  useEffect(() => {
    let vigente = true;
    const loadData = async () => {
      try {
        // Obtenemos los predios reales de Firebase
        const prediosReales = await listarPrediosPublicos('');
        if (!vigente) return;

        const canchasEntities: CanchaEntity[] = prediosReales.map(p => {
           const canchas = canchasDe(p);
           return {
             id: p.id,
             type: 'cancha' as const,
             lat: p.geo.lat,
             lng: p.geo.lng,
             nombre: p.nombre,
             tipo: canchas.length > 0 ? canchas[0].tipo : 'Sintético',
             cantidadCanchas: canchas.length
           };
        });

        // Mocks para desafíos y jugadores por ahora
        setEntidades([
          ...canchasEntities,
          { id: 'd1', type: 'desafio', lat: -34.9150, lng: -58.3800, equipo: 'Los Lobos FC', modalidad: 'F5', horario: 'Hoy 20:00 hs' },
          { id: 'j1', type: 'jugador', lat: -34.9201, lng: -58.3800, apodo: 'El Rústico', posicion: 'DEF', media: 50, horaDisponible: 'Hoy 19:00 hs', fairPlay: 3.5 }
        ]);

      } catch (err) {
        console.error("Error al cargar predios reales:", err);
      }
    };
    loadData();

    return () => {
      vigente = false;
    };
  }, []);

  // Lógica de Debounce para actualizar datos según la vista del mapa (Eficiencia Firestore)
  const handleMapMove = useCallback((lat: number, lng: number, radiusKm: number) => {
    onMapMoveDebounced(lat, lng, radiusKm, (nuevosDesafios) => {
      // Aquí se actualizarían las entidades con los datos frescos de Firestore usando la misma lógica.
      // En una implementación real, combinaríamos resultados de canchas, desafíos y jugadores
      // limitando a 20 documentos activos por tipo en el radio actual.
      // console.log("Mapa movido, actualizando entidades en radio:", radiusKm);
    });
  }, []);

  const toggleFiltro = (key: keyof typeof filtros) => {
    setFiltros(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Si el seleccionado actual se oculta, cerramos el bottom sheet
      if (seleccionado && 
         ((seleccionado.type === 'cancha' && !next.canchas) ||
          (seleccionado.type === 'desafio' && !next.desafios) ||
          (seleccionado.type === 'jugador' && !next.jugadores))) {
        setSeleccionado(null);
      }
      return next;
    });
  };

  const entidadesVisibles = useMemo(() => {
    return entidades.filter(e => {
      if (e.type === 'cancha') return filtros.canchas;
      if (e.type === 'desafio') return filtros.desafios;
      if (e.type === 'jugador') return filtros.jugadores;
      return false;
    });
  }, [entidades, filtros]);

  return (
    <div className="h-screen w-full bg-zinc-950 relative font-sans overflow-hidden">
      
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

          {entidadesVisibles.map(entidad => (
            <Marker 
              key={entidad.id}
              position={[entidad.lat, entidad.lng]} 
              icon={
                entidad.type === 'cancha' ? iconoPredio : 
                entidad.type === 'desafio' ? iconoDesafio : 
                iconoJugadorLibre
              }
              eventHandlers={{ click: () => setSeleccionado(entidad) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* HEADER FLOTANTE / FILTROS RAPIDOS */}
      <div className="absolute top-safe pt-4 px-4 w-full flex flex-col md:flex-row items-start md:items-center gap-3 z-10 pointer-events-none">
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full pointer-events-auto">
          <button 
            onClick={() => toggleFiltro('canchas')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-full font-bold text-[11px] sm:text-xs text-center whitespace-nowrap shadow-lg transition-colors border ${filtros.canchas ? 'bg-emerald-500 text-emerald-950 border-emerald-500' : 'bg-zinc-900/90 backdrop-blur text-zinc-400 border-zinc-700'}`}
          >
            🏟️ Predios
          </button>
          <button 
            onClick={() => toggleFiltro('desafios')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-full font-bold text-[11px] sm:text-xs text-center whitespace-nowrap shadow-lg transition-colors border ${filtros.desafios ? 'bg-amber-500 text-amber-950 border-amber-500' : 'bg-zinc-900/90 backdrop-blur text-zinc-400 border-zinc-700'}`}
          >
            🛡️ Desafíos
          </button>
          <button 
            onClick={() => toggleFiltro('jugadores')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-full font-bold text-[11px] sm:text-xs text-center whitespace-nowrap shadow-lg transition-colors border ${filtros.jugadores ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900/90 backdrop-blur text-zinc-400 border-zinc-700'}`}
          >
            🏃 Libres
          </button>
        </div>
      </div>

      {/* FAB - Lanzar Desafío (Sólo visible si no hay nada seleccionado para no molestar) */}
      {!seleccionado && (
        <button onClick={() => navigate('/radar/challenge')} className="absolute bottom-24 right-4 bg-amber-500 text-zinc-950 p-4 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] z-10 active:scale-95 transition-transform">
          <Search className="w-6 h-6" />
        </button>
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
                  <Clock className="w-4 h-4" /> Ver Horarios
                </button>
              </div>
            </div>
          )}

          {seleccionado.type === 'desafio' && (
            <div>
               <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-amber-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(245,158,11,0.3)]">🐺</div>
                <div>
                  <h3 className="text-white font-black text-xl">{seleccionado.equipo}</h3>
                  <div className="flex gap-2 text-xs font-bold mt-1">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{seleccionado.modalidad}</span>
                    <span className="bg-amber-400/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">{seleccionado.horario}</span>
                  </div>
                </div>
              </div>
              <button className="w-full bg-amber-500 text-amber-950 py-4 rounded-xl font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm">
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
                  <p className="text-xs text-zinc-400 mt-2 font-medium">Disponible: {seleccionado.horaDisponible}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-zinc-800 text-white py-3.5 rounded-xl font-bold border border-zinc-700 flex justify-center items-center gap-2 hover:border-blue-500 hover:text-blue-500 active:bg-zinc-700 transition">
                  <MessageCircle className="w-4 h-4" /> Invitar a Hoy
                </button>
                <button className="bg-blue-600 text-white py-3.5 rounded-xl font-black shadow-[0_0_15px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2 active:scale-95 transition">
                  <UserPlus className="w-4 h-4" /> Fichar
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
