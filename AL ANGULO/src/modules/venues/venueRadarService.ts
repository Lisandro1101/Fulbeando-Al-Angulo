// @ts-ignore: Mock para Firebase y geofire
import { collection, query, where, orderBy, getDocs, limit, startAt, endAt } from 'firebase/firestore';
import * as geofire from 'geofire-common';
import { Venue } from './venueTypes';

const db = {} as any; // Mock de instancia Firestore
const venueCache = new Map<string, Venue>();

export const getCachedVenues = () => Array.from(venueCache.values());

/**
 * MOTOR GEOESPACIAL B2B (Módulo Canchas)
 * Se ejecuta en paralelo al Radar de Desafíos, con Límite de Costo Estricto.
 */
export const fetchNearbyVenues = async (
  centerLat: number,
  centerLng: number,
  radiusInKm: number = 10
): Promise<Venue[]> => {
  const radiusInM = radiusInKm * 1000;
  const center: geofire.Geopoint = [centerLat, centerLng];
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  
  const promises = [];
  const venuesCol = collection(db, 'venues');

  for (const b of bounds) {
    // AHORRO: Excluimos canchas dadas de baja (INACTIVE) para no gastar lecturas
    // en clientes que no nos pagan.
    const q = query(
      venuesCol,
      where('subscriptionState', 'in', ['ACTIVE', 'TRIAL']),
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1]),
      limit(10) // REGLA ORO: Frenamos el tope de sponsors en el mapa para no saturar UI ni factura.
    );
    promises.push(getDocs(q));
  }

  const snapshots = await Promise.all(promises);
  const newlyDiscovered: Venue[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      if (venueCache.has(doc.id)) continue; // Ya pagamos por esta cancha

      const data = doc.data() as Omit<Venue, 'id' | 'pinType'>;
      const distanceInKm = geofire.distanceBetween([data.lat, data.lng], center);
      
      if (distanceInKm <= radiusInKm) {
        // En frontend esto se usará para renderizar un <Marker> dorado/exclusivo
        // diferenciándolo completamente de los pines "amateurs" de los Desafíos.
        const fullVenue: Venue = { 
          ...data, 
          id: doc.id,
          // Un Trial y un Active se ven diferentes. El Active tiene el "Pin Premium".
          pinType: data.subscriptionState === 'ACTIVE' ? 'SPONSORED_VENUE' : 'REGULAR_VENUE'
        };
        
        venueCache.set(doc.id, fullVenue);
        newlyDiscovered.push(fullVenue);
      }
    }
  }

  return newlyDiscovered;
};
