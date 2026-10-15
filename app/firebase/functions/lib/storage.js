"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUploadUrl = void 0;
const functions = require("firebase-functions");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
function getS3Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Las credenciales de Cloudflare R2 no están configuradas en el servidor.');
    }
    return new client_s3_1.S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
    });
}
/**
 * Callable Function: Genera una URL prefirmada de un solo uso para que
 * el cliente suba el archivo directamente a Cloudflare R2 sin pasar por Firebase Storage.
 */
exports.getPresignedUploadUrl = functions.https.onCall(async (data, context) => {
    // 1. Barrera de seguridad: requiere usuario autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Acceso denegado. Se requiere cuenta activa.');
    }
    const { fileName, contentType, folder } = data;
    if (!fileName || !contentType) {
        throw new functions.https.HttpsError('invalid-argument', 'Parámetros inválidos: se requiere fileName y contentType.');
    }
    // 2. Aislamiento por usuario para evitar sobreescritura
    const uid = context.auth.uid;
    let safeFolder = `avatars/${uid}`;
    if (folder === 'teams') {
        safeFolder = `teams/${uid}`;
    }
    else if (folder === 'posts') {
        safeFolder = `posts/${uid}`;
    }
    else if (folder) {
        safeFolder = `${folder.replace(/[^a-zA-Z0-9_-]/g, '')}/${uid}`;
    }
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const fileKey = `${safeFolder}/${timestamp}_${sanitizedName}`;
    const bucketName = process.env.R2_BUCKET_NAME || 'fulbeando-media';
    const publicPrefix = (process.env.R2_PUBLIC_URL_PREFIX || `https://${bucketName}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
    const s3 = getS3Client();
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
    });
    try {
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 300 }); // 5 minutos
        const publicUrl = `${publicPrefix}/${fileKey}`;
        return {
            uploadUrl,
            publicUrl,
            fileKey,
        };
    }
    catch (error) {
        console.error('[Cloudflare R2] Error generando URL prefirmada:', error);
        throw new functions.https.HttpsError('internal', 'Error al generar ticket de subida a Cloudflare R2.');
    }
});
//# sourceMappingURL=storage.js.map