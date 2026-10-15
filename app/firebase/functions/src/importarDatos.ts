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

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { construirPlan, type Hojas } from './importar-datos/mapping'
import { importarPlan, type ResumenImportacion } from './importar-datos/importador'

const MAX_FILAS = 5000

interface Payload {
  hojas?: Hojas
}

/** Autoriza solo a superadmins: por claim `superadmin` o por el rol en `usuarios`. */
async function exigirSuperadmin(context: functions.https.CallableContext): Promise<string> {
  const uid = context.auth?.uid
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Iniciá sesión para importar datos.')
  }

  if (context.auth?.token?.superadmin === true) return uid

  const snap = await admin.firestore().collection('usuarios').doc(uid).get()
  const rol = snap.data()?.rol
  if (rol !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo un superadmin puede importar datos.')
  }
  return uid
}

function validarHojas(hojas: Hojas): void {
  let total = 0
  for (const nombre of Object.keys(hojas)) {
    const filas = hojas[nombre]
    if (!Array.isArray(filas)) {
      throw new functions.https.HttpsError('invalid-argument', `La hoja "${nombre}" no es una lista.`)
    }
    total += filas.length
  }
  if (total === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'El archivo no tiene filas.')
  }
  if (total > MAX_FILAS) {
    throw new functions.https.HttpsError('invalid-argument', `Demasiadas filas (${total} > ${MAX_FILAS}).`)
  }
}

export const importarDatos = functions.https.onCall(
  async (data: Payload, context): Promise<ResumenImportacion> => {
    const uid = await exigirSuperadmin(context)

    const hojas = data?.hojas
    if (!hojas || typeof hojas !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Falta el contenido del Excel (hojas).')
    }
    validarHojas(hojas)

    functions.logger.info(`[importarDatos] superadmin ${uid} importando datos de prueba`)
    try {
      const plan = construirPlan(hojas)
      const resumen = await importarPlan(plan)
      functions.logger.info(`[importarDatos] resumen: ${JSON.stringify(resumen)}`)
      return resumen
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      functions.logger.error(`[importarDatos] fallo: ${mensaje}`, error)
      throw new functions.https.HttpsError('internal', `No pude importar: ${mensaje}`)
    }
  }
)
