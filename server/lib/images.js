// Yuklangan rasmlar: tur fayl ICHIDAGI baytlardan aniqlanadi (nomi yoki brauzer aytgan
// turga ishonilmaydi), o'lcham cheklanadi, fayl tasodifiy nom bilan diskka yoziladi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

export const IMAGE_LIMITS = {
  fullBytes: 8 * 1024 * 1024, // asosiy rasm: 8 MB gacha
  thumbBytes: 2 * 1024 * 1024, // kichik nusxa: 2 MB gacha
  maxSide: 8000, // eng uzun tomoni (px)
  requestBytes: 11 * 1024 * 1024, // bitta yuklash so'rovi
};

export class ImageError extends Error {}

function jpegSize(buf) {
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) {
      off += 1;
      continue;
    }
    const marker = buf[off + 1];
    if (marker === 0xff) {
      off += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      off += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = buf.readUInt16BE(off + 2);
    if (length < 2) return null;
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    off += 2 + length;
  }
  return null;
}

function webpSize(buf) {
  if (buf.length < 30) return null;
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * Fayl haqiqatan rasm ekanini va turini baytlardan aniqlaydi.
 * @returns {{ mime: string, ext: string, width: number, height: number } | null}
 */
export function sniffImage(buf) {
  if (!buf || buf.length < 24) return null;
  let found = null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    const size = jpegSize(buf);
    found = size && { mime: 'image/jpeg', ext: 'jpg', ...size };
  } else if (buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    if (buf.toString('latin1', 12, 16) === 'IHDR') {
      found = { mime: 'image/png', ext: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
  } else if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const size = webpSize(buf);
    found = size && { mime: 'image/webp', ext: 'webp', ...size };
  }
  if (!found) return null;
  const { width, height } = found;
  if (!(width > 0 && height > 0) || width > IMAGE_LIMITS.maxSide || height > IMAGE_LIMITS.maxSide) return null;
  return found;
}

const FILE_NAME = /^[a-f0-9]{20}(?:\.t)?\.(?:jpg|png|webp)$/;
export const isMediaName = (name) => FILE_NAME.test(name);

export const mediaPath = (name) => path.join(config.uploadsDir, name);

/**
 * Rasmni tekshirib diskka yozadi.
 * @param {{ full: Buffer, thumb?: Buffer|null, color?: string }} input
 * @returns {{ file, thumb, mime, width, height, bytes, color }}
 */
export function storeImage({ full, thumb = null, color = '' }) {
  if (!full || !full.length) throw new ImageError('Fayl bo‘sh.');
  if (full.length > IMAGE_LIMITS.fullBytes) {
    throw new ImageError(`Rasm juda katta (${(full.length / 1048576).toFixed(1)} MB). Eng ko‘pi 8 MB.`);
  }
  const info = sniffImage(full);
  if (!info) throw new ImageError('Bu fayl rasm emas yoki formati qo‘llanmaydi. JPG, PNG yoki WebP yuklang.');

  let thumbInfo = null;
  if (thumb && thumb.length && thumb.length <= IMAGE_LIMITS.thumbBytes) thumbInfo = sniffImage(thumb);

  const base = crypto.randomBytes(10).toString('hex');
  const file = `${base}.${info.ext}`;
  fs.writeFileSync(mediaPath(file), full, { flag: 'wx' });

  let thumbFile = file;
  if (thumbInfo) {
    thumbFile = `${base}.t.${thumbInfo.ext}`;
    try {
      fs.writeFileSync(mediaPath(thumbFile), thumb, { flag: 'wx' });
    } catch {
      thumbFile = file;
    }
  }

  return {
    file,
    thumb: thumbFile,
    mime: info.mime,
    width: info.width,
    height: info.height,
    bytes: full.length,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '',
  };
}

export function removeImageFiles(image) {
  for (const name of new Set([image.file, image.thumb])) {
    if (!name || !isMediaName(name)) continue;
    try {
      fs.unlinkSync(mediaPath(name));
    } catch {
      // fayl allaqachon yo'q
    }
  }
}
