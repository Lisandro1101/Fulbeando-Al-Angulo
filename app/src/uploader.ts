import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storage } from '@/core/firebase'; 

interface UploadResult {
  publicUrl: string;
  fileKey: string;
}

/** Respuesta de la Cloud Function `getPresignedUploadUrl`. */
interface PresignedUpload {
  /** URL firmada de PUT contra el edge de R2/S3. */
  uploadUrl: string;
  /** URL publica definitiva del objeto. */
  publicUrl: string;
  /** Clave del objeto en el bucket, tipo `avatars/1712_abc.webp`. */
  fileKey: string;
}

/**
 * UPLOADER MULTIMEDIA R2 (Direct to Edge)
 * Esquiva Firebase Storage, pide una URL firmada al servidor y lanza 
 * el binario WebP directamente al nodo más cercano de Cloudflare.
 */
export const uploadImageToR2 = async (
  blob: Blob,
  fileName: string,
  folder: 'avatars' | 'teams' | string,
  onProgress: (percentage: number) => void
): Promise<UploadResult> => {

  const fallbackToFirebase = async (): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      const fileKey = `${folder}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(storage, fileKey);
      const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: blob.type });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percentage = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percentage);
        },
        (error) => {
          console.error('[Fallback] Firebase Storage error:', error);
          reject(new Error('No se pudo subir la imagen. Revisá el archivo y probá otra vez.'));
        },
        async () => {
          try {
            const publicUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ publicUrl, fileKey });
          } catch (err) {
            reject(new Error('No se pudo generar el enlace de la imagen. Probá otra vez.'));
          }
        }
      );
    });
  };

  // Si R2 está explícitamente desactivado por variable de entorno, ir directo a Firebase
  const useR2 = import.meta.env.VITE_USE_R2 !== 'false';

  if (!useR2) {
    return fallbackToFirebase();
  }

  const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

  // TIER 1: Subida directa mediante Cloudflare Worker hacia R2 (100% gratis, sin cuota Blaze)
  if (workerUrl) {
    try {
      const endpoint = `${workerUrl.replace(/\/+$/, '')}?fileName=${encodeURIComponent(fileName)}&folder=${encodeURIComponent(folder)}`;

      return await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress(percentage);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve({ publicUrl: res.publicUrl, fileKey: res.fileKey });
            } catch {
              reject(new Error('Respuesta no válida del servidor de subida'));
            }
          } else {
            reject(new Error(`Error Cloudflare Worker: HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Interrupción de red hacia Cloudflare'));

        xhr.open('PUT', endpoint, true);
        xhr.setRequestHeader('Content-Type', blob.type);
        xhr.send(blob);
      });
    } catch (workerErr) {
      console.warn('[Al Ángulo Uploader] Worker R2 no disponible, intentando Cloud Function / Storage:', workerErr);
    }
  }


  try {
    // 1. Obtener boleto de entrada (Handshake)
    const functionsInstance = getFunctions();
    const getPresignedUrl = httpsCallable(functionsInstance, 'getPresignedUploadUrl');
    
    const { data } = await getPresignedUrl({
      fileName,
      contentType: blob.type,
      folder
    });

    const { uploadUrl, publicUrl, fileKey } = data as PresignedUpload;

    // 2. Subida P2P (Cliente -> Cloudflare Edge)
    return await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Conectar evento de progreso para pintar la UI del usuario
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      };

      // Control del final de conexión
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ publicUrl, fileKey });
        } else {
          reject(new Error(`Rechazo del nodo de destino: Código ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Interrupción de señal. Revisá tu conexión 4G/Wifi.'));

      xhr.open('PUT', uploadUrl, true);
      // CANDADO DE SEGURIDAD: S3/R2 rebotará el request si no inyectamos exactamente
      // el mismo tipo que le pedimos firmar al backend.
      xhr.setRequestHeader('Content-Type', blob.type); 
      xhr.send(blob);
    });

  } catch (error) {
    console.error('[Al Ángulo Uploader] Fallo integral de ruteo a R2:', error);
    return fallbackToFirebase();
  }
};
