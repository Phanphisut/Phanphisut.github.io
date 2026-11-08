/* สามตัวอ้วน ลูน่า · ลินู · เลนี่ (Luna, Linou & Leni) แนะนำหน้าใบประกาศ (certificates.html)
   - ตัวใหญ่กลางจอเหมือนน้องลูน่า: images/trio.gif (สามตัวเด้งดึ๋ง พื้นหลังโปร่งใส ภาพแนวนอน)
   - แสดงครั้งละหนึ่งรอบต่อการเปิดเว็บ (sessionStorage) ถ้าลูน่ากำลังแนะนำปุ่มอยู่ จะรอให้ลูน่าจบก่อน (event "lunadone")
   - เสียงพูดผู้หญิงโทนเด็กการ์ตูน: ไฟล์ใน audio/trio/<lang>-<key>.mp3 (Gemini TTS เสียง Leda แบบเดียวกับลูน่า)
   - ด้านล่างมีสามตัวนั่งบนปุ่มหมวด #cert-filters พร้อมกล่องข้อความอธิบายแต่ละหมวด
   ต้องโหลดหลัง assets/site.js และ assets/luna-tour.js; ใช้ class .lt-* / .linou-guide ใน site.css แต่ id เป็น tr-* */
(function () {
  "use strict";
  const S = window.SITE;
  if (!S || document.body.dataset.page !== "certificates") return;
  const DONE = "trio_done", VOICE = "luna_voice";        // ปุ่มปิดเสียงใช้ค่าร่วมกับลูน่า
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  if (ss.get(DONE)) return;
  ss.set(DONE, "1");

  const en = () => S.lang() === "en";
  const tx = (th, e) => (en() ? e : th);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // บทพูด (ตรงกับไฟล์เสียงใน audio/trio/ ถ้าแก้ข้อความต้องสร้างไฟล์เสียงใหม่ด้วย)
  const LINES = {
    th: {
      intro: "สวัสดีค่ะ! พวกเราสามตัวอ้วน ลูน่า ลินู และเลนี่ ยินดีต้อนรับสู่หน้าใบประกาศนะคะ",
      filters: "กดปุ่มหมวดเพื่อเลือกดูได้ ทั้งใบประกาศจากการอบรม และผลสอบอย่าง TOEIC ค่ะ",
      cards: "กดที่รูปใบประกาศ เพื่อดูภาพใหญ่แบบเต็มๆ ได้เลยค่ะ",
      end: "ขอบคุณที่แวะมาดูนะคะ บ๊ายบายค่ะ!",
    },
    en: {
      intro: "Hi! We're the three fat cats: Luna, Linou and Leni. Welcome to the Certificates page!",
      filters: "Tap a category to filter: certificates from courses and training, or test scores like TOEIC.",
      cards: "Tap any certificate to see it full size.",
      end: "Thanks for stopping by. Bye-bye!",
    },
  };
  window.TRIO_LINES = LINES;
  const STEPS = [{ key: "intro" }, { key: "filters" }, { key: "cards" }, { key: "end" }];

  /* ---------- เสียงพูด (ไฟล์ล่วงหน้า เล่นเร็ว 1.2 เท่าแบบไม่รักษาระดับเสียง ให้ใสแบบเด็ก) ---------- */
  const TH_VOICE = false;
  let voiceOn = ls.get(VOICE) !== "off", audio = null;
  function speak(key) {
    if (audio) { audio.pause(); audio = null; }
    if (!voiceOn || !key) return;
    if (!en() && !TH_VOICE) return;                // ไฟล์เสียงไทยชุดแรกไม่เป็นภาษาไทย: ปิดไว้จนกว่าจะสร้างใหม่
    audio = new Audio(`audio/trio/${en() ? "en" : "th"}-${key}.mp3`);
    audio.playbackRate = en() ? 1.15 : 1.2;
    if ("preservesPitch" in audio) audio.preservesPitch = false;
    else if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = false;
    audio.play().catch(() => {});
  }
  const playing = () => audio && !audio.paused && !audio.ended;

  function start() {
    const ov = document.createElement("div");
    ov.className = "lt tr"; ov.id = "tr-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "tr-name");
    ov.innerHTML = `
      <div class="lt-stage">
        <img class="lt-cat ln-cat tr-cat" id="tr-cat" src="images/trio.gif" alt="">
        <div class="lt-box ln-box">
          <div class="lt-top"><b id="tr-name"></b><span class="lt-dots" id="tr-dots"></span></div>
          <p class="lt-text" id="tr-text" aria-live="polite"></p>
          <div class="lt-row">
            <button class="btn lt-voice" type="button" id="tr-voice"></button>
            <span class="lt-lang"><button class="btn" type="button" data-tr-lang="th">ไทย</button><button class="btn" type="button" data-tr-lang="en">ENG</button></span>
            <span class="lt-nav"><button class="btn" type="button" id="tr-prev"></button><button class="btn lt-next" type="button" id="tr-next"></button></span>
          </div>
        </div>
      </div>
      <button class="lt-skip" type="button" id="tr-skip"></button>`;
    document.body.appendChild(ov);
    const $ = id => document.getElementById(id);
    const cv = $("tr-cat");
    let i = 0, heard = false;

    function render(say) {
      const st = STEPS[i];
      $("tr-name").textContent = tx("ลูน่า · ลินู · เลนี่", "Luna · Linou · Leni");
      cv.setAttribute("alt", tx("สามตัวอ้วน ลูน่าแมวดำ ลินูแมวฟ้าใส่หูฟัง และเลนี่แมวฟ้าหูยาว", "The three fat cats: Luna the black cat, Linou with headphones and Leni with floppy ears"));
      $("tr-text").textContent = LINES[en() ? "en" : "th"][st.key];
      $("tr-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
      $("tr-prev").textContent = tx("◀ ย้อนกลับ", "◀ Back"); $("tr-prev").disabled = i === 0;
      $("tr-next").textContent = i === STEPS.length - 1 ? tx("ดูใบประกาศเลย! ✓", "Let's go! ✓") : tx("ถัดไป ▶", "Next ▶");
      $("tr-skip").textContent = tx("ข้าม ✕", "Skip ✕");
      $("tr-voice").textContent = voiceOn ? "🔊" : "🔇";
      $("tr-voice").setAttribute("aria-label", voiceOn ? tx("ปิดเสียงพูด", "Mute voice") : tx("เปิดเสียงพูด", "Turn voice on"));
      $("tr-voice").setAttribute("aria-pressed", String(voiceOn));
      ov.querySelectorAll("[data-tr-lang]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.trLang === "en") === en())));
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

    $("tr-next").addEventListener("click", () => { heard = true; i === STEPS.length - 1 ? finish() : go(i + 1); });
    $("tr-prev").addEventListener("click", () => { heard = true; go(i - 1); });
    $("tr-skip").addEventListener("click", finish);
    $("tr-voice").addEventListener("click", () => { heard = true; voiceOn = !voiceOn; ls.set(VOICE, voiceOn ? "on" : "off"); render(voiceOn); });
    ov.addEventListener("click", e => { const b = e.target.closest("[data-tr-lang]"); if (b) { heard = true; S.setLang(b.dataset.trLang); } });
    // เบราว์เซอร์ไม่ให้เล่นเสียงก่อนผู้ใช้แตะหน้าจอ: แตะครั้งแรกให้พูดขั้นที่แสดงอยู่
    ov.addEventListener("pointerdown", () => { if (!heard) { heard = true; setTimeout(() => { if (!playing()) render(true); }, 60); } }, true);

    render(true);
    requestAnimationFrame(() => ov.classList.add("lt-in"));
    setTimeout(() => $("tr-next").focus({ preventScroll: true }), 50);
  }

  // ลูน่ากำลังแนะนำปุ่มอยู่ → รอให้จบก่อน แล้วเลนี่ค่อยออกมา
  if (document.getElementById("lt-ov")) document.addEventListener("lunadone", () => setTimeout(start, 350), { once: true });
  else start();
})();


/* สามตัวอ้วนนั่งบนปุ่มหมวดใบประกาศ #cert-filters พร้อมกล่องข้อความอธิบายแต่ละหมวด (จำนวนนับจาก CERTS) */
(function () {
  "use strict";
  const S = window.SITE, box = document.getElementById("trio-guide"), bar = document.getElementById("cert-filters");
  if (!S || !box || !bar) return;
  const text = document.getElementById("lg-text"), name = document.getElementById("lg-name");
  const INFO = {
    all: ["ทั้งหมด {n} รายการค่ะ! กดปุ่มด้านล่างเพื่อเลือกดูได้เลย: ใบประกาศ หรือ Test score (ผลสอบ)",
      "All {n} items! Tap a button below to pick: Certificates or Test score."],
    cert: ["ใบประกาศ ({n} ใบ): จากหลักสูตรและการอบรม เช่น PLC ระดับ 1, IoT อุตสาหกรรม, Generative AI, ภัยไซเบอร์ และการใช้ AI ทำงานค่ะ",
      "Certificates ({n}): from courses and training such as PLC Level 1, industrial IoT, Generative AI, cyber security and AI at work."],
    score: ["Test score ({n}): ผลคะแนนสอบภาษาอังกฤษ TOEIC Listening & Reading ค่ะ",
      "Test score ({n}): the TOEIC Listening & Reading English test result."],
  };
  const list = typeof CERTS !== "undefined" ? CERTS : [];
  const count = k => k === "all" ? list.length : list.filter(c => (c.kind === "score" ? "score" : "cert") === k).length;
  const current = () => { const b = bar.querySelector('[aria-pressed="true"]'); return b ? b.dataset.cf : "all"; };
  let shown = null;
  function say(k) {
    if (!INFO[k]) k = "all";
    const s = INFO[k][S.lang() === "en" ? 1 : 0].replace("{n}", count(k));
    name.textContent = S.lang() === "en" ? "Luna · Linou · Leni" : "ลูน่า · ลินู · เลนี่";
    if (text.textContent === s) return;
    text.textContent = s;
    if (shown !== null) { box.classList.remove("lg-pop"); void box.offsetWidth; box.classList.add("lg-pop"); }
    shown = k;
  }
  const btnKey = e => { const b = e.target.closest("[data-cf]"); return b && b.dataset.cf; };
  bar.addEventListener("pointerover", e => { const k = btnKey(e); if (k) say(k); });
  bar.addEventListener("pointerleave", () => say(current()));
  bar.addEventListener("focusin", e => { const k = btnKey(e); if (k) say(k); });
  bar.addEventListener("focusout", e => { if (!bar.contains(e.relatedTarget)) say(current()); });
  bar.addEventListener("click", () => setTimeout(() => say(current()), 0));
  document.addEventListener("sitelang", () => say(shown || current()));
  say(current());
})();
