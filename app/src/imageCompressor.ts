/**
 * Parámetros de compresión dictados por la arquitectura.
 * 300x300 es el límite sugerido para mantener el peso bajo 35KB
 * sin pixelación evidente en dispositivos móviles modernos.
 */
export interface CompressionOptions {
  maxSize: number; 
  quality: number; // Rango de 0.0 a 1.0 (0.8 es el sweet-spot)
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
  
  // 1. CÁLCULO DE CROPPER (Formato 1:1 - Cuadrado Perfecto)
  // Obtenemos el lado más chico para no deformar (estirar) la imagen original, 
  // y calculamos los márgenes (offsets) para recortar exactamente el centro de la foto.
  const minDimension = Math.min(img.width, img.height);
  const startX = (img.width - minDimension) / 2;
  const startY = (img.height - minDimension) / 2;

  // 2. MOTOR RENDERIZADOR (Canvas Nativo)
  const canvas = document.createElement('canvas');
  canvas.width = options.maxSize;
  canvas.height = options.maxSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('[Al Ángulo] Renderizador gráfico (Canvas) no soportado en este dispositivo.');
  }

  // Fondo negro puro de respaldo por si se carga una imagen con transparencias
  ctx.fillStyle = '#0B0F19'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. RECORTAR Y ESCALAR
  // Parámetros: (sourceImg, Source X, Source Y, Source W, Source H, Dest X, Dest Y, Dest W, Dest H)
  // Esto realiza un crop central y un resize de 4000px a 300px todo en un solo ciclo de CPU.
  ctx.drawImage(
    img, 
    startX, startY, minDimension, minDimension, 
    0, 0, options.maxSize, options.maxSize      
  );

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
