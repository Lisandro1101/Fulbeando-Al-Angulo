process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import * as admin from 'firebase-admin';
import { PROJECT_ID } from './proyecto-emulador';

admin.initializeApp({ projectId: PROJECT_ID });

async function limpiarFirestore() {
  console.log(`🧹 Limpiando datos del emulador de Firestore para el proyecto: ${PROJECT_ID}...`);

  try {
    // 1. Endpoint nativo del emulador de Firestore para purgar todos los documentos
    const firestoreUrl = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
    const res = await fetch(firestoreUrl, { method: 'DELETE' });

    if (res.ok) {
      console.log('   ✔️ Todas las colecciones y documentos de Firestore fueron eliminados exitosamente.');
    } else {
      console.warn(`   ⚠️ Falló el endpoint REST (${res.statusText}), limpiando colecciones vía Admin SDK...`);
      const db = admin.firestore();
      const collections = await db.listCollections();
      for (const col of collections) {
        const snap = await col.get();
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   ✔️ Colección '${col.id}' vaciada.`);
      }
    }

    // 2. Limpieza de usuarios de prueba en Auth emulator para que puedas registrarte de cero sin conflictos
    console.log('🧹 Limpiando usuarios del emulador de Auth...');
    const authUrl = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`;
    const resAuth = await fetch(authUrl, { method: 'DELETE' });
    if (resAuth.ok) {
      console.log('   ✔️ Todos los usuarios de prueba en Auth fueron eliminados.');
    } else {
      const auth = admin.auth();
      const list = await auth.listUsers();
      if (list.users.length > 0) {
        await auth.deleteUsers(list.users.map((u) => u.uid));
        console.log(`   ✔️ ${list.users.length} usuarios eliminados en Auth.`);
      } else {
        console.log('   ✔️ Auth ya estaba vacío.');
      }
    }

    console.log('\n✨ Firestore y Auth en el emulador están completamente limpios.');
    console.log('👉 Ahora podés registrarte y crear todos los datos que quieras desde cero.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al limpiar el emulador:', error);
    process.exit(1);
  }
}

limpiarFirestore();
