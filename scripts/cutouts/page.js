// Tovar rasmini fonidan ajratib oladigan kod. Ko'rinmas Chrome sahifasi ichida ishlaydi (scripts/cutouts.js yuklaydi),
// tashqi dastur yoki xizmat ishlatilmaydi. Ikki usul bor:
//   CUT.white(src, opts)   — oq (bir tekis) fonli rasm: chetdan boshlab fon rangidagi piksellar "to'ldiriladi", tovar
//                            ichidagi oq joylar saqlanadi, chekkadagi aralash piksellardan fon rangi ayiriladi;
//   CUT.outline(src, opts) — fon murakkab bo'lsa (plakat, soya): qo'lda chizilgan kontur bo'yicha. Kontur nuqtalari
//                            taxminiy bo'lishi mumkin — dastur ularni haqiqiy chekkaga tortadi (pastga qarang).
// Natija sahifada saqlanadi; CUT.webp(tomon, sifat) uni saytga tayyor WebP qilib beradi.
// Sozlamalar (opts) ta'rifi: scripts/cutouts/specs.js boshida.
(() => {
  const INF = 1e20;

  // Har bir piksel uchun mask[i] != 0 bo'lgan eng yaqin pikselgacha kvadrat masofa (Felzenszwalb–Huttenlocher)
  function edt(mask, W, H) {
    const n = Math.max(W, H);
    const f = new Float64Array(n);
    const d = new Float64Array(n);
    const z = new Float64Array(n + 1);
    const v = new Int32Array(n);
    const g = new Float64Array(W * H);
    const out = new Float32Array(W * H);
    const pass = (len) => {
      let k = 0;
      v[0] = 0;
      z[0] = -INF;
      z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
          k--;
          s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < len; q++) {
        while (z[k + 1] < q) k++;
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
      }
    };
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) f[y] = mask[y * W + x] ? 0 : INF;
      pass(H);
      for (let y = 0; y < H; y++) g[y * W + x] = d[y];
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) f[x] = g[y * W + x];
      pass(W);
      for (let x = 0; x < W; x++) out[y * W + x] = d[x];
    }
    return out;
  }

  const dilate = (mask, W, H, r) => {
    const dist = edt(mask, W, H);
    const out = new Uint8Array(W * H);
    const rr = r * r + 1e-6;
    for (let i = 0; i < out.length; i++) out[i] = dist[i] <= rr ? 1 : 0;
    return out;
  };
  const invert = (mask) => {
    const out = new Uint8Array(mask.length);
    for (let i = 0; i < out.length; i++) out[i] = mask[i] ? 0 : 1;
    return out;
  };
  const erode = (mask, W, H, r) => invert(dilate(invert(mask), W, H, r));

  function polyMask(polys, W, H, map) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    for (const poly of polys) {
      ctx.beginPath();
      poly.forEach(([x, y], i) => {
        const [px, py] = map(x, y);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
    const data = ctx.getImageData(0, 0, W, H).data;
    const out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 127 ? 1 : 0;
    return out;
  }

  // 4 qo'shnili to'ldirish: start piksellaridan pass[i] != 0 bo'lgan piksellar bo'ylab, ixtiyoriy chuqurlik chegarasi bilan
  function flood(starts, pass, W, H, into, maxDepth = Infinity) {
    let frontier = starts;
    let depth = 0;
    let added = 0;
    while (frontier.length && depth < maxDepth) {
      const next = [];
      for (let n = 0; n < frontier.length; n++) {
        const i = frontier[n];
        const x = i % W;
        if (x > 0 && pass[i - 1] && !into[i - 1]) { into[i - 1] = 1; next.push(i - 1); }
        if (x < W - 1 && pass[i + 1] && !into[i + 1]) { into[i + 1] = 1; next.push(i + 1); }
        if (i >= W && pass[i - W] && !into[i - W]) { into[i - W] = 1; next.push(i - W); }
        if (i < W * (H - 1) && pass[i + W] && !into[i + W]) { into[i + W] = 1; next.push(i + W); }
      }
      added += next.length;
      frontier = next;
      depth++;
    }
    return added;
  }

  // Bog'langan bo'laklar (8 qo'shnili): [{ area, bbox:[x0,y0,x1,y1], pixels?:Int32Array }]
  function components(mask, W, H, keepPixels = true) {
    const seen = new Uint8Array(W * H);
    const list = [];
    const stack = new Int32Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (!mask[start] || seen[start]) continue;
      let top = 0;
      stack[top++] = start;
      seen[start] = 1;
      const pixels = [];
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      while (top) {
        const i = stack[--top];
        pixels.push(i);
        const x = i % W;
        const y = (i - x) / W;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W) continue;
            const j = yy * W + xx;
            if (mask[j] && !seen[j]) {
              seen[j] = 1;
              stack[top++] = j;
            }
          }
        }
      }
      list.push({ area: pixels.length, bbox: [x0, y0, x1, y1], pixels: keepPixels ? pixels : null });
    }
    return list;
  }

  const toBase64 = async (canvas, type, quality) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };

  async function cut(src, o = {}) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const [sx, sy, sw, sh] = o.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const scale = o.scale || 1;
    const pad = o.pad ?? 10;
    const iw = Math.round(sw * scale);
    const ih = Math.round(sh * scale);
    const W = iw + pad * 2;
    const H = ih + pad * 2;
    const N = W * H;
    const map = (x, y) => [(x - sx) * scale + pad, (y - sy) * scale + pad];

    // 1. Manba
    const first = document.createElement('canvas');
    first.width = iw;
    first.height = ih;
    const fctx = first.getContext('2d', { willReadFrequently: true });
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(img, sx, sy, sw, sh, 0, 0, iw, ih);
    const raw = fctx.getImageData(0, 0, iw, ih).data;

    // Shaffof manba (tayyor PNG): faqat tozalab, qirqib beriladi
    let transparent = 0;
    for (let i = 3; i < raw.length; i += 4) if (raw[i] < 250) transparent++;
    const alphaMode = o.mode === 'alpha' || (o.mode !== 'white' && transparent > raw.length / 4 * 0.02);

    // 2. Fon rangi: chet piksellarning medianasi
    let bg = o.bg;
    if (!bg && !alphaMode) {
      const rs = [], gs = [], bs = [];
      const take = (x, y) => {
        const i = (y * iw + x) * 4;
        rs.push(raw[i]);
        gs.push(raw[i + 1]);
        bs.push(raw[i + 2]);
      };
      for (let x = 0; x < iw; x += 2) { take(x, 0); take(x, 1); take(x, ih - 1); take(x, ih - 2); }
      for (let y = 0; y < ih; y += 2) { take(0, y); take(1, y); take(iw - 1, y); take(iw - 2, y); }
      const median = (a) => a.sort((p, q) => p - q)[a.length >> 1];
      bg = [median(rs), median(gs), median(bs)];
    }
    if (alphaMode) bg = [255, 255, 255];

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!alphaMode) {
      ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.drawImage(first, pad, pad);
    const image = ctx.getImageData(0, 0, W, H);
    const px = image.data;
    const stats = { source: [img.naturalWidth, img.naturalHeight], bg, mode: alphaMode ? 'alpha' : 'white' };
    // Tovar ustiga tushib qolgan begona chizma (masalan, kattalashtirish belgisi) yo'nalish bo'ylab to'ldiriladi
    for (const patch of o.patches || []) {
      const mask = polyMask([patch.poly], W, H, map);
      stats.patched = (stats.patched || 0) + patchDirectional(px, W, H, mask, patch.dir, bg, patch.margin ?? 2);
    }

    const outside = new Uint8Array(N);
    const T = o.T ?? 12;
    if (alphaMode) {
      const cutA = o.alphaMin ?? 6;
      for (let i = 0; i < N; i++) outside[i] = px[i * 4 + 3] <= cutA ? 1 : 0;
    } else {
      // 3. Fonga o'xshash piksellar
      const cand = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const p = i * 4;
        const dr = Math.abs(px[p] - bg[0]);
        const dg = Math.abs(px[p + 1] - bg[1]);
        const db = Math.abs(px[p + 2] - bg[2]);
        cand[i] = Math.max(dr, dg, db) <= T ? 1 : 0;
      }
      if (o.keep?.length) {
        const keep = polyMask(o.keep, W, H, map);
        for (let i = 0; i < N; i++) if (keep[i]) cand[i] = 0;
      }
      // 4. To'siqni yopish (tor yoriqlar berkiladi), keyin chetdan to'ldirish
      const r = o.close ?? 2;
      let open = cand;
      if (r > 0) {
        const barrier = invert(cand);
        const closed = erode(dilate(barrier, W, H, r), W, H, r);
        open = invert(closed);
      }
      const starts = [];
      for (let x = 0; x < W; x++) {
        for (const i of [x, (H - 1) * W + x]) if (open[i] && !outside[i]) { outside[i] = 1; starts.push(i); }
      }
      for (let y = 0; y < H; y++) {
        for (const i of [y * W, y * W + W - 1]) if (open[i] && !outside[i]) { outside[i] = 1; starts.push(i); }
      }
      flood(starts, open, W, H, outside);
      // 5. Yopish paytida "yutilgan" chekka fonni qaytarish: tashqaridan boshlab cheklangan chuqurlikda
      if (r > 0) {
        const edge = [];
        for (let i = 0; i < N; i++) if (outside[i]) edge.push(i);
        flood(edge, cand, W, H, outside, o.reopen ?? r + 2);
      }
      // 6. Tovar ichida qolgan toza fon orollari
      const island = new Uint8Array(N);
      for (let i = 0; i < N; i++) island[i] = cand[i] && !outside[i] ? 1 : 0;
      const islands = components(island, W, H).sort((a, b) => b.area - a.area);
      stats.islands = islands.slice(0, 10).map((c) => ({ area: c.area, at: [Math.round((c.bbox[0] + c.bbox[2]) / 2 / scale - pad / scale + sx), Math.round((c.bbox[1] + c.bbox[3]) / 2 / scale - pad / scale + sy)] }));
      if (o.holes === 'auto') {
        const min = o.holeMin ?? 120;
        let removed = 0;
        for (const c of islands) {
          if (c.area < min) continue;
          for (const i of c.pixels) outside[i] = 1;
          removed++;
        }
        stats.holesRemoved = removed;
      } else if (Array.isArray(o.holes)) {
        const seeds = [];
        for (const [x, y] of o.holes) {
          const [mx, my] = map(x, y);
          const i = Math.round(my) * W + Math.round(mx);
          if (cand[i] && !outside[i]) { outside[i] = 1; seeds.push(i); }
        }
        stats.holesRemoved = flood(seeds, cand, W, H, outside) + seeds.length;
      }
      if (o.drop?.length) {
        const drop = polyMask(o.drop, W, H, map);
        for (let i = 0; i < N; i++) if (drop[i]) outside[i] = 1;
      }
    }

    // 7. Mayda bo'laklarni (chang, shovqin, yozuv qoldig'i) olib tashlash
    let fg = invert(outside);
    const parts = components(fg, W, H).sort((a, b) => b.area - a.area);
    const minArea = o.minArea ?? Math.max(60, Math.round(parts[0]?.area * 0.004 || 0));
    let removedParts = 0;
    let removedArea = 0;
    parts.forEach((part, index) => {
      const drop = part.area < minArea || (o.keepLargest && index >= o.keepLargest);
      if (!drop) return;
      for (const i of part.pixels) { fg[i] = 0; outside[i] = 1; }
      removedParts++;
      removedArea += part.area;
    });
    stats.parts = parts.length - removedParts;
    stats.removedParts = removedParts;
    stats.removedArea = removedArea;
    if (o.erode) {
      fg = erode(fg, W, H, o.erode);
      for (let i = 0; i < N; i++) outside[i] = fg[i] ? 0 : 1;
    }

    // Dumaloq buyumlar (glayd nuqtalari): har bir bo'lak aniq doira bilan almashtiriladi — cheti silliq chiqadi
    let circleMap = null;
    let circles = null;
    if (o.circles) {
      circles = components(fg, W, H).map((part) => {
        let sumX = 0;
        let sumY = 0;
        for (const i of part.pixels) { sumX += i % W; sumY += (i - (i % W)) / W; }
        return { cx: sumX / part.area, cy: sumY / part.area, r: Math.sqrt(part.area / Math.PI) - (o.circleInset ?? 1.5) };
      });
      if (o.circles === 'same') {
        const radii = circles.map((c) => c.r).sort((a, b) => a - b);
        const rm = radii[radii.length >> 1];
        for (const c of circles) c.r = rm;
      }
      circleMap = new Int32Array(N).fill(-1);
      fg.fill(0);
      circles.forEach((c, k) => {
        for (let y = Math.floor(c.cy - c.r - 2); y <= Math.ceil(c.cy + c.r + 2); y++) {
          for (let x = Math.floor(c.cx - c.r - 2); x <= Math.ceil(c.cx + c.r + 2); x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            if (Math.hypot(x - c.cx, y - c.cy) <= c.r + 1) { fg[y * W + x] = 1; circleMap[y * W + x] = k; }
          }
        }
      });
      for (let i = 0; i < N; i++) outside[i] = fg[i] ? 0 : 1;
      stats.circles = circles.length;
      stats.radius = Math.round(circles[0].r * 10) / 10;
    }

    // 8. Chekka: aralash piksellardan fon rangini ayirish
    const dist = edt(outside, W, H); // tovar pikselidan eng yaqin tashqi pikselgacha (kvadrat)
    const B = o.band ?? 3;
    const minContrast = o.minContrast ?? 46;
    const out = new Uint8ClampedArray(N * 4);
    let softened = 0;
    for (let i = 0; i < N; i++) {
      const p = i * 4;
      if (!fg[i]) continue;
      if (circleMap) {
        const c = circles[circleMap[i]];
        const x = i % W;
        const y = (i - x) / W;
        const d = Math.hypot(x - c.cx, y - c.cy);
        const a = Math.max(0, Math.min(1, c.r - d + 0.5));
        if (a <= 0.02) continue;
        const k = d > c.r - 2.5 ? (c.r - 2.5) / d : 1;
        const q = (Math.round(c.cy + (y - c.cy) * k) * W + Math.round(c.cx + (x - c.cx) * k)) * 4;
        out[p] = px[q]; out[p + 1] = px[q + 1]; out[p + 2] = px[q + 2];
        out[p + 3] = Math.round(255 * a);
        continue;
      }
      const srcA = alphaMode ? px[p + 3] / 255 : 1;
      const dd = Math.sqrt(dist[i]);
      if (dd > B || alphaMode) {
        out[p] = px[p]; out[p + 1] = px[p + 1]; out[p + 2] = px[p + 2];
        out[p + 3] = Math.round(255 * srcA);
        continue;
      }
      // Yaqin atrofdagi eng "ichkari" piksel — tovarning haqiqiy rangi deb olinadi
      const x = i % W;
      const y = (i - x) / W;
      let best = -1;
      let bestD = dist[i];
      const R = Math.ceil(B) + 1;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (fg[j] && dist[j] > bestD) { bestD = dist[j]; best = j; }
        }
      }
      const geo = Math.max(0, Math.min(1, dd - 0.5));
      let a = geo;
      let r0 = px[p], g0 = px[p + 1], b0 = px[p + 2];
      if (best >= 0) {
        const q = best * 4;
        const fr = px[q], fgc = px[q + 1], fb = px[q + 2];
        const vr = fr - bg[0], vg = fgc - bg[1], vb = fb - bg[2];
        const vv = vr * vr + vg * vg + vb * vb;
        if (vv >= minContrast * minContrast) {
          a = ((r0 - bg[0]) * vr + (g0 - bg[1]) * vg + (b0 - bg[2]) * vb) / vv;
          a = Math.max(0, Math.min(1, a));
          if (a < 0.985) {
            const k = Math.max(a, 0.06);
            const ur = bg[0] + (r0 - bg[0]) / k;
            const ug = bg[1] + (g0 - bg[1]) / k;
            const ub = bg[2] + (b0 - bg[2]) / k;
            const t = Math.max(0, Math.min(1, (a - 0.3) / 0.5));
            const m = t * t * (3 - 2 * t);
            r0 = fr + (ur - fr) * m;
            g0 = fgc + (ug - fgc) * m;
            b0 = fb + (ub - fb) * m;
            softened++;
          }
        }
      }
      if (a < 0.04) continue;
      out[p] = r0; out[p + 1] = g0; out[p + 2] = b0;
      out[p + 3] = Math.round(255 * a);
    }
    stats.softened = softened;

    // 9. Chegaralar bo'yicha qirqish
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (out[(y * W + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) throw new Error('hech narsa qolmadi');
    const m = 2;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const cw = x1 - x0 + 1;
    const chh = y1 - y0 + 1;
    const result = document.createElement('canvas');
    result.width = cw;
    result.height = chh;
    const full = new ImageData(out, W, H);
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    tmp.getContext('2d').putImageData(full, 0, 0);
    result.getContext('2d').drawImage(tmp, x0, y0, cw, chh, 0, 0, cw, chh);
    stats.size = [cw, chh];
    stats.touches = { left: x0 <= pad + 1 && !alphaMode, top: y0 <= pad + 1 && !alphaMode, right: x1 >= W - pad - 2 && !alphaMode, bottom: y1 >= H - pad - 2 && !alphaMode };
    let opaque = 0;
    for (let i = 3; i < out.length; i += 4) if (out[i] > 8) opaque++;
    stats.coverage = Math.round((opaque / (cw * chh)) * 100) / 100;

    // Ko'rib chiqish uchun: saytdagi to'q kartochka foni ustida
    const maxSide = o.previewSize || 900;
    const ps = Math.min(1, maxSide / Math.max(cw, chh));
    const preview = document.createElement('canvas');
    preview.width = Math.round(cw * ps) + 60;
    preview.height = Math.round(chh * ps) + 60;
    const pctx = preview.getContext('2d');
    pctx.fillStyle = o.previewBg || '#121216';
    pctx.fillRect(0, 0, preview.width, preview.height);
    pctx.imageSmoothingQuality = 'high';
    pctx.drawImage(result, 30, 30, Math.round(cw * ps), Math.round(chh * ps));

    window.__cutResult = result;
    return JSON.stringify({ stats, preview: o.debug ? await toBase64(preview, 'image/jpeg', 0.92) : null });
  }

  // Niqob ichidagi har bir pikselni berilgan yo'nalish bo'ylab ikki chetdagi (niqobdan tashqaridagi) ranglar orasida
  // chiziqli to'ldiradi. Parallel chiziqli yuzalarda (yaltiroq chet, soya) iz qoldirmaydi.
  function patchDirectional(px, W, H, mask, dir, bg, margin) {
    const src = new Uint8ClampedArray(px);
    const len = Math.hypot(dir[0], dir[1]) || 1;
    const dx = dir[0] / len;
    const dy = dir[1] / len;
    const isBg = (j) => bg && Math.max(Math.abs(src[j * 4] - bg[0]), Math.abs(src[j * 4 + 1] - bg[1]), Math.abs(src[j * 4 + 2] - bg[2])) <= 14;
    const march = (x0, y0, sign) => {
      for (let t = 1; t < 600; t++) {
        const x = Math.round(x0 + dx * t * sign);
        const y = Math.round(y0 + dy * t * sign);
        if (x < 0 || y < 0 || x >= W || y >= H) return null;
        const j = y * W + x;
        if (mask[j]) continue;
        const xm = Math.round(x0 + dx * (t + margin) * sign);
        const ym = Math.round(y0 + dy * (t + margin) * sign);
        const jm = xm >= 0 && ym >= 0 && xm < W && ym < H && !mask[ym * W + xm] ? ym * W + xm : j;
        return isBg(jm) ? null : { j: jm, d: t };
      }
      return null;
    };
    let count = 0;
    for (let i = 0; i < W * H; i++) {
      if (!mask[i]) continue;
      const x = i % W;
      const y = (i - x) / W;
      const a = march(x, y, 1);
      const b = march(x, y, -1);
      if (!a && !b) continue;
      const p = i * 4;
      for (let c = 0; c < 3; c++) {
        if (a && b) px[p + c] = (src[a.j * 4 + c] * b.d + src[b.j * 4 + c] * a.d) / (a.d + b.d);
        else px[p + c] = src[(a || b).j * 4 + c];
      }
      count++;
    }
    return count;
  }

  // ---- Qo'lda chizilgan kontur bo'yicha kesish ----
  // Yopiq silliq egri (Catmull–Rom). Nuqta: [x, y] yoki [x, y, 1] (1 — aniq qo'yilgan, tortilmaydi), [x, y, 'c'] — o'tkir burchak.
  function densify(points, step) {
    const n = points.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p0 = p1[2] === 'c' ? p1 : points[(i - 1 + n) % n];
      const p3 = p2[2] === 'c' ? p2 : points[(i + 2) % n];
      const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.max(1, Math.round(length / step));
      const isFixed = (p) => p[2] === 1 || p[2] === 'c';
      const fixed = isFixed(p1) && isFixed(p2);
      const rise = p1[2] === 'r' ? 1 : p1[2] === 'f' ? -1 : 0;
      const mode = p1[2] === 'g' || p1[2] === 'd' ? p1[2] : null;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), fixed, rise, mode, seg: i, frac: t, label: s === 0 ? i : -1, shift: (p1[3] || 0) * (1 - t) + (p2[3] || 0) * t });
      }
    }
    return out;
  }

  const cyclic = (values, window, fn) => {
    const n = values.length;
    const half = window >> 1;
    const out = new Float32Array(n);
    const buf = [];
    for (let i = 0; i < n; i++) {
      buf.length = 0;
      for (let k = -half; k <= half; k++) buf.push(values[(i + k + n * 4) % n]);
      out[i] = fn(buf);
    }
    return out;
  };
  const median = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

  async function cutOutline(src, o = {}) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const [sx, sy, sw, sh] = o.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const scale = o.scale || 1;
    const pad = o.pad ?? 10;
    const iw = Math.round(sw * scale);
    const ih = Math.round(sh * scale);
    const W = iw + pad * 2;
    const H = ih + pad * 2;
    const N = W * H;
    const map = (x, y) => [(x - sx) * scale + pad, (y - sy) * scale + pad];
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, pad, pad, iw, ih);
    const px = ctx.getImageData(0, 0, W, H).data;
    const stats = { source: [img.naturalWidth, img.naturalHeight], mode: 'outline' };

    // 1. Kontur: zich nuqtalar, tashqi normal
    const pts = densify(o.outline.map(([x, y, flag, shift]) => [...map(x, y), flag, (shift || 0) * scale]), o.step ?? 1.5);
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 4 + n) % n];
      const b = pts[(i + 4) % n];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      pts[i].nx = area > 0 ? ty : -ty;
      pts[i].ny = area > 0 ? -tx : tx;
    }
    // 2. Chekkaga tortish: tashqaridan ichkariga qarab, mahalliy fon rangidan birinchi keskin farq
    const offs = new Float32Array(n);
    let hits = 0;
    if (o.snap !== false) {
      const inward = o.snapIn ?? 14;
      const start = o.snapOut ?? 0;
      const thr = o.snapThr ?? 12;
      // biroz xiralashtirilgan nusxa (JPEG shovqini adashtirmasin)
      const soft = new Float32Array(N * 3);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let s = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += px[((y + dy) * W + x + dx) * 4 + c];
            const v = s / 9;
            // qorong'i rasmlarda chekkani topish uchun yorqinlik cho'ziladi
            soft[(y * W + x) * 3 + c] = o.snapLevels ? Math.max(0, Math.min(255, ((v - o.snapLevels[0]) * 255) / (o.snapLevels[1] - o.snapLevels[0]))) : v;
          }
        }
      }
      const sample = (x, y, c) => {
        const xi = Math.max(1, Math.min(W - 2, Math.round(x)));
        const yi = Math.max(1, Math.min(H - 2, Math.round(y)));
        return soft[(yi * W + xi) * 3 + c];
      };
      const found = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        if (p.fixed) { found[i] = 1; continue; }
        if (p.rise) {
          // Soya tomonda: tashqaridan ichkariga qarab birinchi keskin YORISHISH — soyadan buyumning o'ziga o'tish
          const lum = (t) => (sample(p.x + p.nx * t, p.y + p.ny * t, 0) + sample(p.x + p.nx * t, p.y + p.ny * t, 1) + sample(p.x + p.nx * t, p.y + p.ny * t, 2)) / 3;
          const riseThr = o.riseThr ?? 14;
          for (let t = start; t >= -inward; t -= 0.5) {
            const step = p.rise * (lum(t - 1.5) - lum(t + 1.5));
            if (step <= riseThr) continue;
            let best = t;
            let bestG = step;
            for (let u = t - 0.5; u >= t - 4; u -= 0.5) {
              const g = p.rise * (lum(u - 1.5) - lum(u + 1.5));
              if (g > bestG) { bestG = g; best = u; }
            }
            offs[i] = best - 1;
            found[i] = 1;
            hits++;
            break;
          }
          continue;
        }
        if ((p.mode || (o.snapMode === 'grad' ? 'g' : 'd')) === 'g') {
          // Birinchi keskin o'tish (yumshoq soya o'tkazib yuboriladi), so'ng shu o'tishning eng tik joyi
          const lum = (t) => (sample(p.x + p.nx * t, p.y + p.ny * t, 0) + sample(p.x + p.nx * t, p.y + p.ny * t, 1) + sample(p.x + p.nx * t, p.y + p.ny * t, 2)) / 3;
          const grad = (t) => Math.abs(lum(t - 1) - lum(t + 1)) / 2;
          for (let t = start; t >= -inward; t -= 0.5) {
            if (grad(t) <= thr) continue;
            let best = t;
            let bestG = grad(t);
            for (let u = t - 0.5; u >= t - 4; u -= 0.5) {
              const g = grad(u);
              if (g > bestG) { bestG = g; best = u; }
            }
            offs[i] = best;
            found[i] = 1;
            hits++;
            break;
          }
          continue;
        }
        const ref = [0, 0, 0];
        for (let t = start + 2; t < start + 5; t++) for (let c = 0; c < 3; c++) ref[c] += sample(p.x + p.nx * t, p.y + p.ny * t, c) / 3;
        for (let t = start; t >= -inward; t -= 0.5) {
          let dev = 0;
          for (let c = 0; c < 3; c++) dev = Math.max(dev, Math.abs(sample(p.x + p.nx * t, p.y + p.ny * t, c) - ref[c]));
          if (dev > thr) { offs[i] = t; found[i] = 1; hits++; break; }
        }
      }
      // topilmagan joylar qo'shnilardan olinadi
      for (let pass = 0; pass < n; pass++) {
        let changed = false;
        for (let i = 0; i < n; i++) {
          if (found[i]) continue;
          const l = (i - 1 + n) % n;
          const r = (i + 1) % n;
          if (found[l]) { offs[i] = offs[l]; found[i] = 1; changed = true; }
          else if (found[r]) { offs[i] = offs[r]; found[i] = 1; changed = true; }
        }
        if (!changed) break;
      }
      const med = cyclic(offs, o.snapMedian ?? 17, median);
      const avg = cyclic(med, o.snapMean ?? 9, mean);
      for (let i = 0; i < n; i++) offs[i] = pts[i].fixed ? 0 : avg[i];
      // "Dag'al" bo'laklar (coarse: [[dan, gacha], ...] — qo'l nuqtalari tartib raqami): chekka har nuqtada bir marta
      // o'lchanadi va nuqtalar orasida tekis o'zgaradi. Chekka deyarli ko'rinmaydigan joyda (qora buyum to'q fonda)
      // topilgan chiziq to'lqinlanib qolmasligi uchun.
      if (o.coarse?.length) {
        const at = new Map();
        for (let i = 0; i < n; i++) if (pts[i].label >= 0) at.set(pts[i].label, offs[i]);
        const count = o.outline.length;
        for (let i = 0; i < n; i++) {
          const p = pts[i];
          if (p.fixed || !o.coarse.some(([from, to]) => p.seg >= from && p.seg <= to)) continue;
          const a = at.get(p.seg) ?? 0;
          const b = at.get((p.seg + 1) % count) ?? a;
          offs[i] = a + (b - a) * p.frac;
        }
      }
    }
    stats.samples = n;
    stats.snapped = hits;
    const inset = o.inset ?? 0.8;
    const final = pts.map((p, i) => [p.x + p.nx * (offs[i] + p.shift - inset), p.y + p.ny * (offs[i] + p.shift - inset)]);

    // 3. Niqob: silliq (anti-aliased) ko'pburchak
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = W;
    maskCanvas.height = H;
    const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    final.forEach(([x, y], i) => (i ? mctx.lineTo(x, y) : mctx.moveTo(x, y)));
    mctx.closePath();
    mctx.fill();
    if (o.drop?.length) {
      mctx.globalCompositeOperation = 'destination-out';
      for (const poly of o.drop) {
        mctx.beginPath();
        poly.forEach(([x, y], i) => { const [mx, my] = map(x, y); if (i) mctx.lineTo(mx, my); else mctx.moveTo(mx, my); });
        mctx.closePath();
        mctx.fill();
      }
      mctx.globalCompositeOperation = 'source-over';
    }
    const A = mctx.getImageData(0, 0, W, H).data;
    const fg = new Uint8Array(N);
    const outside = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      fg[i] = A[i * 4 + 3] > 0 ? 1 : 0;
      outside[i] = A[i * 4 + 3] > 127 ? 0 : 1;
    }

    // 4. Chekka piksellarning rangi ichkaridan olinadi (fon rangi aralashmasin)
    const out = new Uint8ClampedArray(N * 4);
    const ext = o.extend ?? 2;
    const dist = edt(outside, W, H);
    for (let i = 0; i < N; i++) {
      if (!fg[i]) continue;
      const p = i * 4;
      let q = p;
      if (ext > 0 && dist[i] <= ext * ext) {
        const x = i % W;
        const y = (i - x) / W;
        const R = Math.ceil(ext) + 1;
        let bestD = dist[i];
        for (let dy = -R; dy <= R; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W) continue;
            const j = yy * W + xx;
            if (dist[j] > bestD) { bestD = dist[j]; q = j * 4; }
          }
        }
      }
      out[p] = px[q]; out[p + 1] = px[q + 1]; out[p + 2] = px[q + 2];
      out[p + 3] = A[p + 3];
    }

    // 5. Fon yorug'ligidan qolgan rangli tusni yo'qotish (masalan, neon qizil/binafsha aks)
    for (const d of o.desat || []) {
      const amount = d.amount ?? 1;
      const feather = d.feather ?? 14;
      const bandSq = d.band ? d.band * d.band : Infinity;
      for (let i = 0; i < N; i++) {
        const p = i * 4;
        if (!out[p + 3] || dist[i] > bandSq) continue;
        const r = out[p], g = out[p + 1], b = out[p + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max === min) continue;
        let w = 1;
        if (d.hue) {
          let h;
          if (max === r) h = ((g - b) / (max - min)) % 6;
          else if (max === g) h = (b - r) / (max - min) + 2;
          else h = (r - g) / (max - min) + 4;
          h = (h * 60 + 360) % 360;
          const [from, to] = d.hue;
          const inside = from <= to ? h >= from && h <= to : h >= from || h <= to;
          if (!inside) {
            const diff = (a, c) => Math.min(Math.abs(a - c), 360 - Math.abs(a - c));
            const gap = Math.min(diff(h, from), diff(h, to));
            w = Math.max(0, 1 - gap / feather);
          }
        }
        if (w <= 0) continue;
        const k = w * amount;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        out[p] = r + (gray - r) * k;
        out[p + 1] = g + (gray - g) * k;
        out[p + 2] = b + (gray - b) * k;
      }
    }

    // 6. Qirqish va natija
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (out[(y * W + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) throw new Error('hech narsa qolmadi');
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const cw = x1 - x0 + 1;
    const chh = y1 - y0 + 1;
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    tmp.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
    const result = document.createElement('canvas');
    result.width = cw;
    result.height = chh;
    result.getContext('2d').drawImage(tmp, x0, y0, cw, chh, 0, 0, cw, chh);
    stats.size = [cw, chh];

    const maxSide = o.previewSize || 900;
    const ps = Math.min(1, maxSide / Math.max(cw, chh));
    const preview = document.createElement('canvas');
    preview.width = Math.round(cw * ps) + 60;
    preview.height = Math.round(chh * ps) + 60;
    const pctx = preview.getContext('2d');
    pctx.fillStyle = o.previewBg || '#121216';
    pctx.fillRect(0, 0, preview.width, preview.height);
    pctx.imageSmoothingQuality = 'high';
    pctx.drawImage(result, 30, 30, Math.round(cw * ps), Math.round(chh * ps));

    const range = o.stripRange ?? 20;
    const vs = 4;
    const rows = o.stripRows ?? 2;
    const perRow = Math.ceil(n / rows);
    const rowH = (range * 2 + 1) * vs + 26;
    const strip = document.createElement('canvas');
    strip.width = perRow + 40;
    strip.height = rowH * rows;
    const sctx = strip.getContext('2d');
    sctx.fillStyle = '#000';
    sctx.fillRect(0, 0, strip.width, strip.height);
    const sdata = sctx.getImageData(0, 0, strip.width, strip.height);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = 40 + (i % perRow);
      const [fx, fy] = final[i];
      for (let t = range; t >= -range; t--) {
        const x = Math.max(0, Math.min(W - 1, Math.round(fx + pts[i].nx * t)));
        const y = Math.max(0, Math.min(H - 1, Math.round(fy + pts[i].ny * t)));
        const q = (y * W + x) * 4;
        for (let k = 0; k < vs; k++) {
          const sy = row * rowH + 22 + (range - t) * vs + k;
          const d = (sy * strip.width + col) * 4;
          const lv = o.stripLevels; const st = (v) => (lv ? Math.max(0, Math.min(255, ((v - lv[0]) * 255) / (lv[1] - lv[0]))) : v);
          sdata.data[d] = st(px[q]); sdata.data[d + 1] = st(px[q + 1]); sdata.data[d + 2] = st(px[q + 2]); sdata.data[d + 3] = 255;
        }
      }
    }
    sctx.putImageData(sdata, 0, 0);
    sctx.font = 'bold 11px Arial';
    for (let row = 0; row < rows; row++) {
      const cy = row * rowH + 22 + range * vs + vs / 2;
      sctx.fillStyle = '#ff2bd6';
      sctx.fillRect(0, cy - 1, 38, 2);
      sctx.fillRect(strip.width - 6, cy - 1, 6, 2);
      for (const mark of [-10, -5, 5, 10]) {
        sctx.fillStyle = '#39ff14';
        sctx.fillRect(26, cy - mark * vs, 12, 1);
        sctx.fillText((mark > 0 ? '+' : '') + mark, 0, cy - mark * vs + 4);
      }
    }
    for (let i = 0; i < n; i++) {
      if (pts[i].label < 0) continue;
      const row = Math.floor(i / perRow);
      const col = 40 + (i % perRow);
      sctx.fillStyle = pts[i].fixed ? '#ffe600' : '#00e6ff';
      sctx.fillRect(col, row * rowH + 14, 1, 8);
      sctx.fillText(String(pts[i].label), col + 2, row * rowH + 11);
    }
    // Tekshirish uchun: manba ustida yakuniy kontur (manba koordinatalarida saqlanadi)
    const finalSource = final.map(([x, y]) => [Math.round(((x - pad) / scale + sx) * 10) / 10, Math.round(((y - pad) / scale + sy) * 10) / 10]);
    window.__cutResult = result;
    return JSON.stringify({ stats, outline: finalSource, preview: o.debug ? await toBase64(preview, 'image/jpeg', 0.92) : null, strip: o.debug ? await toBase64(strip, 'image/png') : null });
  }

  // Oxirgi kesilgan rasmni saytga tayyorlaydi: uzun tomoni `edge` pikseldan oshmaydigan WebP
  async function webp(edge, quality) {
    const src = window.__cutResult;
    const scale = Math.min(1, edge / Math.max(src.width, src.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(src.width * scale));
    canvas.height = Math.max(1, Math.round(src.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return JSON.stringify({ data: await toBase64(canvas, 'image/webp', quality), size: canvas.width + '×' + canvas.height });
  }

  window.CUT = { white: cut, outline: cutOutline, webp };
})();
