/* น้องลินูตัวอ้วน (Linou The Fatcat) แมวฟ้าใส่หูฟัง แนะนำหน้าผลงาน (projects.html)
   - ตัวใหญ่กลางจอเหมือนน้องลูน่า วาดสดเป็นพิกเซลอาร์ต 72×72 (จาก artifact "น้องหูฟัง" 3 ท่า: เด้งดึ๋ง / โบกมือ / ฟังเพลงโยกตัว)
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
  // move: 0 เด้งดึ๋ง, 1 โบกมือ, 2 ฟังเพลงโยกตัว
  const STEPS = [{ key: "intro", move: 1 }, { key: "filters", move: 0 }, { key: "cards", move: 2 }, { key: "end", move: 1 }];

  /* ---------- ตัวละคร: พิกเซลอาร์ต 72×72 ---------- */
  const W = 72, H = 72, OX = 4, OY = 12, G = 52;
  const C = { ol: "#10303a", body: "#93dde6", hi: "#c4f1f4", sh: "#6fc3cf", belly: "#f8f7f2", belly2: "#dfe1ea",
    ear: "#17171d", hp: "#1d1d24", shine: "#e9eef3", eyeW: "#fbf9f1", eyeR: "#bcdde1", eye: "#18181d", shadow: "#0b1620", note: "#cfeff3" };
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const and = (a, b) => (x, y) => a(x, y) && b(x, y);
  const not = a => (x, y) => !a(x, y);
  const mir = m => (x, y) => m(64 - x, y);
  const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  function tri(ax, ay, bx, by, cx, cy) {
    return (x, y) => {
      const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by), d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy), d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
      return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
    };
  }
  function arm(px, py, th, side, len, lo, sh) {
    const dx = side * Math.sin(th), dy = Math.cos(th), cx = px + dx * len, cy = py + dy * len;
    return (x, y) => { const u = ((x - cx) * dx + (y - cy) * dy) / lo, v = ((x - cx) * -dy + (y - cy) * dx) / sh; return u * u + v * v <= 1; };
  }
  const NOTE = ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."];
  function makeRenderer(canvas) {
    const ctx = canvas.getContext("2d"), img = ctx.createImageData(W, H), buf = new Array(W * H), m = new Uint8Array(W * H);
    const rgb = {}; for (const k in C) { const h = C[k]; rgb[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function layer(mask, fill, ol) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = mask(x + .5, y + .5) ? 1 : 0;
      if (ol) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i]) continue;
        if ((x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W])) buf[i] = ol; }
      for (let i = 0; i < W * H; i++) if (m[i]) buf[i] = fill;
    }
    return function draw(st) {
      buf.fill(null);
      const inv = (X, Y) => { const h = (OY + G + st.dy - Y) / st.sy; return [32 + (X - OX - 32 - st.dx - st.tilt * h / 20) / st.sx, G - h]; };
      const L = f => (X, Y) => { const p = inv(X, Y); return f(p[0], p[1]); };
      layer(ell(OX + 32 + st.dx, OY + G, 20 * st.shadow, 2.3), C.shadow);
      for (const s of [1, -1]) {
        const e = s > 0 ? st.earL : st.earR, w = s > 0 ? (f => f) : mir;
        layer(L(w(tri(14.5, 22, 16.5 + e.x, 8.5 + e.y, 27, 15))), C.body, C.ol);
        layer(L(w(tri(16, 19.8, 17.2 + e.x, 11.2 + e.y, 24, 15.6))), C.ear);
      }
      const body = ell(32, 32.5, 21, 19.5);
      layer(L(body), C.body, C.ol);
      layer(L(and(body, not(ell(30.8, 31.3, 21, 19.5)))), C.sh);
      layer(L(and(body, ell(30, 15.8, 8, 1.2))), C.hi);
      const belly = and(body, ell(32, 46, 21.5, 13.5));
      layer(L(belly), C.belly);
      layer(L(and(belly, (x, y) => y > 47.5)), C.belly2);
      for (const w of [f => f, mir]) { layer(L(w(ell(10.5, 24.5, 5, 7))), C.hp, C.ol); layer(L(w(ell(7.3, 24, 0.9, 2.6))), C.shine); }
      layer(L(arm(15.5, 38, st.thL, -1, 3.5, 4.2, 3.2)), C.body, C.ol);
      if (st.wave) layer(L(arm(51.5, 37, st.thR, 1, 5.5, 5, 3)), C.body, C.ol);
      else layer(L(arm(48.5, 38, st.thR, 1, 3.5, 4.2, 3.2)), C.body, C.ol);
      for (const cx of [23, 41]) { layer(L(ell(cx, 24.5, 6.2, 5.5)), C.eyeW, C.eyeR); layer(L(ell(cx + .2, 24.6, 4.4, 3.7)), C.eye); }
      // ปาก: พูดอยู่ = อ้าเล็กน้อย
      layer(L(st.talk ? rect(30.3, 29.6, 33.8, 31.6) : rect(29.8, 30, 34.3, 31.1)), C.eye);
      for (const n of st.notes) { const x0 = Math.round(n.x), y0 = Math.round(n.y);
        NOTE.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === "#") { const X = x0 + i, Y = y0 + j; if (X >= 0 && X < W && Y >= 0 && Y < H) buf[Y * W + X] = C.note; } }); }
      const d = img.data;
      for (let i = 0; i < W * H; i++) { const c = buf[i]; if (c) { const v = rgb[c]; d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0; }
      ctx.putImageData(img, 0, 0);
    };
  }
  const base = () => ({ dx: 0, dy: 0, sx: 1, sy: 1, tilt: 0, thL: 1.25, thR: 1.25, wave: false, talk: false, earL: { x: 0, y: 0 }, earR: { x: 0, y: 0 }, shadow: 1, notes: [] });
  const TAU = Math.PI * 2;
  const MOVES = [
    t => { const s = base(), p = (t % 0.9) / 0.9;
      if (p < 0.15 || p >= 0.85) { const q = p < 0.15 ? (p + 0.15) / 0.3 : (p - 0.85) / 0.3, k = Math.sin(Math.PI * q); s.sy = 1 - 0.15 * k; s.sx = 1 + 0.11 * k; s.earL.y = s.earR.y = 1.2 * k; }
      else { const q = (p - 0.15) / 0.7, h = Math.sin(Math.PI * q); s.dy = -11 * h; s.sy = 1 + 0.08 * (1 - h); s.sx = 1 - 0.05 * (1 - h);
        s.thL = s.thR = 1.25 + 1.0 * h; s.earL.y = s.earR.y = 1.6 * Math.cos(Math.PI * q); s.shadow = 1 - 0.35 * h; }
      return s; },
    t => { const s = base(); s.wave = true;
      s.thR = 2.25 + 0.4 * Math.sin(TAU * t / 0.45); s.tilt = -1.2 + 0.4 * Math.sin(TAU * t / 0.9);
      s.dy = -0.8 * Math.abs(Math.sin(TAU * t / 0.9)); s.thL = 1.25 + 0.12 * Math.sin(TAU * t / 0.9);
      const tw = Math.sin(TAU * t / 1.8) > 0.85; s.earR.x = tw ? 1 : 0; s.earR.y = tw ? -1 : 0;
      return s; },
    t => { const s = base(), w = Math.sin(TAU * t / 1.2);
      s.tilt = 3.2 * w; s.dx = 0.9 * w;
      const b = Math.abs(Math.sin(TAU * t / 0.6)); s.dy = -1.4 * b; s.sy = 1 - 0.05 * (1 - b); s.sx = 1 + 0.04 * (1 - b);
      s.earL.y = -1.3 * Math.max(0, w); s.earR.y = -1.3 * Math.max(0, -w);
      s.thL = 1.25 + 0.6 * Math.max(0, w); s.thR = 1.25 + 0.6 * Math.max(0, -w);
      for (let i = 0; i < 2; i++) { const n = ((t + i * 0.9) % 1.8) / 1.8; if (n < 0.85) s.notes.push({ x: (i ? OX + 60 : OX - 2) + Math.sin(n * 7) * 2, y: OY + 18 - n * 26 }); }
      return s; },
  ];

  /* ---------- เสียงพูด (ไฟล์ล่วงหน้า เล่นเร็ว 1.2 เท่าแบบไม่รักษาระดับเสียง ให้ใสแบบเด็ก) ---------- */
  let voiceOn = ls.get(VOICE) !== "off", audio = null;
  function speak(key) {
    if (audio) { audio.pause(); audio = null; }
    if (!voiceOn || !key) return;
    audio = new Audio(`audio/linou/${en() ? "en" : "th"}-${key}.mp3`);
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
        <canvas class="lt-cat ln-cat" id="ln-cat" width="${W}" height="${H}" role="img"></canvas>
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
    const cv = $("ln-cat"), draw = makeRenderer(cv);
    let i = 0, heard = false, alive = true;

    function render(say) {
      const st = STEPS[i];
      $("ln-name").textContent = tx("น้องลินูตัวอ้วน", "Linou The Fatcat");
      cv.setAttribute("aria-label", tx("น้องลินูตัวอ้วน แมวสีฟ้าใส่หูฟัง", "Linou The Fatcat, a round blue cat wearing headphones"));
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

    // วาดที่ 12 fps แบบพิกเซลอาร์ต; ปากขยับตอนเสียงกำลังเล่น
    let clock = 0, last = performance.now(), acc = 0;
    function loop(now) {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; clock += dt; acc += dt;
      if (acc >= 1 / 12 || reduce) {
        acc %= 1 / 12;
        const t = reduce ? 0.5 : Math.floor(clock * 12) / 12, s = MOVES[STEPS[i].move](t);
        s.talk = playing() && Math.floor(clock * 7) % 2 === 0;
        draw(s);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function finish() {
      speak(null);
      removeEventListener("keydown", onKey, true);
      document.removeEventListener("sitelang", onLang);
      const end = () => { alive = false; ov.remove(); };
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
