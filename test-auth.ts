import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, query, collection, where, limit, getDocs } from "firebase/firestore";
import { prefijosQueCubren } from "./app/src/core/geo/geohash";
import { connectAuthEmulator } from "firebase/auth";

const app = initializeApp({ projectId: "fulbeando-demo", apiKey: "fake-api-key" });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function run() {
  await signInWithEmailAndPassword(auth, "jugador5@masivo.com", "password123");

  const punto = { lat: -34.6037, lng: -58.3816 };
  const radioKm = 10;
  const prefijos = ['69ydb', '69ydc', '69ye0', '69ye1'];

  try {
    const q2 = query(
      collection(db, "usuarios"),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'activo'),
      where('perfilDeportivo.disponibleHoy', '==', true),
      where('perfilDeportivo.notificacionesRadar', '==', true),
      limit(30)
    );
    const snap2 = await getDocs(q2);
    console.log("Usuarios OK:", snap2.docs.length);
  } catch (e) {
    console.error("Usuarios Error:", e.message);
  }

  try {
    const q3 = query(
      collection(db, "teams"),
      where('geo.prefijos', 'array-contains-any', prefijos),
      limit(30)
    );
    const snap3 = await getDocs(q3);
    console.log("Equipos OK:", snap3.docs.length);
  } catch (e) {
    console.error("Equipos Error:", e.message);
  }
}

run().catch(console.error);
