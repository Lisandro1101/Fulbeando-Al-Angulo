import { toBlob } from 'html-to-image'

/**
 * Rasteriza un nodo del DOM (la carta del jugador) a PNG.
 *
 * Usa `html-to-image` en vez de html2canvas porque serializa el nodo en un
 * `<foreignObject>` y deja que el navegador lo dibuje: respeta los
 * `clip-path: url(#id)`, los gradientes y las fuentes que usa la ficha, que
 * son justo lo que html2canvas suele romper.
 *
 * Devuelve `null` si el navegador no pudo generar la imagen (por ejemplo, una
 * foto remota sin CORS): quien llama decide el fallback.
 */
export const generarImagenCarta = async (nodo: HTMLElement): Promise<Blob | null> => {
  try {
    return await toBlob(nodo, {
      pixelRatio: 2,
      cacheBust: true,
      // Fondo transparente: la silueta de la ficha ya viene del clip-path.
      backgroundColor: undefined,
    })
  } catch (err) {
    console.error('No se pudo generar la imagen de la carta:', err)
    return null
  }
}

/** Dispara la descarga de un blob en el navegador (fallback de escritorio). */
export const descargarBlob = (blob: Blob, nombreArchivo: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
