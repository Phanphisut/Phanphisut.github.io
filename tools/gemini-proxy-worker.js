// Cloudflare Worker: ตัวกลางระหว่างหน้า phad-company.html กับ Gemini API
// key เก็บไว้ใน Worker เป็น Secret ชื่อ GEMINI_KEY (Settings → Variables and Secrets) ไม่อยู่ในโค้ดนี้
// รับ POST { prompt: string, json: boolean } แล้วส่งคำตอบของ Gemini กลับไปตรงๆ

const ALLOWED_ORIGINS = ['https://phanphisut.github.io'];
// ตัวแรกเร็วสุด (~1-3 วิ) ถ้าใช้ไม่ได้ (404/429/5xx) ค่อยลองตัวถัดไป
// gemini-flash-latest ไม่ใช้ เพราะตอบช้าเกิน 100 วิ จน Cloudflare ตัดการเชื่อมต่อ (524)
const MODELS = ['gemini-flash-lite-latest', 'gemini-3-flash-preview'];
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

    const payload = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: Object.assign({ maxOutputTokens: 8192 }, body.json ? { responseMimeType: 'application/json' } : {}),
    });
    let r;
    for (const model of MODELS) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
        body: payload,
      });
      if (r.ok || !(r.status === 404 || r.status === 429 || r.status >= 500)) break;
    }
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  },
};
