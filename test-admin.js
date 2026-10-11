const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const app = initializeApp({ projectId: "fulbeando-demo" });
const db = getFirestore(app);

// Helper from geohash.ts
function prefix(lat, lng, length) {
  const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
  let hash = '';
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let isEven = true;
  for (let i = 0; i < length; i++) {
    let ch = 0;
    for (let j = 0; j < 5; j++) {
      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        if (lng > mid) { ch = (ch << 1) | 1; lngMin = mid; }
        else { ch = (ch << 1) | 0; lngMax = mid; }
      } else {
        const mid = (latMin + latMax) / 2;
        if (lat > mid) { ch = (ch << 1) | 1; latMin = mid; }
        else { ch = (ch << 1) | 0; latMax = mid; }
      }
      isEven = !isEven;
    }
    hash += chars[ch];
  }
  return hash;
}

async function run() {
  const p = prefix(-34.6037, -58.3816, 5);
  // Just query the whole collections first!
  const desaf = await db.collection('challenges').get();
  console.log('Challenges total:', desaf.docs.length);

  const equipos = await db.collection('teams').get();
  console.log('Teams total:', equipos.docs.length);

  const usuarios = await db.collection('usuarios').get();
  console.log('Users total:', usuarios.docs.length);
}

run().catch(console.error);
