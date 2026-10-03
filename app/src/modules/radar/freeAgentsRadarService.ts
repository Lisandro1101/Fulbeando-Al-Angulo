import { collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { COLECCIONES } from '@/core/config';
import { prefijosQueCubren, type Punto, haversineKm } from '@/core/geo/geohash';
import type { Usuario } from '@/domain';

/**
 * Consulta eficiente de "Agentes Libres" (Jugadores Disponibles Hoy).
 * Solo consulta usuarios con `isAvailable: true` y cuyo TTL `availableUntil` no haya expirado.
 * Implementa geohash para filtrar por zona y un limit(20) para escalabilidad (Cero lecturas N+1).
 */
export const fetchFreeAgentsNearMe = async (
  punto: Punto,
  radioKm: number = 10
): Promise<Array<Usuario & { distanciaKm: number }>> => {
  // 1. Calculamos los geohashes que cubren el radio
  const prefijos = prefijosQueCubren(punto, radioKm, 5);
  
  if (prefijos.length === 0) return [];

  // 2. Ejecutamos la consulta acotada a Firestore
  const q = query(
    collection(db(), COLECCIONES.usuarios),
    where('geo.prefijos', 'array-contains-any', prefijos),
    where('isAvailable', '==', true),
    where('estado', '==', 'activo'),
    limit(20) // CRÍTICO: Acotar lectura
  );

  const snap = await getDocs(q);
  const now = Timestamp.now();

  // 3. Filtramos en cliente los falsos positivos del geohash y verificamos el TTL
  const freeAgents = snap.docs
    .map((d) => d.data() as Usuario & { availableUntil?: Timestamp })
    .filter((u) => {
      // Filtrar pines fantasma (TTL expirado)
      if (!u.availableUntil || u.availableUntil.toMillis() < now.toMillis()) return false;
      return true;
    })
    .map((u) => ({
      ...u,
      distanciaKm: u.geo ? haversineKm(punto, { lat: u.geo.lat, lng: u.geo.lng }) : 999
    }))
    .filter((u) => u.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  return freeAgents;
};
