"use strict";
/**
 * Escritura del plan de importacion con Admin SDK.
 *
 * Usado por los dos caminos: el script (`scripts/importar-datos-prueba.ts`) y la
 * Cloud Function callable (`src/importarDatos.ts`). Como corre con privilegios
 * de administrador, NO le afectan las `firestore.rules` (que bloquearian a un
 * cliente normal creando usuarios, predios de terceros o challenges).
 *
 * Idempotente: todo se escribe con `merge: true`, y en Auth se hace create-or-update.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarPlan = importarPlan;
const admin = require("firebase-admin");
/**
 * Garantiza una app inicializada ANTES de tocar Auth/Firestore.
 *
 * El script de Node (`scripts/importar-datos-prueba.ts`) tiene su propia copia
 * de `firebase-admin` en `node_modules`, distinta de la que resuelve este
 * modulo (la del paquete de Functions). Inicializar una no inicializa la otra,
 * y Firestore tira `app/no-app`. Aca se inicializa la copia correcta usando el
 * projectId del entorno (los emuladores exportan `GCLOUD_PROJECT`).
 */
function asegurarApp() {
    if (admin.apps.length > 0)
        return;
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || undefined;
    admin.initializeApp(projectId ? { projectId } : undefined);
}
const COLECCIONES = {
    usuarios: 'usuarios',
    solicitudes: 'solicitudes',
    predios: 'predios',
    canchas: 'canchas',
    equipos: 'teams',
    desafios: 'challenges',
    /** Coleccion real que lee el modulo de partidos. */
    partidos: 'partidos',
    /** Espejo legacy que cuentan los KPIs del panel superadmin (`COLECCIONES.partidos`). */
    matches: 'matches',
    postulaciones: 'postulaciones',
    reportes: 'reportes',
};
function upsertarAuth(auth, u) {
    return auth
        .getUser(u.uid)
        .then(() => auth.updateUser(u.uid, {
        email: u.email,
        password: u.password,
        displayName: u.displayName,
        photoURL: u.photoURL || undefined,
    }))
        .then(() => undefined)
        .catch(async (error) => {
        if ((error === null || error === void 0 ? void 0 : error.code) === 'auth/user-not-found') {
            await auth.createUser({
                uid: u.uid,
                email: u.email,
                password: u.password,
                displayName: u.displayName,
                photoURL: u.photoURL || undefined,
            });
            return;
        }
        throw error;
    });
}
async function importarPlan(plan) {
    asegurarApp();
    const auth = admin.auth();
    const db = admin.firestore();
    // `new Date()` en vez de `FieldValue.serverTimestamp()`: el runtime del
    // emulador de Functions carga una version de `firebase-admin` donde el
    // namespace no expone `FieldValue`, y Firestore igual convierte un Date en
    // Timestamp al escribir. Se comporta igual en produccion.
    const ahora = new Date();
    const resumen = {
        usuarios: 0,
        solicitudes: 0,
        predios: 0,
        canchas: 0,
        equipos: 0,
        desafios: 0,
        partidos: 0,
        postulaciones: 0,
        reportes: 0,
        errores: [],
    };
    const conAuditoria = (doc) => (Object.assign(Object.assign({}, doc), { createdAt: ahora, updatedAt: ahora, deletedAt: null }));
    const anotar = (contexto, error) => {
        const mensaje = error instanceof Error ? error.message : String(error);
        resumen.errores.push(`${contexto}: ${mensaje}`);
    };
    // ---------------------------------------------------------------- Auth + usuarios
    for (const u of plan.usuarios) {
        try {
            await upsertarAuth(auth, u);
            await db.collection(COLECCIONES.usuarios).doc(u.uid).set(conAuditoria(u.doc), { merge: true });
            resumen.usuarios += 1;
        }
        catch (error) {
            anotar(`usuario ${u.uid}`, error);
        }
    }
    // ---------------------------------------------------------------- Solicitudes
    for (const s of plan.solicitudes) {
        try {
            await db.collection(COLECCIONES.solicitudes).doc(s.id).set(conAuditoria(s.doc), { merge: true });
            resumen.solicitudes += 1;
        }
        catch (error) {
            anotar(`solicitud ${s.id}`, error);
        }
    }
    // ---------------------------------------------------------------- Predios + canchas
    for (const p of plan.predios) {
        try {
            const ref = db.collection(COLECCIONES.predios).doc(p.id);
            await ref.set(conAuditoria(p.doc), { merge: true });
            resumen.predios += 1;
            for (const c of p.canchas) {
                await ref.collection(COLECCIONES.canchas).doc(c.id).set(conAuditoria(c.doc), { merge: true });
                resumen.canchas += 1;
            }
        }
        catch (error) {
            anotar(`predio ${p.id}`, error);
        }
    }
    // ---------------------------------------------------------------- Equipos
    for (const e of plan.equipos) {
        try {
            await db.collection(COLECCIONES.equipos).doc(e.id).set(conAuditoria(e.doc), { merge: true });
            resumen.equipos += 1;
        }
        catch (error) {
            anotar(`equipo ${e.id}`, error);
        }
    }
    // ---------------------------------------------------------------- Desafios
    for (const d of plan.desafios) {
        try {
            await db.collection(COLECCIONES.desafios).doc(d.id).set(d.doc, { merge: true });
            resumen.desafios += 1;
        }
        catch (error) {
            anotar(`desafio ${d.id}`, error);
        }
    }
    // ---------------------------------------------------------------- Partidos (+ espejo) + postulaciones
    for (const p of plan.partidos) {
        try {
            const doc = conAuditoria(p.doc);
            for (const coleccion of [COLECCIONES.partidos, COLECCIONES.matches]) {
                const ref = db.collection(coleccion).doc(p.id);
                await ref.set(doc, { merge: true });
                for (const post of p.postulaciones) {
                    await ref
                        .collection(COLECCIONES.postulaciones)
                        .doc(post.id)
                        .set(Object.assign(Object.assign({}, post.doc), { creadoAt: ahora }), { merge: true });
                    if (coleccion === COLECCIONES.partidos)
                        resumen.postulaciones += 1;
                }
            }
            resumen.partidos += 1;
        }
        catch (error) {
            anotar(`partido ${p.id}`, error);
        }
    }
    // ---------------------------------------------------------------- Reportes
    for (const r of plan.reportes) {
        try {
            await db.collection(COLECCIONES.reportes).doc(r.id).set(conAuditoria(r.doc), { merge: true });
            resumen.reportes += 1;
        }
        catch (error) {
            anotar(`reporte ${r.id}`, error);
        }
    }
    return resumen;
}
//# sourceMappingURL=importador.js.map