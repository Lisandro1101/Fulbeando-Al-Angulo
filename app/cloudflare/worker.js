/**
 * Cloudflare Worker para subidas directas a Cloudflare R2.
 * 
 * Configuración necesaria en Cloudflare Dashboard:
 * 1. Workers & Pages -> Create Application -> Create Worker -> Deploy.
 * 2. Settings -> Variables / Bindings -> R2 Bucket Bindings:
 *    - Variable name: BUCKET
 *    - R2 Bucket: fulbeando-media
 * 3. Settings -> Variables / Environment Variables (opcional):
 *    - PUBLIC_URL_PREFIX: https://pub-2c1810718d6f428baa142d9c12bac0c5.r2.dev
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-uid',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight CORS para navegadores
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Endpoint de salud
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', service: 'Fulbeando R2 Uploader' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'PUT' && request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido. Usar PUT o POST.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const fileName = url.searchParams.get('fileName') || `img_${Date.now()}.webp`;
      const folder = url.searchParams.get('folder') || 'avatars';
      const uid = request.headers.get('x-user-uid') || url.searchParams.get('uid') || 'public';
      const contentType = request.headers.get('content-type') || 'image/webp';

      // Sanitizar nombres de archivo y carpetas respetando subdirectorios
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const cleanFolder = folder.replace(/[^a-zA-Z0-9_/-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
      const timestamp = Date.now();
      const fileKey = cleanFolder.includes('/')
        ? `${cleanFolder}/${timestamp}_${sanitizedName}`
        : `${cleanFolder}/${uid || 'public'}/${timestamp}_${sanitizedName}`;


      if (!env.BUCKET) {
        return new Response(JSON.stringify({ error: 'Binding de R2 (BUCKET) no configurado en el Worker.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Guardar el stream binario directo en Cloudflare R2
      await env.BUCKET.put(fileKey, request.body, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      const publicDomain = (
        env.PUBLIC_URL_PREFIX || 'https://pub-2c1810718d6f428baa142d9c12bac0c5.r2.dev'
      ).replace(/\/+$/, '');

      const publicUrl = `${publicDomain}/${fileKey}`;

      return new Response(JSON.stringify({
        success: true,
        fileKey,
        publicUrl,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message || 'Error interno al procesar subida' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
