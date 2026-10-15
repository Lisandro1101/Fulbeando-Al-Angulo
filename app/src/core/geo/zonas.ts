import { encodeGeohash, prefijosQueCubrenBD } from './geohash';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface GeoIndexZona {
  lat: number;
  lng: number;
  prefijo: string;
  prefijos: string[];
}

/**
 * Estructura jerárquica por Región -> Municipio/Partido -> Localidades/Barrios.
 * Enfocado en la operatividad real del fútbol amateur en GBA Zona Sur y áreas de expansión.
 */
export interface EstructuraRegion {
  [municipio: string]: string[];
}

export const DIVISION_GEOGRAFICA: Record<string, EstructuraRegion> = {
  "GBA Zona Sur": {
    "Lomas de Zamora": [
      "Lomas de Zamora", "Banfield", "Temperley", "Turdera", "Llavallol",
      "Villa Centenario", "Villa Fiorito", "Ingeniero Budge", "Parque Barón", "San José (Lomas)"
    ],
    "Lanús": [
      "Lanús Este", "Lanús Oeste", "Remedios de Escalada", "Valentín Alsina",
      "Gerli (Lanús)", "Monte Chingolo"
    ],
    "Almirante Brown": [
      "Adrogué", "Burzaco", "Longchamps", "Glew", "Claypole",
      "Rafael Calzada", "José Mármol", "San José (Brown)", "Ministro Rivadavia", "Malvinas Argentinas"
    ],
    "Avellaneda": [
      "Avellaneda Centro", "Sarandí", "Wilde", "Villa Domínico",
      "Gerli (Avellaneda)", "Dock Sud", "Piñeyro"
    ],
    "Esteban Echeverría": [
      "Monte Grande", "Canning (Echeverría)", "Luis Guillón", "El Jagüel", "9 de Abril"
    ],
    "Ezeiza": [
      "Ezeiza Centro", "Tristán Suárez", "La Unión", "Carlos Spegazzini", "Canning (Ezeiza)"
    ],
    "Quilmes": [
      "Quilmes Centro", "Bernal", "Don Bosco", "Ezpeleta", "San Francisco Solano"
    ],
    "Berazategui": [
      "Berazategui Centro", "Ranelagh", "Hudson", "Plátanos",
      "Villa España", "Juan María Gutiérrez", "El Pato"
    ],
    "Florencio Varela": [
      "Florencio Varela", "Bosques", "Zeballos", "Gobernador Costa", "Ingeniero Allan"
    ],
    "Presidente Perón": [
      "Guernica"
    ],
    "San Vicente": [
      "San Vicente", "Alejandro Korn", "Domselaar"
    ]
  },
  "CABA (Próximamente)": {
    "Comuna 6": ["Caballito"],
    "Comuna 14": ["Palermo"],
    "Comuna 15": ["Villa Crespo", "Chacarita"]
  },
  "GBA Oeste (Próximamente)": {
    "Morón": ["Morón", "Castelar", "Haedo"],
    "La Matanza": ["Ramos Mejía", "San Justo"]
  }
};

/**
 * Infiere el Municipio / Partido a partir del nombre de una localidad, barrio o ciudad.
 */
export function inferirMunicipio(zona?: string | null): string | null {
  if (!zona) return null;
  const z = zona.trim().toLowerCase();
  for (const region of Object.values(DIVISION_GEOGRAFICA)) {
    for (const [muni, locs] of Object.entries(region)) {
      if (muni.toLowerCase() === z) return muni;
      if (locs.some(loc => loc.toLowerCase() === z)) return muni;
    }
  }
  return null;
}

/**
 * Centroides oficiales aproximados de todas las localidades y municipios.
 * Permiten posicionar el pin en el radar sin solicitar coordenadas privadas de hogares.
 */
export const CENTROIDES_ZONAS: Record<string, Coordenadas> = {
  // Lomas de Zamora
  'Lomas de Zamora': { lat: -34.7601, lng: -58.4023 },
  'Banfield': { lat: -34.7820, lng: -58.3970 },
  'Temperley': { lat: -34.7731, lng: -58.3842 },
  'Turdera': { lat: -34.7883, lng: -58.4042 },
  'Llavallol': { lat: -34.7925, lng: -58.4239 },
  'Villa Centenario': { lat: -34.7369, lng: -58.4217 },
  'Villa Fiorito': { lat: -34.7083, lng: -58.4356 },
  'Ingeniero Budge': { lat: -34.7175, lng: -58.4528 },
  'Parque Barón': { lat: -34.7661, lng: -58.4303 },
  'San José (Lomas)': { lat: -34.7656, lng: -58.3686 },

  // Lanús
  'Lanús': { lat: -34.7042, lng: -58.3965 },
  'Lanús Este': { lat: -34.7092, lng: -58.3828 },
  'Lanús Oeste': { lat: -34.7011, lng: -58.4089 },
  'Remedios de Escalada': { lat: -34.7297, lng: -58.3975 },
  'Valentín Alsina': { lat: -34.6758, lng: -58.4089 },
  'Gerli (Lanús)': { lat: -34.6931, lng: -58.3844 },
  'Monte Chingolo': { lat: -34.7317, lng: -58.3619 },

  // Almirante Brown
  'Almirante Brown': { lat: -34.7981, lng: -58.3889 },
  'Adrogué': { lat: -34.7981, lng: -58.3889 },
  'Burzaco': { lat: -34.8275, lng: -58.3969 },
  'Longchamps': { lat: -34.8569, lng: -58.3861 },
  'Glew': { lat: -34.8872, lng: -58.3814 },
  'Claypole': { lat: -34.8028, lng: -58.3414 },
  'Rafael Calzada': { lat: -34.7892, lng: -58.3583 },
  'José Mármol': { lat: -34.7831, lng: -58.3769 },
  'San José (Brown)': { lat: -34.7708, lng: -58.3533 },
  'Ministro Rivadavia': { lat: -34.8483, lng: -58.4206 },
  'Malvinas Argentinas': { lat: -34.8286, lng: -58.4278 },

  // Avellaneda
  'Avellaneda': { lat: -34.6959, lng: -58.3634 },
  'Avellaneda Centro': { lat: -34.6622, lng: -58.3653 },
  'Sarandí': { lat: -34.6811, lng: -58.3475 },
  'Wilde': { lat: -34.7003, lng: -58.3183 },
  'Villa Domínico': { lat: -34.6917, lng: -58.3308 },
  'Gerli (Avellaneda)': { lat: -34.6881, lng: -58.3753 },
  'Dock Sud': { lat: -34.6433, lng: -58.3528 },
  'Piñeyro': { lat: -34.6658, lng: -58.3853 },

  // Esteban Echeverría
  'Esteban Echeverría': { lat: -34.8197, lng: -58.4674 },
  'Monte Grande': { lat: -34.8197, lng: -58.4674 },
  'Canning (Echeverría)': { lat: -34.8767, lng: -58.5033 },
  'Luis Guillón': { lat: -34.8028, lng: -58.4486 },
  'El Jagüel': { lat: -34.8392, lng: -58.4872 },
  '9 de Abril': { lat: -34.7761, lng: -58.4897 },

  // Ezeiza
  'Ezeiza': { lat: -34.8542, lng: -58.5225 },
  'Ezeiza Centro': { lat: -34.8542, lng: -58.5225 },
  'Tristán Suárez': { lat: -34.8931, lng: -58.5614 },
  'La Unión': { lat: -34.8722, lng: -58.5442 },
  'Carlos Spegazzini': { lat: -34.9317, lng: -58.6044 },
  'Canning (Ezeiza)': { lat: -34.8789, lng: -58.5122 },
  'Canning': { lat: -34.8767, lng: -58.5033 },

  // Quilmes
  'Quilmes': { lat: -34.7242, lng: -58.2608 },
  'Quilmes Centro': { lat: -34.7242, lng: -58.2608 },
  'Bernal': { lat: -34.7072, lng: -58.2831 },
  'Don Bosco': { lat: -34.7008, lng: -58.2981 },
  'Ezpeleta': { lat: -34.7508, lng: -58.2367 },
  'San Francisco Solano': { lat: -34.7817, lng: -58.3183 },

  // Berazategui
  'Berazategui': { lat: -34.7644, lng: -58.2125 },
  'Berazategui Centro': { lat: -34.7644, lng: -58.2125 },
  'Ranelagh': { lat: -34.7892, lng: -58.2039 },
  'Hudson': { lat: -34.7928, lng: -58.1569 },
  'Plátanos': { lat: -34.7739, lng: -58.1856 },
  'Villa España': { lat: -34.7711, lng: -58.2003 },
  'Juan María Gutiérrez': { lat: -34.8383, lng: -58.1883 },
  'El Pato': { lat: -34.9083, lng: -58.1817 },

  // Florencio Varela
  'Florencio Varela': { lat: -34.8028, lng: -58.2789 },
  'Bosques': { lat: -34.8189, lng: -58.2356 },
  'Zeballos': { lat: -34.8011, lng: -58.2578 },
  'Gobernador Costa': { lat: -34.7889, lng: -58.2958 },
  'Ingeniero Allan': { lat: -34.8794, lng: -58.2433 },

  // Presidente Perón
  'Presidente Perón': { lat: -34.9208, lng: -58.3831 },
  'Guernica': { lat: -34.9208, lng: -58.3831 },

  // San Vicente
  'San Vicente': { lat: -35.0253, lng: -58.4236 },
  'Alejandro Korn': { lat: -34.9819, lng: -58.3758 },
  'Domselaar': { lat: -35.0742, lng: -58.2925 },

  // CABA
  'Caballito': { lat: -34.6186, lng: -58.4430 },
  'Palermo': { lat: -34.5883, lng: -58.4305 },
  'Villa Crespo': { lat: -34.5986, lng: -58.4414 },
  'Chacarita': { lat: -34.5878, lng: -58.4556 },

  // GBA Oeste
  'Morón': { lat: -34.6537, lng: -58.6198 },
  'Castelar': { lat: -34.6575, lng: -58.6465 },
  'Haedo': { lat: -34.6464, lng: -58.5956 },
  'Ramos Mejía': { lat: -34.6534, lng: -58.5639 },
  'San Justo': { lat: -34.6789, lng: -58.5583 },
};

const CENTROIDE_FALLBACK: Coordenadas = { lat: -34.7601, lng: -58.4023 }; // Lomas de Zamora

/**
 * Normaliza nombres para comparación insensible a tildes y mayúsculas.
 */
const normalizarNombre = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Obtiene el centroide de una localidad o barrio.
 */
export function obtenerCentroideZona(zona: string): Coordenadas {
  if (!zona) return { ...CENTROIDE_FALLBACK };

  if (CENTROIDES_ZONAS[zona]) {
    return { ...CENTROIDES_ZONAS[zona] };
  }

  const queryNorm = normalizarNombre(zona);
  for (const [nombre, coord] of Object.entries(CENTROIDES_ZONAS)) {
    if (normalizarNombre(nombre) === queryNorm) {
      return { ...coord };
    }
  }

  // Fallback con coincidencia parcial
  for (const [nombre, coord] of Object.entries(CENTROIDES_ZONAS)) {
    if (queryNorm.includes(normalizarNombre(nombre)) || normalizarNombre(nombre).includes(queryNorm)) {
      return { ...coord };
    }
  }

  return { ...CENTROIDE_FALLBACK };
}

/**
 * Agrega una pequeña dispersión (jitter) aleatoria o pseudo-aleatoria (300-500m)
 * alrededor del centroide para proteger la privacidad residencial y evitar pines superpuestos.
 */
export function aplicarDispersionPrivacidad(
  centroide: Coordenadas,
  radioMetros = 400,
  seedNumero?: number
): Coordenadas {
  const factorMetrosLat = 111000;
  const factorMetrosLng = 111000 * Math.cos((centroide.lat * Math.PI) / 180);

  const r1 = seedNumero !== undefined ? Math.sin(seedNumero * 9999) * 0.5 + 0.5 : Math.random();
  const r2 = seedNumero !== undefined ? Math.cos(seedNumero * 5555) * 0.5 + 0.5 : Math.random();

  const angulo = r1 * 2 * Math.PI;
  const distancia = (r2 * 0.7 + 0.3) * radioMetros;

  const deltaLat = (Math.cos(angulo) * distancia) / factorMetrosLat;
  const deltaLng = (Math.sin(angulo) * distancia) / factorMetrosLng;

  return {
    lat: Number((centroide.lat + deltaLat).toFixed(4)),
    lng: Number((centroide.lng + deltaLng).toFixed(4)),
  };
}

/**
 * Calcula un GeoIndex privacy-safe para un jugador libre basado exclusivamente en su zona/barrio.
 */
export function calcularGeoZona(
  zona: string,
  opciones?: {
    radioDispersionMetros?: number;
    radioRadarKm?: number;
    seed?: number;
  }
): GeoIndexZona {
  const centroide = obtenerCentroideZona(zona);
  const puntoConDispersion = aplicarDispersionPrivacidad(
    centroide,
    opciones?.radioDispersionMetros ?? 400,
    opciones?.seed
  );

  const radioRadarKm = opciones?.radioRadarKm ?? 5;

  return {
    lat: puntoConDispersion.lat,
    lng: puntoConDispersion.lng,
    prefijo: encodeGeohash(puntoConDispersion.lat, puntoConDispersion.lng, 5),
    prefijos: prefijosQueCubrenBD(puntoConDispersion, radioRadarKm),
  };
}
