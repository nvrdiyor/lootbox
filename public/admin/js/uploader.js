// Rasm yuklagich. Rasm SERVERGA KETISHIDAN OLDIN brauzerda tayyorlanadi:
//   - katta surat kichraytiriladi (uzun tomoni 2000 px gacha) va WebP ga o'giriladi;
//   - ro'yxatlar uchun kichik nusxa (800 px) yasaladi;
//   - telefon suratidagi joylashuv kabi yashirin ma'lumotlar (EXIF) tushib qoladi.
// Shuning uchun 10 MB lik surat ham bir necha yuz KB bo'lib yuklanadi.
import { csrfToken, toast } from './core.js';

const FULL_EDGE = 2000;
const THUMB_EDGE = 800;
const MAX_ORIGINAL = 25 * 1024 * 1024; // tanlangan fayl uchun chegara
const MAX_RAW = 8 * 1024 * 1024; // qayta ishlab bo'lmasa, asl holida yuklash chegarasi
const RAW_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ICON_STAR =
  '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z"/></svg>';
const ICON_CLOSE =
  '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const megabytes = (bytes) => (bytes / 1048576).toFixed(1).replace('.', ',');

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // pastdagi usulga o'tamiz
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function draw(source, width, height, background = '') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Kichraytirib WebP qiladi; brauzer WebP yoza olmasa — JPEG (oq fon bilan) */
async function encode(source, sourceWidth, sourceHeight, edge) {
  const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  let blob = await toBlob(draw(source, width, height), 'image/webp', 0.86);
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(draw(source, width, height, '#ffffff'), 'image/jpeg', 0.88);
  }
  if (!blob) throw new Error('encode');
  return blob;
}

function averageColor(source) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      r += data[i] * alpha;
      g += data[i + 1] * alpha;
      b += data[i + 2] * alpha;
      weight += alpha;
    }
    if (weight < 1) return '';
    return `#${[r, g, b].map((value) => Math.round(value / weight).toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '';
  }
}

function send(form, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/admin/api/images');
    xhr.setRequestHeader('X-CSRF-Token', csrfToken());
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, data: xhr.response });
    xhr.onerror = () => resolve({ status: 0, data: null });
    xhr.send(form);
  });
}

/**
 * @param {HTMLElement} root  [data-uploader] elementi
 * @param {{ images?: Array<{id:number,url:string,thumb_url:string}>, onChange?: () => void }} options
 */
export function createUploader(root, { images = [], onChange = () => {} } = {}) {
  const list = root.querySelector('[data-uploader-list]');
  const input = root.querySelector('[data-uploader-input]');
  const zone = root.querySelector('[data-dropzone]');
  const errorSlot = root.querySelector('[data-uploader-error]');
  const multiple = root.hasAttribute('data-multiple');
  const max = Number(root.dataset.max) || 1;
  const items = new Map(); // element → { id, status }
  const queue = [];
  let running = 0;

  const refresh = () => {
    const count = list.children.length;
    root.classList.toggle('has-items', count > 0);
    root.classList.toggle('is-full', multiple && count >= max);
  };

  function showError(message) {
    if (!errorSlot) return;
    errorSlot.textContent = message;
    errorSlot.hidden = !message;
  }

  function createItem(previewUrl) {
    const el = document.createElement('li');
    el.className = 'thumb';
    el.innerHTML = `<img class="thumb__img" alt="" draggable="false">
      <span class="thumb__cover">Muqova</span>
      <div class="thumb__actions">
        <button class="thumb__btn" type="button" data-cover title="Muqova qilish" aria-label="Muqova qilish">${ICON_STAR}</button>
        <button class="thumb__btn thumb__btn--danger" type="button" data-remove title="Olib tashlash" aria-label="Rasmni olib tashlash">${ICON_CLOSE}</button>
      </div>
      <div class="thumb__bar" hidden><i></i></div>
      <p class="thumb__error" hidden></p>`;
    el.querySelector('img').src = previewUrl;
    return el;
  }

  function setState(el, status, { progress = null, error = '' } = {}) {
    const item = items.get(el);
    if (item) item.status = status;
    el.classList.toggle('is-busy', status === 'processing' || status === 'uploading');
    el.classList.toggle('is-processing', status === 'processing');
    el.classList.toggle('is-error', status === 'error');
    const bar = el.querySelector('.thumb__bar');
    bar.hidden = !(status === 'processing' || status === 'uploading');
    if (progress != null) bar.firstElementChild.style.width = `${Math.round(progress * 100)}%`;
    else if (status === 'processing') bar.firstElementChild.style.width = '';
    const slot = el.querySelector('.thumb__error');
    slot.textContent = error;
    slot.hidden = !error;
  }

  function addExisting(image) {
    const el = createItem(image.thumb_url || image.url);
    items.set(el, { id: image.id, status: 'done' });
    el.dataset.id = String(image.id);
    list.append(el);
  }

  async function work(file, el, previewUrl) {
    let payload;
    try {
      const bitmap = await decode(file);
      const width = bitmap.width || bitmap.naturalWidth;
      const height = bitmap.height || bitmap.naturalHeight;
      if (!width || !height) throw new Error('decode');
      const full = await encode(bitmap, width, height, FULL_EDGE);
      const thumb = Math.max(width, height) > THUMB_EDGE ? await encode(bitmap, width, height, THUMB_EDGE) : null;
      payload = { full, thumb, color: averageColor(bitmap) };
      bitmap.close?.();
    } catch {
      // Brauzer rasmni ocha olmadi: mayda va ma'lum formatdagi faylni asl holida yuboramiz
      if (RAW_TYPES.has(file.type) && file.size <= MAX_RAW) payload = { full: file, thumb: null, color: '' };
      else {
        setState(el, 'error', { error: 'Rasmni ochib bo‘lmadi. JPG, PNG yoki WebP yuklang.' });
        return;
      }
    }

    if (!items.has(el)) return; // shu orada olib tashlangan
    setState(el, 'uploading', { progress: 0.02 });
    const form = new FormData();
    form.append('full', payload.full, 'full');
    if (payload.thumb) form.append('thumb', payload.thumb, 'thumb');
    if (payload.color) form.append('color', payload.color);
    const result = await send(form, (progress) => setState(el, 'uploading', { progress: Math.max(0.02, progress) }));
    if (!items.has(el)) return;

    if (result.status === 201 && result.data?.ok) {
      const image = result.data.image;
      items.get(el).id = image.id;
      el.dataset.id = String(image.id);
      const img = el.querySelector('img');
      img.src = image.thumb_url || image.url;
      URL.revokeObjectURL(previewUrl);
      setState(el, 'done');
      onChange();
      return;
    }
    let message = result.data?.error || 'Yuklab bo‘lmadi. Qayta urinib ko‘ring.';
    if (result.status === 0) message = 'Serverga ulanib bo‘lmadi. Qayta urinib ko‘ring.';
    if (result.status === 401) message = 'Sessiya tugagan. Sahifani yangilab, qayta kiring.';
    setState(el, 'error', { error: message });
  }

  function pump() {
    while (running < 2 && queue.length) {
      const job = queue.shift();
      running += 1;
      work(job.file, job.el, job.previewUrl).finally(() => {
        running -= 1;
        pump();
      });
    }
  }

  function addFiles(fileList) {
    showError('');
    const files = [...fileList];
    if (!files.length) return;
    const problems = [];
    let room = multiple ? max - list.children.length : 1;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        problems.push(`«${file.name}» rasm emas. JPG, PNG yoki WebP yuklang.`);
        continue;
      }
      if (file.size > MAX_ORIGINAL) {
        problems.push(`«${file.name}» juda katta (${megabytes(file.size)} MB). Eng ko‘pi 25 MB.`);
        continue;
      }
      if (room <= 0) {
        problems.push(multiple ? `Eng ko‘pi ${max} ta rasm qo‘shiladi. Qolganlari o‘tkazib yuborildi.` : 'Bu yerga bitta rasm qo‘yiladi.');
        break;
      }
      if (!multiple) {
        for (const el of [...list.children]) remove(el, false);
      }
      const previewUrl = URL.createObjectURL(file);
      const el = createItem(previewUrl);
      items.set(el, { id: null, status: 'processing' });
      list.append(el);
      setState(el, 'processing');
      queue.push({ file, el, previewUrl });
      room -= 1;
    }
    refresh();
    pump();
    if (problems.length) {
      showError(problems.join(' '));
      toast(problems[0], { type: 'error' });
    }
  }

  function remove(el, notify = true) {
    items.delete(el);
    el.remove();
    refresh();
    if (notify) onChange();
  }

  // --- Hodisalar
  input.addEventListener('change', () => {
    addFiles(input.files);
    input.value = '';
  });

  list.addEventListener('click', (event) => {
    const el = event.target.closest('.thumb');
    if (!el) return;
    if (event.target.closest('[data-remove]')) remove(el);
    else if (event.target.closest('[data-cover]')) {
      list.prepend(el);
      onChange();
    }
  });

  const hasFiles = (event) => [...(event.dataTransfer?.types || [])].includes('Files');
  for (const type of ['dragenter', 'dragover']) {
    root.addEventListener(type, (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      zone.classList.add('is-over');
    });
  }
  root.addEventListener('dragleave', (event) => {
    if (!root.contains(event.relatedTarget)) zone.classList.remove('is-over');
  });
  root.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    zone.classList.remove('is-over');
    addFiles(event.dataTransfer.files);
  });

  if (multiple && window.Sortable) {
    new window.Sortable(list, {
      animation: 180,
      draggable: '.thumb',
      filter: 'button',
      preventOnFilter: false,
      ghostClass: 'is-ghost',
      delay: 120,
      delayOnTouchOnly: true,
      onEnd(event) {
        if (event.oldIndex !== event.newIndex) onChange();
      },
    });
  }

  for (const image of images) addExisting(image);
  refresh();

  return {
    /** Yuklab bo'lingan rasmlarning id'lari, ekrandagi tartibda */
    ids() {
      return [...list.children].map((el) => items.get(el)?.id).filter(Boolean);
    },
    /** Hali yuklanayotgan rasm bormi */
    busy() {
      return [...items.values()].some((item) => item.status === 'processing' || item.status === 'uploading');
    },
    hasErrors() {
      return [...items.values()].some((item) => item.status === 'error');
    },
    addFiles,
    /** Ro'yxatni berilgan rasmlar bilan almashtiradi (oyna qayta ochilganda) */
    reset(next = []) {
      for (const el of [...list.children]) remove(el, false);
      queue.length = 0;
      for (const image of next) addExisting(image);
      showError('');
      refresh();
    },
    element: root,
  };
}

/** Sahifaga Ctrl+V bilan qo'yilgan rasmlarni yuklagichga uzatadi */
export function bindPaste(uploader) {
  document.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    uploader.addFiles(files);
  });
}
