// Учитель и ученик (слово автора 24–25.11.2026, docs/teacher-student.md): задания, пакет «учитель → ученик», отчёт
// «ученик → учитель», маршруты /melete/v1/ts/*. Транспорт — готовая связь телефон ↔ телефон (sync.js: Mesh, DEV).
// Без DOM и без сети: сетевые вызовы получают транспорт H (как в sync.js), данные — в settings.student / settings.classroom.
//   Ученик:  settings.student = { on, salt, hash, open:[инструменты], openLessons:[уроки], tasks:[…], note, teacher:{ key, name, at }, syncedAt }
//   Учитель: settings.classroom = { students: { <addr>: { addr, name, tasks:[…], open:[…], lessons:[…], note, report, reportAt, sentAt } } }
// Ничего не уходит наружу, кроме отчёта учителю, с которым ученик сопряжён сам (его ключ — единственный допущенный).
import { weekReport } from './teacher.js';
import { STUDENT_OPENABLE, studentOn } from './student.js';
import { unpack, planImport, applyImport } from './share.js';
import { GOAL_MIN, GOAL_MAX } from './settings.js';
import { log } from './log.js';

export const VERSION = 1;
export const TASK_MAX = 60, TEXT_MAX = 400, NOTE_MAX = 600;
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const LESSON_ID = /^[fg]\d{1,3}$/;

/* ---------- задания ---------- */
export function newTask(text, { kind = 'free', ref = null, due = 0 } = {}, now = Date.now(), rnd = Math.random) {
  return { id: 't' + now.toString(36) + Math.floor(rnd() * 1296).toString(36), text: clip(text, TEXT_MAX), kind, ref: ref ? clip(ref, 40) : null, due: +due || 0, at: now, done: false, doneAt: 0 };
}
// Задание в пакете: без отметок ученика (они остаются у ученика)
const plain = (t) => ({ id: clip(t.id, 24), text: clip(t.text, TEXT_MAX), kind: ['free', 'lesson', 'song', 'tool'].includes(t.kind) ? t.kind : 'free', ref: t.ref ? clip(t.ref, 40) : null, due: +t.due || 0, at: +t.at || 0 });

/* ---------- учитель: запись ученика и пакет ---------- */
export const emptyStudent = (addr, name = '') => ({ addr, name: clip(name, 40), tasks: [], open: [], lessons: [], note: '', report: null, reportAt: 0, sentAt: 0 });
export function studentOf(settings, addr, name = '') {
  const c = (settings.classroom ||= { students: {} });
  return (c.students[addr] ||= emptyStudent(addr, name));
}
export const studentsOf = (settings) => Object.values((settings.classroom && settings.classroom.students) || {});
export function addTask(rec, text, opts, now) { if (rec.tasks.length >= TASK_MAX) return null; const t = newTask(text, opts, now); rec.tasks.push(t); return t; }
export function removeTask(rec, id) { const n = rec.tasks.length; rec.tasks = rec.tasks.filter((t) => t.id !== id); return rec.tasks.length < n; }
export function toggleOpen(rec, kind, id, on) {
  const key = kind === 'tool' ? 'open' : 'lessons';
  if (kind === 'tool' ? !STUDENT_OPENABLE.includes(id) : !LESSON_ID.test(id)) return false;
  const set = new Set(rec[key]); if (on) set.add(id); else set.delete(id);
  rec[key] = [...set]; return true;
}
// Уроки курса «Гитара с нуля» открываются подряд: первые n (учитель двигает ползунок «+/−»)
// Порядок курса «Гитара с нуля» (должен совпадать с PATHS.guitar в modules/book/book/lessons.js — это проверяет tests/classroom.test.js)
export const COURSE_PATH = ['g2', 'g1', 'g3', 'g4', 'g32', 'g5', 'g7', 'g23', 'g33', 'g13', 'g9', 'g10', 'g24', 'g34', 'g35', 'g36', 'g14', 'g15', 'g19', 'g20', 'g37', 'g38', 'g39', 'g28', 'g40', 'g29', 'g31', 'g41', 'g30', 'g42', 'g18', 'g26', 'g27', 'g43', 'g44', 'g45', 'g21', 'g22', 'g46', 'g47', 'g48', 'g49'];
export const COURSE_LESSONS = COURSE_PATH.length;
export function setLessons(rec, n) { n = Math.max(0, Math.min(COURSE_LESSONS, Math.round(+n) || 0)); rec.lessons = COURSE_PATH.slice(0, n); return n; }
export const lessonsCount = (rec) => rec.lessons.filter((x) => /^g\d+$/.test(x)).length;
// Песни из заданий-«песен»: файл `.melete` обычным JSON (share.js) — ученик принимает его теми же правилами, что присланный файл
export const SONGS_MAX = 40;
export function shareOf(rec, songs) {
  const ids = [...new Set(rec.tasks.filter((t) => t.kind === 'song' && t.ref).map((t) => t.ref))].slice(0, SONGS_MAX);
  const list = ids.map((id) => songs.find((x) => x.id === id)).filter(Boolean).map((x) => ({ ref: x.id, title: x.title, artist: x.artist || '', genre: x.genre || '', key: x.key || '', targetBpm: x.targetBpm || x.currentBpm || 0, notes: x.notes || '', capo: x.capo || 0 }));
  return list.length ? { format: 'melete', v: 1, songs: list } : null;
}
export const packOf = (rec, songs = []) => ({ v: VERSION, tasks: rec.tasks.map(plain), open: { tools: [...rec.open], lessons: [...rec.lessons] }, note: clip(rec.note, NOTE_MAX), goal: Math.round(+rec.goal) || 0, share: shareOf(rec, songs) });
// Новое задание-ссылка открывает то, что нужно: урок — и сам урок, инструмент — и сам инструмент
export function openFor(rec, task) {
  if (task.kind === 'lesson' && /^g\d+$/.test(task.ref || '')) { const n = COURSE_PATH.indexOf(task.ref) + 1; if (n > 0) { if (n > lessonsCount(rec)) setLessons(rec, n); } else toggleOpen(rec, 'lesson', task.ref, true); }
  if (task.kind === 'tool' && task.ref) toggleOpen(rec, 'tool', task.ref, true);
}

/* ---------- ученик ---------- */
// Учитель сопрягается сам: ключ первого сопряжённого, пока открыто окно сопряжения, запоминается как «учитель»
export function bindTeacher(settings, key, name, now = Date.now()) {
  const s = settings.student;
  if (!s || !s.on || !key || s.teacher) return false; // второго учителя нет: сменить можно только сняв блокировку кодом
  s.teacher = { key, name: clip(name, 40), at: now };
  return true;
}
export const teacherKey = (settings) => (studentOn(settings) && settings.student.teacher ? settings.student.teacher.key : '');
export function unbindTeacher(settings) { if (settings.student) { delete settings.student.teacher; } }

// Принять пакет: учитель главный — задания, открытое и заметка заменяются; отметки «выполнено» ученика сохраняются
export function applyPack(settings, pack, now = Date.now()) {
  const s = settings.student;
  if (!s || !s.on) return { ok: false, why: 'off' };
  if (!pack || pack.v !== VERSION || !Array.isArray(pack.tasks)) return { ok: false, why: 'format' };
  const old = new Map((s.tasks || []).map((t) => [t.id, t])), seen = new Set(), tasks = [];
  for (const raw of pack.tasks.slice(0, TASK_MAX)) {
    if (!raw || typeof raw.id !== 'string' || !raw.id || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const t = plain(raw), prev = old.get(t.id);
    tasks.push({ ...t, done: !!(prev && prev.done), doneAt: prev ? prev.doneAt || 0 : 0 });
  }
  const o = pack.open || {};
  s.tasks = tasks;
  s.open = (Array.isArray(o.tools) ? o.tools : []).filter((x) => STUDENT_OPENABLE.includes(x));
  s.openLessons = (Array.isArray(o.lessons) ? o.lessons : []).filter((x) => typeof x === 'string' && LESSON_ID.test(x)).slice(0, 300);
  s.note = clip(pack.note, NOTE_MAX);
  s.syncedAt = now;
  const g = Math.round(+pack.goal);
  if (g >= GOAL_MIN && g <= GOAL_MAX) settings.goalMin = g; // цель недели от учителя
  const fresh = tasks.filter((t) => !old.has(t.id));
  return { ok: true, tasks: tasks.length, added: fresh.length, first: fresh[0] ? fresh[0].text : '' };
}
export function markDone(settings, id, done = true, now = Date.now()) {
  const t = ((settings.student && settings.student.tasks) || []).find((x) => x.id === id);
  if (!t) return false;
  t.done = !!done; t.doneAt = done ? now : 0; return true;
}
// Ученику без учителя все уроки видны; с учителем — уроки «Гитары с нуля» только открытые им (первый — по решению учителя)
export const lessonOpen = (settings, id) => !studentOn(settings) || !settings.student.teacher || !/^g\d+$/.test(id) || (settings.student.openLessons || []).includes(id); // запирается курс «Гитара с нуля»; «Первые шаги» открыты
export const homework = (settings) => ((settings.student && settings.student.tasks) || []).filter((t) => !t.done);

// Что видит учитель: неделя занятий, песни и темп, выполненные задания (то же показывается ученику — «Учитель видит…»)
export function reportOf(settings, sessions, songs, now = Date.now()) {
  const w = weekReport(sessions, songs, settings, now), s = settings.student || {};
  return { v: VERSION, at: now, ws: w.ws, per: w.per, total: w.total, goal: w.goal, songs: w.songs.slice(0, 20).map(({ title, sec, from, to }) => ({ title: clip(title, 80), sec, from, to })), tasks: (s.tasks || []).map((t) => ({ id: t.id, done: !!t.done, doneAt: t.doneAt || 0 })) };
}
// Учитель принимает отчёт: сохраняет и обновляет отметки в своих заданиях
export function mergeReport(rec, report, now = Date.now()) {
  if (!report || report.v !== VERSION) return false;
  rec.report = { at: report.at || now, ws: report.ws, per: report.per, total: report.total, goal: report.goal, songs: report.songs || [] };
  rec.reportAt = now;
  const done = new Map((report.tasks || []).map((t) => [t.id, t]));
  rec.tasks.forEach((t) => { const d = done.get(t.id); if (d) { t.done = !!d.done; t.doneAt = d.doneAt || 0; } });
  return true;
}
export const tasksLeft = (rec) => rec.tasks.filter((t) => !t.done).length;

// Песни учителя → в песни ученика (дубль по названию и исполнителю обновляется, а не множится)
export async function applyShare(app, share) {
  const u = unpack(new TextEncoder().encode(JSON.stringify(share))), plan = planImport(app.store.state.songs || [], u.manifest);
  const r = await applyImport({ store: app.store, files: null, unpacked: u, plan, set: false, quotes: false, profile: false });
  return r.added + r.updated;
}

/* ---------- маршруты ученика: /melete/v1/ts/* ---------- */
// app.store.state.settings, app.store.state.sessions / songs. peer: { key, name }. Допущен только сопряжённый учитель.
export async function tsHandle(app, path, json, peer, now = Date.now()) {
  const st = app.store.state, settings = st.settings;
  if (!studentOn(settings)) return { status: 409, json: { error: 'off' } };
  const tk = teacherKey(settings);
  if (path === '/melete/v1/ts/hello') return { status: 200, json: { role: 'student', name: clip((settings.profile && settings.profile.name) || '', 40), teacher: !!tk && tk === peer.key } };
  if (!tk || tk !== peer.key) return { status: 403, json: { error: 'teacher' } }; // чужое устройство отчёт не получает
  if (path === '/melete/v1/ts/report') return { status: 200, json: reportOf(settings, st.sessions || [], st.songs || [], now) };
  if (path === '/melete/v1/ts/pack') {
    const r = applyPack(settings, json, now);
    if (!r.ok) return { status: r.why === 'off' ? 409 : 400, json: { error: r.why } };
    let songs = 0;
    if (json.share) { try { songs = await applyShare(app, json.share); } catch (e) { log('sync', 'песни от учителя не приняты: ' + (e && e.message), 'w'); } }
    app.store.settingsChanged();
    if (app.render) app.render();
    if (r.added && app.notifyNew) app.notifyNew(r.added, r.first); // «Новое задание от учителя»
    return { status: 200, json: { ok: true, tasks: r.tasks, added: r.added, songs } };
  }
  if (path === '/melete/v1/ts/bye') { unbindTeacher(settings); app.store.settingsChanged(); if (app.render) app.render(); return { status: 200, json: { ok: true } }; } // учитель отпустил ученика
  return { status: 404, json: {} };
}

/* ---------- учитель: вызовы к ученику (H — транспорт sync.js: http) ---------- */
export async function pullReport(app, dev, H, now = Date.now()) {
  const settings = app.store.state.settings, rec = studentOf(settings, dev.addr, dev.name);
  const r = await H('POST', dev.addr + '/melete/v1/ts/report', { key: dev.key, json: {} });
  if (!mergeReport(rec, r, now)) throw Object.assign(new Error('format'), { reason: 'format' });
  app.store.settingsChanged();
  return rec;
}
export async function pushPack(app, dev, H, now = Date.now()) {
  const settings = app.store.state.settings, rec = studentOf(settings, dev.addr, dev.name);
  const r = await H('POST', dev.addr + '/melete/v1/ts/pack', { key: dev.key, json: packOf(rec, app.store.state.songs || []) });
  if (!r || !r.ok) throw Object.assign(new Error('pack'), { reason: 'off' });
  rec.sentAt = now;
  app.store.settingsChanged();
  return rec;
}

// Отпустить ученика: сказать ему (если на связи) и забыть у себя; ученик снова может сопрягаться с любым учителем
export async function releaseStudent(app, dev, H) {
  try { await H('POST', dev.addr + '/melete/v1/ts/bye', { key: dev.key, json: {}, timeout: 5000 }); } catch { /* ученика нет в сети — отвяжется кодом на его телефоне */ }
  const c = app.store.state.settings.classroom; if (c && c.students) delete c.students[dev.addr];
  app.store.settingsChanged();
}
// Сводка для главной учителя: ученики с неделей и заданиями
export const summaryOf = (settings) => studentsOf(settings).map((r) => ({ addr: r.addr, name: r.name, total: r.report ? r.report.total : null, left: tasksLeft(r), at: r.reportAt })).sort((a, b) => b.left - a.left);
