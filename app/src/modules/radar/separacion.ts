/**
 * Separacion de puntos pisados del Radar.
 *
 * Dos entidades en la misma coordenada (el desafio nace en el geo de su equipo,
 * un jugador parado en la puerta de la cancha, ...) caen en el mismo pixel y
 * Leaflet las apila: solo se ve el ultimo marker y se pierde el color del resto.
 * Agrupamos los que chocarian en pantalla y los abrimos en un circulo cuya
 * cuerda crece con el zoom: en la vista alejada los markers quedan apilados
 * pero con un desfase que alcanza para distinguir cada color, y a medida que
 * se acerca la vista se abren hasta quedar separados (30px > 28px del marker).
 *
 * Todo se calcula en el espacio de pixeles Web Mercator del zoom actual, asi el
 * resultado es igual en cualquier latitud y se recalcula al hacer zoom.
 */

const DIAMETRO_MARKER_PX = 28;

/** Si los centros estan a menos que el diameter, los markers se tapan. */
export const UMBRAL_PX = DIAMETRO_MARKER_PX;

/** Cuerda minima (zoom <= 12): apilados, con desfase para distinguir colores. */
const CUERDA_MIN_PX = 10;

/** Cuerda maxima (zoom >= 16): 30px deja aire entre markers de 28px. */
const CUERDA_MAX_PX = 30;

/** Apertura por nivel de zoom: +5px al acercar la vista. */
const PX_POR_ZOOM = 5;

/** Zoom desde el que arranca la curva de apertura. */
const ZOOM_BASE = 12;

/**
 * Cuerda del circulo de separacion para el zoom dado.
 *
 * zoom 12 -> 10px (muy apilados), 14 -> 20px (se pisan un poco pero se
 * distingue cada color), 16 en adelante -> 30px (separados con aire).
 */
export function cuerdaDe(zoom: number): number {
  const crece = CUERDA_MIN_PX + (zoom - ZOOM_BASE) * PX_POR_ZOOM;
  return Math.min(CUERDA_MAX_PX, Math.max(CUERDA_MIN_PX, crece));
}

export interface Pixel {
  x: number;
  y: number;
}

export interface EntidadConPosicion {
  id: string;
  lat: number;
  lng: number;
}

const escala = (zoom: number): number => 256 * 2 ** zoom;

/** Lat/lng -> pixeles Web Mercator (la proyeccion de los tiles de OSM). */
export function proyectar(lat: number, lng: number, zoom: number): Pixel {
  const s = escala(zoom);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * s,
  };
}

/** Inversa de `proyectar`. */
export function desproyectar(px: Pixel, zoom: number): { lat: number; lng: number } {
  const s = escala(zoom);
  const lng = (px.x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * px.y) / s;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function centroDe<T extends EntidadConPosicion>(miembros: T[], zoom: number): Pixel {
  const ps = miembros.map((e) => proyectar(e.lat, e.lng, zoom));
  return {
    x: ps.reduce((a, p) => a + p.x, 0) / ps.length,
    y: ps.reduce((a, p) => a + p.y, 0) / ps.length,
  };
}

/**
 * Mapa de `id -> [lat, lng]` donde va cada entidad en el zoom dado.
 *
 * Las que no chocan conservan su coordenada exacta. Las que quedan a menos de
 * `UMBRAL_PX` entre si se agrupan y se ubican en un circulo alrededor del
 * centroide del grupo, en orden de llegada (arriba, y luego las vueltas); la
 * apertura del circulo la da `cuerdaDe(zoom)`.
 */
export function separarPisados<T extends EntidadConPosicion>(
  entidades: T[],
  zoom: number,
): Map<string, [number, number]> {
  const grupos: { miembros: T[]; centro: Pixel }[] = [];

  for (const e of entidades) {
    const p = proyectar(e.lat, e.lng, zoom);
    const grupo = grupos.find((g) => Math.hypot(g.centro.x - p.x, g.centro.y - p.y) <= UMBRAL_PX);
    if (grupo) {
      grupo.miembros.push(e);
      grupo.centro = centroDe(grupo.miembros, zoom);
    } else {
      grupos.push({ miembros: [e], centro: p });
    }
  }

  const posiciones = new Map<string, [number, number]>();
  for (const g of grupos) {
    const n = g.miembros.length;
    if (n === 1) {
      const unica = g.miembros[0];
      if (unica) posiciones.set(unica.id, [unica.lat, unica.lng]);
      continue;
    }
    const radio = cuerdaDe(zoom) / 2 / Math.sin(Math.PI / n);
    g.miembros.forEach((e, i) => {
      const angulo = (i / n) * Math.PI * 2 - Math.PI / 2;
      const destino = desproyectar(
        { x: g.centro.x + Math.cos(angulo) * radio, y: g.centro.y + Math.sin(angulo) * radio },
        zoom,
      );
      posiciones.set(e.id, [destino.lat, destino.lng]);
    });
  }
  return posiciones;
}
