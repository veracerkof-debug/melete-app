// Клиент GitHub REST API (только то, что нужно): пользователь, репозиторий, дерево файлов, чтение и запись файлов.
// fetch подставляется (в тестах — фальшивый GitHub). Токен — fine-grained, только на репозиторий данных.
export class GhError extends Error {
  constructor(kind, status, msg) { super(msg || kind); this.kind = kind; this.status = status; }
}
export const b64 = (bytes) => { // Uint8Array → base64 кусками (без переполнения стека)
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromB64 = (s) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
export const utf8 = (s) => new TextEncoder().encode(s);

export class GitHub {
  constructor({ token, owner, repo, branch = null, fetchFn = (...a) => fetch(...a) }) {
    Object.assign(this, { token, owner, repo, branch, f: fetchFn });
    this.base = 'https://api.github.com';
  }
  async req(method, path, { body, headers = {}, raw = false } = {}) {
    let res;
    try {
      res = await this.f(this.base + path, {
        method,
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + this.token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (e) { throw new GhError('network', 0, String(e && e.message || e)); }
    if (res.status === 304) return { status: 304, res };
    if (res.ok) return { status: res.status, res, data: raw ? new Uint8Array(await res.arrayBuffer()) : (res.status === 204 ? null : await res.json()) };
    let msg = ''; try { msg = (await res.json()).message || ''; } catch { /* тело не JSON */ }
    if (res.status === 401) throw new GhError('auth', 401, msg);
    if (res.status === 403 && /rate limit/i.test(msg)) throw new GhError('rate', 403, msg);
    if (res.status === 403) throw new GhError('forbidden', 403, msg);
    if (res.status === 404) throw new GhError('notfound', 404, msg);
    if (res.status === 409 && /empty/i.test(msg)) throw new GhError('empty', 409, msg);
    if (res.status === 409 || res.status === 422) throw new GhError('conflict', res.status, msg);
    throw new GhError('http', res.status, msg || ('HTTP ' + res.status));
  }
  async user() { return (await this.req('GET', '/user')).data; }
  async repoInfo() { return (await this.req('GET', `/repos/${this.owner}/${this.repo}`)).data; }
  // дерево репозитория; etag — чтобы 304 не тратил лимит. Пустой репозиторий → { empty: true }
  async tree(etag) {
    try {
      const r = await this.req('GET', `/repos/${this.owner}/${this.repo}/git/trees/${this.branch || 'HEAD'}?recursive=1`, { headers: etag ? { 'If-None-Match': etag } : {} });
      if (r.status === 304) return { notModified: true };
      return { etag: r.res.headers.get('etag'), tree: (r.data.tree || []).filter((x) => x.type === 'blob') };
    } catch (e) { if (e.kind === 'empty') return { empty: true, tree: [] }; throw e; }
  }
  async blob(sha) { return (await this.req('GET', `/repos/${this.owner}/${this.repo}/git/blobs/${sha}`, { headers: { Accept: 'application/vnd.github.raw+json' }, raw: true })).data; }
  // создать или обновить файл (sha — для обновления); возвращает sha нового содержимого
  async put(path, bytes, message, sha) {
    const r = await this.req('PUT', `/repos/${this.owner}/${this.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      body: { message, content: b64(bytes), ...(sha ? { sha } : {}) }, // ветка — по умолчанию (в пустом репозитории её создаёт сам GitHub)
    });
    return r.data.content.sha;
  }
}
