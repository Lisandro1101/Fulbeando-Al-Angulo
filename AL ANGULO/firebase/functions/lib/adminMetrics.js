"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWeeklyMetrics = exports.onMatchStatusChanged = exports.onUserCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
const SUMMARY_DOC = 'system_metrics/dashboard_summary';
/**
 * INCREMENTO ATÓMICO (Costo 0 de lectura general)
 * Actualiza el dashboard cuando se crea un usuario nuevo.
 */
exports.onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async () => {
    const summaryRef = db.doc(SUMMARY_DOC);
    await summaryRef.set({
        users: {
            total: admin.firestore.FieldValue.increment(1),
            newThisWeek: admin.firestore.FieldValue.increment(1)
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});
/**
 * ACTUALIZACIÓN DE ESTADOS DE PARTIDO
 * Suma al contador de 'disputados', 'jugados' o 'cancelados' en el Dashboard de forma atómica.
 */
exports.onMatchStatusChanged = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change) => {
    const before = change.before.data().status;
    const after = change.after.data().status;
    if (before === after)
        return null;
    const summaryRef = db.doc(SUMMARY_DOC);
    const updates = { lastUpdated: admin.firestore.FieldValue.serverTimestamp() };
    // Si entra en disputa (apelación del capitán rival)
    if (after === 'disputed') {
        updates['matches.disputed'] = admin.firestore.FieldValue.increment(1);
        if (before === 'pending_approval') {
            updates['matches.pendingValidation'] = admin.firestore.FieldValue.increment(-1);
        }
    }
    // Si se resuelve/confirma
    if (after === 'confirmed') {
        updates['matches.played'] = admin.firestore.FieldValue.increment(1);
        if (before === 'disputed')
            updates['matches.disputed'] = admin.firestore.FieldValue.increment(-1);
        if (before === 'pending_approval')
            updates['matches.pendingValidation'] = admin.firestore.FieldValue.increment(-1);
    }
    await summaryRef.set(updates, { merge: true });
    return null;
});
/**
 * CRON JOB DE LIMPIEZA
 * Cada Lunes a las 00:00 (Hora Argentina), se resetean los contadores semanales
 * para el panel del fundador.
 */
exports.resetWeeklyMetrics = functions.pubsub
    .schedule('every monday 00:00')
    .timeZone('America/Argentina/Buenos_Aires')
    .onRun(async () => {
    const summaryRef = db.doc(SUMMARY_DOC);
    await summaryRef.set({
        users: {
            newThisWeek: 0,
            activeLast7Days: 0 // Esto se alimentaría de un log secundario de logins
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});
//# sourceMappingURL=adminMetrics.js.map