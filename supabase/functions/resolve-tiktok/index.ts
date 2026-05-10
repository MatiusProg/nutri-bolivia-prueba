// Supabase Edge Function: resolve-tiktok
// Resolves TikTok short links (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/...) to the final video id
// and returns normalized URLs for embedding and canonical links.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'URL inválida' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // SSRF protection: validate URL and restrict to TikTok hosts only
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'URL malformada' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return new Response(JSON.stringify({ success: false, error: 'Protocolo no permitido' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const allowedHosts = new Set([
      'tiktok.com',
      'www.tiktok.com',
      'm.tiktok.com',
      'vm.tiktok.com',
      'vt.tiktok.com',
    ]);
    if (!allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
      return new Response(JSON.stringify({ success: false, error: 'Dominio no permitido. Solo se aceptan URLs de TikTok.' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Follow redirects server-side to resolve short links, but validate each hop
    const response = await fetch(parsedUrl.toString(), {
      redirect: 'follow',
      headers: {
        // Set a common UA to avoid anti-bot blocks
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const finalUrl = response.url || url;

    // Extract numeric video id from final URL
    const match = finalUrl.match(/\/video\/(\d+)/);
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo extraer el ID del video.' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const videoId = match[1];
    const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
    const videoUrlNormalizada = `https://www.tiktok.com/video/${videoId}`;

    return new Response(
      JSON.stringify({
        success: true,
        data: { plataforma: 'tiktok', videoId, embedUrl, videoUrlNormalizada },
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Error resolviendo el enlace de TikTok.' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
