/* Binary Earth: a rotating globe drawn only with 0 and 1. Each digit is sampled from
   real Earth maps (NASA-derived day colour, clouds, city lights and ocean mask),
   lit by the sun, with an atmosphere rim, an orbiting satellite and a ping over Thailand. */
(() => {
  const cv = document.getElementById("globe");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let FS = 10, CH = 11, CW = 6, W = 0, H = 0, cols = 0, rows = 0;
  let cx = 0, cy = 0, R = 0, stars = [];
  let day = null, dat = null; const TW = 512, TH = 256;

  // view: centre longitude (radians) spins slowly; drag adds momentum
  let lon0 = 100 * Math.PI / 180, spin = 0, dragging = false, lastX = 0;
  const BASE = -0.11, TILT = 23.4 * Math.PI / 180, ct = Math.cos(TILT), st = Math.sin(TILT);
  const L = norm([-0.38, 0.26, 0.89]), HV = norm([L[0], L[1], L[2] + 1]);
  const BKK = { lat: 13.75 * Math.PI / 180, lon: 100.5 * Math.PI / 180 };

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function load(src) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = TW; c.height = TH;
          const g = c.getContext("2d"); g.drawImage(im, 0, 0, TW, TH);
          res(g.getImageData(0, 0, TW, TH).data);
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    FS = W < 560 ? 9 : 11; CH = FS + 1;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = `700 ${FS}px ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace`;
    ctx.textBaseline = "top";
    CW = ctx.measureText("0").width || FS * 0.6;
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    R = Math.min(W * (W < 560 ? 0.44 : 0.3), H * 0.36);
    cx = W / 2; cy = H * 0.5;
    stars = [];
    const n = Math.round(cols * rows * 0.035);
    for (let k = 0; k < n; k++) {
      const i = Math.floor(hash(k, 1) * cols), j = Math.floor(hash(k, 2) * rows);
      stars.push({ i, j, b: hash(k, 3), ph: hash(k, 4) * 6.28, s: 0.3 + hash(k, 5) * 1.2 });
    }
  }

  // colour cache keeps fillStyle strings few
  const cache = new Map();
  function rgb(r, g, b) {
    r = clamp(r, 0, 255) & 0xf8; g = clamp(g, 0, 255) & 0xf8; b = clamp(b, 0, 255) & 0xf8;
    const k = (r << 16) | (g << 8) | b;
    let s = cache.get(k); if (!s) cache.set(k, s = `rgb(${r},${g},${b})`);
    return s;
  }
  let groups = new Map(), tints = new Map();
  function put(i, j, bit, color) {
    if (i < 0 || j < 0 || i >= cols || j >= rows) return;
    let a = groups.get(color); if (!a) groups.set(color, a = []);
    a.push(i, j, bit);
  }

  // view-space unit vector -> (lat, lon) on the planet
  function toGeo(x, y, z) {
    const xr = x * ct + y * st, yr = -x * st + y * ct; // undo axial tilt
    return [Math.asin(clamp(yr, -1, 1)), Math.atan2(xr, z) + lon0];
  }
  function toView(lat, lon) {
    const a = lon - lon0, xr = Math.cos(lat) * Math.sin(a), yr = Math.sin(lat), z = Math.cos(lat) * Math.cos(a);
    return [xr * ct - yr * st, xr * st + yr * ct, z];
  }

  function earth(t) {
    const tick = Math.floor(t * 6);
    const j0 = Math.max(0, Math.floor((cy - R * 1.12) / CH)), j1 = Math.min(rows - 1, Math.ceil((cy + R * 1.12) / CH));
    const i0 = Math.max(0, Math.floor((cx - R * 1.12) / CW)), i1 = Math.min(cols - 1, Math.ceil((cx + R * 1.12) / CW));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = ((i + 0.5) * CW - cx) / R, y = -((j + 0.5) * CH - cy) / R, r2 = x * x + y * y;
      if (r2 >= 1) {
        // atmosphere halo just outside the limb, brighter on the sunlit side
        const d = Math.sqrt(r2) - 1;
        if (d < 0.1) {
          const lit = clamp((x * L[0] + y * L[1]) / Math.sqrt(r2) * 0.8 + 0.45, 0.12, 1);
          const f = Math.pow(1 - d / 0.1, 2) * lit;
          if (f > 0.06 && hash(i * 7 + j, tick) < 0.55 + f * 0.4) put(i, j, hash(i, j + tick) < 0.5 ? "0" : "1", rgb(60 * f, 150 * f + 20, 255 * f + 30));
        }
        continue;
      }
      const z = Math.sqrt(1 - r2);
      const [lat, lon] = toGeo(x, y, z);
      let u = (((lon + Math.PI) / (2 * Math.PI)) % 1 + 1) % 1, v = 0.5 - lat / Math.PI;
      const tx = Math.min(TW - 1, Math.floor(u * TW)), ty = Math.min(TH - 1, Math.floor(v * TH)), p = (ty * TW + tx) * 4;
      const ndl = x * L[0] + y * L[1] + z * L[2];
      const diff = clamp(ndl, 0, 1), dayAmt = clamp((ndl + 0.12) / 0.3, 0, 1);
      let cr = day[p], cg = day[p + 1], cb = day[p + 2];
      // punch up saturation so land and sea read clearly in thin glyphs
      const lum = (cr + cg + cb) / 3, sea = dat[p + 2] / 255;
      if (sea > 0.5) { cr = 14 + cr * 0.5; cg = 60 + cg * 0.9; cb = 140 + cb * 0.9; }
      else { const sat = 2.0, gain = 2.0; cr = (lum + (cr - lum) * sat) * gain; cg = (lum + (cg - lum) * sat) * gain; cb = (lum + (cb - lum) * sat) * gain; }
      const cloud = dat[p] / 255, lights = dat[p + 1] / 255, ocean = dat[p + 2] / 255;
      const k = 0.06 + 0.94 * diff;
      cr *= k; cg *= k; cb *= k;
      const cw = clamp(cloud * 1.4 - 0.45, 0, 1) * 0.38, cl = 255 * (0.08 + 0.92 * diff);
      cr += (cl - cr) * cw; cg += (cl - cg) * cw; cb += (cl * 1.02 - cb) * cw;
      // city lights on the night side
      const night = 1 - dayAmt;
      if (night > 0 && lights > 0.12) { const g = (lights - 0.12) * night * (1 - cw) * 1.6; cr += 255 * g; cg += 185 * g; cb += 90 * g; }
      // sun glint on water
      const sp = Math.pow(clamp(x * HV[0] + y * HV[1] + z * HV[2], 0, 1), 60) * ocean * (1 - cw);
      cr += 200 * sp; cg += 220 * sp; cb += 255 * sp;
      // limb haze
      const limb = Math.pow(1 - z, 2.4) * (0.25 + diff);
      cr += 50 * limb; cg += 120 * limb; cb += 230 * limb;
      // keep the dark side faintly visible as a field of digits
      cr = Math.max(cr, 8); cg = Math.max(cg, 18); cb = Math.max(cb, 36);
      // digits ride on the surface; a few flip every tick like live data
      let bit = hash(Math.floor(u * 384), Math.floor(v * 192)) < 0.5 ? 0 : 1;
      if (hash(i * 131 + j, tick) < 0.025) bit ^= 1;
      const c = rgb(cr, cg, cb);
      put(i, j, bit ? "1" : "0", c);
      let ta = tints.get(c); if (!ta) tints.set(c, ta = []); ta.push(i, j);
    }
  }

  function orbit(t, front) {
    const a0 = t * 0.32, rr = R * 1.42, inc = 0.3, cz = Math.cos(inc), sz = Math.sin(inc), rot = -0.32, cr = Math.cos(rot), sr = Math.sin(rot);
    const steps = Math.round(rr * 6.3 / CW / 1.6);
    for (let s = 0; s < steps; s++) {
      const a = s / steps * Math.PI * 2;
      let X = Math.cos(a) * rr, Y = 0, Z = Math.sin(a) * rr;
      const Y2 = Y * cz - Z * sz, Z2 = Y * sz + Z * cz; Y = Y2; Z = Z2;
      const X3 = X * cr - Y * sr, Y3 = X * sr + Y * cr;
      if ((Z > 0) !== front) continue;
      const sx = cx + X3, sy = cy - Y3;
      if (!front && (sx - cx) ** 2 + (sy - cy) ** 2 < R * R) continue;
      // brighter trail just behind the satellite
      const lag = ((a0 - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const trail = lag < 1.4 ? 1 - lag / 1.4 : 0;
      const f = (front ? 0.55 : 0.28) + trail * 0.6;
      put(Math.floor(sx / CW), Math.floor(sy / CH), s % 2 ? "1" : "0", rgb(70 * f + 160 * trail, 150 * f + 70 * trail, 210 * f));
    }
    // the satellite itself
    let X = Math.cos(a0) * rr, Z = Math.sin(a0) * rr, Y = -Z * sz; Z = Z * cz;
    if ((Z > 0) === front) {
      const X3 = X * cr - Y * sr, Y3 = X * sr + Y * cr, sx = cx + X3, sy = cy - Y3;
      if (front || (sx - cx) ** 2 + (sy - cy) ** 2 >= R * R) {
        const i = Math.floor(sx / CW), j = Math.floor(sy / CH), on = Math.floor(t * 3) % 2;
        put(i - 1, j, "1", rgb(90, 170, 255)); put(i + 1, j, "1", rgb(90, 170, 255));
        put(i, j, on ? "1" : "0", rgb(255, 220, 80));
      }
    }
  }

  function ping(t) {
    const [x, y, z] = toView(BKK.lat, BKK.lon);
    if (z < 0.12) return;
    const sx = cx + x * R, sy = cy - y * R, i = Math.floor(sx / CW), j = Math.floor(sy / CH);
    put(i, j, Math.floor(t * 4) % 2 ? "1" : "0", rgb(255, 225, 80));
    const ph = (t * 0.6) % 1, rad = 4 + ph * R * 0.16, f = 1 - ph;
    const n = Math.max(8, Math.round(rad * 0.9));
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      put(Math.floor((sx + Math.cos(a) * rad * z) / CW), Math.floor((sy + Math.sin(a) * rad) / CH), k % 2 ? "1" : "0", rgb(255 * f, 200 * f, 60 * f));
    }
  }

  function draw(t) {
    if (!cols) return;
    groups = new Map(); tints = new Map();
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.s + s.ph);
      const b = (0.12 + s.b * 0.35) * (0.4 + 0.6 * tw);
      put(s.i, s.j, (hash(s.i, Math.floor(t * 0.5 + s.ph)) < 0.5) ? "0" : "1", rgb(120 * b, 170 * b, 220 * b));
    }
    if (day && dat) { orbit(t, false); earth(t); ping(t); orbit(t, true); }
    ctx.clearRect(0, 0, W, H);
    // faint wash behind the digits so the globe reads as a solid sphere
    ctx.globalAlpha = 0.58;
    for (const [color, a] of tints) { ctx.fillStyle = color; for (let k = 0; k < a.length; k += 2) ctx.fillRect(a[k] * CW, a[k + 1] * CH, CW + 0.5, CH + 0.5); }
    ctx.globalAlpha = 1;
    for (const [color, a] of groups) {
      ctx.fillStyle = color;
      for (let k = 0; k < a.length; k += 3) ctx.fillText(a[k + 2], a[k] * CW, a[k + 1] * CH);
    }
  }

  /* ---------- loop + input ---------- */
  let running = false, visible = false, last = 0, acc = 0, T = 0;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now; acc += dt;
    if (acc >= 1 / 30) {
      if (!dragging) { lon0 += (BASE + spin) * acc; spin *= Math.pow(0.25, acc); }
      T += acc; acc = 0; draw(T);
    }
    requestAnimationFrame(loop);
  }
  function setRun() {
    if (!W) resize();
    const want = visible && !document.hidden && !reduce && W > 0;
    if (want && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!want) running = false;
  }

  cv.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; spin = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!dragging) return;
    const d = (e.clientX - lastX) / Math.max(R, 1); lastX = e.clientX;
    lon0 -= d; spin = clamp(-d * 30, -3, 3);
    if (!running) draw(T);
  });
  const up = () => { dragging = false; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  new ResizeObserver(() => { resize(); draw(T); }).observe(cv);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; setRun(); }, { rootMargin: "100px" }).observe(cv);
  document.addEventListener("visibilitychange", setRun);
  Promise.all([load("images/earth-day.jpg"), load("images/earth-data.png")]).then(([a, b]) => {
    day = a; dat = b; resize(); draw(T); setRun();
  });
})();
