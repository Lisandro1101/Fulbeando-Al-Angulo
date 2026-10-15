/**
 * DATOS DE PRUEBA — "AL ÁNGULO / FULBEANDO" (Zona Sur)
 * ============================================================================
 * Dataset FICTICIO, grande y variado, pensado para cargarse en los emuladores
 * de Firebase. Es la ÚNICA fuente de verdad: `scripts/generar-xlsx.ts` lo
 * vuelca a `datos-prueba.xlsx` y ese Excel es el que se importa (con el script
 * Admin SDK o desde el panel superadmin).
 *
 * Convenciones de las hojas (el parser espera estos textos):
 *   - booleanos  -> "SI" / "NO"
 *   - listas     -> separadas por "," (ej. teamIds, diasBase)
 *   - franjas    -> separadas por "|" y cada una "HH:mm-HH:mm"
 *   - roles de equipo -> CAPITAN | PLAYER | DT
 *   - posiciones -> arquero | defensor | medio | delantero
 *   - playerRole -> GK | DEF | MID | FWD | DT
 *
 * Nada de acá toca producción: el projectId del emulador empieza con `demo-`
 * (ver scripts/proyecto-emulador.ts).
 */

// ============================================================================
// Tipos de fila (contrato con el Excel)
// ============================================================================

export interface UsuarioFila {
  uid: string
  nombre: string
  apellido: string
  email: string
  password: string
  rol: 'invitado' | 'jugador' | 'dueno_predio' | 'superadmin'
  telefono: string
  fechaNacimiento: string
  zona: string
  municipio: string
  fotoUrl: string
  planDueno: '' | 'pendiente' | 'activo'
  disponibleHoy: boolean
  notificacionesRadar: boolean
  posicion: '' | 'arquero' | 'defensor' | 'medio' | 'delantero'
  playerRole: '' | 'GK' | 'DEF' | 'MID' | 'FWD' | 'DT'
  piernaHabil: '' | 'diestro' | 'zurdo'
  nivel: number | null
  rating: number
  goles: number
  asistencias: number
  partidosJugados: number
  mvpCount: number
  fairPlayIndex: number
  teamIds: string[]
  lat: number | null
  lng: number | null
}

export interface SolicitudFila {
  uid: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  nombrePredio: string
  ciudad: string
  barrio: string
  tipoCancha: 'F5' | 'F7' | 'F8' | 'F11'
  cantidadCanchas: number
  mensaje: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  motivoRechazo: string
}

export interface PredioFila {
  id: string
  nombre: string
  direccion: string
  barrio: string
  ciudad: string
  telefono: string
  duenoUid: string
  lat: number
  lng: number
  verificado: boolean
  tipoSena: 'fijo' | 'porcentaje'
  montoSena: number
  porcentajeSena: number
  cobroTitular: string
  cobroAlias: string
  cobroCbu: string
  franjasBase: string
  diasBase: string
}

export interface CanchaFila {
  predioId: string
  canchaId: string
  nombre: string
  tipo: 'F5' | 'F7' | 'F8' | 'F11'
  techada: boolean
  precioHora: number
  activa: boolean
}

export interface EquipoFila {
  id: string
  name: string
  shieldUrl: string
  captainUid: string
  modalidadBase: 'F5' | 'F7' | 'F8' | 'F11'
  genero: 'Masculino' | 'Femenino' | 'Mixto'
  lat: number
  lng: number
  wins: number
  draws: number
  losses: number
}

export interface MiembroEquipoFila {
  equipoId: string
  uid: string
  name: string
  role: 'CAPITAN' | 'PLAYER' | 'DT'
  dorsal: number | null
  position: '' | 'GK' | 'DEF' | 'MID' | 'FWD'
}

export interface DesafioFila {
  id: string
  creatorUid: string
  equipoId: string
  equipoNombre: string
  equipoEscudoUrl: string
  modalidad: 'F5' | 'F7' | 'F8' | 'F11'
  estadoCancha: 'CON_CANCHA' | 'BUSCA_CANCHA'
  estado: 'ABIERTO' | 'ACEPTADO' | 'CANCELADO' | 'FINALIZADO'
  turnoId: string
  predioId: string
  posicionBuscada: '' | 'arquero' | 'defensor' | 'medio' | 'delantero'
  fechaISO: string
  descripcion: string
  lat: number
  lng: number
}

export interface PartidoFila {
  id: string
  organizadorUid: string
  nombre: string
  predioId: string
  canchaId: string
  barrio: string
  fecha: string
  hora: string
  modalidad: 'F5' | 'F7' | 'F8' | 'F11'
  cuposDisponibles: number
  posicionBuscada: '' | 'arquero' | 'defensor' | 'medio' | 'delantero'
  estado: 'abierto' | 'cerrado' | 'finalizado'
  lat: number
  lng: number
}

export interface PostulacionFila {
  partidoId: string
  jugadorUid: string
  nombre: string
  posicion: string
  telefono: string
  fotoUrl: string
  mensaje: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
}

export interface ReporteFila {
  id: string
  reportanteUid: string
  usuarioReportadoUid: string
  categoria: 'abuso' | 'datos_falsos' | 'no_show' | 'otro'
  motivo: string
  estado: 'abierto' | 'resuelto' | 'descartado'
}

// ============================================================================
// Helpers puros (deterministas, sin dependencias)
// ============================================================================

/** Reparte un punto al azar (pero reproducible) alrededor de una base. */
function scatter(lat: number, lng: number, seed: number, maxMetros = 700): { lat: number; lng: number } {
  const r = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1
  const a = ((Math.sin(seed * 78.233) * 12345.6789) % 1 + 1) % 1
  const dist = (0.2 + r * 0.8) * maxMetros
  const ang = a * Math.PI * 2
  const dLat = (Math.cos(ang) * dist) / 111_320
  const dLng = (Math.sin(ang) * dist) / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { lat: Number((lat + dLat).toFixed(4)), lng: Number((lng + dLng).toFixed(4)) }
}

/** Centroides aproximados de la Zona Sur (datos ficticios pero verosímiles). */
const BARRIOS: Record<string, { municipio: string; lat: number; lng: number }> = {
  'Lomas de Zamora': { municipio: 'Lomas de Zamora', lat: -34.7601, lng: -58.4023 },
  Banfield: { municipio: 'Lomas de Zamora', lat: -34.7447, lng: -58.3965 },
  Temperley: { municipio: 'Lomas de Zamora', lat: -34.7712, lng: -58.4032 },
  Turdera: { municipio: 'Lomas de Zamora', lat: -34.79, lng: -58.41 },
  Llavallol: { municipio: 'Lomas de Zamora', lat: -34.793, lng: -58.426 },
  Adrogué: { municipio: 'Almirante Brown', lat: -34.8, lng: -58.396 },
  Burzaco: { municipio: 'Almirante Brown', lat: -34.828, lng: -58.395 },
  Longchamps: { municipio: 'Almirante Brown', lat: -34.856, lng: -58.389 },
  'Lanús Este': { municipio: 'Lanús', lat: -34.706, lng: -58.376 },
  'Lanús Oeste': { municipio: 'Lanús', lat: -34.7042, lng: -58.3965 },
  'Remedios de Escalada': { municipio: 'Lanús', lat: -34.722, lng: -58.399 },
  'Valentín Alsina': { municipio: 'Lanús', lat: -34.672, lng: -58.399 },
  'Avellaneda Centro': { municipio: 'Avellaneda', lat: -34.662, lng: -58.366 },
  Sarandí: { municipio: 'Avellaneda', lat: -34.68, lng: -58.343 },
  Wilde: { municipio: 'Avellaneda', lat: -34.698, lng: -58.316 },
  Bernal: { municipio: 'Quilmes', lat: -34.708, lng: -58.281 },
  'Monte Grande': { municipio: 'Esteban Echeverría', lat: -34.815, lng: -58.466 },
}

const foto = (seed: string): string =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`

// ============================================================================
// 1) USUARIOS — 1 superadmin + 3 dueños + 30 jugadores
// ============================================================================

// [nombre, apellido, barrio, pos, pierna, nivel, disponible, [goles, asist, partidos, mvp, fairPlay], rating]
type JugadorEsp = [string, string, string, 'ARQ' | 'DEF' | 'MED' | 'DEL', 'diestro' | 'zurdo', 1 | 2 | 3 | 4 | 5, boolean, [number, number, number, number, number], number]

const ESPECIALIDADES: JugadorEsp[] = [
  ['Lautaro', 'Vega', 'Lomas de Zamora', 'DEL', 'diestro', 5, true, [210, 40, 80, 31, 9.8], 9.4],
  ['Julián', 'Costa', 'Lanús Oeste', 'MED', 'diestro', 4, true, [124, 88, 50, 12, 8.5], 8.8],
  ['Emiliano', 'Ferro', 'Avellaneda Centro', 'ARQ', 'diestro', 4, false, [0, 2, 75, 4, 7.0], 7.6],
  ['Ángel', 'Quiroga', 'Lanús Este', 'DEF', 'zurdo', 4, false, [12, 30, 90, 18, 9.0], 9.0],
  ['Cristian', 'Sosa', 'Lomas de Zamora', 'DEF', 'diestro', 3, false, [5, 8, 60, 9, 5.5], 6.2],
  ['Matías', 'Rueda', 'Lomas de Zamora', 'DEF', 'diestro', 2, true, [5, 4, 120, 0, 3.5], 4.1],
  ['Nicolás', 'Pérez', 'Lanús Oeste', 'MED', 'zurdo', 3, true, [22, 19, 45, 6, 4.9], 6.8],
  ['Joaquín', 'Molina', 'Banfield', 'ARQ', 'diestro', 3, true, [1, 1, 80, 2, 4.8], 6.5],
  ['Franco', 'Albarracín', 'Temperley', 'DEL', 'diestro', 4, true, [58, 22, 40, 9, 7.7], 8.1],
  ['Rodrigo', 'Ibarra', 'Turdera', 'MED', 'diestro', 3, false, [17, 25, 33, 4, 6.1], 6.6],
  ['Santiago', 'Bustos', 'Llavallol', 'DEL', 'zurdo', 2, true, [30, 9, 28, 3, 5.0], 6.0],
  ['Kevin', 'Ríos', 'Adrogué', 'DEF', 'diestro', 3, true, [3, 6, 52, 5, 5.9], 6.3],
  ['Braian', 'Medina', 'Burzaco', 'MED', 'diestro', 2, false, [9, 12, 26, 2, 4.4], 5.4],
  ['Leonel', 'Cáceres', 'Longchamps', 'ARQ', 'diestro', 2, true, [0, 0, 30, 1, 6.0], 6.1],
  ['Emanuel', 'Godoy', 'Lanús Este', 'DEL', 'diestro', 4, true, [71, 15, 48, 11, 7.2], 7.9],
  ['Facundo', 'Ledesma', 'Remedios de Escalada', 'DEF', 'zurdo', 3, false, [4, 14, 44, 6, 6.5], 6.7],
  ['Gonzalo', 'Vera', 'Valentín Alsina', 'MED', 'diestro', 5, true, [40, 60, 70, 20, 9.1], 9.1],
  ['Tomás', 'Cardozo', 'Sarandí', 'DEL', 'zurdo', 3, true, [33, 11, 37, 5, 5.8], 6.9],
  ['Bruno', 'Figueroa', 'Wilde', 'DEF', 'diestro', 2, false, [2, 3, 22, 0, 4.1], 5.2],
  ['Ariel', 'Ortega', 'Bernal', 'MED', 'diestro', 3, true, [14, 20, 41, 4, 6.3], 6.8],
  ['Pablo', 'Márquez', 'Monte Grande', 'DEL', 'diestro', 4, true, [49, 18, 39, 8, 7.0], 7.7],
  ['Diego', 'Rojas', 'Lomas de Zamora', 'ARQ', 'diestro', 5, false, [0, 5, 110, 12, 8.8], 8.9],
  ['Alan', 'Silva', 'Banfield', 'MED', 'zurdo', 2, true, [7, 16, 24, 1, 4.9], 5.6],
  ['Maximiliano', 'Aguirre', 'Temperley', 'DEF', 'diestro', 4, false, [6, 20, 66, 10, 7.4], 7.8],
  ['Brian', 'Montero', 'Adrogué', 'DEL', 'diestro', 3, true, [28, 7, 31, 4, 5.5], 6.4],
  ['Hernán', 'Coronel', 'Lanús Oeste', 'MED', 'diestro', 1, true, [3, 5, 12, 0, 6.2], 5.1],
  ['Marco', 'Peralta', 'Avellaneda Centro', 'DEF', 'zurdo', 4, true, [8, 22, 58, 7, 7.1], 7.5],
  ['Sergio', 'Lucero', 'Wilde', 'DEL', 'diestro', 5, false, [88, 26, 62, 16, 8.3], 8.7],
  ['Axel', 'Domínguez', 'Burzaco', 'ARQ', 'diestro', 1, true, [0, 0, 9, 0, 5.5], 5.0],
  ['Ulises', 'Benegas', 'Lomas de Zamora', 'MED', 'zurdo', 3, true, [19, 27, 35, 5, 6.0], 6.6],
]

const POS_MAP: Record<JugadorEsp[3], { posicion: UsuarioFila['posicion']; playerRole: UsuarioFila['playerRole'] }> = {
  ARQ: { posicion: 'arquero', playerRole: 'GK' },
  DEF: { posicion: 'defensor', playerRole: 'DEF' },
  MED: { posicion: 'medio', playerRole: 'MID' },
  DEL: { posicion: 'delantero', playerRole: 'FWD' },
}

function construirUsuarios(): UsuarioFila[] {
  const filas: UsuarioFila[] = []

  filas.push({
    uid: 'user-super-1',
    nombre: 'Admin',
    apellido: 'Fulbeando',
    email: 'superadmin@fulbeando.com',
    password: 'password123',
    rol: 'superadmin',
    telefono: '+5491100000000',
    fechaNacimiento: '1990-01-15',
    zona: 'Lomas de Zamora',
    municipio: 'Lomas de Zamora',
    fotoUrl: foto('Superadmin'),
    planDueno: '',
    disponibleHoy: false,
    notificacionesRadar: false,
    posicion: '',
    playerRole: '',
    piernaHabil: '',
    nivel: null,
    rating: 5,
    goles: 0,
    asistencias: 0,
    partidosJugados: 0,
    mvpCount: 0,
    fairPlayIndex: 100,
    teamIds: [],
    lat: null,
    lng: null,
  })

  // Dueños: 2 activos (uno de ellos con 2 predios) y 1 pendiente (solo solicitud).
  const duenos: Array<Partial<UsuarioFila> & { uid: string; nombre: string; apellido: string; email: string; zona: string; plan: '' | 'pendiente' | 'activo' }> = [
    { uid: 'user-dueno-01', nombre: 'Ramiro', apellido: 'Sosa', email: 'dueno.templo@fulbeando.com', zona: 'Lanús Oeste', plan: 'activo' },
    { uid: 'user-dueno-02', nombre: 'Valeria', apellido: 'Ferreyra', email: 'dueno.lomas@fulbeando.com', zona: 'Lomas de Zamora', plan: 'activo' },
    { uid: 'user-dueno-03', nombre: 'Néstor', apellido: 'Pereira', email: 'dueno.pendiente@fulbeando.com', zona: 'Banfield', plan: 'pendiente' },
  ]
  duenos.forEach((d, i) => {
    const base = BARRIOS[d.zona] ?? BARRIOS['Lanús Oeste']
    const p = scatter(base.lat, base.lng, 900 + i)
    filas.push({
      uid: d.uid,
      nombre: d.nombre,
      apellido: d.apellido,
      email: d.email,
      password: 'password123',
      rol: 'dueno_predio',
      telefono: `+54911555500${String(i + 1).padStart(2, '0')}`,
      fechaNacimiento: `198${i}-0${i + 2}-1${i}`,
      zona: d.zona,
      municipio: base.municipio,
      fotoUrl: foto(d.nombre),
      planDueno: d.plan,
      disponibleHoy: false,
      notificacionesRadar: false,
      posicion: '',
      playerRole: '',
      piernaHabil: '',
      nivel: null,
      rating: 5,
      goles: 0,
      asistencias: 0,
      partidosJugados: 0,
      mvpCount: 0,
      fairPlayIndex: 100,
      teamIds: [],
      lat: p.lat,
      lng: p.lng,
    })
  })

  ESPECIALIDADES.forEach((esp, i) => {
    const [nombre, apellido, barrio, pos, pierna, nivel, disp, stats, rating] = esp
    const base = BARRIOS[barrio] ?? BARRIOS['Lomas de Zamora']
    const p = scatter(base.lat, base.lng, i + 1)
    const rolData = POS_MAP[pos]
    filas.push({
      uid: `user-jug-${String(i + 1).padStart(2, '0')}`,
      nombre,
      apellido,
      email: `jug${String(i + 1).padStart(2, '0')}@fulbeando.com`,
      password: 'password123',
      rol: 'jugador',
      telefono: `+549112233${String(4400 + i).padStart(4, '0')}`,
      fechaNacimiento: `${1988 + (i % 12)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      zona: barrio,
      municipio: base.municipio,
      fotoUrl: foto(`${nombre}${apellido}`),
      planDueno: '',
      disponibleHoy: disp,
      notificacionesRadar: disp,
      posicion: rolData.posicion,
      playerRole: rolData.playerRole,
      piernaHabil: pierna,
      nivel,
      rating,
      goles: stats[0],
      asistencias: stats[1],
      partidosJugados: stats[2],
      mvpCount: stats[3],
      fairPlayIndex: stats[4],
      teamIds: [],
      lat: p.lat,
      lng: p.lng,
    })
  })

  return filas
}

export const USUARIOS: UsuarioFila[] = construirUsuarios()

// ============================================================================
// 2) SOLICITUDES — una pendiente (dueño 03) y una rechazada (para variar)
// ============================================================================

export const SOLICITUDES: SolicitudFila[] = [
  {
    uid: 'user-dueno-03',
    nombre: 'Néstor',
    apellido: 'Pereira',
    telefono: '+5491155550003',
    email: 'dueno.pendiente@fulbeando.com',
    nombrePredio: 'Club Banfield Fútbol 5',
    ciudad: 'Buenos Aires',
    barrio: 'Banfield',
    tipoCancha: 'F7',
    cantidadCanchas: 2,
    mensaje: 'Tengo 2 canchas de F7 techadas y quiero sumarme al radar.',
    estado: 'pendiente',
    motivoRechazo: '',
  },
  {
    uid: 'user-jug-13',
    nombre: 'Braian',
    apellido: 'Medina',
    telefono: '+5491122334413',
    email: 'jug13@fulbeando.com',
    nombrePredio: 'Predio La Cascada',
    ciudad: 'Buenos Aires',
    barrio: 'Burzaco',
    tipoCancha: 'F5',
    cantidadCanchas: 1,
    mensaje: 'Tengo una cancha de F5 sin techito.',
    estado: 'rechazada',
    motivoRechazo: 'Datos del predio incompletos. Volvé a enviarla con la dirección exacta.',
  },
]

// ============================================================================
// 3) PREDIOS — 10, con variantes de cobro, verificación y horarios
// ============================================================================

export const PREDIOS: PredioFila[] = [
  { id: 'predio-01', nombre: 'El Templo del Fútbol', direccion: 'Av. Hipólito Yrigoyen 4500', barrio: 'Lanús Oeste', ciudad: 'Buenos Aires', telefono: '+5491122334401', duenoUid: 'user-dueno-01', ...BARRIOS['Lanús Oeste'], verificado: true, tipoSena: 'fijo', montoSena: 4000, porcentajeSena: 0, cobroTitular: 'El Templo SA', cobroAlias: 'eltemplo.futbol', cobroCbu: '2850590940090418135201', franjasBase: '18:00-19:00|19:00-20:00|20:00-21:00', diasBase: '1,2,3,4,5' },
  { id: 'predio-02', nombre: 'El Templo Anexo', direccion: 'Av. Hipólito Yrigoyen 4520', barrio: 'Lanús Oeste', ciudad: 'Buenos Aires', telefono: '+5491122334401', duenoUid: 'user-dueno-01', ...BARRIOS['Lanús Oeste'], verificado: true, tipoSena: 'porcentaje', montoSena: 0, porcentajeSena: 50, cobroTitular: 'El Templo SA', cobroAlias: 'eltemplo.anexo', cobroCbu: '', franjasBase: '20:00-21:00|21:00-22:00|22:00-23:00', diasBase: '3,4,5,6,7' },
  { id: 'predio-03', nombre: 'Complejo Lomas', direccion: 'Av. Argentina 1200', barrio: 'Lomas de Zamora', ciudad: 'Buenos Aires', telefono: '+5491122334421', duenoUid: 'user-dueno-02', ...BARRIOS['Lomas de Zamora'], verificado: true, tipoSena: 'fijo', montoSena: 3500, porcentajeSena: 0, cobroTitular: 'Lomas Sport', cobroAlias: 'lomas.sport', cobroCbu: '2850590940090418135202', franjasBase: '09:00-10:00|10:00-11:00|18:00-19:00', diasBase: '1,2,3,4,5,6', },
  { id: 'predio-04', nombre: 'La Bombonera de Banfield', direccion: 'Av. Alsina 850', barrio: 'Banfield', ciudad: 'Buenos Aires', telefono: '+5491122334422', duenoUid: 'user-dueno-02', ...BARRIOS['Banfield'], verificado: false, tipoSena: 'porcentaje', montoSena: 0, porcentajeSena: 30, cobroTitular: 'Banfield Club', cobroAlias: 'banfield.club', cobroCbu: '', franjasBase: '19:00-20:00|20:00-21:00', diasBase: '1,3,5' },
  { id: 'predio-05', nombre: 'Temperley Indoor', direccion: 'Av. Eva Perón 2100', barrio: 'Temperley', ciudad: 'Buenos Aires', telefono: '+5491122334423', duenoUid: 'user-dueno-01', ...BARRIOS['Temperley'], verificado: true, tipoSena: 'fijo', montoSena: 5000, porcentajeSena: 0, cobroTitular: 'Indoor Temperley', cobroAlias: 'temperley.indoor', cobroCbu: '2850590940090418135203', franjasBase: '17:00-18:00|18:00-19:00|19:00-20:00|20:00-21:00', diasBase: '2,4,6' },
  { id: 'predio-06', nombre: 'Avellaneda Fútbol Park', direccion: 'Av. Mitre 300', barrio: 'Avellaneda Centro', ciudad: 'Buenos Aires', telefono: '+5491122334424', duenoUid: 'user-dueno-02', ...BARRIOS['Avellaneda Centro'], verificado: true, tipoSena: 'porcentaje', montoSena: 0, porcentajeSena: 100, cobroTitular: 'Avellaneda Park', cobroAlias: 'avellaneda.park', cobroCbu: '2850590940090418135204', franjasBase: '08:00-09:00|09:00-10:00', diasBase: '6,7' },
  { id: 'predio-07', nombre: 'Quilmes Arena', direccion: 'Av. Calchaquí 1500', barrio: 'Bernal', ciudad: 'Buenos Aires', telefono: '+5491122334425', duenoUid: 'user-dueno-01', ...BARRIOS['Bernal'], verificado: true, tipoSena: 'fijo', montoSena: 4500, porcentajeSena: 0, cobroTitular: 'Quilmes Arena', cobroAlias: 'quilmes.arena', cobroCbu: '', franjasBase: '20:00-21:00|21:00-22:00', diasBase: '1,2,3,4,5,6,7' },
  { id: 'predio-08', nombre: 'Estadio Adrogué', direccion: 'Av. Espora 700', barrio: 'Adrogué', ciudad: 'Buenos Aires', telefono: '+5491122334426', duenoUid: 'user-dueno-02', ...BARRIOS['Adrogué'], verificado: false, tipoSena: 'fijo', montoSena: 3000, porcentajeSena: 0, cobroTitular: 'Adrogué Fútbol', cobroAlias: 'adrogue.futbol', cobroCbu: '', franjasBase: '18:00-19:00|19:00-20:00', diasBase: '3,5,7' },
  { id: 'predio-09', nombre: 'Wilde Sport Center', direccion: 'Av. Las Flores 1200', barrio: 'Wilde', ciudad: 'Buenos Aires', telefono: '+5491122334427', duenoUid: 'user-dueno-01', ...BARRIOS['Wilde'], verificado: true, tipoSena: 'porcentaje', montoSena: 0, porcentajeSena: 50, cobroTitular: 'Wilde SC', cobroAlias: 'wilde.sc', cobroCbu: '2850590940090418135205', franjasBase: '19:00-20:00|20:00-21:00|21:00-22:00', diasBase: '4,5,6' },
  { id: 'predio-10', nombre: 'Monte Grande Fútbol', direccion: 'Av. Fair 200', barrio: 'Monte Grande', ciudad: 'Buenos Aires', telefono: '+5491122334428', duenoUid: 'user-dueno-02', ...BARRIOS['Monte Grande'], verificado: true, tipoSena: 'fijo', montoSena: 4000, porcentajeSena: 0, cobroTitular: 'Monte Grande FC', cobroAlias: 'montegrande.fc', cobroCbu: '', franjasBase: '17:00-18:00|18:00-19:00', diasBase: '1,2,4,6' },
]

// ============================================================================
// 4) CANCHAS — todas las modalidades (F5/F7/F8/F11), techadas y no
// ============================================================================

export const CANCHAS: CanchaFila[] = [
  { predioId: 'predio-01', canchaId: 'cancha-1', nombre: 'La Bombonerita', tipo: 'F5', techada: false, precioHora: 8000, activa: true },
  { predioId: 'predio-01', canchaId: 'cancha-2', nombre: 'La Techada', tipo: 'F7', techada: true, precioHora: 11000, activa: true },
  { predioId: 'predio-02', canchaId: 'cancha-1', nombre: 'Anexo F8', tipo: 'F8', techada: true, precioHora: 13000, activa: true },
  { predioId: 'predio-03', canchaId: 'cancha-1', nombre: 'Cancha 1', tipo: 'F5', techada: false, precioHora: 7500, activa: true },
  { predioId: 'predio-03', canchaId: 'cancha-2', nombre: 'Cancha 2', tipo: 'F7', techada: true, precioHora: 10000, activa: true },
  { predioId: 'predio-04', canchaId: 'cancha-1', nombre: 'Cancha techada', tipo: 'F7', techada: true, precioHora: 9500, activa: true },
  { predioId: 'predio-05', canchaId: 'cancha-1', nombre: 'Indoor 1', tipo: 'F8', techada: true, precioHora: 14000, activa: true },
  { predioId: 'predio-05', canchaId: 'cancha-2', nombre: 'Indoor 2', tipo: 'F5', techada: true, precioHora: 9000, activa: false },
  { predioId: 'predio-06', canchaId: 'cancha-1', nombre: 'Estadio Principal', tipo: 'F11', techada: false, precioHora: 22000, activa: true },
  { predioId: 'predio-07', canchaId: 'cancha-1', nombre: 'Arena 1', tipo: 'F5', techada: true, precioHora: 8500, activa: true },
  { predioId: 'predio-08', canchaId: 'cancha-1', nombre: 'Cancha Norte', tipo: 'F7', techada: false, precioHora: 9000, activa: true },
  { predioId: 'predio-09', canchaId: 'cancha-1', nombre: 'Sport 1', tipo: 'F8', techada: true, precioHora: 12000, activa: true },
  { predioId: 'predio-10', canchaId: 'cancha-1', nombre: 'Monte 1', tipo: 'F5', techada: false, precioHora: 7000, activa: true },
]

// ============================================================================
// 5) EQUIPOS + MIEMBROS
// ============================================================================

export const EQUIPOS: EquipoFila[] = [
  { id: 'team-scaloneta', name: 'La Scaloneta F5', shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Scaloneta', captainUid: 'user-jug-01', modalidadBase: 'F5', genero: 'Masculino', ...BARRIOS['Lanús Oeste'], wins: 45, draws: 10, losses: 5 },
  { id: 'team-pibes', name: 'Los Pibes de Lomas', shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Pibes', captainUid: 'user-jug-06', modalidadBase: 'F7', genero: 'Masculino', ...BARRIOS['Lomas de Zamora'], wins: 12, draws: 4, losses: 9 },
  { id: 'team-fieras', name: 'Las Fieras F8', shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Fieras', captainUid: 'user-jug-17', modalidadBase: 'F8', genero: 'Mixto', ...BARRIOS['Valentín Alsina'], wins: 20, draws: 6, losses: 3 },
  { id: 'team-veteranos', name: 'Veteranos del Sur', shieldUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Veteranos', captainUid: 'user-jug-22', modalidadBase: 'F11', genero: 'Masculino', ...BARRIOS['Lomas de Zamora'], wins: 8, draws: 2, losses: 14 },
]

export const MIEMBROS_EQUIPO: MiembroEquipoFila[] = [
  { equipoId: 'team-scaloneta', uid: 'user-jug-01', name: 'Lautaro Vega', role: 'CAPITAN', dorsal: 10, position: 'FWD' },
  { equipoId: 'team-scaloneta', uid: 'user-jug-02', name: 'Julián Costa', role: 'PLAYER', dorsal: 5, position: 'MID' },
  { equipoId: 'team-scaloneta', uid: 'user-jug-03', name: 'Emiliano Ferro', role: 'PLAYER', dorsal: 1, position: 'GK' },
  { equipoId: 'team-scaloneta', uid: 'user-jug-04', name: 'Ángel Quiroga', role: 'PLAYER', dorsal: 7, position: 'DEF' },
  { equipoId: 'team-scaloneta', uid: 'user-jug-05', name: 'Cristian Sosa', role: 'PLAYER', dorsal: 4, position: 'DEF' },
  { equipoId: 'team-scaloneta', uid: 'user-jug-15', name: 'Emanuel Godoy', role: 'PLAYER', dorsal: 9, position: 'FWD' },

  { equipoId: 'team-pibes', uid: 'user-jug-06', name: 'Matías Rueda', role: 'CAPITAN', dorsal: 2, position: 'DEF' },
  { equipoId: 'team-pibes', uid: 'user-jug-07', name: 'Nicolás Pérez', role: 'PLAYER', dorsal: 8, position: 'MID' },
  { equipoId: 'team-pibes', uid: 'user-jug-08', name: 'Joaquín Molina', role: 'PLAYER', dorsal: 1, position: 'GK' },
  { equipoId: 'team-pibes', uid: 'user-jug-11', name: 'Santiago Bustos', role: 'PLAYER', dorsal: 11, position: 'FWD' },
  { equipoId: 'team-pibes', uid: 'user-jug-12', name: 'Kevin Ríos', role: 'PLAYER', dorsal: 3, position: 'DEF' },

  { equipoId: 'team-fieras', uid: 'user-jug-17', name: 'Gonzalo Vera', role: 'CAPITAN', dorsal: 10, position: 'MID' },
  { equipoId: 'team-fieras', uid: 'user-jug-18', name: 'Tomás Cardozo', role: 'PLAYER', dorsal: 7, position: 'FWD' },
  { equipoId: 'team-fieras', uid: 'user-jug-14', name: 'Leonel Cáceres', role: 'PLAYER', dorsal: 1, position: 'GK' },
  { equipoId: 'team-fieras', uid: 'user-jug-26', name: 'Hernán Coronel', role: 'DT', dorsal: null, position: '' },
  { equipoId: 'team-fieras', uid: 'user-jug-27', name: 'Marco Peralta', role: 'PLAYER', dorsal: 6, position: 'DEF' },

  { equipoId: 'team-veteranos', uid: 'user-jug-22', name: 'Diego Rojas', role: 'CAPITAN', dorsal: 1, position: 'GK' },
  { equipoId: 'team-veteranos', uid: 'user-jug-24', name: 'Maximiliano Aguirre', role: 'PLAYER', dorsal: 5, position: 'DEF' },
  { equipoId: 'team-veteranos', uid: 'user-jug-28', name: 'Sergio Lucero', role: 'PLAYER', dorsal: 9, position: 'FWD' },
]

// ============================================================================
// 6) DESAFÍOS
// ============================================================================

export const DESAFIOS: DesafioFila[] = [
  { id: 'desafio-01', creatorUid: 'user-jug-01', equipoId: 'team-scaloneta', equipoNombre: 'La Scaloneta F5', equipoEscudoUrl: EQUIPOS[0].shieldUrl, modalidad: 'F5', estadoCancha: 'CON_CANCHA', estado: 'ABIERTO', turnoId: '', predioId: 'predio-01', posicionBuscada: 'arquero', fechaISO: '2026-10-15', descripcion: 'Buscamos arquero para partido amistoso. Nivel medio/alto.', ...BARRIOS['Lanús Oeste'] },
  { id: 'desafio-02', creatorUid: 'user-jug-06', equipoId: 'team-pibes', equipoNombre: 'Los Pibes de Lomas', equipoEscudoUrl: EQUIPOS[1].shieldUrl, modalidad: 'F7', estadoCancha: 'BUSCA_CANCHA', estado: 'ABIERTO', turnoId: '', predioId: '', posicionBuscada: 'defensor', fechaISO: '2026-10-16', descripcion: 'F7 en Lomas de Zamora. Nosotros ponemos la cancha, traé un defensor.', ...BARRIOS['Lomas de Zamora'] },
  { id: 'desafio-03', creatorUid: 'user-jug-17', equipoId: 'team-fieras', equipoNombre: 'Las Fieras F8', equipoEscudoUrl: EQUIPOS[2].shieldUrl, modalidad: 'F8', estadoCancha: 'CON_CANCHA', estado: 'ABIERTO', turnoId: '', predioId: 'predio-05', posicionBuscada: 'medio', fechaISO: '2026-10-17', descripcion: 'F8 indoor un viernes. Buscamos un mediocampista con quite.', ...BARRIOS['Valentín Alsina'] },
  { id: 'desafio-04', creatorUid: 'user-jug-22', equipoId: 'team-veteranos', equipoNombre: 'Veteranos del Sur', equipoEscudoUrl: EQUIPOS[3].shieldUrl, modalidad: 'F11', estadoCancha: 'BUSCA_CANCHA', estado: 'ABIERTO', turnoId: '', predioId: '', posicionBuscada: '', fechaISO: '2026-10-18', descripcion: 'Cualquiera. Partido tranquilo de veteranos, se juega temprano.', ...BARRIOS['Lomas de Zamora'] },
]

// ============================================================================
// 7) PARTIDOS + POSTULACIONES
// ============================================================================

export const PARTIDOS: PartidoFila[] = [
  { id: 'partido-01', organizadorUid: 'user-jug-01', nombre: 'F5 Amistoso en El Templo', predioId: 'predio-01', canchaId: 'cancha-1', barrio: 'Lanús Oeste', fecha: '2026-10-15', hora: '20:00', modalidad: 'F5', cuposDisponibles: 1, posicionBuscada: 'defensor', estado: 'abierto', ...BARRIOS['Lanús Oeste'] },
  { id: 'partido-02', organizadorUid: 'user-jug-02', nombre: 'F7 Fútbol de Viernes', predioId: 'predio-03', canchaId: 'cancha-2', barrio: 'Lomas de Zamora', fecha: '2026-10-16', hora: '19:00', modalidad: 'F7', cuposDisponibles: 2, posicionBuscada: 'arquero', estado: 'abierto', ...BARRIOS['Lomas de Zamora'] },
  { id: 'partido-03', organizadorUid: 'user-jug-09', nombre: 'F8 Indoor de Sábado', predioId: 'predio-05', canchaId: 'cancha-1', barrio: 'Temperley', fecha: '2026-10-17', hora: '18:00', modalidad: 'F8', cuposDisponibles: 3, posicionBuscada: '', estado: 'abierto', ...BARRIOS['Temperley'] },
  { id: 'partido-04', organizadorUid: 'user-jug-17', nombre: 'F5 en Wilde', predioId: 'predio-09', canchaId: 'cancha-1', barrio: 'Wilde', fecha: '2026-10-18', hora: '21:00', modalidad: 'F5', cuposDisponibles: 1, posicionBuscada: 'delantero', estado: 'abierto', ...BARRIOS['Wilde'] },
  { id: 'partido-05', organizadorUid: 'user-jug-21', nombre: 'F11 en Avellaneda', predioId: 'predio-06', canchaId: 'cancha-1', barrio: 'Avellaneda Centro', fecha: '2026-10-19', hora: '09:00', modalidad: 'F11', cuposDisponibles: 4, posicionBuscada: '', estado: 'abierto', ...BARRIOS['Avellaneda Centro'] },
  { id: 'partido-06', organizadorUid: 'user-jug-06', nombre: 'F7 en Quilmes', predioId: 'predio-07', canchaId: 'cancha-1', barrio: 'Bernal', fecha: '2026-10-20', hora: '20:00', modalidad: 'F5', cuposDisponibles: 0, posicionBuscada: '', estado: 'cerrado', ...BARRIOS['Bernal'] },
]

export const POSTULACIONES: PostulacionFila[] = [
  { partidoId: 'partido-01', jugadorUid: 'user-jug-06', nombre: 'Matías Rueda', posicion: 'defensor', telefono: '+5491122334406', fotoUrl: foto('MatíasRueda'), mensaje: 'Me sumo de central, avisen si falta 1.', estado: 'pendiente' },
  { partidoId: 'partido-01', jugadorUid: 'user-jug-12', nombre: 'Kevin Ríos', posicion: 'defensor', telefono: '+5491122334412', fotoUrl: foto('KevinRíos'), mensaje: 'Puedo cubrir el lateral derecho.', estado: 'pendiente' },
  { partidoId: 'partido-02', jugadorUid: 'user-jug-03', nombre: 'Emiliano Ferro', posicion: 'arquero', telefono: '+5491122334403', fotoUrl: foto('EmilianoFerro'), mensaje: 'Arquero disponible ese horario.', estado: 'aceptada' },
  { partidoId: 'partido-03', jugadorUid: 'user-jug-26', nombre: 'Hernán Coronel', posicion: 'medio', telefono: '+5491122334426', fotoUrl: foto('HernánCoronel'), mensaje: 'Voy de 5, corro bastante.', estado: 'pendiente' },
  { partidoId: 'partido-04', jugadorUid: 'user-jug-28', nombre: 'Sergio Lucero', posicion: 'delantero', telefono: '+5491122334428', fotoUrl: foto('SergioLucero'), mensaje: 'Me prendo de 9.', estado: 'pendiente' },
  { partidoId: 'partido-05', jugadorUid: 'user-jug-16', nombre: 'Facundo Ledesma', posicion: 'defensor', telefono: '+5491122334416', fotoUrl: foto('FacundoLedesma'), mensaje: 'Central zurdo, avisen.', estado: 'rechazada' },
]

// ============================================================================
// 8) REPORTES — para la Sala de Arbitraje del superadmin
// ============================================================================

export const REPORTES: ReporteFila[] = [
  { id: 'reporte-01', reportanteUid: 'user-jug-01', usuarioReportadoUid: 'user-jug-13', categoria: 'no_show', motivo: 'No se presentó al partido del viernes sin avisar.', estado: 'abierto' },
  { id: 'reporte-02', reportanteUid: 'user-jug-06', usuarioReportadoUid: 'user-jug-24', categoria: 'abuso', motivo: 'Lenguaje agresivo durante el partido.', estado: 'abierto' },
  { id: 'reporte-03', reportanteUid: 'user-jug-17', usuarioReportadoUid: 'user-jug-19', categoria: 'datos_falsos', motivo: 'El teléfono cargado no corresponde.', estado: 'abierto' },
]

// ============================================================================
// Construcción de hojas (contrato con el generador y el parser)
// ============================================================================

const SI = (v: boolean): string => (v ? 'SI' : 'NO')

export interface Hoja {
  nombre: string
  columnas: string[]
  filas: Record<string, string | number>[]
}

export function construirHojas(): Hoja[] {
  // Cada jugador hereda los equipos en los que figura como miembro.
  const teamIdsDe = (uid: string): string[] =>
    MIEMBROS_EQUIPO.filter((m) => m.uid === uid).map((m) => m.equipoId).filter((v, i, a) => a.indexOf(v) === i)

  const usuarios = USUARIOS.map((u) => ({
    uid: u.uid,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    password: u.password,
    rol: u.rol,
    telefono: u.telefono,
    fechaNacimiento: u.fechaNacimiento,
    zona: u.zona,
    municipio: u.municipio,
    fotoUrl: u.fotoUrl,
    planDueno: u.planDueno,
    disponibleHoy: SI(u.disponibleHoy),
    notificacionesRadar: SI(u.notificacionesRadar),
    posicion: u.posicion,
    playerRole: u.playerRole,
    piernaHabil: u.piernaHabil,
    nivel: u.nivel ?? '',
    rating: u.rating,
    goles: u.goles,
    asistencias: u.asistencias,
    partidosJugados: u.partidosJugados,
    mvpCount: u.mvpCount,
    fairPlayIndex: u.fairPlayIndex,
    teamIds: teamIdsDe(u.uid).join(','),
    lat: u.lat ?? '',
    lng: u.lng ?? '',
  }))

  return [
    {
      nombre: 'Usuarios',
      columnas: ['uid', 'nombre', 'apellido', 'email', 'password', 'rol', 'telefono', 'fechaNacimiento', 'zona', 'municipio', 'fotoUrl', 'planDueno', 'disponibleHoy', 'notificacionesRadar', 'posicion', 'playerRole', 'piernaHabil', 'nivel', 'rating', 'goles', 'asistencias', 'partidosJugados', 'mvpCount', 'fairPlayIndex', 'teamIds', 'lat', 'lng'],
      filas: usuarios,
    },
    {
      nombre: 'Solicitudes',
      columnas: ['uid', 'nombre', 'apellido', 'telefono', 'email', 'nombrePredio', 'ciudad', 'barrio', 'tipoCancha', 'cantidadCanchas', 'mensaje', 'estado', 'motivoRechazo'],
      filas: SOLICITUDES as unknown as Record<string, string | number>[],
    },
    {
      nombre: 'Predios',
      columnas: ['id', 'nombre', 'direccion', 'barrio', 'ciudad', 'telefono', 'duenoUid', 'lat', 'lng', 'verificado', 'tipoSena', 'montoSena', 'porcentajeSena', 'cobroTitular', 'cobroAlias', 'cobroCbu', 'franjasBase', 'diasBase'],
      filas: PREDIOS.map((p) => ({ ...p, verificado: SI(p.verificado) })),
    },
    {
      nombre: 'Canchas',
      columnas: ['predioId', 'canchaId', 'nombre', 'tipo', 'techada', 'precioHora', 'activa'],
      filas: CANCHAS.map((c) => ({ ...c, techada: SI(c.techada), activa: SI(c.activa) })),
    },
    {
      nombre: 'Equipos',
      columnas: ['id', 'name', 'shieldUrl', 'captainUid', 'modalidadBase', 'genero', 'lat', 'lng', 'wins', 'draws', 'losses'],
      filas: EQUIPOS as unknown as Record<string, string | number>[],
    },
    {
      nombre: 'MiembrosEquipo',
      columnas: ['equipoId', 'uid', 'name', 'role', 'dorsal', 'position'],
      filas: MIEMBROS_EQUIPO.map((m) => ({ ...m, dorsal: m.dorsal ?? '' })),
    },
    {
      nombre: 'Desafios',
      columnas: ['id', 'creatorUid', 'equipoId', 'equipoNombre', 'equipoEscudoUrl', 'modalidad', 'estadoCancha', 'estado', 'turnoId', 'predioId', 'posicionBuscada', 'fechaISO', 'descripcion', 'lat', 'lng'],
      filas: DESAFIOS as unknown as Record<string, string | number>[],
    },
    {
      nombre: 'Partidos',
      columnas: ['id', 'organizadorUid', 'nombre', 'predioId', 'canchaId', 'barrio', 'fecha', 'hora', 'modalidad', 'cuposDisponibles', 'posicionBuscada', 'estado', 'lat', 'lng'],
      filas: PARTIDOS as unknown as Record<string, string | number>[],
    },
    {
      nombre: 'Postulaciones',
      columnas: ['partidoId', 'jugadorUid', 'nombre', 'posicion', 'telefono', 'fotoUrl', 'mensaje', 'estado'],
      filas: POSTULACIONES as unknown as Record<string, string | number>[],
    },
    {
      nombre: 'Reportes',
      columnas: ['id', 'reportanteUid', 'usuarioReportadoUid', 'categoria', 'motivo', 'estado'],
      filas: REPORTES as unknown as Record<string, string | number>[],
    },
  ]
}
