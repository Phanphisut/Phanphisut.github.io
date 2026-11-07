/* เหมียว: แชตบอต AI แมวดำที่ช่วยแนะนำการใช้เว็บนี้
   - เข้าเว็บครั้งแรก: แมวตัวใหญ่โผล่มุมขวาล่างพร้อมกล่องแชตทักทาย ปิดแล้วแมวจะย้ายไปอยู่ปุ่มมุมขวาบน
   - เคยเข้าแล้ว: เหลือปุ่มแมวในแถบเดียวกับปุ่มภาษา/เสียง กดเพื่อเปิดแชต
   - AI: Gemini ผ่าน Cloudflare Worker phad-ai (key อยู่ฝั่ง Worker) ความรู้เรื่องเว็บสร้างจาก assets/data.js */
(function () {
  "use strict";
  const S = window.SITE; if (!S) return;
  const AI = "https://phad-ai.arisaga113322.workers.dev";
  const GIF = "images/black_cat_dance.gif";
  const SEEN = "catbot_seen", LOG = "catbot_log";
  const lang = () => S.lang();
  const tx = (th, en) => (lang() === "en" ? en : th);
  const esc = S.esc;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- ความรู้เรื่องเว็บ (สร้างจากข้อมูลจริงในหน้า) ---------- */
  function knowledge() {
    const L = v => (Array.isArray(v) ? v[lang() === "en" ? 1 : 0] : v || "");
    const P = typeof PROJECTS !== "undefined" ? PROJECTS : [], A = typeof ACTIVITIES !== "undefined" ? ACTIVITIES : [], C = typeof CERTS !== "undefined" ? CERTS : [];
    return [
      "เจ้าของเว็บ: พันธุ์พิสุทธิ์ ภูเม็ด (Phanphisut Phumet) R&D Software/Hardware Engineer ที่ SoT (STEAM of Things) งานด้านโดรน, Computer Vision, IoT, PLC และ Agentic AI",
      "แนะนำตัว: " + L(I18N.bio),
      "หน้าในเว็บ (ลิงก์ใช้ได้เฉพาะชุดนี้):",
      "- index.html หน้าแรก: แนะนำตัว, สเตตัสตัวละคร (LV และตำแหน่งคำนวณจากจำนวนผลงาน+กิจกรรม+ใบประกาศ), การ์ดเกม PHAD Company, Terminal ให้พิมพ์คำสั่ง (help, about, skills, projects, contact, drone, weather), ช่องทางติดต่อ",
      "- projects.html ผลงาน: ช่องเก็บของทักษะ (Tech stack) และรายการผลงานที่มีปุ่มหมวดหมู่ ทั้งหมด / โปรเจกต์ ป.ตรี / Agentic AI / Drone / Embedded / PLC / Dev แต่ละการ์ดมีปุ่มดูรายละเอียด",
      "- activities.html กิจกรรม: ไทม์ไลน์กิจกรรมพร้อมปุ่มกรอง ทั้งหมด / ทำงาน / สอน-สตาฟ / อบรม / กิจกรรม และหน้าพอร์ตฉบับเต็ม",
      "- certificates.html ใบประกาศ: ปุ่มกรอง ทั้งหมด / ใบประกาศ / Test score (ผลสอบ เช่น TOEIC) คลิกการ์ดเพื่อดูภาพเต็ม",
      "- phad-company.html เกม PHAD Company: ออฟฟิศพิกเซลที่ทีม AI 4 คน (ยู PM, ต้น นักวิจัย, บีม นักเขียน, ภูมิ QA) รับภารกิจจริง กดเมนูขวาล่าง > กระดานสั่งงาน พิมพ์ภารกิจแล้วกดประกาศภารกิจ ได้เงินรางวัลตามจำนวนบรรทัด มีร้านค้า ทีมงาน สัตว์เลี้ยง (แมวส้มจี๊ด) และแท็บ 'เครื่องฉัน' ให้เชื่อม Claude Code ในเครื่องตัวเองแบบ agentic",
      "ทุกหน้า: แถบบนมีปุ่มเปลี่ยนภาษา ไทย/ENG, ปุ่มเสียง และปุ่มแมว (ตัวฉันเอง) · แถบ hotbar ด้านล่างกดเลข 1-4 เพื่อไปหน้าต่างๆ · คลิกภาพเพื่อดูขยาย",
      "ช่องทางติดต่อ: LINE 0653057699 (https://line.me/ti/p/~0653057699) · Facebook Pha Xr (https://www.facebook.com/pha.xr.2025) · Instagram _phaxr (https://www.instagram.com/_phaxr/) · GitHub Phanphisut (https://github.com/Phanphisut)",
      `ผลงาน ${P.length} ชิ้น:`,
      ...P.map(p => `- ${p.title} [${(p.cats || []).join(", ")}]${p.group === "degree" ? " (โปรเจกต์ ป.ตรี)" : ""}: ${L(p.desc).slice(0, 220)}`),
      `กิจกรรม ${A.length} รายการ (ล่าสุด):`,
      ...A.slice(0, 10).map(a => `- ${a.d} ${L(a.title)}`),
      `ใบประกาศและผลสอบ ${C.length} รายการ:`,
      ...C.map(c => `- ${c.d} ${L(c.title)}${c.kind === "score" ? " (ผลสอบ)" : ""}${c.note ? " · " + L(c.note) : ""}`),
    ].join("\n");
  }

  function prompt(history, q) {
    const pageName = (S.page && S.page.file) || "index.html";
    return `คุณคือ "เหมียว" แมวดำพิกเซล ผู้ช่วยประจำเว็บพอร์ตโฟลิโอของพันธุ์พิสุทธิ์
หน้าที่: แนะนำวิธีใช้เว็บ พาไปหน้าที่ใช่ และตอบคำถามเกี่ยวกับผลงาน กิจกรรม ใบประกาศ ทักษะ และการติดต่อ จากข้อมูลด้านล่างเท่านั้น
กติกา:
- ตอบเป็น${lang() === "en" ? "ภาษาอังกฤษ" : "ภาษาไทย"} สั้น กระชับ เป็นกันเอง 1-4 ประโยค ลงท้ายน่ารักแบบแมวได้บ้าง (เช่น เหมียว~) แต่อย่าเยอะ
- ใส่ลิงก์ได้ในรูป [ข้อความ](ลิงก์) โดยใช้เฉพาะลิงก์หน้าในเว็บหรือช่องทางติดต่อที่ให้ไว้ ข้อความในลิงก์ให้เป็นชื่อหน้าธรรมดา เช่น [หน้าผลงาน](projects.html) ห้ามใส่ชื่อไฟล์หรือ URL ในข้อความ
- เรียกเจ้าของเว็บว่า "พี่พันธุ์พิสุทธิ์" (ภาษาอังกฤษใช้ Phanphisut) และไม่ต้องลงท้ายด้วยครับ/ค่ะ
- ถ้าไม่มีข้อมูล ให้บอกตรงๆ และแนะนำให้ติดต่อเจ้าของเว็บ ห้ามแต่งข้อมูลเอง
- ห้ามใช้หัวข้อ markdown หรือตาราง ใช้ **ตัวหนา** ได้
ผู้ใช้กำลังดูหน้า: ${pageName}

ข้อมูลเว็บ:
${knowledge()}

บทสนทนาก่อนหน้า:
${history.slice(-8).map(m => `${m.r === "u" ? "ผู้ใช้" : "เหมียว"}: ${m.t}`).join("\n") || "(ยังไม่มี)"}

ผู้ใช้: ${q}
เหมียว:`;
  }

  async function ask(history, q) {
    const r = await fetch(AI, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: prompt(history, q) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
    const c = (j.candidates || [])[0];
    const t = c && c.content ? (c.content.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join("").trim() : "";
    if (!t) throw new Error("empty");
    return t;
  }

  /* ---------- แสดงข้อความ: escape ก่อน แล้วค่อยแปลงลิงก์ที่อนุญาตกับตัวหนา ---------- */
  const OK_LINK = /^(?:(?:index|projects|activities|certificates|phad-company)\.html(?:#[\w-]+)?|https:\/\/(?:line\.me|www\.facebook\.com|www\.instagram\.com|github\.com)\/\S*)$/;
  function fmt(text) {
    return esc(text)
      .replace(/\[([^\]\n]{1,80})\]\(([^)\s]+)\)/g, (m, label, url) => {
        const u = url.replace(/&amp;/g, "&");
        if (!OK_LINK.test(u)) return label;
        const ext = /^https:/.test(u);
        return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
      })
      .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
  }

  /* ---------- UI ---------- */
  const label = () => tx("เหมียว ผู้ช่วยในเว็บ", "Meow, site helper");
  const bar = document.querySelector(".topbar .lang");
  const btn = document.createElement("button");
  btn.className = "btn catbot-btn"; btn.type = "button"; btn.id = "catbot-btn"; btn.hidden = true;
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "catbot");
  btn.innerHTML = `<img src="${GIF}" alt="">`;
  if (bar) bar.appendChild(btn);

  const hero = document.createElement("img");
  hero.className = "catbot-hero"; hero.src = GIF; hero.alt = ""; hero.hidden = true;

  const box = document.createElement("section");
  box.className = "catbot panel"; box.id = "catbot"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-labelledby", "catbot-name");
  box.innerHTML = `
    <header class="cb-head">
      <img class="cb-face" src="${GIF}" alt="">
      <div class="cb-who"><b id="catbot-name"></b><small id="catbot-sub"></small></div>
      <button class="btn cb-x" type="button" id="catbot-x">✕</button>
    </header>
    <div class="cb-log" id="catbot-log" aria-live="polite"></div>
    <div class="cb-chips" id="catbot-chips"></div>
    <form class="cb-form" id="catbot-form" autocomplete="off">
      <input id="catbot-in" type="text" maxlength="400" spellcheck="false">
      <button class="btn" type="submit" id="catbot-send"></button>
    </form>`;
  document.body.append(hero, box);

  const $ = id => document.getElementById(id);
  const logEl = $("catbot-log"), chipsEl = $("catbot-chips"), input = $("catbot-in");
  let history = [];
  try { history = JSON.parse(ss.get(LOG) || "[]"); if (!Array.isArray(history)) history = []; } catch (e) { history = []; }
  let busy = false;

  const CHIPS = () => [
    tx("เว็บนี้มีอะไรบ้าง?", "What's on this site?"),
    tx("แนะนำผลงานเด่นหน่อย", "Show me the best projects"),
    tx("เกม PHAD Company เล่นยังไง?", "How do I play PHAD Company?"),
    tx("ติดต่อเจ้าของเว็บยังไง?", "How can I contact him?"),
  ];
  const greet = () => tx(
    "สวัสดีเหมียว~ ฉันชื่อ **เหมียว** ผู้ช่วยประจำเว็บนี้ เว็บนี้เป็นพอร์ตโฟลิโอของพันธุ์พิสุทธิ์ มี [ผลงาน](projects.html) [กิจกรรม](activities.html) [ใบประกาศ](certificates.html) และ [เกม PHAD Company](phad-company.html) อยากรู้อะไรกดปุ่มด้านล่าง หรือพิมพ์ถามได้เลย",
    "Meow~ I'm **Meow**, this site's helper. It's Phanphisut's portfolio with [projects](projects.html), [activities](activities.html), [certificates](certificates.html) and the [PHAD Company game](phad-company.html). Tap a question below or type your own.");

  function paintStatic() {
    $("catbot-name").textContent = label();
    $("catbot-sub").textContent = tx("ถามเรื่องเว็บนี้ได้เลย · ตอบโดย AI", "Ask about this site · AI answers");
    $("catbot-x").setAttribute("aria-label", tx("ปิดแชต", "Close chat"));
    btn.setAttribute("aria-label", tx("เปิดแชตกับเหมียว", "Chat with Meow")); btn.title = label();
    input.placeholder = tx("พิมพ์คำถาม…", "Type a question…");
    $("catbot-send").textContent = tx("ส่ง", "Send");
    chipsEl.innerHTML = CHIPS().map(c => `<button class="btn cb-chip" type="button">${esc(c)}</button>`).join("");
  }
  function paintLog() {
    const msgs = [{ r: "b", t: greet() }, ...history];
    logEl.innerHTML = msgs.map(m => `<p class="cb-msg ${m.r === "u" ? "me" : "bot"}">${m.r === "u" ? esc(m.t) : fmt(m.t)}</p>`).join("")
      + (busy ? `<p class="cb-msg bot cb-typing"><i></i><i></i><i></i></p>` : "");
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function send(q) {
    q = String(q || "").trim(); if (!q || busy) return;
    history.push({ r: "u", t: q }); busy = true; paintLog();
    let a;
    try { a = await ask(history.slice(0, -1), q); }
    catch (e) { a = tx("ขอโทษเหมียว ตอนนี้ฉันตอบไม่ได้ ลองใหม่อีกทีนะ หรือติดต่อทาง [LINE](https://line.me/ti/p/~0653057699) ได้เลย", "Sorry, meow, I can't answer right now. Try again, or reach him on [LINE](https://line.me/ti/p/~0653057699)."); }
    history.push({ r: "b", t: a }); history = history.slice(-20); busy = false;
    ss.set(LOG, JSON.stringify(history)); paintLog();
  }

  function open(first) {
    box.classList.toggle("first", !!first);
    box.hidden = false; btn.setAttribute("aria-expanded", "true");
    paintLog();
    if (!first) setTimeout(() => input.focus(), 50);
  }
  function close() {
    if (box.hidden) return;
    box.hidden = true; btn.setAttribute("aria-expanded", "false");
    if (!hero.hidden) flyHome(); else btn.focus();
  }
  // ครั้งแรก: ปิดแชตแล้วแมวตัวใหญ่บินไปเป็นปุ่มมุมขวาบน
  function flyHome() {
    ls.set(SEEN, "1");
    btn.hidden = false;
    const a = hero.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), k = b.height / a.height;
    const done = () => { hero.hidden = true; btn.classList.add("cb-pop"); setTimeout(() => btn.classList.remove("cb-pop"), 600); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !hero.animate) return done();
    hero.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], { duration: 650, easing: "cubic-bezier(.5,-0.3,.6,1)" }).finished.then(done, done);
  }

  btn.addEventListener("click", () => (box.hidden ? open(false) : close()));
  hero.addEventListener("click", () => (box.hidden ? open(true) : close()));
  $("catbot-x").addEventListener("click", close);
  chipsEl.addEventListener("click", e => { const c = e.target.closest(".cb-chip"); if (c) send(c.textContent); });
  $("catbot-form").addEventListener("submit", e => { e.preventDefault(); const q = input.value; input.value = ""; send(q); });
  box.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
  document.addEventListener("sitelang", () => { paintStatic(); paintLog(); });

  paintStatic();
  if (ls.get(SEEN)) btn.hidden = false;
  else {                                           // เข้าเว็บครั้งแรก: จำไว้ทันที เปลี่ยนหน้าแล้วจะเหลือแค่ปุ่มมุมขวาบน
    ls.set(SEEN, "1");
    setTimeout(() => { hero.hidden = false; open(true); }, 900);
  }
})();
