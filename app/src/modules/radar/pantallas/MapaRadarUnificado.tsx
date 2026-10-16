import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, X, Search, Phone, Clock, Target, User, MapPin, Navigation, Swords } from 'lucide-react';
import { listarDesafiosCercanos, consultarRadar, type RadarPin, type RadarPinCancha, type RadarPinDesafio } from '../radarService';
import { listarPrediosCercanos, obtenerPredio } from '@/modules/predios/repositorio';
import { listarCandidatosRadar } from '@/modules/usuarios/repositorio';
import { listarEquiposCercanos, notificarAceptacionDesafio, obtenerEquipoPorId } from '@/modules/teams/teamService';
import { ModalProponerDesafio } from '../componentes/ModalProponerDesafio';
import { useSesion } from '@/modules/auth/useSesion';
import { canchasDe, nombreCompleto, calcularMediaJugador, calcularDivisionEquipo, type DivisionEquipoInfo } from '@/domain';
import { type Punto } from '@/core/geo/geohash';
import { appEnv } from '@/core/config';
import Supercluster from 'supercluster';
import type { ClusterFeature, PointFeature } from 'supercluster';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Toast } from '@/modules/ui/overlays';
import { obtenerTemaSegunMedia } from '@/modules/cuenta/componentes/TarjetaJugador';

const LOCALIDADES_FALLBACK = [
  { nombre: 'CABA', lat: -34.6037, lng: -58.3816 },
  { nombre: 'La Plata', lat: -34.9221, lng: -58.3842 },
  { nombre: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { nombre: 'Rosario', lat: -32.9442, lng: -60.6505 },
];

// SVGs para Leaflet Pins y Marcadores HTML
export const SVG_CANCHA_HTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3.5"/><path d="M8 2v3.5a0.5 0.5 0 0 0 .5.5h7a0.5 0.5 0 0 0 .5-.5V2"/><path d="M8 22v-3.5a0.5 0.5 0 0 1 .5-.5h7a0.5 0.5 0 0 1 .5.5V22"/></svg>`;

export const SVG_EQUIPO_HTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.25)"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M4.5 9h15"/></svg>`;

export const SVG_DESAFIO_HTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.18)"/><circle cx="12" cy="12" r="10"/><polygon points="12 7 15.5 9.5 14 13.5 10 13.5 8.5 9.5" fill="#FFFFFF"/><line x1="12" y1="7" x2="12" y2="2"/><line x1="15.5" y1="9.5" x2="20.5" y2="7.5"/><line x1="14" y1="13.5" x2="18" y2="18.5"/><line x1="10" y1="13.5" x2="6" y2="18.5"/><line x1="8.5" y1="9.5" x2="3.5" y2="7.5"/></svg>`;

export const SVG_JUGADOR_HTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#FFFFFF"><circle cx="13" cy="3.5" r="2.2"/><path d="M12.5 6.8c-.7 0-1.3.4-1.6 1L8.2 12.5l1.6.9 1.6-3.2 1.2 1.1-2.8 7.8 1.9.7 2.8-7.2 1.8 1.9V21h2.2v-7.8l-2.4-2.7 1.2-2.9c.3-.7-.2-1.4-1-1.4h-2.2z"/><circle cx="19.5" cy="19.5" r="2.2"/></svg>`;

export const SVG_CLUSTER_POR_TIPO: Record<RadarEntityType, string> = {
  cancha: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3.5"/><path d="M8 2v3.5a0.5 0.5 0 0 0 .5.5h7a0.5 0.5 0 0 0 .5-.5V2"/><path d="M8 22v-3.5a0.5 0.5 0 0 1 .5-.5h7a0.5 0.5 0 0 1 .5.5V22"/></svg>`,
  equipo: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.25)"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M4.5 9h15"/></svg>`,
  desafio: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.18)"/><circle cx="12" cy="12" r="10"/><polygon points="12 7 15.5 9.5 14 13.5 10 13.5 8.5 9.5" fill="#FFFFFF"/><line x1="12" y1="7" x2="12" y2="2"/><line x1="15.5" y1="9.5" x2="20.5" y2="7.5"/><line x1="14" y1="13.5" x2="18" y2="18.5"/><line x1="10" y1="13.5" x2="6" y2="18.5"/><line x1="8.5" y1="9.5" x2="3.5" y2="7.5"/></svg>`,
  jugador: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#FFFFFF"><circle cx="13" cy="3.5" r="2.2"/><path d="M12.5 6.8c-.7 0-1.3.4-1.6 1L8.2 12.5l1.6.9 1.6-3.2 1.2 1.1-2.8 7.8 1.9.7 2.8-7.2 1.8 1.9V21h2.2v-7.8l-2.4-2.7 1.2-2.9c.3-.7-.2-1.4-1-1.4h-2.2z"/><circle cx="19.5" cy="19.5" r="2.2"/></svg>`,
};

// Componentes SVG para UI en React
export const IconoCancha = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M8 2v3.5a0.5 0.5 0 0 0 .5.5h7a0.5 0.5 0 0 0 .5-.5V2" />
    <path d="M8 22v-3.5a0.5 0.5 0 0 1 .5-.5h7a0.5 0.5 0 0 1 .5.5V22" />
  </svg>
);

export const IconoEquipo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.25" />
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M4.5 9h15" />
  </svg>
);

export const IconoDesafio = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.18" />
    <circle cx="12" cy="12" r="10" />
    <polygon points="12 7 15.5 9.5 14 13.5 10 13.5 8.5 9.5" fill="currentColor" />
    <line x1="12" y1="7" x2="12" y2="2" />
    <line x1="15.5" y1="9.5" x2="20.5" y2="7.5" />
    <line x1="14" y1="13.5" x2="18" y2="18.5" />
    <line x1="10" y1="13.5" x2="6" y2="18.5" />
    <line x1="8.5" y1="9.5" x2="3.5" y2="7.5" />
  </svg>
);

export const IconoJugador = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="13" cy="3.5" r="2.2" />
    <path d="M12.5 6.8c-.7 0-1.3.4-1.6 1L8.2 12.5l1.6.9 1.6-3.2 1.2 1.1-2.8 7.8 1.9.7 2.8-7.2 1.8 1.9V21h2.2v-7.8l-2.4-2.7 1.2-2.9c.3-.7-.2-1.4-1-1.4h-2.2z" />
    <circle cx="19.5" cy="19.5" r="2.2" />
  </svg>
);

// 🟢 Pin Verde Esmeralda: Predios/Canchas (Dibujo de Cancha)
const iconoPredio = L.divIcon({
  className: 'marcador-predio',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #10B981; border: 3px solid #0F172A; box-shadow: 0 0 15px #10B981; display: flex; align-items: center; justify-content: center; color: #fff;">${SVG_CANCHA_HTML}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// 🟣 Pin Violeta: Equipos del area (Silueta de Escudo)
const iconoEquipo = L.divIcon({
  className: 'marcador-equipo',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #8B5CF6; border: 3px solid #0F172A; box-shadow: 0 0 15px #8B5CF6; display: flex; align-items: center; justify-content: center; color: #fff;">${SVG_EQUIPO_HTML}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// 🔴 Pin Rojo Fuego: Desafíos entre equipos (Pelota de Fútbol)
const iconoDesafio = L.divIcon({
  className: 'marcador-desafio',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #EF4444; border: 3px solid #0F172A; box-shadow: 0 0 15px #EF4444; display: flex; align-items: center; justify-content: center; color: #fff;">${SVG_DESAFIO_HTML}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// 🟡/🟠 Pin Ámbar: Búsqueda Urgente de Jugador Faltante (Convocatoria)
const iconoAlertaJugador = (faltan: number = 1) =>
  L.divIcon({
    className: 'marcador-alerta-jugador',
    html: `<div style="position:relative; width: 34px; height: 34px; border-radius: 50%; background: #F59E0B; border: 3px solid #0F172A; box-shadow: 0 0 18px #F59E0B; display: flex; align-items: center; justify-content: center; color: #0F172A; font-weight:900;">
      <span style="font-size: 16px;">🧤</span>
      <span style="position:absolute; top:-7px; right:-9px; background:#EF4444; color:#fff; font-size:10px; font-weight:900; padding:1px 5px; border-radius:9999px; border:2px solid #0F172A; box-shadow: 0 2px 5px rgba(0,0,0,0.5); white-space:nowrap;">-${faltan}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

// 🔵 Pin Azul: Jugador Libre (Jugador de Fútbol)
const iconoJugadorLibre = L.divIcon({
  className: 'marcador-jugador',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #3B82F6; border: 3px solid #0F172A; box-shadow: 0 0 15px #3B82F6; display: flex; align-items: center; justify-content: center; color: #fff;">${SVG_JUGADOR_HTML}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

/** Icono de pin segun el tipo de entidad del radar. */
function iconoDe(entidad: RadarEntity): L.DivIcon {
  if (entidad.type === 'cancha') return iconoPredio;
  if (entidad.type === 'equipo') return iconoEquipo;
  if (entidad.type === 'desafio') {
    if (entidad.tipoDesafio === 'busqueda_jugador') {
      return iconoAlertaJugador(entidad.jugadoresFaltantes || 1);
    }
    return iconoDesafio;
  }
  return iconoJugadorLibre;
}

const EMOJI_POR_TIPO: Record<RadarEntityType, string> = {
  cancha: '🏟️',
  equipo: '🛡️',
  desafio: '⚽',
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
  const svg = SVG_CLUSTER_POR_TIPO[dominante];
  const html = `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#0F172A;border:2.5px solid ${color};box-shadow:0 0 15px ${color}80;color:#fff;">${svg}<span style="position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 4px;border-radius:9999px;background:${color};color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #0B0F19">${total}</span></span>`;
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
  direccion?: string;
  barrio?: string;
  ciudad?: string;
  telefono?: string;
  tipo: string;
  cantidadCanchas: number;
  promedioRating?: number;
  ratingCount?: number;
}

/** Capa de equipos del area: la que mira el dueno de cancha para ofrecerles canchas. */
interface EquipoEntity extends BaseEntity {
  type: 'equipo';
  equipoId: string;
  nombre: string;
  modalidad: string;
  cantidadJugadores: number;
  escudoUrl: string | null;
  captainId?: string;
  fairPlayScore?: number;
  stats?: { wins: number; draws: number; losses: number };
  divisionInfo?: DivisionEquipoInfo;
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
  tipoDesafio?: 'partido_equipo' | 'busqueda_jugador';
  posicionBuscada?: string | null;
  jugadoresFaltantes?: number;
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

/** Normaliza un número telefónico para abrir un chat de WhatsApp con wa.me */
export const formatearParaWhatsApp = (rawTel: string): string => {
  let num = rawTel.replace(/\D/g, '');
  if (!num) return '';

  // Ya tiene formato internacional argentino completo con 9
  if (num.startsWith('549')) return num;

  // Empieza con 54 (código de Argentina) pero sin el 9 de celular
  if (num.startsWith('54')) {
    return `549${num.slice(2)}`;
  }

  // Quitar 0 inicial de prefijo interurbano (ej: 011 -> 11)
  if (num.startsWith('0')) {
    num = num.slice(1);
  }

  // Quitar el '15' de celular local si está presente tras el código de área (ej: 11 15 1234 5678 -> 11 1234 5678)
  if (num.length === 12) {
    if (num.slice(2, 4) === '15') {
      num = num.slice(0, 2) + num.slice(4);
    } else if (num.slice(3, 5) === '15') {
      num = num.slice(0, 3) + num.slice(5);
    }
  }

  // Celular argentino habitual de 10 dígitos (área + local)
  if (num.length === 10) {
    return `549${num}`;
  }

  // Si tiene 11 dígitos y empieza con 9
  if (num.length === 11 && num.startsWith('9')) {
    return `54${num}`;
  }

  // Otros números internacionales (más de 10 dígitos)
  if (num.length > 10) {
    return num;
  }

  return `549${num}`;
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
    case 'cancha': {
      const p = pin as RadarPinCancha;
      return {
        ...base,
        type: 'cancha',
        nombre: p.nombre,
        direccion: p.direccion,
        barrio: p.barrio,
        ciudad: p.ciudad,
        telefono: p.telefono,
        tipo: p.tipo,
        cantidadCanchas: p.cantidadCanchas,
      };
    }
    case 'equipo': {
      const p = pin as RadarPinEquipo;
      const divisionInfo = calcularDivisionEquipo({
        stats: p.stats,
        reputation: typeof p.fairPlayScore === 'number' ? { fairPlayScore: p.fairPlayScore, buenRivalCount: 0, conflictivoCount: 0, partidosJugados: 0 } : null,
      });
      return {
        ...base,
        type: 'equipo',
        equipoId: pin.id,
        nombre: pin.nombre,
        modalidad: pin.modalidad,
        cantidadJugadores: pin.cantidadJugadores,
        escudoUrl: pin.escudoUrl,
        fairPlayScore: p.fairPlayScore,
        stats: p.stats,
        divisionInfo,
      };
    }
    case 'desafio': {
      const p = pin as RadarPinDesafio;
      return {
        ...base,
        type: 'desafio',
        desafioId: pin.id,
        creatorId: pin.creatorId,
        equipoId: pin.equipoId ?? undefined,
        equipo: pin.equipo,
        modalidad: pin.modalidad,
        fechaUnix: pin.fechaUnix,
        conCancha: pin.conCancha,
        descripcion: pin.descripcion,
        tipoDesafio: p.tipoDesafio ?? (p.jugadoresFaltantes && p.jugadoresFaltantes > 0 ? 'busqueda_jugador' : 'partido_equipo'),
        posicionBuscada: p.posicionBuscada,
        jugadoresFaltantes: p.jugadoresFaltantes,
      };
    }
    case 'jugador': {
      const rawMedia = pin.media;
      const mediaFifa = rawMedia <= 10 && rawMedia > 0 ? Math.round(rawMedia * 10) : Math.round(rawMedia);
      const rawFp = pin.fairPlay;
      const fairPlayPct = rawFp <= 10 && rawFp > 0 ? Math.round(rawFp * 10) : Math.min(100, Math.round(rawFp));
      return {
        ...base,
        type: 'jugador',
        uid: pin.uid,
        apodo: `${pin.nombre} ${pin.apellido}`.trim() || 'Jugador',
        posicion: ETIQUETA_POSICION[pin.playerRole ?? ''] ?? 'Cualquiera',
        media: mediaFifa,
        fairPlay: fairPlayPct,
      };
    }
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
            icon={iconoDe(entidad)}
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
  const [mostrarModalDesafio, setMostrarModalDesafio] = useState(false);
  const [equipoDesafioModal, setEquipoDesafioModal] = useState<EquipoEntity | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [contactandoWhatsapp, setContactandoWhatsapp] = useState(false);

  // Auto-seleccionar equipo y abrir modal de desafío si vino por navegación o alerta push
  useEffect(() => {
    const st = location.state as { equipoId?: string; abrirDesafio?: boolean } | null;
    if (st?.equipoId) {
      obtenerEquipoPorId(st.equipoId).then((eq) => {
        if (eq) {
          const equipoFormateado = {
            id: eq.id,
            equipoId: eq.id,
            type: 'equipo' as const,
            nombre: eq.name || eq.nombre || 'Equipo',
            lat: eq.geo?.lat ?? -34.6037,
            lng: eq.geo?.lng ?? -58.3816,
            distanciaKm: 0,
            modalidad: eq.formato || 'F5',
            cantidadJugadores: eq.members?.length || 0,
            escudoUrl: eq.shieldUrl || eq.escudoUrl || null,
            captainId: eq.captainId,
          };
          setSeleccionado(equipoFormateado);
          if (st.abrirDesafio) {
            setEquipoDesafioModal(equipoFormateado);
            setMostrarModalDesafio(true);
          }
        }
      }).catch(console.warn);
    }
  }, [location.state]);

  // Si se selecciona un predio y no vino con teléfono o dirección en el pin rápido, lo obtenemos
  useEffect(() => {
    if (seleccionado?.type === 'cancha' && (!seleccionado.telefono || !seleccionado.direccion)) {
      obtenerPredio(seleccionado.id).then((p) => {
        if (p) {
          setSeleccionado((prev) =>
            prev && prev.id === p.id && prev.type === 'cancha'
              ? {
                  ...prev,
                  telefono: p.telefono || prev.telefono,
                  direccion: p.direccion || prev.direccion,
                  barrio: p.barrio || prev.barrio,
                  ciudad: p.ciudad || prev.ciudad,
                }
              : prev
          );
        }
      }).catch((err) => {
        console.warn('No se pudo cargar los datos completos del predio:', err);
      });
    }

    // Si se selecciona un equipo, hidratamos su división y datos completos desde Firestore
    if (seleccionado?.type === 'equipo') {
      obtenerEquipoPorId(seleccionado.equipoId).then((eq) => {
        if (eq) {
          let mediaPlantel: number | null = null;
          if (eq.members && eq.members.length > 0) {
            let suma = 0;
            eq.members.forEach((m: any) => {
              const st = eq.estadisticasJugadores?.[m.uid];
              suma += calcularMediaJugador({
                partidosJugados: st?.partidosJugados ?? 0,
                goles: st?.goles ?? 0,
                asistencias: st?.asistencias ?? 0,
                mvpCount: st?.mvpCount ?? 0,
                posicion: m.position ?? null,
              });
            });
            mediaPlantel = Math.round(suma / eq.members.length);
          }

          const divInfo = calcularDivisionEquipo({
            stats: eq.stats,
            mediaPlantel,
            reputation: eq.reputation,
          });

          setSeleccionado((prev) =>
            prev && prev.id === eq.id && prev.type === 'equipo'
              ? {
                  ...prev,
                  stats: eq.stats,
                  cantidadJugadores: eq.members.length,
                  escudoUrl: eq.shieldUrl ?? prev.escudoUrl,
                  captainId: eq.captainId ?? prev.captainId,
                  fairPlayScore: eq.reputation?.fairPlayScore ?? prev.fairPlayScore,
                  divisionInfo: divInfo,
                }
              : prev
          );
        }
      }).catch((err) => {
        console.warn('No se pudo hidratar los datos completos del equipo:', err);
      });
    }
  }, [seleccionado?.id]);

  const abrirComoLlegar = (cancha: CanchaEntity) => {
    // Redirección directa a Google Maps en modo navegación / ruta hacia las coordenadas del predio
    const url = `https://www.google.com/maps/dir/?api=1&destination=${cancha.lat},${cancha.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const contactarPredioPorWhatsApp = async (cancha: CanchaEntity) => {
    try {
      setContactandoWhatsapp(true);
      let tel = cancha.telefono;

      if (!tel) {
        const predio = await obtenerPredio(cancha.id);
        tel = predio?.telefono;
      }

      if (!tel || !tel.trim()) {
        setToastMessage('Este predio no tiene teléfono de contacto registrado.');
        setTimeout(() => setToastMessage(''), 3500);
        return;
      }

      const telFormateado = formatearParaWhatsApp(tel);
      if (!telFormateado) {
        setToastMessage('El número de teléfono del predio no es válido.');
        setTimeout(() => setToastMessage(''), 3500);
        return;
      }

      const mensaje = `Hola ${cancha.nombre}, te consulto desde la app Al Ángulo por el alquiler de canchas.`;
      const url = `https://wa.me/${telFormateado}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error al abrir WhatsApp:', err);
      setToastMessage('No se pudo abrir WhatsApp para este predio.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setContactandoWhatsapp(false);
    }
  };
  
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
        direccion: p.direccion,
        barrio: p.barrio,
        ciudad: p.ciudad,
        telefono: p.telefono,
        tipo: canchas[0]?.tipo ?? 'Sintetico',
        cantidadCanchas: canchas.length,
        promedioRating: p.reputation?.promedio,
        ratingCount: p.reputation?.ratingCount,
      };
    });

    const desafiosEntities: DesafioEntity[] = desafios.map((d) => {
      const esBusqueda =
        d.tipoDesafio === 'busqueda_jugador' ||
        (d.jugadoresFaltantes && d.jugadoresFaltantes > 0) ||
        d.posicionBuscada !== null ||
        (d.descripcion?.startsWith('¡No completamos!') ?? false);
      return {
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
        conCancha: d.turnoId !== null,
        descripcion: d.descripcion,
        tipoDesafio: esBusqueda ? 'busqueda_jugador' : 'partido_equipo',
        posicionBuscada: d.posicionBuscada ?? null,
        jugadoresFaltantes: d.jugadoresFaltantes ?? (esBusqueda ? 1 : undefined),
      };
    });

    const jugadoresEntities: JugadorEntity[] = jugadores
      .filter(u => u.geo !== null && u.perfilDeportivo !== null)
      .map(u => {
        const perf = u.perfilDeportivo!;
        const stats = perf.stats;
        let mediaFifa = calcularMediaJugador({
          partidosJugados: stats?.matchesPlayed ?? 0,
          goles: stats?.goals ?? 0,
          asistencias: stats?.assists ?? 0,
          mvpCount: stats?.mvpCount ?? 0,
          posicion: perf.posicion ?? perf.playerRole ?? null,
        });

        if ((stats?.matchesPlayed ?? 0) === 0 && typeof perf.rating === 'number' && perf.rating > 0) {
          mediaFifa = perf.rating <= 10 ? Math.round(perf.rating * 10) : Math.round(perf.rating);
        }

        const rawFp = perf.stats?.fairPlayIndex ?? 100;
        const fairPlayPct = rawFp <= 10 && rawFp > 0 ? Math.round(rawFp * 10) : Math.min(100, Math.round(rawFp));

        return {
          id: u.uid,
          type: 'jugador' as const,
          lat: u.geo!.lat,
          lng: u.geo!.lng,
          distanciaKm: u.distanciaKm,
          uid: u.uid,
          apodo: nombreCompleto(u) || 'Jugador',
          posicion: ETIQUETA_POSICION[perf.playerRole ?? ''] ?? 'Cualquiera',
          media: mediaFifa,
          fairPlay: fairPlayPct,
        };
      });

    const equiposEntities: EquipoEntity[] = equipos.map(e => {
      let mediaPlantel: number | null = null;
      if (e.members && e.members.length > 0) {
        let suma = 0;
        let count = 0;
        e.members.forEach((m: any) => {
          const st = e.estadisticasJugadores?.[m.uid];
          const med = calcularMediaJugador({
            partidosJugados: st?.partidosJugados ?? 0,
            goles: st?.goles ?? 0,
            asistencias: st?.asistencias ?? 0,
            mvpCount: st?.mvpCount ?? 0,
            posicion: m.position ?? null,
          });
          suma += med;
          count++;
        });
        if (count > 0) mediaPlantel = Math.round(suma / count);
      }

      const divisionInfo = calcularDivisionEquipo({
        stats: e.stats,
        mediaPlantel,
        reputation: e.reputation,
      });

      return {
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
        captainId: e.captainId,
        fairPlayScore: e.reputation?.fairPlayScore,
        stats: e.stats,
        divisionInfo,
      };
    });

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
      <div className="absolute top-safe pt-2 md:pt-4 w-full flex justify-center z-10 pointer-events-none px-2 sm:px-4">
        <div className="bg-gradient-to-r from-[#361982]/95 via-[#281165]/95 to-[#1c0a48]/95 backdrop-blur-xl p-1 sm:p-1.5 rounded-full border border-[#4c24b2]/50 shadow-2xl shadow-[#1c0a48]/50 flex items-center pointer-events-auto max-w-full overflow-x-auto hide-scrollbar gap-1 touch-pan-x">
          <button 
            onClick={() => setFiltroActivo('todos')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer ${
              filtroActivo === 'todos' 
                ? 'bg-white/25 text-white border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.25)]' 
                : 'text-indigo-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroActivo('canchas')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              filtroActivo === 'canchas' 
                ? 'bg-emerald-500 text-emerald-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                : 'text-indigo-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <IconoCancha className="w-3.5 h-3.5 shrink-0" />
            <span>Canchas<span className="hidden sm:inline"> / Predios</span></span>
          </button>
          <button
            onClick={() => setFiltroActivo('equipos')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              filtroActivo === 'equipos' 
                ? 'bg-sky-500 text-white font-black shadow-[0_0_12px_rgba(14,165,233,0.5)]' 
                : 'text-indigo-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <IconoEquipo className="w-3.5 h-3.5 shrink-0" />
            <span>Equipos</span>
          </button>
          <button
            onClick={() => setFiltroActivo('desafios')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              filtroActivo === 'desafios' 
                ? 'bg-amber-500 text-amber-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]' 
                : 'text-indigo-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <IconoDesafio className="w-3.5 h-3.5 shrink-0" />
            <span>Desafíos</span>
          </button>
          <button 
            onClick={() => setFiltroActivo('jugadores')}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              filtroActivo === 'jugadores' 
                ? 'bg-blue-500 text-white font-black shadow-[0_0_12px_rgba(37,99,235,0.5)]' 
                : 'text-indigo-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <IconoJugador className="w-3.5 h-3.5 shrink-0" />
            <span>Jugadores<span className="hidden sm:inline"> Libres</span></span>
          </button>
          {cargando && (
            <span className="px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-bold text-indigo-300 whitespace-nowrap animate-pulse">
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
              <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-emerald-500 ring-4 ring-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-3">
                <IconoCancha className="w-8 h-8" />
              </div>
              <h3 className="text-white font-black text-xl tracking-tight px-4">{seleccionado.nombre}</h3>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">{seleccionado.cantidadCanchas} Canchas • {seleccionado.tipo}</p>
              
              <div className="flex items-center justify-center gap-2 mt-2 mb-3 flex-wrap">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Predio Verificado
                </span>
                {typeof seleccionado.ratingCount === 'number' && seleccionado.ratingCount > 0 && (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                    ⭐ {seleccionado.promedioRating?.toFixed(1) ?? '5.0'} ({seleccionado.ratingCount})
                  </span>
                )}
                <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/80 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  {seleccionado.distanciaKm.toFixed(1)} km
                </span>
              </div>

              {/* DIRECCIÓN REGISTRADA */}
              <div className="w-full bg-zinc-800/60 border border-zinc-700/70 rounded-2xl p-3 mb-4 text-left flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Dirección registrada
                  </span>
                  <p className="text-white text-sm font-bold truncate">
                    {seleccionado.direccion?.trim() || 'Dirección registrada en el predio'}
                  </p>
                  {(seleccionado.barrio || seleccionado.ciudad) && (
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {[seleccionado.barrio, seleccionado.ciudad].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* ACCIONES: CÓMO LLEGAR, WHATSAPP Y VER / RESERVAR */}
              <div className="grid grid-cols-2 gap-2.5 w-full mb-2.5">
                <button 
                  onClick={() => abrirComoLlegar(seleccionado)}
                  title="Cómo llegar con Google Maps"
                  className="h-12 bg-zinc-800/90 hover:bg-zinc-800 text-white py-2.5 px-3 rounded-2xl font-bold border border-zinc-700/80 hover:border-zinc-500 flex justify-center items-center gap-2 active:scale-95 transition cursor-pointer text-xs sm:text-sm shadow-md"
                >
                  <Navigation className="w-4 h-4 text-sky-400" />
                  <span>Cómo llegar</span>
                </button>

                <button 
                  onClick={() => contactarPredioPorWhatsApp(seleccionado)}
                  disabled={contactandoWhatsapp}
                  title="Contactar al predio por WhatsApp"
                  className="h-12 bg-zinc-800/90 hover:bg-zinc-800 text-white py-2.5 px-3 rounded-2xl font-bold border border-zinc-700/80 hover:border-zinc-500 flex justify-center items-center gap-2 active:scale-95 transition cursor-pointer text-xs sm:text-sm shadow-md disabled:opacity-50"
                >
                  <Phone className="w-4 h-4 text-emerald-400" /> 
                  <span>{contactandoWhatsapp ? 'Abriendo...' : 'WhatsApp'}</span>
                </button>
              </div>

              <button 
                onClick={() => navigate(`/reservar/${seleccionado.id}`, { state: { backgroundLocation: location } })}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] flex justify-center items-center gap-2 active:scale-95 transition cursor-pointer text-xs sm:text-sm whitespace-nowrap uppercase tracking-wider"
              >
                <Clock className="w-4 h-4" /> 
                <span>Ver y reservar</span>
              </button>
            </div>
          )}

          {seleccionado.type === 'equipo' && (() => {
            const divInfo = seleccionado.divisionInfo || calcularDivisionEquipo({
              stats: seleccionado.stats,
              reputation: typeof seleccionado.fairPlayScore === 'number' ? { fairPlayScore: seleccionado.fairPlayScore, buenRivalCount: 0, conflictivoCount: 0, partidosJugados: 0 } : null,
            });

            return (
              <div className="flex flex-col items-center text-center pt-1">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-amber-500/80 ring-4 ring-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] mb-2.5 overflow-hidden">
                  {seleccionado.escudoUrl
                    ? <img src={seleccionado.escudoUrl} alt={`Escudo de ${seleccionado.nombre}`} className="w-full h-full object-cover" />
                    : <IconoEquipo className="w-8 h-8 text-amber-400" />}
                </div>

                {/* Badge destacado de la División de Fútbol */}
                <div className="mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${divInfo.badgeClass}`}>
                    <span>{divInfo.icono}</span>
                    <span>{divInfo.nombre}</span>
                  </span>
                </div>

                <h3 className="text-white font-black text-xl tracking-tight px-4 truncate max-w-full">{seleccionado.nombre}</h3>
                
                {/* Métricas clave: Media Colectiva, Fair Play, Récord y Datos */}
                <div className="flex justify-center gap-2 text-xs font-bold mt-2.5 mb-3 flex-wrap">
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/35 px-2.5 py-1 rounded-lg font-black text-xs tracking-wider shadow-sm flex items-center gap-1">
                    ⭐ MEDIA {divInfo.mediaEquipo}
                  </span>

                  <span className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 shadow-sm ${divInfo.insigniaFairPlay.badgeClass}`}>
                    <span>{divInfo.insigniaFairPlay.icono}</span>
                    <span>{divInfo.insigniaFairPlay.score}% {divInfo.insigniaFairPlay.texto}</span>
                  </span>

                  {seleccionado.stats && (
                    <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/80 font-bold flex items-center gap-1.5">
                      <span className="text-emerald-400">{seleccionado.stats.wins} PG</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">{seleccionado.stats.draws} PE</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-rose-400">{seleccionado.stats.losses} PP</span>
                    </span>
                  )}

                  <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/80">{seleccionado.modalidad}</span>
                  <span className="bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-lg border border-sky-500/20">
                    {seleccionado.cantidadJugadores} en el plantel
                  </span>
                  <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/80 font-medium">
                    {seleccionado.distanciaKm.toFixed(1)} km
                  </span>
                </div>

                <p className="text-zinc-400 text-xs sm:text-sm mb-5 leading-relaxed px-2">
                  Equipo que juega en tu zona. Podés sumarte a su plantel o desafiarlos a un partido amistoso.
                </p>

                <button
                  onClick={() => {
                    if (!usuario) { navigate('/login'); return; }
                    if (seleccionado?.type === 'equipo') {
                      setEquipoDesafioModal(seleccionado);
                    }
                    setMostrarModalDesafio(true);
                  }}
                  className="w-full h-13 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 rounded-2xl font-black flex justify-center items-center gap-2 active:scale-95 transition uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
                >
                  <Swords className="w-5 h-5" />
                  Pactar Desafío Directo
                </button>
              </div>
            );
          })()}

          {seleccionado.type === 'desafio' && (
            <div className="flex flex-col items-center text-center pt-1">
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)] ${
                seleccionado.tipoDesafio === 'busqueda_jugador'
                  ? 'bg-amber-950/60 border-amber-500 ring-4 ring-amber-500/20 text-amber-400'
                  : 'bg-zinc-800 border-amber-500 ring-4 ring-amber-500/20 text-amber-400'
              }`}>
                {seleccionado.tipoDesafio === 'busqueda_jugador' ? (
                  <span className="text-3xl">🧤</span>
                ) : (
                  <IconoDesafio className="w-8 h-8" />
                )}
              </div>

              {seleccionado.tipoDesafio === 'busqueda_jugador' ? (
                <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-1">
                  ⚠️ ¡Búsqueda Urgente de Jugador!
                </div>
              ) : (
                <div className="inline-block bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-1">
                  ⚽ Desafío Abierto entre Equipos
                </div>
              )}

              <h3 className="text-white font-black text-xl tracking-tight px-4 truncate max-w-full">{seleccionado.equipo}</h3>
              <div className="flex justify-center gap-2 text-xs font-bold mt-2 mb-3 flex-wrap">
                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/80">{seleccionado.modalidad}</span>
                <span className="bg-amber-400/10 text-amber-500 px-2.5 py-1 rounded-lg border border-amber-500/20">{formatearHorario(seleccionado.fechaUnix)}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/80 font-medium">{seleccionado.distanciaKm.toFixed(1)} km</span>
              </div>

              {/* Faltantes / Puesto si es búsqueda de jugador */}
              {seleccionado.tipoDesafio === 'busqueda_jugador' && (
                <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
                  <span>Faltan: {seleccionado.jugadoresFaltantes || 1} jugador(es)</span>
                  {seleccionado.posicionBuscada && (
                    <span>• Puesto: {seleccionado.posicionBuscada}</span>
                  )}
                </div>
              )}

              {/* PUENTE ENTRE MODULOS */}
              <div className={`mb-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ${seleccionado.conCancha ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'}`}>
                {seleccionado.conCancha
                  ? '✅ Cancha ya reservada (turno confirmado)'
                  : '⚽ Buscan cancha: se coordina al aceptar'}
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
                    setToastMessage(
                      seleccionado.tipoDesafio === 'busqueda_jugador'
                        ? '¡Te sumaste a la convocatoria! Se le avisó al capitán 🧤'
                        : '¡Aceptaste el desafío! Se le avisó al organizador ⚽'
                    );
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
                {seleccionado.tipoDesafio === 'busqueda_jugador' ? 'Sumarme al Partido (Agente Libre)' : 'Aceptar Desafío con mi Equipo'}
              </button>
            </div>
          )}

          {seleccionado.type === 'jugador' && (
            <div className="flex flex-col items-center text-center pt-1">
              {/* Avatar con anillo luminoso y badge de disponibilidad */}
              <div className="relative mb-3">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-blue-500 ring-4 ring-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.35)] overflow-hidden">
                  <IconoJugador className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-sm" title="Disponible hoy" />
              </div>

              {/* Título centralizado + Media estilo FIFA */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2 px-4">
                <h3 className="text-white font-black text-xl tracking-tight">{seleccionado.apodo}</h3>
                {(() => {
                  const tema = obtenerTemaSegunMedia(seleccionado.media);
                  return (
                    <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs tracking-wider shadow-sm ${tema.badgeMediaClass}`}>
                      {tema.nombreTier} {seleccionado.media}
                    </span>
                  );
                })()}
              </div>

              {/* Badges de Posición y Fair Play centralizados */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold mb-2">
                <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg border border-zinc-700/80">
                  {seleccionado.posicion}
                </span>
                <span className="bg-amber-400/10 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1 font-bold">
                  ⭐ {seleccionado.fairPlay}% Fair Play
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

      {/* Modal Pactar Desafío Rápido entre Capitanes */}
      {mostrarModalDesafio && (equipoDesafioModal || (seleccionado?.type === 'equipo' ? seleccionado : null)) && usuario && (
        (() => {
          const eqTarget = (equipoDesafioModal || seleccionado) as EquipoEntity;
          return (
            <ModalProponerDesafio
              abierto={mostrarModalDesafio}
              onCerrar={() => {
                setMostrarModalDesafio(false);
                setEquipoDesafioModal(null);
              }}
              rival={{
                equipoId: eqTarget.equipoId,
                nombre: eqTarget.nombre,
                modalidad: eqTarget.modalidad,
                escudoUrl: eqTarget.escudoUrl,
                captainId: eqTarget.captainId,
                divisionInfo: eqTarget.divisionInfo,
              }}
              usuarioActual={{
                uid: usuario.uid,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
              }}
              onDesafioEnviado={(mensaje) => {
                setToastMessage(mensaje);
                setTimeout(() => setToastMessage(''), 4500);
              }}
            />
          );
        })()
      )}
    </div>
  );
};
