/**
 * Genera `scripts/datos-prueba/datos-prueba.xlsx` a partir del dataset tipado
 * de `data.ts`. Ese Excel es el insumo del importador (script o panel).
 *
 *   npm run datos:generar
 */

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { construirHojas } from './datos-prueba/data'

const SALIDA = resolve(process.cwd(), 'scripts/datos-prueba/datos-prueba.xlsx')

function main(): void {
  const hojas = construirHojas()
  const wb = XLSX.utils.book_new()

  for (const hoja of hojas) {
    // aoa: primera fila de encabezados + filas en el orden de `columnas`.
    const aoa: Array<Array<string | number>> = [hoja.columnas]
    for (const fila of hoja.filas) {
      aoa.push(hoja.columnas.map((col) => (fila[col] ?? '') as string | number))
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = hoja.columnas.map((col) => ({ wch: Math.max(col.length + 2, 12) }))
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre)
  }

  mkdirSync(dirname(SALIDA), { recursive: true })
  XLSX.writeFile(wb, SALIDA)

  const totalFilas = hojas.reduce((acc, h) => acc + h.filas.length, 0)
  console.log(`✅ Excel generado: ${SALIDA}`)
  console.log(`   ${hojas.length} hojas · ${totalFilas} filas en total`)
  for (const h of hojas) console.log(`     - ${h.nombre.padEnd(16)} ${h.filas.length} filas`)
}

main()
