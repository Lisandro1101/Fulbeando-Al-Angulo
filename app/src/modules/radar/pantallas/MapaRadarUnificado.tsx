import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, X, Search, Phone, Clock, Target, User } from 'lucide-react';
import { listarDesafiosCercanos, consultarRadar, type RadarPin } from '../radarService';
import { listarPrediosCercanos } from '@/modules/predios/repositorio';
import { listarCandidatosRadar } from '@/modules/usuarios/repositorio';
import { listarEquiposCercanos, notificarAceptacionDesafio } from '@/modules/teams/teamService';
import { useSesion } from '@/modules/auth/useSesion';
import { canchasDe, nombreCompleto } from '@/domain';
import { type Punto } from '@/core/geo/geohash';
import { appEnv } from '@/core/config';
import Supercluster from 'supercluster';
import type { ClusterFeature, PointFeature } from 'supercluster';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Toast } from '@/modules/ui/overlays';

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

// 🟣 Pin Violeta: Equipos del area
const iconoEquipo = L.divIcon({
  className: 'marcador-equipo',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #8B5CF6; border: 3px solid #0F172A; box-shadow: 0 0 15px #8B5CF6; display: flex; align-items: center; justify-content: center; font-size: 14px;">🧢</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 🔴 Pin Rojo Fuego: Desafíos
const iconoDesafio = L.divIcon({
  className: 'marcador-desafio',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #EF4444; border: 3px solid #0F172A; box-shadow: 0 0 15px #EF4444; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 🔵 Pin Azul: Jugador Libre
const iconoJugadorLibre = L.divIcon({
  className: 'marcador-jugador',
  html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #3B82F6; border: 3px solid #0F172A; box-shadow: 0 0 15px #3B82F6; display: flex; align-items: center; justify-content: center; font-size: 14px;">🏃</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

/** Icono de pin segun el tipo de entidad del radar. */
function iconoDe(tipo: RadarEntityType): L.DivIcon {
  if (tipo === 'cancha') return iconoPredio;
  if (tipo === 'equipo') return iconoEquipo;
  if (tipo === 'desafio') return iconoDesafio;
  return iconoJugadorLibre;
}

const EMOJI_POR_TIPO: Record<RadarEntityType, string> = {
  cancha: '🏟️',
  equipo: '🧢',
  desafio: '🛡️',
  jugador: '🏃',
};

/** Bounding box del viewport en el orden que espera supercluster: [W, S, E, N]. */
function bboxDe(map: L.Map): [number, number, number, number] {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

/** Propiedades que viajan dentro del indice de supercluster. */
type RadarProps = { entity: RadarEntity };
type RadarClusterFeature = ClusterFeature<RadarProps>;
type RadarPointFeature = PointFeature<RadarProps>;
type RadarFeature = RadarClusterFeature | RadarPointFeature;

/** Supercluster devuelve clusters y puntos planos en la misma lista. */
function esCluster(f: RadarFeature): f is RadarClusterFeature {
  return (f.properties as { cluster?: boolean }).cluster === true;
}

const COLOR_POR_TIPO: Record<RadarEntityType, string> = {
  cancha: '#10B981',
  equipo: '#8B5CF6',
  desafio: '#EF4444',
  jugador: '#3B82F6',
};

interface InfoCluster {
  total: number;
  dominante: RadarEntityType;
}

/** Desglose de un cluster: cantidad de hojas y tipo dominante. */
function infoDeCluster(indice: Supercluster<RadarProps>, f: RadarClusterFeature): InfoCluster {
  const total = f.properties.point_count;
  const hojas = indice.getLeaves(f.properties.cluster_id, total, 0);
  const conteo = new Map<RadarEntityType, number>();
  for (const h of hojas) {
    const t = h.properties.entity.type;
    conteo.set(t, (conteo.get(t) ?? 0) + 1);
  }
  const dominante = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'jugador';
  return { total, dominante };
}

/**
 * Icono del cluster estilo "badge": el emoji del tipo dominante con un
 * contador de color pegado arriba a la derecha. Agrupa todo lo que comparte
 * pantalla (canchas, equipos, desafios y jugadores libres).
 */
function iconoCluster(indice: Supercluster<RadarProps>, f: RadarClusterFeature): L.DivIcon {
  const { total, dominante } = infoDeCluster(indice, f);
  const color = COLOR_POR_TIPO[dominante];
  const emoji = EMOJI_POR_TIPO[dominante];
  const html = `<span style="position:relative;display:inline-block"><span style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))">${emoji}</span><span style="position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 4px;border-radius:9999px;background:${color};color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #0B0F19">${total}</span></span>`;
  return L.divIcon({
    className: 'cluster-radar',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function MapEventsListener({
  onMove,
  listo,
  centroEsperado,
}: {
  onMove: (lat: number, lng: number, radiusKm: number) => void;
  /** La sesion ya resolvio: recien ahi vale la pena consultar. */
  listo: boolean;
  /** Centro al que el mapa tiende (llegada de la sesion o de la ubicacion). */
  centroEsperado: { lat: number; lng: number };
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const radiusKm = center.distanceTo(bounds.getNorthEast()) / 1000;
      onMove(center.lat, center.lng, radiusKm);
    }
  });

  // La carga inicial tambien pasa por aqui, con el MISMO criterio que al
  // mover el mapa: radio del viewport (lo que se ve), no un radio fijo.
  // Antes de `listo` no emitimos: el centro todavia puede ser el fallback
  // CABA y saldria una consulta a una zona que el usuario no esta viendo.
  // Lo mismo si el mapa esta camino a `centroEsperado` (flyTo en curso):
  // quien cierra esa carga es el moveend del vuelo.
  const emitido = useRef(false);
  useEffect(() => {
    if (!listo || emitido.current) return;
    const center = map.getCenter();
    if (
      Math.abs(center.lat - centroEsperado.lat) > 1e-6 ||
      Math.abs(center.lng - centroEsperado.lng) > 1e-6
    ) {
      return;
    }
    const bounds = map.getBounds();
    emitido.current = true;
    onMove(center.lat, center.lng, center.distanceTo(bounds.getNorthEast()) / 1000);
  }, [listo, map, onMove, centroEsperado]);

  return null;
}

function FlyToLocation({ lat, lng }: { lat: number | null, lng: number | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat && lng) {
      // Solo si el centro cambio de verdad (llego la sesion o la ubicacion):
      // volar al mismo punto no aporta y dispara un moveend innecesario.
      const actual = map.getCenter();
      if (Math.abs(actual.lat - lat) < 1e-6 && Math.abs(actual.lng - lng) < 1e-6) return;
      // Conserva el zoom actual: la vista es la que se esta viendo, y de ahi
      // sale el radio de la proxima carga.
      map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 1.5 });
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
  creatorId: string;
  equipoId?: string;
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

/**
 * FASE 2: mapea un pin del radar (DTO corto que devuelve la Cloud Function
 * `radarQuery`) a la entidad que pintan los marcadores. Los labels viven en el
 * cliente (mismo `ETIQUETA_POSICION`/`nombreCompleto` de siempre): el server no
 * duplica reglas de presentacion.
 */
const entidadDePin = (pin: RadarPin): RadarEntity => {
  const base = { id: pin.id, lat: pin.lat, lng: pin.lng, distanciaKm: pin.d };
  switch (pin.t) {
    case 'cancha':
      return { ...base, type: 'cancha', nombre: pin.nombre, tipo: pin.tipo, cantidadCanchas: pin.cantidadCanchas };
    case 'equipo':
      return { ...base, type: 'equipo', equipoId: pin.id, nombre: pin.nombre, modalidad: pin.modalidad, cantidadJugadores: pin.cantidadJugadores, escudoUrl: pin.escudoUrl };
    case 'desafio':
      return { ...base, type: 'desafio', desafioId: pin.id, creatorId: pin.creatorId, equipoId: pin.equipoId ?? undefined, equipo: pin.equipo, modalidad: pin.modalidad, fechaUnix: pin.fechaUnix, conCancha: pin.conCancha, descripcion: pin.descripcion };
    case 'jugador':
      return { ...base, type: 'jugador', uid: pin.uid, apodo: `${pin.nombre} ${pin.apellido}`.trim() || 'Jugador', posicion: ETIQUETA_POSICION[pin.playerRole ?? ''] ?? 'Cualquiera', media: pin.media, fairPlay: pin.fairPlay };
  }
};

/**
 * Pinta los pins del radar con agrupado tipo supercluster.
 *
 * TODOS los tipos se agrupan por igual (predios/canchas, equipos, desafios y
 * jugadores libres): lo que comparte pantalla se funde en una burbuja con la
 * cantidad y el tipo dominante. Al tocar, se hace zoom hasta desagrupar.
 *
 * Se recalcula por viewport (bbox + zoom) porque agrupar es una decision visual
 * en el espacio de pantalla.
 */
function MarcadoresRadar({
  entidades,
  onSeleccionar,
}: {
  entidades: RadarEntity[];
  onSeleccionar: (e: RadarEntity) => void;
}) {
  const map = useMap();
  const [vista, setVista] = useState(() => ({ bbox: bboxDe(map), zoom: map.getZoom() }));

  useEffect(() => {
    const actualizar = () => setVista({ bbox: bboxDe(map), zoom: map.getZoom() });
    map.on('moveend', actualizar);
    map.on('zoomend', actualizar);
    actualizar();
    return () => {
      map.off('moveend', actualizar);
      map.off('zoomend', actualizar);
    };
  }, [map]);

  const indice = useMemo<Supercluster<RadarProps>>(() => {
    const idx = new Supercluster<RadarProps>({ radius: 64, maxZoom: 17, minPoints: 2 });
    idx.load(
      entidades.map((e) => ({
        type: 'Feature' as const,
        properties: { entity: e },
        geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] as [number, number] },
      })),
    );
    return idx;
  }, [entidades]);

  const clusters = useMemo(
    () => indice.getClusters(vista.bbox, Math.round(vista.zoom)) as unknown as RadarFeature[],
    [indice, vista],
  );

  return (
    <>
      {clusters.map((f) => {
        const lng = f.geometry.coordinates[0]!;
        const lat = f.geometry.coordinates[1]!;
        if (esCluster(f)) {
          const clusterId = f.properties.cluster_id;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={iconoCluster(indice, f)}
              eventHandlers={{
                click: () => {
                  const expansion = indice.getClusterExpansionZoom(clusterId);
                  map.flyTo([lat, lng], Math.min(expansion, 18), { animate: true, duration: 0.6 });
                },
              }}
            />
          );
        }
        const entidad = f.properties.entity;
        return (
          <Marker
            key={entidad.id}
            position={[lat, lng]}
            icon={iconoDe(entidad.type)}
            eventHandlers={{ click: () => onSeleccionar(entidad) }}
          />
        );
      })}
    </>
  );
}

// ==========================================
// MAPA RADAR UNIFICADO
// ==========================================
export const MapaRadarUnificado: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado de Filtros
  const [filtroActivo, setFiltroActivo] = useState<FiltroRadar>('todos');

  // Estado de Entidades en el Mapa
  const [entidades, setEntidades] = useState<RadarEntity[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado de Selección (Bottom Sheet)
  const [seleccionado, setSeleccionado] = useState<RadarEntity | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  
  const { usuario, cargando: cargandoSesion } = useSesion();
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
    // FASE 2: con la flag activa, una sola invocacion resuelve los pines (el
    // server aplica el mismo geohash + Haversine y devuelve un DTO corto). Si
    // la Function falla o no esta disponible, se cae a las consultas directas
    // de abajo: el radar nunca queda vacio por un deploy pendiente.
    if (appEnv().radarUsaFunction) {
      try {
        const { pins } = await consultarRadar(punto, radioKm);
        setEntidades(
          pins.map(entidadDePin).sort((a, b) => a.distanciaKm - b.distanciaKm).slice(0, 100)
        );
        return;
      } catch (err) {
        console.warn('radarQuery falló; se usan las consultas directas:', err);
      }
    }

    const [predios, desafios, jugadores, equipos] = await Promise.all([
      listarPrediosCercanos(punto, radioKm).catch((e) => { console.error('Error predios:', e); return []; }),
      listarDesafiosCercanos(punto, radioKm).catch((e) => { console.error('Error desafios:', e); return []; }),
      listarCandidatosRadar(punto, radioKm).catch((e) => { console.error('Error candidatos:', e); return []; }),
      listarEquiposCercanos(punto, radioKm).catch((e) => { console.error('Error equipos:', e); return []; }),
    ]);

    const canchasEntities: CanchaEntity[] = predios.map((p) => {
      const canchas = canchasDe(p);
      return {
        id: p.id,
        type: 'cancha' as const,
        lat: p.geo.lat,
        lng: p.geo.lng,
        distanciaKm: p.distanciaKm,
        nombre: p.nombre,
        tipo: canchas[0]?.tipo ?? 'Sintetico',
        cantidadCanchas: canchas.length
      };
    });

    const desafiosEntities: DesafioEntity[] = desafios.map(d => ({
      id: d.id,
      type: 'desafio' as const,
      lat: d.geo.lat,
      lng: d.geo.lng,
      distanciaKm: d.distanciaKm,
      desafioId: d.id,
      creatorId: d.creatorId,
      equipoId: d.equipoId,
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
        media: u.perfilDeportivo!.rating ?? 5.0,
        fairPlay: Math.round(u.perfilDeportivo!.stats?.fairPlayIndex ?? 100),
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
      ...canchasEntities,
      ...equiposEntities,
      ...desafiosEntities,
      ...jugadoresEntities,
    ].sort((a, b) => a.distanciaKm - b.distanciaKm).slice(0, 100));
  }, []);

  // La carga inicial no vive en un efecto aparte: la dispara
  // `MapEventsListener` cuando la sesion esta lista, con el radio del
  // viewport. Asi toda consulta del radar pasa por `vista` y su debounce,
  // y una sola decision gobierna el radio (lo que se esta viendo).
  //
  // Al mover el mapa se recalcula el radio y se recarga. El debounce va aqui (y
  // no en el servicio) para que un solo timer gobierne las TRES fuentes: si
  // cada servicio trajera el suyo, un mismo gesto dispararia tres timers.
  const [vista, setVista] = useState<{ punto: Punto; radioKm: number } | null>(null);

  const handleMapMove = useCallback((lat: number, lng: number, radiusKm: number) => {
    // Se elimina el limite estricto de 50km para que los puntos sigan viendose
    // al alejar el mapa. El limite ahora es por multitud (slice de 100 entidades maximo).
    const radioKm = Math.min(Math.max(radiusKm, 1), 5000);
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
    <div className="h-full w-full bg-canvas relative font-sans overflow-hidden">
      
      {/* Toast Notification */}
      <Toast mensaje={toastMessage} />

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
          <MapEventsListener
            onMove={handleMapMove}
            listo={!cargandoSesion}
            centroEsperado={mapCenter}
          />
          <FlyToLocation lat={mapCenter.lat} lng={mapCenter.lng} />

          <MarcadoresRadar
            entidades={entidadesVisibles}
            onSeleccionar={setSeleccionado}
          />        </MapContainer>
      </div>

      {/* HEADER FLOTANTE / FILTROS RAPIDOS */}
      <div className="absolute top-safe pt-3 md:pt-4 w-full flex justify-center z-10 pointer-events-none px-3">
        <div className="bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-full border border-zinc-800 flex items-center shadow-xl pointer-events-auto max-w-full overflow-x-auto hide-scrollbar gap-1">
          <button 
            onClick={() => setFiltroActivo('todos')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${filtroActivo === 'todos' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroActivo('canchas')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${filtroActivo === 'canchas' ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏟️ Canchas / Predios
          </button>
          <button
            onClick={() => setFiltroActivo('equipos')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${filtroActivo === 'equipos' ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.4)]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🧢 Equipos
          </button>
          <button
            onClick={() => setFiltroActivo('desafios')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${filtroActivo === 'desafios' ? 'bg-amber-500 text-amber-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🛡️ Desafíos
          </button>
          <button 
            onClick={() => setFiltroActivo('jugadores')}
            className={`px-4 py-2 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${filtroActivo === 'jugadores' ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏃 Jugadores Libres
          </button>
          {cargando && (
            <span className="px-3 py-2 text-[11px] font-bold text-zinc-500 whitespace-nowrap animate-pulse">
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
            className="absolute bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:bottom-24 right-4 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur text-blue-400 hover:text-blue-300 p-3.5 rounded-full shadow-lg z-10 active:scale-95 transition border border-zinc-700/80 cursor-pointer"
            title="Mi Ubicación"
            aria-label="Mi ubicación"
          >
            <Target className="w-5 h-5" />
          </button>
          
          <button onClick={() => navigate('/partidos', { state: { backgroundLocation: location } })} aria-label="Lanzar desafío" className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-8 right-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 active:scale-95 transition cursor-pointer">
            <Search className="w-6 h-6" />
          </button>
        </>
      )}

      {/* BOTTOM SHEET UNIFICADA */}
      {seleccionado && (
        <div className="fixed md:absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-0 right-0 md:left-6 md:right-auto md:w-[26rem] md:max-w-[calc(100vw-18rem)] bg-zinc-900/95 backdrop-blur-xl rounded-t-[32px] md:rounded-3xl border-t md:border border-zinc-800/80 p-5 sm:p-6 animate-in slide-in-from-bottom shadow-[0_-10px_50px_rgba(0,0,0,0.7)] md:shadow-2xl z-30 transition-all max-h-[80vh] overflow-y-auto">
          {/* Indicador de arrastre / grab bar */}
          <div className="w-10 h-1 bg-zinc-700/50 rounded-full mx-auto mb-3" />

          {/* Botón Cerrar: elevado y en su propia esquina sin tocar datos */}
          <button 
            onClick={() => setSeleccionado(null)} 
            aria-label="Cerrar panel" 
            className="absolute top-4 right-4 z-20 text-zinc-400 hover:text-white bg-zinc-800/90 hover:bg-zinc-700 rounded-full p-2 transition cursor-pointer border border-zinc-700/50 shadow-md active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>

          {/* RENDERIZADO CONDICIONAL SEGÚN TIPO */}
          
          {seleccionado.type === 'cancha' && (
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-emerald-500 ring-4 ring-emerald-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-3">
                🏟️
              </div>
              <h3 className="text-white font-black text-xl tracking-tight px-4">{seleccionado.nombre}</h3>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">{seleccionado.cantidadCanchas} Canchas • {seleccionado.tipo}</p>
              <span className="inline-block mt-2 mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                Predio Verificado
              </span>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button className="h-13 bg-zinc-800/90 hover:bg-zinc-800 text-white py-3 px-4 rounded-2xl font-bold border border-zinc-700/80 hover:border-zinc-500 flex justify-center items-center gap-2 active:scale-95 transition cursor-pointer text-sm shadow-md">
                  <Phone className="w-4 h-4 text-emerald-400" /> 
                  <span>WhatsApp</span>
                </button>
                <button 
                  onClick={() => navigate(`/reservar/${seleccionado.id}`, { state: { backgroundLocation: location } })}
                  className="h-13 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3 px-3 rounded-2xl font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] flex justify-center items-center gap-2 active:scale-95 transition cursor-pointer text-xs sm:text-sm whitespace-nowrap"
                >
                  <Clock className="w-4 h-4" /> 
                  <span>Ver y reservar</span>
                </button>
              </div>
            </div>
          )}

          {seleccionado.type === 'equipo' && (
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-sky-500 ring-4 ring-sky-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(14,165,233,0.3)] mb-3 overflow-hidden">
                {seleccionado.escudoUrl
                  ? <img src={seleccionado.escudoUrl} alt={`Escudo de ${seleccionado.nombre}`} className="w-full h-full object-cover" />
                  : '🧢'}
              </div>
              <h3 className="text-white font-black text-xl tracking-tight px-4 truncate max-w-full">{seleccionado.nombre}</h3>
              <div className="flex justify-center gap-2 text-xs font-bold mt-2 mb-3 flex-wrap">
                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/80">{seleccionado.modalidad}</span>
                <span className="bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-lg border border-sky-500/20">
                  {seleccionado.cantidadJugadores} en el plantel
                </span>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/80 font-medium">
                  {seleccionado.distanciaKm.toFixed(1)} km
                </span>
              </div>

              <p className="text-zinc-400 text-xs sm:text-sm mb-5 leading-relaxed px-2">
                Equipo que juega en tu zona. Si te interesa sumarte, coordiná la cancha desde el chat o mandales un mensaje.
              </p>

              <button
                onClick={() => {
                  if (!usuario) { navigate('/login'); return; }
                  setToastMessage('Mensaje enviado al equipo.');
                  setTimeout(() => setToastMessage(''), 3500);
                }}
                className="w-full h-13 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl font-black flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(14,165,233,0.35)] cursor-pointer"
              >
                Contactar al equipo
              </button>
            </div>
          )}

          {seleccionado.type === 'desafio' && (
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-amber-500 ring-4 ring-amber-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)] mb-3">
                🛡️
              </div>
              <h3 className="text-white font-black text-xl tracking-tight px-4 truncate max-w-full">{seleccionado.equipo}</h3>
              <div className="flex justify-center gap-2 text-xs font-bold mt-2 mb-3 flex-wrap">
                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/80">{seleccionado.modalidad}</span>
                <span className="bg-amber-400/10 text-amber-500 px-2.5 py-1 rounded-lg border border-amber-500/20">{formatearHorario(seleccionado.fechaUnix)}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/80 font-medium">{seleccionado.distanciaKm.toFixed(1)} km</span>
              </div>

              {/* PUENTE ENTRE MODULOS */}
              <div className={`mb-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ${seleccionado.conCancha ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'}`}>
                {seleccionado.conCancha
                  ? '✅ Cancha ya reservada (turno confirmado)'
                  : '🏟️ El equipo busca cancha: se coordina al aceptar'}
              </div>

              {seleccionado.descripcion && (
                <p className="text-zinc-300 text-xs sm:text-sm mb-5 leading-relaxed px-2">{seleccionado.descripcion}</p>
              )}

              <button 
                onClick={async () => {
                  if (!usuario) { navigate('/login'); return; }
                  if (seleccionado.creatorId === usuario.uid) {
                    setToastMessage('Este partido fue publicado por vos');
                    setTimeout(() => setToastMessage(''), 3000);
                    return;
                  }
                  try {
                    const nombreUsuario = nombreCompleto(usuario) || usuario.nombre || 'Un jugador';
                    await notificarAceptacionDesafio(
                      usuario.uid,
                      nombreUsuario,
                      seleccionado.creatorId,
                      {
                        id: seleccionado.desafioId,
                        equipoId: seleccionado.equipoId,
                        equipoNombre: seleccionado.equipo,
                        descripcion: seleccionado.descripcion,
                      }
                    );
                    setToastMessage('¡Aceptaste el desafío! Se le avisó al organizador ⚽');
                    setTimeout(() => setToastMessage(''), 4000);
                    setSeleccionado(null);
                  } catch (err: any) {
                    console.error('Error enviando aceptación del desafío:', err);
                    setToastMessage('No se pudo enviar el aviso al organizador.');
                    setTimeout(() => setToastMessage(''), 3000);
                  }
                }}
                className="w-full h-13 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm cursor-pointer"
              >
                Aceptar Desafío
              </button>
            </div>
          )}

          {seleccionado.type === 'jugador' && (
            <div className="flex flex-col items-center text-center pt-1">
              {/* Avatar con anillo luminoso y badge de disponibilidad */}
              <div className="relative mb-3">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-blue-500 ring-4 ring-blue-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(37,99,235,0.35)] overflow-hidden">
                  🏃
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-sm" title="Disponible hoy" />
              </div>

              {/* Título centralizado + Media */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2 px-4">
                <h3 className="text-white font-black text-xl tracking-tight">{seleccionado.apodo}</h3>
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-black text-xs tracking-wide shadow-sm">
                  M {seleccionado.media}
                </span>
              </div>

              {/* Badges de Posición y Fair Play centralizados */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold mb-2">
                <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg border border-zinc-700/80">
                  {seleccionado.posicion}
                </span>
                <span className="bg-amber-400/10 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1 font-bold">
                  ⭐ {seleccionado.fairPlay} FP
                </span>
              </div>

              {/* Distancia y disponibilidad */}
              <p className="text-xs text-zinc-400 font-medium mb-5">
                Disponible hoy · {seleccionado.distanciaKm.toFixed(1)} km de distancia
              </p>

              {/* Botones estilizados, equilibrados y con texto en una sola línea */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => navigate(`/carta/${seleccionado.uid || seleccionado.id}`)}
                  className="h-13 bg-zinc-800/90 hover:bg-zinc-800 text-white font-bold rounded-2xl border border-zinc-700/80 hover:border-zinc-500 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer text-sm shadow-md"
                >
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>Ver perfil</span>
                </button>
                <button 
                  onClick={() => {
                    setToastMessage(`¡Invitación al equipo enviada a ${seleccionado.apodo}!`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }} 
                  className="h-13 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer text-xs sm:text-sm tracking-wide whitespace-nowrap px-3"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invitar al Equipo</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
