// @ts-ignore: Mock para Firebase y geofire (en prod `npm i geofire-common`)
import { collection, query, where, orderBy, getDocs, limit, startAt, endAt } from 'firebase/firestore';
import * as geofire from 'geofire-common';
import { Challenge } from './radarTypes';

const db = {} as any; // Mock de instancia Firestore

// =========================================================================
// STATE PATTERN: Caché Inteligente en Memoria
// EVITA LECTURAS DUPLICADAS: Si muevo el mapa 2km, gran parte de los pines
// siguen en pantalla. No debemos volver a descargarlos/cobrarlos.
// =========================================================================
const radarCache = new Map<string, Challenge>();

export const clearRadarCache = () => radarCache.clear();
export const getCachedPins = () => Array.from(radarCache.values());

/**
 * MOTOR DE BÚSQUEDA GEOESPACIAL DE BAJO COSTO
 * Genera rangos ("Bounding Boxes") para no escanear toda la BD.
 */
export const fetchNearbyChallenges = async (
  centerLat: number,
  centerLng: number,
  radiusInKm: number = 10
): Promise<Challenge[]> => {
  const radiusInM = radiusInKm * 1000;
  const center: geofire.Geopoint = [centerLat, centerLng];

  // Calcula los rangos alfanuméricos (Bounding Box) alrededor del centro del mapa
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  
  const promises = [];
  const challengesCol = collection(db, 'challenges');

  // Por diseño, geohashQueryBounds puede devolver entre 1 y ~5 rangos según la geometría
  for (const b of bounds) {
    const q = query(
      challengesCol,
      where('status', '==', 'OPEN'),
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1]),
      // LÍMITE ABSOLUTO: Frenamos densidades extremas (ej: 100 partidos en 10 cuadras en CABA).
      // Solo traemos los primeros 20 por cuadrante.
      limit(20) 
    );
    promises.push(getDocs(q));
  }

  // Esperamos que todas las queries de las zonas espaciales respondan
  const snapshots = await Promise.all(promises);
  const newlyDiscoveredPins: Challenge[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const challengeId = doc.id;

      // -----------------------------------------------------
      // REGLA DE ORO DE AHORRO:
      // Si el pin ya fue descargado previamente, lo descartamos
      // del procesamiento porque ya vive en memoria.
      // -----------------------------------------------------
      if (radarCache.has(challengeId)) {
        continue;
      }

      const data = doc.data() as Omit<Challenge, 'id'>;

      // Geohash suele traer "falsos positivos" en las esquinas de los bounding boxes.
      // Calculamos la distancia real matemática para asegurar que esté en el radio perfecto.
      const distanceInKm = geofire.distanceBetween([data.lat, data.lng], center);
      
      if (distanceInKm <= radiusInKm) {
        const fullChallenge: Challenge = { ...data, id: challengeId };
        
        // Lo guardamos en caché para futuras barridas
        radarCache.set(challengeId, fullChallenge);
        newlyDiscoveredPins.push(fullChallenge);
      }
    }
  }

  return newlyDiscoveredPins; // Retornamos SÓLO lo que se cobró nuevo en esta request
};

// =========================================================================
// FRONTEND HOOK / EVENT LISTENER: DEBOUNCE AGRESIVO
// =========================================================================
let radarDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Función pensada para atarse al evento `onRegionChangeComplete` de react-native-maps o Google Maps.
 * Evita que el usuario queme nuestra tarjeta de crédito si scrollea el mapa como loco.
 */
export const onMapMoveDebounced = (
  lat: number, 
  lng: number, 
  radiusKm: number,
  onResult: (allAvailablePins: Challenge[]) => void
) => {
  // Resetea el contador si el usuario sigue arrastrando el mapa
  if (radarDebounceTimer) {
    clearTimeout(radarDebounceTimer);
  }

  // Ventana de 600ms obligatoria: El usuario debe SOLTAR el mapa y dejarlo
  // quieto más de medio segundo antes de gatillar la red.
  radarDebounceTimer = setTimeout(async () => {
    try {
      // Descargamos lo nuevo...
      await fetchNearbyChallenges(lat, lng, radiusKm);
      // Pero a la UI le devolvemos TODA la caché para pintar el mapa entero
      onResult(getCachedPins());
    } catch (error) {
      console.error('[Radar] Fallo de conectividad buscando rivales:', error);
    }
  }, 600);
};
