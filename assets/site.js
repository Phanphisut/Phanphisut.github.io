/* Shared layout, pixel art, language switch and page renderers. Data lives in data.js. */
(function () {
  "use strict";

  /* ---------- language ---------- */
  let lang = "th";
  try { lang = localStorage.getItem("lang") === "en" ? "en" : "th"; } catch (e) {}
  const L = v => Array.isArray(v) ? v[lang === "en" ? 1 : 0] : v;
  const T = k => I18N[k] ? L(I18N[k]) : k;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = { th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
                   en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
  const mon = m => MONTHS[lang][m - 1];
  function fmtD(spec) {
    const [a, b] = spec.split("/");
    const [y, m, d] = a.split("-").map(Number);
    if (!b) return d ? `${d} ${mon(m)} ${y}` : `${mon(m)} ${y}`;
    if (b === "now") return `${mon(m)} ${y} – ${T("now")}`;
    if (b.includes("-")) { const [y2, m2] = b.split("-").map(Number); return y2 === y ? `${mon(m)} – ${mon(m2)} ${y}` : `${mon(m)} ${y} – ${mon(m2)} ${y2}`; }
    return `${d}–${b} ${mon(m)} ${y}`;
  }
  const ymOf = spec => spec.slice(0, 7);
  const fmtYm = ym => { const [y, m] = ym.split("-").map(Number); return `${mon(m)} ${y}`; };
  const fmtIso = iso => { const d = new Date(iso); return `${d.getDate()} ${mon(d.getMonth() + 1)} ${d.getFullYear()}`; };

  /* ---------- pixel art ---------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function fromRows(rows, pal) {
    const c = canvasOf(rows[0].length, rows.length), g = c.getContext("2d");
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  function noiseTile(colors, seed, size = 16) {
    const c = canvasOf(size, size), g = c.getContext("2d"), r = rng(seed);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { g.fillStyle = colors[Math.floor(r() * colors.length)]; g.fillRect(x, y, 1, 1); }
    return c;
  }
  const DIRT = ["#866043", "#79553a", "#96704f", "#6b4a32", "#866043"];
  const STONE = ["#7f7f7f", "#747474", "#8c8c8c", "#686868", "#7f7f7f"];
  const GRASS = ["#5aa53a", "#4f9330", "#68b546", "#5aa53a"];
  function grassBlock(seed) {
    const c = noiseTile(DIRT, seed), g = c.getContext("2d"), r = rng(seed + 7);
    for (let x = 0; x < 16; x++) { const depth = 3 + Math.floor(r() * 3); for (let y = 0; y < depth; y++) { g.fillStyle = GRASS[Math.floor(r() * GRASS.length)]; g.fillRect(x, y, 1, 1); } }
    return c;
  }
  function oreBlock(color, seed) {
    const c = noiseTile(STONE, seed), g = c.getContext("2d"), r = rng(seed + 3);
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(r() * 12), y = 1 + Math.floor(r() * 12);
      g.fillStyle = color; g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y + 1, 1, 1);
      g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(x, y, 1, 1);
    }
    return c;
  }
  // dark rock block with a teal crust and glowing crystals (hotbar "home" icon)
  function crystalBlockIcon() {
    const c = noiseTile(["#0c1a24", "#0f202c", "#0a151e", "#112532"], 4242), g = c.getContext("2d"), r = rng(4243);
    for (let x = 0; x < 16; x++) { const d = 2 + Math.floor(r() * 2); for (let y = 0; y < d; y++) { g.fillStyle = ["#1a5658", "#1f6466", "#2d6a8a"][Math.floor(r() * 3)]; g.fillRect(x, y, 1, 1); } }
    [[3, 6, 5], [8, 4, 7], [12, 8, 4]].forEach(([x, y, h]) => {
      g.fillStyle = "#2d6a8a"; g.fillRect(x, y, 2, h);
      g.fillStyle = "#49b7e8"; g.fillRect(x, y, 1, h - 1);
      g.fillStyle = "#d8f3ff"; g.fillRect(x, y, 1, 1);
    });
    return c;
  }
  const HERO_PAL = { h: "#2e2018", s: "#e0ac7e", e: "#1d1d1d", m: "#b5795a", o: "#e07a2a", d: "#b85d17", p: "#4a4f5a", b: "#262626" };
  const S = {
    hero: fromRows(["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "oooooooo", "oooddooo", "soooooos", "s.oooo.s",
                    ".pppppp.", ".pp..pp.", ".pp..pp.", ".pp..pp.", ".bb..bb.", ".bb..bb."], HERO_PAL),
    heroStep: fromRows(["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "oooooooo", "oooddooo", "soooooos", "s.oooo.s",
                    ".pppppp.", ".pp..pp.", "pp....pp", "pp....pp", "bb....bb", "bb....bb"], HERO_PAL),
    face: fromRows(["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "oooooooo", "oooddooo"], HERO_PAL),
    // side view, facing right (flipped with CSS when walking left)
    sideA: fromRows(["..hhhh..", ".hhhhhh.", ".hhssss.", ".hhsses.", ".hssssss", "..sssm..", "..oooo..", ".ooooo..", ".oddoo..", ".oooso..",
                     "..ppp...", "..ppp...", "..pppp..", ".pp..pp.", ".pp..pp.", "bbb..bbb"], HERO_PAL),
    sideB: fromRows(["..hhhh..", ".hhhhhh.", ".hhssss.", ".hhsses.", ".hssssss", "..sssm..", "..oooo..", ".ooooo..", ".oddoo..", ".oooso..",
                     "..ppp...", "..ppp...", "..ppp...", "..ppp...", "..ppp...", "..bbbb.."], HERO_PAL),
    soundOn: fromRows(["............", ".....k......", "....kk...w..", "...kkk....w.", "kkkkkk..w.w.", "kkkkkk...w.w",
                       "kkkkkk...w.w", "kkkkkk..w.w.", "...kkk....w.", "....kk...w..", ".....k......", "............"], { k: "#e6f1f8", w: "#3fb6ff" }),
    soundOff: fromRows(["............", ".....k......", "....kk......", "...kkk......", "kkkkkk.r...r", "kkkkkk..r.r.",
                        "kkkkkk...r..", "kkkkkk..r.r.", "...kkk.r...r", "....kk......", ".....k......", "............"], { k: "#93a9ba", r: "#ff4a4a" }),
    drone: fromRows(["ppp.......ppp", ".f.........f.", ".fffbbbbbfff.", "....bblbb....", "....f...f...."], { p: "#cfd6dc", f: "#2b2b2b", b: "#e9e9e9", l: "#ff3b3b" }),
    tree: fromRows(["..gggggg..", ".gGgggGgg.", "gggGgggGgg", "gGgggggggG", "ggggGgGggg", ".gggggggg.", "..ggttgg..", "....tt....", "....tt....", "....tt....", "....tt....", "....tt...."],
                   { g: "#3f8a2a", G: "#2f6e1f", t: "#6b4a2b" }),
    chest: fromRows(["............", ".dddddddddd.", ".dwwwwwwwwd.", ".dwwwwwwwwd.", ".ddddkkdddd.", ".dwwwkkwwwd.", ".dwwwwwwwwd.", ".dwwwwwwwwd.", ".dwwwwwwwwd.", ".dddddddddd.", "............", "............"],
                    { w: "#a0652a", d: "#5e3a17", k: "#d8d8d8" }),
    medal: fromRows(["..rr....bb..", "...rr..bb...", "....rrbb....", ".....rb.....", "....yyyy....", "...yggggy...", "..yggggggy..", "..yggwgggy..", "..yggggggy..", "...yggggy...", "....yyyy....", "............"],
                    { r: "#d33b3b", b: "#3b6bd3", g: "#f2c230", y: "#a77a0b", w: "#fff6c0" }),
    map: fromRows(["............", ".dddddddddd.", ".dppgppbbpd.", ".dpgggpbbpd.", ".dppgppppbd.", ".dpppprppbd.", ".dbppprrppd.", ".dbbppprpgd.", ".dbbppppggd.", ".dpbbppgggd.", ".dddddddddd.", "............"],
                  { p: "#e8d9a8", d: "#8a6d3b", r: "#d33b3b", g: "#4a8f3a", b: "#4b7bd3" }),
    bubble: fromRows(["............", ".wwwwwwwwww.", "wwwwwwwwwwww", "wwkkwkkwkkww", "wwkkwkkwkkww", "wwwwwwwwwwww", ".wwwwwwwwww.", "...www......", "..ww........", ".w..........", "............", "............"],
                     { w: "#f0f0f0", k: "#555" }),
    globe: fromRows(["...bbbbbb...", "..bbggbbbb..", ".bbgggbbggb.", "bbbggbbbgggb", "bbbbbbbbggbb", "bggbbbbbbbbb", "bgggbbbggbbb", "bbggbbgggbbb", ".bbbbbgggbb.", "..bbbbbgbb..", "...bbbbbb...", "............"],
                    { b: "#3b7bd3", g: "#5aa53a" }),
    line: fromRows(["............", ".gggggggggg.", "gggggggggggg", "ggwwgwwgwwgg", "ggwwgwwgwwgg", "gggggggggggg", ".gggggggggg.", "...ggg......", "..gg........", ".g..........", "............", "............"],
                   { g: "#06c755", w: "#ffffff" }),
    fb: fromRows(["bbbbbbbbbbbb", "bbbbbbbwwwbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbwwwwwwbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb", "bbbbbbwwbbbb"],
                 { b: "#1877f2", w: "#ffffff" }),
    ig: fromRows([".pppppppppp.", "pppppppppppp", "ppwwwwwwwwpp", "ppwppppppwpp", "ppwppwwppwpp", "ppwpwppwpwpp", "oowowoowowoo", "oowoowwoowoo", "oowoooooowoo", "oowwwwwwwwoo", "oooooooooooo", ".oooooooooo."],
                 { p: "#c13584", o: "#f56040", w: "#ffffff" }),
    term: fromRows(["kkkkkkkkkkkk", "kssssssssssk", "kkkkkkkkkkkk", "kgkkkkkkkkkk", "kkgkkkkkkkkk", "kkkgkkkkkkkk", "kkgkkkkkkkkk", "kgkkkggggkkk", "kkkkkkkkkkkk", "kkkkkkkkkkkk", "kkkkkkkkkkkk", "kkkkkkkkkkkk"],
                   { k: "#1d1d1d", s: "#5a5a5a", g: "#3fd65a" }),
    grass: grassBlock(42),
    crystal: crystalBlockIcon(),
  };
  const URLS = {};
  const sprite = n => URLS[n] || (URLS[n] = S[n].toDataURL());
  function paintSprites(root) {
    root.querySelectorAll("img[data-sprite]").forEach(img => {
      const c = S[img.dataset.sprite]; if (!c || img.dataset.done) return;
      img.src = sprite(img.dataset.sprite); img.width = c.width * 4; img.height = c.height * 4; img.dataset.done = 1;
    });
  }

  /* ---------- page config ---------- */
  const PAGES = [
    { id: "home", file: "index.html", key: "nav.home", sprite: "crystal" },
    { id: "projects", file: "projects.html", key: "nav.projects", sprite: "chest", sub: "projects.sub" },
    { id: "activities", file: "activities.html", key: "nav.activities", sprite: "map", sub: "activities.sub" },
    { id: "certificates", file: "certificates.html", key: "nav.certs", sprite: "medal", sub: "certs.sub" },
  ];
  const pageId = document.body.dataset.page;
  const page = pageId === "404" ? { id: "404", file: "404.html", key: "nf.title", sprite: "crystal", sub: "nf.sub" } : (PAGES.find(p => p.id === pageId) || PAGES[0]);
  const isHome = page.id === "home";

  /* ---------- shared chrome ---------- */
  function buildChrome() {
    document.body.insertAdjacentHTML("afterbegin", `
      <a class="btn" href="#main" style="position:absolute;left:8px;top:-60px;z-index:40" onfocus="this.style.top='8px'" onblur="this.style.top='-60px'" data-i18n="skip"></a>
      <div class="topbar"><div class="wrap">
        <div class="lang" role="group" aria-label="Language / ภาษา">
          <img class="pix lang-ico" data-sprite="globe" alt="">
          <button class="btn" type="button" data-lang="th" aria-pressed="false">ไทย</button>
          <button class="btn" type="button" data-lang="en" aria-pressed="false">ENG</button>
          <button class="btn snd" type="button" id="snd" aria-pressed="false"><img class="pix" id="snd-ico" alt=""><span id="snd-txt"></span></button>
        </div>
        <nav class="pages-nav" aria-label="Pages">
          ${PAGES.map(p => `<a class="btn" href="${p.file}" data-i18n="${p.key}"${p.id === page.id ? ' aria-current="page"' : ""}></a>`).join("")}
        </nav>
      </div></div>`);
    const hero = document.getElementById("hero");
    hero.className = "overworld" + (isHome ? "" : " small");
    hero.innerHTML = `
      <canvas class="sky pix" id="sky" aria-hidden="true"></canvas>
      <div class="wrap title-block">
        ${isHome ? "" : `<p class="crumb"><a href="index.html">PHANPHISUT</a> / <span data-i18n="${page.key}"></span></p>`}
        <h1 class="title"${isHome ? "" : ` data-i18n="${page.key}"`}>${isHome ? "PHANPHISUT" : ""}</h1>
        ${isHome ? `<div class="splash-wrap" aria-hidden="true"><span class="splash" id="splash"></span></div>` : ""}
        <p class="subtitle" data-i18n="${isHome ? "role" : page.sub}"></p>
        ${isHome ? `<div class="xp"><div class="xp-level" id="xp-level"></div><div class="xp-bar"><div class="xp-fill" id="xp-fill"></div></div><div class="xp-note" data-i18n="xp.note"></div></div>` : ""}
      </div>
      <div class="land" aria-hidden="true">
        <img class="pix drone" data-sprite="drone" alt="">
        <img class="pix hero-char" data-sprite="hero" alt="">
        <canvas class="terrain pix" id="terrain"></canvas>
      </div>`;
    document.getElementById("main").insertAdjacentHTML("beforeend", `<footer><div class="wrap foot"><span data-i18n="footer"></span><span class="visits" id="visits" hidden><img class="pix" data-sprite="term" alt=""><span id="visits-txt"></span></span></div></footer>`);
    document.body.insertAdjacentHTML("beforeend", `
      <div class="hotbar-label" id="hotbar-label" aria-hidden="true"></div>
      <nav class="hotbar" aria-label="Hotbar">
        ${PAGES.map((p, i) => `<a href="${p.file}" data-key="${p.key}" class="${p.id === page.id ? "sel" : ""}"${p.id === page.id ? ' aria-current="page"' : ""}>
          <span class="key">${i + 1}</span><img class="pix" data-sprite="${p.sprite}" alt="" data-i18n-alt="${p.key}"></a>`).join("")}
      </nav>
      <dialog class="lb panel" id="lb">
        <div class="lb-inner">
          <div class="lb-img"><img id="lb-img" alt=""></div>
          <div class="lb-bar">
            <span class="lb-cap" id="lb-cap"></span>
            <button class="btn" type="button" id="lb-prev" aria-label="Previous">◀</button>
            <button class="btn" type="button" id="lb-next" aria-label="Next">▶</button>
            <button class="btn" type="button" id="lb-close" data-i18n="close"></button>
          </div>
        </div>
      </dialog>`);
  }

  /* night ground: teal crystal crust over dark rock, with glowing crystal ore */
  const ROCK = ["#0c1a24", "#0f202c", "#0a151e", "#112532", "#0c1a24"];
  const DEEP = ["#070e14", "#0a1219", "#060b10", "#0b141c"];
  const CRUST = ["#1a5658", "#154446", "#1f6466", "#2d6a8a"];
  function crustBlock(seed) {
    const c = noiseTile(ROCK, seed), g = c.getContext("2d"), r = rng(seed + 7);
    for (let x = 0; x < 16; x++) { const depth = 2 + Math.floor(r() * 3); for (let y = 0; y < depth; y++) { g.fillStyle = CRUST[Math.floor(r() * CRUST.length)]; g.fillRect(x, y, 1, 1); } }
    g.fillStyle = "rgba(127,214,255,.5)"; for (let x = 0; x < 16; x += 3 + Math.floor(r() * 3)) g.fillRect(x, 0, 1, 1);
    return c;
  }
  function crystalOre(seed) {
    const c = noiseTile(DEEP, seed), g = c.getContext("2d"), r = rng(seed + 3);
    for (let i = 0; i < 4; i++) { const x = 1 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 11); g.fillStyle = "#2d6a8a"; g.fillRect(x, y, 2, 3); g.fillStyle = "#49b7e8"; g.fillRect(x, y, 1, 2); g.fillStyle = "#d8f3ff"; g.fillRect(x, y, 1, 1); }
    return c;
  }
  function drawTerrain() {
    const cv = document.getElementById("terrain"); if (!cv) return;
    const B = 16, cols = Math.ceil(cv.clientWidth / 32) + 1;
    const rows = Math.max(2, Math.round(cv.clientHeight / 32));
    cv.width = cols * B; cv.height = rows * B;
    const g = cv.getContext("2d");
    for (let x = 0; x < cols; x++) {
      g.drawImage(crustBlock(x * 13 + 1), x * B, 0);
      g.drawImage(noiseTile(ROCK, x * 7 + 300), x * B, B);
      if (rows > 2) g.drawImage(x % 7 === 3 ? crystalOre(x) : noiseTile(DEEP, x * 5 + 600), x * B, 2 * B);
    }
    cv.style.width = cols * 32 + "px";
    drawSky();
  }

  /* sky follows the real time in Thailand: dawn (orange-pink), day, dusk, night (stars). ?sky=dawn|day|dusk|night overrides */
  const SKY = {
    dawn:  { top: "#2b1f4f", bot: "#ff9e7a", stars: .3, lights: true, sun: [.18, .86], sunC: "#ffd27a",
             bands: ["#3a2240", "#5a2f4a", "#7a3f52", "#9a5258", "#b8665c", "#cf7b5e", "#1a5658", "#1a5658"] },
    day:   { top: "#2f6fc4", bot: "#8cc6f2", stars: 0, lights: false, sun: [.84, .28], sunC: "#ffe680", clouds: true, cloud: "#eaf4ff", cloudSh: "#b9d6f0",
             bands: ["#5f9fd6", "#4f90c4", "#3f80b0", "#2f7090", "#22667a", "#1c5e6a", "#1a5658", "#1a5658"] },
    dusk:  { top: "#1a1238", bot: "#d9607a", stars: .5, lights: true, sun: [.2, .95], sunC: "#ff8a5a",
             bands: ["#3a1a40", "#5a2448", "#7a2f50", "#8a3a58", "#5a3a5a", "#2f4250", "#1a5658", "#1a5658"] },
    night: { top: "#000000", bot: "#000000", stars: 1, lights: true },
  };
  function skyPhase() {
    const q = new URLSearchParams(location.search).get("sky");
    if (q && SKY[q]) return q;
    let h = 21;
    try { h = +new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Bangkok" }).format(new Date()); } catch (e) {}
    return h >= 5 && h < 7 ? "dawn" : h >= 7 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
  }
  function mix(a, b, k) {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
  }
  /* starry void + glowing horizon + crystal outcrops + distant skyline, drawn at 1/4 resolution */
  let skyStars = [], skyW = 0, skyH = 0;
  function drawSky(t = performance.now() / 1000) {
    const cv = document.getElementById("sky"); if (!cv) return;
    const hero = document.getElementById("hero");
    const W = Math.ceil(hero.clientWidth / 4), H = Math.ceil(hero.clientHeight / 4);
    if (W !== skyW || H !== skyH) {
      skyW = W; skyH = H; cv.width = W; cv.height = H;
      const r = rng(77); skyStars = [];
      const n = Math.round(W * H / 320);
      for (let i = 0; i < n; i++) skyStars.push({ x: Math.floor(r() * W), y: Math.floor(r() * (H - 46)), big: r() < .14, ph: r() * 4, sp: .5 + r() * .9 });
    }
    const g = cv.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ph = SKY[skyPhase()];
    // sky gradient in 6px-tall pixel bands
    const rows = Math.ceil((H - 24) / 6);
    for (let i = 0; i < rows; i++) P(0, i * 6, W, 6, mix(ph.top, ph.bot, i / Math.max(1, rows - 1)));
    if (ph.sun) { const sx0 = Math.floor(W * ph.sun[0]), sy0 = Math.floor((H - 40) * ph.sun[1]); P(sx0 - 4, sy0 - 4, 9, 9, ph.sunC); P(sx0 - 3, sy0 - 5, 7, 11, ph.sunC); P(sx0 - 5, sy0 - 3, 11, 7, ph.sunC); P(sx0 - 2, sy0 - 3, 3, 2, "rgba(255,255,255,.55)"); }
    // clouds: a few on clear days, many when Bangkok is actually cloudy or rainy (weather set by fx.js)
    const wx = window.SITE_WEATHER || {};
    const nClouds = Math.round((ph.clouds ? 3 : 0) + (wx.clouds || 0) * 7 + (wx.rain ? 3 : 0));
    const grey = wx.rain || (wx.clouds || 0) > .75;
    const cC = ph.clouds ? (grey ? "#aebccb" : ph.cloud) : (grey ? "#1f2a38" : "#18222f");
    const cS = ph.clouds ? (grey ? "#8494a6" : ph.cloudSh) : "#0e151e";
    for (let i = 0; i < nClouds; i++) {
      const cx = ((i * 0.37 + 0.12) % 1), cy = 0.06 + ((i * 0.29) % 0.34), sp = 1.2 + (i % 3) * .5;
      const x = Math.floor(((cx * W + t * sp) % (W + 40)) - 20), y = Math.floor((H - 40) * cy), s = 1 + (i % 2);
      P(x, y, 18 * s, 3 * s, cC); P(x + 4 * s, y - 2 * s, 9 * s, 2 * s, cC); P(x + 2 * s, y + 3 * s, 14 * s, 1 * s, cS);
    }
    if (ph.stars > 0) skyStars.forEach((s, idx) => {
      if (ph.stars < 1 && (idx % 10) / 10 >= ph.stars) return;
      const k = Math.floor(t * s.sp + s.ph);
      const lvl = reduce ? (s.big ? 2 : 0) : s.big ? (k % 3 === 0 ? 1 : 2) : (k % 4 === 0 ? 1 : 0);
      if (lvl === 0) { P(s.x, s.y, 1, 1, "#2a7fb8"); return; }
      P(s.x, s.y - 1, 1, 3, "#3fb6ff"); P(s.x - 1, s.y, 3, 1, "#3fb6ff");
      if (lvl === 2) { P(s.x, s.y - 2, 1, 5, "#3fb6ff"); P(s.x - 2, s.y, 5, 1, "#3fb6ff"); P(s.x, s.y, 1, 1, "#d8f3ff"); }
    });
    const tEl = document.getElementById("terrain");
    const ground = H - Math.round((tEl ? tEl.clientHeight : 96) / 4);   // terrain strip height in 1/4-res px
    const bands = ["#1a1023", "#0f2124", "#0f2a2c", "#123437", "#123a3d", "#154446", "#174e50", "#1a5658"];
    const top = ground - bands.length * 2;
    // skyline sits on the horizon, right of centre
    const sx = Math.floor(W * .62), tk = hero.clientWidth < 600 ? .55 : 1;   // shorter skyline on phones
    [[0, 9, 4], [5, 14, 5], [11, 7, 3], [15, 11, 4], [20, 5, 3]].forEach(([dx, h, w], k) => {
      const x = sx + dx; h = Math.round(h * tk); const y = top - h;
      P(x, y, w, h, "#1f3c52"); P(x, y, 1, h, "#2b5470");
      for (let yy = y + 2; yy < top - 1; yy += 3) for (let i = 1; i < w - 1; i += 2) {
        if (!ph.lights) P(x + i, yy, 1, 1, "#16303f");
        else if ((i * 7 + yy * 3 + k) % 5) P(x + i, yy, 1, 1, "#7fd6ff");
      }
    });
    P(sx + 7, top - Math.round(18 * tk), 1, Math.round(4 * tk), "#2b5470");
    if (reduce || Math.floor(t * 1.5) % 2) P(sx + 7, top - Math.round(18 * tk) - 1, 1, 1, "#ff4a4a");
    (ph.bands || bands).forEach((c, i) => P(0, top + i * 2, W, 2, c));
    // crystal outcrops at both edges
    [1, -1].forEach(side => {
      const X = x => side === 1 ? x : W - 1 - x;
      [[0, 22, 5], [5, 16, 4], [9, 11, 3], [12, 7, 3], [2, 28, 3]].forEach(([x, h, w]) => {
        for (let i = 0; i < w; i++) {
          const yy = ground - h + Math.abs(i - Math.floor(w / 2));
          P(X(x + i), yy, 1, ground - yy, "#13293a");
          P(X(x + i), yy, 1, 2, i < w / 2 ? "#49b7e8" : "#2d6a8a");
        }
      });
    });
  }
  /* orange hero walks along the ground: swap leg frames and face the walking direction */
  function walkHero() {
    const el = document.querySelector(".hero-char"); if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = sprite("sideA"), b = sprite("sideB");
    let step = false, lastX = el.getBoundingClientRect().left;
    el.src = a;
    setInterval(() => {
      if (document.hidden) return;
      step = !step; el.src = step ? b : a;
      const x = el.getBoundingClientRect().left;
      if (Math.abs(x - lastX) > 0.5) el.classList.toggle("flip", x < lastX);
      lastX = x;
    }, 250);
  }

  /* shooting stars: a short pixel streak every few seconds */
  function meteors() {
    const hero = document.getElementById("hero"); if (!hero) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fire = () => {
      if (!document.hidden) {
        const m = document.createElement("i");
        m.className = "meteor";
        m.style.left = (25 + Math.random() * 70) + "%";
        m.style.top = (4 + Math.random() * 30) + "%";
        m.style.animationDuration = (0.7 + Math.random() * 0.5) + "s";
        hero.appendChild(m);
        m.addEventListener("animationend", () => m.remove());
      }
      setTimeout(fire, 3500 + Math.random() * 6000);
    };
    setTimeout(fire, 1500);
  }

  /* 8-bit sound (WebAudio). One button cycles: off -> effects -> effects + music. Off by default. */
  let soundMode = "off", actx = null;
  try { const v = localStorage.getItem("sound"); soundMode = v === "on" ? "fx" : (v === "fx" || v === "music") ? v : "off"; } catch (e) {}
  let soundOn = soundMode !== "off";
  function ctx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type = "square", vol = 0.06, at) {
    const o = actx.createOscillator(), gn = actx.createGain(), t0 = (at ?? actx.currentTime) + start;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn).connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const SFX = {
    click: () => tone(880, 0, 0.05),
    page: () => { tone(523, 0, 0.06); tone(784, 0.06, 0.08); },
    open: () => { tone(659, 0, 0.05); tone(988, 0.05, 0.07); },
    close: () => { tone(659, 0, 0.05); tone(440, 0.05, 0.07); },
    on: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.07)); },
    type: () => tone(1320 + Math.random() * 160, 0, 0.025, "square", 0.025),
    jump: () => { const o = actx.createOscillator(), g = actx.createGain(), n = actx.currentTime; o.type = "square"; o.frequency.setValueAtTime(330, n); o.frequency.exponentialRampToValueAtTime(880, n + 0.12); g.gain.setValueAtTime(0.05, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.16); o.connect(g).connect(actx.destination); o.start(n); o.stop(n + 0.18); },
    drop: () => { tone(392, 0, 0.06, "triangle", 0.08); tone(262, 0.07, 0.1, "triangle", 0.08); },
    gift: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.05, 0.08)); },
    coin: () => { tone(988, 0, 0.05); tone(1319, 0.05, 0.12); },
    hurt: () => { tone(180, 0, 0.12, "sawtooth", 0.06); tone(120, 0.1, 0.15, "sawtooth", 0.06); },
    secret: () => { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, 0.09)); },
  };
  function sfx(name) {
    if (!soundOn) return;
    try { ctx(); SFX[name](); } catch (e) {}
  }

  /* original chiptune loop: lead (square) + bass (triangle) + tick, 112 bpm, 8 bars */
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const LEAD = [72, 0, 75, 77, 79, 0, 77, 75, 74, 0, 70, 72, 74, 77, 75, 0, 72, 0, 75, 77, 79, 82, 79, 77, 75, 77, 75, 74, 72, 0, 0, 0,
                67, 0, 70, 72, 74, 0, 72, 70, 72, 74, 75, 74, 72, 70, 67, 0, 68, 0, 72, 75, 77, 75, 72, 68, 70, 72, 74, 70, 67, 0, 0, 0];
  const BASS = [48, 48, 55, 48, 46, 46, 53, 46, 44, 44, 51, 44, 43, 43, 50, 43];
  let musicTimer = null, musicStep = 0, musicNext = 0;
  function startMusic() {
    if (musicTimer || soundMode !== "music") return;
    try { ctx(); } catch (e) { return; }
    const step = 60 / 112 / 2;
    musicNext = actx.currentTime + 0.1; musicStep = 0;
    musicTimer = setInterval(() => {
      while (musicNext < actx.currentTime + 0.25) {
        const i = musicStep % LEAD.length;
        if (LEAD[i]) tone(NOTE(LEAD[i]), 0, step * 0.9, "square", 0.022, musicNext);
        if (i % 4 === 0) tone(NOTE(BASS[(i / 4) % BASS.length]), 0, step * 3.6, "triangle", 0.05, musicNext);
        if (i % 2 === 1) tone(2400, 0, 0.012, "square", 0.006, musicNext);
        musicNext += step; musicStep++;
      }
    }, 60);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  // a new page needs one tap or key press before audio may start
  ["pointerdown", "keydown"].forEach(ev => addEventListener(ev, () => { if (soundMode === "music") startMusic(); }, { passive: true }));

  function paintSound() {
    const b = document.getElementById("snd"); if (!b) return;
    b.setAttribute("aria-pressed", soundOn);
    document.getElementById("snd-ico").src = sprite(soundOn ? "soundOn" : "soundOff");
    const k = "sound." + soundMode;
    document.getElementById("snd-txt").textContent = T(k);
    b.setAttribute("aria-label", T(k));
  }
  function wireSound() {
    document.getElementById("snd").addEventListener("click", e => {
      e.stopPropagation();
      soundMode = soundMode === "off" ? "fx" : soundMode === "fx" ? "music" : "off";
      soundOn = soundMode !== "off";
      try { localStorage.setItem("sound", soundMode); } catch (err) {}
      paintSound();
      if (soundMode === "music") startMusic(); else stopMusic();
      sfx("on");
    });
    // blip on buttons; chirp and short delay before going to another page
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (a && !a.target && /\.html(#.*)?$/.test(a.getAttribute("href")) && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault(); go(a.href); return;
      }
      if (e.target.closest(".shot[data-g]")) return sfx("open");
      if (e.target.closest("#lb-close")) return sfx("close");
      if (e.target.closest(".btn, .stat-row, a.inv, .repo")) sfx("click");
    });
  }
  /* game-style page change: pixel blocks close in diagonally, the next page opens them again */
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let wipe = null, going = false;
  function wipeCanvas() {
    if (wipe) return wipe;
    wipe = document.createElement("canvas"); wipe.className = "wipe"; wipe.setAttribute("aria-hidden", "true");
    document.body.appendChild(wipe);
    return wipe;
  }
  function runWipe(closing, done) {
    const cv = wipeCanvas(), B = 32, cols = Math.ceil(innerWidth / B), rows = Math.ceil(innerHeight / B);
    cv.width = cols; cv.height = rows; cv.hidden = false;
    const g = cv.getContext("2d"), maxD = cols + rows, dur = 380, t0 = performance.now();
    const order = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) order.push([x, y, (x + y) / maxD + ((x * 7 + y * 13) % 5) * .02]);
    const frame = now => {
      const k = Math.min(1, (now - t0) / dur);
      g.clearRect(0, 0, cols, rows);
      order.forEach(([x, y, d]) => {
        const on = closing ? k >= d * .9 : k < d * .9 + .1;
        if (on) { g.fillStyle = (x + y) % 2 ? "#05080c" : "#0a1018"; g.fillRect(x, y, 1, 1); }
      });
      if (k < 1) requestAnimationFrame(frame);
      else { if (!closing) cv.hidden = true; done && done(); }
    };
    requestAnimationFrame(frame);
  }
  function go(href) {
    if (going) return; going = true;
    sfx("page");
    if (REDUCE) { location.href = href; return; }
    try { sessionStorage.setItem("wipe", "1"); } catch (e) {}
    runWipe(true, () => { location.href = href; });
    setTimeout(() => { location.href = href; }, 1200);
  }
  function wipeIn() {
    let flag = false; try { flag = sessionStorage.getItem("wipe") === "1"; sessionStorage.removeItem("wipe"); } catch (e) {}
    if (flag && !REDUCE) runWipe(false);
  }
  addEventListener("pageshow", e => { if (e.persisted) { going = false; if (wipe) wipe.hidden = true; } });

  function animateSky() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const hero = document.getElementById("hero");
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
    setInterval(() => { if (visible && !document.hidden) drawSky(); }, 250);
  }

  function paintUnderground() {
    const t = canvasOf(48, 48), g = t.getContext("2d"), r = rng(901);
    g.fillStyle = "#05080c"; g.fillRect(0, 0, 48, 48);
    for (let i = 0; i < 7; i++) { g.fillStyle = r() < .3 ? "#1d4f6e" : "#11283a"; g.fillRect(Math.floor(r() * 48), Math.floor(r() * 48), 1, 1); }
    const m = document.getElementById("main");
    [m, document.body].forEach(el => { el.style.backgroundImage = `url(${t.toDataURL()})`; el.style.backgroundSize = "144px 144px"; el.style.imageRendering = "pixelated"; });
  }

  /* ---------- lightbox ---------- */
  const groups = {};
  let lbList = [], lbI = 0;
  function lbShow() {
    const it = lbList[lbI];
    document.getElementById("lb-img").src = it.src;
    document.getElementById("lb-img").alt = it.cap;
    document.getElementById("lb-cap").textContent = it.cap + (lbList.length > 1 ? `  (${lbI + 1}/${lbList.length})` : "");
  }
  function wireLightbox() {
    const lb = document.getElementById("lb");
    document.addEventListener("click", e => {
      const b = e.target.closest(".shot[data-g]"); if (!b) return;
      lbList = groups[b.dataset.g]; lbI = +b.dataset.i; lbShow();
      document.getElementById("lb-prev").hidden = document.getElementById("lb-next").hidden = lbList.length < 2;
      if (lb.showModal) lb.showModal(); else lb.setAttribute("open", "");
    });
    document.getElementById("lb-close").onclick = () => lb.close();
    document.getElementById("lb-prev").onclick = () => { lbI = (lbI - 1 + lbList.length) % lbList.length; lbShow(); };
    document.getElementById("lb-next").onclick = () => { lbI = (lbI + 1) % lbList.length; lbShow(); };
    lb.addEventListener("click", e => { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") document.getElementById("lb-prev").click();
      if (e.key === "ArrowRight") document.getElementById("lb-next").click();
    });
  }
  const IMG = p => `images/${p}.jpg`, TH = n => `images/thumbs/${n}.jpg`;
  const shotBtn = (src, label, group, i) =>
    `<button class="shot slot" type="button" data-g="${group}" data-i="${i}" aria-label="${esc(T("view"))}: ${esc(label)}">
      <img src="${src}" alt="${esc(label)}" loading="lazy"><span class="zoom">${esc(T("view"))}</span></button>`;

  /* ---------- page renderers ---------- */
  let repos = null, reposLive = null;
  const LANG_ORE = { Python: "#4b8bdf", JavaScript: "#f2d230", TypeScript: "#3178c6", HTML: "#e34c26", CSS: "#9b59d6", "C++": "#f34b7d", C: "#bbbbbb", Java: "#d9822b", "Jupyter Notebook": "#f37726" };
  const pretty = n => n.replace(/[-_]+/g, " ").trim();
  function renderRepos() {
    const el = document.getElementById("repos"); if (!el) return;
    const list = repos || FALLBACK_REPOS;
    el.innerHTML = list.map((r, i) => {
      const ore = (r.language ? oreBlock(LANG_ORE[r.language] || "#55e0c8", i * 31 + 5) : grassBlock(i * 31 + 5)).toDataURL();
      return `<a class="repo panel" href="${esc(r.html_url)}" target="_blank" rel="noopener">
        <span class="slot"><img class="pix" src="${ore}" width="40" height="40" alt=""></span>
        <span class="repo-body">
          <span class="repo-name">${esc(pretty(r.name))}</span>
          <p class="repo-desc">${r.description ? esc(r.description) : esc(T("repos.nodesc"))}</p>
          <span class="repo-foot"><span class="lang-name">${esc(r.language || "—")}</span><span>★ ${r.stargazers_count}</span><span>${fmtIso(r.updated_at)}</span></span>
        </span></a>`;
    }).join("");
    const note = document.getElementById("sync-note");
    note.textContent = reposLive === null ? T("repos.loading") : reposLive ? `${T("repos.live")} · ${list.length}` : T("repos.offline");
    document.getElementById("sync-dot").classList.toggle("on", !!reposLive);
  }
  async function loadRepos() {
    try {
      const res = await fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`);
      if (!res.ok) throw new Error(res.status);
      const data = (await res.json()).filter(r => !r.fork && r.name.toLowerCase() !== `${GH_USER}.github.io`.toLowerCase());
      repos = data.length ? data : null; reposLive = true;
    } catch (e) { reposLive = false; }
    renderRepos();
  }

  function renderProjects() {
    groups.proj = PROJECTS.map(p => ({ src: IMG(p.page), cap: p.title }));
    document.getElementById("showcase").innerHTML = PROJECTS.map((p, i) => `
      <article class="show panel">
        ${shotBtn(TH(p.img), p.title, "proj", i)}
        <div class="show-body">
          <div class="chips">${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(L(p.desc))}</p>
          <div class="actions"><button class="btn" type="button" data-proj="${i}">${esc(T("item.details"))}</button>${p.github ? `<a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ""}</div>
        </div>
      </article>`).join("");
    renderRepos();
    if (window.SITE && window.SITE.renderSkills) window.SITE.renderSkills();
  }

  let actFilter = "all";
  function renderActivities() {
    document.querySelectorAll("#filters [data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === actFilter));
    const list = ACTIVITIES.filter(a => actFilter === "all" || a.type === actFilter);
    groups.act = list.map(a => ({ src: IMG(a.page), cap: `${L(a.title)} · ${fmtD(a.d)}` }));
    let last = "", html = "";
    list.forEach((a, i) => {
      const ym = ymOf(a.d);
      if (ym !== last) { html += `<div class="month">${fmtYm(ym)}</div>`; last = ym; }
      html += `<article class="act panel">
        ${shotBtn(TH(a.img), L(a.title), "act", i)}
        <div class="act-body">
          <div class="act-top"><span class="when">${esc(fmtD(a.d))}</span><span class="type ${a.type}">${esc(T("f." + a.type))}</span></div>
          <h3>${esc(L(a.title))}</h3>
          <p>${esc(L(a.desc))}</p>
        </div>
      </article>`;
    });
    document.getElementById("timeline").innerHTML = html;
    groups.pages = PORTFOLIO_PAGES.map((p, i) => ({ src: IMG(p), cap: `${T("page")} ${i + 1}` }));
    document.getElementById("pages").innerHTML = PORTFOLIO_PAGES.map((p, i) => shotBtn(IMG(p), `${T("page")} ${i + 1}`, "pages", i)).join("");
  }

  function renderCerts() {
    groups.cert = CERTS.map(c => ({ src: `images/certificates/${c.img}.jpg`, cap: L(c.title) }));
    document.getElementById("cert-count").textContent = CERTS.length;
    document.getElementById("certs").innerHTML = CERTS.map((c, i) => `
      <article class="cert panel">
        ${shotBtn(`images/certificates/${c.img}.jpg`, L(c.title), "cert", i)}
        <div class="cert-body">
          <span class="kicker">${esc(T("certs.unlocked"))} · ${esc(fmtD(c.d))}</span>
          <h3>${esc(L(c.title))}</h3>
          ${c.note ? `<p class="cert-note">${esc(L(c.note))}</p>` : ""}
          <p>${esc(L(c.issuer))}</p>
        </div>
      </article>`).join("");
  }

  function renderHome() {
    const total = PROJECTS.length + ACTIVITIES.length + CERTS.length;
    const rk = RANKS.find(r => total <= r.max) || RANKS[RANKS.length - 1];
    document.getElementById("xp-level").textContent = `LV ${total} · ${rk.name}`;
    requestAnimationFrame(() => document.getElementById("xp-fill").style.width = Math.max(4, Math.min(100, (total - rk.min + 1) / (rk.max - rk.min + 1) * 100)) + "%");
    const counts = { projects: PROJECTS.length, activities: ACTIVITIES.length, certificates: CERTS.length };
    document.querySelectorAll("[data-count]").forEach(el => el.textContent = `${counts[el.dataset.count]} ${T("unit.items")}`);
    const lines = L(I18N.splash);
    document.getElementById("splash").textContent = lines[Math.floor(Math.random() * lines.length)];
    renderStats();
  }

  /* career rank from total LV (projects + activities + certificates) */
  const RANKS = [
    { name: "Junior", min: 1, max: 25, color: "#9aa1b0" },
    { name: "Mid Junior", min: 26, max: 50, color: "#7ed83c" },
    { name: "Senior", min: 51, max: 100, color: "#4fb3ff" },
    { name: "Manager", min: 101, max: 200, color: "#c792ea" },
    { name: "CEO", min: 201, max: 1000, color: "#f6d23a" },
  ];
  function renderRank() {
    const el = document.getElementById("rank"); if (!el) return;
    const lv = PROJECTS.length + ACTIVITIES.length + CERTS.length;
    let i = RANKS.findIndex(r => lv <= r.max); if (i < 0) i = RANKS.length - 1;
    const r = RANKS[i], next = RANKS[i + 1];
    const pct = Math.max(4, Math.min(100, ((lv - r.min + 1) / (r.max - r.min + 1)) * 100));
    const hint = next ? T("rank.next").replace("{n}", next.min - lv).replace("{r}", next.name) : T("rank.max");
    el.style.setProperty("--rank", r.color);
    el.innerHTML = `
      <div class="rank-top"><span class="rank-lv">LV ${lv}</span><span class="rank-name">${r.name}</span><span class="rank-step">${T("rank.step")} ${i + 1}/${RANKS.length}</span></div>
      <ol class="rank-ladder">${RANKS.map((x, j) => `<li class="${j < i ? "done" : j === i ? "cur" : ""}" style="--c:${x.color}"><b>${x.name}</b><small>LV ${x.min}–${x.max}</small></li>`).join("")}</ol>
      <div class="rank-bar" role="meter" aria-valuemin="${r.min}" aria-valuemax="${r.max}" aria-valuenow="${lv}" aria-label="${r.name} LV ${lv}"><i style="width:${pct}%"></i></div>
      <span class="rank-hint">${esc(hint)}</span>`;
  }

  /* character stats: 10 gauge steps per skill, sorted by count (largest first) */
  const STEPS = [3, 5, 10, 15, 20, 25, 35, 50, 100, 500];
  function renderStats() {
    const el = document.getElementById("stats"); if (!el) return;
    renderRank();
    const rows = [
      { id: "projects", key: "nav.projects", sprite: "chest", n: PROJECTS.length, href: "projects.html" },
      { id: "activities", key: "nav.activities", sprite: "map", n: ACTIVITIES.length, href: "activities.html" },
      { id: "certificates", key: "nav.certs", sprite: "medal", n: CERTS.length, href: "certificates.html" },
    ].sort((a, b) => b.n - a.n);
    el.innerHTML = rows.map(r => {
      const lvl = STEPS.filter(s => r.n >= s).length;
      const next = STEPS[lvl];
      const segs = STEPS.map((s, i) => `<i class="${i < lvl ? "on" : ""}" title="${i + 1}: ${s}"></i>`).join("");
      const hint = next ? T("stats.next").replace("{n}", next - r.n).replace("{t}", next) : T("stats.max");
      return `<a class="stat-row ${r.id}" href="${r.href}">
        <span class="slot"><img class="pix" src="${sprite(r.sprite)}" width="32" height="32" alt=""></span>
        <span class="stat-main">
          <span class="stat-top"><strong>${esc(T(r.key))}</strong><span class="stat-n">${r.n}</span><span class="stat-lv">${T("stats.step")} ${lvl}/10</span></span>
          <span class="gauge" role="meter" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${lvl}" aria-label="${esc(T(r.key))} ${lvl}/10">${segs}</span>
          <span class="stat-hint">${esc(hint)}</span>
        </span>
      </a>`;
    }).join("");
  }

  const RENDER = { home: renderHome, projects: renderProjects, activities: renderActivities, certificates: renderCerts };

  /* ---------- apply language ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = T(el.dataset.i18n));
    document.querySelectorAll("[data-i18n-alt]").forEach(el => el.alt = T(el.dataset.i18nAlt));
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    document.title = isHome ? "Phanphisut Portfolio" : `${T(page.key)} · Phanphisut`;
    (RENDER[page.id] || (() => {}))();
    if (window.onSiteLang) window.onSiteLang(lang);
    document.dispatchEvent(new CustomEvent("sitelang", { detail: lang }));
    paintSound();
  }
  window.siteT = T;
  window.siteLang = () => lang;
  window.SITE = { T, L, esc, sprite, oreBlock, fmtD, groups, lang: () => lang, sfx: n => sfx(n), page, isHome, go: h => go(h), redrawSky: () => drawSky(),
    setLang: l => { lang = l === "en" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} applyLang(); },
    cycleSound: () => document.getElementById("snd").click(), soundMode: () => soundMode,
    rank: () => { const lv = PROJECTS.length + ACTIVITIES.length + CERTS.length; return { lv, r: RANKS.find(r => lv <= r.max) || RANKS[RANKS.length - 1] }; } };
  wipeIn();

  /* visitor counter (GoatCounter): counts page views without cookies, shows totals at the bottom right of each page */
  function visits() {
    const code = (typeof GOATCOUNTER === "string" && GOATCOUNTER.trim()) || ""; if (!code) return;
    const base = `https://${code}.goatcounter.com`;
    if (!/^(localhost|127.|file:)/.test(location.host || location.protocol)) {
      const s = document.createElement("script"); s.async = true; s.src = "https://gc.zgo.at/count.js"; s.dataset.goatcounter = base + "/count";
      document.head.appendChild(s);
    }
    let today = ""; try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()); } catch (e) {}
    const get = q => fetch(`${base}/counter/TOTAL.json${q}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => j.count);
    const paint = (all, day) => {
      const el = document.getElementById("visits"); if (!el) return;
      document.getElementById("visits-txt").innerHTML = `${esc(T("visits.total"))} <b>${esc(all)}</b> · ${esc(T("visits.today"))} <b>${esc(day ?? "–")}</b>`;
      el.hidden = false;
    };
    Promise.all([get(""), get(today ? `?start=${today}` : "").catch(() => null)]).then(([a, d]) => { paint(a, d); document.addEventListener("sitelang", () => paint(a, d)); }).catch(() => {});
  }
  visits();

  /* ---------- boot ---------- */
  buildChrome();
  paintSprites(document);
  drawTerrain();
  paintUnderground();
  animateSky();
  walkHero();
  meteors();
  wireLightbox();
  wireSound();
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(drawTerrain, 150); });

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (err) {}
    applyLang();
  });
  const filters = document.getElementById("filters");
  if (filters) filters.addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { actFilter = b.dataset.f; renderActivities(); } });

  const copyBtn = document.getElementById("copy-line");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(copyBtn.dataset.copy); copyBtn.textContent = T("copied"); }
    catch (err) { const r = document.createRange(); r.selectNodeContents(document.getElementById("line-val")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = T("selected"); }
    setTimeout(() => copyBtn.textContent = T("copy"), 1600);
  });

  const face = document.getElementById("face");
  if (face) face.addEventListener("error", () => { face.src = sprite("face"); }, { once: true });

  const slots = [...document.querySelectorAll(".hotbar a")], label = document.getElementById("hotbar-label");
  slots.forEach(a => a.addEventListener("mouseenter", () => { label.textContent = T(a.dataset.key); label.style.opacity = 1; }));
  document.querySelector(".hotbar").addEventListener("mouseleave", () => label.style.opacity = 0);
  label.style.opacity = 0;
  addEventListener("keydown", e => {
    if (document.getElementById("lb").open || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input,textarea")) return;
    const n = +e.key;
    if (n >= 1 && n <= slots.length) go(slots[n - 1].href);
  });

  applyLang();
  if (page.id === "projects") loadRepos();
})();
