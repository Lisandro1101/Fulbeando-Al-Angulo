"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoApprovePendingMatches = exports.onMatchUpdated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicialización de admin para tener privilegios puros de Backend
admin.initializeApp();
const db = admin.firestore();
// =========================================================================
// 1. SISTEMA DE CONSOLIDACIÓN ESTADÍSTICA (Disparador de Base de Datos)
// REGLA DE ORO: Las stats se tocan exclusivamente en backend y con increment()
// =========================================================================
exports.onMatchUpdated = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Condición arquitectónica estricta: Solo reacciona al trigger de confirmación
    if (before.status === 'pending_approval' && after.status === 'confirmed') {
        const batch = db.batch();
        // Función auxiliar para mantener el código DRY
        const processTeamStats = (teamScore, isWinner, isDraw) => {
            const teamRef = db.collection('teams').doc(teamScore.teamId);
            // INCREMENTOS: Operaciones atómicas que cuestan 0 lecturas
            // y garantizan exactitud matemática aunque 3 partidos se aprueben al mismo milisegundo.
            batch.update(teamRef, {
                'stats.matchesPlayed': admin.firestore.FieldValue.increment(1),
                'stats.goalsScored': admin.firestore.FieldValue.increment(teamScore.goals),
                'stats.wins': isWinner ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
                'stats.draws': isDraw ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
            });
            // Sumar goles a los artilleros
            if (teamScore.scorers) {
                for (const [playerId, goalsScored] of Object.entries(teamScore.scorers)) {
                    const playerRef = db.collection('users').doc(playerId);
                    batch.update(playerRef, {
                        'stats.goals': admin.firestore.FieldValue.increment(goalsScored),
                        'stats.matchesPlayed': admin.firestore.FieldValue.increment(1) // Suma de presencia
                    });
                }
            }
        };
        const localGoals = after.localTeam.goals;
        const visitorGoals = after.visitorTeam.goals;
        const isDraw = localGoals === visitorGoals;
        // Aplicar consolidación a ambos frentes
        processTeamStats(after.localTeam, localGoals > visitorGoals, isDraw);
        processTeamStats(after.visitorTeam, visitorGoals > localGoals, isDraw);
        try {
            await batch.commit();
            console.log(`[Al Ángulo] Stats consolidadas para el partido ${context.params.matchId}.`);
        }
        catch (error) {
            console.error(`[Al Ángulo] Error consolidando partido ${context.params.matchId}:`, error);
        }
    }
    return null; // Terminar el ciclo de vida de la Cloud Function
});
// =========================================================================
// 2. CRON JOB ANTIFRAUDE (Auto-aprobación periódica)
// Evita que los perdedores enojados dejen el partido pendiente para siempre.
// =========================================================================
exports.autoApprovePendingMatches = functions.pubsub
    .schedule('every 1 hours') // Corremos el escáner cada hora para bajo costo operativo
    .onRun(async (context) => {
    // Definir la barrera del tiempo (24 horas exactas hacia atrás)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        // REGLA DE AHORRO: Query ultra-acotada e indexada en BD
        const snapshot = await db.collection('matches')
            .where('status', '==', 'pending_approval')
            .where('submittedAt', '<=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
            .get();
        if (snapshot.empty) {
            console.log('[Al Ángulo Antifraude] Limpio. Ningún partido vencido.');
            return null;
        }
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                status: 'confirmed',
                systemAutoApproved: true,
                confirmedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        // Ejecución masiva atómica (un commit puede aprobar hasta 500 partidos vencidos)
        await batch.commit();
        console.log(`[Al Ángulo Antifraude] Justicia aplicada. Se aprobaron ${snapshot.size} partidos abandonados.`);
    }
    catch (error) {
        console.error('[Al Ángulo Antifraude] Falla crítica en CRON:', error);
    }
    return null;
});
//# sourceMappingURL=matches.js.map