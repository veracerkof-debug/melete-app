// Главный экран: выбор значка и действия (общие для значков внизу и жестов).
import { iconsFor, iconSVG } from './icons.js';
import { commandsFor, LINK_PRESETS } from './actions.js';
import { allApps } from './apps.js';
import { isChurch } from './data.js';
import { t } from './i18n.js';
import { h, openSheet, segmented, field } from './ui.js';

export function pickIcon(current, onPick) {
  const church = isChurch();
  let q = '';
  openSheet({
    title: t('pick.icon'), kicker: church ? 'εἰκών' : '', full: true,
    render(body, close) {
      const grid = h('div', { class: 'l-icon-grid' });
      const fill = () => {
        grid.replaceChildren();
        const ql = q.trim().toLowerCase();
        iconsFor(church).filter((i) => !ql || [t('icon.' + i.id), i.el, i.id].some((s) => s.toLowerCase().includes(ql)))
          .forEach((i) => grid.append(h('button', { class: `l-icon-cell ${i.id === current ? 'on' : ''}`, 'aria-label': t('icon.' + i.id), onclick: () => { onPick(i.id); close(); } },
            h('span', { html: iconSVG(i.id) }), church ? h('b', { lang: 'el' }, i.el) : null, h('small', {}, t('icon.' + i.id)))));
      };
      body.append(h('input', { class: 'l-search', type: 'search', placeholder: t('pick.iconSearch'), 'aria-label': t('pick.iconSearch'), oninput: (e) => { q = e.target.value; fill(); } }), grid);
      fill();
    },
  });
}

export function pickAction(current, onPick, { appsOnly = false } = {}) {
  const church = isChurch();
  let tab = appsOnly ? 'app' : current?.t === 'url' || current?.t === 'app' ? current.t : 'cmd';
  let url = current?.t === 'url' ? current.url : '';
  let name = current?.t === 'url' ? current.name || '' : '';
  openSheet({
    title: appsOnly ? t('pick.app') : t('pick.action'), kicker: church ? 'πρᾶξις' : '', full: true,
    render(body, close, rerender) {
      if (!appsOnly) {
        body.append(segmented([
          { value: 'cmd', label: t('pick.tab.cmd') }, { value: 'app', label: t('pick.tab.app') }, { value: 'url', label: t('pick.tab.url') },
        ], tab, (v) => { tab = v; rerender(); }, t('pick.action')));
      }
      const list = h('div', { class: 'l-pick-list' });
      const row = (on, label, sub, fn) => list.append(h('button', { class: `l-pick ${on ? 'on' : ''}`, onclick: fn }, h('span', {}, label), sub ? h('small', {}, sub) : null));
      if (tab === 'cmd') {
        commandsFor(church).forEach((c) => row(current?.t === 'cmd' && current.id === c.id, t('cmd.' + c.id), '', () => { onPick({ t: 'cmd', id: c.id }); close(); }));
      } else if (tab === 'app') {
        const apps = allApps();
        if (!apps.length) list.append(h('p', { class: 'l-hint' }, t('pick.noApps')));
        apps.forEach((a) => row(current?.t === 'app' && current.key === a.key, a.label, '', () => { onPick({ t: 'app', key: a.key }); close(); }));
      } else {
        body.append(h('p', { class: 'l-hint' }, t('pick.urlHint')),
          field(t('pick.url'), url, (v) => { url = v; }, { placeholder: 'https://, tel:, intent:#Intent;…', autocapitalize: 'off' }),
          field(t('pick.name'), name, (v) => { name = v; }, {}),
          h('button', { class: 'l-btn primary', onclick: () => { if (url.trim()) { onPick({ t: 'url', url: url.trim(), name: name.trim() }); close(); } } }, t('ui.done')));
        list.append(h('div', { class: 'l-sub' }, t('pick.presets')));
        LINK_PRESETS.forEach((p) => row(false, t('link.' + p.id), p.url, () => { url = p.url; name = t('link.' + p.id); rerender(); }));
      }
      body.append(list);
    },
  });
}
