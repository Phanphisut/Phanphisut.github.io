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
  const HERO_PAL = { h: "#2e2018", s: "#e0ac7e", e: "#1d1d1d", m: "#b5795a", o: "#e07a2a", d: "#b85d17", p: "#4a4f5a", b: "#262626" };
  const S = {
    hero: fromRows(["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "oooooooo", "oooddooo", "soooooos", "s.oooo.s",
                    ".pppppp.", ".pp..pp.", ".pp..pp.", ".pp..pp.", ".bb..bb.", ".bb..bb."], HERO_PAL),
    face: fromRows(["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "oooooooo", "oooddooo"], HERO_PAL),
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
    { id: "home", file: "index.html", key: "nav.home", sprite: "grass" },
    { id: "projects", file: "projects.html", key: "nav.projects", sprite: "chest", sub: "projects.sub" },
    { id: "activities", file: "activities.html", key: "nav.activities", sprite: "map", sub: "activities.sub" },
    { id: "certificates", file: "certificates.html", key: "nav.certs", sprite: "medal", sub: "certs.sub" },
  ];
  const pageId = document.body.dataset.page;
  const page = PAGES.find(p => p.id === pageId) || PAGES[0];
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
        </div>
        <nav class="pages-nav" aria-label="Pages">
          ${PAGES.map(p => `<a class="btn" href="${p.file}" data-i18n="${p.key}"${p.id === page.id ? ' aria-current="page"' : ""}></a>`).join("")}
        </nav>
      </div></div>`);
    const hero = document.getElementById("hero");
    hero.className = "overworld" + (isHome ? "" : " small");
    hero.innerHTML = `
      <div class="cloud c1" aria-hidden="true"></div><div class="cloud c2" aria-hidden="true"></div><div class="cloud c3" aria-hidden="true"></div>
      <div class="orb" aria-hidden="true"><div class="sun"></div><div class="moon"></div></div>
      <div class="wrap title-block">
        ${isHome ? "" : `<p class="crumb"><a href="index.html">PHANPHISUT</a> / <span data-i18n="${page.key}"></span></p>`}
        <h1 class="title"${isHome ? "" : ` data-i18n="${page.key}"`}>${isHome ? "PHANPHISUT" : ""}</h1>
        ${isHome ? `<div class="splash-wrap" aria-hidden="true"><span class="splash" id="splash"></span></div>` : ""}
        <p class="subtitle" data-i18n="${isHome ? "role" : page.sub}"></p>
        ${isHome ? `<div class="xp"><div class="xp-level" id="xp-level"></div><div class="xp-bar"><div class="xp-fill" id="xp-fill"></div></div><div class="xp-note" data-i18n="xp.note"></div></div>` : ""}
      </div>
      <div class="land" aria-hidden="true">
        <img class="pix tree" data-sprite="tree" alt="">
        ${isHome ? `<img class="pix tree tree2" data-sprite="tree" alt="">` : ""}
        <img class="pix drone" data-sprite="drone" alt="">
        <img class="pix hero-char" data-sprite="hero" alt="">
        <canvas class="terrain pix" id="terrain"></canvas>
      </div>`;
    document.getElementById("main").insertAdjacentHTML("beforeend", `<footer data-i18n="footer"></footer>`);
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

  function drawTerrain() {
    const cv = document.getElementById("terrain"); if (!cv) return;
    const B = 16, cols = Math.ceil(cv.clientWidth / 32) + 1;
    cv.width = cols * B; cv.height = 3 * B;
    const g = cv.getContext("2d");
    for (let x = 0; x < cols; x++) {
      g.drawImage(grassBlock(x * 13 + 1), x * B, 0);
      g.drawImage(noiseTile(DIRT, x * 7 + 300), x * B, B);
      g.drawImage(x % 9 === 4 ? oreBlock("#f2c230", x) : noiseTile(STONE, x * 5 + 600), x * B, 2 * B);
    }
    cv.style.width = cols * 32 + "px";
  }
  function paintUnderground() {
    const t = canvasOf(32, 32), g = t.getContext("2d");
    [[0, 0], [16, 0], [0, 16], [16, 16]].forEach(([x, y], i) => g.drawImage(noiseTile(STONE, 900 + i), x, y));
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, 32, 32);
    const m = document.getElementById("main");
    [m, document.body].forEach(el => { el.style.backgroundImage = `url(${t.toDataURL()})`; el.style.backgroundSize = "64px 64px"; el.style.imageRendering = "pixelated"; });
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
          ${p.github ? `<div class="actions"><a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub ↗</a></div>` : ""}
        </div>
      </article>`).join("");
    renderRepos();
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
  }
  window.siteT = T;
  window.siteLang = () => lang;

  /* ---------- boot ---------- */
  buildChrome();
  paintSprites(document);
  drawTerrain();
  paintUnderground();
  wireLightbox();
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
    const n = +e.key; if (n >= 1 && n <= slots.length) location.href = slots[n - 1].getAttribute("href");
  });

  applyLang();
  if (page.id === "projects") loadRepos();
})();
