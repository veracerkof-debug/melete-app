// Кошелёк — черновик (DECISIONS 2026-10-26): страница money.html поверх главного экрана, своё хранилище
// (elachiston.money.draft). Выезжает справа: открыть — смахнуть справа налево, закрыть — слева направо (панель идёт
// за пальцем, panels.js); с кодом — сначала замок (lock.js). Закрыли кошелёк или ушли с экрана — замок снова закрыт.
import page from './money.html?raw';
import script from './money-page.js?url';
import { unlock, lockSettings, hasLock } from './lock.js';
import { panel } from './panels.js';
import { themeDoc } from './look.js';
import { setCover } from './cover.js';

let frame = null;
let busy = false;

export const moneyOpen = () => !!frame?.classList.contains('open');

function ensure() {
  if (frame) return frame;
  frame = document.createElement('iframe');
  frame.className = 'l-money';
  frame.title = 'Кошелёк';
  // скрипт — отдельным файлом: CSP главного экрана (launcher/index.html) не пускает встроенные скрипты
  frame.srcdoc = page.replace('<!--SCRIPT-->', `<script src="${new URL(script, location.href).href}"></script>`);
  document.body.append(frame);
  frame.addEventListener('load', () => { window.__applyInsets?.(frame.contentDocument); themeDoc(frame.contentDocument); }); // отступы и вид главного — и этой странице
  return frame;
}

export async function openMoney() {
  if (busy || moneyOpen()) return;
  busy = true;
  const ok = await unlock();
  busy = false;
  if (!ok) return;
  show();
}

function show() {
  if (frame) frame.contentWindow?.__moneyFresh?.(); else ensure();
  requestAnimationFrame(() => frame.classList.add('open'));
  setCover('right', true);
  setTimeout(() => frame.contentWindow?.focus(), 300);
}

export function closeMoney() { setCover('right', false); frame?.classList.remove('open'); frame?.blur(); window.__homeFocus?.(); dispatchEvent(new Event('wallet:changed')); }

// панель для перетаскивания: с кодом кошелёк за пальцем не идёт — сначала замок (откроется по отпусканию)
export const moneyPanel = panel({ el: () => (hasLock() ? null : ensure()), from: 'right', open: show, close: closeMoney, isOpen: moneyOpen });

// записи стёрли («Забыли код») — страница начнёт с чистого листа
function reload() { frame?.remove(); frame = null; }

addEventListener('message', (e) => {
  if (e.source !== frame?.contentWindow) return;
  if (e.data === 'money:close') closeMoney();
  else if (e.data === 'money:lock') lockSettings((wiped) => { if (wiped) { closeMoney(); setTimeout(reload, 350); } });
  // страница тянется за пальцем слева направо — закрываем
  else if (e.data?.moneyDrag != null) { if (!frame.classList.contains('dragging')) moneyPanel.start(false); moneyPanel.move(innerWidth - e.data.moneyDrag); }
  else if (e.data?.moneyDragEnd != null) moneyPanel.end(innerWidth - e.data.moneyDragEnd, -e.data.v, false);
});
// ушли с экрана — кошелёк закрывается, следующий вход снова через замок
document.addEventListener('visibilitychange', () => { if (document.hidden && moneyOpen()) { frame.style.transition = 'none'; closeMoney(); requestAnimationFrame(() => { frame.style.transition = ''; }); } });

// «Назад»: сначала внутри кошелька, потом закрыть
export function moneyBack() {
  const w = frame?.contentWindow;
  if (w?.__moneyBack) w.__moneyBack(); else closeMoney();
}
