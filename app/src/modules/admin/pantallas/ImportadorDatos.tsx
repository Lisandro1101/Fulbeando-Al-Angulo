import { useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { functions } from '@/core/firebase'

/**
 * Importador de datos de prueba (superadmin).
 *
 * Sube el Excel generado por `npm run datos:generar` y lo carga en Firestore
 * llamando a la Cloud Function callable `importarDatos`. Esa funcion corre con
 * Admin SDK y es la unica via valida desde el navegador: las `firestore.rules`
 * no dejan que un cliente cree usuarios, predios de terceros ni challenges.
 *
 * El parseo del .xlsx (SheetJS) es 100% en el cliente: a la funcion viaja el
 * JSON ya volcado, no el binario.
 */

type Fila = Record<string, unknown>
type Hojas = Record<string, Fila[]>

interface ResumenImportacion {
  usuarios: number
  solicitudes: number
  predios: number
  canchas: number
  equipos: number
  desafios: number
  partidos: number
  postulaciones: number
  reportes: number
  errores: string[]
}

async function parsearBuffer(buffer: ArrayBuffer): Promise<Hojas> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const hojas: Hojas = {}
  for (const nombre of wb.SheetNames) {
    const ws = wb.Sheets[nombre]
    if (!ws) continue
    hojas[nombre] = XLSX.utils.sheet_to_json<Fila>(ws, { defval: '' })
  }
  return hojas
}

async function parsearArchivo(archivo: File): Promise<Hojas> {
  return parsearBuffer(await archivo.arrayBuffer())
}

export const ImportadorDatos = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
  const [hojas, setHojas] = useState<Hojas | null>(null)
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarPredeterminado = async () => {
    setOcupado(true)
    setError(null)
    setResumen(null)
    try {
      const resp = await fetch('/datos-prueba.xlsx')
      if (!resp.ok) throw new Error('No se pudo descargar el archivo de datos de prueba predeterminado.')
      const buf = await resp.arrayBuffer()
      const parseadas = await parsearBuffer(buf)
      setHojas(parseadas)
      setNombreArchivo('datos-prueba.xlsx (incluido)')
    } catch (err) {
      console.error('No pude cargar el Excel predeterminado:', err)
      setError(err instanceof Error ? err.message : 'No pude cargar el archivo predeterminado.')
      setHojas(null)
      setNombreArchivo(null)
    } finally {
      setOcupado(false)
    }
  }

  const elegir = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    setOcupado(true)
    setError(null)
    setResumen(null)
    try {
      const parseadas = await parsearArchivo(archivo)
      setHojas(parseadas)
      setNombreArchivo(archivo.name)
    } catch (err) {
      console.error('No pude leer el Excel:', err)
      setError(err instanceof Error ? err.message : 'No pude leer el archivo.')
      setHojas(null)
      setNombreArchivo(null)
    } finally {
      setOcupado(false)
    }
  }

  const importar = async () => {
    if (!hojas) return
    setOcupado(true)
    setError(null)
    try {
      const llamar = httpsCallable<{ hojas: Hojas }, ResumenImportacion>(
        functions,
        'importarDatos',
      )
      const { data } = await llamar({ hojas })
      setResumen(data)
    } catch (err) {
      console.error('Error al importar:', err)
      setError(err instanceof Error ? err.message : 'No pude importar los datos.')
    } finally {
      setOcupado(false)
    }
  }

  const totalFilas = hojas
    ? Object.values(hojas).reduce((acc, filas) => acc + filas.length, 0)
    : 0

  return (
    <section
      id="datos"
      className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6 mb-6"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-neon-green" />
          Importador de datos de prueba
        </h3>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Subí <span className="font-mono text-gray-300">scripts/datos-prueba/datos-prueba.xlsx</span>{' '}
        (generalo con <span className="font-mono text-gray-300">npm run datos:generar</span>). La carga
        es idempotente: reimportar no duplica.
      </p>

      <input
        aria-label="Archivo Excel (.xlsx)"
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => void elegir(e)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void cargarPredeterminado()}
          disabled={ocupado}
          className="border border-neon-green/40 bg-neon-green/10 px-4 py-2 text-sm font-semibold text-neon-green transition-colors hover:bg-neon-green hover:text-black disabled:opacity-50"
        >
          <FileSpreadsheet className="mr-2 inline h-4 w-4" />
          Cargar datos-prueba.xlsx incluido
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={ocupado}
          className="border border-pitch-700 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-pitch-800 hover:text-white disabled:opacity-50"
        >
          <Upload className="mr-2 inline h-4 w-4" />
          Elegir otro archivo Excel
        </button>

        <a
          href="/datos-prueba.xlsx"
          download="datos-prueba.xlsx"
          className="text-xs text-gray-400 underline hover:text-white"
        >
          Descargar copia (.xlsx)
        </a>

        {nombreArchivo && (
          <span className="font-mono text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-1 rounded">
            {nombreArchivo} · {totalFilas} filas en {hojas ? Object.keys(hojas).length : 0} hojas
          </span>
        )}

        <button
          type="button"
          onClick={() => void importar()}
          disabled={ocupado || !hojas}
          className="bg-neon-green text-black px-4 py-2 text-sm font-bold transition-colors hover:brightness-110 disabled:opacity-50"
        >
          {ocupado ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
          Importar a la base
        </button>
      </div>

      {hojas && (
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(hojas).map(([nombre, filas]) => (
            <span
              key={nombre}
              className="rounded border border-pitch-700 bg-[#05080E] px-3 py-1 text-xs text-gray-300"
            >
              {nombre}: <span className="font-bold text-white">{filas.length}</span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 border border-red-600 bg-red-600/20 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {resumen && (
        <div className="mt-4 border border-neon-green/40 bg-neon-green/5 p-4 text-sm">
          <p className="font-bold text-neon-green mb-2">Importación completada</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-300 sm:grid-cols-3">
            <span>Usuarios: <b className="text-white">{resumen.usuarios}</b></span>
            <span>Solicitudes: <b className="text-white">{resumen.solicitudes}</b></span>
            <span>Predios: <b className="text-white">{resumen.predios}</b></span>
            <span>Canchas: <b className="text-white">{resumen.canchas}</b></span>
            <span>Equipos: <b className="text-white">{resumen.equipos}</b></span>
            <span>Desafíos: <b className="text-white">{resumen.desafios}</b></span>
            <span>Partidos: <b className="text-white">{resumen.partidos}</b></span>
            <span>Postulaciones: <b className="text-white">{resumen.postulaciones}</b></span>
            <span>Reportes: <b className="text-white">{resumen.reportes}</b></span>
          </div>
          {resumen.errores.length > 0 && (
            <div className="mt-3 border-t border-pitch-700 pt-3">
              <p className="text-xs font-semibold text-red-400 mb-1">
                {resumen.errores.length} errores:
              </p>
              <ul className="list-disc pl-5 text-xs text-red-300/90">
                {resumen.errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
