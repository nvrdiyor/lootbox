// Hero slaydiga rasm yuklanmagan bo'lsa, u qaysi tovar rasmlarini ko'rsatishi shu yerda hal qilinadi.
// Sayt (3D sahna) ham, admin panel (ro'yxatdagi kichik rasm) ham shu qoidadan foydalanadi.

/**
 * Slayd uchun rasmlar (ko'pi bilan `limit` ta):
 *   - tovarga bog'langan va o'sha tovarda rasm bor — tovarning o'z rasmlari; joy qolsa, ortiga shu
 *     kategoriyadagi boshqa tovarlarning muqovalari qo'shiladi (sahna bo'sh ko'rinmasligi uchun);
 *   - kategoriyaga bog'langan — undagi rasmli tovarlarning muqovalari (kategoriyada rasm bo'lmasa — bo'sh);
 *   - qolgan hollarda — bo'limning birinchi rasmli tovarlari muqovalari.
 * Bo'sh ro'yxat qaytsa, slayd chizma belgini ko'rsatadi.
 * @param {{ link_type: string, link_value: string }} slide
 * @param {Array} products  shu bo'limning saytda ko'rinadigan tovarlari, saytdagi tartibda
 */
export function slidePhotos(slide, products, limit = 3) {
  const covers = (list) => list.filter((item) => item.images.length).map((item) => item.images[0]);
  if (slide.link_type === 'product') {
    const product = products.find((item) => String(item.id) === String(slide.link_value));
    if (product?.images.length) {
      const siblings = product.category_id
        ? products.filter((item) => item.id !== product.id && item.category_id === product.category_id)
        : [];
      return [...product.images, ...covers(siblings)].slice(0, limit);
    }
  }
  const pool = slide.link_type === 'category'
    ? products.filter((item) => String(item.category_id) === String(slide.link_value))
    : products;
  return covers(pool).slice(0, limit);
}
