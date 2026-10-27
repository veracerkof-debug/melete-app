// Блокнот (DECISIONS 2026-10-26): страница notes.html поверх главного экрана, своё хранилище (elachiston.notes).
// Открывается смахиванием слева направо. Ссылки из заметок открываются в браузере системы.
import page from './notes.html?raw';
import script from './notes-page.js?url';
import { openUrl } from './actions.js';

let frame = null;

export const notesOpen = () => !!frame?.classList.contains('open');

export function openNotes() {
  if (!frame) {
    frame = document.createElement('iframe');
    frame.className = 'l-money l-notes';
    frame.title = 'Блокнот';
    // скрипт — отдельным файлом: CSP главного экрана не пускает встроенные скрипты
    frame.srcdoc = page.replace('<!--SCRIPT-->', `<script src="${new URL(script, location.href).href}"></script>`);
    document.body.append(frame);
  }
  requestAnimationFrame(() => frame.classList.add('open'));
  setTimeout(() => frame.contentWindow?.focus(), 300);
}

export function closeNotes() { frame?.classList.remove('open'); window.focus(); }

addEventListener('message', (e) => {
  if (e.source !== frame?.contentWindow) return;
  if (e.data === 'notes:close') closeNotes();
  else if (e.data?.notesUrl && /^https?:/i.test(e.data.notesUrl)) openUrl(e.data.notesUrl);
});

export function notesBack() {
  const w = frame?.contentWindow;
  if (w?.__notesBack) w.__notesBack(); else closeNotes();
}
