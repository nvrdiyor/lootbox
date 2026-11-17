// Baza sxemasi. Yangi o'zgarish kerak bo'lsa massiv OXIRIGA yangi SQL qo'shing —
// eski elementlarni o'zgartirmang (bazadagi user_version shu tartibga tayanadi).
//
// *_ru ustunlari — rus tili uchun joy. Hozir bo'sh; rus tili yoqilganda to'ldiriladi.

export const BRANDS = ['lootbox', 'fit'];
export const DEST_TYPES = ['default', 'uzum', 'channel', 'dm'];
export const LINK_TYPES = ['catalog', 'category', 'product', 'url'];

export const MIGRATIONS = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file TEXT NOT NULL UNIQUE,
    thumb TEXT NOT NULL,
    mime TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bytes INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL CHECK (brand IN ('lootbox','fit')),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ru TEXT,
    tagline TEXT NOT NULL DEFAULT '',
    tagline_ru TEXT,
    art TEXT NOT NULL DEFAULT 'box',
    image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (brand, slug)
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL CHECK (brand IN ('lootbox','fit')),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ru TEXT,
    tagline TEXT NOT NULL DEFAULT '',
    tagline_ru TEXT,
    description TEXT NOT NULL DEFAULT '',
    description_ru TEXT,
    features TEXT NOT NULL DEFAULT '',
    features_ru TEXT,
    price INTEGER,
    old_price INTEGER,
    badge_new INTEGER NOT NULL DEFAULT 0,
    badge_hit INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    dest_type TEXT NOT NULL DEFAULT 'default' CHECK (dest_type IN ('default','uzum','channel','dm')),
    uzum_url TEXT NOT NULL DEFAULT '',
    channel_url TEXT NOT NULL DEFAULT '',
    dm_username TEXT NOT NULL DEFAULT '',
    art TEXT NOT NULL DEFAULT '',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX products_brand_idx ON products (brand, visible, sort);
  CREATE INDEX products_category_idx ON products (category_id);

  CREATE TABLE product_images (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, image_id)
  ) WITHOUT ROWID;
  CREATE INDEX product_images_image_idx ON product_images (image_id);

  CREATE TABLE slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL CHECK (brand IN ('lootbox','fit')),
    kicker TEXT NOT NULL DEFAULT '',
    kicker_ru TEXT,
    title TEXT NOT NULL,
    title_ru TEXT,
    subtitle TEXT NOT NULL DEFAULT '',
    subtitle_ru TEXT,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_label_ru TEXT,
    link_type TEXT NOT NULL DEFAULT 'catalog' CHECK (link_type IN ('catalog','category','product','url')),
    link_value TEXT NOT NULL DEFAULT '',
    image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    art TEXT NOT NULL DEFAULT 'box',
    tone TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    csrf TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    user_agent TEXT NOT NULL DEFAULT ''
  ) WITHOUT ROWID;

  CREATE TABLE stats_daily (
    day TEXT NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, product_id, kind)
  ) WITHOUT ROWID;
  `,
  // Kichik nusxaning haqiqiy kengligi (px). Bo'sh bo'lsa — eski qoida: uzun tomoni 800 px gacha.
  // Uzum rasm serveridan olingan kichik nusxalar 800 px kenglikda keladi, shuning uchun aniq yoziladi.
  `
  ALTER TABLE images ADD COLUMN thumb_width INTEGER;
  `,
  // Fonsiz (shaffof joylari bor) rasm: tovarning o'zi kesib olingan. Sayt bunday rasmni kesmaydi va
  // ustiga fon rangi bermaydi — kartochka foni ustida "suzib" turadi.
  `
  ALTER TABLE images ADD COLUMN cutout INTEGER NOT NULL DEFAULT 0;
  `,
  // Qidiruv tizimlari uchun (SEO). search_terms — odamlar shu tovarni qanday nomlar bilan qidirishi (vergul bilan),
  // meta_title / meta_description — qidiruv natijasida chiqadigan sarlavha va tavsif, intro — kategoriya sahifasidagi
  // kirish matni. Bo'sh bo'lsa sayt ularni o'zi tuzadi (server/site/seo.js).
  `
  ALTER TABLE products ADD COLUMN search_terms TEXT NOT NULL DEFAULT '';
  ALTER TABLE products ADD COLUMN meta_title TEXT NOT NULL DEFAULT '';
  ALTER TABLE products ADD COLUMN meta_description TEXT NOT NULL DEFAULT '';
  ALTER TABLE categories ADD COLUMN search_terms TEXT NOT NULL DEFAULT '';
  ALTER TABLE categories ADD COLUMN meta_title TEXT NOT NULL DEFAULT '';
  ALTER TABLE categories ADD COLUMN meta_description TEXT NOT NULL DEFAULT '';
  ALTER TABLE categories ADD COLUMN intro TEXT NOT NULL DEFAULT '';
  `,
  // LOOTBOX bosh sahifasining boshlang'ich sarlavha va tavsifi odamlar qidiradigan so'zlar bilan yangilanadi
  // (skeyt, kovrik). Faqat egasi admin panelda o'zgartirmagan bo'lsa: eski boshlang'ich matn turgan bo'lsagina.
  `
  UPDATE settings SET value = 'LOOTBOX — gaming aksessuarlari: skeytlar, kovriklar, switchlar'
    WHERE key = 'seo_title_lootbox' AND value = 'LOOTBOX — texnika va gaming aksessuarlari';
  UPDATE settings SET value = 'Sichqoncha skeytlari (glaydlar), kovriklar, mexanik klaviatura switchlari va grip stikerlar. O‘zbekiston bo‘ylab Uzum Market orqali yetkazib beriladi. Скейты и коврики для мыши, свитчи, грипсы.'
    WHERE key = 'seo_desc_lootbox' AND value = 'Sichqoncha glaydlari, mexanik klaviatura switchlari, gilamchalar va grip stikerlar. Uzum Market orqali yetkazib beriladi.';
  `,
];
