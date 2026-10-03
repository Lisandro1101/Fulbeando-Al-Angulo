/**
 * Puente de datos para el seed.
 *
 * El seed usa el SDK de admin a proposito: el cliente sin autenticar no puede
 * crear duenos, predios ni turnos confirmados porque las rules los rechaza
 * (justo lo que el emulador tiene que verificar). El admin escribe saltandose
 * las rules, y el destino sigue siendo el emulador local: ningun dato real.
 *
 * La superficie exportada imita la del SDK cliente (`doc`, `setDoc`,
 * `writeBatch`, `Timestamp`) para no tener que reescribir el seed.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase/firestore';
import { appEnv } from '../src/core/config';
const projectId = appEnv().firebase.projectId || 'fulbeando-demo';
// El admin SDK manda a Google salvo que apunte a los emuladores.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.GCLOUD_PROJECT ??= projectId;
process.env.GOOGLE_CLOUD_PROJECT ??= projectId;
const app = getApps()[0] ?? initializeApp({ projectId });
export const db = getFirestore(app);
export const authAdmin = getAuth(app);
export { Timestamp };
export const doc = (_db, ...segmentos) => ({
    ruta: segmentos.join('/'),
});
/**
 * El SDK de admin solo acepta un timestamp como objeto plano
 * `{ seconds, nanoseconds }`; una instancia de `Timestamp` del SDK cliente la
 * rechaza con "Cannot encode value". Como el seed reutiliza los tipos del
 * dominio (que tipan `createdAt` con el `Timestamp` cliente), la conversion va
 * aca. Tambien saca `undefined`, que el admin rechaza.
 */
const serializar = (valor) => {
    if (valor instanceof Timestamp) {
        return { seconds: valor.seconds, nanoseconds: valor.nanoseconds };
    }
    if (valor instanceof Date)
        return valor;
    if (Array.isArray(valor))
        return valor.map(serializar);
    if (valor !== null && typeof valor === 'object') {
        const salida = {};
        for (const [clave, dato] of Object.entries(valor)) {
            if (dato === undefined)
                continue;
            salida[clave] = serializar(dato);
        }
        return salida;
    }
    return valor;
};
export const setDoc = async (ref, datos) => {
    await db.doc(ref.ruta).set(serializar(datos));
};
export const writeBatch = (_db) => {
    const batch = db.batch();
    return {
        set(ref, datos) {
            batch.set(db.doc(ref.ruta), serializar(datos));
        },
        commit: () => batch.commit(),
    };
};
const yaExiste = (error) => {
    const code = error?.code ?? '';
    return code === 'auth/uid-already-exists' || code === 'auth/email-already-exists';
};
/**
 * Alta de cuentas en el emulador de Auth con el MISMO uid que usa el documento
 * de `usuarios`, que es lo que las rules comparan contra `request.auth.uid`.
 */
export const crearCuentaDemo = async (params) => {
    try {
        await authAdmin.createUser({
            uid: params.uid,
            email: params.email,
            displayName: params.nombre,
            password: params.password,
            emailVerified: true,
        });
    }
    catch (error) {
        if (!yaExiste(error))
            throw error;
    }
};
