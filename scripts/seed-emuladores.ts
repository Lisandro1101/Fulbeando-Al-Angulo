import * as admin from 'firebase-admin'
import { PROJECT_ID } from './proyecto-emulador'

// ============================================================================
// SEED DE EMULADORES (raiz) — "AL ANGULO" + "FULBEANDO", Zona Sur
// ============================================================================
// Corre los emuladores locales de Auth y Firestore con datos FICTICIOS para
// poder desarrollar sin tocar ningun proyecto real.
//
//   1. Levanta los emuladores:  npm run dev:emulators
//   2. Carga los datos:          npm run seed:wait   (lo hace `dev:all` solo)
//
// IMPORTANTE — este archivo escribe el ESQUEMA CANONICO de `app/src/domain`.
// Antes escribia el schema viejo (`status`, `location`, `creatorTeamId`,
// `displayName`) y por eso el mapa no encontraba nada: el codigo busca
// `estado == 'ABIERTO'` + `geo.prefijos`. Si cambias un modelo del dominio,
// actualiza este seed en el mismo commit.
// ============================================================================

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

// Importamos el MISMO codigo de geohash que usa la app, en vez de inventar
// prefijos a mano. `geohash.ts` no tiene imports, asi que tsx lo resuelve bien
// desde aca sin necesitar el alias `@/`.
import { encodeGeohash, prefijosQueCubren } from '../app/src/core/geo/geohash'

// El projectId tiene que ser EXACTAMENTE el que usa el bundle de la app:
// los emuladores guardan los datos en un namespace por proyecto y, si
// difieren, el login falla con `auth/user-not-found` aunque el seed haya
// terminado bien. Ver `scripts/proyecto-emulador.ts`.
admin.initializeApp({ projectId: PROJECT_ID })

const auth = admin.auth()
const db = admin.firestore()
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp()

/** Espejo de `core/geo/index.ts` → `aGeoIndex`. */
const geo = (lat: number, lng: number, radioKm = 5) => ({
  lat: Number(lat.toFixed(4)),
  lng: Number(lng.toFixed(4)),
  prefijo: encodeGeohash(lat, lng, 5),
  prefijos: prefijosQueCubren({ lat, lng }, radioKm, 5),
})

const texto = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Coordenadas de la Zona Sur (datos ficticios).
const LOMAS = { lat: -34.7601, lng: -58.4023 }
const LANUS = { lat: -34.7042, lng: -58.3965 }
const BANFIELD = { lat: -34.782, lng: -58.397 }
const AVELLANEDA = { lat: -34.6959, lng: -58.3634 }

async function seedData() {
  try {
    console.log('🌱 Iniciando carga de datos FICTICIOS en los emuladores...\n')

    // ---------------------------------------------------------------- //
    // 1. USUARIOS — shape canonico de `domain/usuario.ts` (Usuario)
    // ---------------------------------------------------------------- //
    console.log('👤 Creando Usuarios...')

    const PERFIL_VACIO = {
      posicion: null,
      piernaHabil: null,
      nivel: null,
      disponibleHoy: false,
      notificacionesRadar: false,
      playerRole: null,
      stats: { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 5.0 },
      rating: 5.0,
      teamIds: [],
    }

    const usuarios = [
      {
        uid: 'user-lio-10',
        nombre: 'Lionel',
        apellido: 'Andrés',
        email: 'lio@alangulo.com',
        displayName: 'Lionel Andrés',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lio',
        telefono: '+5491122334455',
        zona: 'Lomas de Zamora',
        playerRole: 'FWD' as const,
        posicion: 'delantero' as const,
        stats: { goals: 210, matchesPlayed: 80, mvpCount: 31, fairPlayIndex: 9.8 },
        rating: 9.4,
        teamIds: ['team-scaloneta-f5'],
        disponible: false,
      },
      {
        uid: 'user-diego-10',
        nombre: 'Diego',
        apellido: 'Armando',
        email: 'diego@alangulo.com',
        displayName: 'Diego Armando',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
        telefono: '+5491122334401',
        zona: 'Lanús',
        playerRole: 'MID' as const,
        posicion: 'medio' as const,
        stats: { goals: 124, matchesPlayed: 50, mvpCount: 12, fairPlayIndex: 8.5 },
        rating: 8.8,
        teamIds: ['team-scaloneta-f5'],
        disponible: false,
      },
      {
        uid: 'user-dibu-1',
        nombre: 'Dibu',
        apellido: 'Martinez',
        email: 'dibu@alangulo.com',
        displayName: 'Dibu Martinez',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dibu',
        telefono: '+5491122334402',
        zona: 'Avellaneda',
        playerRole: 'GK' as const,
        posicion: 'arquero' as const,
        stats: { goals: 0, matchesPlayed: 75, mvpCount: 4, fairPlayIndex: 7.0 },
        rating: 7.6,
        teamIds: ['team-scaloneta-f5'],
        // Dueño del predio de abajo: necesario para que las rules lo dejen
        // operar la grilla de turnos.
        dueno: true,
        disponible: false,
      },
      {
        uid: 'user-fideo-11',
        nombre: 'Ángel',
        apellido: 'Di María',
        email: 'fideo@alangulo.com',
        displayName: 'Angel Di Maria',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fideo',
        telefono: '+5491122334403',
        zona: 'Lanús',
        playerRole: 'DEF' as const,
        posicion: 'defensor' as const,
        stats: { goals: 85, matchesPlayed: 90, mvpCount: 18, fairPlayIndex: 9.0 },
        rating: 9.0,
        teamIds: ['team-scaloneta-f5'],
        disponible: false,
      },
      {
        uid: 'user-cuti-13',
        nombre: 'Cristian',
        apellido: 'Romero',
        email: 'cuti@alangulo.com',
        displayName: 'Cuti Romero',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuti',
        telefono: '+5491122334404',
        zona: 'Lomas de Zamora',
        playerRole: 'DEF' as const,
        posicion: 'defensor' as const,
        stats: { goals: 5, matchesPlayed: 60, mvpCount: 9, fairPlayIndex: 5.5 },
        rating: 6.2,
        teamIds: ['team-scaloneta-f5'],
        disponible: false,
      },

      // --- Agentes libres: aparecen en la capa "Jugadores" del mapa ---
      {
        uid: 'user-libre-1',
        nombre: 'Matías',
        apellido: 'El Rústico',
        email: 'rustico@fulbeando.com',
        displayName: 'Matias "El Rústico"',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rustico',
        telefono: '+5491122334411',
        zona: 'Lomas de Zamora',
        playerRole: 'DEF' as const,
        posicion: 'defensor' as const,
        stats: { goals: 5, matchesPlayed: 120, mvpCount: 0, fairPlayIndex: 3.5 },
        rating: 4.1,
        // Es el capitan de "Los Pibes de Lomas": el puente tiene que estar.
        teamIds: ['team-pibes-lomas'],
        disponible: true,
        punto: LOMAS,
      },
      {
        uid: 'user-libre-2',
        nombre: 'Nicolás',
        apellido: 'El Distinto',
        email: 'distinto@fulbeando.com',
        displayName: 'Nico "El Distinto"',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nico',
        telefono: '+5491122334412',
        zona: 'Lanús',
        playerRole: 'MID' as const,
        posicion: 'medio' as const,
        stats: { goals: 22, matchesPlayed: 45, mvpCount: 6, fairPlayIndex: 4.9 },
        rating: 6.8,
        teamIds: ['team-pibes-lomas'],
        disponible: true,
        punto: LANUS,
      },
      {
        uid: 'user-libre-3',
        nombre: 'Joaquín',
        apellido: 'Muralla',
        email: 'muralla@fulbeando.com',
        displayName: 'Juampi "Muralla"',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muralla',
        telefono: '+5491122334413',
        zona: 'Banfield',
        playerRole: 'GK' as const,
        posicion: 'arquero' as const,
        stats: { goals: 1, matchesPlayed: 80, mvpCount: 2, fairPlayIndex: 4.8 },
        rating: 6.5,
        teamIds: [],
        disponible: true,
        punto: BANFIELD,
      },
      // --------------------------------------------------------------- //
      // DUENOS DE PREDIO
      //
      // Hace falta al menos una cuenta `dueno_predio` para poder probar la
      // rama de dueños: `/venue-dashboard` exige ese rol en el guard, asi que
      // sin esto la rama del PRD no se puede abrir ni en local.
      //
      // Antes los predios Apuntaban a `user-libre-2` y `user-libre-3`, que son
      // "jugadores libres" del radar: incoherente, un jugador libre no puede
      // arrendar su propia cancha.
      // --------------------------------------------------------------- //
      {
        uid: 'user-dueno-templo',
        nombre: 'Ramiro',
        apellido: 'Sosa',
        email: 'dueno@fulbeando.com',
        displayName: 'Ramiro (dueño El Templo)',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramiro',
        telefono: '+5491155550001',
        rol: 'dueno_predio' as const,
      },
      {
        uid: 'user-dueno-lomas',
        nombre: 'Valeria',
        apellido: 'Ferreyra',
        email: 'duenolomas@fulbeando.com',
        displayName: 'Vale (dueña Complejo Lomas)',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valeria',
        telefono: '+5491155550002',
        rol: 'dueno_predio' as const,
      },
      {
        uid: 'user-dueno-banfield',
        nombre: 'Nestor',
        apellido: 'Pereira',
        email: 'duenobanfield@fulbeando.com',
        displayName: 'Néstor (dueño Club Banfield)',
        fotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nestor',
        telefono: '+5491155550003',
        rol: 'dueno_predio' as const,
      },
    ]

    for (const u of usuarios) {
      try {
        await auth.createUser({
          uid: u.uid,
          email: u.email,
          password: 'password123',
          displayName: u.displayName,
          photoURL: u.fotoUrl,
        })
      } catch (error: any) {
        if (error.code !== 'auth/uid-already-exists') throw error
      }

      // Un dueno no tiene perfil deportivo: las dos ramas del PRD son
    // excluyentes, y ademas `undefined` es un valor que Firestore rechaza.
    const esDueño = u.rol === 'dueno_predio'

    await db.collection('usuarios').doc(u.uid).set({
      uid: u.uid,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono,
      whatsappVerificado: false,
      rol: u.rol ?? 'jugador',
      perfilDeportivo: esDueño
        ? null
        : {
            ...PERFIL_VACIO,
            posicion: u.posicion ?? null,
            playerRole: u.playerRole ?? null,
            disponibleHoy: u.disponible ?? false,
            notificacionesRadar: u.disponible ?? false,
            stats: u.stats ?? PERFIL_VACIO.stats,
            rating: u.rating ?? 5,
            teamIds: u.teamIds ?? [],
          },
      geo: u.punto ? geo(u.punto.lat, u.punto.lng, 2) : null,
      zona: u.zona ?? null,
      fotoUrl: u.fotoUrl ?? null,
      estado: 'activo',
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
      deletedAt: null,
    })
    console.log(`   ✔️  ${u.displayName}${u.disponible ? '  (🔥 disponible)' : ''}${esDueño ? '  🏟️ dueño' : ''}`)
    }

    // ---------------------------------------------------------------- //
    // 2. EQUIPOS — shape canonico de `domain/equipo.ts` (Equipo)
    // ---------------------------------------------------------------- //
    console.log('\n🛡️  Creando Equipos...')

    const equipos = [
      {
        id: 'team-scaloneta-f5',
        name: 'La Scaloneta F5',
        shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Scaloneta',
        captainId: 'user-lio-10',
        modalidadBase: 'F5',
        stats: { wins: 45, draws: 10, losses: 5 },
        punto: LANUS,
        members: [
          { uid: 'user-lio-10', name: 'Lionel Andrés', role: 'CAPTAIN' as const, dorsal: 10, position: 'FWD' as const },
          { uid: 'user-diego-10', name: 'Diego Armando', role: 'PLAYER' as const, dorsal: 5, position: 'MID' as const },
          { uid: 'user-dibu-1', name: 'Dibu Martinez', role: 'PLAYER' as const, dorsal: 1, position: 'GK' as const },
          { uid: 'user-fideo-11', name: 'Angel Di Maria', role: 'PLAYER' as const, dorsal: 7, position: 'DEF' as const },
          { uid: 'user-cuti-13', name: 'Cuti Romero', role: 'PLAYER' as const, dorsal: 4, position: 'DEF' as const },
        ],
      },
      {
        id: 'team-pibes-lomas',
        name: 'Los Pibes de Lomas',
        shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Pibes',
        captainId: 'user-libre-1',
        modalidadBase: 'F7',
        stats: { wins: 12, draws: 4, losses: 9 },
        punto: LOMAS,
        members: [
          { uid: 'user-libre-1', name: 'Matías El Rústico', role: 'CAPTAIN' as const, dorsal: 2, position: 'DEF' as const },
          { uid: 'user-libre-2', name: 'Nicolás El Distinto', role: 'PLAYER' as const, dorsal: 8, position: 'MID' as const },
        ],
      },
    ]

    for (const e of equipos) {
      await db.collection('teams').doc(e.id).set({
        id: e.id,
        name: e.name,
        shieldUrl: e.shieldUrl,
        captainId: e.captainId,
        modalidadBase: e.modalidadBase,
        members: e.members,
        stats: e.stats,
        geo: e.punto ? geo(e.punto.lat, e.punto.lng) : null,
        createdAt: serverTimestamp,
      })
      console.log(`   ✔️  ${e.name} — ${e.members.length} jugadores`)
    }

    // ---------------------------------------------------------------- //
    // 3. PREDIOS — shape canonico de `domain/predio.ts` (Predio)
    // ---------------------------------------------------------------- //
    console.log('\n🏟️  Creando Predios...')

    const predios = [
      {
        id: 'predio-lanus-01',
        nombre: 'El Templo del Fútbol',
        direccion: 'Av. Hipólito Yrigoyen 4500',
        barrio: 'Lanús',
        ciudad: 'Buenos Aires',
telefono: '+5491122334402',
    duenoUid: 'user-dueno-templo',
        verificado: true,
        punto: LANUS,
        cobro: { titular: 'El Templo SA', alias: 'eltemplo.futbol', cbu: '2850590940090418135201', montoSena: 12000 },
        canchasResumen: [
          { id: 'cancha-1', nombre: 'La Bombonerita', tipo: 'F5' as const, techada: false, precioHora: 8000 },
          { id: 'cancha-2', nombre: 'La Techada', tipo: 'F7' as const, techada: true, precioHora: 11000 },
        ],
      },
      {
        id: 'predio-lomas-02',
        nombre: 'Complejo Lomas',
        direccion: 'Av. Argentina 1200',
        barrio: 'Lomas de Zamora',
        ciudad: 'Buenos Aires',
telefono: '+5491122334421',
    duenoUid: 'user-dueno-lomas',
        verificado: true,
        punto: LOMAS,
        cobro: { titular: 'Lomas Sport', alias: 'lomas.sport', cbu: '2850590940090418135202', montoSena: 10000 },
        canchasResumen: [
          { id: 'cancha-1', nombre: 'Cancha 1', tipo: 'F5' as const, techada: false, precioHora: 7500 },
        ],
      },
      {
        id: 'predio-banfield-03',
        nombre: 'Club Banfield Futbol 5',
        direccion: 'Av. Monte 120',
        barrio: 'Banfield',
        ciudad: 'Buenos Aires',
telefono: '+5491122334422',
    duenoUid: 'user-dueno-banfield',
        verificado: false, // A proposito: sirve para probar el filtro de publicos.
        punto: BANFIELD,
        cobro: { titular: 'Club Banfield', alias: 'banfield.f5', cbu: null, montoSena: 9000 },
        canchasResumen: [
          { id: 'cancha-1', nombre: 'Cancha techada', tipo: 'F7' as const, techada: true, precioHora: 9500 },
        ],
      },
    ]

    for (const p of predios) {
      await db.collection('predios').doc(p.id).set({
        id: p.id,
        nombre: p.nombre,
        direccion: p.direccion,
        barrio: p.barrio,
        barrioNormalizado: texto(p.barrio),
        ciudad: p.ciudad,
        geo: geo(p.punto.lat, p.punto.lng),
        telefono: p.telefono,
        fotos: [],
        cobro: p.cobro,
        duenoUid: p.duenoUid,
        canchasResumen: p.canchasResumen,
        verificado: p.verificado,
        estado: 'activo',
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
        deletedAt: null,
      })
      console.log(`   ✔️  ${p.nombre} (${p.barrio}) — ${p.canchasResumen.length} canchas${p.verificado ? '' : ' · sin verificar'}`)
    }

    // ---------------------------------------------------------------- //
    // 4. DESAFIOS — shape canonico de `domain/desafio.ts` (Desafio)
    // ---------------------------------------------------------------- //
    // La query del mapa es:
    //   where('geo.prefijos', 'array-contains-any', ...) && where('estado','==','ABIERTO')
    console.log('\n⚔️  Creando Desafíos...')

    const manana = Date.now() + 86_400_000
    const pasado = Date.now() + 172_800_000

    const desafios = [
      {
        id: 'desafio-01',
        creatorId: 'user-lio-10',
        equipoId: 'team-scaloneta-f5',
        equipoNombre: 'La Scaloneta F5',
        equipoEscudoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Scaloneta',
        modalidad: 'F5' as const,
        estadoCancha: 'CON_CANCHA' as const,
        estado: 'ABIERTO' as const,
        turnoId: null,
        predioId: 'predio-lanus-01',
        posicionBuscada: 'arquero' as const,
        fechaUnix: manana,
        descripcion: 'Buscamos arquero para partido amistoso. Nivel medio/alto.',
        punto: LANUS,
        equiposAceptantes: [],
      },
      {
        id: 'desafio-02',
        creatorId: 'user-libre-1',
        equipoId: 'team-pibes-lomas',
        equipoNombre: 'Los Pibes de Lomas',
        equipoEscudoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Pibes',
        modalidad: 'F7' as const,
        estadoCancha: 'BUSCA_CANCHA' as const,
        estado: 'ABIERTO' as const,
        turnoId: null,
        predioId: null,
        posicionBuscada: null,
        fechaUnix: pasado,
        descripcion: 'F7 en Lomas de Zamora. Nosotros ponemos la cancha, traé un defensor.',
        punto: LOMAS,
        equiposAceptantes: [],
      },
    ]

    for (const d of desafios) {
      await db.collection('challenges').doc(d.id).set({
        id: d.id,
        creatorId: d.creatorId,
        equipoId: d.equipoId,
        equipoNombre: d.equipoNombre,
        equipoEscudoUrl: d.equipoEscudoUrl,
        modalidad: d.modalidad,
        estadoCancha: d.estadoCancha,
        estado: d.estado,
        turnoId: d.turnoId,
        predioId: d.predioId,
        posicionBuscada: d.posicionBuscada,
        fechaUnix: d.fechaUnix,
        descripcion: d.descripcion,
        geo: geo(d.punto.lat, d.punto.lng),
        equiposAceptantes: d.equiposAceptantes,
        createdAt: Date.now(),
      })
      console.log(`   ✔️  ${d.equipoNombre} busca rival ${d.modalidad}`)
    }

    console.log('\n✅ SEED OK. Todos los datos son ficticios (Zona Sur).\n')
    console.log('   Cuentas (password: password123):')
    for (const u of usuarios) console.log(`     ${u.email.padEnd(26)} ${u.nombre} ${u.apellido}`)
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL SEEDING:', error)
    process.exit(1)
  }
}

seedData()