import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import type { Cancha, TipoCancha, TipoSuperficie, TarifasDiferenciadas } from '@/domain'
import { TIPOS_CANCHA, TIPOS_SUPERFICIE } from '@/domain'
import { formatearMoneda } from '@/core/tiempo'
import {
  actualizarCancha,
  crearCancha,
  listarTodasLasCanchas,
} from '@/modules/canchas/repositorio'
import { optimizeAvatarImage } from '@/imageCompressor'
import { uploadImageToR2 } from '@/uploader'

const NOMBRE_VACIO = ''

export function GestorCanchas({
  predioId,
  onCambio,
}: {
  predioId: string
  onCambio: () => void | Promise<void>
}) {
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setCanchas(await listarTodasLasCanchas(predioId))
      setError(null)
    } catch {
      setError('No pudimos cargar las canchas.')
    } finally {
      setCargando(false)
    }
  }, [predioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = async (alta: {
    nombre: string
    tipo: TipoCancha
    techada: boolean
    precioHora: number
    fotos?: string[]
    iluminacion?: boolean
    tipoSuperficie?: TipoSuperficie
    tarifas?: TarifasDiferenciadas
  }) => {
    setGuardando(true)
    setError(null)
    try {
      await crearCancha(predioId, alta)
      await cargar()
      await onCambio()
      setMostrarAlta(false)
    } catch {
      setError('No pudimos crear la cancha.')
    } finally {
      setGuardando(false)
    }
  }

  const editar = async (canchaId: string, cambios: Partial<Cancha>) => {
    setGuardando(true)
    setError(null)
    try {
      await actualizarCancha(predioId, canchaId, cambios)
      await cargar()
      await onCambio()
    } catch {
      setError('No pudimos guardar los cambios de la cancha.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="grid h-28 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-400 font-semibold">
          {error}
        </p>
      )}

      {canchas.length === 0 && !mostrarAlta ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-black text-white">Este predio todavía no tiene canchas</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Configurá las canchas con sus fotos reales (césped, iluminación, techada) y tarifas diferenciadas día/noche para habilitar la grilla.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarAlta(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition cursor-pointer text-sm shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Agregar primera cancha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {canchas.map((cancha) => (
            <div key={cancha.id}>
              {editando === cancha.id ? (
                <FormularioCancha
                  initial={cancha}
                  onCancelar={() => setEditando(null)}
                  onGuardar={async (cambios) => {
                    await editar(cancha.id, cambios)
                    setEditando(null)
                  }}
                />
              ) : (
                <TarjetaCanchaVisual
                  cancha={cancha}
                  onEditar={() => setEditando(cancha.id)}
                  onToggleActiva={() => void editar(cancha.id, { activa: !cancha.activa })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botón / Formulario de Alta de nueva cancha */}
      {canchas.length > 0 && !mostrarAlta && (
        <button
          type="button"
          onClick={() => setMostrarAlta(true)}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-900/40 hover:bg-zinc-800/60 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Agregar otra cancha al predio
        </button>
      )}

      {mostrarAlta && (
        <div className="pt-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
            <h3 className="text-sm font-black text-white">Nueva Cancha</h3>
            <button
              type="button"
              onClick={() => setMostrarAlta(false)}
              className="text-xs text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
          <FormularioCancha
            onCancelar={() => setMostrarAlta(false)}
            onGuardar={async (alta) => {
              await crear(alta)
            }}
          />
        </div>
      )}

      {canchas.length > 0 && (
        <p className="text-[11px] text-zinc-500 font-medium">
          💡 Desactivar una cancha no borra turnos pasados ni estadísticas: simplemente no se ofrecerá para nuevas reservas.
        </p>
      )}

      {guardando && (
        <p className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> Guardando cambios en el predio...
        </p>
      )}
    </div>
  )
}

/**
 * Tarjeta visual de resumen de cancha con foto de cabecera y badges de características
 */
function TarjetaCanchaVisual({
  cancha,
  onEditar,
  onToggleActiva,
}: {
  cancha: Cancha
  onEditar: () => void
  onToggleActiva: () => void
}) {
  const tieneFotos = cancha.fotos && cancha.fotos.length > 0
  const fotoPortada = tieneFotos ? cancha.fotos![0] : null
  const supInfo = TIPOS_SUPERFICIE.find((s) => s.id === cancha.tipoSuperficie)
  const tarifas = cancha.tarifas

  return (
    <div
      className={`rounded-2xl border transition overflow-hidden ${
        cancha.activa
          ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700/80 shadow-md'
          : 'bg-canvas border-zinc-800/50 opacity-60'
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Foto de la cancha */}
        <div className="relative w-full sm:w-44 h-32 sm:h-auto bg-canvas shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-800/80">
          {fotoPortada ? (
            <img
              src={fotoPortada}
              alt={cancha.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-zinc-600 bg-canvas/80">
              <Camera className="h-7 w-7 mb-1 opacity-50" />
              <span className="text-[11px] font-bold text-zinc-500">Sin fotos</span>
            </div>
          )}
          {tieneFotos && cancha.fotos!.length > 1 && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-black text-white border border-white/10">
              +{cancha.fotos!.length - 1} fotos
            </span>
          )}
        </div>

        {/* Información y características */}
        <div className="p-4 flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-black text-white tracking-tight truncate">
                  {cancha.nombre}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                    {cancha.tipo}
                  </span>
                  {supInfo && (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold">
                      {supInfo.emoji} {supInfo.etiqueta}
                    </span>
                  )}
                  {cancha.techada && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-semibold">
                      🌧️ Techada
                    </span>
                  )}
                  {cancha.iluminacion && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                      💡 Iluminación LED
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Editar ${cancha.nombre}`}
                  title="Editar cancha"
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 transition cursor-pointer"
                  onClick={onEditar}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    cancha.activa
                      ? 'bg-zinc-800/80 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-400 border-zinc-700/80 hover:border-rose-500/40'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                  }`}
                  onClick={onToggleActiva}
                >
                  {cancha.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>

            {/* Esquema de tarifas */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-zinc-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>
                  Base/Día: <strong className="text-white font-mono">{formatearMoneda(cancha.precioHora)}</strong>
                </span>
              </div>
              {tarifas?.precioNoche ? (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Moon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Noche ({tarifas.horaInicioNoche || '19:00'}):{' '}
                    <strong className="text-emerald-400 font-mono">{formatearMoneda(tarifas.precioNoche)}</strong>
                  </span>
                </div>
              ) : (
                <div className="text-zinc-500">Tarifa noche no fijada</div>
              )}
              {tarifas?.precioFinde ? (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>
                    Finde:{' '}
                    <strong className="text-emerald-400 font-mono">{formatearMoneda(tarifas.precioFinde)}</strong>
                  </span>
                </div>
              ) : (
                <div className="text-zinc-500">Tarifa finde estándar</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Formulario completo para alta o edición de Cancha
 */
function FormularioCancha({
  initial,
  onGuardar,
  onCancelar,
}: {
  initial?: Cancha
  onGuardar: (cambios: {
    nombre: string
    tipo: TipoCancha
    techada: boolean
    precioHora: number
    fotos?: string[]
    iluminacion?: boolean
    tipoSuperficie?: TipoSuperficie
    tarifas?: TarifasDiferenciadas
  }) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? NOMBRE_VACIO)
  const [tipo, setTipo] = useState<TipoCancha>(initial?.tipo ?? 'F5')
  const [techada, setTechada] = useState(initial?.techada ?? false)
  const [iluminacion, setIluminacion] = useState(initial?.iluminacion ?? true)
  const [tipoSuperficie, setTipoSuperficie] = useState<TipoSuperficie>(
    initial?.tipoSuperficie ?? 'sintetico',
  )
  const [precio, setPrecio] = useState(String(initial?.precioHora ?? ''))

  // Fotos
  const [fotos, setFotos] = useState<string[]>(initial?.fotos ?? [])
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  // Tarifas diferenciadas
  const [activarTarifaNoche, setActivarTarifaNoche] = useState(
    Boolean(initial?.tarifas?.precioNoche),
  )
  const [precioNoche, setPrecioNoche] = useState(
    initial?.tarifas?.precioNoche ? String(initial.tarifas.precioNoche) : '',
  )
  const [horaInicioNoche, setHoraInicioNoche] = useState(
    initial?.tarifas?.horaInicioNoche ?? '19:00',
  )

  const [activarTarifaFinde, setActivarTarifaFinde] = useState(
    Boolean(initial?.tarifas?.precioFinde),
  )
  const [precioFinde, setPrecioFinde] = useState(
    initial?.tarifas?.precioFinde ? String(initial.tarifas.precioFinde) : '',
  )

  const [tocado, setTocado] = useState(false)

  // Validación
  const nombreOk = nombre.trim().length >= 3
  const precioNum = Number(precio)
  const precioOk = Number.isFinite(precioNum) && precioNum > 0
  const completo = nombreOk && precioOk

  // Manejo de subida y compresión de fotos de la cancha
  const manejarSubidaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files
    if (!archivos || archivos.length === 0) return

    setSubiendoFoto(true)
    setErrorFoto(null)

    try {
      const urlsNuevas: string[] = []
      for (const archivo of Array.from(archivos)) {
        if (!archivo.type.startsWith('image/')) continue

        // Comprimir en cliente manteniendo proporción de aspecto
        const blobComprimido = await optimizeAvatarImage(archivo, {
          maxSize: 1024,
          quality: 0.82,
          recortarCuadrado: false,
        })

        // Subir a storage
        const resultado = await uploadImageToR2(
          blobComprimido,
          archivo.name,
          'canchas',
          () => {}
        )
        urlsNuevas.push(resultado.publicUrl)
      }

      setFotos((prev) => [...prev, ...urlsNuevas])
    } catch (err: unknown) {
      console.error('[GestorCanchas] Error al subir foto:', err)
      setErrorFoto('No se pudo subir la foto de la cancha. Verificá tu conexión y probá de nuevo.')
    } finally {
      setSubiendoFoto(false)
      if (inputArchivoRef.current) inputArchivoRef.current.value = ''
    }
  }

  const removerFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  const hacerFotoPortada = (index: number) => {
    if (index === 0) return
    setFotos((prev) => {
      const copia = [...prev]
      const item = copia[index]
      if (!item) return prev
      copia.splice(index, 1)
      copia.unshift(item)
      return copia
    })
  }

  return (
    <form
      className="space-y-4 rounded-2xl bg-zinc-900 border border-zinc-700/90 p-4 sm:p-5 text-zinc-100 shadow-xl"
      onSubmit={async (e) => {
        e.preventDefault()
        setTocado(true)
        if (!completo) return

        const tarifas: TarifasDiferenciadas = {}
        if (activarTarifaNoche && Number(precioNoche) > 0) {
          tarifas.precioNoche = Math.round(Number(precioNoche))
          tarifas.horaInicioNoche = horaInicioNoche || '19:00'
        }
        if (activarTarifaFinde && Number(precioFinde) > 0) {
          tarifas.precioFinde = Math.round(Number(precioFinde))
        }

        await onGuardar({
          nombre: nombre.trim(),
          tipo,
          techada,
          iluminacion,
          tipoSuperficie,
          precioHora: Math.round(precioNum),
          fotos,
          tarifas,
        })

        if (!initial) {
          setNombre(NOMBRE_VACIO)
          setPrecio('')
          setFotos([])
          setTocado(false)
        }
      }}
    >
      {/* 1. Nombre y Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-zinc-300" htmlFor="cancha-nombre">
            Nombre identificatorio de la cancha
          </label>
          <input
            id="cancha-nombre"
            className="w-full rounded-xl border border-zinc-700 bg-canvas px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-pitch focus:ring-1 focus:ring-pitch outline-none transition"
            placeholder="Ej: Cancha 1 - Sintético Pro"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          {tocado && !nombreOk && (
            <p className="mt-1 text-xs text-rose-400 font-semibold">Ponele un nombre de al menos 3 letras.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-300" htmlFor="cancha-tipo">
            Formato / Jugadores
          </label>
          <select
            id="cancha-tipo"
            className="w-full rounded-xl border border-zinc-700 bg-canvas px-3 py-2.5 text-sm text-white focus:border-pitch focus:ring-1 focus:ring-pitch outline-none transition cursor-pointer"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCancha)}
          >
            {TIPOS_CANCHA.map((t) => (
              <option key={t} value={t}>
                {t} ({t === 'F5' ? '5 vs 5' : t === 'F7' ? '7 vs 7' : t === 'F8' ? '8 vs 8' : '11 vs 11'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Características Físicas (Superficie, Techada, Iluminación) */}
      <div className="rounded-xl bg-canvas/70 border border-zinc-800 p-3.5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
          Equipamiento y Superficie
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300" htmlFor="cancha-superficie">
              Tipo de suelo / césped
            </label>
            <select
              id="cancha-superficie"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none cursor-pointer"
              value={tipoSuperficie}
              onChange={(e) => setTipoSuperficie(e.target.value as TipoSuperficie)}
            >
              {TIPOS_SUPERFICIE.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6 pt-2 sm:pt-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={techada}
                onChange={(e) => setTechada(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 cursor-pointer"
              />
              <span>🌧️ Techada</span>
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={iluminacion}
                onChange={(e) => setIluminacion(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 accent-emerald-500 cursor-pointer"
              />
              <span>💡 Luz LED</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Fotos Reales de la Cancha */}
      <div className="rounded-xl bg-canvas/ border border-zinc-800 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Fotos Reales de la Cancha
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Subí fotos del césped, arcos e iluminación para que los jugadores conozcan la cancha.
            </p>
          </div>

          <input
            ref={inputArchivoRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={manejarSubidaFoto}
          />
          <button
            type="button"
            disabled={subiendoFoto}
            onClick={() => inputArchivoRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition cursor-pointer disabled:opacity-50"
          >
            {subiendoFoto ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>{subiendoFoto ? 'Subiendo...' : 'Subir fotos'}</span>
          </button>
        </div>

        {errorFoto && (
          <p className="text-xs text-rose-400 font-semibold">{errorFoto}</p>
        )}

        {fotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {fotos.map((urlFoto, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 aspect-video flex items-center justify-center"
              >
                <img
                  src={urlFoto}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow">
                    Portada
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => hacerFotoPortada(idx)}
                      title="Establecer como foto principal"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500 text-white hover:text-zinc-950 transition text-xs"
                    >
                      Portada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removerFoto(idx)}
                    title="Eliminar foto"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center">
            <ImageIcon className="h-6 w-6 text-zinc-600 mx-auto mb-1" />
            <p className="text-xs text-zinc-500 font-medium">Aún no se cargaron fotos para esta cancha.</p>
          </div>
        )}
      </div>

      {/* 4. Tarifas Diferenciadas (Día, Noche y Fines de Semana) */}
      <div className="rounded-xl bg-canvas/ border border-zinc-800 p-3.5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
          Configuración de Precios y Tarifas
        </p>

        {/* Precio Base */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300" htmlFor="cancha-precio-base">
              Tarifa estándar / Día ($)
            </label>
            <input
              id="cancha-precio-base"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-white font-mono font-bold focus:border-emerald-500 outline-none transition"
              type="number"
              min={0}
              step={500}
              placeholder="Ej: 20000"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            {tocado && !precioOk && (
              <p className="mt-1 text-xs text-rose-400 font-semibold">El precio base debe ser mayor a 0.</p>
            )}
          </div>

          {/* Tarifa Nocturna */}
          <div className="sm:col-span-2 border border-zinc-800/80 rounded-xl p-3 bg-zinc-900/40">
            <label className="flex items-center justify-between text-xs font-bold text-zinc-200 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Tarifa nocturna diferenciada (con reflectores)</span>
              </span>
              <input
                type="checkbox"
                checked={activarTarifaNoche}
                onChange={(e) => setActivarTarifaNoche(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 accent-indigo-500 cursor-pointer"
              />
            </label>

            {activarTarifaNoche && (
              <div className="grid grid-cols-2 gap-2.5 mt-2.5 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    A partir de las:
                  </label>
                  <input
                    type="time"
                    value={horaInicioNoche}
                    onChange={(e) => setHoraInicioNoche(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Tarifa Noche ($):
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="Ej: 25000"
                    value={precioNoche}
                    onChange={(e) => setPrecioNoche(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tarifa Fin de Semana */}
        <div className="border border-zinc-800/80 rounded-xl p-3 bg-zinc-900/40">
          <label className="flex items-center justify-between text-xs font-bold text-zinc-200 cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>Tarifa especial para Fin de Semana (Sábados, Domingos y Feriados)</span>
            </span>
            <input
              type="checkbox"
              checked={activarTarifaFinde}
              onChange={(e) => setActivarTarifaFinde(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 accent-purple-500 cursor-pointer"
            />
          </label>

          {activarTarifaFinde && (
            <div className="mt-2.5 pt-2 border-t border-zinc-800 max-w-xs">
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Tarifa Fin de Semana ($):
              </label>
              <input
                type="number"
                min={0}
                step={500}
                placeholder="Ej: 28000"
                value={precioFinde}
                onChange={(e) => setPrecioFinde(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-purple-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* Botones de Guardar / Cancelar */}
      <div className="flex gap-2.5 pt-2">
        <button
          type="submit"
          className="flex-1 py-3 px-4 rounded-xl font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer text-sm disabled:opacity-40"
          disabled={tocado && !completo}
        >
          {initial ? 'Guardar cambios de la cancha' : 'Crear y habilitar cancha'}
        </button>
        <button
          type="button"
          className="px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer text-sm"
          onClick={onCancelar}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
