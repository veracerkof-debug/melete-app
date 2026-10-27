// Блокнот (DECISIONS 2026-10-26): страница notes.html поверх главного экрана, своё хранилище (elachiston.notes).
// Выезжает слева: открыть — смахнуть слева направо, закрыть — справа налево (панель идёт за пальцем, panels.js).
// Ссылки из заметок открываются в браузере системы.
import page from './notes.html?raw';
import script from './notes-page.js?url';
import { openUrl } from './actions.js';
import { panel } from './panels.js';

let frame = null;

export const notesOpen = () => !!frame?.classList.contains('open');

function ensure() {
  if (frame) return frame;
  frame = document.createElement('iframe');
  frame.className = 'l-money l-notes';
  frame.title = 'Блокнот';
  // скрипт — отдельным файлом: CSP главного экрана не пускает встроенные скрипты
  frame.srcdoc = page.replace('<!--SCRIPT-->', `<script src="${new URL(script, location.href).href}"></script>`);
  document.body.append(frame);
  return frame;
}

export function openNotes() {
  ensure();
  requestAnimationFrame(() => frame.classList.add('open'));
  setTimeout(() => frame.contentWindow?.focus(), 300);
}

export function closeNotes() { frame?.classList.remove('open'); frame?.blur(); window.focus(); }

export const notesPanel = panel({ el: ensure, from: 'left', open: openNotes, close: closeNotes, isOpen: notesOpen });

addEventListener('message', (e) => {
  if (e.source !== frame?.contentWindow) return;
  if (e.data === 'notes:close') closeNotes();
  else if (e.data?.notesUrl && /^https?:/i.test(e.data.notesUrl)) openUrl(e.data.notesUrl);
  // страница тянется за пальцем справа налево — закрываем
  else if (e.data?.notesDrag != null) { if (!frame.classList.contains('dragging')) notesPanel.start(false); notesPanel.move(innerWidth - e.data.notesDrag); }
  else if (e.data?.notesDragEnd != null) notesPanel.end(innerWidth - e.data.notesDragEnd, -e.data.v, false);
});

export function notesBack() {
  const w = frame?.contentWindow;
  if (w?.__notesBack) w.__notesBack(); else closeNotes();
}
