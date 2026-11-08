/* น้องลินูตัวอ้วน (Linou The Fatcat) แมวฟ้าใส่หูฟัง แนะนำหน้าผลงาน (projects.html)
   - ตัวใหญ่กลางจอเหมือนน้องลูน่า: images/linou.gif (ตัวเด้งดึ๋ง พื้นหลังโปร่งใส)
   - แสดงครั้งละหนึ่งรอบต่อการเปิดเว็บ (sessionStorage) ถ้าลูน่ากำลังแนะนำปุ่มอยู่ จะรอให้ลูน่าจบก่อน (event "lunadone")
   - เสียงพูดผู้หญิงโทนเด็กการ์ตูน: ไฟล์ใน audio/linou/<lang>-<key>.mp3 (Gemini TTS เสียง Leda แบบเดียวกับลูน่า)
   ต้องโหลดหลัง assets/site.js และ assets/luna-tour.js; ใช้ class .lt-* ของลูน่าใน site.css แต่ id เป็น ln-* */
(function () {
  "use strict";
  const S = window.SITE;
  if (!S || document.body.dataset.page !== "projects") return;
  const DONE = "linou_done", VOICE = "luna_voice";        // ปุ่มปิดเสียงใช้ค่าร่วมกับลูน่า
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  if (ss.get(DONE)) return;
  ss.set(DONE, "1");

  const en = () => S.lang() === "en";
  const tx = (th, e) => (en() ? e : th);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // บทพูด (ตรงกับไฟล์เสียงใน audio/linou/ ถ้าแก้ข้อความต้องสร้างไฟล์เสียงใหม่ด้วย)
  const LINES = {
    th: {
      intro: "สวัสดีค่ะ! ลินูเอง น้องลินูตัวอ้วน ยินดีต้อนรับสู่หน้าผลงานนะคะ",
      filters: "กดปุ่มหมวดตรงนี้เพื่อเลือกดูผลงานได้ ทั้งปริญญาตรี Agentic AI โดรน Embedded PLC และ Dev ค่ะ",
      cards: "กดที่การ์ดผลงาน เพื่อดูรูปและรายละเอียดเพิ่มเติมได้เลยค่ะ",
      end: "ขอให้สนุกกับการดูผลงานนะคะ บ๊ายบายค่ะ!",
    },
    en: {
      intro: "Hi! I'm Linou The Fatcat. Welcome to the Projects page!",
      filters: "Tap these category buttons to filter projects: Bachelor's, Agentic AI, Drone, Embedded, PLC and Dev.",
      cards: "Tap any project card to see its pictures and more details.",
      end: "Have fun looking around. Bye-bye!",
    },
  };
  window.LINOU_LINES = LINES;
  const STEPS = [{ key: "intro" }, { key: "filters" }, { key: "cards" }, { key: "end" }];

  /* ---------- เสียงพูด (ไฟล์ล่วงหน้า เล่นเร็ว 1.2 เท่าแบบไม่รักษาระดับเสียง ให้ใสแบบเด็ก) ---------- */
  const TH_VOICE = true;
  let voiceOn = ls.get(VOICE) !== "off", audio = null;
  function speak(key) {
    if (audio) { audio.pause(); audio = null; }
    if (!voiceOn || !key) return;
    if (!en() && !TH_VOICE) return;                // ไฟล์เสียงไทยชุดแรกไม่เป็นภาษาไทย: ปิดไว้จนกว่าจะสร้างใหม่
    audio = new Audio(`audio/linou/${en() ? "en" : "th"}-${key}.mp3${en() ? "" : "?v=3"}`);   // ?v=3: ไฟล์ไทยชุดใหม่ (gemini 3.1 / 2.5 TTS ตรวจถอดเสียงแล้ว) ไม่ให้เบราว์เซอร์เล่นไฟล์เก่าที่แคชไว้
    audio.playbackRate = en() ? 1.15 : 1.2;
    if ("preservesPitch" in audio) audio.preservesPitch = false;
    else if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = false;
    audio.play().catch(() => {});
  }
  const playing = () => audio && !audio.paused && !audio.ended;

  function start() {
    const ov = document.createElement("div");
    ov.className = "lt ln"; ov.id = "ln-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "ln-name");
    ov.innerHTML = `
      <div class="lt-stage">
        <img class="lt-cat ln-cat" id="ln-cat" src="images/linou.gif" alt="">
        <div class="lt-box ln-box">
          <div class="lt-top"><b id="ln-name"></b><span class="lt-dots" id="ln-dots"></span></div>
          <p class="lt-text" id="ln-text" aria-live="polite"></p>
          <div class="lt-row">
            <button class="btn lt-voice" type="button" id="ln-voice"></button>
            <span class="lt-lang"><button class="btn" type="button" data-ln-lang="th">ไทย</button><button class="btn" type="button" data-ln-lang="en">ENG</button></span>
            <span class="lt-nav"><button class="btn" type="button" id="ln-prev"></button><button class="btn lt-next" type="button" id="ln-next"></button></span>
          </div>
        </div>
      </div>
      <button class="lt-skip" type="button" id="ln-skip"></button>`;
    document.body.appendChild(ov);
    const $ = id => document.getElementById(id);
    const cv = $("ln-cat");
    let i = 0, heard = false;

    function render(say) {
      const st = STEPS[i];
      $("ln-name").textContent = tx("น้องลินูตัวอ้วน", "Linou The Fatcat");
      cv.setAttribute("alt", tx("น้องลินูตัวอ้วน แมวสีฟ้าใส่หูฟัง", "Linou The Fatcat, a round blue cat wearing headphones"));
      $("ln-text").textContent = LINES[en() ? "en" : "th"][st.key];
      $("ln-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
      $("ln-prev").textContent = tx("◀ ย้อนกลับ", "◀ Back"); $("ln-prev").disabled = i === 0;
      $("ln-next").textContent = i === STEPS.length - 1 ? tx("ดูผลงานเลย! ✓", "Let's go! ✓") : tx("ถัดไป ▶", "Next ▶");
      $("ln-skip").textContent = tx("ข้าม ✕", "Skip ✕");
      $("ln-voice").textContent = voiceOn ? "🔊" : "🔇";
      $("ln-voice").setAttribute("aria-label", voiceOn ? tx("ปิดเสียงพูด", "Mute voice") : tx("เปิดเสียงพูด", "Turn voice on"));
      $("ln-voice").setAttribute("aria-pressed", String(voiceOn));
      ov.querySelectorAll("[data-ln-lang]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.lnLang === "en") === en())));
      if (say) speak(st.key);
    }
    function go(n) { i = Math.max(0, Math.min(STEPS.length - 1, n)); render(true); }

    function finish() {
      speak(null);
      removeEventListener("keydown", onKey, true);
      document.removeEventListener("sitelang", onLang);
      const end = () => ov.remove();
      ov.classList.add("lt-out");
      if (reduce || !cv.animate) return end();
      cv.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-30px) scale(1.08)", opacity: 1, offset: .35 }, { transform: "translateY(40px) scale(.4)", opacity: 0 }],
        { duration: 700, easing: "ease-in", fill: "forwards" }).finished.then(end, end);
    }
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); finish(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); i === STEPS.length - 1 ? finish() : go(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    };
    const onLang = () => render(true);
    addEventListener("keydown", onKey, true);
    document.addEventListener("sitelang", onLang);

    $("ln-next").addEventListener("click", () => { heard = true; i === STEPS.length - 1 ? finish() : go(i + 1); });
    $("ln-prev").addEventListener("click", () => { heard = true; go(i - 1); });
    $("ln-skip").addEventListener("click", finish);
    $("ln-voice").addEventListener("click", () => { heard = true; voiceOn = !voiceOn; ls.set(VOICE, voiceOn ? "on" : "off"); render(voiceOn); });
    ov.addEventListener("click", e => { const b = e.target.closest("[data-ln-lang]"); if (b) { heard = true; S.setLang(b.dataset.lnLang); } });
    // เบราว์เซอร์ไม่ให้เล่นเสียงก่อนผู้ใช้แตะหน้าจอ: แตะครั้งแรกให้พูดขั้นที่แสดงอยู่
    ov.addEventListener("pointerdown", () => { if (!heard) { heard = true; setTimeout(() => { if (!playing()) render(true); }, 60); } }, true);

    render(true);
    requestAnimationFrame(() => ov.classList.add("lt-in"));
    setTimeout(() => $("ln-next").focus({ preventScroll: true }), 50);
  }

  // ลูน่ากำลังแนะนำปุ่มอยู่ → รอให้จบก่อน แล้วลินูค่อยออกมา
  if (document.getElementById("lt-ov")) document.addEventListener("lunadone", () => setTimeout(start, 350), { once: true });
  else start();
})();

/* น้องลินูนั่งบนหัวข้อ "ผลงานทั้งหมด" พร้อมกล่องข้อความอธิบายเมนูย่อย (ปุ่มหมวด #proj-filters)
   ชี้/โฟกัสปุ่มไหน = อธิบายหมวดนั้น, ปล่อยเมาส์ = กลับไปอธิบายหมวดที่เลือกอยู่ (จำนวนผลงานนับจาก PROJECTS) */
(function () {
  "use strict";
  const S = window.SITE, box = document.getElementById("linou-guide"), bar = document.getElementById("proj-filters");
  if (!S || !box || !bar) return;
  const text = document.getElementById("lg-text"), name = document.getElementById("lg-name");
  const INFO = {
    all: ["ผลงานทั้งหมด {n} ชิ้นค่ะ! กดปุ่มหมวดด้านล่างเพื่อเลือกดูได้เลย: โปรเจกต์ ป.ตรี, Agentic AI, Drone, Embedded, PLC และ Dev",
      "All {n} projects! Tap a category below to narrow it down: Bachelor's projects, Agentic AI, Drone, Embedded, PLC and Dev."],
    degree: ["โปรเจกต์ ป.ตรี ({n} ชิ้น): งานหลักตอนเรียนปริญญาตรี อย่างสถานีทดสอบโดรน DCATS และเกมทีม AI agent PHAD Company ค่ะ",
      "Bachelor's projects ({n}): the main work from my degree, like the DCATS drone test station and the PHAD Company AI agent game."],
    agentic: ["Agentic AI ({n} ชิ้น): งานที่มีทีม AI agent ช่วยคิดและลงมือทำงานเองได้ อย่าง PHAD Company ค่ะ",
      "Agentic AI ({n}): work where a team of AI agents plans and gets things done on its own, like PHAD Company."],
    drone: ["Drone ({n} ชิ้น): โดรนและ UAV ทั้งบินด้วยท่ามือ สั่งด้วยคีย์บอร์ด ฝูงโดรน ไปจนถึงสร้างโดรนเองค่ะ",
      "Drone ({n}): drones and UAVs, from hand-gesture and keyboard control to drone swarms and home-built airframes."],
    embedded: ["Embedded ({n} ชิ้น): งานบอร์ดและเซนเซอร์ เช่น ESP32, Raspberry Pi, micro:bit และ flight controller ค่ะ",
      "Embedded ({n}): boards and sensors such as ESP32, Raspberry Pi, micro:bit and flight controllers."],
    plc: ["PLC ({n} ชิ้น): ระบบอัตโนมัติแบบโรงงาน ทั้ง PLC, HMI และชุดฝึก IoT อุตสาหกรรมค่ะ",
      "PLC ({n}): factory-style automation with PLCs, HMIs and an industrial IoT training kit."],
    dev: ["Dev ({n} ชิ้น): เว็บและซอฟต์แวร์ เช่น WarrantyTH, เว็บพอร์ตนี้, แดชบอร์ดพลังงาน และเกม MQTT ค่ะ",
      "Dev ({n}): web apps and software like WarrantyTH, this portfolio, an energy dashboard and an MQTT game."],
  };
  const list = typeof PROJECTS !== "undefined" ? PROJECTS : [];
  const count = k => k === "all" ? list.length : list.filter(p => (p.cats || []).includes(k)).length;
  const current = () => { const b = bar.querySelector('[aria-pressed="true"]'); return b ? b.dataset.pf : "all"; };
  let shown = null;
  function say(k) {
    if (!INFO[k]) k = "all";
    const s = INFO[k][S.lang() === "en" ? 1 : 0].replace("{n}", count(k));
    name.textContent = S.lang() === "en" ? "Linou The Fatcat" : "น้องลินูตัวอ้วน";
    if (text.textContent === s) return;
    text.textContent = s;
    if (shown !== null) { box.classList.remove("lg-pop"); void box.offsetWidth; box.classList.add("lg-pop"); }
    shown = k;
  }
  const btnKey = e => { const b = e.target.closest("[data-pf]"); return b && b.dataset.pf; };
  bar.addEventListener("pointerover", e => { const k = btnKey(e); if (k) say(k); });
  bar.addEventListener("pointerleave", () => say(current()));
  bar.addEventListener("focusin", e => { const k = btnKey(e); if (k) say(k); });
  bar.addEventListener("focusout", e => { if (!bar.contains(e.relatedTarget)) say(current()); });
  bar.addEventListener("click", () => setTimeout(() => say(current()), 0));
  document.addEventListener("sitelang", () => say(shown || current()));
  say(current());
})();
