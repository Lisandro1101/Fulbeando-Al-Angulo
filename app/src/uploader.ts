import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/core/firebase';

// Mock de funciones
const getFunctions = () => ({});
const httpsCallable = (funcs: any, name: string) => async (data: any) => ({ data: {} as any }); 

interface UploadResult {
  publicUrl: string;
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
          reject(new Error('No se pudo subir el comprobante. Intentá nuevamente o contactá al predio por WhatsApp'));
        },
        async () => {
          try {
            const publicUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ publicUrl, fileKey });
          } catch (err) {
            reject(new Error('No se pudo subir el comprobante. Intentá nuevamente o contactá al predio por WhatsApp'));
          }
        }
      );
    });
  };

  const isR2Configured = 
    import.meta.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID && 
    import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY && 
    import.meta.env.VITE_CLOUDFLARE_R2_BUCKET;

  if (!isR2Configured) {
    console.warn('[Al Ángulo Uploader] R2 credentials missing. Falling back to Firebase Storage.');
    return fallbackToFirebase();
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

    const { uploadUrl, publicUrl, fileKey } = data;

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
