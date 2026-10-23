export type UbicacionAnuncio = 'muro' | 'tercer_tiempo' | 'radar' | 'global'

export interface AnuncioSponsor {
  id: string
  nombreSponsor: string
  titulo: string
  descripcion: string
  imagenUrl: string
  logoUrl?: string
  enlaceDestino: string
  textoBoton: string
  etiquetaBadge?: string
  ubicacion: UbicacionAnuncio
  zona?: string | null
  activo: boolean
  clicks: number
  vistas: number
  creadoEn: number
  actualizadoEn?: number
}

/**
 * Normaliza URLs de imágenes de servicios como Google Drive, Dropbox, etc.
 * En Google Drive, transforma URLs de visualización pública (/file/d/ID/view o id=ID)
 * al CDN directo de Google (lh3.googleusercontent.com/d/ID) para renderizarse en <img>.
 */
export function normalizarUrlImagen(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()

  // Google Drive: /file/d/<id>
  const matchFileD = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
  if (matchFileD && matchFileD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`
  }

  // Google Drive: /open?id=<id> o /uc?id=<id>
  const matchId = trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i)
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`
  }

  // Google Docs: /file/d/<id>
  const matchDocs = trimmed.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
  if (matchDocs && matchDocs[1]) {
    return `https://lh3.googleusercontent.com/d/${matchDocs[1]}`
  }

  // Dropbox: dl=0 -> raw=1
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1')
  }

  return trimmed
}

/**
 * Normaliza cualquier enlace de destino externo (web, WhatsApp, Instagram, etc.).
 * Si el usuario no ingresó el protocolo http(s)://, lo agrega automáticamente
 * para evitar que el navegador lo trate como una ruta relativa local (ej. localhost:5173/wa.me/...).
 */
export function normalizarEnlaceDestino(enlace: string | undefined | null): string {
  if (!enlace) return ''
  const trimmed = enlace.trim()

  // Si ya es un protocolo absoluto válido
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  // Si empieza con 'wa.me/' o 'api.whatsapp.com/'
  if (/^(wa\.me|api\.whatsapp\.com)\//i.test(trimmed)) {
    return `https://${trimmed}`
  }

  // Si parece un número de teléfono (solo números, espacios, guiones o un '+' inicial)
  const soloNumeros = trimmed.replace(/[^0-9]/g, '')
  const esTelefono = /^\+?[0-9\s-]{7,20}$/.test(trimmed) && soloNumeros.length >= 7
  if (esTelefono) {
    let telefonoFormateado = soloNumeros
    // Si es formato argentino de 10 dígitos (ej: 1123456789), anteponer 549
    if (telefonoFormateado.length === 10 && telefonoFormateado.startsWith('11')) {
      telefonoFormateado = `549${telefonoFormateado}`
    } else if (telefonoFormateado.startsWith('54') && !telefonoFormateado.startsWith('549')) {
      telefonoFormateado = `549${telefonoFormateado.slice(2)}`
    }
    return `https://wa.me/${telefonoFormateado}`
  }

  // Para cualquier otro enlace externo (ej: instagram.com/..., mipagina.com)
  return `https://${trimmed}`
}


