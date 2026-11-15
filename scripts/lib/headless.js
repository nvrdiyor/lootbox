// Ko'rinmas Chrome'ni DevTools protokoli orqali boshqarish uchun kichik yordamchi.
// Har doim alohida vaqtinchalik profil bilan ishlaydi — o'zingiz ishlatayotgan Chrome'ga tegilmaydi.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export const findChrome = () => CANDIDATES.find((file) => fs.existsSync(file)) || null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chrome'ni ishga tushiradi va bitta bo'sh sahifaga ulanadi.
 * @returns {Promise<{ run: (expression: string) => Promise<any>, close: () => Promise<void> } | null>}
 *   Chrome topilmasa yoki ishga tushmasa — null.
 */
export async function launchChrome({ port = 9379 } = {}) {
  const chrome = findChrome();
  if (!chrome) return null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-chrome-'));
  const browser = spawn(
    chrome,
    ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: 'ignore' },
  );
  let socket = null;
  const close = async () => {
    try {
      socket?.close();
    } catch {
      // ulanish allaqachon yopilgan
    }
    browser.kill();
    await sleep(400);
    try {
      // Chrome fayllarni darhol qo'yib yubormasligi mumkin — bir necha marta urinib ko'riladi
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch {
      // vaqtinchalik papka qolib ketsa ham zarari yo'q
    }
  };

  try {
    let ready = false;
    for (let i = 0; i < 50 && !ready; i++) {
      await sleep(200);
      ready = await fetch(`http://127.0.0.1:${port}/json/version`).then((res) => res.ok, () => false);
    }
    if (!ready) throw new Error('Chrome ishga tushmadi');

    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    let sequence = 0;
    const waiting = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && waiting.has(message.id)) {
        waiting.get(message.id)(message);
        waiting.delete(message.id);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++sequence;
        waiting.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
      });
    /** Sahifada JavaScript ifodasini bajaradi (Promise bo'lsa kutadi) va qiymatini qaytaradi */
    const run = async (expression) => {
      const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      const failure = reply.result?.exceptionDetails;
      if (failure) throw new Error(failure.exception?.description || failure.text || 'sahifadagi xato');
      return reply.result?.result?.value;
    };
    await send('Runtime.enable');
    return { run, close };
  } catch {
    await close();
    return null;
  }
}
