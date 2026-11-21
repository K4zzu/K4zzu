// Star system (star, dotted orbits, planets) drawn with the same per-cell "heat -> glyph + colour" technique as black-hole.js
export function createSystemRenderer(cv, opts) {
  const W = opts().width || 1080, H = 960, CW = 7, CH = 11, COLS = Math.floor((W - 2) / 7), ROWS = 87, OX = 1, OY = 1, N = COLS * ROWS, FPS = 30;
  const { sin, cos, exp, sqrt, atan2, log, pow, abs, floor, min, max } = Math;
  const ss = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const hash = (i, s) => { const v = sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - floor(v); };

  const LV = ['1il!;:', 'rtfjcvxz=+', 'aeoun0{}[]<>', '08B$#&%Q'];
  const chars = [], cmap = {};
  for (const c of LV.join('') + '.*+') if (!(c in cmap)) { cmap[c] = chars.length; chars.push(c); }
  const LVI = LV.map(s => Array.from(s, c => cmap[c]));
  const ac = document.createElement('canvas'); ac.width = CW * chars.length; ac.height = CH;
  const ax = ac.getContext('2d', { willReadFrequently: true });
  ax.font = '12px Consolas, Menlo, monospace'; ax.textAlign = 'center'; ax.textBaseline = 'alphabetic'; ax.fillStyle = '#fff';
  chars.forEach((c, k) => ax.fillText(c, k * CW + CW / 2, 9));
  const aimg = ax.getImageData(0, 0, ac.width, CH).data;
  const CELLPX = CW * CH, atlas = new Uint8Array(chars.length * CELLPX);
  for (let k = 0; k < chars.length; k++) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++)
    atlas[k * CELLPX + y * CW + x] = aimg[(y * ac.width + k * CW + x) * 4 + 3];

  const X = new Float32Array(N), Y = new Float32Array(N), HC = new Uint16Array(N), HS = new Float32Array(N), HD = new Float32Array(N), SP = new Float32Array(N);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    X[i] = ((c + 0.5) / COLS - 0.5) * (W / H); Y[i] = (r + 0.5) / ROWS - 0.5;
    HC[i] = floor(hash(i, 1) * 997); HS[i] = hash(i, 2); HD[i] = hash(i, 3); SP[i] = hash(i, 4) * Math.PI * 2;
  }
  const OFX = new Float32Array(N), OFY = new Float32Array(N), VX = new Float32Array(N), VY = new Float32Array(N);
  let pmx = NaN, pmy = NaN, live = false;

  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const octx = off.getContext('2d'), img = octx.createImageData(W, H), D = img.data;
  for (let i = 3; i < D.length; i += 4) D[i] = 255;
  const half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
  const hctx = half.getContext('2d'), ctx = cv.getContext('2d'), hasFilter = typeof ctx.filter === 'string';

  const paint = (i, gi, r, g, b) => {
    const col = i % COLS, row = (i - col) / COLS;
    const bx = OX + col * CW + Math.round(OFX[i]), by = OY + row * CH + Math.round(OFY[i]);
    if (bx < 0 || by < 0 || bx > W - CW || by > H - CH) return;
    let p = (by * W + bx) * 4, a = gi * CELLPX;
    for (let y = 0; y < CH; y++, p += (W - CW) * 4) for (let x = 0; x < CW; x++, p += 4, a++) {
      const m = atlas[a]; if (!m) continue;
      const k = m / 255, vr = r * k, vg = g * k, vb = b * k;
      if (vr > D[p]) D[p] = vr; if (vg > D[p + 1]) D[p + 1] = vg; if (vb > D[p + 2]) D[p + 2] = vb;
    }
  };

  const WARM = [[190, 38, 12], [242, 78, 20], [255, 124, 34], [255, 172, 78], [255, 222, 168]];
  const COOL = [[70, 44, 120], [112, 80, 176], [160, 134, 214], [112, 196, 140], [206, 236, 214]];
  // real-body palettes (dark -> bright)
  const MOON = [[58, 58, 66], [104, 104, 112], [160, 160, 168], [208, 208, 212], [246, 246, 240]];
  const JUP = [[92, 52, 30], [150, 92, 52], [200, 142, 92], [232, 202, 162], [250, 238, 216]];
  const GRS = [[112, 32, 20], [170, 62, 36], [212, 98, 58], [236, 144, 98], [250, 198, 162]];
  const SAT = [[92, 74, 42], [150, 122, 72], [202, 172, 112], [234, 212, 162], [252, 242, 216]];
  const ICE = [[70, 70, 78], [122, 122, 130], [176, 176, 184], [222, 222, 226], [250, 250, 248]];
  const CASS = [[62, 30, 22], [112, 58, 38], [152, 86, 58], [188, 120, 86], [218, 160, 124]];
  const BASE = [MOON, JUP, SAT, ICE];
  let frame = 0, lastF = -9, lastBurst, PH = 0, PAL = COOL;
  // one real body per project, same shader small (in orbit) and large (focused):
  // 0 the Moon (near side: maria, Tycho and its rays, Copernicus) · 1 Jupiter (belts, zones, Great Red Spot)
  // 2 Saturn (C, B and A rings, Cassini division, Encke gap) · 3 Iapetus (two-tone moon: dark reddish Cassini Regio, bright ice, equatorial ridge)
  const MARIA = [[-0.3, -0.45, 0.28, 0.22], [0.15, -0.42, 0.17, 0.16], [0.33, -0.12, 0.22, 0.17], [0.68, -0.35, 0.12, 0.1], [0.6, 0.12, 0.13, 0.18], [0.38, 0.28, 0.09, 0.09], [-0.6, 0, 0.25, 0.45], [-0.18, 0.35, 0.16, 0.13], [-0.48, 0.42, 0.09, 0.08], [0, -0.74, 0.36, 0.06]];
  const g2 = (v, c, w) => { const q = (v - c) / w; return exp(-q * q); };
  const shade = (kind, dx, dy, R, Lx, Ly, Lz, t) => {
    const nx = dx / R, ny = dy / R, r2 = nx * nx + ny * ny; let h = 0;
    if (r2 < 1) {
      const z = sqrt(1 - r2), diff = max(0, nx * Lx + ny * Ly + z * Lz); let lit = 0.08 + 0.92 * pow(diff, 0.8), pat = 1, rim = 0.25 * pow(1 - z, 3) * diff;
      if (kind === 0) {
        // the Moon's near side (tidally locked, so always this face): dark maria on bright highlands, no atmosphere -> hard terminator
        PAL = MOON; lit = 0.03 + 0.97 * pow(diff, 0.6); rim = 0;
        for (let m = 0; m < MARIA.length; m++) { const M = MARIA[m], ex = (nx - M[0]) / M[2], ey = (ny - M[1]) / M[3], q = ex * ex + ey * ey; if (q < 1.6) pat = min(pat, 0.5 + 0.5 * ss(0.6, 1.6, q)); }
        pat *= 0.9 + 0.1 * sin(nx * 23 + ny * 17) * sin(ny * 19 - nx * 7);
        const tx = nx + 0.12, ty = ny - 0.72, td = sqrt(tx * tx + ty * ty);
        if (td < 0.05) pat = 1.3; else pat = min(1.25, pat + 0.55 * pow(abs(sin(atan2(ty, tx) * 9 + 1.3 * sin(atan2(ty, tx) * 4))), 24) * exp(-td / 0.4));
        const cx = nx + 0.28, cy = ny + 0.12, cd = sqrt(cx * cx + cy * cy);
        pat = cd < 0.04 ? 1.2 : pat + 0.25 * exp(-cd / 0.08);
        PH = nx * 3 + ny * 2 + t * 0.1;
      } else if (kind === 1) {
        // Jupiter: cream zones, brown belts (NEB, SEB, temperate belts), darker poles, Great Red Spot south of the equator
        PAL = JUP; const lat = ny, lon = atan2(nx, z);
        PH = lon * 3 - t * 0.3 * (1 + 0.5 * sin(lat * 11));
        pat = 0.95 - 0.42 * g2(lat, -0.21, 0.08) - 0.45 * g2(lat, 0.25, 0.09) - 0.22 * g2(lat, -0.45, 0.05) - 0.2 * g2(lat, 0.5, 0.05) - 0.3 * ss(0.62, 0.95, abs(lat));
        pat *= 0.9 + 0.1 * sin(PH * 2 + lat * 40);
        const gx = (nx - 0.28) / 0.24, gy = (ny - 0.36) / 0.13, gq = gx * gx + gy * gy;
        if (gq < 1) { PAL = GRS; const sw = atan2(gy, gx) + t * 0.6 + 3 * sqrt(gq); PH = sw; pat = 0.6 + 0.35 * (1 - gq) + 0.08 * sin(sw * 3); }
        else if (gq < 1.5) pat = min(1, pat * 1.12);
      } else if (kind === 2) {
        // Saturn: pale butterscotch globe with soft bands
        PAL = SAT; const lat = ny * 0.94 - nx * 0.34, lon = atan2(nx * 0.94 + ny * 0.34, z); PH = lon - t * 0.2 * (1 + 0.2 * sin(lat * 5));
        pat = 0.9 + 0.07 * sin(lat * 16 + 0.4 * sin(2 * PH)) + 0.05 * sin(lat * 37) - 0.25 * ss(0.7, 1, abs(lat));
      } else if (kind === 3) {
        // Iapetus: slowly turning, so the dark leading hemisphere (Cassini Regio) and the bright icy side take turns facing us;
        // the equatorial ridge runs through the dark region; no atmosphere -> hard terminator
        lit = 0.03 + 0.97 * pow(diff, 0.65); rim = 0;
        const py = -ny, cl = sqrt(max(0, 1 - py * py)), lon = atan2(nx, z) + t * 0.18;
        const dk = cl * cos(lon) - (0.28 + 0.07 * sin(lon * 5 + py * 7) + 0.04 * sin(lon * 11 - py * 13));
        PH = lon * 3 + py * 2;
        if (dk > 0) {
          PAL = CASS; pat = 0.62 + 0.08 * sin(lon * 17 + py * 23);
          if (abs(py) < 0.035) pat = 0.95;
        } else {
          PAL = ICE; pat = 0.92 + 0.08 * sin(lon * 19 - py * 15);
          const cq = (lon % 6.283 + 6.283) % 6.283, ex = (cq - 3.6) * cl / 0.22, ey = (py - 0.35) / 0.22; if (ex * ex + ey * ey < 1) pat *= 0.8;
        }
      }
      h = min(1, lit * pat + rim);
    }
    if (kind === 2) {
      // real ring layout in planet radii: C 1.24-1.53 (faint), B 1.53-1.95 (brightest), Cassini division, A 2.03-2.27 with the Encke gap
      const xr = nx * 0.94 + ny * 0.34, yr = -nx * 0.34 + ny * 0.94, yy = yr / 0.45, rho = sqrt(xr * xr + yy * yy);
      if (rho > 1.24 && rho < 2.27 && !(r2 < 1 && yr < 0)) {
        const den = rho < 1.53 ? 0.32 : rho < 1.95 ? 0.95 : rho < 2.03 ? 0.04 : abs(rho - 2.215) < 0.012 ? 0.15 : 0.72;
        const u = log(rho), pr = atan2(yy, xr) - pow(rho / 1.24, -1.5) * t * 0.6;
        const rg = min(1, den * (0.82 + 0.12 * sin(60 * u) + 0.06 * sin(23 * u + 1.1)) * (0.9 + 0.1 * sin(2 * pr + 9 * u))) * ss(1.24, 1.28, rho) * (1 - ss(2.23, 2.27, rho));
        if (rg > h) { h = rg; PH = pr; PAL = SAT; }
      }
    }
    return h;
  };

  const render = () => {
    const t = frame / FPS, trail = opts().trail ?? 0.4;
    for (let i = 0; i < D.length; i += 4) { D[i] *= trail; D[i + 1] *= trail; D[i + 2] *= trail; }
    const ms = opts().mouse, mOn = !!ms && ms.a > 0.5;
    let spd = 0, mvx = 0, mvy = 0, mpx = 0, mpy = 0, RAD = 85;
    if (mOn) {
      mpx = ms.x * H + W / 2; mpy = (ms.y + 0.5) * H;
      if (pmx === pmx) { mvx = max(-50, min(50, mpx - pmx)); mvy = max(-50, min(50, mpy - pmy)); spd = min(50, sqrt(mvx * mvx + mvy * mvy)); }
      pmx = mpx; pmy = mpy;
      if (ms.a > 1.6) { spd = max(spd, 34); RAD = 160; }
    } else pmx = NaN;
    // a "burst" throws every glyph outwards; the spring below brings them back while the scene cross-dissolves
    const sy0 = opts().system;
    if (sy0 && sy0.burst !== lastBurst) {
      if (lastBurst !== undefined) { for (let i = 0; i < N; i++) { VX[i] += (HS[i] - 0.5) * 70; VY[i] += (HD[i] - 0.5) * 70; } live = true; }
      lastBurst = sy0.burst;
    }
    const push = spd > 0.6;
    if (push || live) {
      live = false;
      for (let i = 0, rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++, i++) {
        let ox = OFX[i], oy = OFY[i], vx = VX[i], vy = VY[i];
        if (push) {
          const ddx = OX + cc * CW + 3.5 + ox - mpx, ddy = OY + rr * CH + 5.5 + oy - mpy, d2 = ddx * ddx + ddy * ddy;
          if (d2 < RAD * RAD) {
            const d = sqrt(d2) || 1, f = 1 - d / RAD, k = f * f * spd;
            vx += ddx / d * k * 0.5 + mvx * f * 0.25 + (HS[i] - 0.5) * k * 0.6;
            vy += ddy / d * k * 0.5 + mvy * f * 0.25 + (HD[i] - 0.5) * k * 0.6;
          }
        }
        if (ox === 0 && oy === 0 && vx === 0 && vy === 0) continue;
        vx = (vx - ox * 0.03) * 0.9; vy = (vy - oy * 0.03) * 0.9; ox += vx; oy += vy;
        if (abs(ox) < 0.3 && abs(oy) < 0.3 && abs(vx) < 0.05 && abs(vy) < 0.05) ox = oy = vx = vy = 0; else live = true;
        OFX[i] = ox; OFY[i] = oy; VX[i] = vx; VY[i] = vy;
      }
    }
    const grow = min(1, t / 2.6), starIn = min(1, t / 0.6);
    // a small star system: star + corona (warm), dotted orbits, planets lit from the star (cool palette)
    const sy = opts().system || {}, cx0 = sy.x || 0, cy0 = sy.y || 0, SR = sy.sr || 0.08, CT = cos(sy.tilt || 0), ST = sin(sy.tilt || 0);
    const orbs = sy.orbits || [], bodies = sy.bodies || [], sel = sy.sel;
    const fk = sy.fk || 0, fi = sy.focus | 0, FR = sy.fr || 0.2, sAmp = 1 - ss(0, 0.55, fk), fAmp = ss(0.4, 1, fk);
    for (let i = 0; i < N; i++) {
      const x = X[i] - cx0, y = Y[i] - cy0, r = sqrt(x * x + y * y) || 1e-6;
      let h = 0, ph = 0, pal = WARM, dot = false;
      if (r < SR) {
        const z = sqrt(1 - r * r / (SR * SR));
        const gran = 0.62 + 0.22 * sin(9 * x / SR + 1.7 * t + 3 * sin(7 * y / SR - t)) + 0.16 * sin(13 * y / SR - 1.3 * t);
        h = min(1, (0.45 + 0.55 * z) * gran * 1.35); ph = atan2(y, x) + t * 0.25 + 6 * r / SR;
      } else if (r < SR * 2.6) {
        const th = atan2(y, x), wv = sin(5 * th + 0.6 * t) + sin(8 * th - 0.4 * t + 1.3) + sin(3 * th + 0.25 * t);
        h = 0.75 * exp(-(r - SR) / (SR * (0.32 + 0.07 * wv))); ph = th - t * 0.5 + 10 * r;
      }
      for (let k = 0; k < bodies.length; k++) {
        const bd = bodies[k], dx = X[i] - bd.x, dy = Y[i] - bd.y, d2 = dx * dx + dy * dy, br = bd.r;
        if (d2 > br * br * 12) continue;
        const lx = cx0 - bd.x, ly = cy0 - bd.y, ll = sqrt(lx * lx + ly * ly) || 1;
        const hb = shade(k, dx, dy, br, lx / ll * 0.89, ly / ll * 0.89, 0.45, t) * (k === sel ? 1.2 : 0.95);
        if (hb > 0.02) { h = min(1, hb); pal = PAL; ph = PH; }
        else if (k === sel) {
          const q = (sqrt(d2) - br * (k === 2 ? 2.4 : 1.6)) / (br * 0.28), hr = 0.5 * exp(-q * q) * (0.7 + 0.3 * sin(t * 3));
          if (hr > h) { h = hr; pal = COOL; ph = atan2(dy, dx) + t; }
        }
      }
      if (h < 0.07 && sAmp > HD[i]) {
        const xr = x * CT + y * ST, yr = -x * ST + y * CT;
        for (let k = 0; k < orbs.length; k++) {
          const o = orbs[k], ex = xr / o.rx, ey = yr / o.ry;
          if (abs(sqrt(ex * ex + ey * ey) - 1) * o.ry < 0.0042) { dot = true; break; }
        }
      }
      h *= ss(0, 1, min(grow, sAmp) * 1.6 - HD[i] * 0.6);
      if (fAmp > 0 && r < FR * 3.4) { // the focused project: one large planet assembling at the centre
        let hf = shade(fi, x, y, FR, -0.56, -0.48, 0.675, t), pf = PH, pp = PAL;
        if (fi !== 3 && fi !== 0 && hf <= 0 && r >= FR && r < FR + 0.1) { hf = 0.3 * exp(-(r - FR) / 0.02) * (0.35 + 0.65 * max(0, min(1, (x * -0.56 + y * -0.48) / r * 1.2 + 0.3))); pf = atan2(y, x) + t * 0.3; pp = BASE[fi]; }
        hf *= ss(0, 1, fAmp * 1.6 - HS[i] * 0.6);
        if (hf > h) { h = hf; pal = pp; ph = pf; dot = false; }
      }
      if (h >= 0.07) {
        const set = LVI[min(3, floor(h * 3.6))], n = set.length;
        const gi = set[(((HC[i] + floor(ph * 1.6)) % n) + n) % n];
        const c = pal[h < 0.12 ? 0 : h < 0.26 ? 1 : h < 0.5 ? 2 : h < 0.76 ? 3 : 4], L = min(1, 0.55 + 0.6 * h);
        paint(i, gi, c[0] * L, c[1] * L, c[2] * L);
      } else if (dot) paint(i, cmap['.'], 96 * starIn, 70 * starIn, 150 * starIn);
      else if (HS[i] < 0.003) {
        const L = (0.55 + 0.35 * sin(t * 2.2 + SP[i])) * starIn, k = HC[i] % 3;
        paint(i, cmap[k === 0 ? '.' : k === 1 ? '*' : '+'], 220 * L, 228 * L, 255 * L);
      }
    }
    octx.putImageData(img, 0, 0);
    compose();
  };

  const compose = () => {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    if (opts().glow ?? true) {
      ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
      hctx.globalCompositeOperation = 'copy';
      hctx.filter = hasFilter ? 'blur(2.5px)' : 'none'; hctx.drawImage(off, 0, 0, W / 2, H / 2);
      ctx.globalAlpha = 0.75; ctx.drawImage(half, 0, 0, W, H);
      if (hasFilter) { hctx.filter = 'blur(11px)'; hctx.drawImage(off, 0, 0, W / 2, H / 2); ctx.globalAlpha = 0.45; ctx.drawImage(half, 0, 0, W, H); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  };

  return {
    renderAt(f) {
      if (f === lastF) { compose(); return; }
      frame = f; render(); lastF = f;
    }
  };
}
