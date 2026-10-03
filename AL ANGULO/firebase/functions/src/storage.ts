import * as functions from 'firebase-functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuración cargada desde los secretos del entorno (Firebase Secrets)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'tu-account-id';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'tu-access-key';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'tu-secret-key';
const BUCKET_NAME = 'al-angulo-media';

// Cliente S3 configurado apuntando a los servidores de Cloudflare
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true // R2 exige este parámetro S3-Compatible
});

/**
 * Callable Function (Segura): Genera un ticket de un solo uso (URL prefirmada)
 * para que el móvil del usuario suba la imagen directo a Cloudflare.
 */
export const getPresignedUploadUrl = functions.https.onCall(async (data, context) => {
  // 1. Barrera de Seguridad
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Acceso denegado. Se requiere cuenta activa.');
  }

  const { fileName, contentType, folder } = data;
  if (!fileName || !contentType) {
    throw new functions.https.HttpsError('invalid-argument', 'Parámetros inválidos.');
  }

  // 2. Aislamiento e Inmutabilidad
  // Empaquetamos la foto en el directorio del usuario para que nadie sobreescriba fotos ajenas.
  const uid = context.auth.uid;
  const safeFolder = folder === 'teams' ? `teams/${uid}` : `avatars/${uid}`;
  const timestamp = Date.now();
  const fileKey = `${safeFolder}/${timestamp}_${fileName}`;

  // 3. Reglas de Inserción
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType, // El MIME type debe coincidir en el upload del cliente
    // ESTRATEGIA DE CACHÉ EXTREMA: Guardar en el dispositivo un año entero.
    CacheControl: 'public, max-age=31536000, immutable'
  });

  try {
    // 4. Firma temporal: Expira rápido (3 min) para que el link no pueda revenderse/abusarse
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 180 });
    
    return {
      uploadUrl: presignedUrl,
      fileKey: fileKey,
      // URL productiva de nuestra zona Cloudflare Edge
      publicUrl: `https://media.al-angulo.com/${fileKey}` 
    };
  } catch (error) {
    console.error('[Al Ángulo Backend] Fallo firmando URL R2:', error);
    throw new functions.https.HttpsError('internal', 'Los servidores de medios están fuera de servicio.');
  }
});
