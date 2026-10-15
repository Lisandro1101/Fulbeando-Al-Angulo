import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable para cargar el Excel de datos de prueba desde el panel superadmin.
 * Se reexporta como unica fuente en `importarDatos.ts` (que valida el rol).
 */
export { importarDatos } from './importarDatos';

/**
 * RADAR (Fase 2): callable Gen 2 que resuelve los pines del mapa en una sola
 * llamada (filtro geohash, Haversine, orden, truncado y DTO corto).
 */
export { radarQuery } from './radarQuery';

/**
 * Cloudflare R2: Callable para generar URLs prefirmadas de subida directa
 * al bucket de R2 evitando costes de transferencia y almacenamiento en Firebase.
 */
export { getPresignedUploadUrl } from './storage';

/**
 * Cloud Function que se dispara cuando un jugador se postula a un partido.
 * Busca al organizador del partido, recupera sus tokens FCM y le envía
 * una notificación push con los datos de la postulación.
 */
export const notificarOrganizadorNuevaPostulacion = functions.firestore
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
      const organizadorId = partidoData?.organizadorId;
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
      const tokenIndividual = usuarioData?.fcmToken;
      const tokensArray: string[] = usuarioData?.fcmTokens || [];
      const tokens = Array.from(new Set([tokenIndividual, ...tokensArray].filter(Boolean))) as string[];

      if (tokens.length === 0) {
        console.log(`[CloudFunction] El organizador ${organizadorId} no tiene tokens FCM configurados.`);
        return null;
      }

      // 3. Formatear notificación push
      const nombreJugador = postulacion?.nombre || 'Un jugador libre';
      const posicion = postulacion?.posicion && postulacion.posicion !== 'Cualquiera' ? ` (${postulacion.posicion})` : '';

      const payload: admin.messaging.MulticastMessage = {
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
      console.log(
        `[CloudFunction] Notificación enviada para partido ${partidoId}: ${respuesta.successCount} enviados, ${respuesta.failureCount} fallidos.`
      );

      return null;
    } catch (error) {
      console.error('[CloudFunction] Error al notificar al organizador:', error);
      return null;
    }
  });
