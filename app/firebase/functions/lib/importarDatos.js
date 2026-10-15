"use strict";
/**
 * Callable `importarDatos` — carga el Excel de datos de prueba desde el panel.
 *
 * Corre con Admin SDK, asi que puede escribir documentos que las
 * `firestore.rules` le prohibirian a un cliente normal (crear usuarios, predios
 * de terceros, challenges, etc.). Por eso valida fuerte: SOLO un superadmin
 * autenticado puede invocarla.
 *
 * El cliente manda `{ hojas: { Usuarios: [...], Predios: [...], ... } }`, es
 * decir el Excel ya parseado con SheetJS. El mapeo a documentos canonicos lo
 * hace `importar-datos/mapping.ts`, COMPARTIDO con `scripts/importar-datos-prueba.ts`
 * para que ambos caminos escriban exactamente lo mismo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarDatos = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mapping_1 = require("./importar-datos/mapping");
const importador_1 = require("./importar-datos/importador");
const MAX_FILAS = 5000;
/** Autoriza solo a superadmins: por claim `superadmin` o por el rol en `usuarios`. */
async function exigirSuperadmin(context) {
    var _a, _b, _c, _d;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Iniciá sesión para importar datos.');
    }
    if (((_c = (_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.superadmin) === true)
        return uid;
    const snap = await admin.firestore().collection('usuarios').doc(uid).get();
    const rol = (_d = snap.data()) === null || _d === void 0 ? void 0 : _d.rol;
    if (rol !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo un superadmin puede importar datos.');
    }
    return uid;
}
function validarHojas(hojas) {
    let total = 0;
    for (const nombre of Object.keys(hojas)) {
        const filas = hojas[nombre];
        if (!Array.isArray(filas)) {
            throw new functions.https.HttpsError('invalid-argument', `La hoja "${nombre}" no es una lista.`);
        }
        total += filas.length;
    }
    if (total === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'El archivo no tiene filas.');
    }
    if (total > MAX_FILAS) {
        throw new functions.https.HttpsError('invalid-argument', `Demasiadas filas (${total} > ${MAX_FILAS}).`);
    }
}
exports.importarDatos = functions.https.onCall(async (data, context) => {
    const uid = await exigirSuperadmin(context);
    const hojas = data === null || data === void 0 ? void 0 : data.hojas;
    if (!hojas || typeof hojas !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Falta el contenido del Excel (hojas).');
    }
    validarHojas(hojas);
    functions.logger.info(`[importarDatos] superadmin ${uid} importando datos de prueba`);
    try {
        const plan = (0, mapping_1.construirPlan)(hojas);
        const resumen = await (0, importador_1.importarPlan)(plan);
        functions.logger.info(`[importarDatos] resumen: ${JSON.stringify(resumen)}`);
        return resumen;
    }
    catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        functions.logger.error(`[importarDatos] fallo: ${mensaje}`, error);
        throw new functions.https.HttpsError('internal', `No pude importar: ${mensaje}`);
    }
});
//# sourceMappingURL=importarDatos.js.map