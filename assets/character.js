/* Pixel suit character (from the "Pixel Suit Guy" artifact), drawn into #char-cv on the home page. */
(function () {
  "use strict";
  const cv = document.getElementById("char-cv"); if (!cv) return;
  const T = k => (window.siteT ? window.siteT(k) : k);
  const LIST = k => { const v = I18N[k]; return v ? v[window.siteLang && window.siteLang() === "en" ? 1 : 0] : []; };

  const S = 8, LW = 96, LH = 72;
  const ctx = cv.getContext("2d");
  const low = document.createElement("canvas"); low.width = LW; low.height = LH;
  const g = low.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const C = { hair: "#121214", hairHi: "#2c2c33", skin: "#f2c7a0", skinSh: "#d9a57e", frame: "#0d0d0f", lens: "#cfe0ea", eye: "#141414", mouth: "#9c4b44",
    suit: "#1c1d24", suitHi: "#30323d", suitSh: "#0f1015", shirt: "#f4f5f7", shirtSh: "#c9ced7", tie: "#060608", tieHi: "#34343d", shoe: "#0a0a0c", shoeHi: "#44444f",
    lap: "#b9bdc6", lapDk: "#7f848f", sweat: "#5ab0ff" };
  let ox = 0, oy = 0;
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x + ox, y + oy, w, h); }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function scene() {
    ox = 0; oy = 0;
    R(0, 0, 96, 58, "#a7aea6");
    R(0, 0, 11, 58, "#929a92"); R(11, 0, 1, 58, "#c4cac3");
    R(30, 0, 1, 58, "#9da49c"); R(84, 0, 1, 58, "#9da49c");
    for (let y = 6; y < 58; y++) for (let x = 50; x < 84; x++) {
      const dx = x - 67, dy = y - 26, d = Math.hypot(dx, dy);
      const inR = (y >= 26 && x >= 54 && x <= 80) || d <= 13;
      const inI = (y >= 26 && x >= 56 && x <= 78) || d <= 11;
      if (inI) { let c = "#36342e"; if (y < 24) c = "#d9a44a"; else if (y < 27) c = "#8a6a35"; g.fillStyle = c; g.fillRect(x, y, 1, 1); }
      else if (inR) { g.fillStyle = (x < 60 ? "#e3e6e1" : "#c4c9c2"); g.fillRect(x, y, 1, 1); }
    }
    R(71, 30, 2, 26, "#d8d0bd"); R(73, 30, 1, 26, "#b5ad9a");
    [[68, 33], [74, 36], [69, 40], [75, 44], [70, 48], [74, 30]].forEach(([x, y]) => { R(x, y, 3, 2, "#3f7a3a"); R(x + 1, y - 1, 1, 1, "#5ea153"); });
    R(0, 58, 96, 14, "#d9ccb8");
    for (let x = 0; x < 96; x += 12) R(x, 58, 1, 14, "#c5b7a2");
    R(0, 64, 96, 1, "#c5b7a2");
    R(0, 57, 96, 1, "#8c8a80");
  }

  function head(face) {
    R(41, 16, 14, 13, C.skin); R(42, 29, 12, 1, C.skin); R(41, 26, 1, 3, C.skinSh); R(54, 26, 1, 3, C.skinSh);
    R(40, 12, 16, 5, C.hair); R(41, 11, 3, 1, C.hair); R(46, 10, 4, 2, C.hair); R(51, 11, 3, 1, C.hair); R(49, 9, 2, 1, C.hair);
    R(39, 14, 2, 7, C.hair); R(55, 14, 2, 7, C.hair);
    R(41, 17, 4, 2, C.hair); R(46, 17, 2, 1, C.hair); R(49, 17, 5, 2, C.hair); R(44, 13, 3, 1, C.hairHi); R(51, 12, 2, 1, C.hairHi);
    R(39, 21, 2, 3, C.skin); R(55, 21, 2, 3, C.skin);
    R(42, 21, 4, 2, C.lens); R(50, 21, 4, 2, C.lens);
    if (face === "blink") { R(42, 22, 4, 1, C.eye); R(50, 22, 4, 1, C.eye); }
    else if (face === "wink") { R(44, 21, 1, 2, C.eye); R(50, 22, 4, 1, C.eye); }
    else if (face === "shock") { R(43, 21, 2, 2, C.eye); R(51, 21, 2, 2, C.eye); }
    else { R(44, 21, 1, 2, C.eye); R(51, 21, 1, 2, C.eye); }
    R(41, 20, 6, 1, C.frame); R(49, 20, 6, 1, C.frame); R(41, 23, 6, 1, C.frame); R(49, 23, 6, 1, C.frame);
    R(41, 21, 1, 2, C.frame); R(46, 21, 1, 2, C.frame); R(49, 21, 1, 2, C.frame); R(54, 21, 1, 2, C.frame); R(47, 21, 2, 1, C.frame);
    R(39, 21, 2, 1, C.frame); R(55, 21, 2, 1, C.frame);
    R(47, 24, 2, 1, C.skinSh);
    if (face === "shock") { R(46, 25, 3, 3, C.mouth); R(47, 26, 1, 1, "#5a1f1c"); R(56, 15, 2, 3, C.sweat); R(57, 18, 1, 1, C.sweat); R(42, 19, 3, 1, C.hair); R(51, 19, 3, 1, C.hair); }
    else if (face === "talk") { R(46, 26, 4, 2, C.mouth); }
    else { R(45, 26, 6, 1, C.mouth); R(44, 25, 1, 1, C.mouth); R(51, 25, 1, 1, C.mouth); }
    R(45, 30, 6, 2, C.skin); R(45, 30, 6, 1, C.skinSh);
  }
  function shirtV() {
    [[44, 8], [44, 8], [45, 6], [45, 6], [46, 4], [46, 4], [47, 2], [47, 2]].forEach(([x, w], i) => R(x, 32 + i, w, 1, C.shirt));
    R(43, 32, 2, 2, C.shirt); R(51, 32, 2, 2, C.shirt);
  }
  function tie(len) {
    R(47, 32, 2, 2, C.tie); R(47, 32, 1, 1, C.tieHi);
    R(47, 34, 2, 4, C.tie); R(46, 38, 4, len, C.tie); R(47, 38 + len, 2, 1, C.tie); R(47, 39, 1, len - 2, C.tieHi);
  }
  function jacketTorso() {
    R(38, 32, 20, 18, C.suit); R(37, 33, 1, 6, C.suit); R(58, 33, 1, 6, C.suit);
    shirtV(); tie(8);
    for (let i = 0; i < 6; i++) { R(43 + Math.floor(i / 2), 34 + i, 1, 1, C.suitHi); R(52 - Math.floor(i / 2), 34 + i, 1, 1, C.suitHi); }
    R(48, 47, 1, 1, C.suitHi); R(39, 44, 4, 1, C.suitSh); R(53, 44, 4, 1, C.suitSh);
  }
  function legs() {
    R(40, 50, 7, 14, C.suit); R(49, 50, 7, 14, C.suit); R(47, 50, 2, 3, C.suit);
    R(46, 53, 1, 11, C.suitSh); R(49, 53, 1, 11, C.suitSh);
    R(39, 64, 8, 3, C.shoe); R(49, 64, 8, 3, C.shoe); R(40, 64, 3, 1, C.shoeHi); R(50, 64, 3, 1, C.shoeHi);
  }
  function armDown(x, sleeve, sh) {
    R(x, 33, 3, 14, sleeve); R(x, 33, 1, 14, sh);
    R(x, 47, 3, 1, sleeve === C.shirt ? C.shirtSh : C.shirt); R(x, 48, 3, 3, C.skin); R(x, 50, 3, 1, C.skinSh);
  }

  function poseIdle(t) {
    head((t % 3.6) < 0.14 ? "blink" : "smile"); jacketTorso(); legs();
    R(36, 33, 3, 12, C.suit); R(57, 33, 3, 12, C.suit); R(36, 33, 1, 12, C.suitSh);
    R(37, 41, 22, 5, C.suit); R(37, 41, 22, 1, C.suitHi); R(37, 45, 22, 1, C.suitSh); R(48, 42, 1, 3, C.suitSh);
    R(41, 40, 3, 2, C.skin); R(44, 40, 1, 2, C.shirt);
    R(53, 43, 3, 2, C.skin); R(52, 43, 1, 2, C.shirt);
    R(39, 44, 1, 1, "#55565f"); R(41, 44, 1, 1, "#55565f");
  }
  const codeW = [[3, 9, 4], [5, 12], [5, 7, 6], [7, 14], [7, 5], [5, 10, 3], [3, 6], [5, 13], [3, 4]];
  const codeC = ["#7fd1ff", "#ffb84d", "#c3e88d", "#f78c6c", "#c792ea"];
  function poseCode(t) {
    const tt = t % 6, err = tt >= 3;
    if (err && !reduce) ox = (Math.floor(tt * 20) % 2) ? 1 : -1;
    head(err ? "shock" : ((t % 3.6) < 0.14 ? "blink" : "smile")); jacketTorso(); legs();
    R(36, 33, 3, 9, C.suit); R(57, 33, 3, 9, C.suit); R(36, 33, 1, 9, C.suitSh);
    R(37, 41, 6, 3, C.suit); R(53, 41, 6, 3, C.suit);
    R(40, 34, 16, 10, C.lapDk); R(40, 34, 16, 1, C.lap); R(47, 38, 2, 2, "#d6dae2");
    R(38, 44, 20, 2, C.lap); R(38, 45, 20, 1, C.lapDk);
    const k = err ? 0 : Math.floor(tt * 8) % 2;
    R(41, 43 - k, 3, 2, C.skin); R(52, 42 + k, 3, 2, C.skin);
    ox = 0; oy = 0;
    R(2, 4, 32, 26, "#0a0b0f"); R(3, 5, 30, 24, err ? "#7a1620" : "#18202e");
    R(34, 28, 2, 2, "#0a0b0f"); R(36, 30, 2, 2, "#0a0b0f");
    if (!err) {
      const n = Math.min(codeW.length, Math.floor(tt * 3.2) + 1);
      for (let i = 0; i < n; i++) { let x = 5; codeW[i].forEach((w, j) => { const ww = (i === n - 1 && j === codeW[i].length - 1) ? Math.max(1, Math.floor(w * ((tt * 3.2) % 1))) : w; R(x, 7 + i * 2, ww, 1, codeC[(i + j) % codeC.length]); x += w + 1; }); }
      if (Math.floor(tt * 4) % 2) { const l = n - 1; let x = 5; codeW[l].forEach(w => x += w + 1); R(x, 7 + l * 2, 1, 1, "#ffffff"); }
    }
  }
  function posePhone(t) {
    const open = (t % 2) < 1.4 && Math.floor(t * 7) % 2 === 0;
    head(open ? "talk" : ((t % 3.6) < 0.14 ? "blink" : "smile")); jacketTorso(); legs();
    armDown(57, C.suit, C.suitSh);
    R(36, 26, 3, 10, C.suit); R(36, 26, 1, 10, C.suitSh); R(36, 26, 3, 1, C.shirt);
    R(37, 21, 3, 5, C.skin);
    R(38, 18, 2, 10, C.frame); R(38, 19, 1, 1, "#4a90e2");
    ox = 0; oy = 0;
    R(59, 3, 35, 14, "#0a0b0f"); R(60, 4, 33, 12, "#f4f1e8"); R(57, 16, 2, 2, "#0a0b0f"); R(56, 18, 1, 1, "#0a0b0f");
  }
  function poseJacket(t) {
    R(58, 29, 5, 20, C.suit); R(62, 30, 1, 18, C.suitSh); R(58, 48, 5, 1, C.suitHi); R(59, 34, 1, 10, C.suitHi);
    head((t % 3) > 2.5 ? "wink" : "smile");
    R(38, 32, 20, 18, C.shirt); R(38, 32, 1, 17, C.shirtSh); R(57, 32, 1, 17, C.shirtSh);
    R(43, 32, 2, 2, C.shirtSh); R(51, 32, 2, 2, C.shirtSh); tie(9);
    R(38, 49, 20, 1, C.shoe); R(47, 49, 2, 1, "#c9c9c9");
    legs();
    armDown(35, C.shirt, C.shirtSh);
    R(57, 30, 3, 10, C.shirt); R(59, 30, 1, 10, C.shirtSh);
    R(57, 27, 3, 3, C.skin); R(56, 27, 2, 1, C.suit); R(56, 28, 1, 2, C.suit);
    ox = 0; oy = 0;
    const tw = Math.floor(t * 3) % 2;
    R(64, 10, 1, 1, "#ffffff"); if (tw) { R(63, 10, 3, 1, "#fff6c2"); R(64, 9, 1, 3, "#fff6c2"); }
    R(2, 4, 34, 14, "#0a0b0f"); R(3, 5, 32, 12, "#f4f1e8"); R(36, 16, 2, 2, "#0a0b0f"); R(38, 18, 1, 1, "#0a0b0f");
  }

  const poses = [poseIdle, poseCode, posePhone, poseJacket];
  const pad = document.getElementById("char-pad"), autoBtn = document.getElementById("char-auto");
  let pose = 0, t0 = performance.now(), auto = !reduce, autoT = 0;
  function setPose(p) {
    pose = p; t0 = performance.now(); autoT = 0;
    pad.querySelectorAll("[data-p]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.p === p)));
  }
  pad.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) setPose(+b.dataset.p); });
  autoBtn.addEventListener("click", () => { auto = !auto; autoBtn.setAttribute("aria-pressed", String(auto)); autoT = 0; });
  autoBtn.setAttribute("aria-pressed", String(auto));
  setPose(0);

  const PX = '"Silkscreen", monospace', TH = '"Chakra Petch", sans-serif';
  function txt(s, x, y, size, color, font) { ctx.font = `700 ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y); }

  let last = performance.now(), visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
  function frame(now) {
    const dt = (now - last) / 1000; last = now;
    if (visible) {
      if (auto) { autoT += dt; if (autoT > 6) setPose((pose + 1) % 4); }
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, LW, LH); scene();
      R(37, 66, 22, 2, "rgba(0,0,0,0.18)");
      oy = (pose !== 1 && !reduce && Math.floor(t / 0.9) % 2) ? 1 : 0; ox = 0;
      poses[pose](t);
      ox = 0; oy = 0;
      ctx.drawImage(low, 0, 0, LW * S, LH * S);
      if (pose === 1 && (t % 6) >= 3) {
        txt("ERROR!", 18 * S, 13 * S, 34, "#ffffff", PX);
        txt("line 42: ;", 18 * S, 19 * S, 18, "#ffc9cf", PX);
        txt("expected", 18 * S, 23 * S, 18, "#ffc9cf", PX);
      }
      if (pose === 2) { const lines = LIST("char.talk"); txt(lines[Math.floor(t / 2) % lines.length], 76.5 * S, 10 * S, 28, "#1a1a1a", TH); }
      if (pose === 3) txt(T("char.off"), 19 * S, 11 * S, 30, "#1a1a1a", TH);
    }
    requestAnimationFrame(frame);
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).finally(() => requestAnimationFrame(frame));
})();
