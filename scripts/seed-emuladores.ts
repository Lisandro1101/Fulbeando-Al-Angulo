import * as admin from 'firebase-admin';

// ============================================================================
// SCRIPT DE SEEDING: "AL ÁNGULO" (ZONA SUR)
// ============================================================================
// Este script inicializa los emuladores locales de Firebase (Auth y Firestore)
// con datos realistas para probar el flujo completo de la app.
// 
// Para ejecutarlo:
// 1. Asegurate de tener los emuladores corriendo.
// 2. Ejecutá: npx ts-node scripts/seed-emuladores.ts
// ============================================================================

// Configurar variables de entorno para forzar el uso de los Emuladores Locales
// Estos puertos deben coincidir con tu firebase.json
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

// Inicializar el SDK de Admin
// Al detectar las variables de entorno, apuntará automáticamente a los emuladores.
admin.initializeApp({
  projectId: 'demo-al-angulo' // El Project ID del emulador
});

const auth = admin.auth();
const db = admin.firestore();

// Utilidad para crear Geohashes (simplificado para el seed, puedes usar la librería de geofire-common)
// Guernica aprox: -34.919, -58.384
// Lomas de Zamora aprox: -34.760, -58.402
// Lanús aprox: -34.704, -58.396

async function clearEmulators() {
  console.log('🧹 Limpiando datos previos del emulador...');
  // Nota: Idealmente deberías limpiar Auth y Firestore haciendo un flush por API REST
  // al endpoint de los emuladores (ej. DELETE http://localhost:8080/emulator/v1/projects/demo-al-angulo/databases/(default)/documents)
  // Para este script, asumiremos que se corre con emuladores limpios o sobrescribiremos por ID.
}

async function seedData() {
  try {
    await clearEmulators();
    console.log('🌱 Iniciando carga de datos en Emuladores...\n');

    // ==========================================
    // 1. USUARIOS (Auth + Firestore)
    // ==========================================
    console.log('👤 Creando Usuarios...');
    const usersData = [
      {
        uid: 'user-diego-10',
        email: 'diego@alangulo.com',
        password: 'password123',
        displayName: 'Diego Armando',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
        stats: { goles: 124, partidos: 50, fairPlayScore: 8.5 }
      },
      {
        uid: 'user-lio-10',
        email: 'lio@alangulo.com',
        password: 'password123',
        displayName: 'Lionel Andrés',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lio',
        stats: { goles: 210, partidos: 80, fairPlayScore: 9.8 }
      },
      { uid: 'user-dibu-1', email: 'dibu@alangulo.com', password: 'password123', displayName: 'Dibu Martinez', stats: { goles: 0, partidos: 75, fairPlayScore: 7.0 } },
      { uid: 'user-fideo-11', email: 'fideo@alangulo.com', password: 'password123', displayName: 'Angel Di Maria', stats: { goles: 85, partidos: 90, fairPlayScore: 9.0 } },
      { uid: 'user-cuti-13', email: 'cuti@alangulo.com', password: 'password123', displayName: 'Cuti Romero', stats: { goles: 5, partidos: 60, fairPlayScore: 5.5 } }
    ];

    for (const u of usersData) {
      try {
        // Crear usuario en Auth
        await auth.createUser({
          uid: u.uid,
          email: u.email,
          password: u.password,
          displayName: u.displayName,
          photoURL: u.photoURL
        });
      } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`   - Usuario ${u.uid} ya existe en Auth, omitiendo creación.`);
        } else {
          throw error;
        }
      }

      // Crear documento en Firestore (Perfil de Jugador)
      await db.collection('usuarios').doc(u.uid).set({
        uid: u.uid,
        rol: 'jugador',
        estado: 'activo',
        deletedAt: null,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL || null,
        stats: u.stats,
        position: 'DEL',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✔️  Usuario creado: ${u.displayName}`);
    }

    // ==========================================
    // 2. EQUIPOS (Teams)
    // ==========================================
    console.log('\n🛡️  Creando Equipos...');
    const teamId = 'team-scaloneta-f5';
    const teamData = {
      id: teamId,
      name: 'La Scaloneta F5',
      captainId: 'user-lio-10',
      shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Scaloneta',
      stats: { wins: 45, losses: 5, draws: 10 },
      // Array desnormalizado para acceso rápido (como sugiere NoSQL)
      members: [
        { uid: 'user-lio-10', name: 'Lionel Andrés', role: 'CAPTAIN', position: 'DEL' },
        { uid: 'user-diego-10', name: 'Diego Armando', role: 'PLAYER', position: 'MCO' },
        { uid: 'user-dibu-1', name: 'Dibu Martinez', role: 'PLAYER', position: 'POR' },
        { uid: 'user-fideo-11', name: 'Angel Di Maria', role: 'PLAYER', position: 'EI' },
        { uid: 'user-cuti-13', name: 'Cuti Romero', role: 'PLAYER', position: 'DFC' }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('teams').doc(teamId).set(teamData);
    console.log(`   ✔️  Equipo creado: ${teamData.name} con ${teamData.members.length} jugadores`);

    // ==========================================
    // 3. CANCHAS / COMPLEJOS (Predios)
    // ==========================================
    console.log('\n🏟️  Creando Complejos y Canchas...');
    const venueId = 'venue-lanus-01';
    const venueData = {
      id: venueId,
      name: 'El Templo del Fútbol (Lanús)',
      duenoUid: 'user-dibu-1', // Set owner to a user so rules pass
      verificado: true,
      estado: 'activo',
      deletedAt: null,
      location: {
        address: 'Av. Hipólito Yrigoyen 4500, Lanús',
        lat: -34.7042,
        lng: -58.3965,
        geohash: '69y7q', // Mock geohash (Zona Sur)
      },
      subscription: {
        status: 'ACTIVE',
        plan: 'PREMIUM'
      },
      fields: [
        { id: 'f1', name: 'Cancha 1 (La Bombonerita)', type: 'F5', surface: 'SINTETICO', isRoofed: false },
        { id: 'f2', name: 'Cancha 2 (Techada)', type: 'F7', surface: 'SINTETICO', isRoofed: true }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('predios').doc(venueId).set(venueData);
    console.log(`   ✔️  Complejo creado: ${venueData.name} (${venueData.fields.length} canchas)`);

    // ==========================================
    // 4. DESAFÍOS EN EL RADAR (Challenges)
    // ==========================================
    console.log('\n⚔️  Creando Desafíos en el Radar...');
    const challenges = [
      {
        id: 'challenge-01',
        creatorTeamId: teamId,
        creatorTeamName: 'La Scaloneta F5',
        status: 'open',
        matchType: 'F5',
        venueId: venueId,
        date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)), // Mañana
        location: {
          lat: -34.7042, // En la cancha de Lanús
          lng: -58.3965,
          geohash: '69y7q'
        },
        description: 'Buscamos equipo de F5 para picadito amistoso. Nivel medio/alto.',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'challenge-02',
        creatorTeamId: 'mock-team-2',
        creatorTeamName: 'Los Pibes de Lomas',
        status: 'open',
        matchType: 'F7',
        venueId: null, // A confirmar
        date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 172800000)), // Pasado mañana
        location: {
          lat: -34.7601, // Lomas de Zamora
          lng: -58.4023,
          geohash: '69y7m'
        },
        description: 'Desafío F7 en Lomas de Zamora. Nosotros ponemos la cancha.',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const c of challenges) {
      await db.collection('challenges').doc(c.id).set(c);
      console.log(`   ✔️  Desafío abierto creado: ${c.creatorTeamName} (${c.matchType})`);
    }

    console.log('\n✅ SEED FINALIZADO CON ÉXITO. ¡Listo para jugar! ⚽\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL SEEDING:', error);
    process.exit(1);
  }
}

// Ejecutar script
seedData();
