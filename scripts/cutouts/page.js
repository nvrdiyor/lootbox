// Tovar rasmini fonidan ajratib oladigan kod. Ko'rinmas Chrome sahifasi ichida ishlaydi (scripts/cutouts.js yuklaydi),
// tashqi dastur yoki xizmat ishlatilmaydi. Uch usul bor:
//   CUT.white(src, opts)   — oq (bir tekis) fonli rasm: chetdan boshlab fon rangidagi piksellar "to'ldiriladi", tovar
//                            ichidagi oq joylar saqlanadi, chekkadagi aralash piksellardan fon rangi ayiriladi;
//   CUT.outline(src, opts) — fon murakkab bo'lsa (plakat, soya): qo'lda chizilgan kontur bo'yicha. Kontur nuqtalari
//                            taxminiy bo'lishi mumkin — dastur ularni haqiqiy chekkaga tortadi (pastga qarang);
//   CUT.pad(src, opts)     — gilamcha kesilmaydi, o'lchamlari bo'yicha qaytadan chiziladi; src — logotipi ko'rinib
//                            turgan haqiqiy surat (logotip shundan ko'chiriladi).
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

  // ---- Gilamchani qayta chizish (render) ----
  // Plakatdan kesilgan gilamcha xira chiqadi: plakat kichik, siqilgan va yorug'lik dog'lari bilan. Gilamcha esa tekis
  // buyum — uni o'z o'lchamlari bo'yicha, plakatdagi ko'rinish burchagida qaytadan chizish mumkin: bir tekis mato sirt,
  // yon qalinligi va HAQIQIY SURATDAN ko'chirilgan logotip bilan. Manba rasm (src) — logotip ko'rinib turgan surat.
  const mul3 = (a, b) => {
    const out = new Array(9).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
    return out;
  };
  const inv3 = (m) => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
  };
  function solveLinear(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const d = M[col][col];
      if (Math.abs(d) < 1e-12) throw new Error('nuqtalar bir chiziqda yotibdi');
      for (let k = col; k <= n; k++) M[col][k] /= d;
      for (let r = 0; r < n; r++) {
        const f = M[r][col];
        if (r === col || !f) continue;
        for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
      }
    }
    return M.map((row) => row[n]);
  }
  // (x, y) → (X, Y) proyektiv almashtirish, [[x, y, X, Y], ...] juftliklari bo'yicha (4 ta — aniq, ko'p bo'lsa — eng
  // kichik kvadratlar). Hisob barqaror bo'lishi uchun nuqtalar avval markazga keltirilib, masshtablanadi.
  function homography(pairs) {
    const normalizer = (pts) => {
      const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const spread = pts.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / pts.length || 1;
      const k = Math.SQRT2 / spread;
      return [k, 0, -k * mx, 0, k, -k * my, 0, 0, 1];
    };
    const from = normalizer(pairs.map((p) => [p[0], p[1]]));
    const to = normalizer(pairs.map((p) => [p[2], p[3]]));
    const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0));
    const Atb = new Array(8).fill(0);
    const add = (row, value) => {
      for (let i = 0; i < 8; i++) {
        Atb[i] += row[i] * value;
        for (let j = 0; j < 8; j++) AtA[i][j] += row[i] * row[j];
      }
    };
    for (const p of pairs) {
      const x = from[0] * p[0] + from[2];
      const y = from[4] * p[1] + from[5];
      const X = to[0] * p[2] + to[2];
      const Y = to[4] * p[3] + to[5];
      add([x, y, 1, 0, 0, 0, -x * X, -y * X], X);
      add([0, 0, 0, x, y, 1, -x * Y, -y * Y], Y);
    }
    const h = mul3(inv3(to), mul3([...solveLinear(AtA, Atb), 1], from));
    return h.map((v) => v / h[8]);
  }
  const project = (h, x, y) => {
    const w = h[6] * x + h[7] * y + h[8];
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  };
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  async function renderPad(src, o = {}) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const [PW, PH, PT] = o.size; // mm: eni, bo'yi, qalinligi
    const radius = o.radius ?? 15;
    const stats = { source: [img.naturalWidth, img.naturalHeight], mode: 'pad' };

    // 1. Ko'rinish: gilamcha tekisligi (mm; boshi chap-yuqori burchakda, v pastga) → manzara pikseli. `view` — plakatdagi
    //    to'rt burchak (chap-yuqori, o'ng-yuqori, o'ng-past, chap-past). Shundan kamera ham tiklanadi (yon devor uchun).
    const corners = [[0, 0], [PW, 0], [PW, PH], [0, PH]];
    const top = homography(o.view.map(([x, y], i) => [corners[i][0], corners[i][1], x, y]));
    const xs = o.view.map((p) => p[0]);
    const ys = o.view.map((p) => p[1]);
    const [cx, cy] = o.viewCenter || [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const column = (j) => [top[j] - cx * top[6 + j], top[3 + j] - cy * top[6 + j], top[6 + j]];
    const h1 = column(0);
    const h2 = column(1);
    const h3 = column(2);
    // fokus masofasi: r1 ⟂ r2 va |r1| = |r2| shartlaridan
    const guesses = [
      -(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2]),
      (h2[0] ** 2 + h2[1] ** 2 - h1[0] ** 2 - h1[1] ** 2) / (h1[2] ** 2 - h2[2] ** 2),
    ].filter((v) => Number.isFinite(v) && v > 0);
    const focal = o.focal || (guesses.length ? Math.sqrt(guesses.reduce((s, v) => s + v, 0) / guesses.length) : 4 * (Math.max(...xs) - Math.min(...xs)));
    stats.focal = [Math.round(focal), ...guesses.map((v) => Math.round(Math.sqrt(v)))];
    const unit = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l, l];
    };
    const r1 = unit([h1[0] / focal, h1[1] / focal, h1[2]]);
    const r2 = unit([h2[0] / focal, h2[1] / focal, h2[2]]);
    const lambda = (r1[3] + r2[3]) / 2;
    let r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    const t = [h3[0] / focal, h3[1] / focal, h3[2]];
    if (r3[0] * t[0] + r3[1] * t[1] + r3[2] * t[2] > 0) r3 = r3.map((v) => -v); // normal kameraga qaragan bo'lsin
    // gilamchaning tagi (w = −PT) uchun almashtirish: uchinchi ustun normal bo'ylab suriladi
    const dz = -PT * lambda;
    const shift = [dz * focal * r3[0], dz * focal * r3[1], dz * r3[2]];
    const bottom = top.slice();
    bottom[2] += shift[0] + cx * shift[2];
    bottom[5] += shift[1] + cy * shift[2];
    bottom[8] += shift[2];

    const halfW = PW / 2;
    const halfH = PH / 2;
    const sdf = (u, v) => {
      const qx = Math.abs(u - halfW) - (halfW - radius);
      const qy = Math.abs(v - halfH) - (halfH - radius);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
    };
    const normal = (u, v) => {
      const sx = u < halfW ? -1 : 1;
      const sy = v < halfH ? -1 : 1;
      const qx = Math.abs(u - halfW) - (halfW - radius);
      const qy = Math.abs(v - halfH) - (halfH - radius);
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        return [(sx * qx) / l, (sy * qy) / l];
      }
      return qx > qy ? [sx, 0] : [0, sy];
    };

    // 2. Kadr: gilamcha (usti va tagi) egallagan to'rtburchak, kerakli kenglikka masshtablanadi
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const h of [top, bottom]) {
      for (let step = 0; step < 720; step++) {
        // yumaloq burchakli to'rtburchak chegarasi: to'rtta burchak yoyi (eng chetki nuqtalar shularda)
        const a = (step / 720) * Math.PI * 2;
        const ux = halfW + Math.sign(Math.cos(a)) * (halfW - radius) + Math.cos(a) * radius;
        const vy = halfH + Math.sign(Math.sin(a)) * (halfH - radius) + Math.sin(a) * radius;
        const [x, y] = project(h, ux, vy);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    const margin = 2;
    const W = o.width ?? 1400; // aynan shu kenglikda chiziladi — keyin kichraytirilmaydi (mato doni yo'qolmasin)
    const k = (W - margin * 2) / (x1 - x0);
    const H = Math.ceil((y1 - y0) * k) + margin * 2;
    // natija pikseli → manzara pikseli → gilamcha tekisligi
    const toScene = [1 / k, 0, x0 - margin / k, 0, 1 / k, y0 - margin / k, 0, 0, 1];
    const invTop = mul3(inv3(top), toScene);
    const invBottom = mul3(inv3(bottom), toScene);

    // 3. Logotip niqobi: haqiqiy suratdagi logotip gilamcha tekisligiga "tekislanadi" (logo.points: [surat x, y, mm u, v]),
    //    oq bo'yoq qizil/qora matodan ajratiladi, mato nuqtalari silliqlanadi va chetlari qayta keskinlashtiriladi.
    let logo = null;
    if (o.logo) {
      const L = o.logo;
      const toPhoto = homography(L.points.map(([px, py, u, v]) => [u, v, px, py]));
      const res = L.res ?? 16; // niqob aniqligi, piksel/mm
      const [u0, v0, u1, v1] = L.box;
      const lw = Math.round((u1 - u0) * res);
      const lh = Math.round((v1 - v0) * res);
      const pc = document.createElement('canvas');
      pc.width = img.naturalWidth;
      pc.height = img.naturalHeight;
      const pctx = pc.getContext('2d', { willReadFrequently: true });
      pctx.drawImage(img, 0, 0);
      const pd = pctx.getImageData(0, 0, pc.width, pc.height).data;
      const [lo, hi] = L.levels ?? [38, 62];
      const white = (x, y) => {
        // oqlik: yashil va ko'k kanalning kichigi (qizil matoda ikkalasi past, oq bo'yoqda baland); ikki chiziqli o'qish
        const xi = Math.max(0, Math.min(pc.width - 2, Math.floor(x)));
        const yi = Math.max(0, Math.min(pc.height - 2, Math.floor(y)));
        const fx = Math.max(0, Math.min(1, x - xi));
        const fy = Math.max(0, Math.min(1, y - yi));
        const at = (xx, yy) => {
          const q = (yy * pc.width + xx) * 4;
          return Math.min(pd[q + 1], pd[q + 2]);
        };
        return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy;
      };
      const raw = new Float32Array(lw * lh);
      for (let j = 0; j < lh; j++) {
        for (let i = 0; i < lw; i++) {
          const [x, y] = project(toPhoto, u0 + (i + 0.5) / res, v0 + (j + 0.5) / res);
          raw[j * lw + i] = white(x - 0.5, y - 0.5);
        }
      }
      // Oqlik har bir nuqtada atrofdagi eng yorug' joyga nisbatan o'lchanadi: ingichka va xiraroq chiqqan mayda harflar
      // ham yo'g'on chiziqlar kabi to'liq olinadi (levels: [mato darajasi, "oq" deb hisoblanadigan eng past daraja])
      const reachPx = L.reach ?? 8;
      const maxFilter = (srcArr, horizontal) => {
        const outArr = new Float32Array(lw * lh);
        for (let j = 0; j < lh; j++) {
          for (let i = 0; i < lw; i++) {
            let best = 0;
            for (let d = -reachPx; d <= reachPx; d++) {
              const xx = horizontal ? Math.max(0, Math.min(lw - 1, i + d)) : i;
              const yy = horizontal ? j : Math.max(0, Math.min(lh - 1, j + d));
              const value = srcArr[yy * lw + xx];
              if (value > best) best = value;
            }
            outArr[j * lw + i] = best;
          }
        }
        return outArr;
      };
      const peak = maxFilter(maxFilter(raw, true), false);
      let mask = new Float32Array(lw * lh);
      for (let i = 0; i < mask.length; i++) mask[i] = Math.max(0, Math.min(1, (raw[i] - lo) / (Math.max(peak[i], hi) - lo)));
      // silliqlash (uch marta quti-filtr ≈ Gauss), so'ng keskin chegara
      const blurRadius = L.blur ?? 1;
      const box = (srcArr, horizontal) => {
        const out = new Float32Array(lw * lh);
        const len = horizontal ? lw : lh;
        const lines = horizontal ? lh : lw;
        for (let line = 0; line < lines; line++) {
          let sum = 0;
          const at = (p) => srcArr[horizontal ? line * lw + Math.max(0, Math.min(len - 1, p)) : Math.max(0, Math.min(len - 1, p)) * lw + line];
          for (let p = -blurRadius; p <= blurRadius; p++) sum += at(p);
          for (let p = 0; p < len; p++) {
            out[horizontal ? line * lw + p : p * lw + line] = sum / (blurRadius * 2 + 1);
            sum += at(p + blurRadius + 1) - at(p - blurRadius);
          }
        }
        return out;
      };
      if (blurRadius > 0) for (let pass = 0; pass < 3; pass++) mask = box(box(mask, true), false);
      const [e0, e1] = L.edge ?? [0.2, 0.45];
      const solid = new Uint8Array(lw * lh);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = smooth(e0, e1, mask[i]);
        solid[i] = mask[i] > 0.5 ? 1 : 0;
      }
      // chang va mato nuqtalaridan qolgan mayda bo'laklar tashlanadi
      const minArea = L.minArea ?? 40;
      let dropped = 0;
      for (const part of components(solid, lw, lh)) {
        if (part.area >= minArea) continue;
        dropped++;
        const [bx0, by0, bx1, by1] = part.bbox;
        for (let yy = Math.max(0, by0 - 3); yy <= Math.min(lh - 1, by1 + 3); yy++) {
          for (let xx = Math.max(0, bx0 - 3); xx <= Math.min(lw - 1, bx1 + 3); xx++) mask[yy * lw + xx] = 0;
        }
      }
      stats.logo = [lw, lh, dropped];
      logo = { mask, lw, lh, u0, v0, res };
      if (o.debug) {
        const lc = document.createElement('canvas');
        lc.width = lw;
        lc.height = lh;
        const ld = new ImageData(lw, lh);
        for (let i = 0; i < mask.length; i++) {
          const value = Math.round(mask[i] * 255);
          ld.data[i * 4] = value; ld.data[i * 4 + 1] = value; ld.data[i * 4 + 2] = value; ld.data[i * 4 + 3] = 255;
        }
        lc.getContext('2d').putImageData(ld, 0, 0);
        logo.canvas = lc;
      }
    }
    const logoAt = (u, v) => {
      if (!logo) return 0;
      const x = (u - logo.u0) * logo.res - 0.5;
      const y = (v - logo.v0) * logo.res - 0.5;
      if (x < 0 || y < 0 || x >= logo.lw - 1 || y >= logo.lh - 1) return 0;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const q = yi * logo.lw + xi;
      return (logo.mask[q] * (1 - fx) + logo.mask[q + 1] * fx) * (1 - fy) + (logo.mask[q + logo.lw] * (1 - fx) + logo.mask[q + logo.lw + 1] * fx) * fy;
    };

    // 4. Mato: tasodifiy mayda don (takrorlanuvchi naqsh yo'q — muar chiqmaydi), yirikroq notekislik va yorug'lik
    let seed = o.seed ?? 20261116;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    const table = (size) => {
      const values = new Float32Array(size * size);
      for (let i = 0; i < values.length; i++) values[i] = random() - 0.5;
      return { values, size };
    };
    const fine = table(512);
    const mid = table(128);
    const low = table(32);
    const nearest = (tb, u, v, cell) => tb.values[((Math.floor(v / cell) & (tb.size - 1)) * tb.size) + (Math.floor(u / cell) & (tb.size - 1))];
    const bilinear = (tb, u, v, cell) => {
      const x = u / cell;
      const y = v / cell;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const m = tb.size - 1;
      const at = (a, b) => tb.values[((b & m) * tb.size) + (a & m)];
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
    };
    const S = { grain: 0.085, weave: 0.035, cloud: 0.03, light: 0.16, lightDir: [0.8, 0.6], sheen: 0.05, rim: 0.1, ...(o.shade || {}) };
    const base = o.color;
    const logoColor = o.logoColor || [238, 228, 226];
    const logoOpacity = o.logoOpacity ?? 0.9;
    const foam = o.foam || [15, 15, 17];
    const fabricEdge = o.fabricEdge ?? 0.1; // yon devorning yuqori qismi — matoning kesilgan cheti (qalinlik ulushi)
    const wallLight = (() => {
      const l = Math.hypot(...(o.wallLight || [-0.5, 0.85]));
      return (o.wallLight || [-0.5, 0.85]).map((v) => v / l);
    })();

    const shadeTop = (u, v, depth, outRgb) => {
      const texture = 1 + S.grain * nearest(fine, u, v, 0.28) + S.weave * bilinear(mid, u, v, 1.6) + S.cloud * bilinear(low, u, v, 42);
      const light = 1 + S.light * ((0.5 - u / PW) * S.lightDir[0] + (0.5 - v / PH) * S.lightDir[1]);
      const rim = 1 - S.rim * (1 - smooth(0, 1.3, depth)); // chetida mato biroz pastga egiladi — sal to'qroq
      const sheen = S.sheen * smooth(0.25, 1, 1 - u / PW);
      const m = logoAt(u, v) * logoOpacity;
      for (let c = 0; c < 3; c++) {
        let value = base[c] * texture * light * rim;
        value += (235 - value) * sheen * 0.5;
        outRgb[c] = value + (logoColor[c] * light - value) * m;
      }
    };
    const shadeWall = (u, v, s, outRgb) => {
      const n = normal(u, v);
      const lambert = Math.max(0, n[0] * wallLight[0] + n[1] * wallLight[1]);
      if (s < fabricEdge) {
        for (let c = 0; c < 3; c++) outRgb[c] = base[c] * (0.42 + 0.2 * lambert);
        return;
      }
      const depth = (s - fabricEdge) / (1 - fabricEdge);
      const gain = (0.8 + 0.9 * lambert) * (1 - 0.45 * depth) * (1 + 0.5 * nearest(fine, u * 3 + s * 40, v * 3, 0.5) * 0.3);
      for (let c = 0; c < 3; c++) outRgb[c] = foam[c] * gain;
    };

    // 5. Chizish: har bir piksel ichida n×n namuna (silliq chet), har bir namuna uchun nur gilamcha ustiga yoki yon
    //    devoriga tushadi
    const n = o.samples ?? 4;
    const out = new Uint8ClampedArray(W * H * 4);
    const rgb = [0, 0, 0];
    const reach = Math.hypot(...project(invBottom, W / 2, H / 2).map((value, i) => value - project(invTop, W / 2, H / 2)[i])) + 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const [uc, vc] = project(invTop, x + 0.5, y + 0.5);
        const dc = sdf(uc, vc);
        if (dc > reach * 2 + 4) continue; // gilamchadan uzoq
        let r = 0, g = 0, b = 0, hits = 0;
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const sx = x + (i + 0.5) / n;
            const sy = y + (j + 0.5) / n;
            const [u, v] = project(invTop, sx, sy);
            const d = sdf(u, v);
            if (d <= 0) {
              shadeTop(u, v, -d, rgb);
            } else {
              if (d > reach * 2) continue;
              const [ub, vb] = project(invBottom, sx, sy);
              // nur qalinlik ichida (u,v) dan (ub,vb) gacha yuradi: gilamcha ichiga birinchi kirgan joy — yon devor
              let enter = -1;
              let before = 0;
              for (let step = 1; step <= 12; step++) {
                const s = step / 12;
                if (sdf(u + (ub - u) * s, v + (vb - v) * s) <= 0) {
                  let lo = before, hi = s;
                  for (let it = 0; it < 9; it++) {
                    const midS = (lo + hi) / 2;
                    if (sdf(u + (ub - u) * midS, v + (vb - v) * midS) <= 0) hi = midS; else lo = midS;
                  }
                  enter = hi;
                  break;
                }
                before = s;
              }
              if (enter < 0) continue;
              shadeWall(u + (ub - u) * enter, v + (vb - v) * enter, enter, rgb);
            }
            r += rgb[0]; g += rgb[1]; b += rgb[2];
            hits++;
          }
        }
        if (!hits) continue;
        const p = (y * W + x) * 4;
        out[p] = r / hits;
        out[p + 1] = g / hits;
        out[p + 2] = b / hits;
        out[p + 3] = Math.round((hits / (n * n)) * 255);
      }
    }

    const result = document.createElement('canvas');
    result.width = W;
    result.height = H;
    result.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
    stats.size = [W, H];

    const ps = Math.min(1, (o.previewSize || 900) / Math.max(W, H));
    const preview = document.createElement('canvas');
    preview.width = Math.round(W * ps) + 60;
    preview.height = Math.round(H * ps) + 60 + (logo?.canvas ? Math.round((logo.lh * (preview.width - 60)) / logo.lw) + 20 : 0);
    const vctx = preview.getContext('2d');
    vctx.fillStyle = o.previewBg || '#121216';
    vctx.fillRect(0, 0, preview.width, preview.height);
    vctx.imageSmoothingQuality = 'high';
    vctx.drawImage(result, 30, 30, Math.round(W * ps), Math.round(H * ps));
    // tekshirish uchun: suratdan ajratib olingan logotip niqobi (pastda)
    if (logo?.canvas) vctx.drawImage(logo.canvas, 30, Math.round(H * ps) + 50, preview.width - 60, Math.round((logo.lh * (preview.width - 60)) / logo.lw));
    window.__cutResult = result;
    return JSON.stringify({ stats, preview: o.debug ? await toBase64(preview, 'image/jpeg', 0.92) : null });
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

  window.CUT = { white: cut, outline: cutOutline, pad: renderPad, webp };
})();
