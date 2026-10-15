"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.radarQuery = exports.RADAR_REGION = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const geohash_1 = require("./importar-datos/geohash");
/**
 * RADAR (Fase 2): una sola invocacion devuelve los pines ya resueltos
 * (filtrados por radio, ordenados, truncados y con solo los campos que el mapa
 * necesita). El cliente deja de hacer cuatro consultas y de transformar.
 *
 * Importante (honestidad sobre el ahorro): las lecturas de Firestore cuestan
 * igual desde admin o desde el SDK cliente. El ahorro de esta Function es
 * (a) transferir menos bytes (DTO, no documentos completos), (b) una sola ida y
 * vuelta, (c) ocultar campos sensibles (cobro/telefono/duenoUid) y (d) validar
 * la entrada server-side. Las lecturas bajan por el geohash, no por el server.
 *
 * Se reutiliza la copia del geohash del paquete de Functions
 * (`./importar-datos/geohash`): este paquete NO puede importar de `app/`.
 */
/** Region de despliegue. Debe coincidir con el cliente (`RADAR_FUNCTIONS_REGION`). */
exports.RADAR_REGION = 'southamerica-east1';
/** Mapeo tipo -> coleccion. Igual que `COLECCIONES` del cliente (claves legacy). */
const COL = {
    cancha: 'predios',
    equipo: 'teams',
    desafio: 'challenges',
    jugador: 'usuarios',
};
/** Mismo tope por coleccion que las consultas directas del cliente. */
const LIMITES = { cancha: 50, equipo: 30, desafio: 20, jugador: 30 };
const MAX_PINES = 120;
const RADIO_MAX_KM = 5000;
/** TTL de la cache por instancia (Fase 3). Corto: los datos del radar cambian poco. */
const CACHE_TTL_MS = 45000;
const num = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const str = (v) => (typeof v === 'string' ? v : '');
const strOrNull = (v) => (typeof v === 'string' ? v : null);
/** Convierte un documento crudo en pin del radar (o `null` si no es visible/esta fuera). */
function aPin(tipo, id, raw, punto, radioKm) {
    var _a, _b, _c, _d, _e;
    const geo = raw.geo;
    if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number')
        return null;
    const d = (0, geohash_1.haversineKm)(punto, { lat: geo.lat, lng: geo.lng });
    if (d > radioKm)
        return null;
    const base = { id, lat: geo.lat, lng: geo.lng, d: Math.round(d * 100) / 100 };
    switch (tipo) {
        case 'cancha': {
            if (raw.deletedAt)
                return null;
            const canchas = Array.isArray(raw.canchasResumen) ? raw.canchasResumen : [];
            const primera = canchas[0];
            return Object.assign(Object.assign({}, base), { t: 'cancha', nombre: str(raw.nombre), direccion: str(raw.direccion), barrio: str(raw.barrio), ciudad: str(raw.ciudad), telefono: str(raw.telefono), tipo: str(primera === null || primera === void 0 ? void 0 : primera.tipo) || 'Sintetico', cantidadCanchas: canchas.length });
        }
        case 'equipo': {
            const members = Array.isArray(raw.members) ? raw.members : [];
            const rawFp = (_a = raw.reputation) === null || _a === void 0 ? void 0 : _a.fairPlayScore;
            const fairPlayScore = typeof rawFp === 'number' ? Math.round(rawFp) : 100;
            const rawStats = raw.stats;
            const stats = rawStats ? {
                wins: typeof rawStats.wins === 'number' ? rawStats.wins : 0,
                draws: typeof rawStats.draws === 'number' ? rawStats.draws : 0,
                losses: typeof rawStats.losses === 'number' ? rawStats.losses : 0,
            } : undefined;
            return Object.assign(Object.assign({}, base), { t: 'equipo', nombre: str(raw.name), modalidad: str(raw.modalidadBase), cantidadJugadores: members.length, escudoUrl: strOrNull(raw.shieldUrl), fairPlayScore,
                stats });
        }
        case 'desafio': {
            const rawFaltantes = num(raw.jugadoresFaltantes, 0);
            const posicionBuscada = strOrNull(raw.posicionBuscada);
            const esBusqueda = raw.tipoDesafio === 'busqueda_jugador' || rawFaltantes > 0 || posicionBuscada !== null || ((_c = (_b = strOrNull(raw.descripcion)) === null || _b === void 0 ? void 0 : _b.startsWith('¡No completamos!')) !== null && _c !== void 0 ? _c : false);
            return Object.assign(Object.assign({}, base), { t: 'desafio', creatorId: str(raw.creatorId), equipoId: strOrNull(raw.equipoId), equipo: str(raw.equipoNombre), modalidad: str(raw.modalidad), fechaUnix: num(raw.fechaUnix), conCancha: raw.turnoId != null, descripcion: strOrNull(raw.descripcion), tipoDesafio: esBusqueda ? 'busqueda_jugador' : 'partido_equipo', posicionBuscada, jugadoresFaltantes: rawFaltantes > 0 ? rawFaltantes : (esBusqueda ? 1 : undefined) });
        }
        case 'jugador': {
            if (raw.rol !== 'jugador' || raw.deletedAt)
                return null;
            const perfil = ((_d = raw.perfilDeportivo) !== null && _d !== void 0 ? _d : {});
            const stats = ((_e = perfil.stats) !== null && _e !== void 0 ? _e : {});
            const rawRating = num(perfil.rating, 5);
            const mediaFifa = rawRating <= 10 && rawRating > 0 ? Math.round(rawRating * 10) : Math.round(rawRating);
            const rawFp = num(stats.fairPlayIndex, 100);
            const fairPlay = rawFp <= 10 && rawFp > 0 ? Math.round(rawFp * 10) : Math.min(100, Math.round(rawFp));
            return Object.assign(Object.assign({}, base), { t: 'jugador', uid: id, nombre: str(raw.nombre), apellido: str(raw.apellido), playerRole: strOrNull(perfil.playerRole), media: mediaFifa, fairPlay: Math.round(fairPlay) });
        }
    }
}
const cache = new Map();
const claveCache = (punto, radioKm, tipos) => `${punto.lat.toFixed(3)}:${punto.lng.toFixed(3)}:${Math.round(radioKm)}:${[...tipos].sort().join('')}`;
/**
 * `radarQuery`: pines del radar alrededor de un punto.
 *
 * - Valida y acota la entrada (el cliente NO decide el radio real).
 * - Consulta las 4 colecciones en paralelo con el mismo filtro geohash que
 *   antes vivia en el cliente (`array-contains-any` sobre `geo.prefijos`).
 * - Aplica Haversine exacto, ordena, trunca y devuelve `total` (para UX).
 *
 * App Check: queda DESACTIVADO a proposito porque el cliente todavia no lo
 * inicializa (`initializeAppCheck`). Activarlo antes de configurarlo romperia
 * todas las llamadas. TODO: inicializar App Check y pasar a `enforceAppCheck: true`.
 */
exports.radarQuery = (0, https_1.onCall)({
    region: exports.RADAR_REGION,
    maxInstances: 10,
    concurrency: 80,
    timeoutSeconds: 15,
    memory: '256MiB',
    enforceAppCheck: false,
}, async (req) => {
    var _a;
    const t0 = Date.now();
    if (!req.auth)
        throw new https_1.HttpsError('unauthenticated', 'Inicia sesion para usar el radar.');
    const data = ((_a = req.data) !== null && _a !== void 0 ? _a : {});
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const radioRaw = Number(data.radioKm);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radioRaw)) {
        throw new https_1.HttpsError('invalid-argument', 'lat/lng/radioKm son obligatorios.');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new https_1.HttpsError('invalid-argument', 'Coordenadas fuera de rango.');
    }
    const radioKm = Math.min(Math.max(radioRaw, 1), RADIO_MAX_KM);
    const punto = { lat, lng };
    const pedidos = Array.isArray(data.tipos) && data.tipos.length > 0
        ? data.tipos.filter((t) => typeof t === 'string' && t in COL)
        : Object.keys(COL);
    const tope = Math.min(Number(data.max) || 80, MAX_PINES);
    // `prefijosQueCubren` baja la precision sola para no pasar el tope de
    // `array-contains-any` (<= 30): radios grandes terminan en celdas mas
    // gruesas en vez de abandonar el filtro geografico.
    const prefijos = (0, geohash_1.prefijosQueCubren)(punto, radioKm, 5, 10);
    if (prefijos.length === 0) {
        return { pins: [], radioKm, generadoEn: Date.now(), total: 0 };
    }
    const ahora = Date.now();
    const key = claveCache(punto, radioKm, pedidos);
    const enCache = cache.get(key);
    if (enCache && enCache.expira > ahora) {
        registrar({ radioKm, prefijos: prefijos.length, leidos: 0, devueltos: tope, total: enCache.total, ms: ahora - t0, cache: true });
        return { pins: enCache.pins.slice(0, tope), radioKm, generadoEn: ahora, total: enCache.total };
    }
    const db = (0, firestore_1.getFirestore)();
    let leidos = 0;
    const resultados = (await Promise.all(pedidos.map(async (tipo) => {
        let q = db.collection(COL[tipo]).where('geo.prefijos', 'array-contains-any', prefijos);
        if (tipo === 'cancha')
            q = q.where('verificado', '==', true).where('estado', '==', 'activo');
        if (tipo === 'desafio')
            q = q.where('estado', '==', 'ABIERTO');
        if (tipo === 'jugador') {
            q = q
                .where('estado', '==', 'activo')
                .where('perfilDeportivo.disponibleHoy', '==', true)
                .where('perfilDeportivo.notificacionesRadar', '==', true);
        }
        const snap = await q.limit(LIMITES[tipo]).get();
        leidos += snap.size;
        return snap.docs.map((d) => ({ tipo, id: d.id, raw: d.data() }));
    }))).flat();
    const pins = resultados
        .map((r) => aPin(r.tipo, r.id, r.raw, punto, radioKm))
        .filter((p) => p !== null)
        .sort((a, b) => a.d - b.d);
    const total = pins.length;
    const recortados = pins.slice(0, MAX_PINES);
    cache.set(key, { pins: recortados, total, expira: ahora + CACHE_TTL_MS });
    registrar({ radioKm, prefijos: prefijos.length, leidos, devueltos: recortados.length, total, ms: Date.now() - t0, cache: false });
    return { pins: recortados.slice(0, tope), radioKm, generadoEn: Date.now(), total };
});
/** Log estructurado (Fase 0): habilita decidir Fase 4 (Redis) con datos. */
function registrar(metricas) {
    console.log(JSON.stringify(Object.assign({ fn: 'radarQuery' }, metricas)));
}
//# sourceMappingURL=radarQuery.js.map