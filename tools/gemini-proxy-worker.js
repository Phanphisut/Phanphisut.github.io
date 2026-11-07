// Cloudflare Worker: ตัวกลางระหว่างหน้า phad-company.html กับ Gemini API
// key เก็บไว้ใน Worker เป็น Secret ชื่อ GEMINI_KEY (Settings → Variables and Secrets) ไม่อยู่ในโค้ดนี้
// รับ POST { prompt: string, json: boolean } แล้วส่งคำตอบของ Gemini กลับไปตรงๆ

const ALLOWED_ORIGINS = ['https://phanphisut.github.io'];
const MODEL = 'gemini-flash-latest';
const MAX_PROMPT = 60000;                       // กันคนส่งข้อความยาวมากๆ มาเผาโควตา

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin',
    };
    const reply = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply(405, { error: { message: 'POST only' } });
    if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { error: { message: 'origin not allowed' } });
    if (!env.GEMINI_KEY) return reply(500, { error: { message: 'GEMINI_KEY secret is not set' } });

    let body;
    try { body = await req.json(); } catch { return reply(400, { error: { message: 'bad JSON' } }); }
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > MAX_PROMPT) return reply(400, { error: { message: 'prompt missing or too long' } });

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: Object.assign({ maxOutputTokens: 8192 }, body.json ? { responseMimeType: 'application/json' } : {}),
      }),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  },
};
