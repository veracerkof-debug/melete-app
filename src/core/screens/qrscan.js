// Сканер QR-кода камерой (слово автора 06.11.2026, пункт 5: подключение к компьютеру по QR — быстро и без ввода).
// Камера — только здесь и только пока открыта шторка; кадры не сохраняются и никуда не уходят. Распознавание —
// BarcodeDetector системы (Android WebView, Chrome), где его нет — jsQR (Apache-2.0) в самом приложении.
import { t } from '../../i18n/index.js';
import { sheet, snav, esc } from '../../ui/index.js';
import { logErr } from '../log.js';

// Код сопряжения на экране компьютера: MELETE-PAIR;a=<адрес>;c=<код>;f=<начало отпечатка>
export const pairPayload = (addr, code, fp = '') => 'MELETE-PAIR;a=' + addr + ';c=' + code + (fp ? ';f=' + fp.slice(0, 16) : '');
export function parsePair(text) {
  const s = String(text || '').trim();
  if (!s.startsWith('MELETE-PAIR;')) return null;
  const o = Object.fromEntries(s.split(';').slice(1).map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
  if (!o.a || !/^\d{6}$/.test(o.c || '')) return null;
  return { addr: o.a, code: o.c, fp: /^[0-9a-f]{4,64}$/.test(o.f || '') ? o.f : '' };
}

// Открыть камеру и ждать код; accept(text) — подходит ли (иначе ищет дальше). → Promise<string|null>
export function scanQR(accept = () => true) {
  return new Promise((resolve) => {
    let stream = null, raf = 0, done = false, det = null, jsqr = null, last = 0;
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    const finish = (v, api) => { if (done) return; done = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((x) => x.stop()); if (api) api.close(); resolve(v); };
    const api = sheet(() => snav(t('qr.title')) + '<div class="qrcam"><video playsinline muted autoplay></video><i class="qrframe" aria-hidden="true"></i></div><p class="ftr qrmsg">' + esc(t('qr.hint')) + '</p>', (el) => {
      const video = el.querySelector('video'), msg = el.querySelector('.qrmsg');
      const look = async () => {
        if (done) return;
        raf = requestAnimationFrame(look);
        const now = performance.now();
        if (now - last < 160 || video.readyState < 2) return;
        last = now;
        try {
          let text = null;
          if (det) { const r = await det.detect(video); text = r && r[0] ? r[0].rawValue : null; }
          else {
            const w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 640 / Math.max(w, h));
            cv.width = Math.round(w * k); cv.height = Math.round(h * k);
            cx.drawImage(video, 0, 0, cv.width, cv.height);
            if (!jsqr) jsqr = (await import('jsqr')).default;
            const img = cx.getImageData(0, 0, cv.width, cv.height), r = jsqr(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            text = r ? r.data : null;
          }
          if (text && accept(text)) finish(text, api);
          else if (text) msg.textContent = t('qr.other');
        } catch (e) { logErr('qr', e); }
      };
      (async () => {
        try {
          if ('BarcodeDetector' in window) { try { const f = await window.BarcodeDetector.getSupportedFormats(); if (f.includes('qr_code')) det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { det = null; } }
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
          if (done) { stream.getTracks().forEach((x) => x.stop()); return; }
          video.srcObject = stream;
          await video.play().catch(() => {});
          look();
        } catch (e) { logErr('qr', e); msg.textContent = t('qr.noCam'); }
      })();
    }, { onClose: () => finish(null) });
  });
}
