import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, query, collection, where, limit, getDocs } from "firebase/firestore";
import { appEnv } from "./app/src/core/config";
import { prefijosQueCubren, haversineKm } from "./app/src/core/geo/geohash";

const app = initializeApp({ projectId: "fulbeando-demo" });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function run() {
  const punto = { lat: -34.6037, lng: -58.3816 };
  const radioKm = 10;
  const prefijos = prefijosQueCubren(punto, radioKm, 5);

  try {
    const q1 = query(
      collection(db, "desafios"),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'ABIERTO'),
      limit(20)
    );
    await getDocs(q1);
    console.log("Desafios OK");
  } catch (e) {
    console.error("Desafios Error:", e.message);
  }

  try {
    const q2 = query(
      collection(db, "usuarios"),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'activo'),
      where('perfilDeportivo.disponibleHoy', '==', true),
      where('perfilDeportivo.notificacionesRadar', '==', true),
      limit(30)
    );
    await getDocs(q2);
    console.log("Usuarios OK");
  } catch (e) {
    console.error("Usuarios Error:", e.message);
  }

  try {
    const q3 = query(
      collection(db, "equipos"),
      where('geo.prefijos', 'array-contains-any', prefijos),
      limit(30)
    );
    await getDocs(q3);
    console.log("Equipos OK");
  } catch (e) {
    console.error("Equipos Error:", e.message);
  }
}

run();
