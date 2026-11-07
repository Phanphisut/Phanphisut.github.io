/* น้องลูน่าตัวอ้วนแนะนำปุ่ม hotbar ด้านล่างทั้ง 4 ปุ่ม (หน้าแรก → ผลงาน → กิจกรรม → ใบประกาศ)
   - แสดงทุกครั้งที่เข้าเว็บ (ครั้งละหนึ่งรอบต่อการเปิดเว็บ: เปลี่ยนหน้าในเว็บแล้วจะไม่เล่นซ้ำ จนกว่าจะปิดแท็บ/เบราว์เซอร์)
   - ลูน่าตัวใหญ่กลางจอ + กล่องข้อความพื้นจาง + เสียงพูดผู้หญิงโทนเด็กการ์ตูนตามภาษาที่เลือก (ไฟล์ใน audio/luna/)
   - กดข้ามได้ตลอด จบแล้วลูน่าบินไปเป็นปุ่มมุมขวาบน
   ต้องโหลดหลัง assets/site.js และ assets/catbot.js */
(function () {
  "use strict";
  const S = window.SITE, slots = [...document.querySelectorAll(".hotbar a")];
  if (!S || slots.length < 4) return;
  const DONE = "luna_tour_done", VOICE = "luna_voice";
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  if (ss.get(DONE)) return;
  ss.set(DONE, "1");                               // เปลี่ยนหน้าระหว่างแนะนำก็ไม่เล่นซ้ำ

  const GIF = (window.LUNA && window.LUNA.GIF) || "images/black_cat_dance.gif";
  const en = () => S.lang() === "en";
  const tx = (th, e) => (en() ? e : th);
  const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // บทพูด (ข้อความเดียวกับไฟล์เสียงใน audio/luna/<lang>-<key>.mp3 ถ้าแก้ข้อความต้องสร้างไฟล์เสียงใหม่ด้วย)
  const LINES = {
    th: {
      intro: "สวัสดีค่ะ! ลูน่าเอง น้องลูน่าตัวอ้วน เดี๋ยวลูน่าพาดูปุ่ม 4 ปุ่มด้านล่างนะคะ ไปกันเลย!",
      home: "ปุ่มแรก \"หน้าแรก\" หน้าหลักของเว็บ มีแนะนำตัว สเตตัสตัวละคร เกม PHAD Company Terminal และช่องทางติดต่อค่ะ",
      projects: "ปุ่มที่สอง \"ผลงาน\" รวมโปรเจกต์ทั้งหมด กดเลือกหมวดได้ ทั้งโปรเจกต์ปริญญาตรี Agentic AI Drone Embedded PLC และ Dev ค่ะ",
      activities: "ปุ่มที่สาม \"กิจกรรม\" ไทม์ไลน์ทั้งงาน การสอน การอบรม และงานอีเวนต์ต่างๆ ค่ะ",
      certs: "ปุ่มสุดท้าย \"ใบประกาศ\" ใบประกาศและผลสอบอย่าง TOEIC แยกหมวดให้ดูง่ายๆ ค่ะ",
      end_desk: "กดเลข 1 ถึง 4 บนคีย์บอร์ดก็ไปแต่ละหน้าได้นะคะ ถ้าสงสัยอะไร กดที่ลูน่ามุมขวาบนเพื่อคุยกันได้เลยค่ะ!",
      end_touch: "ถ้าสงสัยอะไร กดที่ลูน่ามุมขวาบนเพื่อคุยกันได้เลยค่ะ!",
    },
    en: {
      intro: "Hi there! I'm Luna The Fatcat. Let me show you the 4 buttons at the bottom. Let's go!",
      home: "First, \"Home\". The main page: an intro, character stats, the PHAD Company game, a terminal and contact links.",
      projects: "Second, \"Projects\". Every project, with filters for Bachelor's projects, Agentic AI, Drone, Embedded, PLC and Dev.",
      activities: "Third, \"Activities\". A timeline of work, teaching, training and events.",
      certs: "Last, \"Certificates\". Certificates and test scores like TOEIC, sorted into categories.",
      end_desk: "You can also press 1 to 4 on your keyboard. If you have any questions, tap me at the top right to chat!",
      end_touch: "If you have any questions, tap me at the top right to chat!",
    },
  };
  window.LUNA_LINES = LINES;                       // ให้สคริปต์สร้างไฟล์เสียงอ่านข้อความชุดเดียวกัน
  // ขั้นตอน: slot = ปุ่มที่ไฮไลต์ (null = ไม่ไฮไลต์)
  const STEPS = [
    { slot: null, key: "intro" }, { slot: 0, key: "home" }, { slot: 1, key: "projects" },
    { slot: 2, key: "activities" }, { slot: 3, key: "certs" }, { slot: null, key: touch ? "end_touch" : "end_desk" },
  ];

  /* ---------- เสียงพูด: ไฟล์เสียงผู้หญิงโทนเด็กการ์ตูนที่สร้างไว้ล่วงหน้าด้วย Gemini TTS (เสียง Leda)
     เล่นเร็วขึ้น 1.15 เท่าโดยปล่อยให้เสียงสูงขึ้นตาม ให้ใสแบบการ์ตูน
     ไม่ใช้ Web Speech API เพราะหลายเครื่องมีแต่เสียงผู้ชาย (เช่นภาษาไทยใน Windows มีแค่ Pattara) */
  let voiceOn = ls.get(VOICE) !== "off", audio = null;
  function speak(key) {
    if (audio) { audio.pause(); audio = null; }
    if (!voiceOn || !key) return;
    audio = new Audio(`audio/luna/${en() ? "en" : "th"}-${key}.mp3`);
    audio.playbackRate = 1.15;
    if ("preservesPitch" in audio) audio.preservesPitch = false;
    else if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = false;
    audio.play().catch(() => {});                 // ยังไม่ได้แตะหน้าจอ: เบราว์เซอร์บล็อก รอแตะครั้งแรก
  }
  const playing = () => audio && !audio.paused && !audio.ended;

  /* ---------- UI ---------- */
  const ov = document.createElement("div");
  ov.className = "lt"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "lt-name");
  ov.innerHTML = `
    <div class="lt-stage">
      <img class="lt-cat" id="lt-cat" src="${GIF}" alt="">
      <div class="lt-box">
        <div class="lt-top"><b id="lt-name"></b><span class="lt-dots" id="lt-dots"></span></div>
        <p class="lt-text" id="lt-text" aria-live="polite"></p>
        <div class="lt-row">
          <button class="btn lt-voice" type="button" id="lt-voice"></button>
          <span class="lt-lang"><button class="btn" type="button" data-lt-lang="th">ไทย</button><button class="btn" type="button" data-lt-lang="en">ENG</button></span>
          <span class="lt-nav"><button class="btn" type="button" id="lt-prev"></button><button class="btn lt-next" type="button" id="lt-next"></button></span>
        </div>
      </div>
    </div>
    <button class="lt-skip" type="button" id="lt-skip"></button>
    <div class="lt-arrow" id="lt-arrow" aria-hidden="true">▼</div>`;
  document.body.appendChild(ov);
  const $ = id => document.getElementById(id);
  const hotbar = document.querySelector(".hotbar");
  let i = 0, heard = false;

  function render(say) {
    const st = STEPS[i], text = LINES[en() ? "en" : "th"][st.key];
    $("lt-name").textContent = tx("น้องลูน่าตัวอ้วน", "Luna The Fatcat");
    $("lt-text").textContent = text;
    $("lt-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    $("lt-prev").textContent = tx("◀ ย้อนกลับ", "◀ Back"); $("lt-prev").disabled = i === 0;
    $("lt-next").textContent = i === STEPS.length - 1 ? tx("เริ่มเลย! ✓", "Let's go! ✓") : tx("ถัดไป ▶", "Next ▶");
    $("lt-skip").textContent = tx("ข้าม ✕", "Skip ✕");
    $("lt-voice").textContent = voiceOn ? "🔊" : "🔇";
    $("lt-voice").setAttribute("aria-label", voiceOn ? tx("ปิดเสียงพูด", "Mute voice") : tx("เปิดเสียงพูด", "Turn voice on"));
    $("lt-voice").setAttribute("aria-pressed", String(voiceOn));
    ov.querySelectorAll("[data-lt-lang]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.ltLang === "en") === en())));
    slots.forEach((a, k) => { a.classList.toggle("lt-on", k === st.slot); a.classList.toggle("lt-dim", st.slot !== null && k !== st.slot); });
    const arrow = $("lt-arrow");
    if (st.slot === null) arrow.hidden = true;
    else {
      const r = slots[st.slot].getBoundingClientRect();
      arrow.hidden = false; arrow.style.left = `${r.left + r.width / 2}px`; arrow.style.top = `${r.top - 6}px`;
    }
    if (say) speak(st.key);
  }
  function go(n) { i = Math.max(0, Math.min(STEPS.length - 1, n)); render(true); }

  // จบหรือข้าม: ลูน่าตัวใหญ่บินไปเป็นปุ่มมุมขวาบน
  function finish() {
    speak(null);
    removeEventListener("keydown", onKey, true); removeEventListener("resize", onResize);
    slots.forEach(a => a.classList.remove("lt-on", "lt-dim"));
    hotbar.classList.remove("lt-up");
    const cat = $("lt-cat"), btn = document.getElementById("catbot-btn");
    const end = () => { ov.remove(); if (btn) { btn.classList.add("cb-pop"); setTimeout(() => btn.classList.remove("cb-pop"), 600); btn.focus({ preventScroll: true }); } };
    ov.classList.add("lt-out");
    if (!btn || reduce || !cat.animate) return end();
    const a = cat.getBoundingClientRect(), b = btn.getBoundingClientRect();
    cat.animate([{ transform: "none" }, { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${b.height / a.height})` }],
      { duration: 700, easing: "cubic-bezier(.5,-0.3,.6,1)", fill: "forwards" }).finished.then(end, end);
  }

  const onKey = e => {
    if (e.key === "Escape") { e.preventDefault(); finish(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); i === STEPS.length - 1 ? finish() : go(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
  };
  const onResize = () => render(false);
  addEventListener("keydown", onKey, true);
  addEventListener("resize", onResize);

  $("lt-next").addEventListener("click", () => { heard = true; i === STEPS.length - 1 ? finish() : go(i + 1); });
  $("lt-prev").addEventListener("click", () => { heard = true; go(i - 1); });
  $("lt-skip").addEventListener("click", finish);
  $("lt-voice").addEventListener("click", () => { heard = true; voiceOn = !voiceOn; ls.set(VOICE, voiceOn ? "on" : "off"); render(voiceOn); });
  ov.addEventListener("click", e => { const b = e.target.closest("[data-lt-lang]"); if (b) { heard = true; S.setLang(b.dataset.ltLang); } });
  // เบราว์เซอร์ไม่ยอมให้พูดก่อนผู้ใช้แตะหน้าจอ: แตะครั้งแรกที่ไหนก็ได้ให้พูดขั้นที่แสดงอยู่
  ov.addEventListener("pointerdown", () => { if (!heard) { heard = true; setTimeout(() => { if (!playing()) render(true); }, 60); } }, true);
  document.addEventListener("sitelang", () => render(true));

  hotbar.classList.add("lt-up");
  render(true);
  requestAnimationFrame(() => ov.classList.add("lt-in"));
  setTimeout(() => $("lt-next").focus({ preventScroll: true }), 50);
})();
