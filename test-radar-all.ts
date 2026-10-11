import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, collection, getDocs, limit } from "firebase/firestore";

const app = initializeApp({ projectId: "demo-fulbeando" });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function run() {
  try {
    const q1 = collection(db, "desafios");
    const snap1 = await getDocs(q1);
    console.log("Desafios total:", snap1.docs.length);
  } catch (e) {
    console.error("Desafios Error:", e.message);
  }

  try {
    const q2 = collection(db, "usuarios");
    const snap2 = await getDocs(q2);
    console.log("Usuarios total:", snap2.docs.length);
  } catch (e) {
    console.error("Usuarios Error:", e.message);
  }

  try {
    const q3 = collection(db, "equipos");
    const snap3 = await getDocs(q3);
    console.log("Equipos total:", snap3.docs.length);
  } catch (e) {
    console.error("Equipos Error:", e.message);
  }
}

run();
