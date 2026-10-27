// Панели поверх главного экрана (DECISIONS 2026-10-27): «Все приложения» — снизу, кошелёк — справа, блокнот — слева.
// Открываются и закрываются смахиванием, и панель идёт за пальцем: отпустили дальше трети экрана или быстро — она
// доезжает, иначе возвращается. Обратный жест закрывает: из кошелька — слева направо, из блокнота — справа налево,
// из «Всех приложений» — сверху вниз (когда список в начале). «Назад» системы закрывает тоже.
const OPEN_FRAC = 0.2;    // доля экрана, после которой панель доезжает (автор: жесты чувствительнее)
const FAST = 0.25;        // px/ms — быстрый взмах доезжает с любого места
const SNAP_MS = 320;

// from — откуда выезжает: 'bottom' | 'right' | 'left'; axis и знак сдвига в закрытом состоянии
const SIDE = {
  bottom: { axis: 'y', sign: 1 },
  right: { axis: 'x', sign: 1 },
  left: { axis: 'x', sign: -1 },
};

const size = (axis) => (axis === 'x' ? innerWidth : innerHeight);
const tr = (axis, px) => (axis === 'x' ? `translateX(${px}px)` : `translateY(${px}px)`);

// Панель: el — элемент (появляется лениво: el() может создать его), open/close — обычное открытие и закрытие
export function panel({ el, from, open, close, isOpen }) {
  const { axis, sign } = SIDE[from];
  let dragging = false;
  let shownForDrag = false;
  const p = {
    from, axis,
    isOpen,
    // палец пошёл — панель видна и слушается руки. amount — сколько открыто (px, от 0), opening — открываем или закрываем
    start(opening) {
      const e = el();
      if (!e) return false;
      dragging = true;
      e.style.transition = 'none';
      if (opening) { e.style.visibility = 'visible'; shownForDrag = true; e.classList.add('dragging'); }
      e.classList.add('dragging');
      return true;
    },
    move(openPx) {
      const e = el();
      if (!e || !dragging) return;
      const full = size(axis);
      const shown = Math.max(0, Math.min(full, openPx));
      e.style.transform = tr(axis, sign * (full - shown));
    },
    // отпустили: решить, доезжать или вернуться. openPx — сколько открыто, v — скорость вдоль оси (px/ms, + = открывается)
    end(openPx, v, opening) {
      const e = el();
      dragging = false;
      if (!e) return false;
      const full = size(axis);
      const shouldOpen = v > FAST ? true : v < -FAST ? false : openPx > full * OPEN_FRAC;
      e.classList.remove('dragging');
      e.style.transition = '';
      // инлайновый transform снимаем после перехода, чтобы класс open/закрыто снова управлял положением
      if (shouldOpen) {
        if (!isOpen()) open();
        requestAnimationFrame(() => { e.style.transform = ''; });
      } else if (isOpen() || shownForDrag) {
        // уезжает за край с текущего места; инлайновый сдвиг снимаем после перехода
        e.style.transform = tr(axis, sign * full);
        if (isOpen()) close();
        setTimeout(() => { e.style.transform = ''; e.style.visibility = ''; }, SNAP_MS);
      }
      shownForDrag = false;
      return true; // панель тянули — жест исчерпан, обычное смахивание не нужно
    },
    cancel() {
      const e = el();
      dragging = false; shownForDrag = false;
      if (!e) return;
      e.classList.remove('dragging');
      e.style.transition = ''; e.style.transform = ''; e.style.visibility = '';
    },
  };
  return p;
}

// скорость по последним точкам (px/ms)
export function velocityTracker() {
  const pts = [];
  return {
    push(v, t = performance.now()) { pts.push({ v, t }); while (pts.length > 6) pts.shift(); },
    get() {
      if (pts.length < 2) return 0;
      const a = pts[0], b = pts[pts.length - 1];
      return b.t > a.t ? (b.v - a.v) / (b.t - a.t) : 0;
    },
  };
}
