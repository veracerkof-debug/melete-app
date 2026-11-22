// Слой данных: локальная копия репозитория + очередь записи.
//  • sync(): одно обращение за деревом файлов (ETag — повтор бесплатный), скачиваются только изменившиеся JSON.
//  • write*(): сразу меняет локальную копию (интерфейс не ждёт сети) и кладёт запись в очередь; flush() отправляет по одной.
//    Сбой сети — запись остаётся в очереди (она переживает перезапуск) и уходит при следующей попытке: отчёт не теряется молча.
import { GhError, utf8 } from './gh.js';

export class Repo {
  constructor({ gh, kv, onChange = () => {} }) {
    Object.assign(this, { gh, kv, onChange });
    this.docs = new Map();     // путь → JSON (только .json)
    this.shas = new Map();     // путь → sha (все файлы, в том числе фото)
    this.etag = null;
    this.queue = [];           // [{ id, path, kind: 'json'|'file', body, message }]
    this.pendingFiles = new Map(); // путь → Blob (фото, ещё не отправленные)
    this.status = { syncing: false, offline: false, authError: false, lastSync: 0, error: null };
    this.urls = new Map();
    this._flushing = null;
  }
  async load() {
    const s = await this.kv.get('repo');
    if (s) { this.docs = new Map(s.docs); this.shas = new Map(s.shas); this.etag = s.etag || null; }
    this.queue = (await this.kv.get('queue')) || [];
    this.queue.forEach((q) => { if (q.kind === 'file') this.pendingFiles.set(q.path, q.body); else this.docs.set(q.path, JSON.parse(q.body)); });
  }
  async _save() { await this.kv.set('repo', { docs: [...this.docs], shas: [...this.shas], etag: this.etag }); }
  async _saveQueue() { await this.kv.set('queue', this.queue); }

  async sync() {
    if (this.status.syncing) return false;
    this.status.syncing = true;
    try {
      const t = await this.gh.tree(this.etag);
      this.status = { ...this.status, offline: false, authError: false, error: null, lastSync: Date.now() };
      if (t.notModified) return false;
      const remote = new Map(t.tree.map((x) => [x.path, x.sha]));
      const need = t.tree.filter((x) => x.path.endsWith('.json') && this.shas.get(x.path) !== x.sha && !this._queued(x.path));
      let changed = false;
      for (let i = 0; i < need.length; i += 6) {
        await Promise.all(need.slice(i, i + 6).map(async (x) => {
          const bytes = await this.gh.blob(x.sha);
          try { this.docs.set(x.path, JSON.parse(new TextDecoder().decode(bytes))); } catch { return; }
          changed = true;
        }));
      }
      for (const [p, sha] of remote) if (!this._queued(p) && this.shas.get(p) !== sha) { this.shas.set(p, sha); changed = true; }
      this.etag = t.etag || null;
      await this._save();
      if (changed) this.onChange();
      return changed;
    } catch (e) { this._fail(e); throw e; }
    finally { this.status.syncing = false; }
  }
  _queued(path) { return this.queue.some((q) => q.path === path); }
  _fail(e) {
    if (e instanceof GhError && e.kind === 'network') this.status.offline = true;
    else if (e instanceof GhError && e.kind === 'auth') this.status.authError = true;
    this.status.error = e.kind || String(e);
  }

  async writeJSON(path, data, message = 'update') {
    this.docs.set(path, data);
    this.queue = this.queue.filter((q) => q.path !== path);
    this.queue.push({ id: path + '@' + Date.now(), path, kind: 'json', body: JSON.stringify(data), message });
    await this._saveQueue(); this.onChange();
    return this.flush();
  }
  async writeFile(path, blob, message = 'photo') {
    this.pendingFiles.set(path, blob);
    this.queue = this.queue.filter((q) => q.path !== path);
    this.queue.push({ id: path + '@' + Date.now(), path, kind: 'file', body: blob, message });
    await this._saveQueue(); this.onChange();
    return this.flush();
  }
  // отправка очереди по порядку; false — что-то осталось (нет сети, ошибка доступа)
  flush() {
    if (this._flushing) return this._flushing;
    // флаг снимается в .finally (после присвоения): при пустой очереди прогон завершается сразу, и снятие флага внутри него залипало бы
    const p = this._flushRun().finally(() => { if (this._flushing === p) this._flushing = null; });
    return (this._flushing = p);
  }
  _flushRun() {
    return (async () => {
      try {
        while (this.queue.length) {
          const q = this.queue[0];
          const bytes = q.kind === 'json' ? utf8(q.body) : new Uint8Array(await q.body.arrayBuffer());
          let sha = null;
          for (let attempt = 0; ; attempt++) {
            try { sha = await this.gh.put(q.path, bytes, q.message, this.shas.get(q.path)); break; }
            catch (e) {
              if (e.kind === 'conflict' && attempt < 3) { // файл изменился или не известен локально — берём свежее дерево
                await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
                this.etag = null; await this._refreshShas(); continue;
              }
              throw e;
            }
          }
          this.shas.set(q.path, sha);
          this.queue.shift(); this.pendingFiles.delete(q.path);
          if (q.kind === 'file') this.urls.delete(q.path);
          await this._saveQueue(); await this._save();
        }
        this.status.offline = false; this.onChange();
        return true;
      } catch (e) { this._fail(e); this.onChange(); return false; }
    })();
  }
  async _refreshShas() {
    const t = await this.gh.tree(null);
    (t.tree || []).forEach((x) => this.shas.set(x.path, x.sha));
  }

  // адрес картинки для <img>: из очереди (ещё не отправлена), из кэша по sha или скачанная с GitHub
  async photoURL(path) {
    if (this.pendingFiles.has(path)) return this._url(path, this.pendingFiles.get(path), 'p');
    const sha = this.shas.get(path);
    if (!sha) return null;
    if (this.urls.get(path)?.sha === sha) return this.urls.get(path).url;
    let blob = await this.kv.get('img:' + sha);
    if (!blob) {
      const bytes = await this.gh.blob(sha);
      blob = new Blob([bytes], { type: 'image/jpeg' });
      await this.kv.set('img:' + sha, blob);
    }
    const url = URL.createObjectURL(blob);
    this.urls.set(path, { sha, url });
    return url;
  }
  _url(path, blob, tag) {
    const cur = this.urls.get(path);
    if (cur?.tag === tag && cur.blob === blob) return cur.url;
    const url = URL.createObjectURL(blob);
    this.urls.set(path, { url, blob, tag });
    return url;
  }
  has(path) { return this.docs.has(path); }
  get(path) { return this.docs.get(path); }
}
