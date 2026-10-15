"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificarOrganizadorNuevaPostulacion = exports.getPresignedUploadUrl = exports.radarQuery = exports.importarDatos = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Callable para cargar el Excel de datos de prueba desde el panel superadmin.
 * Se reexporta como unica fuente en `importarDatos.ts` (que valida el rol).
 */
var importarDatos_1 = require("./importarDatos");
Object.defineProperty(exports, "importarDatos", { enumerable: true, get: function () { return importarDatos_1.importarDatos; } });
/**
 * RADAR (Fase 2): callable Gen 2 que resuelve los pines del mapa en una sola
 * llamada (filtro geohash, Haversine, orden, truncado y DTO corto).
 */
var radarQuery_1 = require("./radarQuery");
Object.defineProperty(exports, "radarQuery", { enumerable: true, get: function () { return radarQuery_1.radarQuery; } });
/**
 * Cloudflare R2: Callable para generar URLs prefirmadas de subida directa
 * al bucket de R2 evitando costes de transferencia y almacenamiento en Firebase.
 */
var storage_1 = require("./storage");
Object.defineProperty(exports, "getPresignedUploadUrl", { enumerable: true, get: function () { return storage_1.getPresignedUploadUrl; } });
/**
 * Cloud Function que se dispara cuando un jugador se postula a un partido.
 * Busca al organizador del partido, recupera sus tokens FCM y le envía
 * una notificación push con los datos de la postulación.
 */
exports.notificarOrganizadorNuevaPostulacion = functions.firestore
    .document('partidos/{partidoId}/postulaciones/{jugadorId}')
    .onCreate(async (snap, context) => {
    const { partidoId, jugadorId } = context.params;
    const postulacion = snap.data();
    try {
        // 1. Obtener el partido para saber quién es el organizador
        const partidoDoc = await admin.firestore().collection('partidos').doc(partidoId).get();
        if (!partidoDoc.exists) {
            console.warn(`[CloudFunction] Partido ${partidoId} no encontrado.`);
            return null;
        }
        const partidoData = partidoDoc.data();
        const organizadorId = partidoData === null || partidoData === void 0 ? void 0 : partidoData.organizadorId;
        if (!organizadorId) {
            console.warn(`[CloudFunction] El partido ${partidoId} no tiene organizadorId.`);
            return null;
        }
        // 2. Obtener el usuario organizador y sus tokens FCM
        const usuarioDoc = await admin.firestore().collection('usuarios').doc(organizadorId).get();
        if (!usuarioDoc.exists) {
            console.warn(`[CloudFunction] Organizador ${organizadorId} no encontrado en usuarios.`);
            return null;
        }
        const usuarioData = usuarioDoc.data();
        const tokenIndividual = usuarioData === null || usuarioData === void 0 ? void 0 : usuarioData.fcmToken;
        const tokensArray = (usuarioData === null || usuarioData === void 0 ? void 0 : usuarioData.fcmTokens) || [];
        const tokens = Array.from(new Set([tokenIndividual, ...tokensArray].filter(Boolean)));
        if (tokens.length === 0) {
            console.log(`[CloudFunction] El organizador ${organizadorId} no tiene tokens FCM configurados.`);
            return null;
        }
        // 3. Formatear notificación push
        const nombreJugador = (postulacion === null || postulacion === void 0 ? void 0 : postulacion.nombre) || 'Un jugador libre';
        const posicion = (postulacion === null || postulacion === void 0 ? void 0 : postulacion.posicion) && postulacion.posicion !== 'Cualquiera' ? ` (${postulacion.posicion})` : '';
        const payload = {
            tokens,
            notification: {
                title: '¡Nueva postulación a tu partido!',
                body: `${nombreJugador}${posicion} quiere sumarse al partido.`,
            },
            data: {
                tipo: 'NUEVA_POSTULACION',
                partidoId: String(partidoId),
                jugadorId: String(jugadorId),
                nombreJugador: String(nombreJugador),
            },
        };
        // 4. Enviar vía firebase-admin
        const respuesta = await admin.messaging().sendEachForMulticast(payload);
        console.log(`[CloudFunction] Notificación enviada para partido ${partidoId}: ${respuesta.successCount} enviados, ${respuesta.failureCount} fallidos.`);
        return null;
    }
    catch (error) {
        console.error('[CloudFunction] Error al notificar al organizador:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map