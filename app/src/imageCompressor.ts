/**
 * Parámetros de compresión dictados por la arquitectura.
 * 300x300 es el límite sugerido para mantener el peso bajo 35KB
 * sin pixelación evidente en dispositivos móviles modernos.
 */
export interface CompressionOptions {
  maxSize: number; 
  quality: number; // Rango de 0.0 a 1.0 (0.8 es el sweet-spot)
  /**
   * `true` (default): recorta al centro en 1:1 (avatares, escudos).
   * `false`: conserva la relación de aspecto original (fotos de posts), así la
   * imagen no se recorta al subir y se ve completa en el feed.
   */
  recortarCuadrado?: boolean;
}

/**
 * Promisifica la lectura nativa del objeto File a un elemento Imagen de HTML
 * y limpia la memoria inmediatamente después para prevenir memory leaks en celulares viejos.
 */
const loadImage = (file: File | Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url); // Fundamental para performance en mobile
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('[Al Ángulo] El archivo está corrupto o no es una imagen válida.'));
    };
    
    img.src = url;
  });
};

/**
 * Feature Detection: Verifica si el navegador soporta compresión WebP.
 * Por ejemplo, Safari viejo no lo soporta.
 */
const isWebPSupported = (): boolean => {
  const elem = document.createElement('canvas');
  if (!!(elem.getContext && elem.getContext('2d'))) {
    // Intentamos generar un payload WebP. Si el navegador falla silenciosamente, 
    // devolverá un PNG base64 estándar. Si tiene WebP, el string arrancará con data:image/webp
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

/**
 * MOTOR DE COMPRESIÓN DE IMÁGENES CLIENT-SIDE
 * Toma una foto de 8MB del carrete de la cámara y la transforma instantáneamente
 * en un WebP optimizado (<35 KB) puramente en el navegador.
 */
export const optimizeAvatarImage = async (
  file: File | Blob, 
  options: CompressionOptions = { maxSize: 300, quality: 0.8 }
): Promise<Blob> => {
  
  const img = await loadImage(file);
  const recortarCuadrado = options.recortarCuadrado ?? true;

  // 1. CÁLCULO DE DIMENSIONES DE DESTINO
  //   - Avatares (recortarCuadrado): recorte central 1:1 sin deformar.
  //   - Fotos de feed: se conserva el aspecto; el lado mayor se ajusta a
  //     `maxSize` y el otro queda proporcional. Nunca se agranda una imagen
  //     chica.
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  let destW: number;
  let destH: number;

  if (recortarCuadrado) {
    const minDimension = Math.min(img.width, img.height);
    sx = (img.width - minDimension) / 2;
    sy = (img.height - minDimension) / 2;
    sw = minDimension;
    sh = minDimension;
    destW = options.maxSize;
    destH = options.maxSize;
  } else {
    const escala = Math.min(1, options.maxSize / Math.max(img.width, img.height));
    destW = Math.max(1, Math.round(img.width * escala));
    destH = Math.max(1, Math.round(img.height * escala));
  }

  // 2. MOTOR RENDERIZADOR (Canvas Nativo)
  const canvas = document.createElement('canvas');
  canvas.width = destW;
  canvas.height = destH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('[Al Ángulo] Renderizador gráfico (Canvas) no soportado en este dispositivo.');
  }

  // Fondo negro puro de respaldo por si se carga una imagen con transparencias
  ctx.fillStyle = '#0B0F19'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. RECORTAR (si aplica) Y ESCALAR
  // Parámetros: (sourceImg, Source X, Source Y, Source W, Source H, Dest X, Dest Y, Dest W, Dest H)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);

  // 4. ESTRATEGIA DE FORMATO (WebP vs Fallback)
  const supportsWebP = isWebPSupported();
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
  
  // 5. EXTRACCIÓN Y DEFLACIÓN
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Devolvemos el archivo ultra comprimido, listo para inyectarse al Firebase Storage / R2
          resolve(blob);
        } else {
          reject(new Error('[Al Ángulo] Falló la compresión final del archivo.'));
        }
      },
      mimeType,
      options.quality // Nivel agresivo pero sin pérdida drástica de nitidez visual
    );
  });
};
