/* ASCII aquarium: every glyph is placed each frame. A clownfish swims by tail beats,
   chases food you drop, and goes home to an anemone whose tentacles part around it. */
(() => {
  const cv = document.getElementById("aqua");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FS = 11, CH = 12, DPR = Math.min(2, window.devicePixelRatio || 1);
  const FONT = `700 ${FS}px ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace`;
  let CW = 6.6, W = 0, H = 0, cols = 0, rows = 0, chr = [], col = [];
  let sandY = 0, ax = 0, tents = [], weeds = [], home = { x: 0, y: 0 };
  const food = [], bubbles = [];
  const fish = { x: 0, y: 0, vx: 30, vy: 0, R: 60, ph: 0, face: 1, faceS: 1, tilt: 0, state: "wander", timer: 10, tx: 0, ty: 0 };

  const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function put(x, y, c, color) {
    const i = Math.floor(x / CW), j = Math.floor(y / CH);
    if (i < 0 || j < 0 || i >= cols || j >= rows) return;
    chr[j * cols + i] = c; col[j * cols + i] = color;
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = FONT; ctx.textBaseline = "top";
    CW = ctx.measureText("M").width || 6.6;
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    chr = new Array(cols * rows); col = new Array(cols * rows);
    layout();
  }

  function layout() {
    const r = rng(7);
    sandY = H - CH * 2.6;
    ax = W * (W < 560 ? 0.66 : 0.7);
    fish.R = clamp(W * 0.095, 44, 86);
    const n = W < 560 ? 16 : 22, spread = clamp(W * 0.24, 90, 170), scale = clamp(H / 360, 0.75, 1.2);
    tents = [];
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1) - 0.5;
      tents.push({ bx: ax + f * spread, len: (84 + r() * 56) * scale * (1 - Math.abs(f) * 0.5), lean: f * 1.1, ph: r() * 6.28, front: k % 2 === 1 });
    }
    home = { x: ax, y: sandY - 50 * scale };
    weeds = [];
    const wn = Math.max(2, Math.round(W / 260));
    for (let k = 0; k < wn; k++) weeds.push({ x: (k + 0.5) * (ax - spread / 2 - 30) / wn + r() * 20, h: Math.round(rows * (0.3 + r() * 0.3)), ph: r() * 6.28 });
    if (!fish.x) { fish.x = W * 0.3; fish.y = H * 0.4; pickWander(); }
    fish.x = clamp(fish.x, 0, W); fish.y = clamp(fish.y, 0, sandY);
  }

  function pickWander() {
    fish.tx = rand(fish.R * 1.4, W - fish.R * 1.4);
    fish.ty = rand(fish.R * 0.8, sandY - fish.R * 1.1);
  }

  /* ---------- simulation ---------- */
  function update(dt, t) {
    let tx, ty, want;
    if (food.length) {
      let best = null, bd = 1e9;
      for (const p of food) { const d = Math.hypot(p.x - fish.x, p.y - fish.y); if (d < bd) { bd = d; best = p; } }
      tx = best.x - fish.face * fish.R * 0.85; ty = best.y; want = 95;
    } else if (fish.state === "home") {
      tx = home.x + Math.sin(t * 0.6) * 14; ty = home.y + Math.sin(t * 0.9) * 8; want = 22;
      if ((fish.timer -= dt) <= 0) { fish.state = "wander"; fish.timer = rand(9, 15); pickWander(); }
    } else {
      tx = fish.tx; ty = fish.ty; want = 48;
      if (Math.hypot(tx - fish.x, ty - fish.y) < 28) pickWander();
      if ((fish.timer -= dt) <= 0) { fish.state = "home"; fish.timer = rand(6, 9); }
    }
    const dx = tx - fish.x, dy = ty - fish.y, d = Math.hypot(dx, dy) || 1;
    // the tail beat pushes: thrust peaks on each stroke
    const pulse = 0.7 + 0.6 * Math.max(0, Math.sin(fish.ph * 2));
    const sp = want * Math.min(1, d / 70) * pulse;
    const k = Math.min(1, dt * 1.7);
    fish.vx += (dx / d * sp - fish.vx) * k;
    fish.vy += (dy / d * sp * 0.8 - fish.vy) * k;
    fish.x += fish.vx * dt; fish.y += fish.vy * dt;
    fish.y = clamp(fish.y, fish.R * 0.5, sandY - fish.R * 0.35);
    const speed = Math.hypot(fish.vx, fish.vy);
    fish.ph += dt * (3 + speed * 0.1);
    if (Math.abs(fish.vx) > 8) fish.face = fish.vx > 0 ? 1 : -1;
    fish.faceS += (fish.face - fish.faceS) * Math.min(1, dt * 5);
    fish.tilt += (clamp(Math.atan2(fish.vy, Math.abs(fish.vx) + 10), -0.42, 0.42) - fish.tilt) * Math.min(1, dt * 3);

    // food sinks with a wobble; eaten when it reaches the mouth
    const mx = fish.x + fish.faceS * fish.R * 0.95, my = fish.y + Math.sin(fish.tilt) * fish.R * 0.9;
    for (let i = food.length - 1; i >= 0; i--) {
      const p = food[i];
      p.age += dt;
      if (p.y < sandY - 4) { p.y += 22 * dt; p.x += Math.sin(p.age * 2.4 + p.ph) * 10 * dt; }
      if (Math.hypot(p.x - mx, p.y - my) < 16) { food.splice(i, 1); for (let b = 0; b < 3; b++) bubbles.push({ x: mx, y: my, s: rand(0.3, 1), v: rand(18, 34), ph: rand(0, 6) }); }
      else if (p.age > 14) food.splice(i, 1);
    }
    if (Math.random() < dt * 0.5) bubbles.push({ x: ax + rand(-30, 30), y: sandY - 10, s: rand(0, 1), v: rand(14, 26), ph: rand(0, 6) });
    if (Math.random() < dt * 0.12) bubbles.push({ x: mx, y: my, s: rand(0, 0.5), v: rand(16, 24), ph: rand(0, 6) });
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.ph) * 8 * dt; b.s += dt * 0.08;
      if (b.y < -10) bubbles.splice(i, 1);
    }
  }

  /* ---------- drawing ---------- */
  function water(t) {
    for (let j = 0; j < rows; j++) {
      const y = j * CH; if (y > sandY) break;
      for (let i = 0; i < cols; i++) {
        const n = Math.sin(i * 0.19 + t * 0.6) + Math.sin(j * 0.41 - t * 0.5 + i * 0.05) + Math.sin((i - j * 1.7) * 0.09 + t * 0.35);
        const ray = Math.sin(i * 0.07 + j * 0.05 - t * 0.12) + Math.sin(i * 0.023 - t * 0.05);
        if (n > 2.6) put(i * CW, y, "~", "#1f5574");
        else if (n > 2.3) put(i * CW, y, ".", "#173f58");
        else if (ray > 1.85 && hash(i, j + Math.floor(t * 2)) < 0.18 * (1 - j / rows)) put(i * CW, y, "'", "#1a4560");
      }
    }
  }
  function sand() {
    const top = Math.floor(sandY / CH);
    for (let j = top; j < rows; j++) for (let i = 0; i < cols; i++) {
      const h = hash(i, j);
      if (j === top) { if (h < 0.55) put(i * CW, j * CH, h < 0.3 ? "_" : ".", "#7d6a48"); continue; }
      put(i * CW, j * CH, ".,:;'`_~"[Math.floor(h * 8)], h < 0.5 ? "#8f7a52" : "#6a5a3c");
    }
  }
  function seaweed(t) {
    for (const w of weeds) for (let k = 0; k < w.h; k++) {
      const f = k / w.h, off = Math.sin(t * 1.1 + w.ph - k * 0.35) * 2.2 * f;
      put(w.x + off * CW, sandY - k * CH, k % 2 ? ")" : "(", f > 0.6 ? "#4fd07e" : "#2f9e5a");
    }
  }
  function tentacle(T, t) {
    const segs = 14, sl = T.len / segs;
    let x = T.bx, y = sandY, px = x, py = y;
    for (let k = 1; k <= segs; k++) {
      const f = k / segs;
      const a = T.lean * (0.35 + 0.65 * f) + Math.sin(t * 1.15 + T.ph + k * 0.42) * 0.28 * f;
      x += Math.sin(a) * sl; y -= Math.cos(a) * sl;
      // part around the fish: push each point sideways, more toward the tips
      const dx = x - fish.x, dy = (y - fish.y) * 1.4, R = fish.R * 1.15;
      const push = Math.exp(-(dx * dx + dy * dy) / (R * R)) * fish.R * 0.75 * (0.3 + f);
      const qx = x + (dx >= 0 ? 1 : -1) * push, qy = y;
      const steps = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py) / (CH * 0.6)));
      const ang = Math.atan2(qx - px, py - qy);
      const c = Math.abs(ang) < 0.38 ? "|" : Math.abs(ang) > 1.2 ? "~" : ang > 0 ? "/" : "\\";
      const color = f < 0.35 ? "#8b3fd0" : f < 0.7 ? "#c056d6" : "#ff7ac8";
      for (let s = 1; s <= steps; s++) put(px + (qx - px) * s / steps, py + (qy - py) * s / steps, c, color);
      px = qx; py = qy;
    }
    put(px, py - CH * 0.5, "o", "#ffd0ee");
  }
  function anemoneBase() {
    const half = (tents[tents.length - 1].bx - tents[0].bx) / 2 + CW * 2;
    for (let x = ax - half; x <= ax + half; x += CW) {
      const e = Math.abs(x - ax) / half;
      put(x, sandY, e > 0.8 ? "(" : "#", "#6d2a9e");
      if (e < 0.75) put(x, sandY - CH, e > 0.6 ? "/" : "%", "#8b3fd0");
    }
  }

  const MIRROR = { "/": "\\", "\\": "/", "(": ")", ")": "(", "<": ">", ">": "<" };
  const DENS = ".:-=+*#%@";
  const OR = ["#d9530a", "#ff7b1c", "#ffa552"], WH = ["#c8c8c2", "#f6f6f0"], BK = "#4a2c1c";

  // what the fish looks like at local point (u along body, nose = +1; v down)
  function fishCell(u, v) {
    const w = (1 - u) / 2;
    v -= Math.sin(fish.ph - u * 2.4) * 0.2 * w * w * 1.7;
    const q = (u - 0.1) / 0.95;
    let h = 0.38 * Math.sqrt(Math.max(0, 1 - q * q));
    if (u < -0.35 && u > -0.95) h = Math.max(h, 0.11);
    const top = v < 0;
    if (h > 0 && Math.abs(v) < h) {
      const e = Math.abs(v) / h;
      const eu = (u - 0.7) / 0.075, ev = (v + 0.06) / 0.075;
      if (eu * eu + ev * ev < 1) return ["@", "#f6f6f0"];
      // pectoral fin, flapping
      const fu = (u - 0.28) / (0.12 + 0.03 * Math.sin(fish.ph * 3)), fv = (v - 0.1) / 0.11;
      if (fu * fu + fv * fv < 1) return [")", "#ffc27a"];
      // three white bands with dark margins, curved like the real thing
      for (const [c, bw] of [[0.5, 0.065], [0.0, 0.07], [-0.62, 0.05]]) {
        const du = Math.abs(u - (c - v * v * 0.6));
        if (du < bw) return [e > 0.75 ? ":" : DENS[Math.round(6 - e * 3)], WH[top ? 1 : 0]];
        if (du < bw + 0.035) return [":", BK];
      }
      if (e > 0.82) return [top ? "-" : "~", BK];
      const lv = clamp(Math.round((1 - e * e) * 6 + (top ? 1.5 : -0.5)), 0, 8);
      return [DENS[lv], OR[top && e < 0.5 ? 2 : e < 0.55 ? 1 : 0]];
    }
    // tail fan
    if (u <= -0.85 && u > -1.32) {
      const s = 0.1 + (-0.85 - u) * 0.85;
      if (Math.abs(v) < s && !(u < -1.18 && Math.abs(v) < (u + 1.32) * 1.1)) {
        if (u < -1.2 || Math.abs(v) > s - 0.05) return [":", BK];
        return [Math.abs(v) < 0.05 ? "=" : top ? "\\" : "/", OR[1]];
      }
    }
    // dorsal fin
    if (top && u > -0.6 && u < 0.42) {
      const fh = 0.2 * Math.sin(Math.PI * (u + 0.6) / 1.02) + (u < -0.1 ? 0.04 : 0);
      if (-v < h + fh && -v >= h) return [-v > h + fh - 0.06 ? "^" : "\\", -v > h + fh - 0.06 ? BK : OR[1]];
    }
    // anal + pelvic fins
    if (!top) {
      const a = u > -0.62 && u < -0.05 ? 0.15 * Math.sin(Math.PI * (u + 0.62) / 0.57) : u > 0.18 && u < 0.42 ? 0.12 * Math.sin(Math.PI * (u - 0.18) / 0.24) : 0;
      if (a > 0 && v < h + a && v >= h) return [v > h + a - 0.05 ? "," : "/", v > h + a - 0.05 ? BK : OR[0]];
    }
    return null;
  }
  function drawFish() {
    const R = fish.R, fs = Math.abs(fish.faceS) < 0.12 ? (fish.faceS < 0 ? -0.12 : 0.12) : fish.faceS;
    const ct = Math.cos(fish.tilt), st = Math.sin(fish.tilt), flip = fs < 0;
    const i0 = Math.floor((fish.x - R * 1.45) / CW), i1 = Math.ceil((fish.x + R * 1.45) / CW);
    const j0 = Math.floor((fish.y - R * 0.95) / CH), j1 = Math.ceil((fish.y + R * 0.95) / CH);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) * CW, y = (j + 0.5) * CH;
      const a = (x - fish.x) / (fs * R), b = (y - fish.y) / R;
      const cell = fishCell(a * ct + b * st, -a * st + b * ct);
      if (cell) put(x, y, flip ? MIRROR[cell[0]] || cell[0] : cell[0], cell[1]);
    }
  }

  function frame(t) {
    if (!cols) return;
    chr.fill(undefined);
    water(t); sand(); seaweed(t);
    for (const T of tents) if (!T.front) tentacle(T, t);
    anemoneBase();
    for (const b of bubbles) put(b.x, b.y, b.s < 0.4 ? "." : b.s < 0.8 ? "o" : "O", "#6fb4dc");
    for (const p of food) put(p.x, p.y, "*", "#ffe27a");
    drawFish();
    for (const T of tents) if (T.front) tentacle(T, t);
    paint();
  }
  function paint() {
    ctx.fillStyle = "#03070c"; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(40,110,160,.16)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const groups = new Map();
    for (let k = 0; k < chr.length; k++) if (chr[k]) { let a = groups.get(col[k]); if (!a) groups.set(col[k], a = []); a.push(k); }
    for (const [color, ks] of groups) {
      ctx.fillStyle = color;
      for (const k of ks) ctx.fillText(chr[k], (k % cols) * CW, Math.floor(k / cols) * CH);
    }
  }

  /* ---------- loop ---------- */
  let running = false, visible = false, last = 0, acc = 0, raf = 0;
  function loop(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now; acc += dt;
    if (acc >= 1 / 30) { const step = Math.min(acc, 0.1); acc = 0; update(step, now / 1000); frame(now / 1000); }
    raf = requestAnimationFrame(loop);
  }
  function setRun() {
    if (!W) { resize(); if (!W) return; }
    const want = visible && !document.hidden && !reduce;
    if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!want) running = false;
  }

  function still() { fish.x = home.x - 10; fish.y = home.y; fish.state = "home"; frame(2); }

  cv.addEventListener("pointerdown", e => {
    if (reduce) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = Math.min(e.clientY - r.top, sandY - 8);
    for (let k = 0; k < 3; k++) if (food.length < 9) food.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), age: 0, ph: rand(0, 6) });
  });

  new ResizeObserver(() => { resize(); if (!running) reduce ? still() : frame(performance.now() / 1000); }).observe(cv);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; setRun(); }, { rootMargin: "100px" }).observe(cv);
  document.addEventListener("visibilitychange", setRun);
  addEventListener("load", () => { resize(); if (W && !running) reduce ? still() : frame(performance.now() / 1000); setRun(); });
})();
