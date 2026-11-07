#!/usr/bin/env node
// PHAD Bridge: ให้หน้าเกม PHAD Company สั่ง Claude Code บนเครื่องของคุณทำงานแบบ agentic
//
// วิธีใช้:  node phad-bridge.js            (ต้องติดตั้ง Claude Code และล็อกอินแล้ว: คำสั่ง `claude` ต้องใช้ได้)
// ตัวเลือก: --port 8787                    พอร์ตที่เปิดรับ (ค่าเริ่มต้น 8787)
//           --workspace <โฟลเดอร์>          ที่เก็บไฟล์งาน (ค่าเริ่มต้น ~/PHAD-Workspace)
//           --allow-bash                   ให้ทีมรันคำสั่ง shell ได้ (ปิดไว้เป็นค่าเริ่มต้น เพราะเสี่ยงกว่า)
//           --origin <url>                 เพิ่มเว็บที่อนุญาตให้เชื่อมต่อ (ใส่ซ้ำได้)
//
// ความปลอดภัย:
// - ฟังเฉพาะ 127.0.0.1 เครื่องอื่นในเครือข่ายเชื่อมไม่ได้
// - รับเฉพาะคำขอจากเว็บที่อนุญาต และต้องมีรหัสจับคู่ (pairing code) ที่พิมพ์ไว้ตอนเปิดโปรแกรม
// - Claude ทำงานในโฟลเดอร์ของแต่ละภารกิจใน workspace เท่านั้น เครื่องมือที่เปิดให้: อ่าน/เขียน/แก้ไฟล์ ค้นไฟล์ ค้นเว็บ
// - ไม่มี dependency นอกจาก Node.js

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, exec, execFile } = require('child_process');

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const PORT = Number(opt('--port', 8787));
const WORKSPACE = path.resolve(opt('--workspace', path.join(os.homedir(), 'PHAD-Workspace')));
const ALLOW_BASH = argv.includes('--allow-bash');
const ORIGINS = ['https://phanphisut.github.io'];
argv.forEach((a, i) => { if (a === '--origin' && argv[i + 1]) ORIGINS.push(argv[i + 1].replace(/\/$/, '')); });

const TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite'].concat(ALLOW_BASH ? ['Bash'] : []);
const MAX_PROMPT = 20000;
const IS_WIN = process.platform === 'win32';

// รหัสจับคู่: สร้างครั้งแรกแล้วเก็บไว้ ครั้งต่อไปใช้รหัสเดิม (ลบไฟล์นี้ถ้าอยากได้รหัสใหม่)
const CONF_DIR = path.join(os.homedir(), '.phad-bridge');
const TOKEN_FILE = path.join(CONF_DIR, 'pairing-code.txt');
fs.mkdirSync(CONF_DIR, { recursive: true });
fs.mkdirSync(WORKSPACE, { recursive: true });
let TOKEN = '';
try { TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch {}
if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(TOKEN)) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.randomBytes(12);
  TOKEN = [0, 4, 8].map(o => Array.from(b.subarray(o, o + 4), x => abc[x % abc.length]).join('')).join('-');
  fs.writeFileSync(TOKEN_FILE, TOKEN + '\n', { mode: 0o600 });
}
const tokenOk = t => typeof t === 'string' && t.length === TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(TOKEN));

let claudeVersion = null;
exec('claude --version', { timeout: 20000, windowsHide: true }, (err, out) => {
  claudeVersion = err ? null : String(out).trim();
  if (!claudeVersion) console.log('\n[!] หาคำสั่ง `claude` ไม่เจอ ติดตั้ง Claude Code และล็อกอินก่อน: https://claude.com/claude-code\n');
});

let running = null;                              // ทำได้ทีละภารกิจ

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-phad-token',
    'Access-Control-Allow-Private-Network': 'true',   // Chrome: เว็บ https เรียก localhost
    'Vary': 'Origin',
  };
}

function slug(s) {
  return String(s).replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'task';
}

function listFiles(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (out.length >= 200) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, base, out);
    else out.push({ path: path.relative(base, p).split(path.sep).join('/'), size: fs.statSync(p).size });
  }
  return out;
}

function toolDetail(name, input = {}, dir = '') {
  const v = input.file_path || input.path || input.pattern || input.query || input.url || input.command || input.description || '';
  let s = String(v);
  if (dir && s.startsWith(dir)) s = s.slice(dir.length).replace(/^[\\/]+/, '');
  return s.slice(0, 160);
}

function runTask(req, res, body, origin) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > MAX_PROMPT) return json(res, 400, { error: 'prompt missing or too long' }, origin);
  if (running) return json(res, 409, { error: 'busy' }, origin);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = path.join(WORKSPACE, `${stamp}-${slug(body.title || prompt)}`);
  fs.mkdirSync(dir, { recursive: true });

  res.writeHead(200, { ...corsHeaders(origin), 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache' });
  const send = o => { try { res.write(JSON.stringify(o) + '\n'); } catch {} };
  send({ type: 'start', dir });

  const system = [
    'คุณคือทีมงานของ "PHAD Company" ที่รับภารกิจจาก CEO ผ่านเกม ทำงานแบบ agentic จนภารกิจเสร็จจริง',
    `ทำงานในโฟลเดอร์ปัจจุบันเท่านั้น (${dir}) ถ้างานมีผลลัพธ์เป็นไฟล์ ให้สร้างไฟล์ไว้ที่นี่`,
    ALLOW_BASH ? 'รันคำสั่ง shell ได้ แต่ห้ามแตะไฟล์นอกโฟลเดอร์นี้ และห้ามคำสั่งที่ลบหรือเปลี่ยนระบบ' : 'ไม่มีสิทธิ์รันคำสั่ง shell ใช้ได้เฉพาะอ่าน เขียน แก้ไฟล์ ค้นไฟล์ และค้นเว็บ',
    'เมื่อเสร็จ สรุปผลงานเป็นภาษาไทย (เว้นแต่งานสั่งภาษาอื่น) บอกว่าทำอะไรไป และไฟล์ที่สร้างมีอะไรบ้าง',
  ].join('\n');

  // ส่งข้อความทั้งหมดทาง stdin: บน Windows ต้องเรียกผ่าน shell ซึ่งทำให้ argument หลายบรรทัดเพี้ยน
  const args = ['-p', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits', '--allowedTools', TOOLS.join(',')];
  // Windows ติดตั้งผ่าน npm จะเป็น claude.cmd ต้องเรียกผ่าน shell (argument ทุกตัวเป็นคำธรรมดา ไม่มีช่องว่างหรืออักขระพิเศษ)
  const child = IS_WIN
    ? spawn(`claude ${args.join(' ')}`, { cwd: dir, shell: true, windowsHide: true, env: process.env })
    : spawn('claude', args, { cwd: dir, env: process.env });
  running = child;
  console.log(`[${new Date().toLocaleTimeString()}] รับภารกิจ: ${prompt.slice(0, 80).replace(/\n/g, ' ')}${prompt.length > 80 ? '…' : ''}`);
  child.stdin.end(`${system}\n\nภารกิจจาก CEO:\n"""\n${prompt}\n"""`);

  let buf = '', finalSent = false, errText = '';
  child.stdout.on('data', chunk => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
        for (const c of ev.message.content) {
          if (c.type === 'text' && c.text) send({ type: 'text', text: c.text });
          if (c.type === 'tool_use') { const d = toolDetail(c.name, c.input, dir); send({ type: 'tool', name: c.name, detail: d }); console.log(`   · ${c.name} ${d}`); }
        }
      } else if (ev.type === 'result') {
        finalSent = true;
        send({ type: 'done', ok: !ev.is_error, result: ev.result || '', turns: ev.num_turns, cost: ev.total_cost_usd, files: safeList(dir), dir });
      }
    }
  });
  child.stderr.on('data', d => { errText += d; if (errText.length > 4000) errText = errText.slice(-4000); });
  child.on('error', e => { errText += e.message; });
  child.on('close', code => {
    running = null;
    if (!finalSent) send({ type: 'error', message: (errText.trim() || `claude จบการทำงานด้วยรหัส ${code}`).slice(-600) });
    console.log(`   ${finalSent ? 'เสร็จ' : 'หยุด'} → ${dir}`);
    try { res.end(); } catch {}
  });
  // หน้าเว็บปิดหรือกดยกเลิก: หยุด Claude ด้วย
  res.on('close', () => { if (running === child) { killTree(child); } });
}

function safeList(dir) { try { return listFiles(dir); } catch { return []; } }
function killTree(child) {
  if (IS_WIN) execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
  else child.kill('SIGTERM');
}

function json(res, status, obj, origin) {
  res.writeHead(status, { ...(origin ? corsHeaders(origin) : {}), 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  const allowed = ORIGINS.includes(origin);
  if (req.method === 'OPTIONS') { res.writeHead(allowed ? 204 : 403, allowed ? corsHeaders(origin) : {}); return res.end(); }
  if (!allowed) return json(res, 403, { error: 'origin not allowed' });
  if (!tokenOk(req.headers['x-phad-token'])) return json(res, 401, { error: 'bad pairing code' }, origin);

  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'GET' && url.pathname === '/status') {
    return json(res, 200, { ok: true, claude: claudeVersion, busy: !!running, workspace: WORKSPACE, bash: ALLOW_BASH, tools: TOOLS }, origin);
  }
  if (req.method === 'POST' && url.pathname === '/task') {
    let raw = '';
    req.on('data', d => { raw += d; if (raw.length > MAX_PROMPT * 4) req.destroy(); });
    req.on('end', () => {
      let body; try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'bad JSON' }, origin); }
      if (!claudeVersion) return json(res, 503, { error: 'claude CLI not found' }, origin);
      runTask(req, res, body, origin);
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/cancel') {
    if (running) killTree(running);
    return json(res, 200, { ok: true }, origin);
  }
  json(res, 404, { error: 'not found' }, origin);
});

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `พอร์ต ${PORT} ถูกใช้อยู่ ปิดโปรแกรมเดิมก่อน หรือใช้ --port อื่น` : e.message);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  PHAD Bridge พร้อมแล้ว');
  console.log('  ─────────────────────────────────────');
  console.log(`  รหัสจับคู่ : ${TOKEN}`);
  console.log(`  ที่อยู่     : http://127.0.0.1:${PORT}`);
  console.log(`  โฟลเดอร์งาน: ${WORKSPACE}`);
  console.log(`  เครื่องมือ  : ${TOOLS.join(', ')}`);
  console.log('  ─────────────────────────────────────');
  console.log('  เปิดเกม → เมนู → "เครื่องฉัน" แล้วใส่รหัสจับคู่ด้านบน');
  console.log('  ปิดโปรแกรม: กด Ctrl+C');
  console.log('');
});
