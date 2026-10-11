import * as admin from 'firebase-admin';
import { PROJECT_ID } from './proyecto-emulador';
import { encodeGeohash, prefijosQueCubrenBD } from '../app/src/core/geo/geohash';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: PROJECT_ID });

const auth = admin.auth();
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

const geo = (lat: number, lng: number, radioKm = 5) => ({
  lat: Number(lat.toFixed(4)),
  lng: Number(lng.toFixed(4)),
  prefijo: encodeGeohash(lat, lng, 5),
  prefijos: prefijosQueCubrenBD({ lat, lng }, radioKm),
});

const texto = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Coordenadas base (Obelisco)
const BASE_LAT = -34.6037;
const BASE_LNG = -58.3816;

const getRandomOffset = () => (Math.random() - 0.5) * 0.15; // Aprox 7.5km de radio

async function seedMasivo() {
  try {
    console.log('🌱 Iniciando generacion masiva de 20 jugadores, equipos y 10 canchas...');

    const PERFIL_VACIO = {
      posicion: 'delantero',
      piernaHabil: 'derecha',
      nivel: 'amateur',
      disponibleHoy: true,
      notificacionesRadar: true,
      playerRole: 'FWD',
      stats: { goals: 10, matchesPlayed: 5, mvpCount: 1, fairPlayIndex: 8.0 },
      rating: 7.0,
      teamIds: [],
    };

    // GENERAR 10 DUEÑOS Y 10 PREDIOS
    const duenos = [];
    const predios = [];
    for (let i = 1; i <= 10; i++) {
      const uid = `masivo-dueno-${i}`;
      const email = `dueno${i}@masivo.com`;
      const lat = BASE_LAT + getRandomOffset();
      const lng = BASE_LNG + getRandomOffset();
      
      duenos.push({
        uid,
        email,
        nombre: `Dueño ${i}`,
        apellido: 'Masivo',
        rol: 'dueno_predio',
        telefono: `+54911000000${i.toString().padStart(2, '0')}`
      });

      predios.push({
        id: `masivo-predio-${i}`,
        nombre: `Complejo Masivo ${i}`,
        direccion: `Calle Falsa ${i}00`,
        barrio: 'Centro',
        ciudad: 'Buenos Aires',
        telefono: `+54911000000${i.toString().padStart(2, '0')}`,
        duenoUid: uid,
        verificado: true,
        punto: { lat, lng },
        cobro: { titular: `Complejo ${i}`, alias: `complejo${i}.mp`, cbu: null, montoSena: 5000 },
        canchasResumen: [
          { id: 'c1', nombre: 'Cancha 1', tipo: 'F5', techada: false, precioHora: 10000 },
          { id: 'c2', nombre: 'Cancha 2', tipo: 'F7', techada: true, precioHora: 15000 },
        ]
      });
    }

    // GENERAR 20 JUGADORES Y 5 EQUIPOS (4 jugadores por equipo)
    const jugadores = [];
    const equipos = [];
    let playerCounter = 1;

    for (let e = 1; e <= 5; e++) {
      const teamId = `masivo-team-${e}`;
      const lat = BASE_LAT + getRandomOffset();
      const lng = BASE_LNG + getRandomOffset();
      const teamMembers = [];

      for (let p = 1; p <= 4; p++) {
        const uid = `masivo-player-${playerCounter}`;
        const email = `jugador${playerCounter}@masivo.com`;
        const pLat = lat + (Math.random() - 0.5) * 0.01; // Jugadores cerca del equipo pero no exactos
        const pLng = lng + (Math.random() - 0.5) * 0.01;

        jugadores.push({
          uid,
          email,
          nombre: `Jugador ${playerCounter}`,
          apellido: `Test`,
          zona: 'CABA',
          teamIds: [teamId],
          punto: { lat: pLat, lng: pLng }
        });

        teamMembers.push({
          uid,
          name: `Jugador ${playerCounter} Test`,
          role: p === 1 ? 'CAPITAN' : 'PLAYER',
          dorsal: playerCounter,
          position: p === 1 ? 'FWD' : p === 2 ? 'MID' : p === 3 ? 'DEF' : 'GK'
        });

        playerCounter++;
      }

      equipos.push({
        id: teamId,
        name: `Equipo Masivo ${e}`,
        shieldUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=Team${e}`,
        captainId: teamMembers[0].uid,
        modalidadBase: 'F5',
        stats: { wins: 10, draws: 2, losses: 5 },
        punto: { lat, lng },
        members: teamMembers,
      });
    }

    // EJECUTAR INSERCIONES
    console.log('Insertando dueños y predios...');
    for (const d of duenos) {
      try {
        await auth.createUser({ uid: d.uid, email: d.email, password: 'password123', displayName: d.nombre });
      } catch (e: any) { if (e.code !== 'auth/uid-already-exists') throw e; }
      
      await db.collection('usuarios').doc(d.uid).set({
        uid: d.uid,
        nombre: d.nombre,
        apellido: d.apellido,
        email: d.email,
        telefono: d.telefono,
        rol: d.rol,
        perfilDeportivo: null,
        geo: null,
        estado: 'activo',
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      });
    }

    for (const p of predios) {
      const predioRef = db.collection('predios').doc(p.id);
      await predioRef.set({
        ...p,
        barrioNormalizado: texto(p.barrio),
        geo: geo(p.punto.lat, p.punto.lng),
        fotos: [],
        estado: 'activo',
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
        deletedAt: null,
      });
      
      for (const c of p.canchasResumen) {
        await predioRef.collection('canchas').doc(c.id).set({
          id: c.id,
          predioId: p.id,
          nombre: c.nombre,
          tipo: c.tipo,
          techada: c.techada,
          precioHora: c.precioHora,
          activa: true,
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp,
        });
      }
    }

    console.log('Insertando jugadores y equipos...');
    for (const j of jugadores) {
      try {
        await auth.createUser({ uid: j.uid, email: j.email, password: 'password123', displayName: j.nombre });
      } catch (e: any) { if (e.code !== 'auth/uid-already-exists') throw e; }

      await db.collection('usuarios').doc(j.uid).set({
        uid: j.uid,
        nombre: j.nombre,
        apellido: j.apellido,
        email: j.email,
        rol: 'jugador',
        perfilDeportivo: { ...PERFIL_VACIO, teamIds: j.teamIds },
        geo: geo(j.punto.lat, j.punto.lng, 2),
        zona: j.zona,
        estado: 'activo',
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      });
    }

    for (const e of equipos) {
      await db.collection('teams').doc(e.id).set({
        ...e,
        geo: geo(e.punto.lat, e.punto.lng),
        createdAt: serverTimestamp,
      });
    }

    console.log('✅ SEED MASIVO COMPLETADO.');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

seedMasivo();
