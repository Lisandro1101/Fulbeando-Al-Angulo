import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { appEnv } from '../src/core/config'

const env = appEnv()
const app = initializeApp(env.firebase)
const db = getFirestore(app)

connectFirestoreEmulator(db, '127.0.0.1', 8080)

async function test() {
  console.log('Probando query de predios publicos...')
  try {
    const q = query(
      collection(db, 'predios'),
      where('verificado', '==', true),
      where('estado', '==', 'activo')
    )
    const snap = await getDocs(q)
    console.log('Resultado total de predios:', snap.docs.length)
    snap.docs.forEach(doc => {
      console.log(' - Predio:', doc.id, doc.data().nombre, doc.data().barrio)
    })
  } catch (err) {
    console.error('ERROR EN QUERY:', err)
  }
}

test()
