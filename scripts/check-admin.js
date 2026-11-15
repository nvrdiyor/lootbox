// Admin panel tekshiruvi (scripts/check.js ichidan chaqiriladi, vaqtinchalik bazada ishlaydi):
// kirish, CSRF himoyasi, rasm yuklash, tovar yaratish → saytda ko'rinishi → havolasi,
// yashirish, o'chirish, chiqish va parolni taxmin qilishga cheklov.
export async function run({ request, ok, eq, repo, PNG, ORIGIN, password }) {
  const HOST = new URL(ORIGIN).host;
  const form = (fields, origin = ORIGIN) =>
    request('/admin/login', {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, Host: HOST },
      body: new URLSearchParams(fields).toString(),
    });

  // ---- Kirmagan odam ------------------------------------------------------------
  const anon = await request('/admin', { redirect: 'manual' });
  ok(anon.status === 302 && (anon.headers.get('location') || '').startsWith('/admin/login'), 'admin: kirmagan odam kirish sahifasiga yuboriladi');
  for (const path of ['/admin/products', '/admin/products/1', '/admin/categories', '/admin/slides', '/admin/settings']) {
    eq((await request(path, { redirect: 'manual' })).status, 302, `admin: ${path} sessiyasiz ochilmaydi`);
  }
  const anonApi = await request('/admin/api/products', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Host: HOST } });
  eq(anonApi.status, 401, 'admin API: sessiyasiz 401');
  const anonUpload = new FormData();
  anonUpload.append('full', new File([PNG], 'a.png', { type: 'image/png' }));
  eq((await request('/admin/api/images', { method: 'POST', body: anonUpload, headers: { Origin: ORIGIN, Host: HOST } })).status, 401, 'admin API: sessiyasiz rasm yuklab bo‘lmaydi');
  eq((await request('/admin/login')).status, 200, 'admin: kirish sahifasi ochiladi');

  // ---- Kirish -------------------------------------------------------------------
  const wrong = await form({ password: 'notogri-parol' });
  ok(wrong.status === 401 && !wrong.headers.getSetCookie().some((c) => c.startsWith('lb_admin=')), 'admin: noto‘g‘ri parol rad etiladi');
  eq((await form({ password }, 'https://evil.example')).status, 403, 'admin: boshqa saytdan kirish so‘rovi rad etiladi');

  const login = await form({ password, next: 'https://evil.example/' });
  eq(login.status, 303, 'admin: to‘g‘ri parol qabul qilinadi');
  eq(login.headers.get('location'), '/admin', 'admin: kirgandan keyin begona saytga yo‘naltirilmaydi');
  const setCookie = login.headers.getSetCookie().find((c) => c.startsWith('lb_admin=')) || '';
  ok(/HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie), 'admin: cookie HttpOnly va SameSite bilan');
  const cookie = setCookie.split(';')[0];

  const dashboard = await request('/admin', { headers: { Cookie: cookie } });
  eq(dashboard.status, 200, 'admin: bosh sahifa ochiladi');
  const dashboardHtml = await dashboard.text();
  const csrf = (dashboardHtml.match(/<meta name="csrf-token" content="([^"]+)"/) || [])[1] || '';
  ok(csrf.length >= 20, 'admin: sahifada CSRF token bor');
  ok(!dashboardHtml.includes(password), 'admin: parol sahifada ko‘rinmaydi');
  eq(dashboard.headers.get('cache-control'), 'no-store', 'admin: sahifalar keshlanmaydi');
  for (const path of ['/admin/products', '/admin/products/new', '/admin/categories', '/admin/slides', '/admin/settings']) {
    const res = await request(path, { headers: { Cookie: cookie } });
    eq(res.status, 200, `admin: ${path} ochiladi`);
    const body = await res.text();
    ok(!body.includes('undefined') && !body.includes('[object Object]'), `admin: ${path} da "undefined" yo‘q`);
  }

  const api = (path, method, body, extra = {}) =>
    request(path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf, Origin: ORIGIN, Host: HOST, ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  // ---- CSRF ---------------------------------------------------------------------
  eq((await api('/admin/api/demo/clear', 'POST', {}, { 'X-CSRF-Token': '' })).status, 403, 'CSRF: tokensiz so‘rov rad etiladi');
  eq((await api('/admin/api/demo/clear', 'POST', {}, { 'X-CSRF-Token': 'x'.repeat(csrf.length) })).status, 403, 'CSRF: noto‘g‘ri token rad etiladi');
  eq((await api('/admin/api/demo/clear', 'POST', {}, { Origin: 'https://evil.example' })).status, 403, 'CSRF: boshqa saytdan kelgan so‘rov rad etiladi');
  eq(repo.demoCounts().products, 20, 'CSRF: rad etilgan so‘rov hech narsani o‘zgartirmagan');

  // ---- Rasm yuklash -------------------------------------------------------------
  const upload = (file) => {
    const data = new FormData();
    data.append('full', file);
    data.append('thumb', file);
    data.append('color', '#112233');
    return request('/admin/api/images', { method: 'POST', body: data, headers: { Cookie: cookie, 'X-CSRF-Token': csrf, Origin: ORIGIN, Host: HOST } });
  };
  eq((await upload(new File(['<script>alert(1)</script>'.repeat(4)], 'x.png', { type: 'image/png' }))).status, 400, 'rasm yuklash: rasm bo‘lmagan fayl rad etiladi');
  eq((await upload(new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'x.svg', { type: 'image/svg+xml' }))).status, 400, 'rasm yuklash: SVG rad etiladi');
  const tooBig = await upload(new File([new Uint8Array(12 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
  ok(tooBig.status === 413 || tooBig.status === 400, 'rasm yuklash: juda katta fayl rad etiladi', `status ${tooBig.status}`);
  const uploaded = await upload(new File([PNG], 'rasm.png', { type: 'image/png' }));
  eq(uploaded.status, 201, 'rasm yuklash: PNG qabul qilinadi');
  const image = (await uploaded.json()).image;
  ok(image && image.id > 0 && image.url.startsWith('/media/') && !image.url.includes('rasm'), 'rasm yuklash: fayl tasodifiy nom bilan saqlanadi');

  // ---- Tovar yaratish → saytda ko'rinishi ------------------------------------------
  const category = repo.listCategories({ brand: 'lootbox' })[0];
  const base = {
    brand: 'lootbox', category_id: category.id, name: 'Tekshiruv tovari <b>qalin</b>', slug: '', tagline: 'Qisqa "tavsif"', description: 'Birinchi qator\n\nIkkinchi <script>alert(1)</script>',
    features: 'Material: sinov', price: '150 000', old_price: '200000', badge_new: true, badge_hit: false, featured: false, visible: true,
    dest_type: 'uzum', uzum_url: 'uzum.uz/uz/product/tekshiruv-777', channel_url: '', dm_username: '', art: '', image_ids: [image.id],
  };
  const bad = await api('/admin/api/products', 'POST', { ...base, name: '', uzum_url: 'javascript:alert(1)', price: '-5' });
  eq(bad.status, 422, 'tovar: xato maydonlar bilan saqlanmaydi');
  const badErrors = (await bad.json()).errors || {};
  ok(badErrors.name && badErrors.uzum_url && badErrors.price, 'tovar: har bir xato maydon ko‘rsatiladi', JSON.stringify(Object.keys(badErrors)));
  eq((await api('/admin/api/products', 'POST', { ...base, brand: 'fit' })).status, 422, 'tovar: kategoriya boshqa brendga tegishli bo‘lsa saqlanmaydi');

  const created = await api('/admin/api/products', 'POST', base);
  eq(created.status, 201, 'tovar: yaratiladi');
  const product = (await created.json()).product;
  const saved = repo.getProduct(product.id);
  eq(saved.price, 150000, 'tovar: narx "150 000" → 150000');
  eq(saved.uzum_url, 'https://uzum.uz/uz/product/tekshiruv-777', 'tovar: havolaga https qo‘shiladi');
  eq(saved.images.length, 1, 'tovar: rasm biriktirildi');

  const page = await (await request(`/tovar/${product.slug}`)).text();
  ok(page.includes('href="https://uzum.uz/uz/product/tekshiruv-777"'), 'sayt: yangi tovar tugmasi kiritilgan Uzum havolasiga olib boradi');
  ok(page.includes(image.url), 'sayt: yuklangan rasm tovar sahifasida');
  ok(page.includes('Tekshiruv tovari &lt;b&gt;qalin&lt;/b&gt;') && !page.includes('<script>alert(1)</script>'), 'sayt: admin kiritgan matn xavfsiz ko‘rsatiladi (XSS yo‘q)');
  ok((await (await request('/')).text()).includes(`/tovar/${product.slug}`), 'sayt: yangi tovar bosh sahifada (Yangi kelganlar)');

  // Yo'nalishni Telegram kanal / lichkaga almashtirish
  const before = { ...repo.getSettings() };
  const settingsRes = await api('/admin/api/settings', 'PUT', { ...before, tg_channel: 't.me/tekshiruv_kanal', tg_dm: '@tekshiruv_sotuvchi' });
  eq(settingsRes.status, 200, 'sozlamalar: saqlanadi');
  eq((await api('/admin/api/settings', 'PUT', { ...before, tg_channel: 'https://evil.example/kanal' })).status, 422, 'sozlamalar: Telegram bo‘lmagan havola rad etiladi');
  await api(`/admin/api/products/${product.id}`, 'PUT', { ...base, dest_type: 'channel', channel_url: 'https://t.me/tekshiruv_kanal/42' });
  ok((await (await request(`/tovar/${product.slug}`)).text()).includes('href="https://t.me/tekshiruv_kanal/42"'), 'sayt: yo‘nalish kanal → tugma post havolasiga olib boradi');
  await api(`/admin/api/products/${product.id}`, 'PUT', { ...base, dest_type: 'dm', dm_username: '' });
  ok((await (await request(`/tovar/${product.slug}`)).text()).includes('href="https://t.me/tekshiruv_sotuvchi?text='), 'sayt: yo‘nalish lichka → tugma lichkaga olib boradi');
  await api('/admin/api/settings', 'PUT', before);

  // Animatsiyalar sozlamasi: standart — har doim to'liq
  ok((await (await request('/')).text()).includes('data-motion="full"'), 'animatsiyalar: standart holatda har doim to‘liq');
  eq((await api('/admin/api/settings', 'PUT', { motion: 'auto' })).status, 200, 'animatsiyalar: «qurilma sozlamasiga qarab» saqlanadi');
  ok((await (await request('/fit')).text()).includes('data-motion="auto"'), 'animatsiyalar: sozlama saytga chiqadi');
  eq((await api('/admin/api/settings', 'PUT', { motion: 'tez' })).status, 422, 'animatsiyalar: noma’lum qiymat rad etiladi');
  await api('/admin/api/settings', 'PUT', { motion: 'full' });

  // Yashirish, nusxalash, tartib, o'chirish
  eq((await api(`/admin/api/products/${product.id}`, 'PATCH', { field: 'visible', value: false })).status, 200, 'tovar: yashiriladi');
  eq((await request(`/tovar/${product.slug}`)).status, 404, 'sayt: yashirilgan tovar ko‘rinmaydi');
  eq((await api(`/admin/api/products/${product.id}`, 'PATCH', { field: 'price', value: 1 })).status, 404, 'tovar: ruxsat etilmagan maydonni tez o‘zgartirib bo‘lmaydi');
  const copy = await api(`/admin/api/products/${product.id}/duplicate`, 'POST');
  eq(copy.status, 201, 'tovar: nusxalanadi');
  const copyId = (await copy.json()).id;
  eq(repo.getProduct(copyId).visible, 0, 'tovar: nusxa yashirin holda yaratiladi');

  const ids = repo.listProducts({ brand: 'lootbox' }).map((item) => item.id);
  const reversed = [...ids].reverse();
  eq((await api('/admin/api/products/reorder', 'POST', { brand: 'lootbox', ids: reversed })).status, 200, 'tovar: tartib saqlanadi');
  eq(repo.listProducts({ brand: 'lootbox' })[0].id, reversed[0], 'tovar: yangi tartib bazada');
  await api('/admin/api/products/reorder', 'POST', { brand: 'lootbox', ids });

  eq((await api(`/admin/api/products/${copyId}`, 'DELETE')).status, 200, 'tovar: nusxa o‘chiriladi');
  eq((await request(image.url)).status, 200, 'rasm: boshqa tovar ishlatayotgan rasm o‘chmaydi');
  eq((await api(`/admin/api/products/${product.id}`, 'DELETE')).status, 200, 'tovar: o‘chiriladi');
  eq((await request(image.url)).status, 404, 'rasm: oxirgi egasi o‘chgach fayl ham o‘chadi');
  eq((await api('/admin/api/products/999999', 'DELETE')).status, 404, 'tovar: yo‘q tovarni o‘chirish 404');

  // Kategoriya va slayd
  const cat = await api('/admin/api/categories', 'POST', { brand: 'fit', name: 'Tekshiruv kategoriyasi', tagline: '', art: 'tee', visible: true });
  eq(cat.status, 201, 'kategoriya: yaratiladi');
  const catId = (await cat.json()).category.id;
  eq((await api('/admin/api/categories', 'POST', { brand: 'fit', name: '', art: 'yoq-chizma' })).status, 422, 'kategoriya: nomsiz saqlanmaydi');
  eq((await api(`/admin/api/categories/${catId}`, 'DELETE')).status, 200, 'kategoriya: o‘chiriladi');
  const slide = await api('/admin/api/slides', 'POST', { brand: 'fit', kicker: 'Sinov', title: 'Tekshiruv slaydi', subtitle: '', cta_label: '', link_type: 'url', link_value: 'javascript:alert(1)', art: 'tee', tone: 'sand', visible: true });
  ok(slide.status === 422 || slide.status === 201, 'slayd: javob beradi', `status ${slide.status}`);
  if (slide.status === 201) {
    const slideId = (await slide.json()).slide.id;
    ok(!(await (await request('/fit')).text()).includes('javascript:alert'), 'slayd: xavfli havola saytga chiqmaydi');
    await api(`/admin/api/slides/${slideId}`, 'DELETE');
  }

  // Demo ma'lumotni o'chirish
  eq((await api('/admin/api/demo/clear', 'POST', {})).status, 200, 'demo: o‘chiriladi');
  eq(repo.demoCounts().products, 0, 'demo: tovarlar qolmadi');
  eq((await request('/')).status, 200, 'demo o‘chgach bosh sahifa ochiladi');

  // ---- Chiqish ------------------------------------------------------------------
  eq((await api('/admin/logout', 'POST', {})).status, 200, 'admin: chiqish');
  eq((await request('/admin', { headers: { Cookie: cookie }, redirect: 'manual' })).status, 302, 'admin: chiqqandan keyin eski cookie ishlamaydi');
  eq((await api('/admin/api/products/1', 'DELETE')).status, 401, 'admin API: chiqqandan keyin 401');

  // ---- Parolni taxmin qilishga cheklov (oxirida: shu jarayonda IP bloklanadi) ------
  let status = 0;
  for (let i = 0; i < 9; i++) status = (await form({ password: `taxmin-${i}` })).status;
  eq(status, 429, 'admin: ko‘p noto‘g‘ri urinishdan keyin vaqtincha bloklanadi');
  eq((await form({ password })).status, 429, 'admin: blok paytida to‘g‘ri parol ham qabul qilinmaydi');
}
