export function createBlackHoleRenderer(cv, opts) {
    const W = opts().width || 1080, H = 960, CW = 7, CH = 11, COLS = Math.floor((W - 2) / 7), ROWS = 87, OX = 1, OY = 1, N = COLS * ROWS;
    const FPS = 30, LOOP = 20, FRAMES = FPS * LOOP;
    const R0 = 0.11, RIN = 1.55 * R0, ROUT = 5.4 * R0, TF = 7.8, TAU = Math.PI * 2;
    const TILT = 17 * Math.PI / 180, CA = Math.cos(TILT), SA = Math.sin(TILT);
    const { sin, cos, exp, sqrt, atan2, log, pow, abs, floor, min, max } = Math;
    const ss = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    const hash = (i, s) => { const v = sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - floor(v); };

    // glyph atlas (alpha masks)
    const LV = ['1il!;:', 'rtfjcvxz=+', 'aeoun0{}[]<>', '08B$#&%Q'];
    const EXTRA = '/|\\-.*+,:';
    const chars = []; const cmap = {};
    for (const c of LV.join('') + EXTRA) if (!(c in cmap)) { cmap[c] = chars.length; chars.push(c); }
    const LVI = LV.map(s => Array.from(s, c => cmap[c]));
    const G = c => cmap[c];
    const ac = document.createElement('canvas'); ac.width = CW * chars.length; ac.height = CH;
    const ax = ac.getContext('2d', { willReadFrequently: true });
    ax.font = '12px Consolas, Menlo, monospace'; ax.textAlign = 'center'; ax.textBaseline = 'alphabetic'; ax.fillStyle = '#fff';
    chars.forEach((c, k) => ax.fillText(c, k * CW + CW / 2, 9));
    const aimg = ax.getImageData(0, 0, ac.width, CH).data;
    const CELLPX = CW * CH, atlas = new Uint8Array(chars.length * CELLPX);
    for (let k = 0; k < chars.length; k++) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++)
      atlas[k * CELLPX + y * CW + x] = aimg[(y * ac.width + k * CW + x) * 4 + 3];

    // per-cell constants
    const X = new Float32Array(N), Y = new Float32Array(N), HC = new Uint16Array(N), HS = new Float32Array(N), HD = new Float32Array(N), SP = new Float32Array(N);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      X[i] = ((c + 0.5) / COLS - 0.5) * (W / H); Y[i] = (r + 0.5) / ROWS - 0.5;
      HC[i] = floor(hash(i, 1) * 997); HS[i] = hash(i, 2); HD[i] = hash(i, 3); SP[i] = hash(i, 4) * TAU;
    }

    // name mask: big text rasterised to one coverage value per cell
    const TM = new Float32Array(N);
    (() => {
      const names = opts().names || []; if (!names.length) return;
      const mc = document.createElement('canvas'); mc.width = COLS * 2; mc.height = ROWS * 2;
      const mx = mc.getContext('2d'); mx.scale(2 / CW, 2 / CH);
      mx.fillStyle = '#fff'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
      const font = fs => '900 ' + fs + 'px "Arial Black", "Helvetica Neue", Arial, sans-serif';
      for (const n of names) {
        let fs = n.size * H; mx.font = font(fs);
        const tw = mx.measureText(n.text).width, maxW = COLS * CW * 0.88;
        if (tw > maxW) { fs *= maxW / tw; mx.font = font(fs); }
        mx.fillText(n.text, COLS * CW / 2, (0.5 + n.y) * ROWS * CH);
      }
      const sc = document.createElement('canvas'); sc.width = COLS; sc.height = ROWS;
      const sx = sc.getContext('2d', { willReadFrequently: true }); sx.drawImage(mc, 0, 0, COLS, ROWS);
      const md = sx.getImageData(0, 0, COLS, ROWS).data;
      for (let i = 0; i < N; i++) TM[i] = md[i * 4 + 3] / 255;
    })();

    // per-cell displacement: the pointer splashes glyphs away, a damped spring brings them home
    const OFX = new Float32Array(N), OFY = new Float32Array(N), VX = new Float32Array(N), VY = new Float32Array(N);
    let pmx = NaN, pmy = NaN, live = false;

    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    const img = octx.createImageData(W, H), D = img.data;
    for (let i = 3; i < D.length; i += 4) D[i] = 255;
    const half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
    const hctx = half.getContext('2d');
    const tiny = document.createElement('canvas'); tiny.width = W / 12; tiny.height = H / 12;
    const tctx = tiny.getContext('2d');
    const ctx = cv.getContext('2d');
    const hasFilter = typeof ctx.filter === 'string';

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
    const gas = (rho, ph) => {
      const u = log(rho / R0);
      const b = 0.5 + 0.28 * sin(46 * u) + 0.14 * sin(19.3 * u + 1.1) + 0.08 * sin(87 * u + 2.3);
      const v = 0.6 + 0.28 * sin(2 * ph + 11 * u) + 0.12 * sin(5 * ph - 7 * u + 0.6);
      const g = b * v * 1.8; return g > 1 ? 1 : g;
    };
    const W0 = 0.5, W1 = 2.0;
    const giro = t => { const dt = max(0, t - TF), x = min(1, dt / 3); return W0 * t + (W1 - W0) * (3 * (x * x * x - x * x * x * x / 2) + max(0, dt - 3)); };
    const SPK = [[1.8, 2.3, 0.4], [2.4, 1.5, 2.6], [3.2, 0.98, 4.7]];

    let frame = 0, paused = false, hud = { spin: 0, heat: 0, n: 0 };
    const clearTrail = () => { for (let i = 0; i < D.length; i += 4) D[i] = D[i + 1] = D[i + 2] = 0; };

    const render = () => {
      const t = frame / FPS, trail = opts().trail ?? 0.4;
      for (let i = 0; i < D.length; i += 4) { D[i] *= trail; D[i + 1] *= trail; D[i + 2] *= trail; }
      const dt = t - TF, cam = dt > 0 ? ss(0, 2.6, dt) : 0, zoom = 1 + 0.28 * cam, INC = 0.12 + 0.09 * cam;
      const pRing = ss(0.3, 2.5, t) * TAU, gHalo = ss(2.2, 4, t), open = ss(5, 7.8, t), lensOpen = ss(5, 6.6, t);
      const dustAmp = ss(4, 5.5, t), sparkAmp = ss(TF, TF + 0.8, t), fade = 1, starIn = min(1, t / 0.6);
      const nameIn = ss(8.6, 11.2, t);
      const flash = exp(-(dt * dt) / (2 * 0.1 * 0.1));
      const shAmp = dt > 0 && dt < 0.55 ? (1 - dt / 0.55) * (1 - dt / 0.55) : 0, shR = R0 + 0.55 * dt;
      const Gs = giro(t), routT = RIN * 1.15 + (ROUT - RIN * 1.15) * open, discIn = min(1, open * 5);
      const ringAmp = 1 - 0.65 * open, breathe = 0.75 + 0.2 * sin(t * 1.3);
      const sth = SPK.map(s => s[2] + s[1] * max(0, dt));
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
      let count = 0, hsum = 0, hn = 0;
      // view.scale (opcional) encoge la escena para pantallas estrechas
      const Z = zoom * ((opts().view || {}).scale || 1);
      for (let i = 0; i < N; i++) {
        const px = X[i], py = Y[i], mh = 0;
        const x = px / Z, y = py / Z, r = sqrt(x * x + y * y) || 1e-6;
        const xr = x * CA + y * SA, yr = -x * SA + y * CA, shadow = r < 0.97 * R0;
        let ring = 0, halo = 0, disc = 0, lens = 0, sp = 0, shock = 0, phD = 0, phL = 0, isRing = false;
        if (pRing > 0) {
          const dr = abs(r - 1.02 * R0), thr = 0.52 * (abs(x) * CW + abs(y) * CH) / (r * H * Z);
          if (dr < thr) { let a = atan2(x, -y); if (a < 0) a += TAU; if (a <= pRing) { ring = (0.95 - 0.3 * dr / thr) * ringAmp; isRing = true; } }
        }
        if (!shadow) {
          if (gHalo > 0 && r < R0 * 4) {
            const th = atan2(y, x), wv = sin(3 * th + 0.7 * t) + sin(5 * th - 0.5 * t + 1.3) + sin(2 * th + 0.31 * t + 18 * r);
            halo = 0.42 * gHalo * (1 - 0.7 * open) * exp(-max(0, r - R0) / (R0 * breathe * (1 + 0.18 * wv) * (0.4 + 0.6 * gHalo)));
          }
          if (lensOpen > 0 && r < R0 * 1.75) {
            const up = max(0, -yr / r), dn = max(0, yr / r);
            const env = ss(0.97 * R0, 1.04 * R0, r) * (1 - ss(R0 * 1.08, R0 * (1.22 + 0.45 * up - 0.08 * dn), r));
            if (env > 0) {
              const pl = atan2(yr, xr); phL = pl - pow(r / RIN, -1.5) * Gs;
              lens = lensOpen * env * (0.4 + 0.6 * up - 0.15 * dn) * (0.3 + 0.9 * gas(r, phL));
              if (sparkAmp > 0 && up > 0) for (let k = 0; k < 3; k++) {
                const q = (r - R0 * (1.1 + 0.12 * k)) / (0.05 * R0), rad = exp(-q * q); if (rad < 0.01) continue;
                let d = (sth[k] - pl) % TAU; if (d < 0) d += TAU; const dd = min(d, TAU - d);
                sp = 1 - (1 - sp) * (1 - min(1, sparkAmp * sqrt(up) * rad * (exp(-dd * dd / 0.012) + 0.6 * exp(-d / 1.1))));
              }
            }
          }
          if (shAmp > 0) { const q = (r - shR) / 0.014; shock = 0.85 * shAmp * exp(-q * q); }
        }
        if (open > 0 && !(shadow && yr < 0)) {
          const yy = yr / INC, rho = sqrt(xr * xr + yy * yy);
          if (rho > RIN * 0.85 && rho < routT) {
            const phi = atan2(yy, xr); phD = phi - pow(rho / RIN, -1.5) * Gs;
            const e = ss(RIN * 0.9, RIN * 1.1, rho) * (1 - ss(routT * 0.78, routT, rho));
            disc = min(1, 1.5 * gas(rho, phD) * RIN / rho * e * (1 - 0.22 * cos(phi))) * discIn;
            if (sparkAmp > 0) for (let k = 0; k < 3; k++) {
              const q = (rho - SPK[k][0] * R0) / (0.2 * R0), rad = exp(-q * q); if (rad < 0.01) continue;
              let d = (sth[k] - phi) % TAU; if (d < 0) d += TAU; const dd = min(d, TAU - d);
              sp = 1 - (1 - sp) * (1 - min(1, sparkAmp * e * rad * (exp(-dd * dd / 0.01) + 0.6 * exp(-d / 1.1))));
            }
          }
        }
        let h = 1 - (1 - ring) * (1 - halo) * (1 - disc) * (1 - lens) * (1 - sp) * (1 - shock) * (1 - mh);
        let ht = 0; const tm = TM[i];
        if (tm > 0.02 && nameIn > 0) {
          const gx = X[i], gy = Y[i], gg = 0.62 + 0.25 * sin(38 * gx - 1.4 * t + 6 * gy) + 0.13 * sin(17 * gx + 2.1 * t + 40 * gy);
          ht = min(1, tm * 1.15 * gg) * ss(0, 1, nameIn * 1.6 - HD[i] * 0.6);
          h = 1 - (1 - h) * (1 - ht);
        }
        h *= 1 + 1.8 * flash; if (!shadow) h += flash * 0.14 * exp(-r * 3.5);
        h *= fade; if (h > 1) h = 1;
        if (h >= 0.07) {
          let gi;
          if (isRing && ring >= halo && ring >= disc && ring >= lens && ring >= sp) {
            let o = (atan2(y, x) + Math.PI / 2) % Math.PI; if (o < 0) o += Math.PI;
            const s = floor(o / (Math.PI / 4) + 0.5) % 4; gi = G(s === 0 ? '-' : s === 1 ? '\\' : s === 2 ? '|' : '/');
          } else {
            const set = LVI[min(3, floor(h * 3.6))], n = set.length;
            const pc = disc >= lens && disc >= halo ? phD : lens >= halo ? phL : ht > 0 ? t * 2.2 + X[i] * 14 : t * 0.9;
            gi = set[(((HC[i] + floor(pc * 1.6)) % n) + n) % n];
          }
          const L = min(1, 0.55 + 0.6 * h);
          if (h < 0.1) paint(i, gi, 190 * L, 38 * L, 12 * L);
          else if (h < 0.2) paint(i, gi, 242 * L, 78 * L, 20 * L);
          else if (h < 0.45) paint(i, gi, 255 * L, 124 * L, 34 * L);
          else if (h < 0.75) paint(i, gi, 255 * L, 172 * L, 78 * L);
          else paint(i, gi, 255 * L, 222 * L, 168 * L);
          count++; hsum += h; hn++;
        } else if (!shadow) {
          if (HS[i] < 0.0025) {
            const L = (0.55 + 0.35 * sin(t * 2.2 + SP[i])) * starIn * fade, k = HC[i] % 3;
            paint(i, G(k === 0 ? '.' : k === 1 ? '*' : '+'), 220 * L, 228 * L, 255 * L); count++;
          } else if (dustAmp > 0 && r > R0 * 1.05) {
            const q = yr / 0.045, pr = 0.09 * dustAmp * exp(-q * q) * (1 - ss(0.45, 0.8, abs(xr)));
            if (HD[i] < pr) { const L = 0.85 * fade; paint(i, G(HC[i] & 1 ? ',' : ':'), 130 * L, 72 * L, 48 * L); count++; }
          }
        }
      }
      hud = { spin: t < 0.3 ? 0 : W0 + (W1 - W0) * (dt > 0 ? ss(0, 3, dt) : 0), heat: hn ? hsum / hn : 0, n: count };
      octx.putImageData(img, 0, 0);
      compose(t);
    };

    const compose = t => {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
      ctx.drawImage(off, 0, 0);
      if (opts().glow ?? true) {
        ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
        if (hasFilter) {
          hctx.globalCompositeOperation = 'copy';
          hctx.filter = 'blur(2.5px)'; hctx.drawImage(off, 0, 0, W / 2, H / 2);
          ctx.globalAlpha = 0.75; ctx.drawImage(half, 0, 0, W, H);
          hctx.filter = 'blur(11px)'; hctx.drawImage(off, 0, 0, W / 2, H / 2);
          ctx.globalAlpha = 0.45; ctx.drawImage(half, 0, 0, W, H);
        } else {
          hctx.globalCompositeOperation = 'copy'; hctx.drawImage(off, 0, 0, W / 2, H / 2);
          ctx.globalAlpha = 0.75; ctx.drawImage(half, 0, 0, W, H);
          tctx.globalCompositeOperation = 'copy'; tctx.drawImage(half, 0, 0, tiny.width, tiny.height);
          ctx.globalAlpha = 0.45; ctx.drawImage(tiny, 0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      if (opts().showHud ?? true) {
        ctx.font = '17px Consolas, Menlo, monospace'; ctx.textBaseline = 'alphabetic';
        // view.compactHud: en pantallas estrechas sólo el contador de arriba (abajo choca con "scroll")
        if (!(opts().view || {}).compactHud) {
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgb(110,104,120)';
          ctx.fillText('K4zzu · ' + new Date().toTimeString().slice(0, 8), 24, H - 68);
          ctx.fillText('spin ' + hud.spin.toFixed(2) + '   heat ' + hud.heat.toFixed(2), 24, H - 46);
          ctx.fillText('letters ' + String(hud.n).padStart(5, '0'), 24, H - 24);
        }
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgb(255,122,182)';
        const label = 't ' + t.toFixed(2).padStart(5, '0') + 's';
        ctx.fillText(label, W - 24, 38);
        if ((t * 2) % 1 < 0.5) ctx.fillText('●', W - 34 - ctx.measureText(label).width, 38);
      }
    };

    let lastF = -9;
    return {
      renderAt(f) {
        if (f === lastF) { compose(f / FPS); return; }
        if (f !== lastF + 1) { clearTrail(); for (let k = Math.max(0, f - 2); k < f; k++) { frame = k; render(); } }
        frame = f; render(); lastF = f;
      },
      save() {
        cv.toBlob(b => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(b);
          a.download = 'black-hole-' + (frame / FPS).toFixed(2) + 's.png'; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
      }
    };
}
