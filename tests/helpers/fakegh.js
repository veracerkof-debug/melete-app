// Фальшивый GitHub для тестов и сквозных проверок: хранит репозитории в памяти и отвечает на те же запросы, что и клиент.
import { createHash } from 'node:crypto';
const blobSha = (buf) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');

export class FakeGitHub {
  constructor() { this.repos = new Map(); this.tokens = new Map(); this.log = []; this.down = false; this.failPut = 0; this.rev = 0; }
  addUser(token, login) { this.tokens.set(token, { login, id: login.length, avatar_url: '' }); }
  addRepo(full, { collaborators = [] } = {}) { this.repos.set(full, { files: new Map(), blobs: new Map(), collaborators, empty: true, rev: 0 }); }
  files(full) { return this.repos.get(full).files; }
  readJSON(full, path) { const f = this.files(full).get(path); return f ? JSON.parse(this.repos.get(full).blobs.get(f).toString('utf8')) : null; }
  // fetch-совместимый обработчик
  fetch = async (url, init = {}) => {
    const u = new URL(url); const method = (init.method || 'GET').toUpperCase();
    this.log.push(method + ' ' + u.pathname);
    const json = (status, obj, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });
    if (this.down) throw new TypeError('network down');
    const auth = (init.headers?.Authorization || '').replace('Bearer ', '');
    const user = this.tokens.get(auth);
    if (!user) return json(401, { message: 'Bad credentials' });
    if (u.pathname === '/user') return json(200, user);
    const m = /^\/repos\/([^/]+\/[^/]+)(\/.*)?$/.exec(u.pathname);
    if (!m) return json(404, { message: 'Not Found' });
    const r = this.repos.get(m[1]);
    const owner = m[1].split('/')[0];
    if (!r || (user.login !== owner && !r.collaborators.includes(user.login))) return json(404, { message: 'Not Found' });
    const rest = m[2] || '';
    if (!rest) return json(200, { full_name: m[1], private: true, default_branch: 'main', permissions: { push: true } });
    if (rest.startsWith('/git/trees/')) {
      if (r.empty) return json(409, { message: 'Git Repository is empty.' });
      const etag = `"r${r.rev}"`;
      if (init.headers?.['If-None-Match'] === etag) return new Response(null, { status: 304, headers: { etag } });
      return json(200, { tree: [...r.files].map(([path, sha]) => ({ path, sha, type: 'blob' })) }, { etag });
    }
    if (rest.startsWith('/git/blobs/')) {
      const b = r.blobs.get(rest.slice(11));
      return b ? new Response(b, { status: 200 }) : json(404, { message: 'Not Found' });
    }
    if (rest.startsWith('/contents/') && method === 'PUT') {
      if (this.failPut > 0) { this.failPut--; return json(500, { message: 'boom' }); }
      const path = decodeURIComponent(rest.slice(10));
      const body = JSON.parse(init.body);
      const cur = r.files.get(path);
      if (cur && body.sha !== cur) return json(409, { message: `${path} does not match ${cur}` });
      if (!cur && body.sha) return json(422, { message: 'Invalid request' });
      const buf = Buffer.from(body.content, 'base64'); const sha = blobSha(buf);
      r.blobs.set(sha, buf); r.files.set(path, sha); r.empty = false; r.rev++;
      return json(cur ? 200 : 201, { content: { path, sha }, commit: { sha: 'c' + r.rev } });
    }
    return json(404, { message: 'Not Found' });
  };
}
