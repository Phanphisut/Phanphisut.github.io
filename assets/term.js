/* Home-page terminal: type commands like help, skills, contact, drone. Needs data.js, site.js, fun.js, fx.js. */
(function () {
  "use strict";
  const S = window.SITE, box = document.getElementById("term");
  if (!S || !box) return;
  const out = document.getElementById("term-out"), inp = document.getElementById("term-in");
  const { esc, L, T } = S;
  const tx = (th, en) => S.lang() === "en" ? en : th;
  const hist = []; let hi = 0;

  function line(html, cls = "") {
    const d = document.createElement("div"); d.className = "tl " + cls; d.innerHTML = html;
    out.appendChild(d); out.scrollTop = out.scrollHeight;
  }
  const link = (href, text, local) => `<a href="${esc(href)}"${local ? "" : ' target="_blank" rel="noopener"'}>${esc(text)}</a>`;
  const bar = n => "█".repeat(n) + "░".repeat(5 - n);
  const pad = (s, n) => s + " ".repeat(Math.max(1, n - [...s].length));

  const CMDS = {
    help: () => {
      line(tx("คำสั่งที่ใช้ได้:", "Available commands:"), "dim");
      [["about", "แนะนำตัว", "who I am"], ["skills", "ทักษะทั้งหมด", "tech stack"], ["projects", "รายการผลงาน", "project list"],
       ["project <n>", "เปิดรายละเอียดผลงานที่ n", "open project n"], ["activities", "กิจกรรมล่าสุด", "latest activities"],
       ["certs", "ใบประกาศ", "certificates"], ["contact", "ช่องทางติดต่อ", "how to reach me"], ["lv", "LV และตำแหน่ง", "level and rank"],
       ["drone", "เรียกโดรนส่งของ", "call the drone"], ["weather", "อากาศกรุงเทพฯ ตอนนี้", "Bangkok weather now"],
       ["goto <page>", "ไปหน้า home / projects / activities / certificates", "go to a page"], ["lang th|en", "เปลี่ยนภาษา", "switch language"],
       ["sound", "สลับโหมดเสียง", "cycle sound mode"], ["date", "เวลาไทยตอนนี้", "Thai time now"], ["clear", "ล้างหน้าจอ", "clear screen"]]
        .forEach(([c, th, en]) => line(`  <b>${esc(pad(c, 14))}</b>${esc(tx(th, en))}`));
      line(tx("เคล็ดลับ: กด Tab เพื่อเติมคำสั่ง · ↑ ↓ เรียกคำสั่งเดิม", "Tip: Tab completes · ↑ ↓ recall history"), "dim");
    },
    about: () => {
      line(`<b>Phanphisut Phumet</b> · พันธุ์พิสุทธิ์ ภูเม็ด`);
      line(esc(T("role")));
      line(esc(T("bio")), "dim");
    },
    whoami: () => CMDS.about(),
    skills: () => {
      [...SKILLS].sort((a, b) => b.stars - a.stars).forEach(s => line(`  <b>${esc(pad(s.name, 24))}</b><span class="tg">${bar(s.stars)}</span> ${s.stars}/5`));
      line(tx("พิมพ์ชื่อทักษะหลัง skill เช่น  skill python", "Type  skill python  for details"), "dim");
    },
    skill: a => {
      const k = (a[0] || "").toLowerCase();
      const s = SKILLS.find(x => x.id === k || x.name.toLowerCase().startsWith(k));
      if (!s) return line(tx("ไม่พบทักษะนี้ ลองพิมพ์ skills", "Skill not found, try skills"), "err");
      S.openSkill(s.id); line(tx(`เปิดข้อมูล ${s.name}`, `Opened ${s.name}`), "ok");
    },
    projects: () => {
      PROJECTS.forEach((p, i) => line(`  <b>[${i + 1}]</b> ${esc(p.title)} <span class="dim">· ${esc(p.tags.join(", "))}</span>`));
      line(tx("พิมพ์  project 1  เพื่อเปิดรายละเอียด", "Type  project 1  to open one"), "dim");
    },
    project: a => {
      const n = parseInt(a[0], 10) - 1;
      if (!(n >= 0 && n < PROJECTS.length)) return line(tx(`ใส่เลข 1–${PROJECTS.length}`, `Use a number 1–${PROJECTS.length}`), "err");
      S.openProject(n); line(tx(`เปิด ${PROJECTS[n].title}`, `Opened ${PROJECTS[n].title}`), "ok");
    },
    activities: () => {
      ACTIVITIES.slice(0, 6).forEach(x => line(`  <span class="tg">${esc(S.fmtD(x.d))}</span>  ${esc(L(x.title))}`));
      line(`${tx("ทั้งหมด", "All")} ${ACTIVITIES.length}: ${link("activities.html", "activities.html", true)}`, "dim");
    },
    certs: () => {
      CERTS.forEach(c => line(`  <span class="tg">★</span> ${esc(L(c.title))} <span class="dim">· ${esc(S.fmtD(c.d))}</span>`));
    },
    contact: () => {
      line(`  <b>LINE     </b>0653057699  ${link("https://line.me/ti/p/~0653057699", "open")}`);
      line(`  <b>Facebook </b>${link("https://www.facebook.com/pha.xr.2025", "Pha Xr")}`);
      line(`  <b>Instagram</b> ${link("https://www.instagram.com/_phaxr/", "Pha Xr")}`);
      line(`  <b>GitHub   </b>${link("https://github.com/Phanphisut", "Phanphisut")}`);
    },
    lv: () => {
      const { lv, r } = S.rank();
      line(`<b>LV ${lv}</b> · <span class="tg">${esc(r.name)}</span> (LV ${r.min}–${r.max})`);
      line(`${tx("ผลงาน", "projects")} ${PROJECTS.length} + ${tx("กิจกรรม", "activities")} ${ACTIVITIES.length} + ${tx("ใบประกาศ", "certificates")} ${CERTS.length}`, "dim");
    },
    rank: () => CMDS.lv(),
    drone: () => {
      ["   __      __", "  (__)----(__)", "     \\ [] /", "    [=|##|=]", "     /    \\", "  (__)----(__)"].forEach(s => line(esc(s), "tg pre"));
      const d = document.querySelector(".drone");
      if (d) { document.getElementById("hero").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => d.click(), 500); line(tx("โดรนกำลังส่งของให้ด้านบน ↑", "The drone is dropping a gift up top ↑"), "ok"); }
    },
    weather: () => {
      const w = S.weather ? S.weather() : null;
      if (!w || !w.ok) return line(tx("ยังโหลดข้อมูลอากาศไม่ได้ ลองใหม่อีกครั้ง", "Weather not loaded yet, try again"), "err");
      line(`${tx("กรุงเทพฯ", "Bangkok")}: <b>${esc(w.name)}</b> · ${w.temp != null ? Math.round(w.temp) + "°C" : ""} · ${tx("เมฆ", "clouds")} ${Math.round(w.clouds * 100)}%`);
      if (w.festName) line(esc(w.festName), "tg");
      line(tx("ข้อมูลจาก Open-Meteo", "Data from Open-Meteo"), "dim");
    },
    date: () => {
      let s = ""; try { s = new Intl.DateTimeFormat(S.lang() === "en" ? "en-GB" : "th-TH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date()); } catch (e) { s = new Date().toString(); }
      line(esc(s));
    },
    goto: a => {
      const m = { home: "index.html", projects: "projects.html", activities: "activities.html", certificates: "certificates.html", certs: "certificates.html" };
      const f = m[(a[0] || "").toLowerCase()];
      if (!f) return line("goto home | projects | activities | certificates", "err");
      line(tx("กำลังเดินทาง...", "Traveling..."), "ok"); setTimeout(() => S.go(f), 250);
    },
    lang: a => {
      const l = (a[0] || "").toLowerCase();
      if (l !== "th" && l !== "en") return line("lang th | lang en", "err");
      S.setLang(l); line(l === "en" ? "Language: English" : "ภาษา: ไทย", "ok");
    },
    sound: () => { S.cycleSound(); line(T("sound." + S.soundMode()), "ok"); },
    clear: () => { out.innerHTML = ""; },
    echo: a => line(esc(a.join(" "))),
    ls: () => line("about  skills  projects/  activities/  certificates/  contact  secret.txt", "tg"),
    cat: a => {
      if ((a[0] || "") === "secret.txt") return line(tx("ลองพิมพ์ ↑↑↓↓←→←→BA นอกกล่องนี้ดูสิ...", "Try ↑↑↓↓←→←→BA outside this box..."), "tg");
      line(`cat: ${esc(a[0] || "")}: No such file`, "err");
    },
    secret: () => CMDS.cat(["secret.txt"]),
    sudo: a => {
      if (a.join(" ").toLowerCase().replace(/\s+/g, "-") === "hire-me") {
        line(tx("[sudo] อนุญาตแล้ว ✓ ยินดีร่วมงานครับ!", "[sudo] Permission granted ✓ Let's work together!"), "ok");
        CMDS.contact(); if (S.party) S.party(); return;
      }
      line(tx("sudo: ต้องใช้รหัสผ่าน... ลอง  sudo hire-me", "sudo: password required... try  sudo hire-me"), "err");
    },
    github: () => { line(link("https://github.com/Phanphisut?tab=repositories", "github.com/Phanphisut")); },
    exit: () => line(tx("ออกไม่ได้หรอก เว็บนี้สนุกเกินไป 😄", "No escape, this site is too fun 😄"), "dim"),
  };
  const NAMES = Object.keys(CMDS);

  function run(raw) {
    const text = raw.trim();
    line(`<span class="pr">phanphisut@portfolio:~$</span> ${esc(text)}`, "cmd");
    if (!text) return;
    hist.push(text); hi = hist.length;
    const [c, ...args] = text.split(/\s+/);
    const fn = CMDS[c.toLowerCase()];
    if (fn) { S.sfx("click"); fn(args); }
    else { S.sfx("hurt"); line(`${tx("ไม่พบคำสั่ง", "command not found")}: ${esc(c)} · ${tx("พิมพ์", "type")} <b>help</b>`, "err"); }
  }

  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); run(inp.value); inp.value = ""; }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (hi < hist.length - 1) inp.value = hist[++hi]; else { hi = hist.length; inp.value = ""; } }
    else if (e.key === "Tab") {
      e.preventDefault();
      const v = inp.value.toLowerCase(), m = NAMES.filter(n => n.startsWith(v));
      if (m.length === 1) inp.value = m[0] + " ";
      else if (m.length > 1) line(m.join("  "), "dim");
    } else if (e.key.length === 1 && S.soundMode() !== "off") S.sfx("type");
    e.stopPropagation();
  });
  box.addEventListener("click", e => { if (!e.target.closest("a")) inp.focus({ preventScroll: true }); });
  document.querySelectorAll("[data-cmd]").forEach(b => b.addEventListener("click", () => { run(b.dataset.cmd); inp.focus({ preventScroll: true }); }));

  function welcome() {
    out.innerHTML = "";
    line("PHANPHISUT OS v1.0 · tty1", "dim");
    line(tx("ยินดีต้อนรับ! พิมพ์ <b>help</b> เพื่อดูคำสั่ง หรือกดปุ่มลัดด้านล่าง", "Welcome! Type <b>help</b> for commands, or tap a shortcut below"));
  }
  welcome();
  document.addEventListener("sitelang", () => { if (out.children.length <= 2) welcome(); });
})();
