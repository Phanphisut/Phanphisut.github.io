/* Playful extras: RPG typewriter dialog, clickable hero + drone, secret code, skill inventory and item-info windows. Needs data.js + site.js first. */
(function () {
  "use strict";
  const S = window.SITE; if (!S) return;
  const { T, L, esc, sprite } = S;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (q, r = document) => r.querySelector(q);

  function fromRows(rows, pal) {
    const c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext("2d");
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c.toDataURL();
  }
  const GIFT_PAL = { r: "#d33b3b", R: "#9a2525", y: "#f6d23a", w: "#ffffff" };
  const GIFT = fromRows(["..y....y..", "...y..y...", "....yy....", "rrrryyrrrr", "RRRRyyRRRR", ".rrryyrrr.", ".rrryyrrr.", ".rrryyrrr.", ".RRRyyRRR."], GIFT_PAL);
  const GIFT_OPEN = fromRows(["w...w...w.", "..........", "rrrryyrrrr", "RRRRyyRRRR", "..........", ".rrryyrrr.", ".rrryyrrr.", ".rrryyrrr.", ".RRRyyRRR."], GIFT_PAL);
  const graphemes = s => (window.Intl && Intl.Segmenter) ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map(x => x.segment) : Array.from(s);

  /* ---------- 1. RPG typewriter dialog (home) ---------- */
  const bio = $('.dialog p[data-i18n="bio"]');
  let typing = null;
  function typeBio() {
    if (!bio) return;
    const full = T("bio"), parts = graphemes(full), more = $(".dialog .more");
    clearInterval(typing);
    bio.setAttribute("aria-label", full);
    if (reduce) { bio.textContent = full; return; }
    let i = 0; bio.textContent = ""; if (more) more.hidden = true;
    typing = setInterval(() => {
      i++; bio.textContent = parts.slice(0, i).join("");
      if (i % 2 === 0 && /\S/.test(parts[i - 1] || "")) S.sfx("type");
      if (i >= parts.length) { clearInterval(typing); typing = null; if (more) more.hidden = false; }
    }, 32);
  }
  if (bio) {
    const box = bio.closest(".dialog");
    box.style.cursor = "pointer"; box.title = T("dialog.skip");
    box.addEventListener("click", () => {
      if (!typing) return;
      clearInterval(typing); typing = null; bio.textContent = T("bio");
      const more = $(".dialog .more"); if (more) more.hidden = false;
    });
    typeBio();
  }

  /* ---------- 2. click the orange hero: jump + random line ---------- */
  const land = $(".land"), hero = $(".hero-char");
  let quipT = null;
  if (hero && land) {
    land.removeAttribute("aria-hidden");
    hero.alt = ""; hero.style.cursor = "pointer"; hero.style.pointerEvents = "auto";
    hero.addEventListener("click", () => {
      S.sfx("jump");
      hero.animate([{ marginBottom: "0px" }, { marginBottom: "46px", offset: .45 }, { marginBottom: "0px" }], { duration: 520, easing: "ease-out" });
      const old = $(".quip", land); if (old) old.remove();
      const q = document.createElement("div");
      q.className = "quip";
      q.textContent = L(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
      land.appendChild(q);
      const follow = () => {
        if (!q.isConnected) return;
        const hx = hero.offsetLeft + hero.offsetWidth / 2, w = q.offsetWidth;
        q.style.left = Math.max(4, Math.min(land.clientWidth - w - 4, hx - w / 2)) + "px";
        requestAnimationFrame(follow);
      };
      follow();
      clearTimeout(quipT); quipT = setTimeout(() => q.remove(), 2800);
    });
  }

  /* ---------- 3. click the drone: drop a gift with a random reward ---------- */
  const drone = $(".drone");
  let giftBusy = false;
  const REWARDS = () => [
    { kind: "contact", sprite: "line", label: "LINE", value: "0653057699", href: "https://line.me/ti/p/~0653057699" },
    { kind: "contact", sprite: "fb", label: "Facebook", value: "Pha Xr", href: "https://www.facebook.com/pha.xr.2025" },
    { kind: "contact", sprite: "ig", label: "Instagram", value: "Pha Xr", href: "https://www.instagram.com/_phaxr/" },
    { kind: "contact", sprite: "term", label: "GitHub", value: "Phanphisut", href: "https://github.com/Phanphisut?tab=repositories" },
    ...PROJECTS.map((p, i) => ({ kind: "project", sprite: "chest", label: p.title, value: L(p.desc).slice(0, 70) + "…", href: "projects.html#project-" + i, local: true })),
  ];
  if (drone && land) {
    drone.alt = ""; drone.style.cursor = "pointer"; drone.style.pointerEvents = "auto";
    drone.addEventListener("click", () => {
      if (giftBusy) return; giftBusy = true;
      const lr = land.getBoundingClientRect(), dr = drone.getBoundingClientRect();
      const x = dr.left - lr.left + dr.width / 2 - 20, fromB = lr.bottom - dr.bottom, GR = (document.getElementById("terrain") || {}).clientHeight || 96;
      const g = document.createElement("img");
      g.className = "pix gift"; g.src = GIFT; g.alt = "";
      g.style.left = x + "px"; g.style.bottom = GR + "px";
      land.appendChild(g);
      S.sfx("click");
      const fall = reduce ? null : g.animate([{ transform: `translateY(${-(fromB - GR)}px)` }, { transform: "translateY(0)" }], { duration: 700, easing: "cubic-bezier(.5,0,1,1)" });
      const open = () => {
        S.sfx("drop");
        setTimeout(() => {
          g.src = GIFT_OPEN; S.sfx("gift");
          const list = REWARDS(), r = list[Math.floor(Math.random() * list.length)];
          const pop = document.createElement("a");
          pop.className = "gift-pop panel"; pop.href = r.href;
          if (!r.local) { pop.target = "_blank"; pop.rel = "noopener"; }
          pop.innerHTML = `<span class="gp-kick">${esc(T("gift.title"))} · ${esc(T(r.kind === "contact" ? "gift.contact" : "gift.project"))}</span>
            <span class="gp-row"><img class="pix" src="${sprite(r.sprite)}" width="32" height="32" alt=""><span><strong>${esc(r.label)}</strong><small>${esc(r.value)}</small></span></span>`;
          land.appendChild(pop);
          const w = pop.offsetWidth;
          pop.style.left = Math.max(4, Math.min(land.clientWidth - w - 4, x + 20 - w / 2)) + "px";
          setTimeout(() => { pop.remove(); g.remove(); giftBusy = false; }, 6000);
        }, 250);
      };
      if (fall) fall.onfinish = open; else open();
    });
  }

  /* ---------- 4. secret: ↑↑↓↓←→←→BA (or tap the big title 5 times) ---------- */
  const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0, partyOn = false;
  addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === CODE[pos] ? pos + 1 : (k === CODE[0] ? 1 : 0);
    if (pos === CODE.length) { pos = 0; party(); }
  });
  const title = $(".title");
  if (title) { let taps = []; title.addEventListener("click", () => { const n = Date.now(); taps = taps.filter(t => n - t < 2000); taps.push(n); if (taps.length >= 5) { taps = []; party(); } }); }
  function party() {
    if (partyOn) return; partyOn = true;
    S.sfx("secret");
    const layer = document.createElement("div"); layer.className = "party"; layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    const toast = document.createElement("div");
    toast.className = "toast panel"; toast.setAttribute("role", "status");
    toast.innerHTML = `<strong>${esc(T("secret.title"))}</strong><small>${esc(T("secret.sub"))}</small>`;
    document.body.appendChild(toast);
    const W = innerWidth, H = innerHeight;
    if (!reduce) {
      for (let i = 0; i < 18; i++) {
        const d = document.createElement("img"); d.className = "pix"; d.src = sprite("drone"); d.alt = "";
        d.style.cssText = `position:absolute;width:${40 + Math.random() * 40}px;top:${Math.random() * (H - 60)}px;left:0`;
        layer.appendChild(d);
        const ltr = Math.random() < .5, dur = 2500 + Math.random() * 3000;
        d.animate([{ transform: `translateX(${ltr ? -120 : W + 120}px)` }, { transform: `translateX(${ltr ? W + 120 : -120}px)` }], { duration: dur, delay: Math.random() * 1500, easing: "steps(40)", fill: "both" });
      }
      for (let i = 0; i < 70; i++) {
        const c = document.createElement("i"); c.className = "rain";
        c.style.left = Math.random() * W + "px";
        layer.appendChild(c);
        c.animate([{ transform: "translateY(-30px) rotate(0deg)" }, { transform: `translateY(${H + 30}px) rotate(${Math.random() < .5 ? 180 : -180}deg)` }], { duration: 1800 + Math.random() * 2200, delay: Math.random() * 3000, easing: "linear", fill: "both" });
      }
    }
    setTimeout(() => toast.classList.add("out"), 4200);
    setTimeout(() => { layer.remove(); toast.remove(); partyOn = false; }, 7000);
  }

  /* ---------- 5 + 6. skill inventory and item-info window ---------- */
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="item panel" id="item" aria-labelledby="item-h">
      <div class="item-inner">
        <div class="item-head"><span class="slot item-ico"><img class="pix" id="item-ico" alt=""></span>
          <div><small id="item-kick"></small><h2 id="item-h"></h2></div>
          <button class="btn item-x" type="button" id="item-close" aria-label="${esc(T("close"))}">✕</button></div>
        <div class="item-body" id="item-body"></div>
      </div>
    </dialog>`);
  const dlg = $("#item");
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  $("#item-close").addEventListener("click", () => { S.sfx("close"); dlg.close(); });
  const show = () => { if (!dlg.open) { dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", ""); } dlg.scrollTop = 0; $("#item-body").scrollTop = 0; };
  const stars = n => `<span class="stars" aria-label="${n}/5">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>`;
  function skillIcon(s, size = 40) {
    const c = S.oreBlock(s.color, s.id.length * 97 + s.name.length);
    return `<span class="sk-ico" style="width:${size}px;height:${size}px"><img class="pix" src="${c.toDataURL()}" width="${size}" height="${size}" alt=""><b>${esc(s.label)}</b></span>`;
  }
  function openProject(i) {
    const p = PROJECTS[i]; if (!p) return;
    S.groups.detail = [{ src: `images/thumbs/${p.img}.jpg`, cap: p.title }, { src: `images/${p.page}.jpg`, cap: `${p.title} · ${T("page")}` }];
    const used = SKILLS.filter(s => s.projects.includes(p.title));
    $("#item-ico").src = sprite("chest");
    $("#item-kick").textContent = T("nav.projects");
    $("#item-h").textContent = p.title;
    $("#item-body").innerHTML = `
      <p class="item-desc">${esc(L(p.desc))}</p>
      <h3>${esc(T("item.tags"))}</h3><div class="chips">${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      ${used.length ? `<h3>${esc(T("item.skills"))}</h3><div class="sk-links">${used.map(s => `<button class="btn sk-link" type="button" data-skill="${s.id}">${esc(s.name)} ${stars(s.stars)}</button>`).join("")}</div>` : ""}
      <h3>${esc(T("item.images"))}</h3>
      <div class="item-imgs">${S.groups.detail.map((im, k) => `<button class="shot slot" type="button" data-g="detail" data-i="${k}" aria-label="${esc(T("view"))}: ${esc(im.cap)}"><img src="${im.src}" alt="${esc(im.cap)}" loading="lazy"><span class="zoom">${esc(T("view"))}</span></button>`).join("")}</div>
      ${p.github ? `<div class="item-actions"><a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub ↗</a></div>` : ""}`;
    S.sfx("open"); show();
  }
  function openSkill(id) {
    const s = SKILLS.find(x => x.id === id); if (!s) return;
    const projs = s.projects.map(t => PROJECTS.findIndex(p => p.title === t)).filter(i => i >= 0);
    const c = S.oreBlock(s.color, s.id.length * 97 + s.name.length);
    $("#item-ico").src = c.toDataURL();
    $("#item-kick").textContent = `${T("skills.title")} · ${T("item.level")} ${s.stars}/5`;
    $("#item-h").textContent = s.name;
    $("#item-body").innerHTML = `
      <p class="item-desc">${stars(s.stars)}</p>
      <p class="item-desc">${esc(L(s.note))}</p>
      <h3>${esc(T("item.used"))}</h3>
      ${projs.length ? `<div class="sk-projects">${projs.map(i => `<button class="sk-proj slot" type="button" data-proj="${i}"><img src="images/thumbs/${PROJECTS[i].img}.jpg" alt="" loading="lazy"><span>${esc(PROJECTS[i].title)}</span></button>`).join("")}</div>` : `<p class="item-desc muted">${esc(T("item.none"))}</p>`}`;
    S.sfx("open"); show();
  }
  document.addEventListener("click", e => {
    const p = e.target.closest("[data-proj]"); if (p) { e.preventDefault(); openProject(+p.dataset.proj); return; }
    const k = e.target.closest("[data-skill]"); if (k) { e.preventDefault(); openSkill(k.dataset.skill); }
  });
  S.renderSkills = function () {
    const el = $("#skills"); if (!el) return;
    el.innerHTML = SKILLS.map(s => `<button class="skill slot" type="button" data-skill="${s.id}">${skillIcon(s)}<span class="sk-name">${esc(s.name)}</span>${stars(s.stars)}</button>`).join("");
  };
  S.renderSkills();
  S.openProject = openProject; S.openSkill = openSkill; S.party = party;
  const m = /^#project-(\d+)$/.exec(location.hash);
  if (m && S.page.id === "projects") setTimeout(() => openProject(+m[1]), 300);

  document.addEventListener("sitelang", () => { typeBio(); S.renderSkills(); if (dlg.open) dlg.close(); });
})();
