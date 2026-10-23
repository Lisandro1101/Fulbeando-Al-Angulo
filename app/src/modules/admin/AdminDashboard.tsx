import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  query,
  Timestamp,
  where,
  type CollectionReference,
  type Query,
} from 'firebase/firestore'
import { Loader2, LogOut } from 'lucide-react'
import { esEmailSuperadmin, type Predio, type Reporte, type SolicitudDueno } from '@/domain'
import { cerrarSesion } from '@/modules/auth/servicio'
import { useSesion } from '@/modules/auth/useSesion'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { aDate } from '@/core/firestore'
import {
  aprobarSolicitud,
  listarSolicitudes,
  rechazarSolicitud,
} from '@/modules/solicitudes/repositorio'
import { listarPrediosParaVerificar, verificarPredio } from '@/modules/predios/repositorio'
import { listarReportesAbiertos } from '@/modules/reportes/repositorio'
import { ImportadorDatos } from '@/modules/admin/pantallas/ImportadorDatos'
import { GestionSponsors } from './GestionSponsors'

/**
 * Conteo sin bajar los documentos. Devuelve `null` (y no rompe la pantalla)
 * si las reglas dejan sin contar alguna coleccion.
 */
const contar = async (ref: CollectionReference | Query): Promise<number | null> => {
  try {
    return (await getCountFromServer(ref)).data().count
  } catch (err) {
    console.error('No pude contar:', err)
    return null
  }
}

/** `null` (conteo rechazado) se muestra como guion, nunca como cero inventado. */
const n = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : String(v)

/** Nombre o email del usuario reportado, para que la tabla no muestre un uid crudo. */
const nombreDe = async (uid: string): Promise<string> => {
  try {
    const snap = await getDoc(doc(collection(db, COLECCIONES.usuarios), uid))
    if (!snap.exists()) return uid
    const u = snap.data() as { nombre?: string; apellido?: string; email?: string }
    const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
    return nombre || u.email || uid
  } catch (err) {
    console.error('No pude resolver el usuario reportado:', err)
    return uid
  }
}

/** `aDate` devuelve Date|null: en JSX hace falta un string. */
const fecha = (valor: unknown): string => {
  const d = aDate(valor)
  return d ? d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—'
}

/**
 * Dashboard del superadmin. Mantiene el diseno original (sidebar oscuro, KPI
 * grid y Sala de Arbitraje) con los numeros que vienen de Firestore: en
 * desarrollo, del emulador.
 */
export const AdminDashboard = () => {
  const sesion = useSesion()
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState<SolicitudDueno[]>([])
  const [predios, setPredios] = useState<Predio[]>([])
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [nombresReportados, setNombresReportados] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [metricas, setMetricas] = useState<{
    usuarios: number | null
    usuariosSemana: number | null
    partidos: number | null
    prediosOk: number | null
  } | null>(null)

  const esSuperadmin = sesion.actor?.rol === 'superadmin' || esEmailSuperadmin(sesion.user?.email)

  const salir = async () => {
    await cerrarSesion()
    navigate('/login')
  }

  const cargar = useCallback(async () => {
    if (!esSuperadmin) return
    setOcupado(true)
    try {
      const hace7d = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [cola, aVerificar, abiertos, usuarios, usuariosSemana, partidos, prediosOk] =
        await Promise.all([
          listarSolicitudes('pendiente'),
          listarPrediosParaVerificar(),
          listarReportesAbiertos(),
          contar(collection(db, COLECCIONES.usuarios)),
          contar(query(collection(db, COLECCIONES.usuarios), where('createdAt', '>=', hace7d))),
          contar(collection(db, COLECCIONES.partidos)),
          contar(query(collection(db, COLECCIONES.predios), where('verificado', '==', true))),
        ])
      const nombres = await Promise.all(abiertos.map((r) => nombreDe(r.usuarioReportadoUid)))
      const mapa: Record<string, string> = {}
      abiertos.forEach((r, i) => (mapa[r.usuarioReportadoUid] = nombres[i] ?? r.usuarioReportadoUid))

      setSolicitudes(cola)
      setPredios(aVerificar)
      setReportes(abiertos)
      setNombresReportados(mapa)
      setMetricas({ usuarios, usuariosSemana, partidos, prediosOk })
      setError(null)
    } catch (err) {
      console.error('Error al cargar el dashboard del superadmin:', err)
      setError(err instanceof Error ? err.message : 'No pudimos cargar las metricas.')
    } finally {
      setOcupado(false)
    }
  }, [esSuperadmin])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const aprobar = async (s: SolicitudDueno) => {
    setOcupado(true)
    try {
      await aprobarSolicitud(s.uid, sesion.actor?.uid ?? 'superadmin')
      setSolicitudes((prev) => prev.filter((x) => x.uid !== s.uid))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No pude aprobar la solicitud.')
    } finally {
      setOcupado(false)
    }
  }

  const rechazar = async (s: SolicitudDueno) => {
    setOcupado(true)
    try {
      await rechazarSolicitud(s.uid, sesion.actor?.uid ?? 'superadmin', motivo.trim())
      setSolicitudes((prev) => prev.filter((x) => x.uid !== s.uid))
      setRechazando(null)
      setMotivo('')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No pude rechazar la solicitud.')
    } finally {
      setOcupado(false)
    }
  }

  const verificar = async (p: Predio) => {
    setOcupado(true)
    try {
      await verificarPredio(p.id, true)
      setPredios((prev) => prev.filter((x) => x.id !== p.id))
      setMetricas((m) => (m ? { ...m, prediosOk: m.prediosOk === null ? null : m.prediosOk + 1 } : m))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No pude verificar el predio.')
    } finally {
      setOcupado(false)
    }
  }

  if (!esSuperadmin) return null

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente')

  return (
    <div className="h-full bg-[#05080E] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar B2B */}
      <aside className="w-full md:w-64 bg-gradient-to-b from-[#361982] via-[#281165] to-[#1c0a48] border-r border-[#4c24b2]/40 p-6 flex flex-col shadow-2xl">
        <h1 className="text-2xl font-black italic tracking-tighter text-white mb-8">
          AL ÁNGULO <span className="text-emerald-400 text-sm font-bold tracking-normal not-italic ml-1">ADMIN</span>
        </h1>
        <nav className="flex-1 space-y-2 text-sm font-medium">
          <a href="#vision-general" className="flex items-center text-emerald-300 font-bold bg-white/10 px-4 py-3 rounded-xl border-l-4 border-emerald-400 shadow-sm shadow-emerald-400/20">
            📊 Visión General
          </a>
          <a href="#sponsors" className="flex items-center text-indigo-200 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-xl transition-colors">
            ⭐ Publicidad & Sponsors
          </a>
          <a href="#arbitraje" className="flex items-center text-indigo-200 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-xl transition-colors">
            ⚖️ Sala de Arbitraje ({reportes.length})
          </a>
          <a href="#predios" className="flex items-center text-indigo-200 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-xl transition-colors">
            🏟️ Canchas / B2B ({predios.length})
          </a>
          <a href="#datos" className="flex items-center text-indigo-200 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-xl transition-colors">
            📥 Importar datos
          </a>
        </nav>

        {/* Botón Cerrar Sesión */}
        <button
          type="button"
          onClick={() => void salir()}
          className="mt-6 flex items-center gap-2 border border-[#4c24b2]/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-indigo-200 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Panel de Control General</h2>
            <p className="text-gray-400 text-sm mt-1">
              Metricas clave leidas en vivo de Firestore (en desarrollo, del emulador).
            </p>
          </div>
          {ocupado && <Loader2 className="h-5 w-5 animate-spin text-neon-green" />}
        </header>

        {error && (
          <p className="mb-6 border border-red-600 bg-red-600/20 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* KPI Grid: mismo modulo de siempre, con conteos reales */}
        <div
          id="vision-general"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
        >
          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Usuarios Totales
            </p>
            <p className="text-3xl font-black">{n(metricas?.usuarios)}</p>
            <p className="text-xs text-neon-green mt-2">
              +{n(metricas?.usuariosSemana)} esta semana
            </p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Partidos Jugados
            </p>
            <p className="text-3xl font-black">{n(metricas?.partidos)}</p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Reportes abiertos
            </p>
            <p className="text-3xl font-black">{reportes.length}</p>
            <p className="text-xs text-red-500 mt-2">Accion requerida urgente</p>
          </div>

          <div className="bg-pitch-900 border border-pitch-700 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Predios verificados
            </p>
            <p className="text-3xl font-black">{n(metricas?.prediosOk)}</p>
            <p className="text-xs text-purple-400 mt-2">{predios.length} sin verificar</p>
          </div>
        </div>

        {/* Gestión de Publicidad Nativa & Sponsors */}
        <GestionSponsors />

        {/* Importador de datos de prueba: sube el Excel y lo carga via la
            Cloud Function callable (Admin SDK), sin pelear con las rules. */}
        <ImportadorDatos />

        {/* Tabla de Arbitraje: ahora con los reportes abiertos reales */}
        <section
          id="arbitraje"
          className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Sala de Arbitraje</h3>
            <span className="text-sm text-gray-400">{reportes.length} reportes abiertos</span>
          </div>

          {reportes.length === 0 ? (
            <p className="text-sm text-gray-500">
              Sin reportes abiertos. Aca aparecen las denuncias que hacen los usuarios.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-pitch-700 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="pb-4 font-semibold">Report ID</th>
                    <th className="pb-4 font-semibold">Reportado</th>
                    <th className="pb-4 font-semibold">Categoria</th>
                    <th className="pb-4 font-semibold">Conflicto</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {reportes.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-pitch-800 hover:bg-pitch-800/50 transition-colors"
                    >
                      <td className="py-4 text-gray-500 font-mono text-xs">{r.id}</td>
                      <td className="py-4 font-bold">
                        {nombresReportados[r.usuarioReportadoUid] ?? r.usuarioReportadoUid}
                      </td>
                      <td className="py-4 text-gray-400">{r.categoria}</td>
                      <td className="py-4 text-red-400">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Colas de trabajo del superadmin: aca se activan los planes y se
            verifican los predios (sin esto nadie puede entrar al panel dueno). */}
        <section
          id="solicitudes"
          className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Solicitudes de dueno ({pendientes.length})</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Aprobar activa el plan del dueno: recien ahi puede entrar a su panel.
          </p>

          {pendientes.length === 0 ? (
            <p className="text-sm text-gray-500">No hay solicitudes esperando.</p>
          ) : (
            <ul className="space-y-3">
              {pendientes.map((s) => (
                <li key={s.uid} className="border border-pitch-700 bg-[#05080E] rounded-lg p-4">
                  <p className="font-bold">
                    {s.nombre} {s.apellido}{' '}
                    <span className="font-mono text-xs font-normal text-gray-500">{s.email}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    {s.nombrePredio} · {s.barrio}, {s.ciudad} · alta {fecha(s.createdAt)}
                  </p>
                  {s.mensaje && <p className="mt-1 text-sm text-gray-500">"{s.mensaje}"</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void aprobar(s)}
                      disabled={ocupado}
                      className="bg-neon-green text-black px-3 py-1.5 rounded text-xs font-bold transition-colors hover:brightness-110 disabled:opacity-50"
                    >
                      Activar plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRechazando(rechazando === s.uid ? null : s.uid)
                        setMotivo('')
                      }}
                      disabled={ocupado}
                      className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>

                  {rechazando === s.uid && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        aria-label="Motivo del rechazo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Motivo (lo ve el usuario)"
                        className="min-w-0 flex-1 bg-pitch-800 border border-pitch-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => void rechazar(s)}
                        disabled={ocupado || motivo.trim().length === 0}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRechazando(null)
                          setMotivo('')
                        }}
                        className="text-gray-400 hover:text-white px-3 py-1.5 text-xs font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="predios"
          className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Predios sin verificar ({predios.length})</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Un predio verificado es el unico que aparece en el mapa y acepta reservas.
          </p>

          {predios.length === 0 ? (
            <p className="text-sm text-gray-500">No hay predios esperando verificacion.</p>
          ) : (
            <ul className="space-y-3">
              {predios.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-pitch-700 bg-[#05080E] rounded-lg p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold">{p.nombre}</p>
                    <p className="text-sm text-gray-400">
                      {p.direccion} · {p.barrio} · alta {fecha(p.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void verificar(p)}
                    disabled={ocupado}
                    className="bg-neon-green text-black px-3 py-1.5 rounded text-xs font-bold transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    Verificar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ImportadorDatos />
      </main>
    </div>
  )
}
