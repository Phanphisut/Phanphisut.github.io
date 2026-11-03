/* Live scene effects in the header: real Bangkok weather (Open-Meteo) and Thai festivals by date.
   Test overrides: ?weather=clear|cloudy|rain|storm  ?fest=loykrathong|newyear|songkran */
(function () {
  "use strict";
  const S = window.SITE, hero = document.getElementById("hero");
  if (!S || !hero) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = new URLSearchParams(location.search);

  /* ---------- festivals ---------- */
  // Loy Krathong follows the lunar calendar: add next years' dates here (yyyy-mm-dd)
  const LOY_KRATHONG = ["2026-11-24"];
  function bangkokDate() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function festival() {
    const f = q.get("fest"); if (f) return f;
    const d = bangkokDate(), md = d.slice(5);
    const near = (day, before, after) => { const a = new Date(day + "T00:00:00Z"), b = new Date(d + "T00:00:00Z"), diff = (b - a) / 864e5; return diff >= -before && diff <= after; };
    if (LOY_KRATHONG.some(x => near(x, 2, 1))) return "loykrathong";
    if (md === "12-31" || md === "01-01" || md === "01-02") return "newyear";
    if (md >= "04-13" && md <= "04-15") return "songkran";
    return "";
  }
  const FEST = festival();
  const GREET = {
    loykrathong: ["🏮 สุขสันต์วันลอยกระทง", "🏮 Happy Loy Krathong"],
    newyear: ["🎆 สวัสดีปีใหม่!", "🎆 Happy New Year!"],
    songkran: ["💦 สุขสันต์วันสงกรานต์", "💦 Happy Songkran"],
  };
  let badge = null;
  function paintGreeting() {
    if (!GREET[FEST]) return;
    if (!badge) { badge = document.createElement("div"); badge.className = "fest-badge"; hero.appendChild(badge); }
    badge.textContent = S.L(GREET[FEST]);
    const sp = document.getElementById("splash"); if (sp) sp.textContent = S.L(GREET[FEST]).replace(/^\S+\s/, "") + "!";
  }
  paintGreeting();
  document.addEventListener("sitelang", paintGreeting);

  /* ---------- weather ---------- */
  let ready = false;
  const W = { rain: 0, storm: false, clouds: 0, code: null, temp: null, ok: false };
  window.SITE_WEATHER = W;
  function apply(code, cloud, temp) {
    W.code = code; W.clouds = Math.max(0, Math.min(1, (cloud ?? 0) / 100)); W.temp = temp;
    W.rain = [51, 53, 56].includes(code) ? 1 : [55, 57, 61, 63, 80, 81].includes(code) ? 2 : [65, 66, 67, 82].includes(code) ? 3 : code >= 95 ? 3 : 0;
    W.storm = code >= 95; W.ok = true;
    S.redrawSky(); if (ready) kick();
  }
  const ov = q.get("weather");
  if (ov) {
    const M = { clear: [0, 5], cloudy: [3, 90], rain: [63, 95], storm: [95, 100] };
    const m = M[ov] || M.clear; apply(m[0], m[1], 31);
  } else {
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("wx") || "null"); } catch (e) {}
    if (cached && Date.now() - cached.t < 15 * 60e3) apply(cached.code, cached.cloud, cached.temp);
    else fetch("https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code,cloud_cover&timezone=Asia%2FBangkok")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => {
        const c = j.current || {};
        try { sessionStorage.setItem("wx", JSON.stringify({ t: Date.now(), code: c.weather_code, cloud: c.cloud_cover, temp: c.temperature_2m })); } catch (e) {}
        apply(c.weather_code, c.cloud_cover, c.temperature_2m);
      })
      .catch(() => {});
  }
  const WX_NAME = code => code == null ? ["ไม่ทราบ", "unknown"] :
    code === 0 ? ["ท้องฟ้าแจ่มใส", "clear sky"] : code <= 2 ? ["มีเมฆบางส่วน", "partly cloudy"] : code === 3 ? ["เมฆมาก", "overcast"] :
    code <= 48 ? ["มีหมอก", "fog"] : code <= 57 ? ["ฝนปรอย", "drizzle"] : code <= 67 ? ["ฝนตก", "rain"] : code <= 77 ? ["หิมะ", "snow"] :
    code <= 82 ? ["ฝนตกเป็นช่วง ๆ", "rain showers"] : ["พายุฝนฟ้าคะนอง", "thunderstorm"];
  S.weather = () => ({ ...W, name: S.L(WX_NAME(W.code)), fest: FEST, festName: GREET[FEST] ? S.L(GREET[FEST]) : "" });

  /* ---------- effects canvas (1/3 resolution) ---------- */
  const cv = document.createElement("canvas");
  cv.className = "fx pix"; cv.setAttribute("aria-hidden", "true");
  const sky = document.getElementById("sky");
  sky.insertAdjacentElement("afterend", cv);
  const g = cv.getContext("2d"), K = 3;
  let w = 0, h = 0, groundY = 0;
  function size() {
    w = Math.ceil(hero.clientWidth / K); h = Math.ceil(hero.clientHeight / K);
    cv.width = w; cv.height = h; groundY = Math.round((hero.clientHeight - 96) / K);
  }
  size(); addEventListener("resize", size);
  const P = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  let drops = [], flash = 0, nextFlash = 3, krathongs = [], lanterns = [], rockets = [], sparks = [], water = [];
  function seed() {
    drops = Array.from({ length: Math.round(W.rain * 70) }, () => ({ x: rnd(0, w), y: rnd(0, groundY), v: rnd(90, 140) }));
    if (FEST === "loykrathong") {
      krathongs = Array.from({ length: 6 }, (_, i) => ({ x: (i / 6) * w + rnd(0, 20), y: groundY - rnd(4, 18), v: rnd(3, 6), ph: rnd(0, 6) }));
      lanterns = Array.from({ length: 9 }, () => ({ x: rnd(0, w), y: rnd(10, groundY), v: rnd(4, 8), dx: rnd(-2, 2), ph: rnd(0, 6) }));
    }
  }
  function drawKrathong(k, t) {
    const y = k.y + Math.sin(t * 1.4 + k.ph) * 0.8;
    P(k.x, y, 8, 2, "#2f7a3a"); P(k.x + 1, y + 2, 6, 1, "#1f5a28");
    P(k.x + 1, y - 2, 6, 2, "#f2a0c8"); P(k.x + 2, y - 3, 4, 1, "#ffe0ef");
    P(k.x + 4, y - 6, 1, 3, "#fff3c4");
    if (Math.floor(t * 8 + k.ph) % 3) P(k.x + 4, y - 7, 1, 1, "#ffb84d");
    g.fillStyle = "rgba(255,184,77,.18)"; g.fillRect(Math.round(k.x + 2), Math.round(y - 9), 5, 3);
  }
  function drawLantern(l, t) {
    const a = Math.max(0, Math.min(1, l.y / (groundY * .5)));
    g.globalAlpha = a;
    g.fillStyle = "rgba(255,150,60,.25)"; g.fillRect(Math.round(l.x - 1), Math.round(l.y - 1), 5, 7);
    P(l.x, l.y, 3, 4, "#ff9a3c"); P(l.x, l.y, 3, 1, "#ffd08a");
    if (Math.floor(t * 6 + l.ph) % 2) P(l.x + 1, l.y + 4, 1, 1, "#fff1a8");
    g.globalAlpha = 1;
  }
  const FW = ["#ff5a7a", "#ffd04a", "#7fe0ff", "#b38cff", "#7ed83c", "#ffffff"];
  function frame(t, dt) {
    g.clearRect(0, 0, w, h);
    // rain
    if (W.rain) {
      drops.forEach(d => {
        d.y += d.v * dt; d.x -= d.v * dt * 0.25;
        if (d.y > groundY) { if (Math.random() < .3) P(d.x - 1, groundY - 1, 3, 1, "rgba(150,200,255,.6)"); d.y = rnd(-20, 0); d.x = rnd(0, w + 30); }
        P(d.x, d.y, 1, 3, "rgba(160,205,255,.75)");
      });
    }
    if (W.storm) {
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 0.18; nextFlash = rnd(5, 12); }
      if (flash > 0) { flash -= dt; g.fillStyle = "rgba(220,235,255,.35)"; g.fillRect(0, 0, w, groundY); }
    }
    // Loy Krathong
    if (FEST === "loykrathong") {
      lanterns.forEach(l => { l.y -= l.v * dt; l.x += Math.sin(t * .5 + l.ph) * l.dx * dt; if (l.y < -8) { l.y = groundY - 2; l.x = rnd(0, w); } drawLantern(l, t); });
      krathongs.forEach(k => { k.x += k.v * dt; if (k.x > w + 10) k.x = -12; drawKrathong(k, t); });
    }
    // New Year fireworks
    if (FEST === "newyear") {
      if (Math.random() < dt * 1.2) rockets.push({ x: rnd(w * .1, w * .9), y: groundY, v: rnd(70, 95), top: rnd(groundY * .15, groundY * .5), c: FW[Math.floor(rnd(0, FW.length))] });
      rockets = rockets.filter(r => {
        r.y -= r.v * dt; P(r.x, r.y, 1, 2, "#ffe7b0");
        if (r.y <= r.top) { const n = 26; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, s = rnd(18, 30); sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.8, 1.3), c: r.c }); } return false; }
        return true;
      });
      sparks = sparks.filter(s => { s.life -= dt; s.vy += 18 * dt; s.x += s.vx * dt; s.y += s.vy * dt; g.globalAlpha = Math.max(0, Math.min(1, s.life)); P(s.x, s.y, 1, 1, s.c); g.globalAlpha = 1; return s.life > 0; });
    }
    // Songkran water splashes
    if (FEST === "songkran") {
      if (Math.random() < dt * 2.5) { const x = rnd(w * .05, w * .95), dir = Math.random() < .5 ? -1 : 1; for (let i = 0; i < 26; i++) water.push({ x, y: groundY - 1, vx: dir * rnd(10, 40), vy: -rnd(35, 70), life: 1.6 }); }
      water = water.filter(p => { p.life -= dt; p.vy += 80 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > groundY) return false; P(p.x, p.y, 2, 2, p.life > .8 ? "#bfeaff" : "#4fb3ff"); return p.life > 0; });
    }
  }
  let running = false, visible = true, last = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  function active() { return !reduce && (W.rain || W.storm || FEST); }
  function loop(now) {
    if (!active()) { running = false; g.clearRect(0, 0, w, h); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (visible && !document.hidden) frame(now / 1000, dt);
    requestAnimationFrame(loop);
  }
  function kick() { seed(); if (!running && active()) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  ready = true; kick();
})();
