// Чистая веб-версия ученика (vite build --mode student, …/student/): приложение сразу в режиме «Ученик» (блокировка кодом),
// как у настоящего ученика, но без выдуманных данных и без учителя: все уроки открыты, статистика пустая и растёт с занятиями.
// Код блокировки — STUDENT_CODE, показан в приветствии. Данные — в своём хранилище (ns.js). Слово автора 25.11.2026.
import './ns.js';
import '../styles/tokens.css';
import '../styles/base.css';
import '../ui/session.css';
import { boot } from '../core/index.js';
import { loadLang, guessLang } from '../i18n/index.js';
import { installDesk } from '../ui/desk.js';
import '../styles/desk.css';
import '../styles/motion.css';
import '../styles/mono.css';
import { TOS_VER } from '../core/legal.js';
import { profileSeal } from '../core/integrity.js';
import { sha256 } from '../core/integrity.js';
import { t } from '../i18n/index.js';
import { toast } from '../ui/index.js';

const LS = 'practice.v1', STUDENT_CODE = '1234';
const NAME = { ru: 'Ученик', en: 'Student', uz: 'Oʻquvchi' };

installDesk();
function preseed(lang) {
  if (localStorage.getItem(LS)) return;
  const createdAt = Date.now(), salt = '738291046512';
  const profile = { name: NAME[lang] || NAME.en, instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt };
  profile.sig = profileSeal(profile);
  localStorage.setItem(LS, JSON.stringify({ version: 1, songs: [], sessions: [], updatedAt: 0, settings: { configured: true, tosOk: TOS_VER, lang, webHello: true, upOk: 2, profile, goalMin: 120, student: { on: true, salt, hash: sha256('student|' + salt + '|' + STUDENT_CODE), open: [] } } }));
  localStorage.setItem('practice.v1.tools', JSON.stringify({ book: { book: { lvl: 'beginner', sec: 'first', ch: 'g2', mode: 'lessons' } } }));
}
const lang = (() => { const l = (navigator.language || 'ru').slice(0, 2); return l === 'uz' ? 'uz' : l === 'en' ? 'en' : 'ru'; })();
preseed(lang);
loadLang(guessLang()).finally(() => { boot(document.getElementById('app')); setTimeout(() => toast(t('student.hello', { code: STUDENT_CODE })), 1200); });
