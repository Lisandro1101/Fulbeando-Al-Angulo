/**
 * Seed de datos demo contra los emuladores de Firebase.
 *   1) npm run emulators          (otra terminal)
 *   2) npm run seed
 *
 * Crea las cuentas de Auth, 1 superadmin, 2 duenos con predios y canchas,
 * 6 jugadores (con y sin "Disponible hoy") y la grilla de turnos de hoy +
 * manana, mas dos alertas "Falta 1" que deben aparecer en el radar.
 *
 * Escribe con el SDK de admin (ver `entorno-seed`): el cliente no autenticado
 * no puede crear duenos, predios ni turnos confirmados.
 */
import { COLECCIONES } from '../src/core/config';
import { crearCuentaDemo, db, doc, setDoc, Timestamp, writeBatch } from './entorno-seed';
import { aFechaISO, desdeFechaHora, sumarDias } from '../src/core/tiempo';
import { aGeoIndex } from '../src/core/geo';
import { MINUTOS_A_MS, MINUTOS_BLOQUEO_TEMPORAL, precioDeFranja, turnoId } from '../src/domain';
/** Password de todas las cuentas demo. */
export const PASSWORD_DEMO = 'fulbeando123';
const ahora = new Date();
const hoy = aFechaISO(ahora);
const manana = sumarDias(hoy, 1);
const ts = (d) => Timestamp.fromDate(d);
const auditoria = () => ({ createdAt: ts(ahora), updatedAt: ts(ahora), deletedAt: null });
const PERFIL = {
    posicion: 'medio',
    piernaHabil: 'diestro',
    nivel: 3,
    disponibleHoy: true,
    notificacionesRadar: true,
};
const PUNTOS = [
    { nombre: 'Complejo El Potrero', barrio: 'Palermo', lat: -34.5889, lng: -58.4300 },
    { nombre: 'Club Boedo', barrio: 'Boedo', lat: -34.6450, lng: -58.4500 },
    { nombre: 'La Bombonerita', barrio: 'Caballito', lat: -34.6180, lng: -58.4400 },
];
async function main() {
    console.log('Sembrando datos demo en los emuladores...');
    const superadmin = {
        uid: 'uid_superadmin',
        nombre: 'Ana',
        apellido: 'Superadmin',
        email: 'admin@fulbeando.test',
        telefono: null,
        whatsappVerificado: false,
        rol: 'superadmin',
        perfilDeportivo: null,
        geo: null,
        zona: 'Palermo',
        fotoUrl: null,
        estado: 'activo',
        ...auditoria(),
    };
    await setDoc(doc(db, COLECCIONES.usuarios, superadmin.uid), superadmin);
    const duenos = [
        { uid: 'uid_dueno_elena', nombre: 'Elena', apellido: 'Duarte', email: 'elena@fulbeando.test' },
        { uid: 'uid_dueno_marco', nombre: 'Marco', apellido: 'Sosa', email: 'marco@fulbeando.test' },
    ];
    for (const dueno of duenos) {
        await setDoc(doc(db, COLECCIONES.usuarios, dueno.uid), {
            ...dueno,
            telefono: '+5491100000000',
            whatsappVerificado: false,
            rol: 'dueno_predio',
            perfilDeportivo: null,
            geo: null,
            zona: null,
            fotoUrl: null,
            estado: 'activo',
            ...auditoria(),
        });
    }
    const jugadores = [
        { uid: 'uid_jug_1', nombre: 'Tomi', apellido: 'Rios', email: 'tomi@fulbeando.test', disponibleHoy: true },
        { uid: 'uid_jug_2', nombre: 'Nico', apellido: 'Perez', email: 'nico@fulbeando.test', disponibleHoy: true, posicion: 'arquero' },
        { uid: 'uid_jug_3', nombre: 'Santi', apellido: 'Lopez', email: 'santi@fulbeando.test', disponibleHoy: true, posicion: 'delantero' },
        { uid: 'uid_jug_4', nombre: 'German', apellido: 'Vera', email: 'german@fulbeando.test', disponibleHoy: false },
        { uid: 'uid_jug_5', nombre: 'Leo', apellido: 'Cruz', email: 'leo@fulbeando.test', disponibleHoy: true },
        { uid: 'uid_jug_6', nombre: 'Fede', apellido: 'Arias', email: 'fede@fulbeando.test', disponibleHoy: true, posicion: 'defensor' },
    ];
    const batch = writeBatch(db);
    jugadores.forEach((jugador, i) => {
        const punto = PUNTOS[i % PUNTOS.length] ?? PUNTOS[0];
        batch.set(doc(db, COLECCIONES.usuarios, jugador.uid), {
            uid: jugador.uid,
            nombre: jugador.nombre,
            apellido: jugador.apellido,
            email: jugador.email,
            telefono: '+5491100000001',
            whatsappVerificado: false,
            rol: 'jugador',
            perfilDeportivo: {
                ...PERFIL,
                posicion: jugador.posicion ?? PERFIL.posicion,
                disponibleHoy: jugador.disponibleHoy ?? false,
            },
            geo: aGeoIndex({ lat: punto.lat, lng: punto.lng }),
            zona: punto.barrio,
            fotoUrl: null,
            estado: 'activo',
            ...auditoria(),
        });
    });
    await batch.commit();
    const FRANJA = [
        { horaInicio: '18:00', horaFin: '19:30' },
        { horaInicio: '19:30', horaFin: '21:00' },
        { horaInicio: '21:00', horaFin: '22:30' },
    ];
    // Tarifa por hora. Las franjas son de 90 min, asi que el turno sale a
    // PRECIO_HORA * 1,5 (ver `precioDeFranja`).
    const PRECIO_HORA = 6000;
    const PRECIO_TURNO = precioDeFranja(PRECIO_HORA, FRANJA[0]);
    const predios = [];
    for (const [indice, punto] of PUNTOS.entries()) {
        const dueno = duenos[indice % duenos.length];
        const predioId = `predio_${indice + 1}`;
        const predio = {
            id: predioId,
            nombre: punto.nombre,
            direccion: `Av. Ejemplo ${100 + indice}`,
            barrio: punto.barrio,
            ciudad: 'Buenos Aires',
            barrioNormalizado: punto.barrio.toLowerCase(),
            geo: aGeoIndex({ lat: punto.lat, lng: punto.lng }),
            telefono: '+5491100000002',
            fotos: [],
            cobro: {
                titular: `${dueno.nombre} ${dueno.apellido}`,
                alias: `fulbeando.${predioId}`,
                cbu: '0000000000000000000000',
                montoSena: 8000,
            },
            duenoUid: dueno.uid,
            canchasResumen: [
                { id: `${predioId}_cancha_1`, nombre: 'Cancha 1 - Sintetico', tipo: 'F5', techada: indice === 1, precioHora: PRECIO_HORA },
            ],
            verificado: true,
            estado: 'activo',
            ...auditoria(),
        };
        await setDoc(doc(db, COLECCIONES.predios, predioId), predio);
        const canchaId = `${predioId}_cancha_1`;
        const cancha = {
            id: canchaId,
            predioId,
            nombre: 'Cancha 1 - Sintetico',
            tipo: 'F5',
            techada: indice === 1,
            precioHora: PRECIO_HORA,
            activa: true,
            createdAt: ts(ahora),
            updatedAt: ts(ahora),
        };
        await setDoc(doc(db, COLECCIONES.predios, predioId, COLECCIONES.canchas, canchaId), cancha);
        predios.push({ id: predioId, uid: dueno.uid });
        const grilla = writeBatch(db);
        for (const fecha of [hoy, manana]) {
            for (const slot of FRANJA) {
                const id = turnoId({ predioId, canchaId, fecha, horaInicio: slot.horaInicio });
                grilla.set(doc(db, COLECCIONES.turnos, id), {
                    id,
                    predioId,
                    canchaId,
                    fecha,
                    horaInicio: slot.horaInicio,
                    horaFin: slot.horaFin,
                    estado: 'disponible',
                    origen: 'carga_manual_dueno',
                    precioTotal: precioDeFranja(cancha.precioHora, slot),
                    montoSena: predio.cobro.montoSena,
                    organizadorUid: null,
                    organizadorNombre: null,
                    organizadorTelefono: null,
                    comprobantePendiente: false,
                    motivoRechazo: null,
                    bloqueadoHasta: null,
                    expiracionNotificada: false,
                    canceladoPor: null,
                    geo: predio.geo,
                    ...auditoria(),
                });
            }
        }
        await grilla.commit();
    }
    // Un turno confirmado con su alerta "Falta 1" para ver el radar funcionando.
    const predio = predios[0];
    const canchaId = `${predio.id}_cancha_1`;
    const franja = FRANJA[1];
    const idConfirmado = turnoId({
        predioId: predio.id,
        canchaId,
        fecha: manana,
        horaInicio: franja.horaInicio,
    });
    const turnoConfirmado = doc(db, COLECCIONES.turnos, idConfirmado);
    const turno = {
        id: idConfirmado,
        predioId: predio.id,
        canchaId,
        fecha: manana,
        horaInicio: franja.horaInicio,
        horaFin: franja.horaFin,
        estado: 'confirmado',
        origen: 'reserva_online',
        precioTotal: PRECIO_TURNO,
        montoSena: 8000,
        organizadorUid: 'uid_jug_1',
        organizadorNombre: 'Tomi Rios',
        organizadorTelefono: '+5491100000001',
        comprobantePendiente: false,
        motivoRechazo: null,
        bloqueadoHasta: null,
        expiracionNotificada: false,
        canceladoPor: null,
        geo: aGeoIndex({ lat: PUNTOS[0].lat, lng: PUNTOS[0].lng }),
        ...auditoria(),
    };
    const comprobante = {
        turnoId: idConfirmado,
        organizerUid: 'uid_jug_1',
        storagePath: `comprobantes/uid_jug_1/${idConfirmado}/demo.png`,
        mimeType: 'image/png',
        sizeBytes: 120_000,
        alias: `fulbeando.${predio.id}`,
        monto: 8000,
        subidoAt: ts(ahora),
        revisadoPor: predio.uid,
        revisadoAt: ts(ahora),
        verificado: true,
        motivoRechazo: null,
    };
    const escritura = writeBatch(db);
    escritura.set(turnoConfirmado, turno);
    // El comprobante se indexa por turnoId: es la clave que usan repositorios, rules y queries.
    escritura.set(doc(db, COLECCIONES.comprobantes, idConfirmado), comprobante);
    const alerta = {
        id: `falta1_${idConfirmado}`,
        turnoId: idConfirmado,
        predioId: predio.id,
        canchaId,
        fecha: manana,
        horaInicio: franja.horaInicio,
        horaFin: franja.horaFin,
        geo: turno.geo,
        cantidadRequeridos: 1,
        posicionBuscada: 'arquero',
        notas: 'Falta arquero con experience',
        creadoPorUid: 'uid_jug_1',
        estado: 'activa',
        confirmados: 0,
        expiraEn: ts(desdeFechaHora(manana, franja.horaInicio)),
        ...auditoria(),
    };
    escritura.set(doc(db, COLECCIONES.alertas, alerta.id), alerta);
    await escritura.commit();
    // Un turno esperando validacion, para ver el estado amarillo del semaforo.
    const pendienteId = turnoId({
        predioId: predio.id,
        canchaId,
        fecha: manana,
        horaInicio: FRANJA[2].horaInicio,
    });
    const pendiente = writeBatch(db);
    pendiente.set(doc(db, COLECCIONES.turnos, pendienteId), {
        ...turno,
        id: pendienteId,
        horaInicio: FRANJA[2].horaInicio,
        horaFin: FRANJA[2].horaFin,
        estado: 'bloqueado_temporal',
        comprobantePendiente: true,
        bloqueadoHasta: ts(new Date(Date.now() + MINUTOS_A_MS(MINUTOS_BLOQUEO_TEMPORAL))),
    });
    pendiente.set(doc(db, COLECCIONES.comprobantes, pendienteId), {
        ...comprobante,
        turnoId: pendienteId,
        storagePath: `comprobantes/uid_jug_1/${pendienteId}/demo.png`,
        verificado: false,
        revisadoPor: null,
        revisadoAt: null,
    });
    await pendiente.commit();
    // Las cuentas de Auth deben usar el MISMO uid que el documento de `usuarios`:
    // las rules comparan contra `request.auth.uid`, asi que si difieren el usuario
    // entra pero no ve (ni puede tocar) sus propios datos.
    const cuentas = [
        { uid: superadmin.uid, email: superadmin.email, nombre: `${superadmin.nombre} ${superadmin.apellido}` },
        ...duenos.map((d) => ({ uid: d.uid, email: d.email, nombre: `${d.nombre} ${d.apellido}` })),
        ...jugadores.map((j) => ({ uid: j.uid, email: j.email, nombre: `${j.nombre} ${j.apellido}` })),
    ];
    for (const cuenta of cuentas) {
        await crearCuentaDemo({ ...cuenta, password: PASSWORD_DEMO });
    }
    console.log('Listo.');
    console.log(`  password de todas las cuentas: ${PASSWORD_DEMO}`);
    console.log('  superadmin: admin@fulbeando.test');
    console.log('  duenos:     elena@fulbeando.test / marco@fulbeando.test');
    console.log('  jugadores:  tomi@fulbeando.test (organizador del turno confirmado)');
    console.log('              nico@ (arquero) / santi@ (delantero) / fede@ (defensor)');
    console.log('              german@ tiene "Disponible hoy" apagado, para comparar el radar');
    console.log(`  turnos de ${hoy} y ${manana} generados; alerta activa para el radar.`);
    console.log('  OJO: el seed no sube imagenes a Storage. Para probar el modal de');
    console.log('  validacion, subi un archivo a cada comprobantes/.../demo.png,');
    console.log('  o reserva de verdad desde /reservar.');
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error('Falló el seed:', error);
    process.exit(1);
});
