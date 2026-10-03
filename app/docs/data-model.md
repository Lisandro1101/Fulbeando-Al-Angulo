# Modelo de datos — Fulbeando MVP

Implementación del PRD secciones 3 y 6 sobre **Firebase** (Firestore + Storage).
El PRD proponía Supabase/PostGIS o Firebase; con Firebase no hay PostGIS, así que
la proximidad del radar se resuelve con **geohash** (`src/core/geo/`).

## Colecciones

```
usuarios/{uid}
predios/{predioId}
  └── canchas/{canchaId}
turnos/{predioId~{canchaId}~{fecha}T{horaInicio}}
alertas/falta1_{turnoId}
  └── postulaciones/{uid}
comprobantes/{turnoId}
reportes/{reporteId}
solicitudes/{uid}
```

| Colección | Subcolección | Notas |
|---|---|---|
| `usuarios` | — | Perfil + rol + `perfilDeportivo` + `geo` aproximado |
| `predios` | — | Complejo, cobro, `verificado`, `barrioNormalizado` |
| `predios/{id}` | `canchas` | F5/F7/F8/F11, techada, precio hora |
| `turnos` | — | Colección plana: permite consultar por fecha/estado sin joins |
| `alertas` | `postulaciones` | Radar "Falta 1" |
| `comprobantes` | — | Evidencia de la transferencia, separada del turno |
| `reportes` | — | Moderación del superadmin |
| `solicitudes` | — | Autodesdeclaración de dueño, `estado: pendiente \| aprobada \| rechazada` |

## IDs deterministas

Dos IDs previsibles resuelven carreras sinlocks ni transacciones complejas:

- **Turno**: `predio~cancha~fechaThorada`. La unicidad la impone Firestore, así que
  un jugador **no puede inventar una franja**: la grilla la carga el dueño.
- **Alerta**: `falta1_{turnoId}`. Un solo radar por turno y horario.
- **Comprobante**: `{turnoId}`. El turno solo expone `comprobantePendiente: boolean`;
  la imagen se lee con reglas separadas.

## Estados de turno

```
disponible ──solicitud con comprobante──> bloqueado_temporal (15 min)
                                              ├── aprobar ──> confirmado
                                              ├── rechazar ─> disponible (motivo)
                                              └── vencerse ─> disponible + notificar al dueño
confirmado ──cancelar──> cancelado
```

Transiciones válidas centralizadas en `src/domain/turno.ts`
(`transicionValida`, `bloqueoVencio`) y replicadas en `firestore.rules`.

## Invariantes del PRD y dónde se aplican

| Regla | Dónde |
|---|---|
| 6.1 Solicitud sin comprobante no es válida | `tieneComprobanteValido()`, `solicitarTurno()` (lanza `SinComprobanteError`), regla `turnos/{id}` update |
| 6.1 Bloqueo máximo 15 min | `MINUTOS_BLOQUEO_TEMPORAL`, `bloqueadoHasta` |
| 6.1 Vencido notifica, no cancela | `liberarBloqueosVencidos()` marca `expiracionNotificada` y vuelve a `disponible` |
| 6.2 Solo turno confirmado o dueño activa radar | `puedeActivarRadar()`, regla `alertas/{id}` create |
| 6.3 Sin hard-delete | `allow delete: if false` en todas las colecciones; baja con `deletedAt` / `estado: 'inactivo'` |
| 6.5 Sin pasarela de pagos | Solo `alias`/`cbu`/`montoSena` visibles + imagen del comprobante en Storage |

## Proximidad sin PostGIS

Cada documento geolocalizado guarda:

```ts
geo: {
  lat, lng,        // 4 decimales: ubicación aproximada, no exacta
  prefijo,         // geohash precisión 5 (celda ~4.9 km)
  prefijos: [...]  // celdas vecinas que cubren el radio del radar
}
```

Consulta del radar (`listarCandidatosRadar`, `listarAlertasCercanas`):

1. `prefijosQueCubren(punto, radioKm, 5)` arma la grilla de celdas (≤ 30, límite de
   `array-contains-any`; si excede, baja la precisión automáticamente).
2. `where('geo.prefijos', 'array-contains-any', prefijos)` con índice compuesto.
3. Filtro exacto con **haversine** en memoria, que descarta los falsos positivos
   de la caja.

Índices en `firestore.indexes.json`; reglas en `firestore.rules` y `storage.rules`.

## Flujo de reserva (paso 3)

```
/reservar/:predioId
  1. Grilla de la semana   -> listarTurnosEnRango (1 query, índice predioId+fecha)
  2. Alias / CBU / monto  -> predio.cobro, solo lectura
  3. Upload comprobante   -> subirImagenComprobante()  (solo Storage)
  4. Enviar solicitud     -> solicitarTurno() transaccional
                             escribe turno + comprobante juntos
  5. Temporizador 15:00   -> consulta el estado cada 10s hasta que el dueño valide
```

Dos decisiones que las rules imponen:

- **El registro del comprobante va dentro de la transacción**, no antes. Si se
  escribiera aparte, el `update` del comprobante dentro de la transacción
  chocaría con `allow update` (reservado al dueño) y la reserva fallaría.
- **La regla del turno valida el documento nuevo, no el anterior.** En un turno
  libre `resource.data.organizadorUid` es `null`, así que pedir
  `resource.data.organizadorUid == request.auth.uid` haría la reserva imposible.
  La regla exige que el *nuevo* documento se apropie del turno.

## Alta de canchas: solo dueños verificados

El alta y la edición de canchas las puede hacer únicamente un
`dueno_predio` **sobre predios que le pertenecen**. El camino para conseguir el
rol es una autodesdeclaración con verificación:

```
/ajustes -> formulario (solicitudes/{uid}, estado: 'pendiente')
   ↓ el usuario SIGUE siendo 'jugador' mientras espera
/superadmin -> aprobar
   ↓ transacción: solicitud -> 'aprobada' + usuarios/{uid}.rol -> 'dueno_predio'
/admin -> "Canchas del predio" (crear / editar / desactivar)
```

Por qué el rol no se autoasigna: si el registro público pudiera escribir su
propio `rol`, cualquiera se declararía dueño y las rules del resto del sistema
dejarían de significar nada. `solicitudes` cierra ese agujero:

- El ID del documento es el `uid`: una sola solicitud viva por persona.
- El usuario puede crearla, corregirla y reenviarla tras un rechazo, pero
  `allow update` exige `request.resource.data.estado == 'pendiente'`, así que
  **nunca puede auto-aprobarse**.
- Aprobar es una transacción que escribe la solicitud y el rol juntos, para no
  dejar un dueño sin solicitud ni una solicitud aprobada sin permisos.
- El alta de canchas no tiene `delete`: la baja es `activa: false`.

## Grilla del dia (carga manual del dueno)

`generarGrillaDelDia(canchas, fecha, franjas, predio)` crea los turnos
`disponible` de todas las canchas activas para una fecha. Decisiones:

- **IDs deterministicos** (`predio~cancha~fechaThora`): repetir la operacion solo
  completa lo que falta, nunca duplica ni pisa una reserva existente.
- **Una lectura del dia, no una por turno**: se consulta `listarTurnosDelDia` y
  se difiere en memoria contra la franja pedida.
- **Tope de 450 escrituras** por lote, por el limite de 500 de Firestore; si la
  combinacion canchas x franjas lo excede se rechaza con un mensaje claro en
  lugar de cortar el batch a medias.
- **La franja se valida en el dominio** (`errorEnFranjas`): formato `HH:mm`, hora
  de fin posterior, y sin solapamientos. Cubierto por `npm run verificar:franjas`.

El precio se prorratea por duracion: `precioTotal = precioHora * duracion / 60`
(`precioDeFranja`, cubierto por `npm run verificar:franjas`). Asi una hora y
media de cancha no se cobra como una hora completa ni como dos. El demo usa
`6000/h` en franjas de 90 min, o sea `9000` por turno con `8000` de sena.

## Radar "Falta 1" (paso 5)

El radar se apoya en el perfil del jugador, no en nada nuevo: `posicion`,
`piernaHabil`, `nivel`, `disponibleHoy` y `notificacionesRadar` viven en
`usuarios/{uid}.perfilDeportivo`, y la zona en `usuarios/{uid}.geo`.

```
/ajustes -> perfil + "Usar mi ubicacion" (navigator.geolocation)
   ↓ esCandidatoParaRadar(usuario) habilita aparecer en el radar
/mi-dia -> "Radar de Emergencia": alertas de HOY dentro de radarRadioKm
   ↓ "Me sumo" -> postulaciones/{alertaId}_{uid}, estado 'postulado'
/mi-dia -> "Mis Proximos Partidos": turnos propios confirmados
   ↓ "Activar Falta 1" -> alertas/falta1_{turnoId} (solo organizador o dueno)
   ↓ el creador confirma a un postulante -> estado 'confirmado'
```

Decisiones que sostienen el flujo:

- **El jugador no elige el turno ni ve comprobantes**: la postulación va contra
  la alerta, y el organizador es el unico que confirma. La rules de
  `postulaciones/{uid}` deja que cada uno solo escriba su propio estado
  `postulado`/`retirado`, y que el creador de la alerta pase a `confirmado`.
- **El radar solo muestra partidos de hoy**: la consulta del panel filtra
  `fecha == hoy` ademas de `array-contains-any` sobre los prefijos del geohash.
  Un suplente confirmado no puede volver a "postulado" para inflar `confirmados`.
- **Los parametros del partido son inmutables al confirmar**: `turnoId`, `fecha`,
  `horaInicio`, `cantidadRequeridos` y `geo` se comparan en `allow update`, y
  `confirmados` solo puede crecer.
- **El `geo` se compara campo por campo** (`prefijo`, `lat`, `lng`): en rules,
  `map == map` no esta soportado y denegaria la escritura siempre.
- **Guardar la ubicacion es opcional**: sin `geo` el panel lo explica y ofrece
  cargarla, en lugar de fallar en silencio.

## Pendiente para fases siguientes

- **Vencimientos automáticos**: `liberarBloqueosVencidos()` y
  `expirarAlertasVencidas()` necesitan un proceso con credenciales de admin
  (Cloud Function o tarea programada); desde el cliente las rules lo impiden.
- **Fotos de predios/canchas y foto de perfil**: reglas de Storage hoy solo
  habilitan `comprobantes/`.
- **WhatsApp verificado**: el campo `whatsappVerificado` existe, la verificación
  real depende del proveedor de SMS que se defina.
- **Imagen huérfana**: si la transacción de `solicitarTurno()` falla porque otro
  jugador se anticipó, el archivo ya subido queda en Storage. No se borra
  (`allow delete: if false`) para preservar el historial; el path incluye el
  `turnoId`, así que nunca colisiona con una reserva válida. Una tarea de
  limpieza lo puede purgar después.