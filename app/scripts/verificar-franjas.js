import { duracionDeFranja, errorEnFranjas, formatearDuracion, franjasSeSolapan, franjaValida, minutosDeHora, precioDeFranja, } from '../src/domain/turno';
let fallos = 0;
const check = (nombre, ok) => {
    if (!ok) {
        console.error(`  FALLA  ${nombre}`);
        fallos += 1;
    }
    else {
        console.log(`  ok     ${nombre}`);
    }
};
console.log('verificacion: franjas de la grilla');
check('minutosDeHora 20:30 = 1230', minutosDeHora('20:30') === 1230);
check('duracion 19:30-21:00 = 90', duracionDeFranja({ horaInicio: '19:30', horaFin: '21:00' }) === 90);
check('formatearDuracion 90 = 1 h 30 min', formatearDuracion(90) === '1 h 30 min');
check('formatearDuracion 60 = 1 h', formatearDuracion(60) === '1 h');
check('formatearDuracion 45 = 45 min', formatearDuracion(45) === '45 min');
check('franja 18:00-19:30 valida', franjaValida({ horaInicio: '18:00', horaFin: '19:30' }));
check('franja invertida invalida', !franjaValida({ horaInicio: '21:00', horaFin: '19:30' }));
check('hora 24:00 invalida', !franjaValida({ horaInicio: '24:00', horaFin: '25:00' }));
check('hora 9:5 invalida', !franjaValida({ horaInicio: '9:5', horaFin: '10:0' }));
check('contiguas no se solapan', !franjasSeSolapan({ horaInicio: '18:00', horaFin: '19:30' }, { horaInicio: '19:30', horaFin: '21:00' }));
check('pisiendose se solapan', franjasSeSolapan({ horaInicio: '18:00', horaFin: '20:00' }, { horaInicio: '19:30', horaFin: '21:00' }));
check('contenida se solapa', franjasSeSolapan({ horaInicio: '18:00', horaFin: '22:00' }, { horaInicio: '19:30', horaFin: '21:00' }));
check('lista vacia da error', errorEnFranjas([]) !== null);
check('secuencia del seed valida', errorEnFranjas([
    { horaInicio: '18:00', horaFin: '19:30' },
    { horaInicio: '19:30', horaFin: '21:00' },
    { horaInicio: '21:00', horaFin: '22:30' },
]) === null);
check('error menciona el choque', (errorEnFranjas([
    { horaInicio: '18:00', horaFin: '20:00' },
    { horaInicio: '19:00', horaFin: '21:00' },
]) ?? '').includes('se pisan'));
check('error de formato', (errorEnFranjas([{ horaInicio: '8pm', horaFin: '21:00' }]) ?? '').includes('HH:mm'));
check('error de duracion', (errorEnFranjas([{ horaInicio: '21:00', horaFin: '19:30' }]) ?? '').includes('posterior'));
// Prorrateo del precio: la tarifa es por hora, el turno se cobra por su duracion.
check('6000/h en 90 min = 9000', precioDeFranja(6000, { horaInicio: '18:00', horaFin: '19:30' }) === 9000);
check('6000/h en 2 h = 12000', precioDeFranja(6000, { horaInicio: '18:00', horaFin: '20:00' }) === 12000);
check('6000/h en 45 min = 4500', precioDeFranja(6000, { horaInicio: '18:00', horaFin: '18:45' }) === 4500);
check('redondea los centavos', precioDeFranja(9999, { horaInicio: '18:00', horaFin: '19:30' }) === 14999);
check('franja invalida da 0', precioDeFranja(6000, { horaInicio: '20:00', horaFin: '18:00' }) === 0);
if (fallos > 0) {
    console.error(`\n${fallos} prueba(s) fallaron.`);
    process.exit(1);
}
console.log('\nTodo OK.');
