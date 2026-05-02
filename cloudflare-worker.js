// Cloudflare Worker — CORS-прокси для Wavespeed LLM API
//
// Ключ хранится как Cloudflare Secret (не в коде):
//   wrangler secret put WAVESPEED_API_KEY
//   → вставить значение ключа
//
// Деплой: https://workers.cloudflare.com → New Worker → вставить этот код
// Или через CLI: wrangler deploy

const TARGET = 'https://llm.wavespeed.ai/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // env.WAVESPEED_API_KEY — Cloudflare Secret, недоступен браузеру
    const apiKey = env.WAVESPEED_API_KEY;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.arrayBuffer();

    const upstream = await fetch(TARGET, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,   // ключ добавляет Worker, не браузер
      },
      body,
    });

    const data = await upstream.arrayBuffer();
    return new Response(data, {
      status:  upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  },
};
