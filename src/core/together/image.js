// Фото: уменьшаем и сжимаем на устройстве (в репозиторий уходит ~100–250 КБ вместо 4 МБ с камеры).
async function decode(file) {
  if (self.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* запасной путь ниже */ } }
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
}
export async function toJpeg(file, max = 1080, quality = 0.82, square = false) {
  const img = await decode(file);
  const w = img.width, h = img.height;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s; }
  const k = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', quality));
}
export const avatarJpeg = (file) => toJpeg(file, 320, 0.85, true);
