/* 404 mini game: move the orange hero, catch blue crystals, dodge red rocks. */
(function () {
  "use strict";
  const S = window.SITE, T = k => (S ? S.T(k) : k), sfx = n => S && S.sfx(n);
  const cv = document.getElementById("game"); if (!cv) return;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, GROUND = H - 10;
  const $ = id => document.getElementById(id);
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  const PAL = { h: "#2e2018", s: "#e0ac7e", e: "#1d1d1d", m: "#b5795a", o: "#e07a2a", d: "#b85d17", p: "#4a4f5a", b: "#262626" };
  const A = ["..hhhh..", ".hhhhhh.", ".hhssss.", ".hhsses.", ".hssssss", "..sssm..", "..oooo..", ".ooooo..", ".oddoo..", ".oooso..", "..ppp...", "..ppp...", "..pppp..", ".pp..pp.", ".pp..pp.", "bbb..bbb"];
  const B = ["..hhhh..", ".hhhhhh.", ".hhssss.", ".hhsses.", ".hssssss", "..sssm..", "..oooo..", ".ooooo..", ".oddoo..", ".oooso..", "..ppp...", "..ppp...", "..ppp...", "..ppp...", "..ppp...", "..bbbb.."];
  function drawHero(x, y, frame, left) {
    const rows = frame ? B : A;
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) P(x + (left ? 7 - i : i), y + j, 1, 1, PAL[ch]); }));
  }
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % W, y: (i * 53) % (GROUND - 20), k: i % 3 }));

  let best = 0; try { best = +localStorage.getItem("crystalBest") || 0; } catch (e) {}
  $("g-best").textContent = best;
  let st = null, keys = {}, pointerX = null, raf = 0, last = 0;

  function reset() {
    st = { x: W / 2 - 4, vx: 0, left: false, score: 0, lives: 3, items: [], spawn: 0, t: 0, frame: 0, over: false, flash: 0 };
    $("g-score").textContent = 0; $("g-lives").textContent = "♥♥♥";
  }
  function start() {
    reset(); $("g-over").hidden = true; sfx("on");
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
    cv.focus && cv.focus();
  }
  function end() {
    st.over = true; sfx("hurt");
    if (st.score > best) { best = st.score; try { localStorage.setItem("crystalBest", best); } catch (e) {} $("g-best").textContent = best; }
    $("g-title").textContent = `${T("game.over")} ${T("game.score")} ${st.score}`;
    $("g-start").textContent = T("game.again");
    $("g-over").hidden = false;
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    if (!st.over) raf = requestAnimationFrame(loop);
  }
  function update(dt) {
    st.t += dt;
    const speed = 70;
    let dir = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    if (pointerX !== null) { const dx = pointerX - (st.x + 4); dir = Math.abs(dx) < 2 ? 0 : Math.sign(dx); }
    st.x = Math.max(0, Math.min(W - 8, st.x + dir * speed * dt));
    if (dir) { st.left = dir < 0; st.frame = Math.floor(st.t * 8) % 2; } else st.frame = 0;
    const level = 1 + st.score / 15;
    st.spawn -= dt;
    if (st.spawn <= 0) {
      st.spawn = Math.max(0.28, 0.9 - st.score * 0.012);
      const rock = Math.random() < Math.min(0.45, 0.18 + st.score * 0.008);
      st.items.push({ x: 4 + Math.random() * (W - 12), y: -6, v: (26 + Math.random() * 18) * level, rock });
    }
    st.items.forEach(it => { it.y += it.v * dt; });
    st.items = st.items.filter(it => {
      const hit = it.y + 5 >= GROUND - 16 && it.y <= GROUND && it.x + 4 >= st.x && it.x <= st.x + 8;
      if (hit) {
        if (it.rock) { st.lives--; st.flash = 0.3; sfx("hurt"); $("g-lives").textContent = "♥".repeat(Math.max(0, st.lives)); if (st.lives <= 0) end(); }
        else { st.score++; sfx("coin"); $("g-score").textContent = st.score; }
        return false;
      }
      return it.y < H;
    });
    st.flash = Math.max(0, st.flash - dt);
  }
  function draw() {
    P(0, 0, W, H, "#000");
    stars.forEach(s => P(s.x, s.y, 1, 1, s.k === 0 ? "#3fb6ff" : "#1d4f6e"));
    ["#1a1023", "#0f2a2c", "#123a3d", "#174e50"].forEach((c, i) => P(0, GROUND - 8 + i * 2, W, 2, c));
    P(0, GROUND, W, H - GROUND, "#0c1a24"); P(0, GROUND, W, 1, "#1f6466");
    if (st) {
      st.items.forEach(it => {
        if (it.rock) { P(it.x, it.y, 5, 5, "#7a1f1f"); P(it.x + 1, it.y + 1, 3, 3, "#c0392b"); P(it.x + 1, it.y + 1, 1, 1, "#ff8a7a"); }
        else { P(it.x + 1, it.y, 2, 6, "#2d6a8a"); P(it.x + 1, it.y, 1, 5, "#49b7e8"); P(it.x + 1, it.y, 1, 1, "#d8f3ff"); P(it.x, it.y + 2, 4, 2, "#49b7e8"); }
      });
      if (!(st.flash > 0 && Math.floor(st.flash * 20) % 2)) drawHero(st.x, GROUND - 16, st.frame, st.left);
    } else drawHero(W / 2 - 4, GROUND - 16, 0, false);
  }

  addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft", "ArrowRight", "a", "d"].includes(k)) { keys[k] = true; if (st && !st.over) e.preventDefault(); }
    if ((k === " " || k === "Enter") && !$("g-over").hidden && document.activeElement === document.body) { e.preventDefault(); start(); }
  });
  addEventListener("keyup", e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  const toX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  cv.addEventListener("pointerdown", e => { pointerX = toX(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (pointerX !== null) pointerX = toX(e); });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, () => { pointerX = null; }));
  $("g-start").addEventListener("click", start);
  document.addEventListener("sitelang", () => { if (!st || !st.over) { $("g-title").textContent = T("nf.title"); $("g-start").textContent = T("game.start"); } });
  draw();
})();
