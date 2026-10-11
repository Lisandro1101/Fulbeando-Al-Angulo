import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, updateDoc } from "firebase/firestore";

const app = initializeApp({ projectId: "fulbeando-demo", apiKey: "fake-api-key" });
const auth = getAuth(app);
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099');

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'jugador5@masivo.com', 'password123');
    console.log('Logged in as', cred.user.uid);
    await updateDoc(doc(db, 'usuarios', cred.user.uid), {
      'perfilDeportivo.posicion': 'medio'
    });
    console.log('Update OK');
  } catch(e: any) {
    console.log('Update Error:', e.message);
  }
}
run();
