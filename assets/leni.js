/* น้องเลนี่ตัวอ้วน (Leni The Fatcat) แมวฟ้าหูยาว แนะนำหน้ากิจกรรม (activities.html)
   - ตัวใหญ่กลางจอเหมือนน้องลูน่า: images/leni.gif (ตัวเด้งดึ๋ง พื้นหลังโปร่งใส)
   - แสดงครั้งละหนึ่งรอบต่อการเปิดเว็บ (sessionStorage) ถ้าลูน่ากำลังแนะนำปุ่มอยู่ จะรอให้ลูน่าจบก่อน (event "lunadone")
   - เสียงพูดผู้หญิงโทนเด็กการ์ตูน: ไฟล์ใน audio/leni/<lang>-<key>.mp3 (Gemini TTS เสียง Leda แบบเดียวกับลูน่า)
   ต้องโหลดหลัง assets/site.js และ assets/luna-tour.js; ใช้ class .lt-* / .ln-cat ใน site.css แต่ id เป็น le-* */
(function () {
  "use strict";
  const S = window.SITE;
  if (!S || document.body.dataset.page !== "activities") return;
  const DONE = "leni_done", VOICE = "luna_voice";        // ปุ่มปิดเสียงใช้ค่าร่วมกับลูน่า
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  if (ss.get(DONE)) return;
  ss.set(DONE, "1");

  const en = () => S.lang() === "en";
  const tx = (th, e) => (en() ? e : th);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // บทพูด (ตรงกับไฟล์เสียงใน audio/leni/ ถ้าแก้ข้อความต้องสร้างไฟล์เสียงใหม่ด้วย)
  const LINES = {
    th: {
      intro: "สวัสดีค่ะ! เลนี่เอง น้องเลนี่ตัวอ้วน ยินดีต้อนรับสู่หน้ากิจกรรมนะคะ",
      filters: "กดปุ่มหมวดเพื่อเลือกดูได้ ทั้งทำงาน สอนและสตาฟ อบรม และกิจกรรมค่ะ",
      timeline: "ทุกอย่างเรียงเป็นไทม์ไลน์ จากล่าสุดไปเก่าสุด กดที่รูปเพื่อดูภาพใหญ่ได้เลยค่ะ",
      end: "ด้านล่างสุดมีหน้าพอร์ตฉบับเต็มด้วยนะคะ ขอให้สนุกค่ะ บ๊ายบาย!",
    },
    en: {
      intro: "Hi! I'm Leni The Fatcat. Welcome to the Activities page!",
      filters: "Tap a category to filter: Work, Teaching and Staff, Training, and Events.",
      timeline: "Everything is on a timeline, newest first. Tap a photo to see it bigger.",
      end: "At the very bottom you'll find the full portfolio pages. Have fun, bye-bye!",
    },
  };
  window.LENI_LINES = LINES;
  const STEPS = [{ key: "intro" }, { key: "filters" }, { key: "timeline" }, { key: "end" }];

  /* ---------- เสียงพูด (ไฟล์ล่วงหน้า เล่นเร็ว 1.2 เท่าแบบไม่รักษาระดับเสียง ให้ใสแบบเด็ก) ---------- */
  const TH_VOICE = false;
  let voiceOn = ls.get(VOICE) !== "off", audio = null;
  function speak(key) {
    if (audio) { audio.pause(); audio = null; }
    if (!voiceOn || !key) return;
    if (!en() && !TH_VOICE) return;                // ไฟล์เสียงไทยชุดแรกไม่เป็นภาษาไทย: ปิดไว้จนกว่าจะสร้างใหม่
    audio = new Audio(`audio/leni/${en() ? "en" : "th"}-${key}.mp3`);
    audio.playbackRate = en() ? 1.15 : 1.2;
    if ("preservesPitch" in audio) audio.preservesPitch = false;
    else if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = false;
    audio.play().catch(() => {});
  }
  const playing = () => audio && !audio.paused && !audio.ended;

  function start() {
    const ov = document.createElement("div");
    ov.className = "lt le"; ov.id = "le-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "le-name");
    ov.innerHTML = `
      <div class="lt-stage">
        <img class="lt-cat ln-cat" id="le-cat" src="images/leni.gif" alt="">
        <div class="lt-box ln-box">
          <div class="lt-top"><b id="le-name"></b><span class="lt-dots" id="le-dots"></span></div>
          <p class="lt-text" id="le-text" aria-live="polite"></p>
          <div class="lt-row">
            <button class="btn lt-voice" type="button" id="le-voice"></button>
            <span class="lt-lang"><button class="btn" type="button" data-le-lang="th">ไทย</button><button class="btn" type="button" data-le-lang="en">ENG</button></span>
            <span class="lt-nav"><button class="btn" type="button" id="le-prev"></button><button class="btn lt-next" type="button" id="le-next"></button></span>
          </div>
        </div>
      </div>
      <button class="lt-skip" type="button" id="le-skip"></button>`;
    document.body.appendChild(ov);
    const $ = id => document.getElementById(id);
    const cv = $("le-cat");
    let i = 0, heard = false;

    function render(say) {
      const st = STEPS[i];
      $("le-name").textContent = tx("น้องเลนี่ตัวอ้วน", "Leni The Fatcat");
      cv.setAttribute("alt", tx("น้องเลนี่ตัวอ้วน แมวสีฟ้าหูยาว", "Leni The Fatcat, a round blue cat with floppy ears"));
      $("le-text").textContent = LINES[en() ? "en" : "th"][st.key];
      $("le-dots").innerHTML = STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
      $("le-prev").textContent = tx("◀ ย้อนกลับ", "◀ Back"); $("le-prev").disabled = i === 0;
      $("le-next").textContent = i === STEPS.length - 1 ? tx("ดูกิจกรรมเลย! ✓", "Let's go! ✓") : tx("ถัดไป ▶", "Next ▶");
      $("le-skip").textContent = tx("ข้าม ✕", "Skip ✕");
      $("le-voice").textContent = voiceOn ? "🔊" : "🔇";
      $("le-voice").setAttribute("aria-label", voiceOn ? tx("ปิดเสียงพูด", "Mute voice") : tx("เปิดเสียงพูด", "Turn voice on"));
      $("le-voice").setAttribute("aria-pressed", String(voiceOn));
      ov.querySelectorAll("[data-le-lang]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.leLang === "en") === en())));
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

    $("le-next").addEventListener("click", () => { heard = true; i === STEPS.length - 1 ? finish() : go(i + 1); });
    $("le-prev").addEventListener("click", () => { heard = true; go(i - 1); });
    $("le-skip").addEventListener("click", finish);
    $("le-voice").addEventListener("click", () => { heard = true; voiceOn = !voiceOn; ls.set(VOICE, voiceOn ? "on" : "off"); render(voiceOn); });
    ov.addEventListener("click", e => { const b = e.target.closest("[data-le-lang]"); if (b) { heard = true; S.setLang(b.dataset.leLang); } });
    // เบราว์เซอร์ไม่ให้เล่นเสียงก่อนผู้ใช้แตะหน้าจอ: แตะครั้งแรกให้พูดขั้นที่แสดงอยู่
    ov.addEventListener("pointerdown", () => { if (!heard) { heard = true; setTimeout(() => { if (!playing()) render(true); }, 60); } }, true);

    render(true);
    requestAnimationFrame(() => ov.classList.add("lt-in"));
    setTimeout(() => $("le-next").focus({ preventScroll: true }), 50);
  }

  // ลูน่ากำลังแนะนำปุ่มอยู่ → รอให้จบก่อน แล้วเลนี่ค่อยออกมา
  if (document.getElementById("lt-ov")) document.addEventListener("lunadone", () => setTimeout(start, 350), { once: true });
  else start();
})();

