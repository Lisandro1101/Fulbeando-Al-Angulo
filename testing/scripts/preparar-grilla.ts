/**
 * Fixture / inspeccion del emulador de Firestore para los tests de Fase 2.
 * NO toca el codigo de la app: solo escribe documentos de prueba en el emulador.
 *
 *   npx tsx testing/scripts/preparar-grilla.ts          # crea turnos de prueba
 *   npx tsx testing/scripts/preparar-grilla.ts --solo-inspeccion
 */
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIRESTORE_PROJECT_ID = 'fulbeando-demo';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const SOLO_INSPECCION = process.argv.includes('--solo-inspeccion');
const LIMPIAR = process.argv.includes('--limpiar');
const FRANJAS: Array<[string, string]> = [
  ['18:00', '19:00'],
  ['19:00', '20:00'],
  ['20:00', '21:00'],
];
const DIAS = 7;

initializeApp({ projectId: 'fulbeando-demo' });
const db = getFirestore();

const fechaISO = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  if (LIMPIAR) {
    // Solo turnos de prueba: se borra la coleccion entera del emulador.
    let total = 0;
    for (;;) {
      const lote = await db.collection('turnos').limit(400).get();
      if (lote.empty) break;
      const b = db.batch();
      lote.docs.forEach(d => b.delete(d.ref));
      await b.commit();
      total += lote.size;
    }
    console.log(`\n🗑️  ${total} turnos eliminados`);
  }

  const predios = await db.collection('predios').get();
  console.log(`\npredios: ${predios.size}`);

  let turnosCreados = 0;

  for (const doc of predios.docs) {
    const p = doc.data();
    const canchas = await doc.ref.collection('canchas').get();
    const turnosHoy = await db
      .collection('turnos')
      .where('predioId', '==', doc.id)
      .limit(1)
      .get();

    console.log(
      `  ${doc.id} | verificado=${p.verificado} | activo=${p.estado} | ` +
        `canchasResumen=${(p.canchasResumen ?? []).length} | subcolección canchas=${canchas.size} | turnos=${turnosHoy.size}`,
    );

    if (SOLO_INSPECCION) continue;
    if (!p.verificado || p.estado !== 'activo') continue;

    // El seed solo llena `canchasResumen` (array denormalizado en el predio);
    // la subcolección que lee `listarCanchas` queda vacía y sin ella ni el
    // GeneradorGrilla del dueño puede crear turnos.
    if (canchas.size === 0 && (p.canchasResumen ?? []).length > 0) {
      for (const c of p.canchasResumen) {
        await doc.ref.collection('canchas').doc(c.id).set({
          id: c.id,
          predioId: doc.id,
          nombre: c.nombre,
          tipo: c.tipo,
          techada: c.techada ?? false,
          precioHora: c.precioHora,
          activa: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          deletedAt: null,
        });
      }
      console.log(`    🆕 ${p.canchasResumen.length} canchas creadas desde canchasResumen`);
    }

    const canchasFinales = await doc.ref.collection('canchas').get();
    if (canchasFinales.size === 0) {
      console.log('    ⚠️  sin canchas activas: no se puede generar la grilla');
      continue;
    }

    let batch = db.batch();
    let creados = 0;
    const hoy = new Date();

    for (let i = 0; i < DIAS; i++) {
      const fecha = fechaISO(new Date(hoy.getTime() + i * 86_400_000));
      for (const c of canchasFinales.docs) {
        const cancha = c.data();
        if (cancha.activa === false) continue;
        for (const [horaInicio, horaFin] of FRANJAS) {
          const id = `${doc.id}~${c.id}~${fecha}T${horaInicio}`;
          const ref = db.collection('turnos').doc(id);
          const existe = await ref.get();
          if (existe.exists) continue;
          batch.set(ref, {
            id,
            predioId: doc.id,
            canchaId: c.id,
            fecha,
            horaInicio,
            horaFin,
            estado: 'disponible',
            origen: 'carga_manual_dueno',
            precioTotal: Number(cancha.precioHora ?? 8000),
            montoSena: Number(p.cobro?.montoSena ?? 5000),
            organizadorUid: null,
            organizadorNombre: null,
            organizadorTelefono: null,
            comprobantePendiente: false,
            motivoRechazo: null,
            bloqueadoHasta: null,
            expiracionNotificada: false,
            canceladoPor: null,
            geo: p.geo ?? null,
            partidoId: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            deletedAt: null,
          });
          creados++;
          if (creados % 400 === 0) { await batch.commit(); batch = db.batch(); }
        }
      }
    }
    if (creados % 400 !== 0) await batch.commit();
    turnosCreados += creados;
    console.log(`    ✅ ${creados} turnos creados (${DIAS} días × ${FRANJAS.length} franjas)`);
  }

  const total = await db.collection('turnos').count().get();
  console.log(`\nturnos en el emulador: ${total.data().count}`);
  console.log(`creados en esta corrida: ${turnosCreados}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
