// Кошелёк — черновик (DECISIONS 2026-10-26): страница money.html поверх главного экрана, своё хранилище
// (elachiston.money.draft). Открывается смахиванием справа налево; с кодом — сначала замок (lock.js).
// Закрыли кошелёк или ушли с экрана — замок снова закрыт.
import page from './money.html?raw';
import script from './money-page.js?url';
import { unlock, lockSettings } from './lock.js';

let frame = null;
let busy = false;

export const moneyOpen = () => !!frame?.classList.contains('open');

export async function openMoney() {
  if (busy || moneyOpen()) return;
  busy = true;
  const ok = await unlock();
  busy = false;
  if (!ok) return;
  if (!frame) {
    frame = document.createElement('iframe');
    frame.className = 'l-money';
    frame.title = 'Кошелёк';
    // скрипт — отдельным файлом: CSP главного экрана (launcher/index.html) не пускает встроенные скрипты
    frame.srcdoc = page.replace('<!--SCRIPT-->', `<script src="${new URL(script, location.href).href}"></script>`);
    document.body.append(frame);
  } else frame.contentWindow?.__moneyFresh?.();
  requestAnimationFrame(() => frame.classList.add('open'));
  setTimeout(() => frame.contentWindow?.focus(), 300);
}

export function closeMoney() { frame?.classList.remove('open'); window.focus(); dispatchEvent(new Event('wallet:changed')); }

// записи стёрли («Забыли код») — страница начнёт с чистого листа
function reload() { frame?.remove(); frame = null; }

addEventListener('message', (e) => {
  if (e.data === 'money:close') closeMoney();
  if (e.data === 'money:lock') lockSettings((wiped) => { if (wiped) { closeMoney(); setTimeout(reload, 350); } });
});
// ушли с экрана — кошелёк закрывается, следующий вход снова через замок
document.addEventListener('visibilitychange', () => { if (document.hidden && moneyOpen()) { frame.style.transition = 'none'; closeMoney(); requestAnimationFrame(() => { frame.style.transition = ''; }); } });

// «Назад»: сначала внутри кошелька, потом закрыть
export function moneyBack() {
  const w = frame?.contentWindow;
  if (w?.__moneyBack) w.__moneyBack(); else closeMoney();
}
