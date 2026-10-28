// Пакеты моделей (модульность, шаг 2; DECISIONS 2026-10-28): тяжёлое (полный рояль, вокал телефона) не встроено в APK,
// а скачивается по кнопке из релиза packs — один раз, дальше всё без сети. Опись — build/packs.json (build/packs.mjs):
// у каждого файла sha256 и размер, устройство сверяет их при распаковке. Какие пакеты вынуты из этой сборки — __PACKED__
// (vite.config.js по MELETE_TARGET); у себя и в вебе всё встроено или не нужно — пакетов нет, hasPack() = true.
// Android — плагин Packs (PacksPlugin.java): files/packs/<id>/<путь>, страница читает по Capacitor.convertFileSrc.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { list as LIST } from '../../build/packs.json';
import { log } from './log.js';

export const PACK_URL = 'https://github.com/veracerkof-debug/melete-app/releases/download/packs/';
const PACKED = typeof __PACKED__ !== 'undefined' ? __PACKED__ : [];
const Native = PACKED.length && Capacitor.getPlatform() === 'android' ? registerPlugin('Packs') : null;

const meta = (id) => LIST.find((p) => p.id === id);
let dir = '', have = {}, net = { metered: false, free: null };
const state = {}; // id → { stage: get | check | fail | cancel, got, total, err }
const subs = new Set();
const emit = () => subs.forEach((fn) => { try { fn(); } catch { /* */ } });
export const onPacks = (fn) => { subs.add(fn); return () => subs.delete(fn); };

// Пакеты этой сборки (то, что можно скачать и удалить)
export const packList = () => LIST.filter((p) => PACKED.includes(p.id));
export const packMeta = meta;
export const isPacked = (id) => PACKED.includes(id);
// Есть ли то, что лежит в пакете: встроено в сборку или пакет скачан нужной версии
export const hasPack = (id) => !PACKED.includes(id) || (!!meta(id) && have[id] === meta(id).v);
export const packState = (id) => state[id] || null;
export const packNet = () => net;
// Пакет, которому принадлежит файл (путь как в сборке: models/piano/A0v1.ogg), — среди вынутых из сборки
const packOf = (rel) => packList().find((p) => p.dirs.some((d) => rel.startsWith(d)));
// Адрес файла для страницы: из скачанного пакета или из сборки
export function packUrl(rel) {
  const p = packOf(rel);
  if (p && Native && hasPack(p.id) && dir) return Capacitor.convertFileSrc(dir + '/' + p.id + '/' + rel);
  return new URL(rel, typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').href;
}

async function refresh() {
  if (!Native) return;
  try {
    const r = await Native.list();
    dir = r.dir || ''; have = r.have || {}; net = { metered: !!r.metered, free: r.free ?? null };
  } catch (e) { log('packs', 'список: ' + (e && e.message)); }
}

const files = () => import('../../build/packs.json').then((m) => m.files);

// Модель вокала прежних версий (files/models/mdx/vocals.onnx — копия при первом разделении) — в пакет без скачивания
async function adoptOld() {
  const p = meta('vocals');
  if (!Native || !p || !PACKED.includes('vocals') || hasPack('vocals')) return;
  try {
    const r = await Native.adopt({ id: 'vocals', v: p.v, files: (await files()).vocals });
    if (r && r.ok) { log('packs', 'вокал: модель прежней версии перенесена в пакет'); await refresh(); }
  } catch (e) { log('packs', 'перенос вокала: ' + (e && e.message)); }
}

let ready = null;
export function packsReady() {
  if (ready) return ready;
  ready = (async () => {
    if (!Native) return;
    Native.addListener('progress', (e) => {
      if (!e || !e.id) return;
      if (e.stage === 'done') {
        delete state[e.id];
        log('packs', e.id + ': готово');
        refresh().then(emit);
        return;
      }
      state[e.id] = { stage: e.stage, got: e.got || 0, total: e.total || (meta(e.id) || {}).bytes || 0, err: e.err || '' };
      if (e.stage === 'fail' || e.stage === 'cancel') log('packs', e.id + ': ' + e.stage + (e.err ? ' — ' + e.err : ''));
      emit();
    });
    await refresh();
    await adoptOld();
    log('packs', packList().map((p) => p.id + (hasPack(p.id) ? ' есть' : ' нет')).join(', '));
  })();
  return ready;
}

// Скачать пакет (повторный вызов во время скачивания — ничего не делает)
export async function downloadPack(id) {
  const p = meta(id);
  if (!Native || !p) throw new Error('packs');
  await packsReady();
  state[id] = { stage: 'get', got: 0, total: p.bytes, err: '' };
  emit();
  try {
    await Native.download({ id, url: PACK_URL + id + '.tar', bytes: p.bytes, v: p.v, files: (await files())[id] });
    log('packs', id + ': скачивание' + (net.metered ? ' (мобильная сеть)' : ''));
  } catch (e) { state[id] = { stage: 'fail', got: 0, total: p.bytes, err: String(e && e.message) }; emit(); throw e; }
}
export async function cancelPack(id) { if (Native) await Native.cancel({ id }); }
export async function removePack(id) {
  if (!Native) return;
  await Native.remove({ id });
  delete state[id];
  log('packs', id + ': удалён');
  await refresh();
  emit();
}
// Сеть и место — перед скачиванием (страница спрашивает про мобильную сеть)
export async function packCheck() { await refresh(); return net; }
