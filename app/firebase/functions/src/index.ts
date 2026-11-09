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

/**
 * Tarea programada (cada 5 minutos) para liberar turnos que quedaron en
 * 'bloqueado_temporal' si pasaron más de 15 minutos sin ser confirmados.
 */
export const liberarTurnosBloqueadosExpirados = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const ahora = Date.now();
    const snap = await admin.firestore()
      .collection('turnos')
      .where('estado', '==', 'bloqueado_temporal')
      .get();

    const batch = admin.firestore().batch();
    let liberados = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      const bloqueadoHasta = data.bloqueadoHasta ? new Date(data.bloqueadoHasta).getTime() : 0;
      // Si el tiempo de bloqueo ya expiró (o fue hace más de 15 min)
      if (bloqueadoHasta > 0 && bloqueadoHasta < ahora) {
        batch.update(doc.ref, {
          estado: 'disponible',
          organizadorUid: null,
          bloqueadoHasta: null,
          comprobantePendiente: false,
          motivoRechazo: 'Expiró el tiempo de espera de validación de seña (15 minutos)',
          updatedAt: ahora,
        });
        liberados++;
      }
    });

    if (liberados > 0) {
      await batch.commit();
      console.log(`[Cron] Se liberaron ${liberados} turnos bloqueados expirados.`);
    }
    return null;
  });

/**
 * Notificación Push cuando el dueño aprueba o rechaza una seña de turno.
 */
export const notificarJugadorEstadoSena = functions.firestore
  .document('turnos/{turnoId}')
  .onUpdate(async (change, context) => {
    const antes = change.before.data();
    const despues = change.after.data();

    // Solo reaccionar ante cambios de estado relevantes
    if (antes.estado === despues.estado) return null;

    const organizadorUid = despues.organizadorUid || antes.organizadorUid;
    if (!organizadorUid) return null;

    // Solo notificar si pasó a confirmado o si fue rechazado
    if (despues.estado !== 'confirmado' && despues.estado !== 'disponible' && despues.estado !== 'cancelado') {
      return null;
    }

    const fueAprobado = despues.estado === 'confirmado';
    const fueRechazado = antes.estado === 'bloqueado_temporal' && (despues.estado === 'disponible' || despues.estado === 'cancelado');

    if (!fueAprobado && !fueRechazado) return null;

    try {
      const userDoc = await admin.firestore().collection('usuarios').doc(organizadorUid).get();
      if (!userDoc.exists) return null;
      const userData = userDoc.data();
      const tokens = Array.from(new Set([userData?.fcmToken, ...(userData?.fcmTokens || [])].filter(Boolean))) as string[];
      if (tokens.length === 0) return null;

      const titulo = fueAprobado
        ? '¡Tu seña fue aprobada! ⚽'
        : 'Aviso sobre tu reserva de turno';
      const cuerpo = fueAprobado
        ? `El turno para el ${despues.fecha || 'partido'} a las ${despues.horaInicio || ''}hs está confirmado.`
        : (despues.motivoRechazo ? `Seña no aprobada: ${despues.motivoRechazo}` : 'Tu solicitud de reserva no pudo ser confirmada.');

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: titulo, body: cuerpo },
        data: {
          tipo: fueAprobado ? 'TURNO_CONFIRMADO' : 'TURNO_RECHAZADO',
          turnoId: context.params.turnoId,
        },
      });
    } catch (err) {
      console.error('[CloudFunction] Error notificando estado de seña:', err);
    }
    return null;
  });

/**
 * Notificación Push cuando un equipo recibe una propuesta de desafío o invitación.
 */
export const notificarEquipoPropuestaDesafio = functions.firestore
  .document('invitaciones/{invitacionId}')
  .onCreate(async (snap, context) => {
    const invitacion = snap.data();
    const destinatarioUid = invitacion.destinatarioUid;
    if (!destinatarioUid) return null;

    try {
      const userDoc = await admin.firestore().collection('usuarios').doc(destinatarioUid).get();
      if (!userDoc.exists) return null;
      const userData = userDoc.data();
      const tokens = Array.from(new Set([userData?.fcmToken, ...(userData?.fcmTokens || [])].filter(Boolean))) as string[];
      if (tokens.length === 0) return null;

      const tipo = invitacion.tipo;
      let titulo = '¡Nuevo desafío de partido!';
      let cuerpo = `${invitacion.remitenteNombre || 'Un equipo'} propuso jugar un desafío contra tu equipo.`;

      if (tipo === 'invitacion_equipo') {
        titulo = '¡Te invitaron a un equipo!';
        cuerpo = `${invitacion.remitenteNombre || 'Un capitán'} te invitó a sumarte al plantel de ${invitacion.equipoNombre || 'su equipo'}.`;
      } else if (tipo === 'postulacion_partido') {
        titulo = '¡Jugador postulado a tu partido!';
        cuerpo = `${invitacion.remitenteNombre || 'Un jugador'} quiere sumarse al partido de hoy.`;
      }

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: titulo, body: cuerpo },
        data: {
          tipo: String(tipo || 'DESAFIO'),
          invitacionId: context.params.invitacionId,
        },
      });
    } catch (err) {
      console.error('[CloudFunction] Error notificando propuesta de desafío:', err);
    }
    return null;
  });

/**
 * Notificación Push cuando se publica una alerta de "Falta 1".
 * Notifica a los jugadores disponibles en la zona.
 */
export const notificarAlertaFaltaUno = functions.firestore
  .document('alertas/{alertaId}')
  .onCreate(async (snap, context) => {
    const alerta = snap.data();
    if (alerta.estado !== 'activa') return null;

    try {
      // Buscar jugadores marcados como disponibles hoy
      const jugadoresSnap = await admin.firestore()
        .collection('usuarios')
        .where('rol', '==', 'jugador')
        .where('perfilDeportivo.disponibleHoy', '==', true)
        .limit(100)
        .get();

      const tokensSet = new Set<string>();
      jugadoresSnap.forEach((doc) => {
        if (doc.id === alerta.creadoPorUid) return; // no notificarse a sí mismo
        const d = doc.data();
        if (d.fcmToken) tokensSet.add(d.fcmToken);
        if (Array.isArray(d.fcmTokens)) {
          d.fcmTokens.forEach((t: string) => { if (t) tokensSet.add(t); });
        }
      });

      const tokens = Array.from(tokensSet);
      if (tokens.length === 0) return null;

      const cantidad = alerta.cantidadRequeridos || 1;
      const horario = alerta.horaInicio ? ` a las ${alerta.horaInicio}hs` : '';
      const lugar = alerta.predioNombre ? ` en ${alerta.predioNombre}` : '';

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: '🚨 ¡Falta 1 cerca tuyo!',
          body: `Se busca${cantidad > 1 ? 'n ' + cantidad + ' suplentes' : ' jugador'}${horario}${lugar}. ¡Sumate ahora!`,
        },
        data: {
          tipo: 'FALTA_UNO',
          alertaId: context.params.alertaId,
        },
      });
      console.log(`[CloudFunction] Alerta Falta 1 notificada a ${tokens.length} dispositivos.`);
    } catch (err) {
      console.error('[CloudFunction] Error notificando alerta Falta 1:', err);
    }
    return null;
  });
