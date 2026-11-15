// Faqat dev rejimida: public/ ichidagi fayl o'zgarsa brauzer o'zi yangilanadi.
// Server kodi o'zgarsa `node --watch` serverni qayta ishga tushiradi, ulanish
// uzilib-qayta ulanganda sahifa o'zi qayta yuklanadi.
import fs from 'node:fs';
import path from 'node:path';

const encoder = new TextEncoder();
const clients = new Set();

function broadcast(event) {
  const chunk = encoder.encode(`event: ${event}\ndata: ${Date.now()}\n\n`);
  for (const controller of clients) {
    try {
      controller.enqueue(chunk);
    } catch {
      clients.delete(controller);
    }
  }
}

export function mountLiveReload(app, { publicDir }) {
  const clientFile = path.join(import.meta.dirname, 'client.js');

  app.get('/__dev/client.js', () => new Response(fs.readFileSync(clientFile), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
  }));

  app.get('/__dev/events', () => {
    let self;
    const stream = new ReadableStream({
      start(controller) {
        self = controller;
        clients.add(controller);
        controller.enqueue(encoder.encode('retry: 300\n\n'));
      },
      cancel() {
        clients.delete(self);
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      },
    });
  });

  let timer = null;
  let pending = 'css';
  try {
    fs.watch(publicDir, { recursive: true }, (_event, file) => {
      if (!file || !String(file).endsWith('.css')) pending = 'reload';
      clearTimeout(timer);
      timer = setTimeout(() => {
        broadcast(pending);
        pending = 'css';
      }, 80);
    });
  } catch (err) {
    console.warn('[dev] fayl kuzatuvchisi ishga tushmadi:', err.message);
  }

  // Ulanish tirik turishi uchun
  setInterval(() => broadcast('ping'), 25_000).unref();
}
