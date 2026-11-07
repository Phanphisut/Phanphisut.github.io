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
    if (new URL(req.url).pathname === '/tts') return tts(body, env, cors, reply);
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

/* ---------- POST /tts { text, lang: "th" | "en" } → audio/wav ----------
   เสียงน้องลูน่าในแชต: Gemini TTS เสียง Leda สไตล์เด็กผู้หญิงการ์ตูน (เสียงเดียวกับไฟล์แนะนำปุ่ม audio/luna/)
   โควตาฟรีได้ราว 10 ครั้ง/วันต่อโมเดล จึงไล่ใช้หลายโมเดลที่มีเสียง Leda เหมือนกัน หมดทุกตัวตอบ 429 */
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
const TTS_STYLE = {
  th: 'Say quickly in Thai, at a brisk, lively pace, in a cute, cheerful little cartoon girl voice:',
  en: 'Say quickly, at a brisk, lively pace, in a cute, cheerful little cartoon girl voice:',
};
const MAX_TTS = 700;

async function tts(body, env, cors, reply) {
  const lang = body.lang === 'en' ? 'en' : 'th';
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TTS) : '';
  if (!text) return reply(400, { error: { message: 'text missing' } });
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: `${TTS_STYLE[lang]} ${text}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } } } },
  });
  let last = 0;
  for (const model of TTS_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: payload,
    });
    last = r.status;
    if (!r.ok) { if (r.status === 404 || r.status === 429 || r.status >= 500) continue; break; }
    const j = await r.json().catch(() => null);
    const part = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).find(p => p.inlineData);
    if (!part) continue;
    const raw = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
    const isWav = raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46;   // "RIFF"
    const rate = Number((/rate=(\d+)/.exec(part.inlineData.mimeType || '') || [])[1]) || 24000;
    const wav = isWav ? raw : pcmToWav(raw, rate);
    return new Response(wav, { status: 200, headers: { ...cors, 'content-type': 'audio/wav', 'x-tts-model': model, 'Access-Control-Expose-Headers': 'x-tts-model' } });
  }
  return reply(last === 429 ? 429 : 502, { error: { message: last === 429 ? 'tts quota used up for today' : 'tts failed' } });
}

function pcmToWav(pcm, rate) {
  const h = new DataView(new ArrayBuffer(44)), w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}
