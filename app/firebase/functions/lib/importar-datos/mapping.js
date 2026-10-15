"use strict";
/**
 * Mapeo Excel -> documentos canonicos de Firestore.
 *
 * Modulo PURO: no toca `firebase-admin` ni el SDK cliente. Lo usan los dos
 * caminos de importacion para que escriban EXACTAMENTE lo mismo:
 *   - `scripts/importar-datos-prueba.ts` (Admin SDK, desde Node);
 *   - `src/importarDatos.ts` (Cloud Function callable, desde el panel).
 *
 * Los shapes de salida siguen `app/src/domain/*`. Si cambia un modelo del
 * dominio, actualizar aca en el mismo commit (igual que `seed-emuladores.ts`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.construirPlan = construirPlan;
const geohash_1 = require("./geohash");
// ============================================================================
// Helpers de parseo (tolerantes a celda vacia / numero / booleano)
// ============================================================================
const str = (v) => (v === null || v === undefined ? '' : String(v).trim());
const num = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : Number(str(v));
    return Number.isFinite(n) ? n : fallback;
};
const numONull = (v) => {
    const s = str(v);
    if (s === '')
        return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};
const bool = (v) => {
    if (typeof v === 'boolean')
        return v;
    const s = str(v).toLowerCase();
    return s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'x';
};
const lista = (v) => {
    const s = str(v);
    return s === '' ? [] : s.split(',').map((x) => x.trim()).filter((x) => x !== '');
};
const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const geo = (lat, lng) => {
    if (lat === null || lng === null)
        return null;
    const punto = { lat, lng };
    return {
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        prefijo: (0, geohash_1.encodeGeohash)(lat, lng, 5),
        prefijos: (0, geohash_1.prefijosQueCubrenBD)(punto, 5),
    };
};
/** 'HH:mm-HH:mm|HH:mm-HH:mm' -> Franja[] (`horaInicio`/`horaFin`). */
const franjas = (v) => {
    const s = str(v);
    if (s === '')
        return [];
    return s
        .split('|')
        .map((tramo) => tramo.trim())
        .map((tramo) => {
        const [horaInicio, horaFin] = tramo.split('-').map((x) => x.trim());
        return { horaInicio: horaInicio !== null && horaInicio !== void 0 ? horaInicio : '', horaFin: horaFin !== null && horaFin !== void 0 ? horaFin : '' };
    })
        .filter((f) => f.horaInicio !== '' && f.horaFin !== '');
};
/** 'YYYY-MM-DD' -> epoch ms a las 12:00 UTC (evita corrimientos de zona). */
const fechaUnix = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m)
        return Date.now();
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
};
const posicionONull = (v) => {
    const s = str(v);
    return s === '' ? null : s;
};
// ============================================================================
// Mapeo por entidad
// ============================================================================
function mapearUsuarios(filas, equiposDeUid) {
    return filas.map((f) => {
        var _a;
        const uid = str(f.uid);
        const rol = (str(f.rol) || 'jugador');
        const nombre = str(f.nombre);
        const apellido = str(f.apellido);
        const esDueno = rol === 'dueno_predio';
        const planDueno = str(f.planDueno);
        const perfilDeportivo = rol === 'jugador'
            ? {
                posicion: posicionONull(f.posicion),
                piernaHabil: posicionONull(f.piernaHabil),
                nivel: numONull(f.nivel),
                disponibleHoy: bool(f.disponibleHoy),
                notificacionesRadar: bool(f.notificacionesRadar),
                playerRole: posicionONull(f.playerRole),
                stats: {
                    goals: num(f.goles),
                    assists: num(f.asistencias),
                    matchesPlayed: num(f.partidosJugados),
                    mvpCount: num(f.mvpCount),
                    fairPlayIndex: num(f.fairPlayIndex),
                },
                rating: num(f.rating, 5),
                teamIds: lista(f.teamIds).length > 0 ? lista(f.teamIds) : (_a = equiposDeUid[uid]) !== null && _a !== void 0 ? _a : [],
            }
            : null;
        const doc = {
            uid,
            nombre,
            apellido,
            email: str(f.email),
            fechaNacimiento: str(f.fechaNacimiento) || null,
            telefono: str(f.telefono) || null,
            whatsappVerificado: false,
            rol,
            perfilDeportivo,
            geo: rol === 'jugador' ? geo(numONull(f.lat), numONull(f.lng)) : null,
            zona: str(f.zona) || null,
            municipio: str(f.municipio) || null,
            fotoUrl: str(f.fotoUrl) || null,
            fcmToken: `fcm-token-${uid}`,
            fcmTokens: [`fcm-token-${uid}`],
            estado: 'activo',
        };
        if (esDueno)
            doc.planDueno = planDueno === 'activo' ? 'activo' : 'pendiente';
        return {
            uid,
            email: str(f.email),
            password: str(f.password) || 'password123',
            displayName: `${nombre} ${apellido}`.trim(),
            photoURL: str(f.fotoUrl),
            doc,
        };
    }).filter((u) => u.uid !== '');
}
function mapearSolicitudes(filas) {
    return filas
        .map((f) => {
        const uid = str(f.uid);
        const doc = {
            uid,
            nombre: str(f.nombre),
            apellido: str(f.apellido),
            telefono: str(f.telefono),
            email: str(f.email),
            nombrePredio: str(f.nombrePredio),
            ciudad: str(f.ciudad),
            barrio: str(f.barrio),
            tipoCancha: str(f.tipoCancha) || 'F5',
            cantidadCanchas: num(f.cantidadCanchas, 1),
            mensaje: str(f.mensaje),
            estado: str(f.estado) || 'pendiente',
            revisadoPor: null,
            revisadoAt: null,
            motivoRechazo: str(f.motivoRechazo) || null,
        };
        return { id: uid, doc };
    })
        .filter((s) => s.id !== '');
}
function mapearPredios(predios, canchas) {
    return predios
        .map((f) => {
        const id = str(f.id);
        const propias = canchas.filter((c) => str(c.predioId) === id);
        const canchasResumen = propias.map((c) => ({
            id: str(c.canchaId),
            nombre: str(c.nombre),
            tipo: str(c.tipo) || 'F5',
            techada: bool(c.techada),
            precioHora: num(c.precioHora),
        }));
        const doc = {
            id,
            nombre: str(f.nombre),
            direccion: str(f.direccion),
            barrio: str(f.barrio),
            barrioNormalizado: normalizar(str(f.barrio)),
            ciudad: str(f.ciudad),
            geo: geo(numONull(f.lat), numONull(f.lng)),
            telefono: str(f.telefono),
            fotos: [],
            cobro: {
                titular: str(f.cobroTitular),
                alias: str(f.cobroAlias),
                cbu: str(f.cobroCbu) || null,
                montoSena: num(f.montoSena),
                tipoSena: str(f.tipoSena) === 'porcentaje' ? 'porcentaje' : 'fijo',
                porcentajeSena: num(f.porcentajeSena),
            },
            duenoUid: str(f.duenoUid),
            canchasResumen,
            franjasBase: franjas(f.franjasBase),
            diasBase: lista(f.diasBase).map((d) => num(d)).filter((d) => d >= 1 && d <= 7),
            verificado: bool(f.verificado),
            estado: 'activo',
        };
        return {
            id,
            doc,
            canchas: propias.map((c) => ({
                id: str(c.canchaId),
                doc: {
                    id: str(c.canchaId),
                    predioId: id,
                    nombre: str(c.nombre),
                    tipo: str(c.tipo) || 'F5',
                    techada: bool(c.techada),
                    precioHora: num(c.precioHora),
                    activa: bool(c.activa),
                },
            })),
        };
    })
        .filter((p) => p.id !== '');
}
function mapearEquipos(equipos, miembros) {
    return equipos
        .map((f) => {
        const id = str(f.id);
        const propios = miembros.filter((m) => str(m.equipoId) === id);
        const members = propios.map((m) => ({
            uid: str(m.uid),
            name: str(m.name),
            role: (str(m.role) || 'PLAYER'),
            dorsal: numONull(m.dorsal),
            position: posicionONull(m.position),
            avatarUrl: null,
        }));
        const doc = {
            id,
            name: str(f.name),
            shieldUrl: str(f.shieldUrl) || null,
            captainId: str(f.captainUid),
            modalidadBase: str(f.modalidadBase) || 'F5',
            genero: str(f.genero) || undefined,
            members,
            stats: { wins: num(f.wins), draws: num(f.draws), losses: num(f.losses) },
            geo: geo(numONull(f.lat), numONull(f.lng)),
        };
        if (doc.genero === undefined)
            delete doc.genero;
        return { id, doc };
    })
        .filter((e) => e.id !== '');
}
function mapearDesafios(filas) {
    return filas
        .map((f) => {
        const id = str(f.id);
        const doc = {
            id,
            creatorId: str(f.creatorUid),
            equipoId: str(f.equipoId),
            equipoNombre: str(f.equipoNombre),
            equipoEscudoUrl: str(f.equipoEscudoUrl) || null,
            modalidad: str(f.modalidad) || 'F5',
            estadoCancha: str(f.estadoCancha) || 'BUSCA_CANCHA',
            estado: str(f.estado) || 'ABIERTO',
            turnoId: str(f.turnoId) || null,
            predioId: str(f.predioId) || null,
            posicionBuscada: posicionONull(f.posicionBuscada),
            fechaUnix: fechaUnix(str(f.fechaISO)),
            descripcion: str(f.descripcion) || null,
            geo: geo(numONull(f.lat), numONull(f.lng)),
            equiposAceptantes: [],
            createdAt: Date.now(),
        };
        return { id, doc };
    })
        .filter((d) => d.id !== '');
}
function mapearPartidos(partidos, postulaciones) {
    return partidos
        .map((f) => {
        const id = str(f.id);
        const doc = {
            id,
            organizadorId: str(f.organizadorUid),
            nombre: str(f.nombre),
            predioId: str(f.predioId),
            canchaId: str(f.canchaId),
            barrio: str(f.barrio),
            fecha: str(f.fecha),
            hora: str(f.hora),
            modalidad: str(f.modalidad) || 'F5',
            cuposDisponibles: num(f.cuposDisponibles),
            posicionBuscada: posicionONull(f.posicionBuscada),
            estado: str(f.estado) || 'abierto',
            geo: geo(numONull(f.lat), numONull(f.lng)),
        };
        const posts = postulaciones
            .filter((p) => str(p.partidoId) === id)
            .map((p) => ({
            id: str(p.jugadorUid),
            doc: {
                jugadorId: str(p.jugadorUid),
                nombre: str(p.nombre),
                posicion: str(p.posicion),
                telefono: str(p.telefono),
                fotoUrl: str(p.fotoUrl),
                mensaje: str(p.mensaje),
                estado: str(p.estado) || 'pendiente',
            },
        }));
        return { id, doc, postulaciones: posts };
    })
        .filter((p) => p.id !== '');
}
function mapearReportes(filas) {
    return filas
        .map((f) => {
        const id = str(f.id);
        const doc = {
            id,
            reportanteUid: str(f.reportanteUid),
            usuarioReportadoUid: str(f.usuarioReportadoUid),
            categoria: str(f.categoria) || 'otro',
            motivo: str(f.motivo),
            estado: str(f.estado) || 'abierto',
            resueltoPor: null,
            resueltoAt: null,
        };
        return { id, doc };
    })
        .filter((r) => r.id !== '');
}
// ============================================================================
// Punto de entrada
// ============================================================================
const hoja = (hojas, nombre) => { var _a; return (_a = hojas[nombre]) !== null && _a !== void 0 ? _a : []; };
function construirPlan(hojas) {
    var _a;
    const filasUsuarios = hoja(hojas, 'Usuarios');
    const filasMiembros = hoja(hojas, 'MiembrosEquipo');
    // teamIds derivado de MiembrosEquipo, para no depender de que la columna este completa.
    const equiposDeUid = {};
    for (const m of filasMiembros) {
        const uid = str(m.uid);
        const equipoId = str(m.equipoId);
        if (uid === '' || equipoId === '')
            continue;
        const previos = (_a = equiposDeUid[uid]) !== null && _a !== void 0 ? _a : [];
        if (!previos.includes(equipoId))
            previos.push(equipoId);
        equiposDeUid[uid] = previos;
    }
    return {
        usuarios: mapearUsuarios(filasUsuarios, equiposDeUid),
        solicitudes: mapearSolicitudes(hoja(hojas, 'Solicitudes')),
        predios: mapearPredios(hoja(hojas, 'Predios'), hoja(hojas, 'Canchas')),
        equipos: mapearEquipos(hoja(hojas, 'Equipos'), filasMiembros),
        desafios: mapearDesafios(hoja(hojas, 'Desafios')),
        partidos: mapearPartidos(hoja(hojas, 'Partidos'), hoja(hojas, 'Postulaciones')),
        reportes: mapearReportes(hoja(hojas, 'Reportes')),
    };
}
//# sourceMappingURL=mapping.js.map