// Что на главном — один список с галочками (решение автора 2026-10-30: «не могу нормально добавить приложение»):
// поиск, сверху — то, что уже на главном (в его порядке), ниже — папки и приложения по алфавиту, счётчик «n из 7».
// Отметил — встало в конец списка главного, снял — ушло. Полный — касание подсказывает снять одно.
import { prefs, save, HOME_MAX } from './data.js';
import { allApps, homeItems } from './apps.js';
import { folders, folderName, folderKey, folderOfKey } from './folders.js';
import { t } from './i18n.js';
import { h, openSheet, toast } from './ui.js';

const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));

export function pickHome(onChange = () => {}) {
  let q = '';
  openSheet({
    title: t('set.home'), kicker: '', full: true,
    render(body, close) {
      const count = h('p', { class: 'l-hint' });
      const listEl = h('div', { class: 'l-check-list' });
      const toggle = (key, on) => {
        const home = ownHome();
        if (on) home.splice(home.findIndex((x) => x.key === key), 1);
        else if (home.length >= HOME_MAX) { toast(t('home.full', { n: HOME_MAX })); return; }
        else home.push({ key, label: '' });
        save(); onChange(); draw();
      };
      const row = (key, label, sys, on) => h('button', { class: 'l-check' + (on ? ' on' : ''), role: 'checkbox', 'aria-checked': String(on), onclick: () => toggle(key, on) },
        h('span', { class: 'l-check-box', 'aria-hidden': 'true' }),
        h('span', { class: 'l-check-t' }, label, sys && sys !== label ? h('small', { class: 'l-check-sys' }, sys) : null));
      const draw = () => {
        const home = homeItems();
        const ql = q.trim().toLowerCase();
        const match = (...s) => !ql || s.some((x) => (x || '').toLowerCase().includes(ql));
        const onKeys = new Set(home.map((x) => x.key));
        const apps = allApps();
        const mine = home.map((x) => {
          const f = folderOfKey(x.key);
          if (f) return match(folderName(f)) ? row(x.key, folderName(f), t('fold.kicker'), true) : null;
          const a = apps.find((y) => y.key === x.key);
          return a && match(a.label, a.sys) ? row(a.key, a.label, a.sys, true) : null;
        }).filter(Boolean);
        const fs = folders().filter((f) => !onKeys.has(folderKey(f.id)) && match(folderName(f))).map((f) => row(folderKey(f.id), folderName(f), '', false));
        const rest = apps.filter((a) => !onKeys.has(a.key) && match(a.label, a.sys)).map((a) => row(a.key, a.label, a.sys, false));
        count.textContent = t('home.count', { n: home.length, max: HOME_MAX });
        listEl.replaceChildren(...[
          mine.length ? h('div', { class: 'l-check-k' }, t('home.on')) : null, ...mine,
          fs.length ? h('div', { class: 'l-check-k' }, t('home.folders')) : null, ...fs,
          rest.length ? h('div', { class: 'l-check-k' }, t('home.apps')) : null, ...rest,
          !mine.length && !fs.length && !rest.length ? h('p', { class: 'l-empty' }, t('drawer.none')) : null].filter(Boolean));
      };
      body.append(
        h('input', { class: 'l-search', type: 'search', placeholder: t('drawer.search'), 'aria-label': t('drawer.search'), oninput: (e) => { q = e.target.value; draw(); } }),
        count, listEl, h('button', { class: 'l-btn primary', onclick: close }, t('ui.done')));
      draw();
    },
  });
}
