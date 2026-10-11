/**
 * Crea (o repara) la cuenta de superadmin en los emuladores.
 *
 *   npx tsx scripts/crear-superadmin.ts [email] [password]
 *
 * El seed nunca toca `rol: 'superadmin'`: en el proyecto real esa cuenta ya
 * existe, y este script no llega ahi. En local hace falta correrlo una vez por
 * base, porque sin el rol el gate de `/superadmin` devuelve a `/role-selector`.
 *
 * Idempotente: si la cuenta ya existe solo fija el rol y `estado`. La
 * contrasena se cambia unicamente si se pasa como segundo argumento.
 */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

import * as admin from 'firebase-admin'
import { PROJECT_ID } from './proyecto-emulador'

admin.initializeApp({ projectId: PROJECT_ID })
const db = admin.firestore()
const auth = admin.auth()

const EMAIL = process.argv[2] ?? 'lisandrodileva@gmail.com'
const PASSWORD = process.argv[3]
const NOMBRE = 'Lisandro'

async function main(): Promise<void> {
  let uid: string
  let cuentaCreada = false

  try {
    uid = (await auth.getUserByEmail(EMAIL)).uid
    if (PASSWORD) {
      await auth.updateUser(uid, { password: PASSWORD })
      console.log('Contrasena actualizada.')
    }
  } catch {
    const creada = await auth.createUser({
      email: EMAIL,
      password: PASSWORD ?? 'password123',
      displayName: NOMBRE,
    })
    uid = creada.uid
    cuentaCreada = true
  }

  // Mismo shape que `asegurarUsuario` del modulo de usuarios: el doc tiene que
  // sobrevivir a cualquier relectura de `useSesion` sin que se le reponga
  // `rol: invitado`.
  const ref = db.doc(`usuarios/${uid}`)
  const snap = await ref.get()
  const ahora = admin.firestore.FieldValue.serverTimestamp()

  if (snap.exists) {
    await ref.update({ rol: 'superadmin', estado: 'activo', email: EMAIL, updatedAt: ahora })
    console.log('Rol fijado en superadmin sobre el doc existente.')
  } else {
    await ref.set({
      uid,
      nombre: NOMBRE,
      apellido: '',
      email: EMAIL,
      rol: 'superadmin',
      telefono: null,
      whatsappVerificado: false,
      perfilDeportivo: null,
      geo: null,
      zona: null,
      fotoUrl: null,
      fechaNacimiento: null,
      estado: 'activo',
      createdAt: ahora,
      updatedAt: ahora,
    })
    console.log('Doc de usuario creado con rol superadmin.')
  }

  console.log(`uid=${uid} cuentaAuth=${cuentaCreada ? 'creada' : 'existente'} email=${EMAIL}`)
  await admin.app().delete()
}

main().catch((e) => {
  console.error('FALLO', e)
  process.exit(1)
})
