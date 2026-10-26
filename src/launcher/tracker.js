// Чтение Библии на сегодня (церковный режим, план из Melete) и практика за неделю — по данным моста с Melete,
// теми же функциями ядра Melete (reading.js, bible.js, stats.js, integrity.js): цифры совпадают с Melete.
import { readingFor, planOf } from '../core/reading.js';
import { refText } from '../core/bible.js';
import { weekData, goalProgress } from '../core/stats.js';
import { splitVerified } from '../core/integrity.js';
import { meleteBridge, meleteLive, demoLive } from './melete.js';
import { isChurch } from './data.js';
import { isNative } from './native.js';

// null — мост не подключён. Живое состояние Melete (рассылка, docs/launcher-bridge.md) свежее файла папки:
// неделя и чтение — из него, если пришло; плашка «идёт занятие / играет» — только из него
export function trackerData(now = new Date()) {
  const d = meleteBridge()?.data;
  const lv0 = meleteLive();
  const lv = lv0?.demo ? null : lv0; // пример браузера — только в demoData
  if (!d && !lv) return isNative() ? null : demoData(now); // в браузере без Melete — пример, чтобы видеть вид

  const out = { reading: null, practice: null, live: null };
  if (isChurch()) {
    if (lv?.reading !== undefined) out.reading = lv.reading || { none: true };
    else if (d) {
      const b = d.bible || {};
      const plan = b.plan ? planOf(b) : null;
      const r = plan ? readingFor(b, now) : null;
      out.reading = !plan ? { none: true } : !r ? { idle: true } : { ref: refText(r.keys), done: r.done, total: r.keys.length, day: r.day, days: r.days };
    }
  }
  if (lv?.week) {
    const w = lv.week;
    out.practice = { total: w.total || 0, per: w.per || Array(7).fill(0), goal: w.goal || 18000, progress: (w.total || 0) / Math.max(1, w.goal || 18000) };
  } else if (d) {
    const ok = splitVerified(d.sessions || [], now.getTime()).ok; // только подтверждённые — как в статистике Melete
    const w = weekData(ok, now.getTime());
    out.practice = { total: w.total, per: w.per, goal: d.goal.goalMin * 60, progress: goalProgress(w.total, d.goal) };
  }
  out.live = liveOf(lv);
  return out;
}

// плашка: занятие идёт или Melete звучит
function liveOf(lv) {
  if (!lv || (!lv.session && !lv.sounding)) return null;
  return { start: lv.session?.start || null, title: lv.session?.title || '', what: lv.what || '', playing: !!lv.playing, session: !!lv.session };
}

// пример для веб-версии: неделя занятий, идущее занятие, чтение дня
function demoData(now) {
  const wd = (now.getDay() + 6) % 7;
  const per = [3600, 2700, 0, 4500, 1800, 0, 0].map((v, i) => (i < wd ? v : i === wd ? 1500 : 0));
  const total = per.reduce((a, b) => a + b, 0);
  return {
    demo: true,
    reading: isChurch() ? { ref: 'Быт 36–39', done: 2, total: 4, day: 12, days: 365 } : null,
    practice: { total, per, goal: 5 * 3600, progress: total / (5 * 3600) },
    live: liveOf(demoLive(now.getTime())),
  };
}

// 3 ч 15 мин — единицы из словаря
export function fmtDur(sec, t) {
  const m = Math.round(sec / 60);
  if (m < 60) return t('dur.m', { m });
  const h = Math.floor(m / 60), r = m % 60;
  return r ? t('dur.hm', { h, m: r }) : t('dur.h', { h });
}
