// Ringed planet drawn with the same per-cell "heat -> glyph + colour" technique as black-hole.js
export function createPlanetRenderer(cv, opts) {
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

  const RP = 0.19, TILT = 20 * Math.PI / 180, CA = cos(TILT), SA = sin(TILT), INC = 0.28, RIN = 1.3 * RP, ROUT = 1.9 * RP;
  const Lx = -0.56, Ly = -0.48, Lz = 0.675;
  const COL = [[70, 44, 120], [112, 80, 176], [160, 134, 214], [112, 196, 140], [206, 236, 214]];
  let frame = 0, lastF = -9;

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
    const pc = opts().centre || {}, pcx = pc.x || 0, pcy = pc.y || 0, pk = pc.k || 1;
    for (let i = 0; i < N; i++) {
      const x = (X[i] - pcx) / pk, y = (Y[i] - pcy) / pk, r = sqrt(x * x + y * y) || 1e-6;
      const xr = x * CA + y * SA, yr = -x * SA + y * CA, inP = r < RP;
      let body = 0, ring = 0, halo = 0, ph = 0;
      if (inP) {
        // lit sphere with banded atmosphere; bands drift at different speeds per latitude
        const z = sqrt(1 - r * r / (RP * RP)), diff = max(0, x / RP * Lx + y / RP * Ly + z * Lz);
        const lat = yr / RP, lon = atan2(xr / RP, z);
        ph = lon - t * 0.22 * (1 + 0.25 * sin(lat * 4));
        const bands = 0.55 + 0.3 * sin(lat * 13 + 0.7 * sin(2 * ph)) + 0.15 * sin(lat * 29 + 1.3);
        const v = 0.72 + 0.28 * sin(3 * ph + lat * 7);
        body = min(1, (0.06 + 0.94 * pow(diff, 0.8)) * min(1, bands * v * 1.5) + 0.25 * pow(1 - z, 3) * diff);
      } else if (r < RP + 0.12) {
        halo = 0.3 * exp(-(r - RP) / 0.022) * (0.35 + 0.65 * max(0, min(1, (x * Lx + y * Ly) / r * 1.2 + 0.3)));
      }
      const yy = yr / INC, rho = sqrt(xr * xr + yy * yy);
      if (rho > RIN && rho < ROUT && !(inP && yr < 0)) {
        const phi = atan2(yy, xr), u = log(rho / RP), pr = phi - pow(rho / RIN, -1.5) * t * 0.6;
        const b = 0.5 + 0.3 * sin(52 * u) + 0.2 * sin(21 * u + 1.1), vv = 0.75 + 0.25 * sin(2 * pr + 9 * u);
        const e = ss(RIN, RIN * 1.06, rho) * (1 - ss(ROUT * 0.94, ROUT, rho));
        ring = min(1, b * vv * 1.25) * e * (0.75 - 0.2 * cos(phi));
        if (inP && ring > 0.1) body *= 0.35;
        if (ring > body) ph = pr;
      }
      let h = 1 - (1 - body) * (1 - ring) * (1 - halo);
      h *= ss(0, 1, grow * 1.6 - HD[i] * 0.6);
      if (h >= 0.07) {
        const set = LVI[min(3, floor(h * 3.6))], n = set.length;
        const gi = set[(((HC[i] + floor(ph * 1.6)) % n) + n) % n];
        const c = COL[h < 0.12 ? 0 : h < 0.26 ? 1 : h < 0.5 ? 2 : h < 0.76 ? 3 : 4], L = min(1, 0.55 + 0.6 * h);
        paint(i, gi, c[0] * L, c[1] * L, c[2] * L);
      } else if (!inP && HS[i] < 0.003) {
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
